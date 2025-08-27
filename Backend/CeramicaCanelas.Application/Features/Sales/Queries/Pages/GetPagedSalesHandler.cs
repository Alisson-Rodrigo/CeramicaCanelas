using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Application.Features.Sales.Queries.Pages;
using CeramicaCanelas.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Sales.Queries.GetPagedSalesQueries
{
    public class GetPagedSalesHandler : IRequestHandler<PagedRequestSales, PagedResultSales>
    {
        private readonly ISalesRepository _salesRepository;
        public GetPagedSalesHandler(ISalesRepository salesRepository) => _salesRepository = salesRepository;

        public async Task<PagedResultSales> Handle(PagedRequestSales request, CancellationToken ct)
        {
            var q = _salesRepository.QueryAllWithIncludes(); // IQueryable<Sale> — só ativas (HasQueryFilter)

            // Busca textual (case-insensitive, compatível com qualquer provider)
            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var term = request.Search.Trim();
                var termLower = term.ToLower();

                // Se o termo for número, filtra NoteNumber por igualdade
                if (int.TryParse(term, out var noteNumber))
                    q = q.Where(s => s.NoteNumber == noteNumber);

                q = q.Where(s =>
                       (s.CustomerName != null && s.CustomerName.ToLower().Contains(termLower))
                    || (s.City != null && s.City.ToLower().Contains(termLower))
                    || (s.State != null && s.State.ToLower().Contains(termLower))
                    || (s.CustomerPhone != null && s.CustomerPhone.ToLower().Contains(termLower)));
            }

            // Período
            if (request.StartDate.HasValue)
            {
                var startDate = request.StartDate.Value.ToDateTime(TimeOnly.MinValue).ToUniversalTime();
                q = q.Where(s => s.Date >= startDate.Date); // Comparar apenas a data
            }
            if (request.EndDate.HasValue)
            {
                var endDate = request.EndDate.Value.ToDateTime(TimeOnly.MaxValue).ToUniversalTime();
                q = q.Where(s => s.Date <= endDate.Date); // Comparar apenas a data
            }



            // Filtros extras
            if (request.PaymentMethod.HasValue)
                q = q.Where(s => s.PaymentMethod == request.PaymentMethod.Value);

            if (request.Status.HasValue)
                q = q.Where(s => s.Status == request.Status.Value);

            var total = await q.CountAsync(ct);

            var items = await q
                .OrderByDescending(s => s.Date)
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                // Se sua SaleResult tem construtor (Sale s):
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
