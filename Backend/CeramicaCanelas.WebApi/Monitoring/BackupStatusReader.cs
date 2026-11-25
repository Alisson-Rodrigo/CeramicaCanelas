using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;

namespace CeramicaCanelas.WebApi.Monitoring;

public sealed record BackupMeasurement(string FileStatus, string AttemptStatus, string LocalStatus,
    string DriveStatus, DateTimeOffset? StartedAt, DateTimeOffset? FinishedAt,
    DateTimeOffset? LastSuccessfulAt, string? ErrorMessage);

public sealed partial class BackupStatusReader(IOptions<ServerStatusOptions> settings, TimeProvider clock)
{
    private const int MaxStatusBytes = 8192;
    private readonly string? _path = settings.Value.BackupStatusPath
        ?? (OperatingSystem.IsLinux() ? "/var/lib/ceramisys/backup-status.json" : null);

    public async Task<BackupMeasurement> Read(CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(_path))
            return Empty("notConfigured", "A fonte de status do backup não foi configurada neste ambiente.");

        try
        {
            await using var stream = new FileStream(_path, FileMode.Open, FileAccess.Read,
                FileShare.ReadWrite | FileShare.Delete, 4096, FileOptions.Asynchronous | FileOptions.SequentialScan);
            var buffer = new byte[MaxStatusBytes + 1];
            var size = await stream.ReadAtLeastAsync(buffer, buffer.Length, throwOnEndOfStream: false, ct);
            if (size > MaxStatusBytes) return Invalid();

            var offset = buffer.AsSpan(0, size).StartsWith("\uFEFF"u8) ? 3 : 0;
            using var document = JsonDocument.Parse(buffer.AsMemory(offset, size - offset));
            var fields = document.RootElement;
            if (fields.ValueKind != JsonValueKind.Object ||
                !fields.TryGetProperty("schemaVersion", out var version) ||
                version.ValueKind != JsonValueKind.Number || !version.TryGetInt32(out var number) || number != 1 ||
                !TryTimestamp(fields, "startedAt", out var started) || started is null ||
                !TryTimestamp(fields, "finishedAt", out var finished) ||
                !TryTimestamp(fields, "lastSuccessfulAt", out var success) ||
                !fields.TryGetProperty("errorCode", out var errorField) ||
                errorField.ValueKind is not (JsonValueKind.Null or JsonValueKind.String)) return Invalid();

            var now = clock.GetUtcNow();
            if (started > now.AddMinutes(5) || finished > now.AddMinutes(5) || finished < started ||
                success > (finished ?? started)) return Invalid();

            var local = Text(fields, "localStatus");
            var drive = Text(fields, "driveStatus");
            var errorCode = errorField.GetString();
            var attempt = (finished.HasValue, local, drive, errorCode) switch
            {
                (false, "pending", "pending", null) or (false, "succeeded", "pending", null) => "running",
                (true, "succeeded", "succeeded", null) when success == finished => "succeeded",
                (true, "failed", "skipped", "local_backup_failed" or "interrupted") => "failed",
                (true, "succeeded", "failed", "drive_upload_failed" or "interrupted") => "failed",
                _ => "invalid",
            };
            if (attempt == "invalid" || attempt != "succeeded" && success > started) return Invalid();

            var age = now - (finished ?? started.Value);
            var maxAge = TimeSpan.FromHours(finished.HasValue
                ? settings.Value.BackupStaleAfterHours : settings.Value.BackupRunningStaleAfterHours);
            var error = errorCode switch
            {
                "local_backup_failed" => "A geração do backup local falhou.",
                "drive_upload_failed" => "O backup local foi gerado, mas o envio ao Google Drive falhou.",
                "interrupted" => "A execução do backup foi interrompida.",
                _ => null
            };
            return new(age > maxAge ? "stale" : "available", attempt, local!, drive!, started, finished, success, error);
        }
        catch (Exception ex) when (ex is FileNotFoundException or DirectoryNotFoundException)
        {
            return Empty("missing", "O script de backup ainda não publicou um status.");
        }
        catch (JsonException) { return Invalid(); }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or ArgumentException or NotSupportedException)
        {
            return Empty("unreadable", "A API não conseguiu ler o status do backup.");
        }
    }

    private static string? Text(JsonElement fields, string key) =>
        fields.TryGetProperty(key, out var value) && value.ValueKind == JsonValueKind.String ? value.GetString() : null;

    private static bool TryTimestamp(JsonElement fields, string key, out DateTimeOffset? result)
    {
        result = null;
        if (!fields.TryGetProperty(key, out var field)) return false;
        if (field.ValueKind == JsonValueKind.Null) return true;
        if (field.ValueKind != JsonValueKind.String || field.GetString() is not { } value ||
            !IsoTimestamp().IsMatch(value) ||
            !DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.None, out var timestamp))
            return false;
        result = timestamp.ToUniversalTime();
        return true;
    }

    private static BackupMeasurement Invalid() => Empty("invalid", "O arquivo de status do backup é inválido.");
    private static BackupMeasurement Empty(string status, string message) =>
        new(status, "unknown", "unknown", "unknown", null, null, null, message);

    [GeneratedRegex(@"\A[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{1,7})?(?:Z|[+-][0-9]{2}:[0-9]{2})\z", RegexOptions.CultureInvariant)]
    private static partial Regex IsoTimestamp();
}
