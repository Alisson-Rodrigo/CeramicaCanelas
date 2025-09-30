using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Application.Features.Sales.Queries.GetSalesDashboardIndicatorsQueryHandler;
using CeramicaCanelas.Application.Services.EnumExtensions;
using CeramicaCanelas.Domain.Enums.Financial;
using CeramicaCanelas.Domain.Enums.Sales;
using MediatR;
using Microsoft.EntityFrameworkCore;


namespace CeramicaCanelas.Application.Features.Sales.Queries.Dashboard
{
    public class GetSalesDashboardIndicatorsQueryHandler : IRequestHandler<GetSalesDashboardIndicatorsQuery, GetSalesDashboardIndicatorsResult>
    {
        private readonly ISalesRepository _salesRepository;

        public GetSalesDashboardIndicatorsQueryHandler(ISalesRepository salesRepository)
        {
            _salesRepository = salesRepository;
        }

        public async Task<GetSalesDashboardIndicatorsResult> Handle(GetSalesDashboardIndicatorsQuery request, CancellationToken cancellationToken)
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var currentMonth = new DateOnly(today.Year, today.Month, 1);
            var firstDayOfYear = new DateOnly(today.Year, 1, 1);
            var last30Days = today.AddDays(-30);
            var last7Days = today.AddDays(-7);
            var firstDayOf12MonthsAgo = new DateOnly(today.Year, today.Month, 1).AddMonths(-11);

            // Query base
            var salesQuery = _salesRepository.QueryAllWithIncludes()
                .Where(s => s.IsActive);

            // ===== INDICADORES GERAIS =====
            var generalStats = await salesQuery
                .GroupBy(s => 1)
                .Select(g => new
                {
                    SalesThisMonth = g.Where(s => s.Date >= currentMonth).Count(),
                    RevenueThisMonth = g.Where(s => s.Date >= currentMonth && s.Status == SaleStatus.Confirmed)
                        .Sum(s => s.TotalNet),

                    SalesThisYear = g.Where(s => s.Date >= firstDayOfYear).Count(),
                    RevenueThisYear = g.Where(s => s.Date >= firstDayOfYear && s.Status == SaleStatus.Confirmed)
                        .Sum(s => s.TotalNet),

                    SalesLast30Days = g.Where(s => s.Date >= last30Days).Count(),
                    RevenueLast30Days = g.Where(s => s.Date >= last30Days && s.Status == SaleStatus.Confirmed)
                        .Sum(s => s.TotalNet),

                    SalesLast7Days = g.Where(s => s.Date >= last7Days).Count(),
                    RevenueLast7Days = g.Where(s => s.Date >= last7Days && s.Status == SaleStatus.Confirmed)
                        .Sum(s => s.TotalNet),

                    PendingSales = g.Where(s => s.Status == SaleStatus.Pending).Count(),
                    ConfirmedSales = g.Where(s => s.Status == SaleStatus.Confirmed).Count(),
                    CancelledSales = g.Where(s => s.Status == SaleStatus.Cancelled).Count(),

                    AverageTicket = g.Where(s => s.Status == SaleStatus.Confirmed && s.TotalNet > 0)
                        .Average(s => (decimal?)s.TotalNet) ?? 0,

                    UniqueCustomers = g.Where(s => !string.IsNullOrEmpty(s.CustomerName))
                        .Select(s => s.CustomerName)
                        .Distinct().Count()
                })
                .FirstOrDefaultAsync(cancellationToken);

            // ===== VENDAS POR MÊS (12 meses) =====
            var monthlySales = await salesQuery
                .Where(s => s.Date >= firstDayOf12MonthsAgo)
                .GroupBy(s => new { s.Date.Year, s.Date.Month })
                .Select(g => new
                {
                    Year = g.Key.Year,
                    Month = g.Key.Month,
                    TotalSales = g.Count(),
                    TotalRevenue = g.Where(s => s.Status == SaleStatus.Confirmed).Sum(s => s.TotalNet),
                    ConfirmedSales = g.Where(s => s.Status == SaleStatus.Confirmed).Count(),
                    PendingSales = g.Where(s => s.Status == SaleStatus.Pending).Count()
                })
                .ToListAsync(cancellationToken);

            var salesByMonth = new int[12];
            var revenueByMonth = new decimal[12];

            for (int i = 0; i < 12; i++)
            {
                var targetMonth = firstDayOf12MonthsAgo.AddMonths(i);
                var monthData = monthlySales.FirstOrDefault(m => m.Year == targetMonth.Year && m.Month == targetMonth.Month);
                salesByMonth[i] = monthData?.TotalSales ?? 0;
                revenueByMonth[i] = monthData?.TotalRevenue ?? 0;
            }

