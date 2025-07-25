﻿using CeramicaCanelas.Application.Contracts.Application.Services;
using CeramicaCanelas.Application.Contracts.Infrastructure;
using CeramicaCanelas.Domain.Exception;
using MediatR;

namespace CeramicaCanelas.Application.Features.Auth.Commands.LoginCommand;

public class LoginCommandHandler(IIdentityAbstractor identityAbstractor, ITokenService tokenService) : IRequestHandler<LoginCommand, LoginResponse>
{
    private readonly IIdentityAbstractor _identityAbstractor = identityAbstractor;
    private readonly ITokenService _tokenService = tokenService;


    public async Task<LoginResponse> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var user = await _identityAbstractor.FindByNameAsync(request.Username);
        if (user == null)
            throw new BadRequestException("Usuário ou senha inválidos");

        var result = await _identityAbstractor.CheckPasswordSignInAsync(user, request.Password);
        if (!result.Succeeded)
            throw new BadRequestException("Usuário ou senha inválidos");

        var roles = await _identityAbstractor.GetRolesAsync(user);
        var token = _tokenService.GenerateJwtToken(user, roles);

        return new LoginResponse
        {
            AccessToken = token,
            Roles = roles,
            IssuedAt = DateTime.UtcNow,
            ExpirationDate = DateTime.UtcNow.AddHours(2)
        };
    }


}
