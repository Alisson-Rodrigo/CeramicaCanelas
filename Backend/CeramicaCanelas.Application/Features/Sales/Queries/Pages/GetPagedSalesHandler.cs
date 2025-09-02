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
            // Use QueryAllWithIncludes() para obter as vendas com os itens incluídos
            var q = _salesRepository.QueryAllWithIncludes() // Obtendo vendas com itens
                .AsQueryable(); // Convertendo para IQueryable

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
            // Período (interprete as datas como SP e converta explicitamente para UTC)
            TimeZoneInfo tz;
            try { tz = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo"); }
            catch { tz = TimeZoneInfo.FindSystemTimeZoneById("E. South America Standard Time"); }

            if (request.StartDate.HasValue)
            {
                var localStart = request.StartDate.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified);
                var startUtc = TimeZoneInfo.ConvertTimeToUtc(localStart, tz);
                q = q.Where(s => s.Date >= startUtc);
            }

            if (request.EndDate.HasValue)
            {
                var localEnd = request.EndDate.Value.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Unspecified);
                var endUtc = TimeZoneInfo.ConvertTimeToUtc(localEnd, tz);
                q = q.Where(s => s.Date <= endUtc);
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
                .Select(s => new SaleResult(s)) // Passando a venda com seus itens
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
