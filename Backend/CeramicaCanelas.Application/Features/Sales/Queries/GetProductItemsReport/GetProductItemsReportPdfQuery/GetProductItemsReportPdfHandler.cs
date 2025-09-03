using CeramicaCanelas.Application.Contracts.Application.Services;
using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Application.Features.Sales.Queries.GetProductItemsReport.GetProductItemsReportPdfQuery;
using CeramicaCanelas.Application.Services.EnumExtensions;
using CeramicaCanelas.Application.Services.Reports;
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
        // Período padrão (últimos 30 dias) e normalização
        var today = DateOnly.FromDateTime(System.DateTime.UtcNow.Date);
        var startDate = req.StartDate == default ? today.AddDays(-30) : req.StartDate;
        var endDate = req.EndDate == default ? today : req.EndDate;
        if (endDate < startDate) (startDate, endDate) = (endDate, startDate);

        // Converter datas de São Paulo para UTC
        var tz = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");

        var localStart = startDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified);
        var startUtc = TimeZoneInfo.ConvertTimeToUtc(localStart, tz);

        var localEnd = endDate.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Unspecified);
        var endUtc = TimeZoneInfo.ConvertTimeToUtc(localEnd, tz);

        // Query base (só ativas pelo HasQueryFilter)
        var q = _salesRepository.QueryAllWithIncludes();

        // CORREÇÃO: Aplicar filtro de status apenas se não for "All"
        if (req.Status != SaleStatus.All)
        {
            q = q.Where(s => s.Status == req.Status);
        }

        if (req.PaymentMethod.HasValue) q = q.Where(s => s.PaymentMethod == req.PaymentMethod.Value);
        if (!string.IsNullOrWhiteSpace(req.City))
        {
            var city = req.City.Trim().ToLower();
            q = q.Where(s => s.City != null && s.City.ToLower() == city);
        }
        if (!string.IsNullOrWhiteSpace(req.State))
        {
            var uf = req.State.Trim().ToLowerInvariant();
            q = q.Where(s => s.State.ToLower() == uf);
        }

        q = q.Where(s => s.Date >= startUtc && s.Date <= endUtc);

        // Explode itens e calcula RECEITA LÍQUIDA do item (rateio proporcional do desconto da venda)
        var itemsQ = q.SelectMany(s => s.Items.Select(i => new
        {
            i.Product,
            Milheiros = (decimal)i.Quantity,
            Subtotal = i.UnitPrice * (decimal)i.Quantity,
            SaleGross = s.TotalGross,
            SaleDiscount = s.Discount
        }))
        .Select(x => new
        {
            x.Product,
            x.Milheiros,
            NetRevenueRounded = Math.Round(
                (x.SaleGross > 0m)
                    ? x.Subtotal * (1m - (x.SaleDiscount / x.SaleGross))
                    : x.Subtotal,
                2)
        });

        if (req.Product.HasValue)
            itemsQ = itemsQ.Where(x => x.Product == req.Product.Value);

        // Agrega por produto usando a RECEITA LÍQUIDA
        var grouped = await itemsQ
            .GroupBy(x => x.Product)
            .Select(g => new ProductItemsRow
            {
                Product = g.Key,
                Milheiros = g.Sum(z => z.Milheiros),
                Revenue = g.Sum(z => z.NetRevenueRounded)
            })
            .OrderByDescending(r => r.Revenue)
            .ToListAsync(ct);

        // Totais
        var totalMilheiros = grouped.Sum(x => x.Milheiros);
        var totalRevenue = Math.Round(grouped.Sum(x => x.Revenue), 2);

        var subtitle = req.Product.HasValue ? $"Produto: {req.Product.Value}" : null;

        // Hard-code da empresa
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

        // CORREÇÃO: Função helper para obter descrição do status
        string GetStatusDescription(SaleStatus status)
        {
            return status switch
            {
                SaleStatus.All => "Todos",
                SaleStatus.Pending => "Pendente",
                SaleStatus.Confirmed => "Confirmado",
                SaleStatus.Cancelled => "Cancelado",
                _ => status.ToString()
            };
        }

        var filtrosAplicados = new List<AppliedFilter>
        {
            new("Período", $"{startDate:dd/MM/yyyy} a {endDate:dd/MM/yyyy}"),
            new("Status", GetStatusDescription(req.Status)),
            new("Forma de Pagamento", req.PaymentMethod.HasValue ? req.PaymentMethod.Value.ToString() : "Todos"),
            new("Cidade", string.IsNullOrWhiteSpace(req.City) ? "Todas" : req.City!.Trim()),
            new("UF", string.IsNullOrWhiteSpace(req.State) ? "Todas" : req.State!.Trim().ToUpperInvariant()),
            new("Produto", req.Product.HasValue ? req.Product.Value.GetDescription() : "Todos"),
            new("Janela UTC aplicada", $"{startUtc:yyyy-MM-dd HH:mm:ss} → {endUtc:yyyy-MM-dd HH:mm:ss}"),
            new("Gerado em", DateTime.Now.ToString("dd/MM/yyyy HH:mm"))
        };

        // Gera PDF
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