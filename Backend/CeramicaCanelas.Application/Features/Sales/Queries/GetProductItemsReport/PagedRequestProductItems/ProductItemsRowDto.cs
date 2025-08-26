using CeramicaCanelas.Application.Services.EnumExtensions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Sales.Queries.GetProductItemsReport.PagedRequestProductItems
{
    public class ProductItemsRowDto
    {
        public ProductType Product { get; set; }
        public string ProductName => Product.GetDescription(); // usando extensão

        public decimal Milheiros { get; set; }
        public decimal Units => Milheiros * 1000m;
        public decimal Revenue { get; set; }
        public decimal AvgPrice => Milheiros > 0 ? Revenue / Milheiros : 0;
    }
}