            // ===== TOP PRODUTOS =====
            var topProducts = salesQuery
                .Where(s => s.Status == SaleStatus.Confirmed && s.Date >= last30Days)
                .SelectMany(s => s.Items)
                .AsEnumerable()
                .GroupBy(i => i.Product)
                .Select(g => new TopProductItem
                {
                    Product = g.Key,
                    ProductDescription = g.Key.GetDescription(),
                    TotalQuantity = g.Sum(i => i.Quantity),
                    TotalRevenue = g.Sum(i => i.Subtotal),
                    SalesCount = g.Count()
                })
                .OrderByDescending(p => p.TotalQuantity)
                .Take(10)
                .ToList();

            // ===== VENDAS POR FORMA DE PAGAMENTO =====
            var paymentMethodStats = await salesQuery
                .Where(s => s.Status == SaleStatus.Confirmed && s.Date >= last30Days)
                .GroupBy(s => s.PaymentMethod)
                .Select(g => new PaymentMethodStats
                {
                    PaymentMethod = g.Key,
                    PaymentMethodDescription = g.Key.GetDescription(),
                    Count = g.Count(),
                    TotalRevenue = g.Sum(s => s.TotalNet),
                    Percentage = 0
                })
                .ToListAsync(cancellationToken);

            var totalConfirmedSales = paymentMethodStats.Sum(p => p.Count);
            if (totalConfirmedSales > 0)
            {
                foreach (var stat in paymentMethodStats)
                {
                    stat.Percentage = Math.Round((decimal)stat.Count / totalConfirmedSales * 100, 2);
                }
            }

            // ===== VENDAS POR CIDADE/ESTADO =====
            var topCities = await salesQuery
                .Where(s => s.Status == SaleStatus.Confirmed &&
                           s.Date >= last30Days &&
                           !string.IsNullOrEmpty(s.City))
                .GroupBy(s => new { s.City, s.State })
                .Select(g => new CityStats
                {
                    City = g.Key.City,
                    State = g.Key.State,
                    SalesCount = g.Count(),
                    TotalRevenue = g.Sum(s => s.TotalNet)
                })
                .OrderByDescending(c => c.SalesCount)
                .Take(10)
                .ToListAsync(cancellationToken);

            return new GetSalesDashboardIndicatorsResult
            {
                SalesThisMonth = generalStats?.SalesThisMonth ?? 0,
                RevenueThisMonth = generalStats?.RevenueThisMonth ?? 0,
                SalesThisYear = generalStats?.SalesThisYear ?? 0,
                RevenueThisYear = generalStats?.RevenueThisYear ?? 0,
                SalesLast30Days = generalStats?.SalesLast30Days ?? 0,
                RevenueLast30Days = generalStats?.RevenueLast30Days ?? 0,
                SalesLast7Days = generalStats?.SalesLast7Days ?? 0,
                RevenueLast7Days = generalStats?.RevenueLast7Days ?? 0,

                PendingSales = generalStats?.PendingSales ?? 0,
                ConfirmedSales = generalStats?.ConfirmedSales ?? 0,
                CancelledSales = generalStats?.CancelledSales ?? 0,

                AverageTicket = Math.Round(generalStats?.AverageTicket ?? 0, 2),
                UniqueCustomers = generalStats?.UniqueCustomers ?? 0,

                SalesByMonth = salesByMonth,
                RevenueByMonth = revenueByMonth,

                TopProducts = topProducts,
                PaymentMethodStats = paymentMethodStats,
                TopCities = topCities
            };
        }


        // ===== CLASSES DE RESULTADO =====
        public class TopProductItem
        {
            public ProductType Product { get; set; }
            public string ProductDescription { get; set; } = string.Empty;
            public decimal TotalQuantity { get; set; }
            public decimal TotalRevenue { get; set; }
            public int SalesCount { get; set; }
        }

        public class PaymentMethodStats
        {
            public PaymentMethod PaymentMethod { get; set; }
            public string PaymentMethodDescription { get; set; } = string.Empty;
            public int Count { get; set; }
            public decimal TotalRevenue { get; set; }
            public decimal Percentage { get; set; }
        }

        public class CityStats
        {
            public string City { get; set; } = string.Empty;
            public string State { get; set; } = string.Empty;
            public int SalesCount { get; set; }
            public decimal TotalRevenue { get; set; }
        }
    }
}