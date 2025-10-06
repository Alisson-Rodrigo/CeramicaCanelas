using CeramicaCanelas.Application.Contracts.Application.Services;
using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Domain.Entities.Financial;
using CeramicaCanelas.Domain.Enums.Financial;
using CeramicaCanelas.Domain.Exception;
using MediatR;
using System.Runtime.Intrinsics.Arm;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.Launches.Commands.CreatedLaunchCommand
{
    public class CreatedLaunchCommandHandler : IRequestHandler<CreatedLaunchCommand, Unit>
    {
        private readonly ILogged _logged;
        private readonly ILaunchRepository _launchRepository;
        private readonly ICustomerRepository _customerRepository;
        private readonly ILaunchCategoryRepository _launchCategoryRepository;

        // 👇 Defina os caminhos para salvar os comprovantes dos lançamentos
        private const string PastaBaseVps = @"C:\Users\PuroLight\source\repos\Alisson-Rodrigo\CeramicaCanelas\Backend\CeramicaCanelas.WebApi\wwwroot\financial\launch\proof";
        private const string UrlBase = "http://localhost:5087/financial/launch/proof/";

        public CreatedLaunchCommandHandler(ILogged logged, ILaunchRepository launchRepository, ICustomerRepository customerRepository, ILaunchCategoryRepository launchCategoryRepository)
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

            await ValidateLaucnh(request, cancellationToken);

            var launch = request.AssignToLaunch();

            if (launch == null)
            {
                throw new BadRequestException("Erro ao criar o lançamento financeiro.");
            }

            // 👇 INÍCIO DA LÓGICA PARA SALVAR OS COMPROVANTES 👇

            if (request.ImageProofs != null && request.ImageProofs.Any())
            {
                // Inicializa a lista de comprovantes no objeto de lançamento
                launch.ImageProofs = new List<ProofImage>();

                // Garante que o diretório no servidor exista
                Directory.CreateDirectory(PastaBaseVps);

                foreach (var file in request.ImageProofs)
                {
                    // 1. Cria um nome de arquivo único
                    var nomeArquivo = $"{Guid.NewGuid()}_{file.FileName}";
                    var caminhoAbsoluto = Path.Combine(PastaBaseVps, nomeArquivo);

                    // 2. Salva o arquivo fisicamente no disco do servidor
                    using (var stream = new FileStream(caminhoAbsoluto, FileMode.Create))
                    {
                        await file.CopyToAsync(stream, cancellationToken);
                    }

                    // 3. Monta a URL pública para acessar o arquivo
                    var fileUrl = $"{UrlBase}{nomeArquivo}";

                    // 4. Cria a entidade ProofImage com os dados
                    var proof = new ProofImage
                    {
                        FileUrl = fileUrl,
                        OriginalFileName = file.FileName,
                        ContentType = file.ContentType,
                        FileSize = file.Length,
                        CreatedOn = DateTime.UtcNow,
                        ModifiedOn = DateTime.UtcNow
                    };

                    // 5. Adiciona o comprovante à lista do lançamento
                    launch.ImageProofs.Add(proof);
                }
            }

            // 👆 FIM DA LÓGICA PARA SALVAR OS COMPROVANTES 👆

            launch.OperatorName = user.UserName!;

            // Ao chamar CreateAsync, o Entity Framework salvará o Lançamento
            // e todos os ProofImages associados a ele de uma só vez.
            await _launchRepository.CreateAsync(launch, cancellationToken);

            return Unit.Value;
        }


        private async Task ValidateLaucnh(CreatedLaunchCommand request, CancellationToken cancellationToken)
        {
            var validator = new CreatedLaunchCommandValidator();

            var validatorResponse = await validator.ValidateAsync(request, cancellationToken);

            if (!validatorResponse.IsValid)
            {
                throw new BadRequestException(validatorResponse);
            }

            if (request.CategoryId != null)
            {
                var category = await _launchCategoryRepository.GetByIdAsync(request.CategoryId.Value);
                if (category == null)
                {
                    throw new BadRequestException("Categoria de lançamento não encontrada.");
                }
            }

            if (request.CustomerId != null)
            {
                var customer = await _customerRepository.GetByIdAsync(request.CustomerId.Value);
                if (customer == null)
                {
                    throw new BadRequestException("Cliente não encontrado.");
                }
            }
        }
    }
}
