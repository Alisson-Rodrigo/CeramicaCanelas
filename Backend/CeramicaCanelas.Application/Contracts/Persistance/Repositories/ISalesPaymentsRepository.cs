using CeramicaCanelas.Domain.Entities.Sales;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Contracts.Persistance.Repositories
{
    public interface ISalesPaymentsRepository : IBaseRepository<SalePayment>
    {
        public Task<decimal> SumBySaleIdAsync(Guid saleId, CancellationToken ct);

    }
}
