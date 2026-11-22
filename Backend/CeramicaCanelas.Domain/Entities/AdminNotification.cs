using CeramicaCanelas.Domain.Abstract;

namespace CeramicaCanelas.Domain.Entities;

public sealed class AdminNotification : BaseEntity
{
    public Guid AuditEventId { get; set; }
    public string RecipientUserId { get; set; } = string.Empty;
    public string Priority { get; set; } = "Normal";
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Origin { get; set; } = string.Empty;
    public DateTime? ReadAtUtc { get; set; }
}
