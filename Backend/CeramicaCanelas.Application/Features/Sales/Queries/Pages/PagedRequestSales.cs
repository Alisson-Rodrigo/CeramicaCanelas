using CeramicaCanelas.Domain.Enums.Financial;
using CeramicaCanelas.Domain.Enums.Sales;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Sales.Queries.Pages
{
    public class PagedRequestSales : IRequest<PagedResultSales>
    {
        public int Page { get; set; } = 1;        // página atual
        public int PageSize { get; set; } = 10;   // tamanho da página

        // Filtros
        public string? Search { get; set; }       // procura em: NoteNumber, CustomerName, City, State, Phone
        public DateOnly? StartDate { get; set; }  // >=
        public DateOnly? EndDate { get; set; }    // <=
        public PaymentMethod? PaymentMethod { get; set; }
        public SaleStatus? Status { get; set; }
    }
}
