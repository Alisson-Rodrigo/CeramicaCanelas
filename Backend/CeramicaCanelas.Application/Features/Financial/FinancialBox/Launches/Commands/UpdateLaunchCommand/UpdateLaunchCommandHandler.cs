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
        private readonly IProofRepository _proofRepository;

        // 🔹 Caminho base na VPS para comprovantes
        private const string PastaBaseVps = "/var/www/ceramicacanelas/financial/launch/images";

        // 🔹 URL pública para os arquivos de comprovantes acessíveis via navegador
        private const string UrlBase = "https://api.ceramicacanelas.shop/financial/launch/images/";

        public UpdateLaunchCommandHandler(
            ILogged logged,
            ILaunchRepository launchRepository,
            ILaunchCategoryRepository launchCategoryRepository,
            ICustomerRepository customerRepository,
            IProofRepository proofRepository)
        {
            _logged = logged;
            _launchRepository = launchRepository;
            _launchCategoryRepository = launchCategoryRepository;
            _customerRepository = customerRepository;
            _proofRepository = proofRepository;
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

            // 📂 Caminho de upload na VPS
            var uploadPath = Path.Combine(PastaBaseVps);
            Directory.CreateDirectory(uploadPath); // Garante que existe

            // ======================================================
            // 🗑️ REMOVER COMPROVANTES ANTIGOS (via IProofRepository)
            // ======================================================
            if (request.ProofsToDelete != null && request.ProofsToDelete.Any())
            {
                foreach (var proofId in request.ProofsToDelete)
                {
                    var proof = await _proofRepository.GetByIdAsync(proofId);
                    if (proof != null)
                    {
                        // Apagar arquivo físico
                        var filePath = Path.Combine(PastaBaseVps, Path.GetFileName(proof.FileUrl));

                        if (File.Exists(filePath))
                            File.Delete(filePath);

                        // Remover do banco
                        await _proofRepository.Delete(proof);
                    }
                }
            }

            // ======================================================
            // 🆕 ADICIONAR NOVOS COMPROVANTES (via IProofRepository)
            // ======================================================
            if (request.ImageProofs != null && request.ImageProofs.Any())
            {
                foreach (var file in request.ImageProofs)
                {
                    var uniqueName = $"{Guid.NewGuid()}_{file.FileName}";
                    var filePath = Path.Combine(uploadPath, uniqueName);

                    using (var stream = new FileStream(filePath, FileMode.Create))
                        await file.CopyToAsync(stream, cancellationToken);

                    var proof = new ProofImage
                    {
                        FileUrl = $"{UrlBase}{uniqueName}",
                        OriginalFileName = file.FileName,
                        ContentType = file.ContentType,
                        FileSize = file.Length,
                        LaunchId = launchToUpdate.Id,
                        CreatedOn = DateTime.UtcNow,
                        ModifiedOn = DateTime.UtcNow
                    };

                    await _proofRepository.CreateAsync(proof);
                }
            }

            // ======================================================
            // 💾 SALVAR ALTERAÇÕES NO LANÇAMENTO
            // ======================================================
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
