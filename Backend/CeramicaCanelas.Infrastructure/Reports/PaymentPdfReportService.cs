using System.Globalization;
using CeramicaCanelas.Domain.Entities.Payments;
using CeramicaCanelas.Domain.Enums.Payments;
using MigraDocCore.DocumentObjectModel;
using MigraDocCore.DocumentObjectModel.Tables;
using MigraDocCore.DocumentObjectModel.MigraDoc.DocumentObjectModel.Shapes;
using MigraDocCore.Rendering;
using PdfSharpCore.Utils;
using SixLabors.ImageSharp.PixelFormats;

namespace CeramicaCanelas.Infrastructure.Reports;

public partial class PdfReportService
{
    private static readonly CultureInfo PaymentCulture = CultureInfo.GetCultureInfo("pt-BR");
    private static readonly Color PaymentOrange = Colors.DarkOrange;
    private static readonly Color PaymentBrown = Colors.SaddleBrown;
    private static readonly Color PaymentLight = Colors.SeaShell;
    private static readonly Color PaymentGreen = Colors.DarkGreen;
    private static readonly Color PaymentRed = Colors.Firebrick;

    public byte[] BuildPaymentsReportPdf(
        IEnumerable<PaymentCalculation> calculations,
        bool bonusesOnly,
        int? year = null,
        int? month = null,
        Fortnight? fortnight = null,
        string? logoPath = null)
    {
        var source = calculations.ToList();
        ImageSource.ImageSourceImpl ??= new ImageSharpImageSource<Rgba32>();
        var filtered = fortnight.HasValue ? source.Where(x => x.Fortnight == fortnight.Value).ToList() : source;
        var rows = bonusesOnly
            ? filtered.Where(x => SumItems(x, PaymentItemKind.Bonus) > 0m).OrderBy(x => x.PersonName).ToList()
            : filtered.OrderBy(x => x.PersonName).ToList();

        var document = new Document();
        document.Info.Title = bonusesOnly ? "Relatório de bonificações" : "Relatório de pagamentos";
        document.DefaultPageSetup.PageFormat = PageFormat.A4;
        document.DefaultPageSetup.Orientation = Orientation.Portrait;
        document.DefaultPageSetup.TopMargin = Unit.FromCentimeter(1.2);
        document.DefaultPageSetup.BottomMargin = Unit.FromCentimeter(1.7);
        document.DefaultPageSetup.LeftMargin = Unit.FromCentimeter(2);
        document.DefaultPageSetup.RightMargin = Unit.FromCentimeter(2);

        var normal = document.Styles[StyleNames.Normal];
        normal.Font.Name = "Arial";
        normal.Font.Size = 9;
        normal.Font.Color = PaymentBrown;

        var section = document.AddSection();
        AddPaymentHeader(section, bonusesOnly, year, month, fortnight, logoPath);
        AddPaymentTotals(section, rows, bonusesOnly);

        if (rows.Count == 0)
        {
            var empty = section.AddParagraph("Nenhum cálculo encontrado para os filtros informados.");
            empty.Format.Alignment = ParagraphAlignment.Center;
            empty.Format.Font.Size = 11;
            empty.Format.Font.Color = Colors.Gray;
            empty.Format.SpaceBefore = Unit.FromCentimeter(2);
        }
        else
        {
            for (var index = 0; index < rows.Count; index++)
            {
                if (index > 0)
                    section.AddPageBreak();

                AddPaymentBlock(section, rows[index], bonusesOnly);
            }
        }

        AddPaymentFooter(section);

        var renderer = new PdfDocumentRenderer(unicode: true) { Document = document };
        renderer.RenderDocument();
        using var stream = new MemoryStream();
        renderer.PdfDocument.Save(stream, false);
        return stream.ToArray();
    }

