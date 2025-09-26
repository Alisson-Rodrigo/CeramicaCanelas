using CeramicaCanelas.Application.Features.Financial.FinancialBox.Extracts.Commands.CreateExtractCommand;
using CeramicaCanelas.Application.Features.Financial.FinancialBox.Extracts.Commands.DeleteExtractCommand;
using CeramicaCanelas.Application.Features.Financial.FinancialBox.Extracts.Commands.UpdateExtractCommand;
using CeramicaCanelas.Application.Features.Financial.FinancialBox.Extracts.Queries.GetExtractsReportQuery;
using CeramicaCanelas.Application.Features.Financial.FinancialBox.Extracts.Queries.PagedRequestExtract;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using NSwag.Annotations;

namespace CeramicaCanelas.WebApi.Controllers
{
    [Route("api/extracts")]
    [ApiController]
    [OpenApiTags("extracts")]
    public class ExtractController(IMediator mediator) : ControllerBase
    {
        private readonly IMediator _mediator = mediator;

        /// <summary>
        /// Cria um novo extrato.
        /// </summary>
        [Authorize(Roles = "Financial,Admin")]
        [HttpPost]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> CreateExtract([FromBody] CreateExtractCommand request)
        {
            await _mediator.Send(request);
            return NoContent();
        }

        [Authorize(Roles = "Financial,Admin")]
        [HttpPut]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> UpdateExtract([FromBody] UpdateExtractCommand request)
        {
            await _mediator.Send(request);
            return NoContent();
        }

        [Authorize(Roles = "Financial,Admin")]
        [HttpDelete("{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> DeleteExtract([FromRoute] Guid id)
        {
            var request = new DeleteExtractCommand { Id = id };
            await _mediator.Send(request);
            return NoContent();
        }

        [Authorize(Roles = "Financial,Admin")]
        [HttpGet("paged")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> GetPagedExtracts([FromQuery] PagedRequestExtract request)
        {
            var response = await _mediator.Send(request);
            return Ok(response);
        }


        [Authorize(Roles = "Financial,Admin")]
        [HttpGet("report")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> GetExtractsReport([FromQuery] GetExtractsReportQuery request)
        {
            var response = await _mediator.Send(request);
            return Ok(response);
        }


    }
}
