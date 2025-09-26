using CeramicaCanelas.Domain.Enums.Financial;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.Extracts.Queries.PagedRequestExtract
{
    public class PagedRequestExtract : IRequest<PagedResultExtract>
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;

        // Filtros
        public DateOnly? StartDate { get; set; }
        public DateOnly? EndDate { get; set; }
        public PaymentMethod? PaymentMethod { get; set; }
    }
}
