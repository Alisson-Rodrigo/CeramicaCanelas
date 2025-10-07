using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Application.Features.Sales.Queries.Pages;
using CeramicaCanelas.Domain.Enums.Sales;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Sales.Queries.GetPagedSalesQueries
{
    public class GetPagedSalesHandler : IRequestHandler<PagedRequestSales, PagedResultSales>
    {
        private readonly ISalesRepository _salesRepository;

        public GetPagedSalesHandler(ISalesRepository salesRepository)
            => _salesRepository = salesRepository;

        public async Task<PagedResultSales> Handle(PagedRequestSales request, CancellationToken ct)
        {
            var q = _salesRepository.QueryAllWithIncludes().AsQueryable();

            // Busca textual
            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var term = request.Search.Trim();
                var termLower = term.ToLower();

                if (int.TryParse(term, out var noteNumber))
                    q = q.Where(s => s.NoteNumber == noteNumber);

                q = q.Where(s =>
                       (s.CustomerName != null && s.CustomerName.ToLower().Contains(termLower))
                    || (s.City != null && s.City.ToLower().Contains(termLower))
                    || (s.State != null && s.State.ToLower().Contains(termLower))
                    || (s.CustomerPhone != null && s.CustomerPhone.ToLower().Contains(termLower)));
            }

            // 🔹 Período
            if (request.StartDate.HasValue)
                q = q.Where(s => s.Date >= request.StartDate.Value);

            if (request.EndDate.HasValue)
                q = q.Where(s => s.Date <= request.EndDate.Value);

            // 🔹 Filtro por método de pagamento (agora pela tabela SalePayments)
            if (request.PaymentMethod.HasValue)
                q = q.Where(s => s.Payments.Any(p => p.PaymentMethod == request.PaymentMethod.Value));

            // 🔹 Filtro por status
            if (request.Status.HasValue)
            {
                if (request.Status.Value == SaleStatus.Pending)
                {
                    // Busca tanto pendentes quanto parcialmente pagas
                    q = q.Where(s => s.Status == SaleStatus.Pending || s.Status == SaleStatus.PartiallyPaid);
                }
                else
                {
                    // Busca apenas o status selecionado
                    q = q.Where(s => s.Status == request.Status.Value);
                }
            }

            var total = await q.CountAsync(ct);

            var items = await q
                .OrderBy(s => s.NoteNumber)
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(s => new SaleResult(s))
                .ToListAsync(ct);

            return new PagedResultSales
            {
                Page = request.Page,
                PageSize = request.PageSize,
                TotalItems = total,
                Items = items
            };
        }
    }
}
