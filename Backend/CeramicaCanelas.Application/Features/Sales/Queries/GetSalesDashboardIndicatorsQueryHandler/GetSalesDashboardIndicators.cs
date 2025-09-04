using CeramicaCanelas.Application.Features.Sales.Queries.Dashboard;
using MediatR;


namespace CeramicaCanelas.Application.Features.Sales.Queries.GetSalesDashboardIndicatorsQueryHandler
{
    public class GetSalesDashboardIndicatorsQuery : IRequest<GetSalesDashboardIndicatorsResult>
    {
        // Pode adicionar filtros opcionais no futuro, como:
        // public int? Year { get; set; }
        // public DateOnly? StartDate { get; set; }
        // public DateOnly? EndDate { get; set; }
    }

    // ===== RESULT =====
    public class GetSalesDashboardIndicatorsResult
    {
        // ===== INDICADORES GERAIS =====
        public int SalesThisMonth { get; set; }
        public decimal RevenueThisMonth { get; set; }

        public int SalesThisYear { get; set; }
        public decimal RevenueThisYear { get; set; }

        public int SalesLast30Days { get; set; }
        public decimal RevenueLast30Days { get; set; }

        public int SalesLast7Days { get; set; }
        public decimal RevenueLast7Days { get; set; }

        // ===== STATUS DAS VENDAS =====
        public int PendingSales { get; set; }
        public int ConfirmedSales { get; set; }
        public int CancelledSales { get; set; }

        // ===== MÉTRICAS =====
        public decimal AverageTicket { get; set; }
        public int UniqueCustomers { get; set; }

        // ===== DADOS PARA GRÁFICOS =====
        /// <summary>
        /// Vendas por mês (últimos 12 meses) - índice 0 = mês mais antigo
        /// </summary>
        public int[] SalesByMonth { get; set; } = new int[12];

        /// <summary>
        /// Faturamento por mês (últimos 12 meses) - índice 0 = mês mais antigo
        /// </summary>
        public decimal[] RevenueByMonth { get; set; } = new decimal[12];

        // ===== LISTAS DETALHADAS =====
        /// <summary>
        /// Top 10 produtos mais vendidos (últimos 30 dias)
        /// </summary>
        public List<TopProductItem> TopProducts { get; set; } = new();

        /// <summary>
        /// Estatísticas por forma de pagamento (últimos 30 dias)
        /// </summary>
        public List<PaymentMethodStats> PaymentMethodStats { get; set; } = new();

        /// <summary>
        /// Top 10 cidades com mais vendas (últimos 30 dias)
        /// </summary>
        public List<CityStats> TopCities { get; set; } = new();

        // ===== PROPRIEDADES CALCULADAS =====
        /// <summary>
        /// Taxa de conversão de vendas pendentes para confirmadas
        /// </summary>
        public decimal ConversionRate =>
            PendingSales + ConfirmedSales > 0
                ? Math.Round((decimal)ConfirmedSales / (PendingSales + ConfirmedSales) * 100, 2)
                : 0;

        /// <summary>
        /// Crescimento percentual do mês atual vs mês anterior
        /// </summary>
        public decimal MonthlyGrowthPercentage
        {
            get
            {
                if (RevenueByMonth.Length >= 2)
                {
                    var currentMonth = RevenueByMonth[^1]; // Último mês
                    var previousMonth = RevenueByMonth[^2]; // Penúltimo mês

                    if (previousMonth > 0)
                        return Math.Round((currentMonth - previousMonth) / previousMonth * 100, 2);
                }
                return 0;
            }
        }

        /// <summary>
        /// Total geral de vendas ativas no sistema
        /// </summary>
        public int TotalActiveSales => PendingSales + ConfirmedSales;
    }
}
