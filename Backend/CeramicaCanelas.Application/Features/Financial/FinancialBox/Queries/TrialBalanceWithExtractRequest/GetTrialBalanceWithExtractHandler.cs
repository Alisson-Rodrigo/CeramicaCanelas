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
    public class GetTrialBalanceWithExtractHandler : IRequestHandler<TrialBalanceWithExtractRequest, TrialBalanceWithExtractResult>
    {
        private readonly ILaunchRepository _launchRepository;
        private readonly IExtractRepository _extractRepository;

        public GetTrialBalanceWithExtractHandler(ILaunchRepository launchRepository, IExtractRepository extractRepository)
        {
            _launchRepository = launchRepository;
            _extractRepository = extractRepository;
        }

        public async Task<TrialBalanceWithExtractResult> Handle(TrialBalanceWithExtractRequest request, CancellationToken ct)
        {
            // === 1️⃣ LANÇAMENTOS ===
            var launches = _launchRepository.QueryAllWithIncludes()
                .Include(l => l.Category)!.ThenInclude(c => c.Group)
                .Where(l => l.Status == PaymentStatus.Paid);

            if (request.StartDate.HasValue)
                launches = launches.Where(l => l.LaunchDate >= request.StartDate);
            if (request.EndDate.HasValue)
                launches = launches.Where(l => l.LaunchDate <= request.EndDate);
            if (request.GroupId.HasValue)
                launches = launches.Where(l => l.Category!.GroupId == request.GroupId);
            if (request.CategoryId.HasValue)
                launches = launches.Where(l => l.CategoryId == request.CategoryId);
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

            var launchList = await launches
                .Select(l => new
                {
                    l.LaunchDate,
                    l.Description,
                    l.Amount,
                    l.Type,
                    l.PaymentMethod,
                    CategoryName = l.Category != null ? l.Category.Name : "Sem categoria",
                    GroupName = l.Category != null && l.Category.Group != null ? l.Category.Group.Name : "Sem grupo"
                })
                .ToListAsync(ct);

            var groups = launchList
                .GroupBy(g => g.GroupName)
                .Select(g => new GroupBalanceDto
                {
                    GroupName = g.Key,
                    Categories = g.GroupBy(c => c.CategoryName)
                        .Select(cg => new CategoryBalanceDto
                        {
                            CategoryName = cg.Key,
                            TotalIncome = cg.Where(x => x.Type == LaunchType.Income).Sum(x => x.Amount),
                            TotalExpense = cg.Where(x => x.Type == LaunchType.Expense).Sum(x => x.Amount),
                            Entries = cg.Select(e => new EntryDto
                            {
                                LaunchDate = e.LaunchDate,
                                Description = e.Description,
                                Amount = e.Amount,
                                Type = e.Type,
                                PaymentMethod = e.PaymentMethod.ToString()
                            }).OrderBy(e => e.LaunchDate).ToList()
                        }).ToList()
                }).ToList();

            // === 2️⃣ EXTRATOS BANCÁRIOS ===
            var extracts = _extractRepository.QueryAll()
                .Where(e => e.IsActive);
            if (request.StartDate.HasValue)
                extracts = extracts.Where(e => e.Date >= request.StartDate);
            if (request.EndDate.HasValue)
                extracts = extracts.Where(e => e.Date <= request.EndDate);
            if (request.PaymentMethod.HasValue)
                extracts = extracts.Where(e => e.PaymentMethod == request.PaymentMethod.Value);

            var extractList = await extracts
                .GroupBy(e => e.PaymentMethod)
                .Select(g => new BankExtractSummary
                {
                    PaymentMethod = g.Key.ToString(),
                    TotalInflow = g.Where(x => x.Value > 0).Sum(x => x.Value),
                    TotalOutflow = g.Where(x => x.Value < 0).Sum(x => Math.Abs(x.Value))
                })
                .ToListAsync(ct);

            return new TrialBalanceWithExtractResult
            {
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                Groups = groups,
                BankExtracts = extractList,
                TotalIncomeOverall = groups.Sum(g => g.TotalIncome),
                TotalExpenseOverall = groups.Sum(g => g.TotalExpense)
            };
        }
    }
}
