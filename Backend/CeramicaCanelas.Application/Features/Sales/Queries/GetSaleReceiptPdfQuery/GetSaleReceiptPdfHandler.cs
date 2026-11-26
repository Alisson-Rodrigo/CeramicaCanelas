using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Application.Services.EnumExtensions;
using CeramicaCanelas.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using MigraDocCore.DocumentObjectModel;
using MigraDocCore.DocumentObjectModel.Tables;
using MigraDocCore.Rendering;
using System.Globalization;
using PdfUnit = MigraDocCore.DocumentObjectModel.Unit;

namespace CeramicaCanelas.Application.Features.Sales.Queries.GetSaleReceiptPdfQuery
{
    public class GetSaleReceiptPdfHandler(ISalesRepository salesRepository) : IRequestHandler<GetSaleReceiptPdfQuery, byte[]>
    {
        private const double ReceiptWidthMm = 72.1;
        private const double SideMarginMm = 5;
        private const double ContentWidthMm = ReceiptWidthMm - 2 * SideMarginMm;
        private static readonly CultureInfo BrazilianCulture = CultureInfo.GetCultureInfo("pt-BR");

        public async Task<byte[]> Handle(GetSaleReceiptPdfQuery request, CancellationToken cancellationToken)
        {
            var sale = await salesRepository.QueryAllWithIncludes()
                .FirstOrDefaultAsync(s => s.Id == request.SaleId, cancellationToken);

            if (sale is null)
                throw new Exception("Venda não encontrada.");

            var document = new Document();
            var normal = document.Styles["Normal"];
            normal.Font.Name = "Arial";
            normal.Font.Size = 8;
            var section = document.AddSection();

            section.PageSetup.Orientation = Orientation.Portrait;
            section.PageSetup.PageWidth = PdfUnit.FromMillimeter(ReceiptWidthMm);
            section.PageSetup.PageHeight = PdfUnit.FromMillimeter(240);
            section.PageSetup.LeftMargin = PdfUnit.FromMillimeter(SideMarginMm);
            section.PageSetup.RightMargin = PdfUnit.FromMillimeter(SideMarginMm);
            section.PageSetup.TopMargin = PdfUnit.FromMillimeter(5);
            section.PageSetup.BottomMargin = PdfUnit.FromMillimeter(5);

            AddHeader(section, sale);
            AddProducts(section, sale.Items);
            AddTotals(section, sale);
            AddPayments(section, sale);
            AddSignature(section);

            var renderer = new PdfDocumentRenderer(unicode: true) { Document = document };
            renderer.RenderDocument();

            using var stream = new MemoryStream();
            renderer.PdfDocument.Save(stream, false);
            return stream.ToArray();
        }

        private static void AddHeader(Section section, Sale sale)
        {
            var company = section.AddParagraph("CERÂMICA CANELAS");
            company.Format.Font.Bold = true;
            company.Format.Font.Size = 11;
            company.Format.Alignment = ParagraphAlignment.Center;
            company.Format.SpaceAfter = PdfUnit.FromPoint(3);

            var contact = section.AddParagraph("CNPJ: 22.399.038/0001-11");
            contact.AddLineBreak();
            contact.AddText("Sussuapara - PI");
            contact.AddLineBreak();
            contact.AddText("(89) 98818-8560 / (89) 98812-2809");
            contact.Format.Alignment = ParagraphAlignment.Center;
            contact.Format.SpaceAfter = PdfUnit.FromPoint(8);
            contact.Format.Borders.Bottom.Width = PdfUnit.FromPoint(0.5);
            contact.Format.Borders.DistanceFromBottom = PdfUnit.FromPoint(5);

            var title = section.AddParagraph($"VENDA Nº {sale.NoteNumber}");
            title.Format.Font.Bold = true;
            title.Format.SpaceAfter = PdfUnit.FromPoint(3);

            var details = section.AddParagraph($"Data: {sale.Date:dd/MM/yyyy}   Hora: {ConvertUtcToBrazilTime(sale.CreatedOn):HH:mm}");
            details.AddLineBreak();
            details.AddText($"Cliente: {sale.CustomerName}");
            details.AddLineBreak();
            details.AddText($"Endereço: {sale.CustomerAddress}");
            details.AddLineBreak();
            details.AddText($"Cidade/UF: {sale.City}-{sale.State}");
            details.AddLineBreak();
            details.AddText($"Telefone: {sale.CustomerPhone}");
            details.Format.SpaceAfter = PdfUnit.FromPoint(7);
        }

        private static void AddProducts(Section section, IEnumerable<SaleItem> items)
        {
            var table = section.AddTable();
            table.LeftPadding = PdfUnit.FromMillimeter(1);
            table.RightPadding = PdfUnit.FromMillimeter(1);
            table.Rows.LeftIndent = PdfUnit.FromPoint(0);
            table.AddColumn(PdfUnit.FromMillimeter(18));
            table.AddColumn(PdfUnit.FromMillimeter(20));
            table.AddColumn(PdfUnit.FromMillimeter(ContentWidthMm - 38));

            var header = table.AddRow();
            header.HeadingFormat = true;
            header.Shading.Color = Colors.LightGray;
            header.Format.Font.Bold = true;
            header.TopPadding = PdfUnit.FromPoint(3);
            header.BottomPadding = PdfUnit.FromPoint(3);
            header.Cells[0].AddParagraph("Qtd.").Format.Alignment = ParagraphAlignment.Right;
            header.Cells[1].AddParagraph("Unit. (R$)").Format.Alignment = ParagraphAlignment.Right;
            header.Cells[2].AddParagraph("Total (R$)").Format.Alignment = ParagraphAlignment.Right;

            foreach (var item in items)
            {
                // Keep the full-width product label with its amounts if the table spans pages.
                var product = table.AddRow();
                product.KeepWith = 1;
                product.TopPadding = PdfUnit.FromPoint(4);
                product.Cells[0].MergeRight = 2;
                product.Cells[0].AddParagraph(item.Product.GetDescription()).Format.Font.Bold = true;

                var amounts = table.AddRow();
                amounts.TopPadding = PdfUnit.FromPoint(1);
                amounts.BottomPadding = PdfUnit.FromPoint(4);
                amounts.Borders.Bottom.Width = PdfUnit.FromPoint(0.4);
                amounts.Borders.Bottom.Color = Colors.LightGray;
                amounts.Cells[0].AddParagraph(FormatQuantity(item.Quantity)).Format.Alignment = ParagraphAlignment.Right;
                amounts.Cells[1].AddParagraph(item.UnitPrice.ToString("N2", BrazilianCulture)).Format.Alignment = ParagraphAlignment.Right;
                amounts.Cells[2].AddParagraph((item.UnitPrice * item.Quantity).ToString("N2", BrazilianCulture)).Format.Alignment = ParagraphAlignment.Right;
            }
        }

