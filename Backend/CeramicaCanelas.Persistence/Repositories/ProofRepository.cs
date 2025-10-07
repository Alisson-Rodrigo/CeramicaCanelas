
using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Domain.Entities.Almoxarifado;
using CeramicaCanelas.Domain.Entities.Financial;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Persistence.Repositories
{
    public class ProofRepository(DefaultContext context) : BaseRepository<ProofImage>(context), IProofRepository
    {
        public async Task<ProofImage?> GetByIdAsync(Guid id)
        {
            return await context.ProofImages
                .FirstOrDefaultAsync(p => p.Id == id);
        }
    }
}
