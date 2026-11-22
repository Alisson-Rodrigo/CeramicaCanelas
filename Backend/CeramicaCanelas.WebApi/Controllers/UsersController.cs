using CeramicaCanelas.Application.Features.Almoxarifado.Product.Queries.Pages;
using CeramicaCanelas.Application.Features.User.Commands.CreateUserCommand;
using CeramicaCanelas.Application.Features.User.Commands.DeleteUserCommand;
using CeramicaCanelas.Application.Features.User.Queries.Pages;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.Extensions;
using Microsoft.AspNetCore.Mvc;
using NSwag.Annotations;

namespace CeramicaCanelas.WebApi.Controllers;

[Route("api/user")]
[OpenApiTags("Users")]
public class UsersController(IMediator mediator) : Controller {
    private readonly IMediator _mediator = mediator;

    [Authorize(Roles = "Admin")]
    [HttpPost]
    [ProducesResponseType(typeof(CreateUserResult), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(CreateUserResult), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateUser(CreateUserCommand request) {
        CreateUserResult response = await _mediator.Send(request);
        return Created(HttpContext.Request.GetDisplayUrl(), response);
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete]
    [Route("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeleteUser([FromRoute]string id) {
        var command = new DeleteUserCommand{Id = id};
        await _mediator.Send(command);
        return NoContent();
    }

    [Authorize(Roles = "Admin")]
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetUsers([FromQuery] GetPagedUsersQuery request) {
        var response = await _mediator.Send(request);
        return Ok(response);
    }
}
