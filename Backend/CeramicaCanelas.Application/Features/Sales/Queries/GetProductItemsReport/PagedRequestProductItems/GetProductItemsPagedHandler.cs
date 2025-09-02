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

            var startUtc = DateTime.SpecifyKind(startDate.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
            var endUtc = DateTime.SpecifyKind(endDate.ToDateTime(TimeOnly.MaxValue), DateTimeKind.Utc);

            var q = _salesRepository.QueryAllWithIncludes();

            if (req.Status.HasValue) q = q.Where(s => s.Status == req.Status.Value);
            if (req.PaymentMethod.HasValue) q = q.Where(s => s.PaymentMethod == req.PaymentMethod.Value);
            if (!string.IsNullOrWhiteSpace(req.City)) q = q.Where(s => s.City!.ToLower() == req.City.ToLower());
            if (!string.IsNullOrWhiteSpace(req.State)) q = q.Where(s => s.State == req.State);
            q = q.Where(s => s.Date >= startUtc && s.Date <= endUtc);

            // Explode itens com rateio proporcional do desconto da venda
            var itemsQ = q.SelectMany(s => s.Items.Select(i => new
            {
                i.Product,
                Milheiros = i.Quantity,                    // sua unidade de quantidade
                Subtotal = i.UnitPrice * i.Quantity,      // receita bruta do item
                SaleGross = s.TotalGross,                  // soma bruta da venda
                SaleDiscount = s.Discount                     // desconto da venda
            }))
            // calcula receita líquida do item após rateio do desconto
            .Select(x => new
            {
                x.Product,
                x.Milheiros,
                NetRevenue = (x.SaleGross > 0)
                    ? x.Subtotal * (1 - (x.SaleDiscount / x.SaleGross))
                    : x.Subtotal

            });

            // filtro por produto (se houver)
            if (req.Product.HasValue)
                itemsQ = itemsQ.Where(x => x.Product == req.Product.Value);

            // agrega por produto já com receita líquida
            var grouped = await itemsQ
                .GroupBy(x => x.Product)
                .Select(g => new ProductItemsRowDto
                {
                    Product = g.Key,
                    Milheiros = g.Sum(z => z.Milheiros),
                    Revenue = g.Sum(z => z.NetRevenue)
                })
                .OrderByDescending(r => r.Revenue)
                .ToListAsync(ct);


            // paginação
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
