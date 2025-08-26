using CeramicaCanelas.Application.Contracts.Application.Services;
using CeramicaCanelas.Application.Features.Sales.Queries.GetProductItemsReport.GetProductItemsReportPdfQuery;
using CeramicaCanelas.Application.Services.EnumExtensions;
using CeramicaCanelas.Application.Services.Reports;
using MigraDocCore.DocumentObjectModel;
using MigraDocCore.DocumentObjectModel.Tables;
using MigraDocCore.Rendering;
using System.Globalization;

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
            string? logoPath = null) // não usado (sem logo)
        {
            var culture = new CultureInfo("pt-BR");
            var primaryColor = Colors.Orange;   // Laranja
            var textColor = Colors.White;     // Texto branco no cabeçalho

            var doc = new Document();
            doc.Info.Title = "Relatório de Venda de Itens";
            doc.DefaultPageSetup.TopMargin = Unit.FromCentimeter(1.5);
            doc.DefaultPageSetup.LeftMargin = Unit.FromCentimeter(1.0);
            doc.DefaultPageSetup.RightMargin = Unit.FromCentimeter(1.2);
            doc.DefaultPageSetup.BottomMargin = Unit.FromCentimeter(2);

            var section = doc.AddSection();

            // =========================
            // Cabeçalho (sem logo) - texto CENTRALIZADO
            // =========================
            var headerTable = section.AddTable();
            headerTable.Borders.Width = 0;
            headerTable.Rows.LeftIndent = 0;
            headerTable.AddColumn(Unit.FromCentimeter(17)); // largura útil total

            var headerRow = headerTable.AddRow();
            headerRow.Height = Unit.FromCentimeter(3.0);
            headerRow.Shading.Color = primaryColor;
            headerRow.TopPadding = Unit.FromPoint(6);
            headerRow.BottomPadding = Unit.FromPoint(6);
            headerRow.VerticalAlignment = VerticalAlignment.Center;

            // paddings iguais para alinhar com os demais blocos
            headerTable.Columns[0].LeftPadding = Unit.FromPoint(8);
            headerTable.Columns[0].RightPadding = Unit.FromPoint(8);

            var infoCell = headerRow.Cells[0];
            infoCell.VerticalAlignment = VerticalAlignment.Center;
            infoCell.Format.Font.Color = textColor;
            infoCell.Format.Alignment = ParagraphAlignment.Center; // centraliza todo conteúdo

            // Nome da empresa
            var companyName = infoCell.AddParagraph(company.Name);
            companyName.Format.Font.Size = 18;
            companyName.Format.Font.Bold = true;
            companyName.Format.SpaceAfter = Unit.FromPoint(2);
            companyName.Format.Alignment = ParagraphAlignment.Center;

            // Descrição comercial
            var tradeDesc = infoCell.AddParagraph(company.TradeDescription);
            tradeDesc.Format.Font.Size = 12;
            tradeDesc.Format.Font.Bold = true;
            tradeDesc.Format.SpaceAfter = Unit.FromPoint(6);
            tradeDesc.Format.Alignment = ParagraphAlignment.Center;

            // Informações legais e contato
            var legalInfo = infoCell.AddParagraph();
            legalInfo.Format.Font.Size = 9;
            legalInfo.Format.LineSpacing = Unit.FromPoint(11);
            legalInfo.Format.Alignment = ParagraphAlignment.Center;
            legalInfo.AddText(company.LegalName);
            legalInfo.AddLineBreak();
            legalInfo.AddText($"{company.StateRegistration} • {company.Cnpj}");
            legalInfo.AddLineBreak();
            legalInfo.AddText(company.Address);
            legalInfo.AddLineBreak();
            legalInfo.AddText(company.CityStateZip);
            legalInfo.AddLineBreak();
            legalInfo.AddText(company.Phones);

            // Espaço após o cabeçalho
            section.AddParagraph().Format.SpaceAfter = Unit.FromPoint(12);

            // =========================
            // Título do Relatório (ALINHADO com o cabeçalho e a tabela)
            // =========================
            var titleSection = section.AddTable();
            titleSection.Borders.Width = 0;
            titleSection.Rows.LeftIndent = 0;
            titleSection.AddColumn(Unit.FromCentimeter(17));

            var titleRow = titleSection.AddRow();
            titleRow.Shading.Color = Colors.LightGray;
            titleRow.TopPadding = Unit.FromPoint(8);
            titleRow.BottomPadding = Unit.FromPoint(8);

            // usar mesmos paddings do cabeçalho para alinhar a borda esquerda
            titleSection.Columns[0].LeftPadding = Unit.FromPoint(8);
            titleSection.Columns[0].RightPadding = Unit.FromPoint(8);

            var titleCell = titleRow.Cells[0];

            var mainTitle = titleCell.AddParagraph("📊 Relatório de Venda de Itens");
            mainTitle.Format.Font.Size = 16;
            mainTitle.Format.Font.Bold = true;
            mainTitle.Format.Font.Color = Colors.Black;

            if (!string.IsNullOrWhiteSpace(subtitle))
            {
                var subTitle = titleCell.AddParagraph(subtitle);
                subTitle.Format.Font.Size = 11;
                subTitle.Format.Font.Color = Colors.Gray;
                subTitle.Format.SpaceBefore = Unit.FromPoint(2);
            }

            var periodInfo = titleCell.AddParagraph($"📅 Período: {period.start:dd/MM/yyyy} a {period.end:dd/MM/yyyy}");
            periodInfo.Format.Font.Size = 10;
            periodInfo.Format.Font.Color = primaryColor;
            periodInfo.Format.Font.Bold = true;
            periodInfo.Format.SpaceBefore = Unit.FromPoint(4);

            section.AddParagraph().Format.SpaceAfter = Unit.FromPoint(12);

            // =========================
            // Tabela de Dados
            // =========================
            var table = section.AddTable();
            table.Borders.Width = 0;
            table.Rows.LeftIndent = 0;
            table.Format.Font.Size = 9;

            table.AddColumn(Unit.FromCentimeter(6.5));  // Produto
            table.AddColumn(Unit.FromCentimeter(2.8));  // Milheiros
            table.AddColumn(Unit.FromCentimeter(3.0));  // Quantidade
            table.AddColumn(Unit.FromCentimeter(3.2));  // Receita
            table.AddColumn(Unit.FromCentimeter(3.0));  // Preço Médio

            var th = table.AddRow();
            th.HeadingFormat = true;
            th.Height = Unit.FromCentimeter(1);
            th.Shading.Color = Colors.Black;
            th.Format.Font.Bold = true;
            th.Format.Font.Color = Colors.White;
            th.Format.Font.Size = 10;
            th.VerticalAlignment = VerticalAlignment.Center;

            th.TopPadding = Unit.FromPoint(8);
            th.BottomPadding = Unit.FromPoint(8);

            // mesmos paddings laterais para alinhar com o bloco do título
            for (int i = 0; i < table.Columns.Count; i++)
            {
                table.Columns[i].LeftPadding = Unit.FromPoint(8);
                table.Columns[i].RightPadding = Unit.FromPoint(8);
            }

            th.Cells[0].AddParagraph("PRODUTO");
            th.Cells[1].AddParagraph("MILHEIROS");
            th.Cells[2].AddParagraph("QTD. (UN)");
            th.Cells[3].AddParagraph("RECEITA (R$)");
            th.Cells[4].AddParagraph("PREÇO MÉD. (R$/MIL)");
            for (int c = 1; c <= 4; c++)
                th.Cells[c].Format.Alignment = ParagraphAlignment.Right;

            bool alternate = false;
            foreach (var r in rows)
            {
                var row = table.AddRow();
                row.Height = Unit.FromPoint(24);
                row.Shading.Color = alternate ? Colors.LightGray : Colors.White;
                alternate = !alternate;

                row.TopPadding = Unit.FromPoint(4);
                row.BottomPadding = Unit.FromPoint(4);
                row.VerticalAlignment = VerticalAlignment.Center;

                var productPara = row.Cells[0].AddParagraph(r.Product.GetDescription());
                productPara.Format.Font.Bold = true;

                row.Cells[1].AddParagraph(r.Milheiros.ToString("N3", culture));
                row.Cells[1].Format.Alignment = ParagraphAlignment.Right;

                row.Cells[2].AddParagraph((r.Milheiros * 1000m).ToString("N0", culture));
                row.Cells[2].Format.Alignment = ParagraphAlignment.Right;

                var revenuePara = row.Cells[3].AddParagraph(r.Revenue.ToString("N2", culture));
                revenuePara.Format.Font.Bold = true;
                revenuePara.Format.Font.Color = Colors.DarkGreen;
                row.Cells[3].Format.Alignment = ParagraphAlignment.Right;

                row.Cells[4].AddParagraph(r.AvgPrice.ToString("N2", culture));
                row.Cells[4].Format.Alignment = ParagraphAlignment.Right;
            }

            var totalRow = table.AddRow();
            totalRow.Height = Unit.FromPoint(32);
            totalRow.Shading.Color = Colors.LightYellow;
            totalRow.Borders.Top.Width = 2;
            totalRow.Borders.Top.Color = primaryColor;
            totalRow.TopPadding = Unit.FromPoint(6);
            totalRow.BottomPadding = Unit.FromPoint(6);
            totalRow.VerticalAlignment = VerticalAlignment.Center;

            var totalLabel = totalRow.Cells[0].AddParagraph("💰 TOTAIS");
            totalLabel.Format.Font.Bold = true;
            totalLabel.Format.Font.Size = 11;

            var totalMilheirosP = totalRow.Cells[1].AddParagraph(totalMilheiros.ToString("N3", culture));
            totalMilheirosP.Format.Font.Bold = true;
            totalRow.Cells[1].Format.Alignment = ParagraphAlignment.Right;

            var totalQtyP = totalRow.Cells[2].AddParagraph((totalMilheiros * 1000m).ToString("N0", culture));
            totalQtyP.Format.Font.Bold = true;
            totalRow.Cells[2].Format.Alignment = ParagraphAlignment.Right;

            var totalRevenueP = totalRow.Cells[3].AddParagraph(totalRevenue.ToString("N2", culture));
            totalRevenueP.Format.Font.Bold = true;
            totalRevenueP.Format.Font.Size = 11;
            totalRevenueP.Format.Font.Color = Colors.DarkGreen;
            totalRow.Cells[3].Format.Alignment = ParagraphAlignment.Right;

            totalRow.Cells[4].AddParagraph("—");
            totalRow.Cells[4].Format.Alignment = ParagraphAlignment.Center;

            // =========================
            // Rodapé
            // =========================
            var footer = section.Footers.Primary;

            var footerLine = footer.AddParagraph();
            footerLine.AddFormattedText(new string('─', 90));
            footerLine.Format.Font.Color = primaryColor;
            footerLine.Format.SpaceBefore = Unit.FromPoint(10);
            footerLine.Format.SpaceAfter = Unit.FromPoint(6);
            footerLine.Format.Alignment = ParagraphAlignment.Center;

            var pageInfo = footer.AddTable();
            pageInfo.Borders.Width = 0;
            pageInfo.AddColumn(Unit.FromCentimeter(8.5));
            pageInfo.AddColumn(Unit.FromCentimeter(8.5));

            var pageRow = pageInfo.AddRow();

            var leftFooter = pageRow.Cells[0].AddParagraph($"Relatório gerado em {DateTime.Now:dd/MM/yyyy HH:mm}");
            leftFooter.Format.Font.Size = 8;
            leftFooter.Format.Font.Color = Colors.Gray;

            var rightFooter = pageRow.Cells[1].AddParagraph();
            rightFooter.Format.Alignment = ParagraphAlignment.Right;
            rightFooter.Format.Font.Size = 8;
            rightFooter.Format.Font.Color = Colors.Gray;
            rightFooter.AddText("Página ");
            rightFooter.AddPageField();
            rightFooter.AddText(" de ");
            rightFooter.AddNumPagesField();

            var renderer = new PdfDocumentRenderer(unicode: true) { Document = doc };
            renderer.RenderDocument();
            using var ms = new MemoryStream();
            renderer.PdfDocument.Save(ms, false);
            return ms.ToArray();
        }
    }
}
