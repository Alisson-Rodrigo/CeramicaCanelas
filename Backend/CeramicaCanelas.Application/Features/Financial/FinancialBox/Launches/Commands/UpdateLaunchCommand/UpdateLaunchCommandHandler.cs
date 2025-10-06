using CeramicaCanelas.Application.Contracts.Application.Services;
using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Domain.Entities.Financial;
using CeramicaCanelas.Domain.Exception;
using MediatR;
using Microsoft.Extensions.Hosting;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.Launches.Commands.UpdateLaunchCommand
{
    public class UpdateLaunchCommandHandler : IRequestHandler<UpdateLaunchCommand, Unit>
    {
        private readonly ILogged _logged;
        private readonly ILaunchRepository _launchRepository;
        private readonly ILaunchCategoryRepository _launchCategoryRepository;
        private readonly ICustomerRepository _customerRepository;
        private readonly IHostEnvironment _env;

        private readonly string _publicBaseUrl = "https://localhost:5087/financial/launch/proof";

        public UpdateLaunchCommandHandler(
            ILogged logged,
            ILaunchRepository launchRepository,
            ILaunchCategoryRepository launchCategoryRepository,
            ICustomerRepository customerRepository,
            IHostEnvironment env)
        {
            _logged = logged;
            _launchRepository = launchRepository;
            _launchCategoryRepository = launchCategoryRepository;
            _customerRepository = customerRepository;
            _env = env;
        }

        public async Task<Unit> Handle(UpdateLaunchCommand request, CancellationToken cancellationToken)
        {
            var user = await _logged.UserLogged()
                ?? throw new UnauthorizedAccessException("Usuário não autenticado.");

            await ValidateLaunch(request, cancellationToken);

            var launchToUpdate = await _launchRepository.GetByIdAsync(request.Id)
                ?? throw new BadRequestException("Lançamento não encontrado.");

            // Atualiza os campos básicos
            request.MapToLaunch(launchToUpdate);
            launchToUpdate.OperatorName = user.UserName!;

            // 📂 Diretório de upload
            var uploadPath = Path.Combine(_env.ContentRootPath, "wwwroot", "financial", "launch", "proof");
            Directory.CreateDirectory(uploadPath);

            // 🧾 Se houver novos comprovantes enviados
            if (request.ImageProofs != null && request.ImageProofs.Any())
            {
                // 🔸 Se quiser substituir completamente os comprovantes antigos:
                launchToUpdate.ImageProofs?.Clear();
                launchToUpdate.ImageProofs = new List<ProofImage>();

                foreach (var file in request.ImageProofs)
                {
                    var fileNameWithoutExt = Path.GetFileNameWithoutExtension(file.FileName);
                    var extension = Path.GetExtension(file.FileName);
                    var uniqueName = $"{Guid.NewGuid()}_{fileNameWithoutExt}{extension}";
                    var filePath = Path.Combine(uploadPath, uniqueName);

                    using (var stream = new FileStream(filePath, FileMode.Create))
                    {
                        await file.CopyToAsync(stream, cancellationToken);
                    }

                    var fileUrl = $"{_publicBaseUrl}/{uniqueName}";

                    launchToUpdate.ImageProofs.Add(new ProofImage
                    {
                        FileUrl = fileUrl,
                        OriginalFileName = file.FileName,
                        ContentType = file.ContentType,
                        FileSize = file.Length,
                        CreatedOn = DateTime.UtcNow,
                        ModifiedOn = DateTime.UtcNow
                    });
                }
            }

            await _launchRepository.Update(launchToUpdate);
            return Unit.Value;
        }

        private async Task ValidateLaunch(UpdateLaunchCommand request, CancellationToken cancellationToken)
        {
            var validator = new UpdateLaunchCommandValidator();
            var validationResult = await validator.ValidateAsync(request, cancellationToken);
            if (!validationResult.IsValid)
                throw new BadRequestException(validationResult);

            if (request.CategoryId != null)
            {
                var category = await _launchCategoryRepository.GetByIdAsync(request.CategoryId.Value);
                if (category == null)
                    throw new BadRequestException("Categoria não encontrada.");
            }

            if (request.CustomerId != null)
            {
                var customer = await _customerRepository.GetByIdAsync(request.CustomerId.Value);
                if (customer == null)
                    throw new BadRequestException("Cliente não encontrado.");
            }
        }
    }
}
