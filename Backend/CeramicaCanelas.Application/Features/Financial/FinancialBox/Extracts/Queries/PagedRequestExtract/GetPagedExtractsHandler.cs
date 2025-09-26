using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Domain.Entities.Financial;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.Extracts.Queries.PagedRequestExtract
{
    public class GetPagedExtractsHandler : IRequestHandler<PagedRequestExtract, PagedResultExtract>
    {
        private readonly IExtractRepository _extractRepository;

        public GetPagedExtractsHandler(IExtractRepository extractRepository)
        {
            _extractRepository = extractRepository;
        }

        public async Task<PagedResultExtract> Handle(PagedRequestExtract request, CancellationToken cancellationToken)
        {
            // Query base: apenas ativos
            IEnumerable<Extract> extracts = _extractRepository.QueryAll()
                .Where(e => e.IsActive);

            // Filtros
            if (request.StartDate.HasValue)
                extracts = extracts.Where(e => e.Date >= request.StartDate.Value);

            if (request.EndDate.HasValue)
                extracts = extracts.Where(e => e.Date <= request.EndDate.Value);

            if (request.PaymentMethod.HasValue)
                extracts = extracts.Where(e => e.PaymentMethod == request.PaymentMethod.Value);

            var totalItems = extracts.Count();

            var pagedItems = extracts
                .OrderByDescending(e => e.Date)
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(e => new ExtractResult(e))
                .ToList();

            return new PagedResultExtract
            {
                Page = request.Page,
                PageSize = request.PageSize,
                TotalItems = totalItems,
                Items = pagedItems
            };
        }
    }
}
