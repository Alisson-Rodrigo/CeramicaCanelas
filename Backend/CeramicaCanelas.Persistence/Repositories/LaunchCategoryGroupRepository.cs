using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Domain.Entities.Financial;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Persistence.Repositories
{
    public class LaunchCategoryGroupRepository : BaseRepository<LaunchCategoryGroup>, ILaunchCategoryGroupRepository
    {
        public LaunchCategoryGroupRepository(DefaultContext context) : base(context)
        {
        }

        public async Task<LaunchCategoryGroup?> GetByIdAsync(Guid id)
        {
            return await Context.LaunchCategoryGroups
                .Include(g => g.Categories) // opcional: carrega subcategorias junto
                .FirstOrDefaultAsync(g => g.Id == id && !g.IsDeleted);
        }

        public async Task<List<LaunchCategoryGroup>> GetAllAsync()
        {
            return await Context.LaunchCategoryGroups
                .Where(g => !g.IsDeleted)
                .OrderBy(g => g.Name)
                .ToListAsync();
        }

        public IQueryable<LaunchCategoryGroup> QueryAll()
        {
            return Context.LaunchCategoryGroups
                .Include(g => g.Categories) // opcional, se quiser sempre trazer as subcategorias
                .Where(g => !g.IsDeleted)
                .AsQueryable();
        }
    }
}
