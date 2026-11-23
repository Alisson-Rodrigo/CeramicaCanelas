using System.Reflection;
using CeramicaCanelas.Application.Contracts.Application.Services;
using CeramicaCanelas.Domain.Entities;
using CeramicaCanelas.Domain.Enums;
using CeramicaCanelas.WebApi.Controllers;
using FluentAssertions;

namespace CeramicaCanelas.Tests.Unit;

public sealed class KilnReportWorkbookTests
{
    [Fact]
    public void Workbook_has_formulas_when_reconciled_and_suppresses_yield_when_pending()
    {
        var builder = typeof(KilnFiringsController).GetMethod("BuildWorkbookSheets", BindingFlags.NonPublic | BindingFlags.Static)!;
        var reconciled = NewFiring(classified: 100);
        var reconciledSheets = (IReadOnlyList<SpreadsheetReportSheet>)builder.Invoke(null, new object?[] { new[] { reconciled }, null, null })!;
        var reconciledSummary = reconciledSheets.Single(x => x.Name == "Resumo").Rows;
        reconciledSummary.SelectMany(row => row).OfType<SpreadsheetFormula>().Should().Contain(x => x.IsPercentage);
        reconciledSummary.SelectMany(row => row).OfType<SpreadsheetFormula>().Should().Contain(x => x.Formula.Contains("SUMIF", StringComparison.Ordinal));

        var pendingSheets = (IReadOnlyList<SpreadsheetReportSheet>)builder.Invoke(null, new object?[] { new[] { NewFiring(classified: 99) }, null, null })!;
        var pendingSummary = pendingSheets.Single(x => x.Name == "Resumo").Rows;
        pendingSummary.SelectMany(row => row).OfType<SpreadsheetFormula>().Should().NotContain(x => x.IsPercentage);
        pendingSummary.SelectMany(row => row).Select(x => x?.ToString() ?? string.Empty)
            .Any(x => x.Contains("Indisponível enquanto houver pendências", StringComparison.Ordinal)).Should().BeTrue();
    }

    private static KilnFiring NewFiring(int classified)
    {
        var category = Guid.NewGuid();
        var firing = new KilnFiring
        {
            KilnName = "Forno exemplo fictício",
            StartedAtUtc = new DateTime(2026, 11, 22, 0, 0, 0, DateTimeKind.Utc),
            FinishedAtUtc = new DateTime(2026, 11, 22, 12, 0, 0, DateTimeKind.Utc),
            QualityConferencedByName = "Conferente de teste",
            QualityConferencedAtUtc = new DateTime(2026, 11, 22, 12, 5, 0, DateTimeKind.Utc)
        };
        firing.Products.Add(new KilnFiringProduct { ProductType = ProductType.Slabs, ProductNameSnapshot = "Lajotas", Quantity = 100 });
        firing.Quality.Add(new KilnFiringQuality { ProductType = ProductType.Slabs, CategoryId = category, CategoryNameSnapshot = "Primeira linha", Quantity = classified });
        return firing;
    }
}
