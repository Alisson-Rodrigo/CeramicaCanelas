using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.Queries.GetDailyLaunchHistory
{
    public class GetDailyLaunchHistoryHandler
         : IRequestHandler<GetDailyLaunchHistoryQuery, List<LaunchHistoryItem>>
    {
        private readonly ILaunchRepository _launchRepository;

        public GetDailyLaunchHistoryHandler(ILaunchRepository launchRepository)
        {
            _launchRepository = launchRepository;
        }

        public async Task<List<LaunchHistoryItem>> Handle(
            GetDailyLaunchHistoryQuery req,
            CancellationToken ct)
        {
            var query = _launchRepository.QueryAllWithIncludes();

            // 🔹 Filtro por tipo (opcional)
            if (req.Type.HasValue)
                query = query.Where(l => l.Type == req.Type.Value);

            // 🔹 Filtro de data (somente se informado)
            if (req.StartDate.HasValue || req.EndDate.HasValue)
            {
                var startDate = req.StartDate ?? req.EndDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
                var endDate = req.EndDate ?? req.StartDate ?? startDate;

                if (endDate < startDate)
                    (startDate, endDate) = (endDate, startDate);

                var startDateTime = DateTime.SpecifyKind(startDate.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
                var endDateTime = DateTime.SpecifyKind(endDate.ToDateTime(TimeOnly.MaxValue), DateTimeKind.Utc);

                query = query.Where(l =>
                    (l.CreatedOn >= startDateTime && l.CreatedOn <= endDateTime) ||
                    (l.ModifiedOn >= startDateTime && l.ModifiedOn <= endDateTime)
                );
            }

            var result = await query
                .OrderByDescending(l => l.CreatedOn)
                .ThenByDescending(l => l.ModifiedOn)
                .Select(l => new LaunchHistoryItem
                {
                    Id = l.Id,
                    Description = l.Description,
                    Amount = l.Amount,
                    Type = l.Type,
                    CategoryName = l.Category != null ? l.Category.Name : "Sem categoria",
                    CustomerName = l.Customer != null ? l.Customer.Name : "Sem cliente",
                    PaymentMethod = l.PaymentMethod.ToString(),
                    Date = l.LaunchDate,
                    CreatedOn = l.CreatedOn,
                    ModifiedOn = l.ModifiedOn,
                    ChangeType =
                        l.CreatedOn.Date == l.ModifiedOn.Date
                            ? "Criado"
                            : "Atualizado"
                })
                .ToListAsync(ct);

            return result;
        }
    }
}
