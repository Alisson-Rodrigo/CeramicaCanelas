using CeramicaCanelas.Application.Features.Auth.Commands.LoginCommand;
using CeramicaCanelas.Application.Features.Auth.Commands.ResetPasswordCommand;
using CeramicaCanelas.Application.Features.Auth.Commands.UpdatePasswordCommand;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using NSwag.Annotations;

namespace CeramicaCanelas.WebApi.Controllers;

[Route("api/auth")]
[OpenApiTags("Auth")]
public class AuthController(IMediator mediator) : Controller {
    private readonly IMediator _mediator = mediator;

    [HttpPost]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> LoginUser(LoginCommand request)
    {
        LoginResponse response = await _mediator.Send(request);
        return Ok(response);
    }

    [HttpPost("forgot-password")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdatePassword(UpdatePasswordCommand request)
    {
        await _mediator.Send(request);
        return Ok();
    }

    [HttpPost("validation-reset")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ValidateRecovery([FromBody] ResetPasswordCommand resetRequest)
    {
        await _mediator.Send(resetRequest);
        return Ok();
    }

}
