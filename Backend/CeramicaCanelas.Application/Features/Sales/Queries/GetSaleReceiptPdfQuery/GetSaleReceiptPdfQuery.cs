using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Sales.Queries.GetSaleReceiptPdfQuery
{
    public class GetSaleReceiptPdfQuery : IRequest<byte[]>
    {
        public Guid SaleId { get; }

        public GetSaleReceiptPdfQuery(Guid saleId)
        {
            SaleId = saleId;
        }
    }
}
