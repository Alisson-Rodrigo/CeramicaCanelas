using CeramicaCanelas.Application.Features.Financial.FinancialBox.LaunchCategoryGroups.Commands.CreateLaunchCategoryGroupCommand;
using CeramicaCanelas.Application.Features.Financial.FinancialBox.LaunchCategoryGroups.Commands.DeleteLaunchCategoryGroupCommand;
using CeramicaCanelas.Application.Features.Financial.FinancialBox.LaunchCategoryGroups.Commands.UpdateLaunchCategoryGroupCommand;
using CeramicaCanelas.Application.Features.Financial.FinancialBox.LaunchCategoryGroups.Queries.PagedRequestLaunchCategoryGroup;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using NSwag.Annotations;

namespace CeramicaCanelas.WebApi.Controllers
{
    [Route("api/financial/launch-category-groups")]
    [OpenApiTags("Launch-category-groups")]
    [ApiController]
    public class LaunchCategoryGroupsController(IMediator mediator) : ControllerBase
    {
        private readonly IMediator _mediator = mediator;

        [Authorize(Roles = "Financial,Admin")]
        [HttpPost]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> CreateLaunchCategoryGroup([FromForm] CreateLaunchCategoryGroupCommand command)
        {
            await _mediator.Send(command);
            return NoContent();
        }

        [Authorize(Roles = "Financial,Admin")]
        [HttpPut]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> UpdateLaunchCategoryGroup([FromForm] UpdateLaunchCategoryGroupCommand command)
        {
            await _mediator.Send(command);
            return NoContent();
        }

        [Authorize(Roles = "Financial,Admin")]
        [HttpDelete]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> DeleteLaunchCategoryGroup(DeleteLaunchCategoryGroupCommand command)
        {
            await _mediator.Send(command);
            return NoContent();
        }

        [Authorize(Roles = "Financial,Admin")]
        [HttpGet("paged")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> GetPagedLaunchCategoryGroups([FromQuery] PagedRequestLaunchCategoryGroup query)
        {
            var result = await _mediator.Send(query);
            return Ok(result);
        }
    }
}
