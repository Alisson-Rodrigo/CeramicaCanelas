using CeramicaCanelas.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Contracts.Persistance.Repositories
{
    public interface ISalesRepository : IBaseRepository<Sale>
    {
        Task<bool> ExistsActiveNoteNumberAsync(int noteNumber, CancellationToken ct = default);

        Task<Sale?> GetByIdAsync(Guid? id);
        IQueryable<Sale> QueryAllWithIncludes(bool includeInactive = false);

        Task DeactivateAsync(Guid id, CancellationToken ct = default);

    }
}
