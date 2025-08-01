﻿using CeramicaCanelas.Application.Features.Financial.FinancialBox.Launches.Commands.CreatedLaunchCommand;
using CeramicaCanelas.Application.Features.Financial.FinancialBox.Launches.Commands.DeleteLaunchCommand;
using CeramicaCanelas.Application.Features.Financial.FinancialBox.Launches.Commands.UpdateLaunchCommand;
using CeramicaCanelas.Application.Features.Financial.FinancialBox.Launches.Queries.GetPagedLaunchesQueries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using NSwag.Annotations;

namespace CeramicaCanelas.WebApi.Controllers
{
    [Route("api/launch")]
    [OpenApiTags("Launch")]

    [ApiController]
    public class LaunchController(IMediator mediator) : ControllerBase
    {
        private readonly IMediator _mediator = mediator;

        [Authorize(Roles = "Financial,Admin")]
        [HttpPost]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> CreatedLaunch([FromForm] CreatedLaunchCommand request)
        {
            await _mediator.Send(request);
            return NoContent();
        }

        [Authorize(Roles = "Financial,Admin")]
        [HttpPut]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> UpdateLaunch([FromForm] UpdateLaunchCommand request)
        {
            await _mediator.Send(request);
            return NoContent();
        }

        [Authorize(Roles = "Financial,Admin")]
        [HttpDelete("{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)] // Adicionado para indicar que o item pode não ser encontrado
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> DeleteLaunch(Guid id)
        {
            var command = new DeleteLaunchCommand { Id = id };
            await _mediator.Send(command);
            return NoContent();
        }

        [Authorize(Roles = "Financial,Admin")]
        [HttpGet("paged")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> GetPagedLaunches([FromQuery] PagedRequestLaunch query)
        {
            var result = await _mediator.Send(query);
            return Ok(result);

        }
    }
}
