using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Persistence.Repositories
{
    public class SalesRepository(DefaultContext context) : BaseRepository<Sale>(context), ISalesRepository
    {
        public Task<bool> ExistsActiveNoteNumberAsync(int noteNumber, CancellationToken ct = default)
        {
            return Context.Sales
                .IgnoreQueryFilters()                // ignora o filtro global
                .AnyAsync(s => s.NoteNumber == noteNumber && s.IsActive, ct);
        }

    }
}
