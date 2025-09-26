using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.LaunchCategoryGroups.Queries.PagedRequestLaunchCategoryGroup
{
    public class GetPagedLaunchCategoryGroupsHandler : IRequestHandler<PagedRequestLaunchCategoryGroup, PagedResultLaunchCategoryGroup>
    {
        private readonly ILaunchCategoryGroupRepository _repository;

        public GetPagedLaunchCategoryGroupsHandler(ILaunchCategoryGroupRepository repository)
        {
            _repository = repository;
        }

        public async Task<PagedResultLaunchCategoryGroup> Handle(PagedRequestLaunchCategoryGroup request, CancellationToken cancellationToken)
        {
            var query = _repository.QueryAll().Where(g => !g.IsDeleted);

            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                query = query.Where(g => g.Name.Contains(request.Search));
            }

            var totalItems = query.Count();

            var items = query
                .OrderBy(g => g.Name)
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(g => new LaunchCategoryGroupResult
                {
                    Id = g.Id,
                    Name = g.Name
                })
                .ToList();

            return new PagedResultLaunchCategoryGroup
            {
                Page = request.Page,
                PageSize = request.PageSize,
                TotalItems = totalItems,
                Items = items
            };
        }
    }
}
