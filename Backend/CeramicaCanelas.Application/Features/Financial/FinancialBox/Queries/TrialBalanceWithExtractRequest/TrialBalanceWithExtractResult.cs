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
        public decimal NetBalance => TotalIncomeOverall - TotalExpenseOverall;

        public List<GroupBalanceDto> Groups { get; set; } = new();
        public List<BankExtractSummary> BankExtracts { get; set; } = new();

        public decimal BankTotalBalance => BankExtracts.Sum(b => b.Balance);
        public decimal Difference => NetBalance - BankTotalBalance;
    }

    public class BankExtractSummary
    {
        public string PaymentMethod { get; set; } = string.Empty;
        public decimal TotalInflow { get; set; } // valores positivos
        public decimal TotalOutflow { get; set; } // valores negativos
        public decimal Balance => TotalInflow - TotalOutflow;
    }

    public class GroupBalanceDto
    {
        public string GroupName { get; set; } = "Sem grupo";
        public List<CategoryBalanceDto> Categories { get; set; } = new();
        public decimal TotalIncome => Categories.Sum(c => c.TotalIncome);
        public decimal TotalExpense => Categories.Sum(c => c.TotalExpense);
        public decimal NetBalance => TotalIncome - TotalExpense;
    }

    public class CategoryBalanceDto
    {
        public string CategoryName { get; set; } = "Sem categoria";
        public decimal TotalIncome { get; set; }
        public decimal TotalExpense { get; set; }
        public List<EntryDto> Entries { get; set; } = new();
    }

    public class EntryDto
    {
        public DateOnly LaunchDate { get; set; }
        public string Description { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public LaunchType Type { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;
    }
}
