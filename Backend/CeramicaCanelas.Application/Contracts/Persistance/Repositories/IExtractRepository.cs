using CeramicaCanelas.Domain.Entities.Financial;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Contracts.Persistance.Repositories
{
    public interface IExtractRepository : IBaseRepository<Extract>
    {
        /// <summary>
        /// Obtém um extrato por ID.
        /// </summary>
        Task<Extract?> GetByIdAsync(Guid id);

        /// <summary>
        /// Lista todos os extratos.
        /// </summary>
        Task<List<Extract>> GetAllAsync();

        /// <summary>
        /// Lista extratos filtrados por data.
        /// </summary>
        Task<List<Extract>> GetByDateAsync(DateOnly date);

        IQueryable<Extract> QueryAll();

    }
}
