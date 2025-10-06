using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Domain.Enums.Sales
{
    public enum SaleStatus
    {
        Pending = 0,        // aguardando pagamento
        PartiallyPaid = 1,  // pago em parte
        Confirmed = 2,      // totalmente pago
        Cancelled = 3,    // cancelado
        Donation = 4        // doação

    }
}
