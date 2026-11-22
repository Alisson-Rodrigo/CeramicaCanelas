using System.Buffers.Binary;

namespace CeramicaCanelas.WebApi.Assistant;

public sealed record ValidatedAssistantUpload(IReadOnlyList<AssistantAttachment> Attachments, string? Error)
{
    public bool IsValid => Error is null;
}

public static class AssistantAttachmentValidator
{
    public const int MaxImages = 3;
    public const int MaxImageBytes = 5 * 1024 * 1024;
    public const int MaxAudioBytes = 3 * 1024 * 1024;
    public const int MaxTotalBytes = 10 * 1024 * 1024;
    public const int MaxAudioSeconds = 90;

    public static async Task<ValidatedAssistantUpload> ValidateAsync(IReadOnlyList<IFormFile> images,
        IFormFile? audio, CancellationToken cancellationToken)
    {
        if (images.Count > MaxImages) return Invalid("Envie no máximo 3 imagens por pergunta.");
        if (images.Count + (audio is null ? 0 : 1) > 4) return Invalid("O limite é de 4 arquivos por pergunta.");
        if (images.Any(file => file.Length is <= 0 or > MaxImageBytes)) return Invalid("Cada imagem deve ter até 5 MB.");
        if (audio is not null && audio.Length is (<= 0 or > MaxAudioBytes)) return Invalid("O áudio WAV deve ter até 3 MB.");
        if (images.Sum(file => file.Length) + (audio?.Length ?? 0) > MaxTotalBytes) return Invalid("Os anexos juntos devem ter até 10 MB.");

        var validated = new List<AssistantAttachment>(images.Count + (audio is null ? 0 : 1));
        foreach (var file in images)
        {
            var bytes = await ReadAsync(file, cancellationToken);
            var detected = DetectImageMimeType(bytes);
            if (detected is null || !string.Equals(file.ContentType, detected, StringComparison.OrdinalIgnoreCase))
                return Invalid("A imagem não corresponde a um formato aceito (PNG, JPEG ou WebP).");
            validated.Add(new AssistantAttachment(detected, bytes));
        }

        if (audio is not null)
        {
            var bytes = await ReadAsync(audio, cancellationToken);
            var duration = GetPcmWavDurationSeconds(bytes);
            if (duration is null || !string.Equals(audio.ContentType, "audio/wav", StringComparison.OrdinalIgnoreCase))
                return Invalid("O áudio precisa ser um arquivo WAV PCM válido.");
            if (duration > MaxAudioSeconds) return Invalid("O áudio pode ter no máximo 90 segundos.");
            validated.Add(new AssistantAttachment("audio/wav", bytes));
        }

        return new ValidatedAssistantUpload(validated, null);
    }

    private static async Task<byte[]> ReadAsync(IFormFile file, CancellationToken cancellationToken)
    {
        await using var stream = file.OpenReadStream();
        using var memory = new MemoryStream((int)file.Length);
        await stream.CopyToAsync(memory, cancellationToken);
        return memory.ToArray();
    }

    private static string? DetectImageMimeType(ReadOnlySpan<byte> bytes)
    {
        if (bytes.Length >= 8 && bytes[..8].SequenceEqual(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 })) return "image/png";
        if (bytes.Length >= 3 && bytes[0] == 0xff && bytes[1] == 0xd8 && bytes[2] == 0xff) return "image/jpeg";
        if (bytes.Length >= 12 && bytes[..4].SequenceEqual("RIFF"u8) && bytes[8..12].SequenceEqual("WEBP"u8)) return "image/webp";
        return null;
    }

    private static double? GetPcmWavDurationSeconds(ReadOnlySpan<byte> bytes)
    {
        if (bytes.Length < 44 || !bytes[..4].SequenceEqual("RIFF"u8) || !bytes[8..12].SequenceEqual("WAVE"u8)) return null;
        uint byteRate = 0;
        uint sampleRate = 0;
        uint dataLength = 0;
        ushort format = 0;
        ushort channels = 0;
        ushort bits = 0;
        ushort blockAlign = 0;
        var offset = 12;
        while (offset + 8 <= bytes.Length)
        {
            var length = BinaryPrimitives.ReadUInt32LittleEndian(bytes.Slice(offset + 4, 4));
            var body = offset + 8;
            if (length > bytes.Length - body) return null;
            if (bytes.Slice(offset, 4).SequenceEqual("fmt "u8) && length >= 16)
            {
                format = BinaryPrimitives.ReadUInt16LittleEndian(bytes.Slice(body, 2));
                channels = BinaryPrimitives.ReadUInt16LittleEndian(bytes.Slice(body + 2, 2));
                sampleRate = BinaryPrimitives.ReadUInt32LittleEndian(bytes.Slice(body + 4, 4));
                byteRate = BinaryPrimitives.ReadUInt32LittleEndian(bytes.Slice(body + 8, 4));
                blockAlign = BinaryPrimitives.ReadUInt16LittleEndian(bytes.Slice(body + 12, 2));
                bits = BinaryPrimitives.ReadUInt16LittleEndian(bytes.Slice(body + 14, 2));
                if (sampleRate is < 8000 or > 48000) return null;
            }
            else if (bytes.Slice(offset, 4).SequenceEqual("data"u8)) dataLength = length;
            offset = body + checked((int)length) + (int)(length % 2);
        }
        if (format != 1 || channels is < 1 or > 2 || bits != 16 || byteRate == 0 || dataLength == 0 ||
            blockAlign != channels * 2 || byteRate != sampleRate * blockAlign || dataLength % blockAlign != 0) return null;
        return (double)dataLength / byteRate;
    }

    private static ValidatedAssistantUpload Invalid(string message) => new([], message);
}
