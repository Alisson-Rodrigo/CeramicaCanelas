using CeramicaCanelas.Domain.Entities.Almoxarifado;
using CeramicaCanelas.Domain.Entities.Financial;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Contracts.Persistance.Repositories
{
    public interface IProofRepository : IBaseRepository<ProofImage>
    {
        public Task<ProofImage?> GetByIdAsync(Guid id);

    }
}
