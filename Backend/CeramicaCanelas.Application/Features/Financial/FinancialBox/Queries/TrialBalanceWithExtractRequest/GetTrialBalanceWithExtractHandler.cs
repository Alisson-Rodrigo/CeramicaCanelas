using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Domain.Enums.Financial;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.Queries.TrialBalanceWithExtractRequest
{
    public class GetTrialBalanceWithExtractHandler
            : IRequestHandler<TrialBalanceWithExtractRequest, TrialBalanceWithExtractResult>
    {
        private readonly ILaunchRepository _launchRepository;
        private readonly IExtractRepository _extractRepository;

        public GetTrialBalanceWithExtractHandler(
            ILaunchRepository launchRepository,
            IExtractRepository extractRepository)
        {
            _launchRepository = launchRepository;
            _extractRepository = extractRepository;
        }

        public async Task<TrialBalanceWithExtractResult> Handle(
            TrialBalanceWithExtractRequest request,
            CancellationToken ct)
        {
            // =====================================
            // 🔹 1️⃣ EXTRATOS BANCÁRIOS (ENTRADAS)
            // =====================================
            var extracts = _extractRepository.QueryAll().Where(e => e.IsActive);

            if (request.StartDate.HasValue)
                extracts = extracts.Where(e => e.Date >= request.StartDate);
            if (request.EndDate.HasValue)
                extracts = extracts.Where(e => e.Date <= request.EndDate);
            if (request.PaymentMethod.HasValue)
                extracts = extracts.Where(e => e.PaymentMethod == request.PaymentMethod.Value);

            // Extratos detalhados (para exibição)
            var extractDetails = await extracts
                .Select(e => new BankExtractDetail
                {
                    AccountName = e.PaymentMethod.ToString(),
                    Date = e.Date,
                    Description = e.Observations ?? "Sem observações",
                    Value = e.Value
                })
                .OrderByDescending(e => e.Date)
                .ToListAsync(ct);

            // Entradas agregadas por conta
            var accountIncomes = extractDetails
                .GroupBy(e => e.AccountName)
                .Select(g => new AccountIncomeSummary
                {
                    AccountName = g.Key,
                    TotalIncome = g.Where(x => x.Value > 0).Sum(x => x.Value)
                })
                .OrderByDescending(a => a.TotalIncome)
                .ToList();

            var totalIncomeOverall = accountIncomes.Sum(a => a.TotalIncome);

            // =====================================
            // 🔹 2️⃣ LANÇAMENTOS (SAÍDAS)
            // =====================================
            var launches = _launchRepository.QueryAllWithIncludes()
                .Include(l => l.Category)!.ThenInclude(c => c.Group)
                .Where(l => l.Status == PaymentStatus.Paid && l.Type == LaunchType.Expense);

            if (request.StartDate.HasValue)
                launches = launches.Where(l => l.LaunchDate >= request.StartDate.Value);
            if (request.EndDate.HasValue)
                launches = launches.Where(l => l.LaunchDate <= request.EndDate.Value);
            if (request.GroupId.HasValue)
                launches = launches.Where(l => l.Category!.GroupId == request.GroupId.Value);
            if (request.CategoryId.HasValue)
                launches = launches.Where(l => l.CategoryId == request.CategoryId.Value);
            if (request.PaymentMethod.HasValue)
                launches = launches.Where(l => l.PaymentMethod == request.PaymentMethod.Value);
            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var s = request.Search.ToLower();
                launches = launches.Where(l =>
                    l.Description.ToLower().Contains(s) ||
                    (l.Category != null && l.Category.Name.ToLower().Contains(s)) ||
                    (l.Category!.Group != null && l.Category.Group.Name.ToLower().Contains(s)));
            }

            var expenseList = await launches
                .Select(l => new
                {
                    GroupName = l.Category != null && l.Category.Group != null
                        ? l.Category.Group.Name
                        : "Sem grupo",
                    CategoryName = l.Category != null
                        ? l.Category.Name
                        : "Sem categoria",
                    l.Amount
                })
                .ToListAsync(ct);

            var groups = expenseList
                .GroupBy(g => g.GroupName)
                .Select(g => new GroupBalanceSummary
                {
                    GroupName = g.Key,
                    Categories = g.GroupBy(c => c.CategoryName)
                        .Select(cg => new CategoryBalanceSummary
                        {
                            CategoryName = cg.Key,
                            TotalExpense = cg.Sum(x => x.Amount)
                        })
                        .OrderByDescending(c => c.TotalExpense)
                        .ToList()
                })
                .OrderBy(g => g.GroupName)
                .ToList();

            var totalExpenseOverall = groups.Sum(g => g.GroupExpense);

            // =====================================
            // 🔹 3️⃣ FINALIZA RESULTADO
            // =====================================
            var minDate = request.StartDate ?? await launches.MinAsync(l => (DateOnly?)l.LaunchDate, ct);
            var maxDate = request.EndDate ?? await launches.MaxAsync(l => (DateOnly?)l.LaunchDate, ct);

            return new TrialBalanceWithExtractResult
            {
                StartDate = minDate,
                EndDate = maxDate,
                Accounts = accountIncomes,
                Groups = groups,
                Extracts = extractDetails, // 🔹 Incluído aqui
                TotalIncomeOverall = totalIncomeOverall,
                TotalExpenseOverall = totalExpenseOverall
            };
        }
    }
}
