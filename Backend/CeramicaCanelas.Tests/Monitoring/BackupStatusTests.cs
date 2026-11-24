using System.Text;
using CeramicaCanelas.WebApi.Monitoring;
using Microsoft.Extensions.Options;
using Xunit;

namespace CeramicaCanelas.Tests.Monitoring;

public sealed class BackupStatusTests : IDisposable
{
    private readonly string _path = Path.Combine(Path.GetTempPath(), $"ceramisys-backup-test-{Guid.NewGuid():N}.json");

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Complete_success_with_offset_is_returned_in_utc(bool withUtf8Bom)
    {
        await File.WriteAllTextAsync(_path, """
            { "schemaVersion": 1, "startedAt": "2026-01-02T00:00:00-03:00",
              "finishedAt": "2026-01-02T00:01:45-03:00", "lastSuccessfulAt": "2026-01-02T03:01:45Z",
              "localStatus": "succeeded", "driveStatus": "succeeded", "errorCode": null }
            """, new UTF8Encoding(withUtf8Bom));
        var status = await Read();

        Assert.Equal("available", status.FileStatus);
        Assert.Equal("succeeded", status.AttemptStatus);
        Assert.Equal(new DateTimeOffset(2026, 1, 2, 3, 1, 45, TimeSpan.Zero), status.LastSuccessfulAt);
        Assert.Equal(status.FinishedAt, status.LastSuccessfulAt);
        Assert.Null(status.ErrorMessage);
    }

    [Theory]
    [InlineData("failed", "skipped", "local_backup_failed", "A geração do backup local falhou.")]
    [InlineData("succeeded", "failed", "drive_upload_failed", "O backup local foi gerado, mas o envio ao Google Drive falhou.")]
    [InlineData("succeeded", "failed", "interrupted", "A execução do backup foi interrompida.")]
    public async Task Failure_keeps_previous_complete_success_and_uses_safe_messages(string local, string drive,
        string errorCode, string expectedMessage)
    {
        await File.WriteAllTextAsync(_path, $$"""
            { "schemaVersion": 1, "startedAt": "2026-01-02T03:00:00Z", "finishedAt": "2026-01-02T03:01:45Z",
              "lastSuccessfulAt": "2026-01-01T03:01:45Z", "localStatus": "{{local}}",
              "driveStatus": "{{drive}}", "errorCode": "{{errorCode}}", "message": "raw rclone diagnostic" }
            """);
        var status = await Read();

        Assert.Equal("failed", status.AttemptStatus);
        Assert.Equal(local, status.LocalStatus);
        Assert.Equal(drive, status.DriveStatus);
        Assert.Equal(new DateTimeOffset(2026, 1, 1, 3, 1, 45, TimeSpan.Zero), status.LastSuccessfulAt);
        Assert.Equal(expectedMessage, status.ErrorMessage);
    }

    [Theory]
    [InlineData("2026-01-02T00:00:00Z", "available")]
    [InlineData("2026-01-01T23:00:00Z", "stale")]
    public async Task Running_attempt_has_its_own_staleness_limit(string started, string fileStatus)
    {
        await File.WriteAllTextAsync(_path, $$"""
            { "schemaVersion": 1, "startedAt": "{{started}}", "finishedAt": null, "lastSuccessfulAt": null,
              "localStatus": "succeeded", "driveStatus": "pending", "errorCode": null }
            """);
        var status = await Read(new DateTimeOffset(2026, 1, 2, 3, 0, 0, TimeSpan.Zero));

        Assert.Equal(fileStatus, status.FileStatus);
        Assert.Equal("running", status.AttemptStatus);
        Assert.Equal("pending", status.DriveStatus);
    }

    [Fact]
    public async Task Stale_completed_attempt_still_returns_last_success()
    {
        await File.WriteAllTextAsync(_path, """
            { "schemaVersion": 1, "startedAt": "2026-01-01T03:00:00Z", "finishedAt": "2026-01-01T03:02:00Z",
              "lastSuccessfulAt": "2026-01-01T03:02:00Z", "localStatus": "succeeded",
              "driveStatus": "succeeded", "errorCode": null }
            """);
        var status = await Read();

        Assert.Equal("stale", status.FileStatus);
        Assert.Equal("succeeded", status.AttemptStatus);
        Assert.NotNull(status.LastSuccessfulAt);
    }

    [Theory]
    [InlineData("20 Jan 2026")]
    [InlineData("2026-01-02T03:00:00")]
    [InlineData("2026-01-02T03:00:00+0300")]
    [InlineData("2026-01-03T03:00:00Z")]
    public async Task Bad_or_future_timestamps_are_invalid(string started)
    {
        await File.WriteAllTextAsync(_path, $$"""
            { "schemaVersion": 1, "startedAt": "{{started}}", "finishedAt": null, "lastSuccessfulAt": null,
              "localStatus": "pending", "driveStatus": "pending", "errorCode": null }
            """);
        Assert.Equal("invalid", (await Read()).FileStatus);
    }

    [Fact]
    public async Task Missing_invalid_and_oversized_files_are_handled()
    {
        Assert.Equal("missing", (await Read()).FileStatus);
        await File.WriteAllTextAsync(_path, "x");
        Assert.Equal("invalid", (await Read()).FileStatus);
        await File.WriteAllTextAsync(_path, new string(' ', 8192) + "{}");
        Assert.Equal("invalid", (await Read()).FileStatus);
    }

    private Task<BackupMeasurement> Read(DateTimeOffset? now = null) => new BackupStatusReader(
        Options.Create(new ServerStatusOptions { BackupStatusPath = _path }),
        new FixedClock(now ?? new DateTimeOffset(2026, 1, 2, 12, 0, 0, TimeSpan.Zero))).Read(CancellationToken.None);

    public void Dispose() => File.Delete(_path);

    private sealed class FixedClock(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }
}
