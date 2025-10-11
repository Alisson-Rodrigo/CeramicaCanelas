using CeramicaCanelas.Application.Contracts.Application.Services;
using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Application.Features.Sales.Queries.GetProductItemsReport.GetProductItemsReportPdfQuery;
using CeramicaCanelas.Application.Services.EnumExtensions;
using CeramicaCanelas.Application.Services.Reports;
using CeramicaCanelas.Domain.Enums.Financial;
using CeramicaCanelas.Domain.Enums.Sales;
using MediatR;
using Microsoft.EntityFrameworkCore;

public class GetProductItemsReportPdfHandler
    : IRequestHandler<GetProductItemsReportPdfQuery, byte[]>
{
    private readonly ISalesRepository _salesRepository;
    private readonly IPdfReportService _pdf;

    public GetProductItemsReportPdfHandler(
        ISalesRepository salesRepository,
        IPdfReportService pdf)
    {
        _salesRepository = salesRepository;
        _pdf = pdf;
    }

    public async Task<byte[]> Handle(GetProductItemsReportPdfQuery req, CancellationToken ct)
    {
        // ===========================================
        // 🔹 Período padrão e normalização
        // ===========================================
        var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);
        var startDate = req.StartDate == default ? today.AddDays(-30) : req.StartDate;
        var endDate = req.EndDate == default ? today : req.EndDate;

        if (endDate < startDate)
            (startDate, endDate) = (endDate, startDate);

        // ===========================================
        // 🔹 Query base
        // ===========================================
        var q = _salesRepository.QueryAllWithIncludes();

        // Status
        if (req.Status is not null)
            q = q.Where(s => s.Status == req.Status);

        // Forma de pagamento
        if (req.PaymentMethod.HasValue)
            q = q.Where(s => s.Payments.Any(p => p.PaymentMethod == req.PaymentMethod.Value));

        // Cidade
        if (!string.IsNullOrWhiteSpace(req.City))
        {
            var city = req.City.Trim().ToLower();
            q = q.Where(s => s.City != null && s.City.ToLower() == city);
        }

        // Estado (UF)
        if (!string.IsNullOrWhiteSpace(req.State))
        {
            var uf = req.State.Trim().ToLowerInvariant();
            q = q.Where(s => s.State.ToLower() == uf);
        }

        // ===========================================
        // 🔹 Filtro de período (sem timezone)
        // ===========================================
        q = q.Where(s => s.Date >= startDate && s.Date <= endDate);

        // ===========================================
        // 🔹 Explode itens com rateio proporcional
        // ===========================================
        var itemsQ = q.SelectMany(s => s.Items.Select(i => new
        {
            i.Product,
            Milheiros = (decimal)i.Quantity,
            i.Break,
            Subtotal = i.UnitPrice * (decimal)i.Quantity,
            SaleGross = s.TotalGross,
            SaleDiscount = s.Discount
        }))
        .Select(x => new
        {
            x.Product,
            x.Milheiros,
            x.Break,
            NetRevenueRounded = Math.Round(
                (x.SaleGross > 0m)
                    ? x.Subtotal * (1m - (x.SaleDiscount / x.SaleGross))
                    : x.Subtotal,
                2)
        });

        if (req.Product.HasValue)
            itemsQ = itemsQ.Where(x => x.Product == req.Product.Value);

        // ===========================================
        // 🔹 Agrupamento
        // ===========================================
        var grouped = await itemsQ
            .GroupBy(x => x.Product)
            .Select(g => new ProductItemsRow
            {
                Product = g.Key,
                Milheiros = g.Sum(z => z.Milheiros),
                Revenue = g.Sum(z => z.NetRevenueRounded),
                Breaks = g.Sum(z => z.Break)
            })
            .OrderByDescending(r => r.Revenue)
            .ToListAsync(ct);

        // ===========================================
        // 🔹 Totais
        // ===========================================
        var totalMilheiros = grouped.Sum(x => x.Milheiros);
        var totalRevenue = Math.Round(grouped.Sum(x => x.Revenue), 2);
        var subtitle = req.Product.HasValue ? $"Produto: {req.Product.Value}" : null;

        // ===========================================
        // 🔹 Dados da empresa
        // ===========================================
        var company = new CompanyProfile
        {
            Name = "CERÂMICA CANELAS",
            TradeDescription = "TELHAS, TIJOLOS E LAJOTAS",
            LegalName = "CJM INDÚSTRIA CERÂMICA LTDA EPP",
            StateRegistration = "Inscr. Est.: 19.565.563-4",
            Cnpj = "CNPJ: 22.399.038/0001-11",
            Address = "Comun. Tamboril, S/N - Zona Rural",
            CityStateZip = "CEP: 64.610-000 - Sussuapara - PI",
            Phones = "Fone: (89) 98818-8560 • 98812-2809"
        };

        const string LogoRelative = "wwwroot/base/Logo.png";
        string? logoPath = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, LogoRelative));
        if (!File.Exists(logoPath)) logoPath = null;

        // ===========================================
        // 🔹 Descrição dos filtros
        // ===========================================
        string GetStatusDescription(SaleStatus? status) =>
            status switch
            {
                null => "Todos",
                SaleStatus.Pending => "Pendente",
                SaleStatus.Confirmed => "Confirmado",
                SaleStatus.Cancelled => "Cancelado",
                SaleStatus.PartiallyPaid => "Parcialmente Pago",
                _ => status.ToString()
            };

        string GetPaymentMethodDescription(PaymentMethod? pm) =>
            pm.HasValue ? pm.Value.ToString() : "Todos";

        var filtrosAplicados = new List<AppliedFilter>
        {
            new("Período", $"{startDate:dd/MM/yyyy} a {endDate:dd/MM/yyyy}"),
            new("Status", GetStatusDescription(req.Status)),
            new("Forma de Pagamento", GetPaymentMethodDescription(req.PaymentMethod)),
            new("Cidade", string.IsNullOrWhiteSpace(req.City) ? "Todas" : req.City!.Trim()),
            new("UF", string.IsNullOrWhiteSpace(req.State) ? "Todas" : req.State!.Trim().ToUpperInvariant()),
            new("Produto", req.Product.HasValue ? req.Product.Value.GetDescription() : "Todos"),
            new("Gerado em", DateTime.Now.ToString("dd/MM/yyyy HH:mm"))
        };

        // ===========================================
        // 🔹 Gera PDF
        // ===========================================
        return _pdf.BuildProductItemsReportPdf(
            company: company,
            period: (startDate, endDate),
            rows: grouped,
            totalMilheiros: totalMilheiros,
            totalRevenue: totalRevenue,
            subtitle: subtitle,
            logoPath: logoPath,
            filters: filtrosAplicados
        );
    }
}
