using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Domain.Enums.Sales
{
    public enum SaleStatus
    {
        [Description("Pendente")]
        Pending = 0,        // aguardando pagamento
        [Description("Pago parcialmente")]
        PartiallyPaid = 1,  // pago em parte
        [Description("Confirmado")]
        Confirmed = 2,      // totalmente pago
        [Description("Cancelado")] 
        Cancelled = 3,    // cancelado
        [Description("Doação")]
        Donation = 4        // doação

    }
}