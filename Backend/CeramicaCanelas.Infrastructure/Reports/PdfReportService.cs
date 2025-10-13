using CeramicaCanelas.Application.Contracts.Application.Services;
using CeramicaCanelas.Application.Features.Sales.Queries.GetProductItemsReport.GetProductItemsReportPdfQuery;
using CeramicaCanelas.Application.Services.EnumExtensions;
using CeramicaCanelas.Application.Services.Reports;
using MigraDocCore.DocumentObjectModel;
using MigraDocCore.DocumentObjectModel.Tables;
using MigraDocCore.Rendering;
using System.Globalization;
using static CeramicaCanelas.Application.Contracts.Application.Services.IPdfReportService;

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
            string? logoPath = null,
            IEnumerable<AppliedFilter>? filters = null) // não usado (sem logo)
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
            // Filtros aplicados (opcional) - VERSÃO ESTILIZADA
            // =========================
            if (filters != null && filters.Any())
            {
                var filtersTable = section.AddTable();
                filtersTable.Borders.Width = 0; // Remove bordas para seguir o padrão
                filtersTable.Rows.LeftIndent = 0;

                // Uma coluna única para manter alinhamento com outros blocos
                filtersTable.AddColumn(Unit.FromCentimeter(17));

                // Cabeçalho dos filtros - seguindo o padrão do título
                var filterHeaderRow = filtersTable.AddRow();
                filterHeaderRow.Shading.Color = Colors.LightGray;
                filterHeaderRow.TopPadding = Unit.FromPoint(8);
                filterHeaderRow.BottomPadding = Unit.FromPoint(8);

                // Mesmos paddings para alinhar com outros blocos
                filtersTable.Columns[0].LeftPadding = Unit.FromPoint(8);
                filtersTable.Columns[0].RightPadding = Unit.FromPoint(8);

                var filterHeaderCell = filterHeaderRow.Cells[0];
                var filterTitle = filterHeaderCell.AddParagraph("🔍 Filtros Aplicados");
                filterTitle.Format.Font.Size = 14;
                filterTitle.Format.Font.Bold = true;
                filterTitle.Format.Font.Color = Colors.Black;

                // Container para os filtros individuais
                var filterContentRow = filtersTable.AddRow();
                filterContentRow.TopPadding = Unit.FromPoint(8);
                filterContentRow.BottomPadding = Unit.FromPoint(8);
                filterContentRow.Shading.Color = Colors.White;

                var filterContentCell = filterContentRow.Cells[0];

                // Adicionar os filtros como parágrafos formatados dentro da célula
                foreach (var f in filters)
                {
                    // Criar um parágrafo para cada filtro
                    var filterPara = filterContentCell.AddParagraph();
                    filterPara.Format.SpaceBefore = Unit.FromPoint(2);
                    filterPara.Format.SpaceAfter = Unit.FromPoint(2);

                    // Adicionar o rótulo com estilo destacado
                    var labelText = filterPara.AddFormattedText($"• {f.Label}: ");
                    labelText.Font.Size = 10;
                    labelText.Font.Bold = true;
                    labelText.Color = primaryColor;

                    // Adicionar o valor
                    var valueText = filterPara.AddFormattedText(f.Value);
                    valueText.Font.Size = 10;
                    valueText.Color = Colors.Black;
                }

                section.AddParagraph().Format.SpaceAfter = Unit.FromPoint(12);
            }

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

        public byte[] BuildTrialBalancePdf(
    CompanyProfile company,
    (DateOnly start, DateOnly end) period,
    IEnumerable<TrialBalanceAccountRow> accounts,
    IEnumerable<TrialBalanceGroupRow> groups,
    IEnumerable<TrialBalanceExtractRow> extracts,
    decimal totalIncomeOverall,
    decimal totalExpenseOverall,
    decimal totalExtractOverall, // ✅ novo parâmetro
    string? logoPath = null,
    IEnumerable<TrialBalanceFilter>? filters = null)
        {
            var culture = new CultureInfo("pt-BR");
            var primaryColor = Colors.Orange;
            var textColor = Colors.White;

            var doc = new Document();
            doc.Info.Title = "Balancete de Verificação";
            doc.DefaultPageSetup.TopMargin = Unit.FromCentimeter(1.5);
            doc.DefaultPageSetup.LeftMargin = Unit.FromCentimeter(1.0);
            doc.DefaultPageSetup.RightMargin = Unit.FromCentimeter(1.2);
            doc.DefaultPageSetup.BottomMargin = Unit.FromCentimeter(2);

            var section = doc.AddSection();

            // -------------------------------
            // Cabeçalho
            // -------------------------------
            var headerTable = section.AddTable();
            headerTable.AddColumn(Unit.FromCentimeter(17));
            var headerRow = headerTable.AddRow();
            headerRow.Shading.Color = primaryColor;

            var headerCell = headerRow.Cells[0];
            headerCell.Format.Alignment = ParagraphAlignment.Center;
            headerCell.Format.Font.Color = textColor;

            var namePara = headerCell.AddParagraph(company.Name);
            namePara.Format.Font.Size = 18;
            namePara.Format.Font.Bold = true;

            headerCell.AddParagraph(company.TradeDescription);
            headerCell.AddParagraph($"{company.Cnpj} • {company.StateRegistration}");

            section.AddParagraph().Format.SpaceAfter = Unit.FromPoint(10);

            // -------------------------------
            // Título
            // -------------------------------
            var title = section.AddParagraph("📘 BALANCETE DE VERIFICAÇÃO");
            title.Format.Font.Size = 15;
            title.Format.Font.Bold = true;
            title.Format.Alignment = ParagraphAlignment.Center;
            section.AddParagraph($"Período: {period.start:dd/MM/yyyy} a {period.end:dd/MM/yyyy}")
                   .Format.Alignment = ParagraphAlignment.Center;

            section.AddParagraph().Format.SpaceAfter = Unit.FromPoint(10);


            // -------------------------------
            // Resumo Financeiro (3 quadrados)
            // -------------------------------
            var resumoTable = section.AddTable();
            resumoTable.Borders.Width = 0;
            resumoTable.AddColumn(Unit.FromCentimeter(5.5));
            resumoTable.AddColumn(Unit.FromCentimeter(5.5));
            resumoTable.AddColumn(Unit.FromCentimeter(6));

            var resumoRow = resumoTable.AddRow();
            resumoRow.Height = Unit.FromCentimeter(2.2);
            resumoRow.VerticalAlignment = VerticalAlignment.Center;

            // --- Entrada ---
            var cellEntrada = resumoRow.Cells[0];
            cellEntrada.Shading.Color = Colors.LightGreen;
            cellEntrada.Borders.Width = 0.5;
            cellEntrada.Borders.Color = Colors.Gray;
            cellEntrada.Format.Alignment = ParagraphAlignment.Center;
            cellEntrada.AddParagraph("💰 Entradas").Format.Font.Bold = true;
            var valEntrada = cellEntrada.AddParagraph(totalIncomeOverall.ToString("C2", culture));
            valEntrada.Format.Font.Size = 12;
            valEntrada.Format.Font.Color = Colors.DarkGreen;
            valEntrada.Format.Font.Bold = true;

            // --- Saída ---
            var cellSaida = resumoRow.Cells[1];
            cellSaida.Shading.Color = Colors.LightSalmon;
            cellSaida.Borders.Width = 0.5;
            cellSaida.Borders.Color = Colors.Gray;
            cellSaida.Format.Alignment = ParagraphAlignment.Center;
            cellSaida.AddParagraph("💸 Saídas").Format.Font.Bold = true;
            var valSaida = cellSaida.AddParagraph(totalExpenseOverall.ToString("C2", culture));
            valSaida.Format.Font.Size = 12;
            valSaida.Format.Font.Color = Colors.DarkRed;
            valSaida.Format.Font.Bold = true;

            // --- Saldo ---
            var cellSaldo = resumoRow.Cells[2];
            cellSaldo.Shading.Color = Colors.LightYellow;
            cellSaldo.Borders.Width = 0.5;
            cellSaldo.Borders.Color = Colors.Gray;
            cellSaldo.Format.Alignment = ParagraphAlignment.Center;
            cellSaldo.AddParagraph("📊 Saldo do Período").Format.Font.Bold = true;

            decimal saldoPeriodo = totalIncomeOverall - totalExpenseOverall;
            var valSaldo = cellSaldo.AddParagraph(saldoPeriodo.ToString("C2", culture));
            valSaldo.Format.Font.Size = 12;
            valSaldo.Format.Font.Bold = true;
            valSaldo.Format.Font.Color = saldoPeriodo >= 0 ? Colors.DarkGreen : Colors.Red;

            section.AddParagraph().Format.SpaceAfter = Unit.FromPoint(15);


            // -------------------------------
            // Filtros
            // -------------------------------
            if (filters != null && filters.Any())
            {
                var filtersTitle = section.AddParagraph("🔍 Filtros Aplicados:");
                filtersTitle.Format.Font.Bold = true;
                filtersTitle.Format.Font.Size = 11;
                foreach (var f in filters)
                {
                    section.AddParagraph($"• {f.Label}: {f.Value}").Format.Font.Size = 9;
                }
                section.AddParagraph().Format.SpaceAfter = Unit.FromPoint(10);
            }

            // -------------------------------
            // Entradas
            // -------------------------------
            var tableAccounts = section.AddTable();
            tableAccounts.Borders.Width = 0.5;
            tableAccounts.AddColumn(Unit.FromCentimeter(10));
            tableAccounts.AddColumn(Unit.FromCentimeter(5));

            var headerA = tableAccounts.AddRow();
            headerA.Shading.Color = Colors.Black;
            headerA.Format.Font.Color = Colors.White;
            headerA.Format.Font.Bold = true;
            headerA.Cells[0].AddParagraph("Conta / Banco");
            headerA.Cells[1].AddParagraph("Entradas (R$)").Format.Alignment = ParagraphAlignment.Right;

            foreach (var a in accounts)
            {
                var r = tableAccounts.AddRow();
                r.Cells[0].AddParagraph(a.AccountName);
                r.Cells[1].AddParagraph(a.TotalIncome.ToString("N2", culture)).Format.Alignment = ParagraphAlignment.Right;
            }

            var totalA = tableAccounts.AddRow();
            totalA.Shading.Color = Colors.LightYellow;
            totalA.Cells[0].AddParagraph("💰 Total Geral de Entradas");
            totalA.Cells[1].AddParagraph(totalIncomeOverall.ToString("N2", culture)).Format.Alignment = ParagraphAlignment.Right;

            section.AddParagraph().Format.SpaceAfter = Unit.FromPoint(12);

            // -------------------------------
            // Saídas
            // -------------------------------
            var tableGroups = section.AddTable();
            tableGroups.Borders.Width = 0.5;
            tableGroups.AddColumn(Unit.FromCentimeter(10));
            tableGroups.AddColumn(Unit.FromCentimeter(5));

            var headerG = tableGroups.AddRow();
            headerG.Shading.Color = Colors.Black;
            headerG.Format.Font.Color = Colors.White;
            headerG.Format.Font.Bold = true;
            headerG.Cells[0].AddParagraph("Grupo / Categoria");
            headerG.Cells[1].AddParagraph("Saídas (R$)").Format.Alignment = ParagraphAlignment.Right;

            // Percorre os grupos de despesas
            foreach (var g in groups)
            {
                // Cabeçalho do grupo
                var groupRow = tableGroups.AddRow();
                groupRow.Shading.Color = Colors.LightGray;
                groupRow.Cells[0].AddParagraph($"📂 {g.GroupName}");
                groupRow.Cells[1].AddParagraph("").Format.Alignment = ParagraphAlignment.Right;

                // Linhas das categorias
                foreach (var c in g.Categories)
                {
                    var catRow = tableGroups.AddRow();
                    catRow.Cells[0].AddParagraph($"   └ {c.CategoryName}");
                    catRow.Cells[1].AddParagraph(c.TotalExpense.ToString("N2", culture)).Format.Alignment = ParagraphAlignment.Right;
                }

                // Total do grupo (exibido ao final das categorias)
                var totalGroupRow = tableGroups.AddRow();
                totalGroupRow.Shading.Color = Colors.LightYellow;
                totalGroupRow.Borders.Top.Width = 1;
                totalGroupRow.Borders.Top.Color = primaryColor;
                totalGroupRow.TopPadding = Unit.FromPoint(4);
                totalGroupRow.BottomPadding = Unit.FromPoint(4);
                totalGroupRow.VerticalAlignment = VerticalAlignment.Center;

                var totalLabel = totalGroupRow.Cells[0].AddParagraph($"📊 Total do Grupo: {g.GroupName}");
                totalLabel.Format.Font.Bold = true;
                totalLabel.Format.Font.Size = 10;

                var totalValue = totalGroupRow.Cells[1].AddParagraph(g.GroupExpense.ToString("N2", culture));
                totalValue.Format.Font.Bold = true;
                totalValue.Format.Font.Size = 10;
                totalValue.Format.Alignment = ParagraphAlignment.Right;
            }

            var totalG = tableGroups.AddRow();
            totalG.Shading.Color = Colors.LightYellow;
            totalG.Borders.Top.Width = 2;
            totalG.Borders.Top.Color = primaryColor;
            totalG.TopPadding = Unit.FromPoint(6);
            totalG.BottomPadding = Unit.FromPoint(6);
            totalG.VerticalAlignment = VerticalAlignment.Center;

            var totalLabelG = totalG.Cells[0].AddParagraph("💸 Total Geral de Saídas");
            totalLabelG.Format.Font.Bold = true;
            totalLabelG.Format.Font.Size = 11;

            var totalValueG = totalG.Cells[1].AddParagraph(totalExpenseOverall.ToString("N2", culture));
            totalValueG.Format.Font.Bold = true;
            totalValueG.Format.Font.Size = 11;
            totalValueG.Format.Alignment = ParagraphAlignment.Right;

            section.AddParagraph().Format.SpaceAfter = Unit.FromPoint(12);


            // -------------------------------
            // Extratos Bancários
            // -------------------------------
            var tableExtracts = section.AddTable();
            tableExtracts.Borders.Width = 0.5;
            tableExtracts.AddColumn(Unit.FromCentimeter(4));
            tableExtracts.AddColumn(Unit.FromCentimeter(3));
            tableExtracts.AddColumn(Unit.FromCentimeter(7));
            tableExtracts.AddColumn(Unit.FromCentimeter(4));

            var headerE = tableExtracts.AddRow();
            headerE.Shading.Color = Colors.Black;
            headerE.Format.Font.Color = Colors.White;
            headerE.Format.Font.Bold = true;
            headerE.Cells[0].AddParagraph("Conta");
            headerE.Cells[1].AddParagraph("Data");
            headerE.Cells[2].AddParagraph("Descrição");
            headerE.Cells[3].AddParagraph("Valor (R$)").Format.Alignment = ParagraphAlignment.Right;

            foreach (var e in extracts.OrderByDescending(x => x.Date))
            {
                var r = tableExtracts.AddRow();
                r.Cells[0].AddParagraph(e.AccountName);
                r.Cells[1].AddParagraph(e.Date.ToString("dd/MM/yyyy"));
                r.Cells[2].AddParagraph(e.Description);
                var val = r.Cells[3].AddParagraph(e.Value.ToString("N2", culture));
                val.Format.Font.Color = e.Value >= 0 ? Colors.DarkGreen : Colors.Red;
                r.Cells[3].Format.Alignment = ParagraphAlignment.Right;
            }

            // ✅ Total geral dos extratos
            var totalExtractRow = tableExtracts.AddRow();
            totalExtractRow.Shading.Color = Colors.LightYellow;
            totalExtractRow.Cells[0].AddParagraph("🏦 Saldo Geral dos Extratos");
            totalExtractRow.Cells[3].AddParagraph(totalExtractOverall.ToString("N2", culture)).Format.Alignment = ParagraphAlignment.Right;

            section.AddParagraph().Format.SpaceAfter = Unit.FromPoint(10);

            // -------------------------------
            // Rodapé
            // -------------------------------
            var footer = section.Footers.Primary;
            var footerLine = footer.AddParagraph(new string('─', 90));
            footerLine.Format.Font.Color = primaryColor;
            footerLine.Format.Alignment = ParagraphAlignment.Center;

            var footerText = footer.AddParagraph($"Relatório gerado em {DateTime.Now:dd/MM/yyyy HH:mm}");
            footerText.Format.Font.Size = 8;
            footerText.Format.Alignment = ParagraphAlignment.Center;
            footerText.Format.Font.Color = Colors.Gray;

            // -------------------------------
            // Renderização final
            // -------------------------------
            var renderer = new PdfDocumentRenderer(unicode: true) { Document = doc };
            renderer.RenderDocument();
            using var ms = new MemoryStream();
            renderer.PdfDocument.Save(ms, false);
            return ms.ToArray();
        }

    }
}

