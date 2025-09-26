using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Domain.Entities.Financial;
using CeramicaCanelas.Domain.Exception;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.LaunchCategoryGroups.Commands.CreateLaunchCategoryGroupCommand
{
    public class CreateLaunchCategoryGroupCommandHandler : IRequestHandler<CreateLaunchCategoryGroupCommand, Unit>
    {
        private readonly ILaunchCategoryGroupRepository _repository;

        public CreateLaunchCategoryGroupCommandHandler(ILaunchCategoryGroupRepository repository)
        {
            _repository = repository;
        }

        public async Task<Unit> Handle(CreateLaunchCategoryGroupCommand request, CancellationToken cancellationToken)
        {
            var validator = new CreateLaunchCategoryGroupCommandValidator();
            var validation = await validator.ValidateAsync(request, cancellationToken);
            if (!validation.IsValid)
                throw new BadRequestException(validation);

            var entity = new LaunchCategoryGroup
            {
                Name = request.Name,
                IsDeleted = false,
                CreatedOn = DateTime.UtcNow,
                ModifiedOn = DateTime.UtcNow
            };

            await _repository.CreateAsync(entity, cancellationToken);
            return Unit.Value;
        }
    }
}
