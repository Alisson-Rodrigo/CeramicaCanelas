﻿using FluentValidation.Results;
using MediatR;
using Microsoft.AspNetCore.Identity;
using CeramicaCanelas.Application.Contracts.Infrastructure;
using CeramicaCanelas.Domain.Exception;

namespace CeramicaCanelas.Application.Features.User.Commands.CreateUserCommand;

/// <summary>
/// Command handler for the creation of <see cref="Domain.Entities.User"/>
/// </summary>
public class CreateUserCommandHandler(IIdentityAbstractor identityAbstractor) : IRequestHandler<CreateUserCommand, CreateUserResult> {
    private readonly IIdentityAbstractor _identityAbstractor = identityAbstractor;

    public async Task<CreateUserResult> Handle(CreateUserCommand request, CancellationToken cancellationToken) {
        CreateUserCommandValidator validator = new();
        ValidationResult validationResult = await validator.ValidateAsync(request, cancellationToken);

        if(!validationResult.IsValid) {
            throw new BadRequestException(validationResult);
        }

        // Check if the user already exists
        Domain.Entities.User? existingUser = await _identityAbstractor.FindUserByEmailAsync(request.Email);
        if(existingUser != null) {
            throw new BadRequestException($"User with email {request.Email} already exists.");
        }

        Domain.Entities.User newUser = request.AssignTo();
        IdentityResult userCreationResult = await _identityAbstractor.CreateUserAsync(newUser, request.Password);
        if(!userCreationResult.Succeeded) {
            throw new BadRequestException(userCreationResult);
        }

        IdentityResult userRoleResult = await _identityAbstractor.AddToRoleAsync(newUser, request.Role);
        if(!userRoleResult.Succeeded) {
            throw new BadRequestException(userRoleResult);
        }

        return new CreateUserResult(newUser);
    }
}
