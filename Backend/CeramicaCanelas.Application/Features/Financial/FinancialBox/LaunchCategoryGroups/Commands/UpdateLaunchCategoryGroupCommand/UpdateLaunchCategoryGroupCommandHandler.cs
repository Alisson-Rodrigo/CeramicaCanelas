using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Domain.Exception;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.LaunchCategoryGroups.Commands.UpdateLaunchCategoryGroupCommand
{
    public class UpdateLaunchCategoryGroupCommandHandler : IRequestHandler<UpdateLaunchCategoryGroupCommand, Unit>
    {
        private readonly ILaunchCategoryGroupRepository _repository;

        public UpdateLaunchCategoryGroupCommandHandler(ILaunchCategoryGroupRepository repository)
        {
            _repository = repository;
        }

        public async Task<Unit> Handle(UpdateLaunchCategoryGroupCommand request, CancellationToken cancellationToken)
        {
            var validator = new UpdateLaunchCategoryGroupCommandValidator();
            var validation = await validator.ValidateAsync(request, cancellationToken);
            if (!validation.IsValid)
                throw new BadRequestException(validation);

            var entity = await _repository.GetByIdAsync(request.Id);
            if (entity == null)
                throw new BadRequestException("Categoria geral não encontrada.");

            entity.Name = request.Name;
            entity.ModifiedOn = DateTime.UtcNow;

            await _repository.Update(entity);
            return Unit.Value;
        }
    }
}
