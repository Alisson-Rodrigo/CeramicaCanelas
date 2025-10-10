using CeramicaCanelas.Application.Features.Sales.Queries.GetProductItemsReport.GetProductItemsReportPdfQuery;
using CeramicaCanelas.Application.Services.Reports;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Contracts.Application.Services
{
    public interface IPdfReportService
    {
        // ======================================================
        // 🔹 RELATÓRIO DE PRODUTOS
        // ======================================================
        byte[] BuildProductItemsReportPdf(
            CompanyProfile company,
            (DateOnly start, DateOnly end) period,
            IEnumerable<ProductItemsRow> rows,
            decimal totalMilheiros,
            decimal totalRevenue,
            string? subtitle = null,
            string? logoPath = null,
            IEnumerable<AppliedFilter>? filters = null
        );

        // ======================================================
        // 🔹 RELATÓRIO DE BALANCETE DE VERIFICAÇÃO
        // ======================================================
        byte[] BuildTrialBalancePdf(
            CompanyProfile company,
            (DateOnly start, DateOnly end) period,
            IEnumerable<TrialBalanceAccountRow> accounts,   // Entradas por conta
            IEnumerable<TrialBalanceGroupRow> groups,       // Saídas por grupo/categoria
            IEnumerable<TrialBalanceExtractRow> extracts,   // Extratos detalhados
            decimal totalIncomeOverall,                     // Total de entradas (extratos + lançamentos)
            decimal totalExpenseOverall,                    // Total de saídas (lançamentos)
            decimal totalExtractOverall,                    // ✅ Total geral dos extratos (saldo líquido)
            string? logoPath = null,
            IEnumerable<TrialBalanceFilter>? filters = null
        );

        // ======================================================
        // 🔸 DTOs auxiliares para o PDF do Balancete
        // ======================================================
        public class TrialBalanceAccountRow
        {
            public string AccountName { get; set; } = string.Empty;
            public decimal TotalIncome { get; set; }
        }

        public class TrialBalanceGroupRow
        {
            public string GroupName { get; set; } = string.Empty;
            public List<TrialBalanceCategoryRow> Categories { get; set; } = new();
            public decimal GroupExpense => Categories.Sum(c => c.TotalExpense);
        }

        public class TrialBalanceCategoryRow
        {
            public string CategoryName { get; set; } = string.Empty;
            public decimal TotalExpense { get; set; }
        }

        public class TrialBalanceExtractRow
        {
            public string AccountName { get; set; } = string.Empty;
            public DateOnly Date { get; set; }
            public string Description { get; set; } = string.Empty;
            public decimal Value { get; set; }
            public string Type => Value >= 0 ? "Entrada" : "Saída";
        }

        public record TrialBalanceFilter(string Label, string Value);
    }
}
