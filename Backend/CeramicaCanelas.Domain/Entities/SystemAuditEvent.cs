using CeramicaCanelas.Domain.Abstract;

namespace CeramicaCanelas.Domain.Entities;

public sealed class SystemAuditEvent : BaseEntity
{
    public string Category { get; set; } = "BusinessAudit";
    public string Action { get; set; } = string.Empty;
    public string Outcome { get; set; } = string.Empty;
    public string Severity { get; set; } = "Information";
    public string Module { get; set; } = string.Empty;
    public string ResourceType { get; set; } = string.Empty;
    public string? ResourceId { get; set; }
    public string? ActorUserId { get; set; }
    public string? ActorDisplayName { get; set; }
    public DateTime OccurredAtUtc { get; set; } = DateTime.UtcNow;
    public string? IpAddress { get; set; }
    public string? HttpMethod { get; set; }
    public string? Route { get; set; }
    public int? StatusCode { get; set; }
    public string? TraceId { get; set; }
    public string? TechnicalContext { get; set; }
}
