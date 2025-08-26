using CeramicaCanelas.Application.Contracts.Application.Services;
using CeramicaCanelas.Application.Features.Sales.Queries.GetProductItemsReport.GetProductItemsReportPdfQuery;
using CeramicaCanelas.Application.Services.EnumExtensions;
using CeramicaCanelas.Application.Services.Reports;
using MigraDocCore.DocumentObjectModel;
using MigraDocCore.DocumentObjectModel.MigraDoc.DocumentObjectModel.Shapes;
using MigraDocCore.DocumentObjectModel.Tables;
using MigraDocCore.Rendering;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Infrastructure.Reports
{
    public class PdfReportService : IPdfReportService
    {
        public byte[] BuildProductItemsReportPdf(
            CompanyProfile company,
            (DateOnly start, DateOnly end) period,
            IEnumerable<ProductItemsRow> rows,
            decimal totalMilheiros,
            decimal totalRevenue,
            string? subtitle = null,
            string? logoPath = null)
        {
            var culture = new CultureInfo("pt-BR");
            var theme = Colors.Orange; // em MigraDocCore use Colors.Orange (não há Color.FromRgb em algumas versões)

            var doc = new Document();
            doc.Info.Title = "Relatório de Venda de Itens";
            doc.DefaultPageSetup.TopMargin = Unit.FromCentimeter(2);
            doc.DefaultPageSetup.LeftMargin = Unit.FromCentimeter(1.5);
            doc.DefaultPageSetup.RightMargin = Unit.FromCentimeter(1.5);

            var section = doc.AddSection();

            // =========================
            // Cabeçalho (logo + dados)
            // =========================
            var head = section.AddTable();
            head.Borders.Width = 0;
            head.AddColumn(Unit.FromCentimeter(3.5));   // logo
            head.AddColumn(Unit.FromCentimeter(12.5));  // informações

            var headRow = head.AddRow();
            headRow.Shading.Color = theme;

            // ---- Padding do cabeçalho ----
            var padH = Unit.FromPoint(8);  // 8pt nas laterais
            var padV = Unit.FromPoint(6);  // 6pt em cima/baixo

            // horizontal por coluna
            head.Columns[0].LeftPadding = padH;
            head.Columns[0].RightPadding = padH;
            head.Columns[1].LeftPadding = padH;
            head.Columns[1].RightPadding = padH;

            // vertical na linha toda
            headRow.TopPadding = padV;
            headRow.BottomPadding = padV;

            // centraliza verticalmente o conteúdo
            head.Rows.VerticalAlignment = VerticalAlignment.Center;

            var info = headRow.Cells[1];
            info.Format.Font.Color = Colors.Black;

            var p1 = info.AddParagraph(company.Name);
            p1.Format.Font.Size = 16; p1.Format.Font.Bold = true;

            var p2 = info.AddParagraph(company.TradeDescription);
            p2.Format.Font.Size = 11;

            info.AddParagraph(company.LegalName).Format.Font.Size = 9;
            info.AddParagraph($"{company.StateRegistration} · {company.Cnpj}").Format.Font.Size = 9;
            info.AddParagraph(company.Address).Format.Font.Size = 9;
            info.AddParagraph(company.CityStateZip).Format.Font.Size = 9;
            info.AddParagraph(company.Phones).Format.Font.Size = 9;

            section.AddParagraph().Format.SpaceAfter = Unit.FromPoint(8);

            // ===== título do relatório =====
            var title = section.AddParagraph("Relatório de Venda de Itens");
            title.Format.Font.Size = 14;
            title.Format.Font.Bold = true;
            title.Format.SpaceAfter = Unit.FromPoint(4);

            // Barra divisória fina
            var divider = section.AddParagraph();
            divider.AddFormattedText(new string('─', 80));
            divider.Format.Font.Color = Colors.Orange;
            divider.Format.SpaceAfter = Unit.FromPoint(10);

            if (!string.IsNullOrWhiteSpace(subtitle))
            {
                var sub = section.AddParagraph(subtitle);
                sub.Format.Font.Size = 9;
                sub.Format.Font.Color = Colors.Gray;
                sub.Format.SpaceBefore = Unit.FromPoint(2);
            }

            var periodP = section.AddParagraph($"Período: {period.start:dd/MM/yyyy} a {period.end:dd/MM/yyyy}");
            periodP.Format.Font.Size = 9;
            periodP.Format.SpaceAfter = Unit.FromPoint(8);

            // Barra divisória
            section.AddParagraph().Format.SpaceAfter = Unit.FromPoint(6);

            // =========================
            // Tabela
            // =========================
            var table = section.AddTable();
            table.Borders.Width = 0.5;
            table.Rows.LeftIndent = 0;

            // fonte padrão menor para caber melhor
            table.Format.Font.Size = 9;

            // Larguras totalizando 17,8 cm (<= 18 cm de área útil)
            table.AddColumn(Unit.FromCentimeter(6.2)); // Produto
            table.AddColumn(Unit.FromCentimeter(2.8)); // Milheiros
            table.AddColumn(Unit.FromCentimeter(3.0)); // Quantidade (un)
            table.AddColumn(Unit.FromCentimeter(3.0)); // Receita
            table.AddColumn(Unit.FromCentimeter(2.8)); // Preço Médio (R$/milheiro)

            // Cabeçalho
            var header = table.AddRow();
            header.HeadingFormat = true;               // repete em páginas seguintes
            header.Shading.Color = theme;
            header.Format.Font.Bold = true;
            header.Format.Font.Color = Colors.Black;

            header.Cells[0].AddParagraph("Produto");
            header.Cells[1].AddParagraph("Milheiros");
            header.Cells[2].AddParagraph("Quantidade (un)");
            header.Cells[3].AddParagraph("Receita (R$)");
            header.Cells[4].AddParagraph("Preço Médio (R$/milheiro)");

            // alinha números à direita para ganhar espaço visual
            for (int c = 1; c <= 4; c++)
                header.Cells[c].Format.Alignment = ParagraphAlignment.Right;

            bool zebra = false;
            foreach (var r in rows)
            {
                var row = table.AddRow();
                if (zebra) row.Shading.Color = Colors.WhiteSmoke;
                zebra = !zebra;

                row.Cells[0].AddParagraph(r.Product.GetDescription());

                row.Cells[1].AddParagraph(r.Milheiros.ToString("N3", culture));
                row.Cells[1].Format.Alignment = ParagraphAlignment.Right;

                row.Cells[2].AddParagraph((r.Milheiros * 1000m).ToString("N0", culture));
                row.Cells[2].Format.Alignment = ParagraphAlignment.Right;

                row.Cells[3].AddParagraph(r.Revenue.ToString("N2", culture));
                row.Cells[3].Format.Alignment = ParagraphAlignment.Right;

                row.Cells[4].AddParagraph(r.AvgPrice.ToString("N2", culture));
                row.Cells[4].Format.Alignment = ParagraphAlignment.Right;
            }

            // Totais
            var totalRow = table.AddRow();
            totalRow.Borders.Top.Width = 0.75;

            totalRow.Cells[0].AddParagraph("Totais").Format.Font.Bold = true;
            totalRow.Cells[0].Format.Alignment = ParagraphAlignment.Left;

            totalRow.Cells[1].AddParagraph(totalMilheiros.ToString("N3", culture));
            totalRow.Cells[1].Format.Alignment = ParagraphAlignment.Right;

            totalRow.Cells[2].AddParagraph((totalMilheiros * 1000m).ToString("N0", culture));
            totalRow.Cells[2].Format.Alignment = ParagraphAlignment.Right;

            totalRow.Cells[3].AddParagraph(totalRevenue.ToString("N2", culture));
            totalRow.Cells[3].Format.Alignment = ParagraphAlignment.Right;
            totalRow.Cells[3].Format.Font.Bold = true;

            totalRow.Cells[4].AddParagraph("");

            // Rodapé com paginação
            var footer = section.Footers.Primary.AddParagraph();
            footer.Format.SpaceBefore = Unit.FromPoint(10);
            footer.Format.Alignment = ParagraphAlignment.Right;
            footer.AddText("Página ");
            footer.AddPageField();
            footer.AddText(" de ");
            footer.AddNumPagesField();

            var renderer = new PdfDocumentRenderer(unicode: true) { Document = doc };
            renderer.RenderDocument();
            using var ms = new MemoryStream();
            renderer.PdfDocument.Save(ms, false);
            return ms.ToArray();
        }
    }
}
