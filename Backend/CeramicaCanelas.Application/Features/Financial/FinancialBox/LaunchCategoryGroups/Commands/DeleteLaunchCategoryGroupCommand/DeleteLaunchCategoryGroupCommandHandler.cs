using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Domain.Exception;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.LaunchCategoryGroups.Commands.DeleteLaunchCategoryGroupCommand
{
    public class DeleteLaunchCategoryGroupCommandHandler : IRequestHandler<DeleteLaunchCategoryGroupCommand, Unit>
    {
        private readonly ILaunchCategoryGroupRepository _repository;

        public DeleteLaunchCategoryGroupCommandHandler(ILaunchCategoryGroupRepository repository)
        {
            _repository = repository;
        }

        public async Task<Unit> Handle(DeleteLaunchCategoryGroupCommand request, CancellationToken cancellationToken)
        {
            var validator = new DeleteLaunchCategoryGroupCommandValidator();
            var validation = await validator.ValidateAsync(request, cancellationToken);
            if (!validation.IsValid)
                throw new BadRequestException(validation);

            var entity = await _repository.GetByIdAsync(request.Id);
            if (entity == null)
                throw new BadRequestException("Categoria geral não encontrada.");

            entity.IsDeleted = true;
            entity.ModifiedOn = DateTime.UtcNow;

            await _repository.Update(entity);
            return Unit.Value;
        }
    }
}
