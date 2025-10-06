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
    public class LaunchRepository(DefaultContext context) : BaseRepository<Launch>(context), ILaunchRepository
    {
        public async Task<Launch?> GetByIdAsync(Guid id)
        {
            return await Context.Launches.FindAsync(id);
        }

        public async Task<List<Launch>> GetAllAsync()
        {
            return await Context.Launches
                .Include(l => l.Category)
                .Include(l => l.Customer)
                .AsNoTracking() // Melhora performance para leitura
                .ToListAsync();
        }

        public IQueryable<Launch> QueryAllWithIncludes()
        {
            return Context.Launches
                .Include(l => l.Category)
                .Include(l => l.Customer)
                .Include(l => l.ImageProofs)
                .AsNoTracking() // Importante para queries de leitura
                .AsQueryable();
        }

        public IQueryable<Launch> QueryAll()
        {
            return Context.Launches
                .AsNoTracking()
                .AsQueryable();
        }

    }
}