    private static void AddPaymentHeader(Section section, bool bonusesOnly, int? year, int? month, Fortnight? fortnight, string? logoPath)
    {
        var header = section.AddTable();
        header.Borders.Width = 0;
        header.AddColumn(Unit.FromCentimeter(3.2));
        header.AddColumn(Unit.FromCentimeter(13.8));
        header.Columns[1].LeftPadding = Unit.FromPoint(18);
        header.Columns[1].RightPadding = Unit.FromPoint(12);

        var row = header.AddRow();
        row.Height = Unit.FromCentimeter(3);
        row.VerticalAlignment = VerticalAlignment.Center;

        var logoCell = row.Cells[0];
        logoCell.Shading.Color = Colors.White;
        if (!string.IsNullOrWhiteSpace(logoPath) && File.Exists(logoPath))
        {
            var image = logoCell.AddImage(ImageSource.FromFile(logoPath));
            image.LockAspectRatio = true;
            image.Width = Unit.FromCentimeter(2.7);
        }

        var titleCell = row.Cells[1];
        titleCell.Shading.Color = PaymentOrange;
        titleCell.VerticalAlignment = VerticalAlignment.Center;

        var company = titleCell.AddParagraph("CERÂMICA CANELAS");
        company.Format.Font.Size = 10;
        company.Format.Font.Bold = true;
        company.Format.Font.Color = Colors.White;
        company.Format.SpaceAfter = Unit.FromPoint(5);

        var title = titleCell.AddParagraph(bonusesOnly ? "Relatório de Bonificações" : "Relatório de Pagamentos");
        title.Format.Font.Size = 20;
        title.Format.Font.Bold = true;
        title.Format.Font.Color = Colors.White;

        var period = titleCell.AddParagraph(PeriodLabel(year, month, fortnight));
        period.Format.Font.Size = 9;
        period.Format.Font.Color = Colors.White;
        period.Format.SpaceBefore = Unit.FromPoint(5);

        var accent = section.AddTable();
        accent.Borders.Width = 0;
        accent.AddColumn(Unit.FromCentimeter(17));
        var accentRow = accent.AddRow();
        accentRow.Height = Unit.FromPoint(4);
        accentRow.Shading.Color = PaymentBrown;

        section.AddParagraph().Format.SpaceAfter = Unit.FromPoint(8);
    }

    private static void AddPaymentTotals(Section section, IReadOnlyCollection<PaymentCalculation> calculations, bool bonusesOnly)
    {
        var table = section.AddTable();
        table.Borders.Width = 0;
        for (var i = 0; i < 4; i++)
        {
            var column = table.AddColumn(Unit.FromCentimeter(4.25));
            column.LeftPadding = Unit.FromPoint(8);
            column.RightPadding = Unit.FromPoint(8);
        }

        var row = table.AddRow();
        row.Height = Unit.FromCentimeter(1.35);
        row.VerticalAlignment = VerticalAlignment.Center;

        var grossBonus = calculations.Sum(x => SumItems(x, PaymentItemKind.Bonus));
        var bonusDiscount = calculations.Sum(SumBonusAbsenceDiscounts);
        if (bonusesOnly)
        {
            AddMetric(row.Cells[0], "FUNCIONÁRIOS", calculations.Select(x => x.PaymentPersonId).Distinct().Count().ToString(PaymentCulture));
            AddMetric(row.Cells[1], "BONIFICAÇÃO BRUTA", Money(grossBonus));
            AddMetric(row.Cells[2], "DESCONTOS", Money(bonusDiscount), PaymentRed);
            AddMetric(row.Cells[3], "BONIFICAÇÃO LÍQUIDA", Money(Math.Max(0m, grossBonus - bonusDiscount)), PaymentGreen);
        }
        else
        {
            AddMetric(row.Cells[0], "PAGAMENTOS", calculations.Count.ToString(PaymentCulture));
            AddMetric(row.Cells[1], "BONIFICAÇÕES", Money(grossBonus));
            AddMetric(row.Cells[2], "DESCONTOS", Money(calculations.Sum(x => x.DeductionValue)), PaymentRed);
            AddMetric(row.Cells[3], "TOTAL LÍQUIDO", Money(calculations.Sum(x => x.NetValue)), PaymentGreen);
        }

        section.AddParagraph().Format.SpaceAfter = Unit.FromPoint(8);
    }

