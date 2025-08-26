using CeramicaCanelas.Application.Features.Almoxarifado.Product.Queries.Pages;
using CeramicaCanelas.Domain.Enums.Financial;
using CeramicaCanelas.Domain.Enums.Sales;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Sales.Queries.GetProductItemsReport.PagedRequestProductItems
{
    public class PagedRequestProductItems : IRequest<PagedResult<ProductItemsRowDto>>
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;

        public DateOnly StartDate { get; set; } = default!;
        public DateOnly EndDate { get; set; } = default!;

        public SaleStatus? Status { get; set; }
        public PaymentMethod? PaymentMethod { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public ProductType? Product { get; set; }
    }
}
