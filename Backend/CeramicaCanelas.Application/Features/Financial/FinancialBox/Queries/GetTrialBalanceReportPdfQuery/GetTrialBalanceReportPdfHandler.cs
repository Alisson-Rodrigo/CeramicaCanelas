using CeramicaCanelas.Application.Contracts.Application.Services;
using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Application.Services.Reports;
using CeramicaCanelas.Domain.Enums.Financial;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
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
            // 🔹 1️⃣ ENTRADAS (EXTRATOS + LANÇAMENTOS)
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

            // ✅ Total geral do extrato (entradas + saídas)
            var totalExtractOverall = extractDetails.Sum(e => e.Value);

            // Entradas vindas de extratos (valores positivos)
            var extractIncomes = extractDetails
                .Where(e => e.Value > 0)
                .GroupBy(e => e.PaymentMethod)
                .Select(g => new
                {
                    AccountName = g.Key.ToString(),
                    TotalIncome = g.Sum(x => x.Value)
                })
                .ToList();

            // Lançamentos de entrada (LaunchType.Income)
            var incomeLaunches = _launchRepository.QueryAllWithIncludes()
                .Where(l => l.Status == PaymentStatus.Paid && l.Type == LaunchType.Income);

            if (req.StartDate.HasValue)
                incomeLaunches = incomeLaunches.Where(l => l.LaunchDate >= req.StartDate.Value);
            if (req.EndDate.HasValue)
                incomeLaunches = incomeLaunches.Where(l => l.LaunchDate <= req.EndDate.Value);
            if (req.PaymentMethod.HasValue)
                incomeLaunches = incomeLaunches.Where(l => l.PaymentMethod == req.PaymentMethod.Value);

            var launchIncomes = await incomeLaunches
                .GroupBy(l => l.PaymentMethod)
                .Select(g => new
                {
                    AccountName = g.Key.ToString(),
                    TotalIncome = g.Sum(x => x.Amount)
                })
                .ToListAsync(ct);

            // Combina extratos + lançamentos
            var combinedAccounts = extractIncomes
                .Concat(launchIncomes)
                .GroupBy(a => a.AccountName)
                .Select(g => new
                {
                    AccountName = g.Key,
                    TotalIncome = g.Sum(x => x.TotalIncome)
                })
                .OrderByDescending(a => a.TotalIncome)
                .ToList();

            var totalIncomeOverall = combinedAccounts.Sum(a => a.TotalIncome);

            // ============================
            // 🔹 2️⃣ LANÇAMENTOS (Saídas)
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

            // ============================
            // 🔹 3️⃣ Prepara dados PDF
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

            var accountRows = combinedAccounts
                .Select(a => new TrialBalanceAccountRow
                {
                    AccountName = a.AccountName,
                    TotalIncome = a.TotalIncome
                })
                .ToList();

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

            var extractRows = extractDetails
                .Select(e => new TrialBalanceExtractRow
                {
                    AccountName = e.PaymentMethod.ToString(),
                    Date = e.Date,
                    Description = e.Observations ?? "-",
                    Value = e.Value
                })
                .ToList();

            var filterRows = new List<TrialBalanceFilter>
            {
                new("Período", $"{startDate:dd/MM/yyyy} a {endDate:dd/MM/yyyy}"),
                new("Conta", req.PaymentMethod?.ToString() ?? "Todas"),
                new("Gerado em", DateTime.Now.ToString("dd/MM/yyyy HH:mm")),
                new("Saldo Geral dos Extratos", totalExtractOverall.ToString("C2"))
            };

            // ============================
            // 🔹 4️⃣ GERA PDF FINAL
            // ============================
            return _pdf.BuildTrialBalancePdf(
                company: company,
                period: (startDate, endDate),
                accounts: accountRows,
                groups: groupRows,
                extracts: extractRows,
                totalIncomeOverall: totalIncomeOverall,
                totalExpenseOverall: totalExpenseOverall,
                totalExtractOverall: totalExtractOverall, // ✅ novo total geral dos extratos
                logoPath: logoPath,
                filters: filterRows
            );

        }
    }
}
