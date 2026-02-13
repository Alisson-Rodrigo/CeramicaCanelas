using CeramicaCanelas.Application.Contracts.Application.Services;
using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Domain.Enums.Financial;
using CeramicaCanelas.Application.Services.Reports;
using MediatR;
using Microsoft.EntityFrameworkCore;
using static CeramicaCanelas.Application.Contracts.Application.Services.IPdfReportService;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.Queries.GetTrialBalanceReportPdfQuery
{
    public class GetTrialBalanceReportPdfHandler
        : IRequestHandler<GetTrialBalanceReportPdfQuery, byte[]>
    {
        private readonly ILaunchRepository _launchRepository;
        private readonly IExtractRepository _extractRepository;
        private readonly IPdfReportService _pdf;

        public GetTrialBalanceReportPdfHandler(
            ILaunchRepository launchRepository,
            IExtractRepository extractRepository,
            IPdfReportService pdf)
        {
            _launchRepository = launchRepository;
            _extractRepository = extractRepository;
            _pdf = pdf;
        }

        public async Task<byte[]> Handle(GetTrialBalanceReportPdfQuery req, CancellationToken ct)
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);
            var startDate = req.StartDate ?? today.AddDays(-30);
            var endDate = req.EndDate ?? today;
            if (endDate < startDate) (startDate, endDate) = (endDate, startDate);

            // ============================
            // 🔹 1) EXTRATOS (APENAS LISTAGEM / VISUALIZAÇÃO)
            // ============================
            var extracts = _extractRepository.QueryAll().Where(e => e.IsActive);

            if (req.StartDate.HasValue)
                extracts = extracts.Where(e => e.Date >= req.StartDate);
            if (req.EndDate.HasValue)
                extracts = extracts.Where(e => e.Date <= req.EndDate);
            if (req.PaymentMethod.HasValue)
                extracts = extracts.Where(e => e.PaymentMethod == req.PaymentMethod.Value);

            var extractDetails = await extracts
                .Select(e => new
                {
                    e.PaymentMethod,
                    e.Date,
                    e.Observations,
                    e.Value
                })
                .OrderByDescending(e => e.Date)
                .ToListAsync(ct);

            // ✅ (Opcional) Total do extrato no período (apenas informativo no PDF)
            // Se você NÃO quer nenhum total do extrato, pode remover isso e também a linha do filtro.
            var totalExtractOverall = extractDetails.Sum(e => e.Value);

            var extractRows = extractDetails
                .Select(e => new TrialBalanceExtractRow
                {
                    AccountName = e.PaymentMethod.ToString(),
                    Date = e.Date,
                    Description = e.Observations ?? "-",
                    Value = e.Value
                })
                .ToList();

            // ============================
            // 🔹 2) ENTRADAS (SOMENTE LANÇAMENTOS)
            // ============================
            var incomeLaunches = _launchRepository.QueryAllWithIncludes()
                .Where(l => l.Status == PaymentStatus.Paid && l.Type == LaunchType.Income);

            if (req.StartDate.HasValue)
                incomeLaunches = incomeLaunches.Where(l => l.LaunchDate >= req.StartDate.Value);
            if (req.EndDate.HasValue)
                incomeLaunches = incomeLaunches.Where(l => l.LaunchDate <= req.EndDate.Value);
            if (req.PaymentMethod.HasValue)
                incomeLaunches = incomeLaunches.Where(l => l.PaymentMethod == req.PaymentMethod.Value);

            var incomeAccounts = await incomeLaunches
                .GroupBy(l => l.PaymentMethod)
                .Select(g => new
                {
                    AccountName = g.Key.ToString(),
                    TotalIncome = g.Sum(x => x.Amount)
                })
                .OrderByDescending(a => a.TotalIncome)
                .ToListAsync(ct);

            var totalIncomeOverall = incomeAccounts.Sum(a => a.TotalIncome);

            var accountRows = incomeAccounts
                .Select(a => new TrialBalanceAccountRow
                {
                    AccountName = a.AccountName,
                    TotalIncome = a.TotalIncome
                })
                .ToList();

            // ============================
            // 🔹 3) SAÍDAS POR GRUPO/CATEGORIA (LANÇAMENTOS)
            // ============================
            var launches = _launchRepository.QueryAllWithIncludes()
                .Include(l => l.Category)!.ThenInclude(c => c.Group)
                .Where(l => l.Status == PaymentStatus.Paid && l.Type == LaunchType.Expense);

            if (req.StartDate.HasValue)
                launches = launches.Where(l => l.LaunchDate >= req.StartDate.Value);
            if (req.EndDate.HasValue)
                launches = launches.Where(l => l.LaunchDate <= req.EndDate.Value);
            if (req.GroupId.HasValue)
                launches = launches.Where(l => l.Category!.GroupId == req.GroupId.Value);
            if (req.CategoryId.HasValue)
                launches = launches.Where(l => l.CategoryId == req.CategoryId.Value);

            var expenseList = await launches
                .Select(l => new
                {
                    GroupName = l.Category != null && l.Category.Group != null
                        ? l.Category.Group.Name
                        : "Sem grupo",
                    CategoryName = l.Category != null
                        ? l.Category.Name
                        : "Sem categoria",
                    l.Amount
                })
                .ToListAsync(ct);

            var groupedExpenses = expenseList
                .GroupBy(g => g.GroupName)
                .Select(g => new
                {
                    GroupName = g.Key,
                    Categories = g.GroupBy(c => c.CategoryName)
                        .Select(cg => new
                        {
                            CategoryName = cg.Key,
                            TotalExpense = cg.Sum(x => x.Amount)
                        })
                        .ToList(),
                    GroupExpense = g.Sum(x => x.Amount)
                })
                .ToList();

            var totalExpenseOverall = groupedExpenses.Sum(g => g.GroupExpense);

            var groupRows = groupedExpenses
                .Select(g => new TrialBalanceGroupRow
                {
                    GroupName = g.GroupName,
                    Categories = g.Categories
                        .Select(c => new TrialBalanceCategoryRow
                        {
                            CategoryName = c.CategoryName,
                            TotalExpense = c.TotalExpense
                        })
                        .ToList()
                })
                .ToList();

            // ============================
            // 🔹 4) SAÍDAS POR CONTA (LANÇAMENTOS)
            // ============================
            var expenseLaunchesByAccount = _launchRepository.QueryAllWithIncludes()
                .Where(l => l.Status == PaymentStatus.Paid && l.Type == LaunchType.Expense);

            if (req.StartDate.HasValue)
                expenseLaunchesByAccount = expenseLaunchesByAccount.Where(l => l.LaunchDate >= req.StartDate.Value);
            if (req.EndDate.HasValue)
                expenseLaunchesByAccount = expenseLaunchesByAccount.Where(l => l.LaunchDate <= req.EndDate.Value);
            if (req.PaymentMethod.HasValue)
                expenseLaunchesByAccount = expenseLaunchesByAccount.Where(l => l.PaymentMethod == req.PaymentMethod.Value);

            var expenseAccounts = await expenseLaunchesByAccount
                .GroupBy(l => l.PaymentMethod)
                .Select(g => new
                {
                    AccountName = g.Key.ToString(),
                    TotalExpense = g.Sum(x => x.Amount)
                })
                .ToListAsync(ct);

            // ============================
            // 🔹 5) Prepara PDF
            // ============================
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

            var filterRows = new List<TrialBalanceFilter>
            {
                new("Período", $"{startDate:dd/MM/yyyy} a {endDate:dd/MM/yyyy}"),
                new("Conta", req.PaymentMethod?.ToString() ?? "Todas"),
                new("Gerado em", DateTime.Now.ToString("dd/MM/yyyy HH:mm")),
                // se não quiser exibir total de extrato, remova a linha abaixo:
                new("Saldo Geral dos Extratos", totalExtractOverall.ToString("C2"))
            };

            return _pdf.BuildTrialBalancePdf(
                company: company,
                period: (startDate, endDate),
                accounts: accountRows,  // ✅ Entradas: SOMENTE lançamentos
                groups: groupRows,      // Saídas por grupo
                extracts: extractRows,  // ✅ Extratos: SOMENTE listagem
                totalIncomeOverall: totalIncomeOverall,
                totalExpenseOverall: totalExpenseOverall,
                totalExtractOverall: totalExtractOverall, // (opcional informativo)
                expenseAccounts: expenseAccounts.Select(a => new IPdfReportService.TrialBalanceAccountRow
                {
                    AccountName = a.AccountName,
                    TotalIncome = a.TotalExpense // (mantido por compatibilidade com o DTO do PDF)
                }).ToList(),
                logoPath: logoPath,
                filters: filterRows
            );
        }
    }
}