    private static void AddMetric(Cell cell, string label, string value, Color? valueColor = null)
    {
        cell.Shading.Color = PaymentLight;
        cell.Borders.Right.Width = Unit.FromPoint(2);
        cell.Borders.Right.Color = Colors.White;

        var labelParagraph = cell.AddParagraph(label);
        labelParagraph.Format.Font.Size = 7;
        labelParagraph.Format.Font.Bold = true;
        labelParagraph.Format.Font.Color = Colors.Gray;

        var valueParagraph = cell.AddParagraph(value);
        valueParagraph.Format.Font.Size = 12;
        valueParagraph.Format.Font.Bold = true;
        valueParagraph.Format.Font.Color = valueColor ?? PaymentBrown;
        valueParagraph.Format.SpaceBefore = Unit.FromPoint(3);
    }

    private static void AddPaymentBlock(Section section, PaymentCalculation calculation, bool bonusesOnly)
    {
        var heading = section.AddTable();
        heading.Borders.Width = 0;
        heading.AddColumn(Unit.FromCentimeter(11.2));
        heading.AddColumn(Unit.FromCentimeter(5.8));
        heading.Columns[0].LeftPadding = Unit.FromPoint(10);
        heading.Columns[1].RightPadding = Unit.FromPoint(10);
        var headingRow = heading.AddRow();
        headingRow.Shading.Color = PaymentBrown;
        headingRow.VerticalAlignment = VerticalAlignment.Center;
        headingRow.TopPadding = Unit.FromPoint(7);
        headingRow.BottomPadding = Unit.FromPoint(7);

        var name = headingRow.Cells[0].AddParagraph(calculation.PersonName);
        name.Format.Font.Size = 12;
        name.Format.Font.Bold = true;
        name.Format.Font.Color = Colors.White;

        var personMeta = headingRow.Cells[0].AddParagraph($"{EmploymentTypeName(calculation.EmploymentType)}  |  {StatusName(calculation.Status)}");
        personMeta.Format.Font.Size = 7;
        personMeta.Format.Font.Color = Colors.White;
        personMeta.Format.SpaceBefore = Unit.FromPoint(2);

        var meta = headingRow.Cells[1].AddParagraph($"{calculation.CompetenceMonth:00}/{calculation.CompetenceYear}  |  {FortnightName(calculation.Fortnight)} quinzena");
        meta.Format.Alignment = ParagraphAlignment.Right;
        meta.Format.Font.Size = 8;
        meta.Format.Font.Bold = true;
        meta.Format.Font.Color = Colors.White;

        AddCalculationValues(section, calculation, bonusesOnly);
        AddOccurrences(section, calculation, bonusesOnly);
        section.AddParagraph().Format.SpaceAfter = Unit.FromPoint(9);
    }

    private static void AddCalculationValues(Section section, PaymentCalculation calculation, bool bonusesOnly)
    {
        var table = section.AddTable();
        table.Borders.Width = 0;
        var columns = bonusesOnly ? 3 : 5;
        for (var i = 0; i < columns; i++)
        {
            var column = table.AddColumn(Unit.FromCentimeter(17d / columns));
            column.LeftPadding = Unit.FromPoint(7);
            column.RightPadding = Unit.FromPoint(7);
        }
        var row = table.AddRow();
        row.Height = Unit.FromCentimeter(1.05);
        row.VerticalAlignment = VerticalAlignment.Center;

        var bonus = SumItems(calculation, PaymentItemKind.Bonus);
        var bonusDiscount = SumBonusAbsenceDiscounts(calculation);
        if (bonusesOnly)
        {
            AddSmallValue(row.Cells[0], "Bonificação bruta", bonus);
            AddSmallValue(row.Cells[1], "Desconto por faltas", bonusDiscount, PaymentRed);
            AddSmallValue(row.Cells[2], "Bonificação líquida", Math.Max(0m, bonus - bonusDiscount), PaymentGreen);
        }
        else
        {
            AddSmallValue(row.Cells[0], "Salário base", calculation.BaseValue);
            AddSmallValue(row.Cells[1], "Bonificação", bonus);
            AddSmallValue(row.Cells[2], "Acréscimos", calculation.AdditionValue, PaymentGreen);
            AddSmallValue(row.Cells[3], "Descontos", calculation.DeductionValue, PaymentRed);
            AddSmallValue(row.Cells[4], "Líquido", calculation.NetValue, PaymentGreen);
        }
    }

