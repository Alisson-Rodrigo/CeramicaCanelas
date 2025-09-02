using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Application.Features.Almoxarifado.Product.Queries.Pages;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Sales.Queries.GetProductItemsReport.PagedRequestProductItems
{
    public class GetProductItemsPagedHandler
        : IRequestHandler<PagedRequestProductItems, PagedResult<ProductItemsRowDto>>
    {
        private readonly ISalesRepository _salesRepository;

        public GetProductItemsPagedHandler(ISalesRepository salesRepository)
        {
            _salesRepository = salesRepository;
        }

        public async Task<PagedResult<ProductItemsRowDto>> Handle(PagedRequestProductItems req, CancellationToken ct)
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);
            var startDate = req.StartDate == default ? today.AddDays(-30) : req.StartDate;
            var endDate = req.EndDate == default ? today : req.EndDate;
            if (endDate < startDate) (startDate, endDate) = (endDate, startDate);

            // Converter datas de São Paulo para UTC
            var tz = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");

            var localStart = startDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified);
            var startUtc = TimeZoneInfo.ConvertTimeToUtc(localStart, tz);

            var localEnd = endDate.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Unspecified);
            var endUtc = TimeZoneInfo.ConvertTimeToUtc(localEnd, tz);

            // Query base
            var q = _salesRepository.QueryAllWithIncludes();

            if (req.Status.HasValue)
                q = q.Where(s => s.Status == req.Status.Value);

            if (req.PaymentMethod.HasValue)
                q = q.Where(s => s.PaymentMethod == req.PaymentMethod.Value);

            if (!string.IsNullOrWhiteSpace(req.City))
                q = q.Where(s => s.City!.ToLower() == req.City.ToLower());

            if (!string.IsNullOrWhiteSpace(req.State))
                q = q.Where(s => s.State.ToLower() == req.State.ToLower());

            // Período
            q = q.Where(s => s.Date >= startUtc && s.Date <= endUtc);

            // Explode itens com rateio proporcional do desconto da venda
            var itemsQ = q.SelectMany(s => s.Items.Select(i => new
            {
                i.Product,
                Milheiros = (decimal)i.Quantity,                   // garante decimal
                Subtotal = i.UnitPrice * (decimal)i.Quantity,     // decimal * decimal
                SaleGross = s.TotalGross,
                SaleDiscount = s.Discount
            }))
            .Select(x => new
            {
                x.Product,
                x.Milheiros,
                NetRevenueRounded = Math.Round(                     // limita a escala antes do SUM
                    (x.SaleGross > 0m)
                        ? x.Subtotal * (1m - (x.SaleDiscount / x.SaleGross))
                        : x.Subtotal,
                    2)
            });

            if (req.Product.HasValue)
                itemsQ = itemsQ.Where(x => x.Product == req.Product.Value);

            var grouped = await itemsQ
                .GroupBy(x => x.Product)
                .Select(g => new ProductItemsRowDto
                {
                    Product = g.Key,
                    Milheiros = g.Sum(z => z.Milheiros),
                    Revenue = g.Sum(z => z.NetRevenueRounded)     // soma do valor já arredondado
                })
                .OrderByDescending(r => r.Revenue)
                .ToListAsync(ct);


            var total = grouped.Count;
            var paged = grouped
                .Skip((req.Page - 1) * req.PageSize)
                .Take(req.PageSize)
                .ToList();

            return new PagedResult<ProductItemsRowDto>
            {
                Items = paged,
                TotalItems = total,
                Page = req.Page,
                PageSize = req.PageSize
            };
        }

    }
}
