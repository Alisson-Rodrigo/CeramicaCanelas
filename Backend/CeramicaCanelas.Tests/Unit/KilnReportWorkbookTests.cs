using System.Reflection;
using System.IO.Compression;
using System.Xml.Linq;
using CeramicaCanelas.Application.Contracts.Application.Services;
using CeramicaCanelas.Domain.Entities;
using CeramicaCanelas.Domain.Enums;
using CeramicaCanelas.WebApi.Controllers;
using CeramicaCanelas.Infrastructure.Reports;
using FluentAssertions;

namespace CeramicaCanelas.Tests.Unit;

public sealed class KilnReportWorkbookTests
{
    [Theory]
    [InlineData(0)]
    [InlineData(3)]
    [InlineData(160)]
    public void Workbook_keeps_filters_print_settings_and_consistent_totals(int firingCount)
    {
        var start = new DateTimeOffset(2026, 11, 22, 0, 0, 0, TimeSpan.FromHours(-3));
        var end = start.AddDays(6);
        var firings = Enumerable.Range(0, firingCount).Select(index =>
        {
            var firing = NewFiring(classified: index % 2 == 0 ? 75 : 100);
            firing.KilnName = index % 3 == 0 ? "Forno 01" : "Forno 02";
            firing.StartedAtUtc = start.UtcDateTime.AddHours(index % 120);
            firing.FinishedAtUtc = firing.StartedAtUtc.AddHours(index % 2 == 0 ? 28.5 : 27);
            firing.QualityConferencedAtUtc = firing.FinishedAtUtc.AddHours(2);
            firing.QualityConferenceObservations = string.Join(" ", Enumerable.Repeat("Observação longa de exemplo para conferência após abertura.", 6));
            firing.Burners.Add(new KilnFiringBurner { EmployeeNameSnapshot = "Queimador de teste A" });
            firing.Burners.Add(new KilnFiringBurner { EmployeeNameSnapshot = "Queimador de teste B" });
            firing.Products.Add(new KilnFiringProduct { ProductType = ProductType.Block9, ProductNameSnapshot = "Blocos de 9 furos", Quantity = 200 });
            if (index % 2 == 0)
                firing.Quality.Add(new KilnFiringQuality { ProductType = ProductType.Slabs, CategoryNameSnapshot = "Segunda linha", Quantity = 25 });
            else
                firing.Quality.Add(new KilnFiringQuality { ProductType = ProductType.Block9, CategoryNameSnapshot = "Primeira linha", Quantity = 200 });
            return firing;
        }).ToArray();
        var builder = typeof(KilnFiringsController).GetMethod("BuildWorkbookSheets", BindingFlags.NonPublic | BindingFlags.Static)!;
        var sheets = (IReadOnlyList<SpreadsheetReportSheet>)builder.Invoke(null, new object?[]
        {
            firings, firingCount == 0 ? null : start, firingCount == 160 ? null : end
        })!;
        var summary = sheets[0].Rows;
        var detail = sheets[1].Rows;
        var quality = sheets[2].Rows;
        ((SpreadsheetFormula)summary[6][2]!).CachedValue.Should().Be(300d * firingCount);
        ((SpreadsheetFormula)summary[6][4]!).CachedValue.Should().Be(100d * firingCount + 200d * (firingCount / 2));
        summary[6][0].Should().Be(firingCount);
        summary[9][0].Should().Be((firingCount + 1) / 2);
        summary[9][2].Should().Be("Indisponível");
        detail.Count.Should().Be(4 + 2 * firingCount);
        quality.Skip(4).Sum(row => row[4] is int amount ? amount : 0).Should().Be(300 * firingCount);
        if (firingCount > 0)
        {
            detail[4][4].Should().Be(TimeSpan.FromHours(28.5));
            detail[4][8].Should().Be("Queimador de teste A\nQueimador de teste B");
            quality[5][4].Should().BeNull();
            quality[6][5].Should().Be("Sem classificação");
            quality.Skip(4).Should().Contain(row => Equals(row[7], "Conferido"));
        }

        var checkedInLogo = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../CeramicaCanelas.WebApi/wwwroot/base/Logo.png"));
        var bytes = new SpreadsheetReportService().BuildKilnWorkbook(sheets, File.ReadAllBytes(checkedInLogo));
        if (Environment.GetEnvironmentVariable("KILN_REPORT_REVIEW_OUTPUT") is { Length: > 0 } directory)
        {
            Directory.CreateDirectory(directory);
            File.WriteAllBytes(Path.Combine(directory, $"controle-fornos-{firingCount}.xlsx"), bytes);
        }
        using var archive = new ZipArchive(new MemoryStream(bytes));
        XDocument Load(string name)
        {
            using var file = archive.GetEntry(name)!.Open();
            return XDocument.Load(file);
        }
        XNamespace ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
        var workbook = Load("xl/workbook.xml");
        workbook.Descendants(ns + "definedName").Count().Should().Be(6);
        var detailXml = Load("xl/worksheets/sheet2.xml");
        detailXml.Descendants(ns + "col").First().Attribute("hidden")!.Value.Should().Be("1");
        detailXml.Descendants(ns + "pane").Single().Attribute("topLeftCell")!.Value.Should().Be("C5");
        detailXml.Descendants(ns + "mergeCell").Select(cell => cell.Attribute("ref")!.Value).Should().Equal("B1:N1", "B2:N2");
        if (firingCount > 0)
        {
            detailXml.Descendants(ns + "row").Skip(4).First().Attribute("ht")!.Value.Should().NotBe("20");
            var styles = Load("xl/styles.xml");
            var cellFormats = styles.Descendants(ns + "cellXfs").Single().Elements(ns + "xf").ToArray();
            var fills = styles.Descendants(ns + "fills").Single().Elements(ns + "fill").ToArray();
            string Fill(string address)
            {
                var cell = detailXml.Descendants(ns + "c").Single(c => c.Attribute("r")!.Value == address);
                var format = cellFormats[(int)cell.Attribute("s")!];
                return fills[(int)format.Attribute("fillId")!].Descendants(ns + "fgColor").Single().Attribute("rgb")!.Value;
            }
            Fill("F5").Should().Be("FFFCE7E6");
            Fill("K5").Should().Be("FFE5F3EA");
            Fill("K6").Should().Be("FFFFF1D8");
            Fill("J6").Should().Be("FFECEFF2");
            Load("xl/worksheets/sheet1.xml").Descendants(ns + "dataBar").Should().ContainSingle();
        }
    }

    [Fact]
    public void Workbook_has_formulas_when_reconciled_and_suppresses_yield_when_pending()
    {
        var builder = typeof(KilnFiringsController).GetMethod("BuildWorkbookSheets", BindingFlags.NonPublic | BindingFlags.Static)!;
        var reconciled = NewFiring(classified: 100);
        var reconciledSheets = (IReadOnlyList<SpreadsheetReportSheet>)builder.Invoke(null, new object?[] { new[] { reconciled }, null, null })!;
        var reconciledSummary = reconciledSheets.Single(x => x.Name == "Resumo").Rows;
        ((SpreadsheetFormula)reconciledSummary[9][2]!).CachedValue.Should().Be(1d);
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