    private static void AddSmallValue(Cell cell, string label, decimal value, Color? color = null)
    {
        cell.Shading.Color = PaymentLight;
        cell.Borders.Right.Width = Unit.FromPoint(1);
        cell.Borders.Right.Color = Colors.White;
        var paragraph = cell.AddParagraph();
        var labelText = paragraph.AddFormattedText($"{label}\n");
        labelText.Font.Size = 7;
        labelText.Font.Color = Colors.Gray;
        var valueText = paragraph.AddFormattedText(Money(value));
        valueText.Font.Size = 10;
        valueText.Font.Bold = true;
        valueText.Font.Color = color ?? PaymentBrown;
    }

    private static void AddOccurrences(Section section, PaymentCalculation calculation, bool bonusesOnly)
    {
        var relevant = calculation.Items
            .Where(x => bonusesOnly ? x.Kind is PaymentItemKind.Bonus or PaymentItemKind.BonusAbsenceDeduction : IsRelevantPaymentItem(x.Kind))
            .ToList();

        var table = section.AddTable();
        table.Borders.Width = 0.35;
        table.Borders.Color = Colors.Gainsboro;
        table.AddColumn(Unit.FromCentimeter(7.7));
        table.AddColumn(Unit.FromCentimeter(3.7));
        table.AddColumn(Unit.FromCentimeter(2.5));
        table.AddColumn(Unit.FromCentimeter(3.1));

        var header = table.AddRow();
        header.HeadingFormat = true;
        header.Shading.Color = PaymentOrange;
        header.Format.Font.Bold = true;
        header.Format.Font.Color = Colors.White;
        header.Cells[0].AddParagraph("OCORRÊNCIA");
        header.Cells[1].AddParagraph("TIPO");
        header.Cells[2].AddParagraph("QUANTIDADE");
        header.Cells[3].AddParagraph("VALOR");
        header.Cells[2].Format.Alignment = ParagraphAlignment.Center;
        header.Cells[3].Format.Alignment = ParagraphAlignment.Right;

        if (relevant.Count == 0)
        {
            var empty = table.AddRow();
            empty.Cells[0].MergeRight = 3;
            empty.Cells[0].AddParagraph(bonusesOnly ? "Sem descontos na bonificação." : "Sem faltas, horas ou outros ajustes neste pagamento.");
            empty.Cells[0].Format.Font.Color = Colors.Gray;
            empty.Cells[0].Format.Alignment = ParagraphAlignment.Center;
            empty.TopPadding = Unit.FromPoint(6);
            empty.BottomPadding = Unit.FromPoint(6);
            return;
        }

        var alternate = false;
        foreach (var item in relevant)
        {
            var row = table.AddRow();
            row.Shading.Color = alternate ? PaymentLight : Colors.White;
            alternate = !alternate;
            row.TopPadding = Unit.FromPoint(4);
            row.BottomPadding = Unit.FromPoint(4);
            row.Cells[0].AddParagraph(item.Description);
            row.Cells[1].AddParagraph(ItemTypeName(item.Kind));
            row.Cells[2].AddParagraph(ItemQuantity(item));
            row.Cells[2].Format.Alignment = ParagraphAlignment.Center;
            var value = row.Cells[3].AddParagraph(SignedMoney(item));
            value.Format.Font.Bold = true;
            value.Format.Font.Color = IsAddition(item.Kind) ? PaymentGreen : PaymentRed;
            row.Cells[3].Format.Alignment = ParagraphAlignment.Right;
        }
    }

