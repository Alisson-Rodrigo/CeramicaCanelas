using CeramicaCanelas.Application.Features.Sales.Commands.CreatedSalesCommand;
using CeramicaCanelas.Application.Features.Sales.Commands.DeleteSalesCommand;
using CeramicaCanelas.Application.Features.Sales.Commands.UpdateSalesCommand;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using NSwag.Annotations;

namespace CeramicaCanelas.WebApi.Controllers
{
    [Route("api/financial/sales")]
    [OpenApiTags("Sales")]
    [ApiController]
    public class SalesController(IMediator mediator) : ControllerBase
    {
        private readonly IMediator _mediator = mediator;

        // CREATE
        [Authorize(Roles = "Financial,Admin")]
        [HttpPost]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> CreateSale([FromBody] CreatedSalesCommand command, CancellationToken cancellationToken)
        {
            await _mediator.Send(command, cancellationToken);
            return NoContent();
        }

        [Authorize(Roles = "Financial,Admin")]
        [HttpPut]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> UpdateSale([FromBody] UpdateSalesCommand command, CancellationToken cancellationToken)
        {
            await _mediator.Send(command, cancellationToken);
            return NoContent();
        }

        [Authorize(Roles = "Financial,Admin")]
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> DeleteSale(Guid id, CancellationToken cancellationToken)
        {
            var command = new DeleteSalesCommand { Id = id };
            await _mediator.Send(command, cancellationToken);
            return NoContent();
        }


    }
}
