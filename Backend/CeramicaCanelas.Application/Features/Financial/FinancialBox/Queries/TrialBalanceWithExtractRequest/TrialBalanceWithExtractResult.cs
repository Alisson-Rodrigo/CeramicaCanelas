using CeramicaCanelas.Domain.Enums.Financial;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.Queries.TrialBalanceWithExtractRequest
{
    public class TrialBalanceWithExtractResult
    {
        public DateOnly? StartDate { get; set; }
        public DateOnly? EndDate { get; set; }

        public decimal TotalIncomeOverall { get; set; }
        public decimal TotalExpenseOverall { get; set; }
        public decimal TotalExtractOverall { get; set; } // ✅ novo campo

        public decimal NetBalance => TotalIncomeOverall - TotalExpenseOverall;

        public List<AccountIncomeSummary> Accounts { get; set; } = new(); // Entradas
        public List<GroupBalanceSummary> Groups { get; set; } = new(); // Saídas
        public List<BankExtractDetail> Extracts { get; set; } = new(); // Extratos detalhados
    }

    // ====== ENTRADAS POR CONTA ======
    public class AccountIncomeSummary
    {
        public string AccountName { get; set; } = "Desconhecido";
        public decimal TotalIncome { get; set; }
    }

    // ====== DESPESAS POR GRUPO/CATEGORIA ======
    public class GroupBalanceSummary
    {
        public string GroupName { get; set; } = "Sem grupo";
        public List<CategoryBalanceSummary> Categories { get; set; } = new();
        public decimal GroupExpense => Categories.Sum(c => c.TotalExpense);
    }

    public class CategoryBalanceSummary
    {
        public string CategoryName { get; set; } = "Sem categoria";
        public decimal TotalExpense { get; set; }
    }

    // ====== DETALHAMENTO DOS EXTRATOS ======
    public class BankExtractDetail
    {
        public string AccountName { get; set; } = "Desconhecido";
        public DateOnly Date { get; set; }
        public string Description { get; set; } = string.Empty;
        public decimal Value { get; set; }
        public string Type => Value >= 0 ? "Entrada" : "Saída";
    }
}
