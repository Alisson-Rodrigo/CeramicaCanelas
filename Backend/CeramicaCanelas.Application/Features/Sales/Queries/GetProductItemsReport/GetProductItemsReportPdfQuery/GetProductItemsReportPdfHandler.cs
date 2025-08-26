using CeramicaCanelas.Application.Contracts.Application.Services;
using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Application.Features.Sales.Queries.GetProductItemsReport.GetProductItemsReportPdfQuery;
using CeramicaCanelas.Application.Services.Reports;
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

        // DateOnly -> DateTime (UTC)
        var startUtc = System.DateTime.SpecifyKind(startDate.ToDateTime(TimeOnly.MinValue), System.DateTimeKind.Utc);
        var endUtc = System.DateTime.SpecifyKind(endDate.ToDateTime(TimeOnly.MaxValue), System.DateTimeKind.Utc);

        // Query base (só ativas pelo HasQueryFilter)
        var q = _salesRepository.QueryAllWithIncludes();
        if (req.Status != 0) q = q.Where(s => s.Status == req.Status);
        if (req.PaymentMethod.HasValue) q = q.Where(s => s.PaymentMethod == req.PaymentMethod.Value);
        if (!string.IsNullOrWhiteSpace(req.City))
        {
            var city = req.City.Trim().ToLower();
            q = q.Where(s => s.City != null && s.City.ToLower() == city);
        }
        if (!string.IsNullOrWhiteSpace(req.State))
        {
            var uf = req.State.Trim().ToUpper();
            q = q.Where(s => s.State == uf);
        }
        q = q.Where(s => s.Date >= startUtc && s.Date <= endUtc);

        // Explode itens e agrega (Quantity = MILHEIROS, UnitPrice = R$/milheiro)
        var itemsQ = q.SelectMany(s => s.Items.Select(i => new
        {
            i.Product,
            i.Quantity,                                // milheiros
            Subtotal = i.UnitPrice * i.Quantity        // receita
        }));
        if (req.Product.HasValue)
            itemsQ = itemsQ.Where(x => x.Product == req.Product.Value);

        var grouped = await itemsQ
            .GroupBy(x => x.Product)
            .Select(g => new ProductItemsRow
            {
                Product = g.Key,
                Milheiros = g.Sum(z => z.Quantity),
                Revenue = g.Sum(z => z.Subtotal)
            })
            .OrderByDescending(r => r.Revenue)
            .ToListAsync(ct);

        var totalMilheiros = grouped.Sum(x => x.Milheiros);
        var totalRevenue = grouped.Sum(x => x.Revenue);
        var subtitle = req.Product.HasValue ? $"Produto: {req.Product.Value}" : null;

        // ===== HARD-CODE da empresa =====
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

        // Logo hardcode: caminho RELATIVO na pasta de execução (ajuste se preferir absoluto)
        const string LogoRelative = "wwwroot/base/Logo.png";

        string? logoPath = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, LogoRelative));
        if (!File.Exists(logoPath)) logoPath = null; // não quebra se não achar

        // Gera PDF
        return _pdf.BuildProductItemsReportPdf(
            company: company,
            period: (startDate, endDate),
            rows: grouped,
            totalMilheiros: totalMilheiros,
            totalRevenue: totalRevenue,
            subtitle: subtitle,
            logoPath: logoPath
        );
    }
}
