using System.IO.Compression;
using System.Text;
using System.Xml.Linq;
using CeramicaCanelas.Infrastructure.Reports;
using CeramicaCanelas.Application.Contracts.Application.Services;
using FluentAssertions;

namespace CeramicaCanelas.Tests.Unit.Infrastructure.Reports;

public sealed class SpreadsheetReportServiceTests
{
    [Fact]
    public void Kiln_workbook_has_summary_details_quality_styles_filters_freeze_and_logo()
    {
        var generated = new DateTime(2026, 11, 22, 16, 30, 0);
        var sheets = new SpreadsheetReportSheet[]
        {
            new("Resumo", new IReadOnlyList<object?>[]
            {
                new object?[] { "", "", "", "Relatório" }, new object?[] { "", "", "", "Cerâmica Canelas" },
                new object?[] { "", "", "", "Período", "22/11/2026" }, new object?[] { "", "", "", "Gerado em", generated },
                new object?[] { "" }, new object?[] { "Indicador", "Valor" }, new object?[] { "Queimas", 1 }
            }, 6, new double[] { 14, 14, 14, 32, 22 }, false),
            new("Queimas", new IReadOnlyList<object?>[] { new object?[] { "Relatório" }, new object?[] { "Período", "22/11/2026" }, new object?[] { "Gerado", generated }, new object?[] { "ID", "Início", "Duração", "Status" }, new object?[] { "firing-id", generated, 28.5m, "Pendente · Acima do tempo" } }, 4, new double[] { 38, 22, 18, 30 }),
            new("Qualidade", new IReadOnlyList<object?>[] { new object?[] { "Qualidade" }, new object?[] { "Período", "22/11/2026" }, new object?[] { "Gerado", generated }, new object?[] { "Produto", "Categoria", "Quantidade" }, new object?[] { "Lajota", "Trincados", 3 } }, 4, new double[] { 32, 24, 18 })
        };
        var logoPath = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../CeramicaCanelas.WebApi/wwwroot/base/Logo.png"));
        File.Exists(logoPath).Should().BeTrue("the kiln report should use the checked-in Cerâmica Canelas logo");
        var logo = File.ReadAllBytes(logoPath);
        var bytes = new SpreadsheetReportService().BuildKilnWorkbook(sheets, logo);
        if (Environment.GetEnvironmentVariable("KILN_REPORT_REVIEW_OUTPUT") is { Length: > 0 } reviewDirectory)
        {
            Directory.CreateDirectory(reviewDirectory);
            File.WriteAllBytes(Path.Combine(reviewDirectory, "controle-fornos-review.xlsx"), bytes);
        }
        using var archive = new ZipArchive(new MemoryStream(bytes));
        archive.Entries.Select(x => x.FullName).Should().Contain(new[] { "xl/styles.xml", "xl/worksheets/sheet2.xml", "xl/worksheets/sheet3.xml", "xl/drawings/drawing1.xml", "xl/media/logo.png" });
        using var reader = new StreamReader(archive.GetEntry("xl/worksheets/sheet2.xml")!.Open());
        var detail = reader.ReadToEnd();
        detail.Should().Contain("autoFilter").And.Contain("ySplit=\"4\"").And.Contain("t=\"n\"")
            .And.Contain("showGridLines=\"0\"").And.Contain("paperSize=\"9\"");
        using var styleReader = new StreamReader(archive.GetEntry("xl/styles.xml")!.Open());
        styleReader.ReadToEnd().Should().Contain("dd/mm/yyyy hh:mm").And.Contain("FFB9380A");
        foreach (var entry in archive.Entries.Where(x => x.FullName.EndsWith(".xml", StringComparison.Ordinal)))
        {
            using var xml = entry.Open();
            XDocument.Load(xml).Should().NotBeNull($"{entry.FullName} must be valid XML");
        }
    }

    [Fact]
    public void Builds_an_excel_workbook_with_numeric_cells_and_safe_text_cells()
    {
        var bytes = new SpreadsheetReportService().BuildXlsx("Controle de Fornos", new IEnumerable<object?>[]
        {
            new object?[] { "Produto", "Quantidade" },
            new object?[] { "=HYPERLINK(\"https://example.invalid\")", 1200 }
        });

        using var archive = new ZipArchive(new MemoryStream(bytes));
        archive.Entries.Select(x => x.FullName).Should().Contain(new[]
        {
            "[Content_Types].xml", "_rels/.rels", "xl/workbook.xml", "xl/_rels/workbook.xml.rels", "xl/worksheets/sheet1.xml"
        });
        using var reader = new StreamReader(archive.GetEntry("xl/worksheets/sheet1.xml")!.Open());
        var worksheet = reader.ReadToEnd();
        worksheet.Should().Contain("=HYPERLINK");
        worksheet.Should().Contain("t=\"inlineStr\"");
        worksheet.Should().Contain("<v>1200</v>");
        worksheet.Should().NotContain("<f>");
    }

    [Fact]
    public void Kiln_workbook_writes_live_formulas_and_percentage_formats()
    {
        var workbook = new SpreadsheetReportService().BuildKilnWorkbook(new[]
        {
            new SpreadsheetReportSheet("Resumo", new IReadOnlyList<object?>[]
            {
                new object?[] { "Indicador", "Valor" },
                new object?[] { "Rendimento", new SpreadsheetFormula("B4/B3", .95, true) },
                new object?[] { "Carregadas", 100 }, new object?[] { "Conferidas", 95 }
            }, 1, new double[] { 24, 18 })
        });

        using var archive = new ZipArchive(new MemoryStream(workbook));
        using var sheetReader = new StreamReader(archive.GetEntry("xl/worksheets/sheet1.xml")!.Open());
        var sheet = sheetReader.ReadToEnd();
        sheet.Should().Contain("<f>B4/B3</f>").And.Contain("<v>0.95</v>");
        using var stylesReader = new StreamReader(archive.GetEntry("xl/styles.xml")!.Open());
        stylesReader.ReadToEnd().Should().Contain("0.00%");
    }
}
