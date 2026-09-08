using CeramicaCanelas.Domain.Entities.Payments;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CeramicaCanelas.Persistence.Configurations.Payments;

public sealed class PaymentPersonConfiguration : IEntityTypeConfiguration<PaymentPerson>
{
    public void Configure(EntityTypeBuilder<PaymentPerson> builder)
    {
        builder.ToTable("PaymentPeople"); builder.HasKey(x => x.Id); builder.Property(x => x.Name).IsRequired().HasMaxLength(150); builder.Property(x => x.EmploymentType).HasConversion<int>();
        builder.Property(x => x.MonthlyValue).HasPrecision(18, 2);
        builder.HasIndex(x => x.EmployeeId).IsUnique().HasFilter("\"EmployeeId\" IS NOT NULL");
        builder.HasOne(x => x.Employee).WithMany().HasForeignKey(x => x.EmployeeId).OnDelete(DeleteBehavior.SetNull);
    }
}

public sealed class PaymentRuleConfigurationConfiguration : IEntityTypeConfiguration<PaymentRuleConfiguration>
{
    public void Configure(EntityTypeBuilder<PaymentRuleConfiguration> builder)
    {
        builder.ToTable("PaymentRuleConfigurations"); builder.HasKey(x => x.Id); builder.HasIndex(x => x.EffectiveFrom).IsUnique(); builder.Property(x => x.EffectiveFrom).HasColumnType("date");
        builder.Property(x => x.EmployeeFirstFortnightPercent).HasPrecision(8, 4); builder.Property(x => x.ContractorFirstFortnightPercent).HasPrecision(8, 4);
        builder.Property(x => x.FullAbsenceValue).HasPrecision(18, 2); builder.Property(x => x.HalfAbsenceValue).HasPrecision(18, 2);
        builder.Property(x => x.PositiveHourMultiplier).HasPrecision(8, 4); builder.Property(x => x.NegativeHourMultiplier).HasPrecision(8, 4); builder.Property(x => x.NightHourMultiplier).HasPrecision(8, 4);
        builder.HasData(new PaymentRuleConfiguration { Id = Guid.Parse("6d118ff0-cdc6-49cc-a862-e46e4d30c3e0"), CreatedOn = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc), ModifiedOn = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc), EffectiveFrom = new DateOnly(2000, 1, 1), EmployeeFirstFortnightPercent = 40m, ContractorFirstFortnightPercent = 50m, FullAbsenceValue = 100m, HalfAbsenceValue = 50m });
    }
}

public sealed class VoucherConfiguration : IEntityTypeConfiguration<Voucher>
{
    public void Configure(EntityTypeBuilder<Voucher> builder)
    {
        builder.ToTable("PaymentVouchers"); builder.HasKey(x => x.Id); builder.Property(x => x.Description).IsRequired().HasMaxLength(200); builder.Property(x => x.TotalValue).HasPrecision(18, 2); builder.Property(x => x.InstallmentValue).HasPrecision(18, 2); builder.Property(x => x.RemainingBalance).HasPrecision(18, 2); builder.Property(x => x.Date).HasColumnType("date"); builder.Property(x => x.Periodicity).HasConversion<int>(); builder.Property(x => x.Status).HasConversion<int>();
        builder.HasOne(x => x.PaymentPerson).WithMany(x => x.Vouchers).HasForeignKey(x => x.PaymentPersonId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class VoucherCompetenceConfiguration : IEntityTypeConfiguration<VoucherCompetence>
{
    public void Configure(EntityTypeBuilder<VoucherCompetence> builder)
    {
        builder.ToTable("PaymentVoucherCompetences"); builder.HasKey(x => x.Id); builder.HasIndex(x => new { x.VoucherId, x.Year, x.Month }).IsUnique();
        builder.HasOne(x => x.Voucher).WithMany(x => x.Competences).HasForeignKey(x => x.VoucherId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class PaymentCalculationConfiguration : IEntityTypeConfiguration<PaymentCalculation>
{
    public void Configure(EntityTypeBuilder<PaymentCalculation> builder)
    {
        builder.ToTable("PaymentCalculations"); builder.HasKey(x => x.Id); builder.Property(x => x.PersonName).IsRequired().HasMaxLength(150); builder.Property(x => x.EmploymentType).HasConversion<int>(); builder.Property(x => x.Fortnight).HasConversion<int>(); builder.Property(x => x.Status).HasConversion<int>();
        builder.Property(x => x.BaseValue).HasPrecision(18, 2); builder.Property(x => x.FortnightPercent).HasPrecision(8, 4); builder.Property(x => x.FirstFortnightPaid).HasPrecision(18, 2); builder.Property(x => x.GrossValue).HasPrecision(18, 2); builder.Property(x => x.AdditionValue).HasPrecision(18, 2); builder.Property(x => x.DeductionValue).HasPrecision(18, 2); builder.Property(x => x.NetValue).HasPrecision(18, 2); builder.Property(x => x.FirstFortnightValue).HasPrecision(18, 2); builder.Property(x => x.SecondFortnightValue).HasPrecision(18, 2); builder.Property(x => x.MonthlyTotalValue).HasPrecision(18, 2);
        builder.HasIndex(x => new { x.PaymentPersonId, x.CompetenceYear, x.CompetenceMonth, x.Fortnight }).IsUnique();
        builder.HasOne(x => x.PaymentPerson).WithMany(x => x.Calculations).HasForeignKey(x => x.PaymentPersonId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.PaymentRuleConfiguration).WithMany().HasForeignKey(x => x.PaymentRuleConfigurationId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class PaymentCalculationItemConfiguration : IEntityTypeConfiguration<PaymentCalculationItem>
{
    public void Configure(EntityTypeBuilder<PaymentCalculationItem> builder)
    {
        builder.ToTable("PaymentCalculationItems"); builder.HasKey(x => x.Id); builder.Property(x => x.Kind).HasConversion<int>(); builder.Property(x => x.Description).IsRequired().HasMaxLength(250); builder.Property(x => x.Amount).HasPrecision(18, 2); builder.Property(x => x.Quantity).HasPrecision(18, 4);
        builder.HasOne(x => x.PaymentCalculation).WithMany(x => x.Items).HasForeignKey(x => x.PaymentCalculationId).OnDelete(DeleteBehavior.Cascade);
    }
}
