using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Domain.Entities.Almoxarifado;
using CeramicaCanelas.Domain.Entities.Sales;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Persistence.Repositories
{
    public class SalesPaymentsRepository(DefaultContext context) : BaseRepository<SalePayment>(context), ISalesPaymentsRepository
    {

        public async Task<decimal> SumBySaleIdAsync(Guid saleId, CancellationToken ct)
        {
            var query = context.SalePayments
                .Where(p => p.SaleId == saleId)
                .Select(p => p.Amount);

            // Se não houver pagamentos, retorna 0 manualmente
            if (!await query.AnyAsync(ct))
                return 0;

            return await query.SumAsync(ct);
        }


    }
}
