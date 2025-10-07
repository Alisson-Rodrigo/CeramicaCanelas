using CeramicaCanelas.Application.Contracts.Application.Services;
using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Domain.Entities.Financial;
using CeramicaCanelas.Domain.Exception;
using MediatR;
using Microsoft.Extensions.Hosting;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.Launches.Commands.CreatedLaunchCommand
{
    public class CreatedLaunchCommandHandler : IRequestHandler<CreatedLaunchCommand, Unit>
    {
        private readonly ILogged _logged;
        private readonly ILaunchRepository _launchRepository;
        private readonly ICustomerRepository _customerRepository;
        private readonly ILaunchCategoryRepository _launchCategoryRepository;

        // 🔹 Novo caminho base para a VPS no diretório 'financial/launch/images'
        private const string PastaBaseVps = "/var/www/ceramicacanelas/financial/launch/images";

        // 🔹 URL pública para os arquivos acessíveis via navegador
        private const string UrlBase = "https://api.ceramicacanelas.shop/financial/launch/images/";

        public CreatedLaunchCommandHandler(
            ILogged logged,
            ILaunchRepository launchRepository,
            ICustomerRepository customerRepository,
            ILaunchCategoryRepository launchCategoryRepository)
        {
            _logged = logged;
            _launchRepository = launchRepository;
            _customerRepository = customerRepository;
            _launchCategoryRepository = launchCategoryRepository;
        }

        public async Task<Unit> Handle(CreatedLaunchCommand request, CancellationToken cancellationToken)
        {
            var user = await _logged.UserLogged()
                ?? throw new UnauthorizedAccessException("Usuário não autenticado.");

            await ValidateLaunch(request, cancellationToken);

            var launch = request.AssignToLaunch()
                ?? throw new BadRequestException("Erro ao criar o lançamento financeiro.");

            // 📁 Alteração do caminho dinâmico, agora no diretório 'financial/launch/images'
            var uploadPath = Path.Combine(PastaBaseVps);
            Directory.CreateDirectory(uploadPath); // Garante que existe

            // 📸 Upload dos comprovantes
            if (request.ImageProofs != null && request.ImageProofs.Any())
            {
                launch.ImageProofs = new List<ProofImage>();

                foreach (var file in request.ImageProofs)
                {
                    // Gera nome único e mantém a extensão original
                    var fileNameWithoutExt = Path.GetFileNameWithoutExtension(file.FileName);
                    var extension = Path.GetExtension(file.FileName);
                    var uniqueName = $"{Guid.NewGuid()}_{fileNameWithoutExt}{extension}";
                    var filePath = Path.Combine(uploadPath, uniqueName);

                    // Salva o arquivo
                    using (var stream = new FileStream(filePath, FileMode.Create))
                    {
                        await file.CopyToAsync(stream, cancellationToken);
                    }

                    // Gera URL pública (agora para a pasta de 'financial/launch/images')
                    var fileUrl = $"{UrlBase}{uniqueName}";

                    // Adiciona o comprovante
                    launch.ImageProofs.Add(new ProofImage
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

            launch.OperatorName = user.UserName!;
            await _launchRepository.CreateAsync(launch, cancellationToken);

            return Unit.Value;
        }

        private async Task ValidateLaunch(CreatedLaunchCommand request, CancellationToken cancellationToken)
        {
            var validator = new CreatedLaunchCommandValidator();
            var validation = await validator.ValidateAsync(request, cancellationToken);
            if (!validation.IsValid)
                throw new BadRequestException(validation);

            if (request.CategoryId != null)
            {
                var category = await _launchCategoryRepository.GetByIdAsync(request.CategoryId.Value);
                if (category == null)
                    throw new BadRequestException("Categoria de lançamento não encontrada.");
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
