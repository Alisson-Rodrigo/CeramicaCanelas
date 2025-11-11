using CeramicaCanelas.Domain.Enums.Financial;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.Queries.GetDailyLaunchHistory
{
    public class GetDailyLaunchHistoryQuery : IRequest<List<LaunchHistoryItem>>
    {
        public DateOnly? StartDate { get; set; } // Data inicial do histórico
        public DateOnly? EndDate { get; set; }   // Data final do histórico
        public LaunchType? Type { get; set; }    // Opcional: filtrar por tipo (entrada / saída)
    }   
}
