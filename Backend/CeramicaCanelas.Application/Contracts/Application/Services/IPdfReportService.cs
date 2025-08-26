using CeramicaCanelas.Application.Features.Sales.Queries.GetProductItemsReport.GetProductItemsReportPdfQuery;
using CeramicaCanelas.Application.Services.Reports;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Contracts.Application.Services
{
    public interface IPdfReportService
    {
        byte[] BuildProductItemsReportPdf(
            CompanyProfile company,
            (DateOnly start, DateOnly end) period,
            IEnumerable<ProductItemsRow> rows,
            decimal totalMilheiros,
            decimal totalRevenue,
            string? subtitle = null,
            string? logoPath = null
        );
    }
}
