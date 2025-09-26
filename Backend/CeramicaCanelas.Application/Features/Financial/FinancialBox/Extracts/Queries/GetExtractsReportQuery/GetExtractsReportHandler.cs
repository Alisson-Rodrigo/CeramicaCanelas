using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.Extracts.Queries.GetExtractsReportQuery
{
    public class GetExtractsReportHandler : IRequestHandler<GetExtractsReportQuery, ExtractReportResult>
    {
        private readonly IExtractRepository _extractRepository;

        public GetExtractsReportHandler(IExtractRepository extractRepository)
        {
            _extractRepository = extractRepository;
        }

        public async Task<ExtractReportResult> Handle(GetExtractsReportQuery request, CancellationToken cancellationToken)
        {
            var extracts = _extractRepository.QueryAll()
                .Where(e => e.IsActive);

            if (request.StartDate.HasValue)
                extracts = extracts.Where(e => e.Date >= request.StartDate.Value);

            if (request.EndDate.HasValue)
                extracts = extracts.Where(e => e.Date <= request.EndDate.Value);

            var list = extracts.ToList();

            var result = new ExtractReportResult
            {
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                TotalGeneral = list.Sum(e => e.Value),
                TotalsByAccount = list
                    .GroupBy(e => e.PaymentMethod)
                    .ToDictionary(
                        g => g.Key,
                        g => g.Sum(e => e.Value)
                    )
            };

            return result;
        }
    }
}
