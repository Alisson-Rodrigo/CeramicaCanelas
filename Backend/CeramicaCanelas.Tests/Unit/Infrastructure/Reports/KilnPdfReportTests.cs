using CeramicaCanelas.Infrastructure.Reports;
using CeramicaCanelas.Application.Contracts.Application.Services;
using FluentAssertions;

namespace CeramicaCanelas.Tests.Unit.Infrastructure.Reports;

public sealed class KilnPdfReportTests
{
    [Fact]
    public void Kiln_report_generates_a_pdf_document()
    {
        var bytes = new PdfReportService().BuildKilnFiringReportPdf("Relatório de fornos", ["Forno 01", "Duração: 27h 00min"]);
        System.Text.Encoding.ASCII.GetString(bytes, 0, 5).Should().Be("%PDF-");
    }

    [Fact]
    public void Structured_kiln_report_embeds_the_official_logo_and_business_fields()
    {
        var logoPath = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../CeramicaCanelas.WebApi/wwwroot/base/Logo.png"));
        File.Exists(logoPath).Should().BeTrue();
        var report = new KilnFiringReportDocument("Relatório de Controle de Fornos", "22/11/2026 a 22/11/2026",
            new DateTime(2026, 11, 22, 16, 30, 0), ["Período informado"], ["1 queima · 120 peças"],
            [new KilnReportRow("firing-id", "Forno 01", "22/11/2026 10:00", "22/11/2026 22:00", "12h 00min · Dentro do tempo",
                "Lajotas", 120, "Primeira linha: 118 · Trincados: 2", "Concluída", "Operador")]);
        var bytes = new PdfReportService().BuildKilnFiringReportPdf(report, logoPath);
        System.Text.Encoding.ASCII.GetString(bytes, 0, 5).Should().Be("%PDF-");
        bytes.Length.Should().BeGreaterThan(5000, "the generated PDF should contain the official brand image and structured content");
        if (Environment.GetEnvironmentVariable("KILN_REPORT_REVIEW_OUTPUT") is { Length: > 0 } reviewDirectory)
        {
            Directory.CreateDirectory(reviewDirectory);
            File.WriteAllBytes(Path.Combine(reviewDirectory, "controle-fornos-review.pdf"), bytes);
        }
    }
}
