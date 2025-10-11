using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Application.Services.EnumExtensions; // ✅ Import da extensão
using Microsoft.EntityFrameworkCore;
using MigraDocCore.DocumentObjectModel;
using MigraDocCore.DocumentObjectModel.Tables;
using MigraDocCore.Rendering;
using System.Globalization;
using PdfUnit = MigraDocCore.DocumentObjectModel.Unit;

namespace CeramicaCanelas.Application.Features.Sales.Queries.GetSaleReceiptPdfQuery
{
    public class GetSaleReceiptPdfHandler : MediatR.IRequestHandler<GetSaleReceiptPdfQuery, byte[]>
    {
        private readonly ISalesRepository _salesRepository;

        public GetSaleReceiptPdfHandler(ISalesRepository salesRepository)
        {
            _salesRepository = salesRepository;
        }

        public async Task<byte[]> Handle(GetSaleReceiptPdfQuery req, CancellationToken ct)
        {
            // 🔹 Busca da venda
            var sale = await _salesRepository.QueryAllWithIncludes()
                .Include(s => s.Items)
                .Include(s => s.Payments)
                .FirstOrDefaultAsync(s => s.Id == req.SaleId, ct);

            if (sale == null)
                throw new Exception("Venda não encontrada.");

            // ==============================
            // 🔸 Configurações base
            // ==============================
            var culture = new CultureInfo("pt-BR");
            var doc = new Document();
            var section = doc.AddSection();

            section.PageSetup.PageWidth = PdfUnit.FromMillimeter(72.1);
            section.PageSetup.PageHeight = PdfUnit.FromMillimeter(240);
            section.PageSetup.LeftMargin = PdfUnit.FromMillimeter(5);
            section.PageSetup.RightMargin = PdfUnit.FromMillimeter(5);
            section.PageSetup.TopMargin = PdfUnit.FromMillimeter(5);
            section.PageSetup.BottomMargin = PdfUnit.FromMillimeter(5);

            doc.Styles["Normal"].Font.Name = "Arial";
            doc.Styles["Normal"].Font.Size = 8;

            // ==============================
            // 🔸 Cabeçalho da empresa
            // ==============================
            var header = section.AddParagraph("CERÂMICA CANELAS");
            header.Format.Font.Bold = true;
            header.Format.Font.Size = 11;
            header.Format.Alignment = ParagraphAlignment.Center;
            header.Format.SpaceAfter = PdfUnit.FromPoint(2);

            section.AddParagraph("CNPJ: 22.399.038/0001-11\nSussuapara - PI")
                .Format.Alignment = ParagraphAlignment.Center;

            section.AddParagraph("(89) 98818-8560 • (89) 98812-2809")
                .Format.Alignment = ParagraphAlignment.Center;

            var separator = section.AddParagraph(new string('-', 40));
            separator.Format.Alignment = ParagraphAlignment.Center;
            separator.Format.SpaceBefore = PdfUnit.FromPoint(4);
            separator.Format.SpaceAfter = PdfUnit.FromPoint(4);

            // ==============================
            // 🔸 Dados do cliente e venda
            // ==============================
            var info = section.AddParagraph();
            info.AddFormattedText($"VENDA Nº {sale.NoteNumber}\n", TextFormat.Bold);
            info.AddText($"Data: {sale.Date:dd/MM/yyyy}\n");
            info.AddText($"Cliente: {sale.CustomerName}\n");
            info.AddText($"Endereço: {sale.CustomerAddress}\n");
            info.AddText($"Cidade/UF: {sale.City}-{sale.State}\n");
            info.AddText($"Telefone: {sale.CustomerPhone}");
            info.Format.SpaceAfter = PdfUnit.FromPoint(6);

            // ==============================
            // 🔸 Itens da venda
            // ==============================
            var table = section.AddTable();
            table.Borders.Width = 0;

            // 🔹 Ajuste das colunas (evita corte)
            table.AddColumn(PdfUnit.FromMillimeter(27)); // Produto
            table.AddColumn(PdfUnit.FromMillimeter(10)); // Qtd
            table.AddColumn(PdfUnit.FromMillimeter(12)); // Unit
            table.AddColumn(PdfUnit.FromMillimeter(12)); // Total

            var headerRow = table.AddRow();
            headerRow.Format.Font.Bold = true;
            headerRow.Shading.Color = Colors.LightGray;
            headerRow.Format.Font.Size = 8;
            headerRow.Cells[0].AddParagraph("Prod");
            headerRow.Cells[1].AddParagraph("Qtd");
            headerRow.Cells[2].AddParagraph("ValorUnid");
            headerRow.Cells[3].AddParagraph("Total");

            // 🔹 Linhas dinâmicas com quebra automática
            foreach (var item in sale.Items)
            {
                var row = table.AddRow();
                row.Format.Font.Size = 8;

                // ✅ Usa descrição do enum (GetDescription)
                var productName = (item.Product as Enum)?.GetDescription() ?? item.Product.ToString();

                var p = row.Cells[0].AddParagraph(productName);
                p.Format.Alignment = ParagraphAlignment.Left;
                p.Format.Font.Size = 8;
                row.Cells[0].VerticalAlignment = VerticalAlignment.Top;

                // 🔸 Quebra automática de linha
                row.Cells[0].Format.Alignment = ParagraphAlignment.Left;
                row.Cells[0].Format.Font.Size = 8;

                row.Cells[1].AddParagraph(item.Quantity.ToString("N0", culture)).Format.Alignment = ParagraphAlignment.Right;
                row.Cells[2].AddParagraph(item.UnitPrice.ToString("N2", culture)).Format.Alignment = ParagraphAlignment.Right;
                row.Cells[3].AddParagraph((item.UnitPrice * item.Quantity).ToString("N2", culture)).Format.Alignment = ParagraphAlignment.Right;
            }

            section.AddParagraph().Format.SpaceAfter = PdfUnit.FromPoint(4);

            // ==============================
            // 🔸 Totais
            // ==============================
            var subtotal = sale.Items.Sum(i => i.UnitPrice * i.Quantity);
            var totalP = section.AddParagraph($"Subtotal: R$ {subtotal:N2}");
            totalP.Format.Alignment = ParagraphAlignment.Right;

            if (sale.Discount > 0)
            {
                var descP = section.AddParagraph($"Desconto: R$ {sale.Discount:N2}");
                descP.Format.Alignment = ParagraphAlignment.Right;
            }

            var total = subtotal - sale.Discount;
            var totalFinal = section.AddParagraph($"TOTAL: R$ {total:N2}");
            totalFinal.Format.Font.Bold = true;
            totalFinal.Format.Alignment = ParagraphAlignment.Right;
            totalFinal.Format.SpaceAfter = PdfUnit.FromPoint(6);

            // ==============================
            // 🔸 Pagamentos
            // ==============================
            if (sale.Payments.Any())
            {
                var payTitle = section.AddParagraph("💳 Pagamentos");
                payTitle.Format.Font.Bold = true;
                payTitle.Format.SpaceAfter = PdfUnit.FromPoint(3);

                foreach (var p in sale.Payments)
                {
                    var line = section.AddParagraph($"{p.PaymentMethod} - {p.PaymentDate:dd/MM/yyyy} - R$ {p.Amount:N2}");
                    line.Format.Font.Size = 8;
                }

                var totalPago = sale.Payments.Sum(p => p.Amount);
                var restante = total - totalPago;
                section.AddParagraph().Format.SpaceAfter = PdfUnit.FromPoint(3);
                var pagoP = section.AddParagraph($"Pago: R$ {totalPago:N2}");
                pagoP.Format.Alignment = ParagraphAlignment.Right;

                if (restante > 0)
                {
                    var pendP = section.AddParagraph($"Restante: R$ {restante:N2}");
                    pendP.Format.Alignment = ParagraphAlignment.Right;
                }
            }

            // ==============================
            // 🔸 Espaço para assinatura
            // ==============================
            section.AddParagraph().Format.SpaceAfter = PdfUnit.FromPoint(20);
            var signLine = section.AddParagraph("_________________________________________");
            signLine.Format.Alignment = ParagraphAlignment.Center;
            signLine.Format.SpaceBefore = PdfUnit.FromPoint(10);

            var signText = section.AddParagraph("Assinatura do Cliente");
            signText.Format.Alignment = ParagraphAlignment.Center;
            signText.Format.Font.Size = 8;
            signText.Format.SpaceAfter = PdfUnit.FromPoint(15);

            // ==============================
            // 🔸 Rodapé
            // ==============================
            section.AddParagraph(new string('-', 40)).Format.Alignment = ParagraphAlignment.Center;
            var footer = section.AddParagraph("OBRIGADO PELA PREFERÊNCIA!");
            footer.Format.Alignment = ParagraphAlignment.Center;
            footer.Format.Font.Size = 8;
            footer.Format.Font.Color = Colors.Gray;

            // ==============================
            // 🔸 Renderização final
            // ==============================
            var renderer = new PdfDocumentRenderer(unicode: true) { Document = doc };
            renderer.RenderDocument();

            using var ms = new MemoryStream();
            renderer.PdfDocument.Save(ms, false);
            return ms.ToArray();
        }
    }
}
