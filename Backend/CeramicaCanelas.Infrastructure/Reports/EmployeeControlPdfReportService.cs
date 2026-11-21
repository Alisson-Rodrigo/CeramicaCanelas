using MigraDocCore.DocumentObjectModel.MigraDoc.DocumentObjectModel.Shapes;
using CeramicaCanelas.Application.Features.Payments;
using MigraDocCore.DocumentObjectModel;
using MigraDocCore.DocumentObjectModel.Tables;
using MigraDocCore.Rendering;
using PdfSharpCore.Utils;
using SixLabors.ImageSharp.PixelFormats;

namespace CeramicaCanelas.Infrastructure.Reports;

public partial class PdfReportService
{
    private static Document EmployeeControlDocument(string title, int year, int month, string? logoPath)
    {
        ImageSource.ImageSourceImpl ??= new ImageSharpImageSource<Rgba32>();
        var document = new Document();
        document.Info.Title = title;
        document.DefaultPageSetup.PageFormat = PageFormat.A4;
        document.DefaultPageSetup.LeftMargin = Unit.FromCentimeter(1.5);
        document.DefaultPageSetup.RightMargin = Unit.FromCentimeter(1.5);
        var style = document.Styles[StyleNames.Normal]; style.Font.Name = "Arial"; style.Font.Size = 9;
        var section = document.AddSection();
        if (!string.IsNullOrWhiteSpace(logoPath) && File.Exists(logoPath)) section.AddImage(ImageSource.FromFile(logoPath)).Width = Unit.FromCentimeter(2.2);
        var company = section.AddParagraph("CERÂMICA CANELAS"); company.Format.Font.Color = Colors.SaddleBrown; company.Format.Font.Bold = true;
        var heading = section.AddParagraph(title); heading.Format.Font.Size = 17; heading.Format.Font.Color = Colors.DarkOrange;
        section.AddParagraph($"Competência: {month:00}/{year}").Format.SpaceAfter = Unit.FromPoint(12);
        AddPaymentFooter(section);
        return document;
    }
    private static byte[] EmployeeControlPdf(Document document)
    {
        var renderer = new PdfDocumentRenderer(unicode: true) { Document = document }; renderer.RenderDocument();
        using var stream = new MemoryStream(); renderer.PdfDocument.Save(stream, false); return stream.ToArray();
    }
    private static Table EmployeeControlTable(Section section, params string[] headers)
    {
        var table = section.AddTable(); table.Borders.Width = 0.5;
        foreach (var header in headers) table.AddColumn(Unit.FromCentimeter(18d / headers.Length));
        var row = table.AddRow(); row.HeadingFormat = true; row.Shading.Color = Colors.DarkOrange; row.Format.Font.Color = Colors.White;
        for (var i = 0; i < headers.Length; i++) row.Cells[i].AddParagraph(headers[i]);
        return table;
    }
    public byte[] BuildEmployeeAccountantReportPdf(IEnumerable<AccountantSummaryDto> reports, int year, int month, string? logoPath = null)
    {
        var document = EmployeeControlDocument("Apuração mensal para o contador", year, month, logoPath);
        var section = document.LastSection; var any = false;
        foreach (var report in reports)
        {
            any = true;
            section.AddParagraph(report.Person.Name).Format.Font.Bold = true;
            var table = EmployeeControlTable(section, "Faltas inteiras", "Meias faltas", "Horas positivas", "Horas negativas", "Saldo de horas");
            var row = table.AddRow();
            var values = new[] { report.FullAbsences.ToString(), report.HalfAbsences.ToString(), report.Hours.PositiveHours, report.Hours.NegativeHours, report.Hours.BalanceHours };
            for (var i = 0; i < values.Length; i++) row.Cells[i].AddParagraph(values[i]);
            section.AddParagraph("Datas das faltas: " + (report.Occurrences.Count == 0 ? "Nenhuma" : string.Join("; ", report.Occurrences.Select(x => $"{x.Date:dd/MM/yyyy} ({(x.IsHalf ? "meia" : "inteira")})")))).Format.SpaceAfter = Unit.FromPoint(14);
        }
        if (!any) section.AddParagraph("Nenhum funcionário encontrado para a competência.");
        return EmployeeControlPdf(document);
    }
    public byte[] BuildEmployeeBonusReportPdf(IEnumerable<EmployeeBonusReportDto> reports, int year, int month, string? logoPath = null)
    {
        var document = EmployeeControlDocument("Bonificação mensal — controle interno", year, month, logoPath);
        var section = document.LastSection; var any = false;
        foreach (var report in reports)
        {
            any = true;
            section.AddParagraph(report.PersonName).Format.Font.Bold = true;
            var table = EmployeeControlTable(section, "Bonificação original", "Faltas inteiras", "Meias faltas", "Valor final");
            var row = table.AddRow(); var values = new[] { Money(report.OriginalBonus), report.FullAbsences?.ToString() ?? "Histórico não disponível", report.HalfAbsences?.ToString() ?? "Histórico não disponível", Money(report.FinalBonus) };
            for (var i = 0; i < values.Length; i++) row.Cells[i].AddParagraph(values[i]);
            section.AddParagraph($"Redução por inteiras: {(report.FullAbsenceDeduction.HasValue ? Money(report.FullAbsenceDeduction.Value) : "não disponível")}; por meias: {(report.HalfAbsenceDeduction.HasValue ? Money(report.HalfAbsenceDeduction.Value) : "não disponível")}");
            section.AddParagraph($"Redução total calculada: {Money(report.AbsenceDeduction)}; redução limitada ao bônus: {Money(report.AppliedDeduction)}.");
            section.AddParagraph(report.IncludedInLegacyPayroll ? "Histórico legado: valor já incluído no fechamento original. Não pagar novamente automaticamente."
                : report.IsClosed ? "Apuração mensal fechada. Bonificação separada do pagamento salarial." : "Prévia mensal — ainda não congelada no fechamento.").Format.SpaceAfter = Unit.FromPoint(14);
        }
        if (!any) section.AddParagraph("Nenhuma bonificação encontrada.");
        return EmployeeControlPdf(document);
    }
}
