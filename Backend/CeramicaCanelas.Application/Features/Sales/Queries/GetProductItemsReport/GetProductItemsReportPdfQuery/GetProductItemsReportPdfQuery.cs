using CeramicaCanelas.Domain.Enums.Financial;
using CeramicaCanelas.Domain.Enums.Sales;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Sales.Queries.GetProductItemsReport.GetProductItemsReportPdfQuery
{
    public class GetProductItemsReportPdfQuery : IRequest<byte[]>
    {
        public DateOnly StartDate { get; set; }
        public DateOnly EndDate { get; set; }

        // Filtros opcionais
        public ProductType? Product { get; set; }
        public PaymentMethod? PaymentMethod { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }

        // Por padrão, só vendas confirmadas
        public SaleStatus? Status { get; set; } = null;
    }

    // Linha agregada por produto
    public class ProductItemsRow
    {
        public ProductType Product { get; set; }
        public decimal Milheiros { get; set; }                 // Σ Quantity (milheiros)
        public decimal Unidades => Milheiros * 1000m;          // derivado
        public decimal Revenue { get; set; }                   // Σ (UnitPrice * Milheiros)
        public decimal AvgPrice => Milheiros > 0 ? Math.Round(Revenue / Milheiros, 2) : 0m; // R$/milheiro
    }

    public record AppliedFilter(string Label, string Value);


}
