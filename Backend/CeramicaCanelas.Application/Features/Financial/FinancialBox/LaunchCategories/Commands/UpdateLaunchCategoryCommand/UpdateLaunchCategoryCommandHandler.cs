using CeramicaCanelas.Application.Contracts.Application.Services;
using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Domain.Exception;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.LaunchCategories.Commands.UpdateLaunchCategoryCommand
{
    public class UpdateLaunchCategoryCommandHandler : IRequestHandler<UpdateLaunchCategoryCommand, Unit>
    {
        private readonly ILaunchCategoryRepository _categoryRepository;
        private readonly ILogged _logged;

        public UpdateLaunchCategoryCommandHandler(ILaunchCategoryRepository categoryRepository, ILogged logged)
        {
            _categoryRepository = categoryRepository;
            _logged = logged;
        }

        public async Task<Unit> Handle(UpdateLaunchCategoryCommand request, CancellationToken cancellationToken)
        {
            var user = await _logged.UserLogged();
            if (user == null)
                throw new UnauthorizedAccessException("Usuário não autenticado.");

            await ValidateLaunchCategory(request, cancellationToken);

            var category = await _categoryRepository.GetByIdAsync(request.Id);

            if (category == null || category.IsDeleted)
                throw new BadRequestException("Categoria de lançamento não encontrada.");

            category.Name = request.Name;
            category.GroupId = request.GroupId;
            category.ModifiedOn = DateTime.UtcNow;

            await _categoryRepository.Update(category);

            return Unit.Value;
        }

        public async Task ValidateLaunchCategory(UpdateLaunchCategoryCommand request, CancellationToken cancellationToken)
        {
            var validator = new UpdateLaunchCategoryCommandValidator();
            var validationResult = await validator.ValidateAsync(request, cancellationToken);
            if (!validationResult.IsValid)
            {
                throw new BadRequestException(validationResult);
            }
        }
    }
}
