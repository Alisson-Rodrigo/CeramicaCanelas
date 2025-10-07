using CeramicaCanelas.Application.Contracts.Application.Services;
using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Application.Features.Movimentacoes_ES.Entradas.Command.CreateMovEntradasProductsCommand;
using CeramicaCanelas.Domain.Exception;
using CeramicaCanelas.Persistence.Repositories;
using MediatR;
using Microsoft.VisualBasic;


namespace CeramicaCanelas.Application.Features.Movimentacoes_ES.Entradas.Command.CreateMovEntradasCommand
{
    public class CreateMovEntradasProductsCommandHandler : IRequestHandler<CreateMovEntradasProductCommand, Unit>
    {
        private readonly IMovEntryProductsRepository _movimentacaoESRepository;
        private readonly ISupplierRepository _supplierRepository;
        private readonly IProductRepository _productRepository;
        private readonly ILogged _logged;
        
        public CreateMovEntradasProductsCommandHandler(IMovEntryProductsRepository movimentacaoESRepository, ILogged logged, IProductRepository productRepository, ISupplierRepository supplierRepository)
        {
            _movimentacaoESRepository = movimentacaoESRepository;
            _productRepository = productRepository;
            _supplierRepository = supplierRepository;
            _logged = logged;
        }

        public async Task<Unit> Handle(CreateMovEntradasProductCommand request, CancellationToken cancellationToken)
        {
            var user = await _logged.UserLogged();
            if (user == null)
            {
                throw new UnauthorizedAccessException("Usuário não autenticado.");
            }

            var supplier = await _supplierRepository.GetByIdAsync(request.SupplierId);
            if (supplier == null)
            {
                throw new BadRequestException("Fornecedor não encontrado.");
            }

            var product = await _productRepository.GetProductByIdAsync(request.ProductId);

            if (product == null)
            {
                throw new BadRequestException("Produto não encontrado.");
            }

            await ValidateMovimentacaoES(request, cancellationToken);

            var movimentacaoES = request.AssignToProductsEntry();

            movimentacaoES.NameProduct = product.Name;
            movimentacaoES.NameSupplier = supplier.Name;
            movimentacaoES.NameOperator = user.Name;
            movimentacaoES.UserId = user.Id;
            await _movimentacaoESRepository.CreateAsync(movimentacaoES, cancellationToken);

            //ATUALIZA O ESTOQUE DO PRODUTO
            product.StockCurrent += request.Quantity;
            product.ValueTotal += request.UnitPrice * request.Quantity;
            product.ModifiedOn = DateTime.UtcNow;
            await _productRepository.Update(product);

            return Unit.Value;
        }
        public async Task ValidateMovimentacaoES(CreateMovEntradasProductCommand request, CancellationToken cancellationToken)
        {
            var validator = new CreateMovEntradasProductsCommandValidator();
            var validationResult = await validator.ValidateAsync(request, cancellationToken);
            if (!validationResult.IsValid)
            {
                throw new BadRequestException(validationResult);
            }
        }
    }
}
