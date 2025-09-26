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
    public class ExtractRepository(DefaultContext context)
        : BaseRepository<Extract>(context), IExtractRepository
    {
        /// <summary>
        /// Obtém todos os extratos.
        /// </summary>
        public async Task<List<Extract>> GetAllAsync()
        {
            return await Context.Extracts.ToListAsync();
        }

        /// <summary>
        /// Obtém um extrato pelo ID.
        /// </summary>
        public async Task<Extract?> GetByIdAsync(Guid id)
        {
            return await Context.Extracts.FindAsync(id);
        }

        /// <summary>
        /// Obtém extratos por data.
        /// </summary>
        public async Task<List<Extract>> GetByDateAsync(DateOnly date)
        {
            return await Context.Extracts
                .Where(e => e.Date == date)
                .ToListAsync();
        }

        /// <summary>
        /// Retorna um IQueryable para permitir paginação e filtros no nível de aplicação.
        /// </summary>
        public IQueryable<Extract> QueryAll()
        {
            return Context.Extracts.AsQueryable();
        }

    }
}