    private static void AddPaymentFooter(Section section)
    {
        var footer = section.Footers.Primary;
        var line = footer.AddParagraph();
        line.Format.Borders.Top.Width = Unit.FromPoint(1.2);
        line.Format.Borders.Top.Color = PaymentOrange;
        line.Format.SpaceAfter = Unit.FromPoint(5);

        var table = footer.AddTable();
        table.Borders.Width = 0;
        table.AddColumn(Unit.FromCentimeter(11));
        table.AddColumn(Unit.FromCentimeter(6));
        var row = table.AddRow();
        var generated = row.Cells[0].AddParagraph($"Cerâmica Canelas  |  Gerado em {DateTime.Now:dd/MM/yyyy HH:mm}");
        generated.Format.Font.Size = 7;
        generated.Format.Font.Color = Colors.Gray;
        var page = row.Cells[1].AddParagraph();
        page.Format.Alignment = ParagraphAlignment.Right;
        page.Format.Font.Size = 7;
        page.Format.Font.Color = Colors.Gray;
        page.AddText("Página ");
        page.AddPageField();
        page.AddText(" de ");
        page.AddNumPagesField();
    }

    private static bool IsRelevantPaymentItem(PaymentItemKind kind) => kind is
        PaymentItemKind.FullAbsence or PaymentItemKind.HalfAbsence or PaymentItemKind.PositiveHours or
        PaymentItemKind.NegativeHours or PaymentItemKind.NightHours or PaymentItemKind.Voucher or
        PaymentItemKind.Addition or PaymentItemKind.Deduction or PaymentItemKind.Bonus or
        PaymentItemKind.BonusAbsenceDeduction;

    private static bool IsAddition(PaymentItemKind kind) => kind is PaymentItemKind.PositiveHours or PaymentItemKind.NightHours or PaymentItemKind.Addition or PaymentItemKind.Bonus;
    private static decimal SumItems(PaymentCalculation calculation, PaymentItemKind kind) => calculation.Items.Where(x => x.Kind == kind).Sum(x => x.Amount);
    private static decimal SumBonusAbsenceDiscounts(PaymentCalculation calculation) => calculation.Items.Where(x => x.Kind == PaymentItemKind.BonusAbsenceDeduction || x.Description.StartsWith("Desconto da bonificacao", StringComparison.OrdinalIgnoreCase)).Sum(x => x.Amount);
    private static string Money(decimal value) => $"R$ {value.ToString("N2", PaymentCulture)}";
    private static string SignedMoney(PaymentCalculationItem item) => $"{(IsAddition(item.Kind) ? "+" : "-")} {Money(item.Amount)}";
    private static string FortnightName(Fortnight value) => value == Fortnight.First ? "1ª" : "2ª";
    private static string EmploymentTypeName(EmploymentType value) => value == EmploymentType.Employee ? "Funcionário" : "Prestador";
    private static string StatusName(PaymentCalculationStatus value) => value switch { PaymentCalculationStatus.Paid => "Pago", PaymentCalculationStatus.Calculated => "Calculado", PaymentCalculationStatus.Cancelled => "Cancelado", _ => "Rascunho" };
    private static string PeriodLabel(int? year, int? month, Fortnight? fortnight)
    {
        var period = year.HasValue && month.HasValue ? $"Competência: {month:00}/{year}" : year.HasValue ? $"Ano: {year}" : month.HasValue ? $"Mês: {month:00}" : "Todos os pagamentos calculados";
        return fortnight.HasValue ? $"{period}  |  {FortnightName(fortnight.Value)} quinzena" : period;
    }

    private static string ItemTypeName(PaymentItemKind kind) => kind switch
    {
        PaymentItemKind.FullAbsence => "Falta inteira",
        PaymentItemKind.HalfAbsence => "Meia falta",
        PaymentItemKind.PositiveHours => "Hora positiva",
        PaymentItemKind.NegativeHours => "Hora negativa",
        PaymentItemKind.NightHours => "Hora noturna",
        PaymentItemKind.Voucher => "Vale",
        PaymentItemKind.Addition => "Acréscimo",
        PaymentItemKind.Deduction => "Desconto",
        PaymentItemKind.Bonus => "Bonificação",
        PaymentItemKind.BonusAbsenceDeduction => "Desconto do bônus",
        _ => "Ajuste"
    };

    private static string ItemQuantity(PaymentCalculationItem item)
    {
        if (item.QuantityMinutes.HasValue)
        {
            var hours = item.QuantityMinutes.Value / 60;
            var minutes = item.QuantityMinutes.Value % 60;
            return $"{hours:00}h {minutes:00}min";
        }
        return item.Quantity?.ToString("N2", PaymentCulture) ?? "-";
    }
}
