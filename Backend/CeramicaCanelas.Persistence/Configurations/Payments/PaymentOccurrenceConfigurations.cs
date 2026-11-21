using CeramicaCanelas.Domain.Entities.Payments;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
namespace CeramicaCanelas.Persistence.Configurations.Payments;
public sealed class PaymentAbsenceConfiguration : IEntityTypeConfiguration<PaymentAbsence>
{
    public void Configure(EntityTypeBuilder<PaymentAbsence> b)
    {
        b.ToTable("PaymentAbsences"); b.HasKey(x => x.Id);
        b.Property(x => x.Revision).IsConcurrencyToken();
        b.Property(x => x.Observation).HasMaxLength(2000); b.Property(x => x.RecordedBy).HasMaxLength(450);
        b.HasIndex(x => new { x.PaymentPersonId, x.Date }).IsUnique();
        b.HasOne<PaymentPerson>().WithMany().HasForeignKey(x => x.PaymentPersonId).OnDelete(DeleteBehavior.Restrict);
    }
}
public sealed class PaymentAuditConfiguration : IEntityTypeConfiguration<PaymentAudit>
{
    public void Configure(EntityTypeBuilder<PaymentAudit> b)
    {
        b.ToTable("PaymentAudits"); b.HasKey(x => x.Id); b.HasIndex(x => new { x.PaymentPersonId, x.CreatedOn });
        b.HasOne<PaymentPerson>().WithMany().HasForeignKey(x => x.PaymentPersonId).OnDelete(DeleteBehavior.Restrict);
    }
}
public sealed class PaymentDsrChargeConfiguration : IEntityTypeConfiguration<PaymentDsrCharge>
{
    public void Configure(EntityTypeBuilder<PaymentDsrCharge> b)
    {
        b.ToTable("PaymentDsrCharges"); b.HasKey(x => x.Id); b.Property(x => x.Amount).HasPrecision(18, 2);
        b.HasIndex(x => new { x.PaymentPersonId, x.WeekStart }).IsUnique().HasFilter("\"IsCancelled\" = FALSE");
        b.HasOne<PaymentCalculation>().WithMany().HasForeignKey(x => x.PaymentCalculationId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne<PaymentPerson>().WithMany().HasForeignKey(x => x.PaymentPersonId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class PaymentPreparationConfiguration : IEntityTypeConfiguration<PaymentPreparation>
{
    public void Configure(EntityTypeBuilder<PaymentPreparation> b)
    {
        b.ToTable("PaymentPreparations"); b.HasKey(x => x.Id); b.Property(x => x.Revision).IsConcurrencyToken();
        b.HasIndex(x => new { x.PaymentPersonId, x.Year, x.Month, x.Fortnight }).IsUnique();
        b.HasOne<PaymentPerson>().WithMany().HasForeignKey(x => x.PaymentPersonId).OnDelete(DeleteBehavior.Restrict);
    }
}
public sealed class PaymentAdjustmentConfiguration : IEntityTypeConfiguration<PaymentAdjustment>
{
    public void Configure(EntityTypeBuilder<PaymentAdjustment> b)
    {
        b.ToTable("PaymentAdjustments"); b.HasKey(x => x.Id); b.Property(x => x.Revision).IsConcurrencyToken(); b.Property(x => x.Amount).HasPrecision(18, 2);
        b.Property(x => x.Reference).HasMaxLength(100); b.Property(x => x.Reason).HasMaxLength(2000);
        b.HasIndex(x => new { x.PaymentCalculationId, x.Reference }).IsUnique();
        b.HasOne<PaymentCalculation>().WithMany().HasForeignKey(x => x.PaymentCalculationId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class EmployeeAccountantSubmissionConfiguration : IEntityTypeConfiguration<EmployeeAccountantSubmission>
{
    public void Configure(EntityTypeBuilder<EmployeeAccountantSubmission> b)
    {
        b.ToTable("EmployeeAccountantSubmissions");
        b.HasKey(x => x.Id);
        b.Property(x => x.Reference).HasMaxLength(150);
        b.Property(x => x.RecordedBy).HasMaxLength(450);
        b.HasIndex(x => new { x.PaymentPersonId, x.Year, x.Month });
        b.HasOne<PaymentPerson>().WithMany().HasForeignKey(x => x.PaymentPersonId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class EmployeeTimeEntryConfiguration : IEntityTypeConfiguration<EmployeeTimeEntry>
{
    public void Configure(EntityTypeBuilder<EmployeeTimeEntry> b)
    {
        b.ToTable("EmployeeTimeEntries"); b.HasKey(x => x.Id);
        b.Property(x => x.Revision).IsConcurrencyToken(); b.Property(x => x.Notes).HasMaxLength(2000);
        b.HasIndex(x => new { x.PaymentPersonId, x.Date }).IsUnique();
        b.HasOne<PaymentPerson>().WithMany().HasForeignKey(x => x.PaymentPersonId).OnDelete(DeleteBehavior.Restrict);
    }
}
public sealed class EmployeeBonusSettlementConfiguration : IEntityTypeConfiguration<EmployeeBonusSettlement>
{
    public void Configure(EntityTypeBuilder<EmployeeBonusSettlement> b)
    {
        b.ToTable("EmployeeBonusSettlements"); b.HasKey(x => x.Id); b.Property(x => x.Revision).IsConcurrencyToken();
        b.Property(x => x.PersonName).HasMaxLength(150);
        b.Property(x => x.FullAbsenceDeduction).HasPrecision(18, 2); b.Property(x => x.HalfAbsenceDeduction).HasPrecision(18, 2); b.Property(x => x.OriginalValue).HasPrecision(18, 2); b.Property(x => x.DeductionValue).HasPrecision(18, 2); b.Property(x => x.NetValue).HasPrecision(18, 2);
        b.HasIndex(x => x.PaymentCalculationId).IsUnique();
        b.HasIndex(x => new { x.PaymentPersonId, x.Year, x.Month }).IsUnique().HasFilter("\"IsCancelled\" = FALSE");
        b.HasOne<PaymentPerson>().WithMany().HasForeignKey(x => x.PaymentPersonId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne<PaymentCalculation>().WithMany().HasForeignKey(x => x.PaymentCalculationId).OnDelete(DeleteBehavior.Restrict);
    }
}
