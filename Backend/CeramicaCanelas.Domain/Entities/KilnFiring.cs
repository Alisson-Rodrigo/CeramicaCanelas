using CeramicaCanelas.Domain.Abstract;

namespace CeramicaCanelas.Domain.Entities;

public class KilnFiring : BaseEntity
{
    public string KilnName { get; set; } = string.Empty;
    public DateTime StartedAtUtc { get; set; }
    public DateTime FinishedAtUtc { get; set; }
    public string? Notes { get; set; }
    public string RegisteredByUserId { get; set; } = string.Empty;
    public string RegisteredByName { get; set; } = string.Empty;
    public string? DifferenceJustification { get; set; }
    public bool IsCancelled { get; set; }
    public string? QualityConferencedByUserId { get; set; }
    public string? QualityConferencedByName { get; set; }
    public DateTime? QualityConferencedAtUtc { get; set; }
    public string? QualityConferenceObservations { get; set; }
    public string? QualityConferenceState { get; set; }
    public ICollection<KilnFiringProduct> Products { get; set; } = new List<KilnFiringProduct>();
    public ICollection<KilnFiringBurner> Burners { get; set; } = new List<KilnFiringBurner>();
    public ICollection<KilnFiringQuality> Quality { get; set; } = new List<KilnFiringQuality>();
    public ICollection<KilnFiringQualityRevision> QualityRevisions { get; set; } = new List<KilnFiringQualityRevision>();
    public TimeSpan Duration => FinishedAtUtc - StartedAtUtc;
    public string DurationClass => Duration.TotalHours <= 27 ? "Dentro do tempo" : "Acima do tempo";
    public int LoadedTotal => Products.Sum(x => x.Quantity);
    public int ClassifiedTotal => Quality.Sum(x => x.Quantity);
    public int UnclassifiedTotal => Math.Max(0, LoadedTotal - ClassifiedTotal);
    public bool IsFinishedAt(DateTime utcNow) => FinishedAtUtc <= DateTime.SpecifyKind(utcNow, DateTimeKind.Utc);
    public bool IsReconciled => Products.Count > 0 && Products.All(p => Quality.Where(q => q.ProductType == p.ProductType).Sum(q => q.Quantity) == p.Quantity);
    public string ConferenceStatus => IsReconciled ? "Conferido" : "Pendente";
}

public class KilnFiringProduct : BaseEntity
{
    public Guid FiringId { get; set; }
    public KilnFiring Firing { get; set; } = null!;
    public ProductType ProductType { get; set; }
    public string ProductNameSnapshot { get; set; } = string.Empty;
    public int Quantity { get; set; }
}

public class KilnFiringBurner : BaseEntity
{
    public Guid FiringId { get; set; }
    public KilnFiring Firing { get; set; } = null!;
    public Guid EmployeeId { get; set; }
    public Employee Employee { get; set; } = null!;
    public string EmployeeNameSnapshot { get; set; } = string.Empty;
}

public class KilnQualityCategory : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
}

public class KilnFiringQuality : BaseEntity
{
    public Guid FiringId { get; set; }
    public KilnFiring Firing { get; set; } = null!;
    public ProductType ProductType { get; set; }
    public Guid CategoryId { get; set; }
    public KilnQualityCategory Category { get; set; } = null!;
    public string CategoryNameSnapshot { get; set; } = string.Empty;
    public int Quantity { get; set; }
}

/// <summary>Immutable snapshot of one submitted post-opening quality conference.</summary>
public class KilnFiringQualityRevision : BaseEntity
{
    public Guid FiringId { get; set; }
    public KilnFiring Firing { get; set; } = null!;
    public int RevisionNumber { get; set; }
    public string? ConferencedByUserId { get; set; }
    public string? ConferencedByName { get; set; }
    public DateTime? ConferencedAtUtc { get; set; }
    public string? Observations { get; set; }
    public string? DifferenceJustification { get; set; }
    public string State { get; set; } = "Pendente";
    public int LoadedTotal { get; set; }
    public int ClassifiedTotal { get; set; }
    public int UnclassifiedTotal { get; set; }
    public ICollection<KilnFiringQualityRevisionItem> Items { get; set; } = new List<KilnFiringQualityRevisionItem>();
}

public class KilnFiringQualityRevisionItem : BaseEntity
{
    public Guid RevisionId { get; set; }
    public KilnFiringQualityRevision Revision { get; set; } = null!;
    public ProductType ProductType { get; set; }
    public string ProductNameSnapshot { get; set; } = string.Empty;
    public Guid CategoryId { get; set; }
    public string CategoryNameSnapshot { get; set; } = string.Empty;
    public int Quantity { get; set; }
}
