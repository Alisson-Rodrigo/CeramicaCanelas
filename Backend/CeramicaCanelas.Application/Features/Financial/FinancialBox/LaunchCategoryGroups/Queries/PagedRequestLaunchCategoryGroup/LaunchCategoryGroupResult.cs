using CeramicaCanelas.Domain.Entities.Financial;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.LaunchCategoryGroups.Queries.PagedRequestLaunchCategoryGroup
{
    public class LaunchCategoryGroupResult
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public ICollection<LaunchCategory> Categories { get; set; } = new List<LaunchCategory>();

    }

    public class PagedResultLaunchCategoryGroup
    {
        public int TotalItems { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => (int)Math.Ceiling((double)TotalItems / PageSize);
        public List<LaunchCategoryGroupResult> Items { get; set; } = new();
    }
}
