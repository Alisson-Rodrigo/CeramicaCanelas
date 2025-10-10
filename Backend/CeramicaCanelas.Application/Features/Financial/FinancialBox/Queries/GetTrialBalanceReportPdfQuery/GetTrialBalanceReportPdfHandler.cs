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
            // 🔹 1️⃣ EXTRATOS (Entradas)
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

            var accountSummaries = extractDetails
                .GroupBy(e => e.PaymentMethod)
                .Select(g => new
                {
                    AccountName = g.Key.ToString(),
                    TotalIncome = g.Where(x => x.Value > 0).Sum(x => x.Value),
                    TotalOutflow = g.Where(x => x.Value < 0).Sum(x => Math.Abs(x.Value))
                })
                .ToList();

            var totalIncomeOverall = accountSummaries.Sum(a => a.TotalIncome);

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

            // ✅ Mapeia para DTOs esperados pelo serviço PDF
            var accountRows = accountSummaries
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

            // ✅ Converte filtros para o tipo correto
            var filterRows = new List<TrialBalanceFilter>
            {
                new("Período", $"{startDate:dd/MM/yyyy} a {endDate:dd/MM/yyyy}"),
                new("Conta", req.PaymentMethod?.ToString() ?? "Todas"),
                new("Gerado em", DateTime.Now.ToString("dd/MM/yyyy HH:mm"))
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
                logoPath: logoPath,
                filters: filterRows
            );

        }
    }
}
