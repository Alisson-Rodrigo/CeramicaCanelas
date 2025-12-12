using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Domain.Entities.Financial;
using CeramicaCanelas.Domain.Enums.Financial;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.Queries.PagedRequestCashFlowReport
{
    public class GetPagedCashFlowReportHandler
        : IRequestHandler<PagedRequestCashFlowReport, PagedResultCashFlowReport>
    {
        private readonly ILaunchRepository _launchRepository;

        public GetPagedCashFlowReportHandler(ILaunchRepository launchRepository)
        {
            _launchRepository = launchRepository;
        }

        public async Task<PagedResultCashFlowReport> Handle(
    PagedRequestCashFlowReport request,
    CancellationToken ct)
        {
            var page = request.Page <= 0 ? 1 : request.Page;
            var size = request.PageSize <= 0 ? 10 : request.PageSize;

            // Base SEM includes
            var baseQuery = _launchRepository.QueryAll()
                .AsNoTracking()
                .Where(l => l.Status == PaymentStatus.Paid);

            // Período (limites inclusivos)
            if (request.StartDate.HasValue)
                baseQuery = baseQuery.Where(l => l.LaunchDate >= request.StartDate.Value);
            if (request.EndDate.HasValue)
                baseQuery = baseQuery.Where(l => l.LaunchDate <= request.EndDate.Value);

            // Busca por descrição (case-insensitive via LOWER)
            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var s = request.Search.Trim().ToLowerInvariant();

                baseQuery = baseQuery.Where(l =>
                    (l.Description ?? string.Empty).ToLower()
                        .Contains(s));
            }

            if (!string.IsNullOrWhiteSpace(request.SearchCategoryOrCustomer))
            {
                var search = request.SearchCategoryOrCustomer.Trim().ToLowerInvariant();
                baseQuery = baseQuery.Where(l =>
                    l.Category != null &&
                    (l.Category.Name ?? string.Empty).ToLower().Contains(search));
            }

            // ✅ Filtro por método de pagamento (aplica em TUDO)
            if (request.PaymentMethod.HasValue)
            {
                var method = request.PaymentMethod.Value;
                baseQuery = baseQuery.Where(l => l.PaymentMethod == method);
            }

            // ✅ filteredQuery herda todos os filtros anteriores
            var filteredQuery = baseQuery;

            // ✅ Filtro por tipo agora funciona, pois 'type' é nullable
            if (request.type.HasValue)
            {
                if (request.type.Value == LaunchType.Income)
                    filteredQuery = filteredQuery.Where(l => l.Type == LaunchType.Income);
                else if (request.type.Value == LaunchType.Expense)
                    filteredQuery = filteredQuery.Where(l => l.Type == LaunchType.Expense);
            }



            // ===== Totais (sem DISTINCT/GroupBy; base não duplica) =====
            var totalEntradas = (await baseQuery
                .Where(l => l.Type == LaunchType.Income)
                .Select(l => (decimal?)l.Amount)
                .SumAsync(ct)) ?? 0m;

            var totalSaidas = (await baseQuery
                .Where(l => l.Type == LaunchType.Expense)
                .Select(l => (decimal?)l.Amount)
                .SumAsync(ct)) ?? 0m;

            // Itens totais (respeitando type)
            var totalItems = await filteredQuery.CountAsync(ct);

            // ===== Paginação direta, ordenação estável =====
            var items = await filteredQuery
                .OrderByDescending(l => l.LaunchDate)
                .ThenByDescending(l => l.Id) // desempate estável
                .Skip((page - 1) * size)
                .Take(size)
                .Select(l => new CashFlowReportItem
                {
                    LaunchDate = l.LaunchDate,
                    Description = l.Description ?? string.Empty,
                    Amount = l.Amount,
                    Type = l.Type,
                    CategoryName = l.Category != null ? l.Category.Name : "Sem categoria",
                    CustomerName = l.Customer != null ? l.Customer.Name : "Sem cliente",
                    PaymentMethod = l.PaymentMethod.ToString()
                })
                .ToListAsync(ct);

            return new PagedResultCashFlowReport
            {
                Page = page,
                PageSize = size,
                TotalItems = totalItems,
                TotalEntradas = totalEntradas,
                TotalSaidas = totalSaidas,
                Items = items
            };
        }

    }
}
