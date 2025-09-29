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
    public class LaunchCategoryRepository(DefaultContext context) : BaseRepository<LaunchCategory>(context), ILaunchCategoryRepository
    {
        /// <summary>
        /// Gets all customers from the database
        /// </summary>
        /// <returns>
        /// A list of <see cref="Customer"/> entities
        /// </returns>
        public async Task<List<LaunchCategory>> GetAllAsync()
        {
            return await Context.LaunchCategories
                .Where(c => !c.IsDeleted)
                .ToListAsync();
        }
        /// <summary>
        /// Gets a customer by its ID
        /// </summary>
        /// <param name="id">
        /// The ID of the customer to retrieve
        /// </param>
        /// <returns>
        /// The <see cref="Customer"/> entity with the specified ID, or null if not found
        /// </returns>
        public async Task<LaunchCategory?> GetByIdAsync(Guid id)
        {
            return await Context.LaunchCategories.FindAsync(id);
        }

        public IQueryable<LaunchCategory> QueryAllWithIncludes()
        {
            return Context.LaunchCategories
                .Include(c => c.Group)
                .AsQueryable();
        }
    }
}
