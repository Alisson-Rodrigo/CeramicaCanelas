using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Application.Features.Almoxarifado.Product.Queries.Pages;
using MediatR;
using Microsoft.EntityFrameworkCore;

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
            // ===============================
            // 🔹 Garantir datas válidas
            // ===============================
            var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);
            var startDate = req.StartDate == default ? today.AddDays(-30) : req.StartDate;
            var endDate = req.EndDate == default ? today : req.EndDate;

            if (endDate < startDate)
                (startDate, endDate) = (endDate, startDate);

            // ===============================
            // 🔹 Query base
            // ===============================
            var q = _salesRepository.QueryAllWithIncludes();

            if (req.Status.HasValue)
                q = q.Where(s => s.Status == req.Status.Value);

            // Forma de pagamento → agora consulta na coleção Payments
            if (req.PaymentMethod.HasValue)
                q = q.Where(s => s.Payments.Any(p => p.PaymentMethod == req.PaymentMethod.Value));

            if (!string.IsNullOrWhiteSpace(req.City))
                q = q.Where(s => s.City!.ToLower() == req.City.ToLower());

            if (!string.IsNullOrWhiteSpace(req.State))
                q = q.Where(s => s.State.ToLower() == req.State.ToLower());

            // ===============================
            // 🔹 Filtro de período (DateOnly)
            // ===============================
            q = q.Where(s => s.Date >= startDate && s.Date <= endDate);

            // ===============================
            // 🔹 Explode itens com rateio proporcional do desconto
            // ===============================
            var itemsQ = q.SelectMany(s => s.Items.Select(i => new
            {
                i.Product,
                i.Break, // 🔹 campo de quebra
                Milheiros = (decimal)i.Quantity,
                Subtotal = i.UnitPrice * (decimal)i.Quantity,
                SaleGross = s.TotalGross,
                SaleDiscount = s.Discount
            }))
            .Select(x => new
            {
                x.Product,
                x.Break,
                x.Milheiros,
                NetRevenueRounded = Math.Round(
                    (x.SaleGross > 0m)
                        ? x.Subtotal * (1m - (x.SaleDiscount / x.SaleGross))
                        : x.Subtotal,
                    2)
            });

            if (req.Product.HasValue)
                itemsQ = itemsQ.Where(x => x.Product == req.Product.Value);

            // ===============================
            // 🔹 Agrupamento e somas
            // ===============================
            var grouped = await itemsQ
                .GroupBy(x => x.Product)
                .Select(g => new ProductItemsRowDto
                {
                    Product = g.Key,
                    Milheiros = g.Sum(z => z.Milheiros),
                    Revenue = g.Sum(z => z.NetRevenueRounded),
                    Breaks = g.Sum(z => z.Break)
                })
                .OrderByDescending(r => r.Revenue)
                .ToListAsync(ct);

            var total = grouped.Count;
            var paged = grouped
                .Skip((req.Page - 1) * req.PageSize)
                .Take(req.PageSize)
                .ToList();

            // ===============================
            // 🔹 Retorno final
            // ===============================
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
