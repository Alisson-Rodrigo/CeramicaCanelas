using CeramicaCanelas.Domain.Entities.Payments;
using CeramicaCanelas.Domain.Enums.Payments;
using CeramicaCanelas.Infrastructure.Reports;
using FluentAssertions;

namespace CeramicaCanelas.Tests.Unit.Infrastructure.Reports;

public sealed class PaymentPdfReportServiceTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void ReportIsAValidPdfAndLoadsCompanyLogo(bool bonusesOnly)
    {
        var logoPath = Path.Combine(AppContext.BaseDirectory, "Assets", "logo-cjm.png");
        var service = new PdfReportService();

        var pdf = service.BuildPaymentsReportPdf([Calculation()], bonusesOnly, 2026, 8, logoPath);

        File.Exists(logoPath).Should().BeTrue();
        pdf.Should().HaveCountGreaterThan(10_000);
        pdf.Take(5).Should().Equal("%PDF-"u8.ToArray());
    }

    private static PaymentCalculation Calculation()
    {
        var calculation = new PaymentCalculation
        {
            PersonName = "Funcionário Teste",
            EmploymentType = EmploymentType.Employee,
            CompetenceYear = 2026,
            CompetenceMonth = 8,
            Fortnight = Fortnight.Second,
            BaseValue = 2500m,
            AdditionValue = 125m,
            DeductionValue = 333.33m,
            NetValue = 1541.67m,
            FirstFortnightValue = 1000m,
            SecondFortnightValue = 1541.67m,
            MonthlyTotalValue = 2541.67m,
            Status = PaymentCalculationStatus.Calculated,
            CalculatedAt = new DateTime(2026, 8, 25, 12, 0, 0, DateTimeKind.Utc)
        };
        calculation.Items.Add(new PaymentCalculationItem { Kind = PaymentItemKind.Bonus, Description = "Bonificação", Amount = 250m });
        calculation.Items.Add(new PaymentCalculationItem { Kind = PaymentItemKind.FullAbsence, Description = "Desconto salarial - falta inteira", Amount = 83.33m, Quantity = 1m });
        calculation.Items.Add(new PaymentCalculationItem { Kind = PaymentItemKind.BonusAbsenceDeduction, Description = "Desconto da bonificação - falta inteira", Amount = 100m, Quantity = 1m });
        calculation.Items.Add(new PaymentCalculationItem { Kind = PaymentItemKind.PositiveHours, Description = "Horas positivas", Amount = 125m, QuantityMinutes = 120 });
        calculation.Items.Add(new PaymentCalculationItem { Kind = PaymentItemKind.NegativeHours, Description = "Horas negativas", Amount = 50m, QuantityMinutes = 60 });
        calculation.Items.Add(new PaymentCalculationItem { Kind = PaymentItemKind.Voucher, Description = "Vale", Amount = 100m });
        return calculation;
    }
}
