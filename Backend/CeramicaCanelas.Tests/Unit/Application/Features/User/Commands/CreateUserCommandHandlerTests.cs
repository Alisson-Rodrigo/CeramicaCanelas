﻿using FluentAssertions;
using Moq;
using CeramicaCanelas.Application.Contracts.Infrastructure;
using CeramicaCanelas.Application.Features.User.Commands.CreateUserCommand;
using CeramicaCanelas.Domain.Exception;

namespace CeramicaCanelas.Tests.Unit.Application.Features.User.Commands;

public class CreateUserCommandHandlerTests {
    private readonly Mock<IIdentityAbstractor> _identityAbstractorMock = new();
    private readonly CreateUserCommandHandler _sut;

    public CreateUserCommandHandlerTests() { 
        _sut = new (_identityAbstractorMock.Object);
    }

    [Fact(DisplayName = "Given invalid email should throw a BadRequestException")]
    public void Handle_WhenEmailIsNullOrEmpty_ShouldRaiseABadRequestExcpetion() {
        // Arrange
        string email = string.Empty, password = Guid.NewGuid().ToString();
        CreateUserCommand command = new() {
            Email = email,
            UserName = "user_test",
            Password = password,
            PasswordConfirmation = password,
            Name = "Test User"
        };

        // Act
        Func<Task> action = async () => await _sut.Handle(command, new CancellationToken());

        // Assert
        action.Should().ThrowAsync<BadRequestException>();
    }

    [Fact(DisplayName = "Given passwords not matching should throw a BadRequestException")]
    public void Handle_WhenPasswordDoesntMatchPasswordConfirmation_ShouldRaiseABadRequestException() {
        // Arrange
        string email = "mytestemail@someprovider.com"
            , password = Guid.NewGuid().ToString()
            , passwordConfirmation = Guid.NewGuid().ToString();
        CreateUserCommand command = new() {
            Email = email,
            UserName = "user_test",
            Password = password,
            PasswordConfirmation = passwordConfirmation,
            Name = "Test User"
        };

        // Act
        Func<Task> action = async () => await _sut.Handle(command, new CancellationToken());

        // Assert
        action.Should().ThrowAsync<BadRequestException>();
    }
}
