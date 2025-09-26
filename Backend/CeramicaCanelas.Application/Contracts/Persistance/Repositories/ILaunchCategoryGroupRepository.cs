using CeramicaCanelas.Domain.Entities.Financial;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Contracts.Persistance.Repositories
{
    public interface ILaunchCategoryGroupRepository : IBaseRepository<LaunchCategoryGroup>
    {
        Task<LaunchCategoryGroup?> GetByIdAsync(Guid id);
        Task<List<LaunchCategoryGroup>> GetAllAsync();
        IQueryable<LaunchCategoryGroup> QueryAll();
    }
}
