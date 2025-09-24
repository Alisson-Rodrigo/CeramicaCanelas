// Local: CeramicaCanelas.Domain/Entities/Launch.cs
using CeramicaCanelas.Domain.Abstract;
using CeramicaCanelas.Domain.Enums.Financial;
using System;

namespace CeramicaCanelas.Domain.Entities.Financial
{
    /// <summary>
    /// Representa um lançamento financeiro no sistema (uma entrada ou saída de caixa).
    /// Herda propriedades como Id, CreatedOn e ModifiedOn de BaseEntity.
    /// </summary>
    public class Launch : BaseEntity
    {
        /// <summary>
        /// Descrição do lançamento. Ex: "Venda de 1000 tijolos", "Pagamento de conta de luz".
        /// </summary>
        public string Description { get; set; } = string.Empty;

        /// <summary>
        /// O valor monetário da transação.
        /// </summary>
        public decimal? Amount { get; set; }

        /// <summary>
        /// A data em que a transação efetivamente ocorreu.
        /// </summary>
        public DateOnly LaunchDate { get; set; }

        /// <summary>
        /// O tipo do lançamento, definido pelo Enum LaunchType (Income ou Expense).
        /// </summary>
        public LaunchType Type { get; set; }

        /// <summary>
        /// Chave estrangeira (FK) que se conecta com a tabela de Categorias de Lançamento (LaunchCategory).
        /// O '?' indica que um lançamento pode não ter uma categoria.
        /// </summary>
        public Guid? CategoryId { get; set; }

        /// <summary>
        /// Propriedade de navegação para acessar os dados da categoria relacionada.
        /// </summary>
        public LaunchCategory? Category { get; set; }


        /// <summary>
        /// A forma de pagamento utilizada, definida pelo Enum PaymentMethod.
        /// O '?' indica que a forma de pagamento é opcional.
        /// </summary>
        public PaymentMethod PaymentMethod { get; set; }

        /// <summary>
        /// Chave estrangeira (FK) para a tabela de Clientes.
        /// O '?' indica que o lançamento pode não estar associado a um cliente.
        /// </summary>
        public Guid? CustomerId { get; set; }

        /// <summary>
        /// Propriedade de navegação para acessar os dados do cliente relacionado.
        /// </summary>
        public Customer? Customer { get; set; }

        /// <summary>
        /// Data de vencimento, usada para contas a pagar ou a receber.
        /// O '?' indica que é um campo opcional.
        /// </summary>
        public DateOnly? DueDate { get; set; }

        /// <summary>
        /// 
        /// O status do lançamento, definido pelo Enum PaymentStatus (Pending ou Paid).
        /// </summary>
        public PaymentStatus Status { get; set; }
        public string OperatorName { get; set; } = string.Empty;
    }
}