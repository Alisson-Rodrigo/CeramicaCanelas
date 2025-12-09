using CeramicaCanelas.Application.Features.Almoxarifado.Product.Queries.Pages;
using CeramicaCanelas.Domain.Enums.Financial;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.Queries.GetDailyLaunchHistory
{
    public class GetDailyLaunchHistoryQuery : IRequest<PagedResult<LaunchHistoryItem>>
    {
        public DateOnly? StartDate { get; set; }
        public DateOnly? EndDate { get; set; }
        public LaunchType? Type { get; set; }

        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }

}
