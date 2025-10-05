using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Persistence.Repositories
{
    public class SalesItemsRepository(DefaultContext context)
        : BaseRepository<SaleItem>(context), ISalesItemsRepository
    {
    }
}