        private static void AddTotals(Section section, Sale sale)
        {
            var subtotal = AddAmount(section, "Subtotal", sale.TotalGross);
            subtotal.Format.SpaceBefore = PdfUnit.FromPoint(6);
            subtotal.Format.KeepWithNext = true;

            if (sale.Discount > 0)
                AddAmount(section, "Desconto", sale.Discount).Format.KeepWithNext = true;

            var total = AddAmount(section, "TOTAL", sale.TotalNet);
            total.Format.Font.Bold = true;
            total.Format.Font.Size = 10;
            total.Format.SpaceAfter = PdfUnit.FromPoint(7);
        }

        private static void AddPayments(Section section, Sale sale)
        {
            var status = section.AddParagraph($"Status da venda: {sale.Status.GetDescription()}");
            status.Format.Font.Bold = true;

            if (sale.Payments.Count == 0)
                return;

            status.Format.KeepWithNext = true;
            status.Format.SpaceAfter = PdfUnit.FromPoint(4);
            var title = section.AddParagraph("Pagamentos");
            title.Format.Font.Bold = true;
            title.Format.KeepWithNext = true;

            var table = section.AddTable();
            table.LeftPadding = PdfUnit.FromMillimeter(0.5);
            table.RightPadding = PdfUnit.FromMillimeter(0.5);
            table.Rows.LeftIndent = PdfUnit.FromPoint(0);
            table.AddColumn(PdfUnit.FromMillimeter(26));
            table.AddColumn(PdfUnit.FromMillimeter(15.5));
            table.AddColumn(PdfUnit.FromMillimeter(ContentWidthMm - 41.5));

            foreach (var payment in sale.Payments)
            {
                var row = table.AddRow();
                row.TopPadding = PdfUnit.FromPoint(2);
                row.BottomPadding = PdfUnit.FromPoint(2);
                row.Cells[0].AddParagraph(payment.PaymentMethod.ToString());
                if (payment.PaymentDate is { } date)
                    row.Cells[1].AddParagraph(date.ToString("dd/MM/yyyy", BrazilianCulture));
                row.Cells[2].AddParagraph(FormatMoney(payment.Amount)).Format.Alignment = ParagraphAlignment.Right;
            }

            var paid = AddAmount(section, "Pago", sale.GetTotalPaid());
            paid.Format.SpaceBefore = PdfUnit.FromPoint(4);
            var remaining = sale.GetRemainingBalance();
            if (remaining > 0)
            {
                paid.Format.KeepWithNext = true;
                AddAmount(section, "Restante", remaining);
            }
        }

        private static void AddSignature(Section section)
        {
            var signature = section.AddParagraph("Assinatura do Cliente");
            signature.Format.Alignment = ParagraphAlignment.Center;
            signature.Format.SpaceBefore = PdfUnit.FromPoint(24);
            signature.Format.SpaceAfter = PdfUnit.FromPoint(8);
            signature.Format.LeftIndent = PdfUnit.FromMillimeter(8);
            signature.Format.RightIndent = PdfUnit.FromMillimeter(8);
            signature.Format.Borders.Top.Width = PdfUnit.FromPoint(0.5);
            signature.Format.Borders.DistanceFromTop = PdfUnit.FromPoint(4);
            signature.Format.KeepWithNext = true;

            var footer = section.AddParagraph("OBRIGADO PELA PREFERÊNCIA!");
            footer.Format.Alignment = ParagraphAlignment.Center;
        }

        private static Paragraph AddAmount(Section section, string label, decimal amount)
        {
            var paragraph = section.AddParagraph($"{label}: {FormatMoney(amount)}");
            paragraph.Format.Alignment = ParagraphAlignment.Right;
            return paragraph;
        }

        private static string FormatMoney(decimal amount) => $"R$ {amount.ToString("N2", BrazilianCulture)}";

        private static string FormatQuantity(decimal quantity)
        {
            if (quantity > 0m && quantity < 1m)
            {
                var pieces = Math.Round(quantity * 1000m, 0, MidpointRounding.AwayFromZero);
                return $"{pieces.ToString("0", BrazilianCulture)} un";
            }

            return $"{quantity.ToString("0.##", BrazilianCulture)} mi";
        }

        private static DateTime ConvertUtcToBrazilTime(DateTime value)
        {
            var utc = DateTime.SpecifyKind(value, DateTimeKind.Utc);
            var timeZoneId = OperatingSystem.IsWindows() ? "E. South America Standard Time" : "America/Fortaleza";
            return TimeZoneInfo.ConvertTimeFromUtc(utc, TimeZoneInfo.FindSystemTimeZoneById(timeZoneId));
        }
    }
}
