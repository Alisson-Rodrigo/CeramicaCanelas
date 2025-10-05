using CeramicaCanelas.Application.Features.Sales.Commands.CreatedSalesCommand;
using CeramicaCanelas.Application.Features.Sales.Commands.DeleteSalesCommand;
using CeramicaCanelas.Application.Features.Sales.Commands.PaySalesCommand;
using CeramicaCanelas.Application.Features.Sales.Commands.UpdateSalesCommand;
using CeramicaCanelas.Application.Features.Sales.Queries.GetProductItemsReport.GetProductItemsReportPdfQuery;
using CeramicaCanelas.Application.Features.Sales.Queries.GetProductItemsReport.PagedRequestProductItems;
using CeramicaCanelas.Application.Features.Sales.Queries.GetSalesDashboardIndicatorsQueryHandler;
using CeramicaCanelas.Application.Features.Sales.Queries.Pages;
using CeramicaCanelas.Application.Services.Reports;
using CeramicaCanelas.Domain.Enums.Sales;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using NSwag.Annotations;

namespace CeramicaCanelas.WebApi.Controllers
{
    [Route("api/sales")]
    [OpenApiTags("Sales")]
    [ApiController]
    public class SalesController(IMediator mediator) : ControllerBase
    {
        private readonly IMediator _mediator = mediator;

        // CREATE
        [Authorize(Roles = "Sales,Financial,Admin")]
        [HttpPost]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> CreateSale([FromBody] CreatedSalesCommand command, CancellationToken cancellationToken)
        {
            await _mediator.Send(command, cancellationToken);
            return NoContent();
        }

        [Authorize(Roles = "Sales,Financial,Admin")]
        [HttpPut]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> UpdateSale([FromForm] UpdateSalesCommand command, CancellationToken cancellationToken)
        {
            await _mediator.Send(command, cancellationToken);
            return NoContent();
        }

        [Authorize(Roles = "Sales,Financial,Admin")]
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> DeleteSale(Guid id, CancellationToken cancellationToken)
        {
            var command = new DeleteSalesCommand { Id = id };
            await _mediator.Send(command, cancellationToken);
            return NoContent();
        }

        [Authorize(Roles = "Sales,Financial,Admin")]
        [HttpPost("pay-pending")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> Pay([FromForm] PaySalesCommand request, CancellationToken cancellationToken)
        {
            await _mediator.Send(request, cancellationToken);
            return NoContent();
        }

        [Authorize(Roles = "Sales,Financial,Admin")]
        [HttpGet("paged")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> GetPagedSales([FromQuery] PagedRequestSales query, CancellationToken cancellationToken)
        {
            var result = await _mediator.Send(query, cancellationToken);
            return Ok(result);
        }

        [Authorize(Roles = "Sales,Financial,Admin")]
        [HttpGet("pending/paged")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> GetPagedPendingSales([FromQuery] PagedRequestSales query, CancellationToken ct)
        {
            query.Status = SaleStatus.Pending; // força no servidor
            var result = await _mediator.Send(query, ct);
            return Ok(result);
        }

        [Authorize(Roles = "Sales,Financial,Admin")]
        [HttpGet("items/pdf")]
        [Produces("application/pdf")]
        public async Task<IActionResult> GetProductItemsPdf(
            [FromQuery] GetProductItemsReportPdfQuery query, CancellationToken ct)
        {
            var bytes = await _mediator.Send(query, ct);
            var fileName = $"itens_produtos_{query.StartDate:yyyyMMdd}_{query.EndDate:yyyyMMdd}.pdf";
            return File(bytes, "application/pdf", fileName);
        }

        [Authorize(Roles = "Sales,Financial,Admin")]
        [HttpGet("items/paged")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetProductItemsPaged([FromQuery] PagedRequestProductItems query, CancellationToken ct)
        {
            var result = await _mediator.Send(query, ct);
            return Ok(result);
        }

        [Authorize(Roles = "Sales,Financial,Admin")]
        [HttpGet("dashboard")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetDashboardIndicators(CancellationToken cancellationToken)
        {
            var query = new GetSalesDashboardIndicatorsQuery();
            var result = await _mediator.Send(query, cancellationToken);
            return Ok(result);
        }





    }
}
