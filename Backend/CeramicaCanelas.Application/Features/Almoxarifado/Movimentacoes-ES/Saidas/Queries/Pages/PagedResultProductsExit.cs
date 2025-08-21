using CeramicaCanelas.Domain.Entities.Almoxarifado;


namespace CeramicaCanelas.Application.Features.Almoxarifado.Movimentacoes_ES.Saidas.Queries.Pages
{
    public class PagedResultProductsExit
    {
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalItems { get; set; }
        public int TotalPages => (int)Math.Ceiling((double)TotalItems / PageSize);

        public List<ExitItemResult> Items { get; set; } = [];
    }

    public class ExitItemResult
    {
        public Guid Id { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string EmployeeName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public int ReturnedQuantity { get; set; }
        public DateTime ExitDate { get; set; }
        public bool IsReturnable { get; set; }
        public string? Observation { get; set; }
        public string InsertedBy { get; set; } = string.Empty;

        public ExitItemResult(ProductExit exit)
        {
            Id = exit.Id;
            ProductName = exit.NameProduct ?? "Produto não encontrado";
            EmployeeName = exit.EmployeeName ?? "Funcionário não encontrado";
            Quantity = exit.Quantity;
            ReturnedQuantity = exit.ReturnedQuantity;
            ExitDate = exit.ExitDate;
            IsReturnable = exit.IsReturnable;
            InsertedBy = exit.NameOperator ?? "Desconhecido";
            Observation = exit.Observation ?? "Nenhuma observação";
        }
    }
}
