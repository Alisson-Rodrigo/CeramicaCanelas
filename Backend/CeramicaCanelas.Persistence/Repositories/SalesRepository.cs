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

        public async Task<Sale?> GetByIdAsync(Guid? id)
        {
            return await Context.Sales
                .Include(s => s.Items)               // inclui os itens da venda
                .ThenInclude(i => i.Product)         // inclui o produto de cada item
                .FirstOrDefaultAsync(s => s.Id == id);
        }

        public IQueryable<Sale> QueryAllWithIncludes(bool includeInactive = false)
        {
            var q = Context.Sales
                .Include(s => s.Items)
                .AsNoTracking();

            if (includeInactive)
                q = q.IgnoreQueryFilters();

            return q;
        }


        public async Task DeactivateAsync(Guid id, CancellationToken ct = default)
        {
            // Ignora o filtro global para conseguir achar registros já inativos também
            var sale = await Context.Sales
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(s => s.Id == id, ct);

            if (sale is null) return;          // ou lance uma exceção, se preferir
            if (!sale.IsActive) return;        // já está inativa

            sale.IsActive = false;
            sale.ModifiedOn = DateTime.UtcNow;

            await Context.SaveChangesAsync(ct);
        }

    }
}
