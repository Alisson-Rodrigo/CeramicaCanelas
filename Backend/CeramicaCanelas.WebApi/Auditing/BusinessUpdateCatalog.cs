namespace CeramicaCanelas.WebApi.Auditing;

public sealed record BusinessUpdateText(string Module, string Message);

/// <summary>
/// Allowlist of business operations that may be shown to ordinary users.
/// Technical action/controller names never become user-facing copy by fallback.
/// </summary>
public static class BusinessUpdateCatalog
{
    private sealed record Definition(string AuditModule, string DisplayModule, string Message, string? ExportFormat = null);

    private static string Key(string controller, string action, string method) => $"{controller}|{action}|{method}";

    private static readonly IReadOnlyDictionary<string, Definition> Definitions = new Dictionary<string, Definition>(StringComparer.OrdinalIgnoreCase)
    {
        // Almoxarifado
        [Key("Products", "CreatedProduct", "POST")] = new("Almoxarifado", "Almoxarifado", "cadastrou um novo produto"),
        [Key("Products", "UpdateProduct", "PUT")] = new("Almoxarifado", "Almoxarifado", "editou o cadastro de um produto"),
        [Key("Products", "DeleteProduct", "DELETE")] = new("Almoxarifado", "Almoxarifado", "excluiu um produto"),
        [Key("Categories", "CreatedCategories", "POST")] = new("Almoxarifado", "Almoxarifado", "cadastrou uma nova categoria de estoque"),
        [Key("Categories", "UpdateCategories", "PUT")] = new("Almoxarifado", "Almoxarifado", "editou uma categoria de estoque"),
        [Key("Categories", "DeleteCategories", "DELETE")] = new("Almoxarifado", "Almoxarifado", "excluiu uma categoria de estoque"),
        [Key("Employees", "CreatedEmployee", "POST")] = new("Almoxarifado", "Almoxarifado", "cadastrou um funcionário"),
        [Key("Employees", "UpdateEmployee", "PUT")] = new("Almoxarifado", "Almoxarifado", "editou o cadastro de um funcionário"),
        [Key("Employees", "DeleteEmployee", "DELETE")] = new("Almoxarifado", "Almoxarifado", "excluiu um funcionário"),
        [Key("SupplierRepository", "CreateSupplier", "POST")] = new("Almoxarifado", "Almoxarifado", "cadastrou um novo fornecedor"),
        [Key("SupplierRepository", "UpdateSupplier", "PUT")] = new("Almoxarifado", "Almoxarifado", "editou o cadastro de fornecedor"),
        [Key("SupplierRepository", "DeleteSupplier", "DELETE")] = new("Almoxarifado", "Almoxarifado", "excluiu um fornecedor"),
        [Key("ProductsEntry", "CreatedProductsEntry", "POST")] = new("Almoxarifado", "Almoxarifado", "registrou uma nova entrada de estoque"),
        [Key("ProductsEntry", "UpdateProductsEntry", "PUT")] = new("Almoxarifado", "Almoxarifado", "editou uma entrada de estoque"),
        [Key("ProductsEntry", "DeleteProductsEntry", "DELETE")] = new("Almoxarifado", "Almoxarifado", "excluiu uma entrada de estoque"),
        [Key("ProductsExit", "CreatedProductsExit", "POST")] = new("Almoxarifado", "Almoxarifado", "registrou uma nova saída de estoque"),
        [Key("ProductsExit", "UpdateProductsExit", "PUT")] = new("Almoxarifado", "Almoxarifado", "editou uma saída de estoque"),
        [Key("ProductsExit", "DeleteProductsExit", "DELETE")] = new("Almoxarifado", "Almoxarifado", "excluiu uma saída de estoque"),
        [Key("ProductsExit", "ReturnProductsExit", "PUT")] = new("Almoxarifado", "Almoxarifado", "concluiu uma devolução de estoque"),

        // Vendas
        [Key("Sales", "CreateSale", "POST")] = new("Vendas", "Vendas", "cadastrou uma nova venda"),
        [Key("Sales", "UpdateSale", "PUT")] = new("Vendas", "Vendas", "editou uma venda"),
        [Key("Sales", "DeleteSale", "DELETE")] = new("Vendas", "Vendas", "excluiu uma venda"),
        [Key("Sales", "Pay", "POST")] = new("Vendas", "Vendas", "concluiu o pagamento de uma venda pendente"),

        // Financeiro
        [Key("Launch", "CreatedLaunch", "POST")] = new("Financeiro", "Financeiro", "cadastrou um novo lançamento"),
        [Key("Launch", "UpdateLaunch", "PUT")] = new("Financeiro", "Financeiro", "editou um lançamento"),
        [Key("Launch", "MarkAsPaid", "PUT")] = new("Financeiro", "Financeiro", "marcou um lançamento como pago"),
        [Key("Launch", "DeleteLaunch", "DELETE")] = new("Financeiro", "Financeiro", "excluiu um lançamento"),
        [Key("LaunchCategories", "CreateLaunchCategory", "POST")] = new("Financeiro", "Financeiro", "cadastrou uma categoria financeira"),
        [Key("LaunchCategories", "UpdateLaunchCategory", "PUT")] = new("Financeiro", "Financeiro", "editou uma categoria financeira"),
        [Key("LaunchCategories", "DeleteLaunchCategory", "DELETE")] = new("Financeiro", "Financeiro", "excluiu uma categoria financeira"),
        [Key("LaunchCategoryGroups", "CreateLaunchCategoryGroup", "POST")] = new("Financeiro", "Financeiro", "cadastrou um grupo financeiro"),
        [Key("LaunchCategoryGroups", "UpdateLaunchCategoryGroup", "PUT")] = new("Financeiro", "Financeiro", "editou um grupo financeiro"),
        [Key("LaunchCategoryGroups", "DeleteLaunchCategoryGroup", "DELETE")] = new("Financeiro", "Financeiro", "excluiu um grupo financeiro"),
        [Key("Customer", "CreateCustomer", "POST")] = new("Financeiro", "Financeiro", "cadastrou um novo cliente"),
        [Key("Customer", "UpdateCustomer", "PUT")] = new("Financeiro", "Financeiro", "editou o cadastro de cliente"),
        [Key("Customer", "DeleteCustomer", "DELETE")] = new("Financeiro", "Financeiro", "excluiu um cliente"),
        [Key("Extract", "CreateExtract", "POST")] = new("Financeiro", "Financeiro", "registrou uma movimentação financeira"),
        [Key("Extract", "UpdateExtract", "PUT")] = new("Financeiro", "Financeiro", "editou uma movimentação financeira"),
        [Key("Extract", "DeleteExtract", "DELETE")] = new("Financeiro", "Financeiro", "excluiu uma movimentação financeira"),

        // Pagamentos de prestadores e funcionários
        [Key("Payments", "CreateAbsence", "POST")] = new("Pagamentos", "Pagamentos", "registrou uma ausência de prestador"),
        [Key("Payments", "UpdateAbsence", "PUT")] = new("Pagamentos", "Pagamentos", "editou um registro de ausência de prestador"),
        [Key("Payments", "DeleteAbsence", "DELETE")] = new("Pagamentos", "Pagamentos", "excluiu um registro de ausência de prestador"),
        [Key("Payments", "SavePreparation", "POST")] = new("Pagamentos", "Pagamentos", "salvou uma preparação de pagamento"),
        [Key("Payments", "CreateAdjustment", "POST")] = new("Pagamentos", "Pagamentos", "registrou um ajuste de pagamento"),
        [Key("Payments", "PayAdjustment", "PATCH")] = new("Pagamentos", "Pagamentos", "marcou um ajuste de pagamento como pago"),
        [Key("Payments", "DeletePerson", "DELETE")] = new("Pagamentos", "Pagamentos", "removeu um cadastro de pagamento"),
        [Key("Payments", "DeleteVoucher", "DELETE")] = new("Pagamentos", "Pagamentos", "excluiu um vale de pagamento"),
        [Key("Payments", "DeletePreparation", "DELETE")] = new("Pagamentos", "Pagamentos", "excluiu uma preparação de pagamento"),
        [Key("Payments", "DeleteCalculation", "DELETE")] = new("Pagamentos", "Pagamentos", "cancelou um cálculo de pagamento"),
        [Key("Payments", "ReviewEmployeeAbsence", "PATCH")] = new("Pagamentos", "Pagamentos", "revisou uma ausência de funcionário"),
        [Key("Payments", "RegisterEmployeeAccountantSummary", "POST")] = new("Pagamentos", "Pagamentos", "registrou um resumo contábil de funcionário"),
        [Key("Payments", "CreatePerson", "POST")] = new("Pagamentos", "Pagamentos", "cadastrou uma pessoa no módulo de pagamentos"),
        [Key("Payments", "UpdateSalary", "PATCH")] = new("Pagamentos", "Pagamentos", "atualizou os dados de pagamento de uma pessoa"),
        [Key("Payments", "UpdatePersonStatus", "PATCH")] = new("Pagamentos", "Pagamentos", "alterou a situação de uma pessoa no módulo de pagamentos"),
        [Key("Payments", "CreateRules", "POST")] = new("Pagamentos", "Pagamentos", "cadastrou regras de pagamento"),
        [Key("Payments", "CreateVoucher", "POST")] = new("Pagamentos", "Pagamentos", "cadastrou um vale de pagamento"),
        [Key("Payments", "UpdateVoucherStatus", "PATCH")] = new("Pagamentos", "Pagamentos", "alterou a situação de um vale de pagamento"),
        [Key("Payments", "Confirm", "POST")] = new("Pagamentos", "Pagamentos", "concluiu um cálculo de pagamento"),
        [Key("Payments", "MarkPaid", "PATCH")] = new("Pagamentos", "Pagamentos", "marcou um pagamento como pago"),
        [Key("EmployeePayments", "CreatePerson", "POST")] = new("Pagamentos", "Pagamentos", "cadastrou um funcionário no módulo de pagamentos"),
        [Key("EmployeePayments", "Salary", "PATCH")] = new("Pagamentos", "Pagamentos", "atualizou os dados de pagamento de um funcionário"),
        [Key("EmployeePayments", "Status", "PATCH")] = new("Pagamentos", "Pagamentos", "alterou a situação de um funcionário no módulo de pagamentos"),
        [Key("EmployeePayments", "DeletePerson", "DELETE")] = new("Pagamentos", "Pagamentos", "removeu um cadastro de pagamento de funcionário"),
        [Key("EmployeePayments", "CreateVoucher", "POST")] = new("Pagamentos", "Pagamentos", "cadastrou um vale de funcionário"),
        [Key("EmployeePayments", "VoucherStatus", "PATCH")] = new("Pagamentos", "Pagamentos", "alterou a situação de um vale de funcionário"),
        [Key("EmployeePayments", "DeleteVoucher", "DELETE")] = new("Pagamentos", "Pagamentos", "excluiu um vale de funcionário"),
        [Key("EmployeePayments", "CreateAbsence", "POST")] = new("Pagamentos", "Pagamentos", "registrou uma ausência de funcionário"),
        [Key("EmployeePayments", "UpdateAbsence", "PUT")] = new("Pagamentos", "Pagamentos", "editou um registro de ausência de funcionário"),
        [Key("EmployeePayments", "DeleteAbsence", "DELETE")] = new("Pagamentos", "Pagamentos", "excluiu um registro de ausência de funcionário"),
        [Key("EmployeePayments", "Review", "PATCH")] = new("Pagamentos", "Pagamentos", "revisou uma ausência de funcionário"),
        [Key("EmployeePayments", "Submit", "POST")] = new("Pagamentos", "Pagamentos", "registrou um resumo contábil de funcionário"),
        [Key("EmployeePayments", "Confirm", "POST")] = new("Pagamentos", "Pagamentos", "concluiu um cálculo de pagamento de funcionário"),
        [Key("EmployeePayments", "Paid", "PATCH")] = new("Pagamentos", "Pagamentos", "marcou um pagamento de funcionário como pago"),
        [Key("EmployeePayments", "DeleteCalculation", "DELETE")] = new("Pagamentos", "Pagamentos", "cancelou um cálculo de pagamento de funcionário"),
        [Key("EmployeePayments", "SavePreparation", "POST")] = new("Pagamentos", "Pagamentos", "salvou uma preparação de pagamento de funcionário"),
        [Key("EmployeePayments", "DeletePreparation", "DELETE")] = new("Pagamentos", "Pagamentos", "excluiu uma preparação de pagamento de funcionário"),
        [Key("EmployeePayments", "CreateAdjustment", "POST")] = new("Pagamentos", "Pagamentos", "registrou um ajuste de pagamento de funcionário"),
        [Key("EmployeePayments", "PayAdjustment", "PATCH")] = new("Pagamentos", "Pagamentos", "marcou um ajuste de pagamento de funcionário como pago"),
        [Key("EmployeePayments", "CreateHours", "POST")] = new("Pagamentos", "Pagamentos", "registrou horas de trabalho de funcionário"),
        [Key("EmployeePayments", "UpdateHours", "PUT")] = new("Pagamentos", "Pagamentos", "editou horas de trabalho de funcionário"),

        // Arquivos: só são exibidos quando o middleware identificou o Content-Type esperado.
        [Key("Sales", "GetProductItemsPdf", "GET")] = new("Vendas", "Vendas", "baixou um relatório de itens de vendas em {format}", "PDF"),
        [Key("Sales", "GetSaleReceipt", "GET")] = new("Vendas", "Vendas", "baixou um recibo de venda em {format}", "PDF"),
        [Key("DashboardFinancial", "GetTrialBalanceReportPdf", "GET")] = new("Financeiro", "Financeiro", "baixou um balancete em {format}", "PDF"),
        [Key("Payments", "ExportPayments", "GET")] = new("Pagamentos", "Pagamentos", "baixou um relatório de pagamentos em {format}", "PDF"),
        [Key("Payments", "ExportBonuses", "GET")] = new("Pagamentos", "Pagamentos", "baixou um relatório de bônus em {format}", "PDF"),
        [Key("EmployeePayments", "Export", "GET")] = new("Pagamentos", "Pagamentos", "baixou um relatório de pagamentos de funcionários em {format}", "PDF"),
        [Key("EmployeePayments", "ExportBonuses", "GET")] = new("Pagamentos", "Pagamentos", "baixou um relatório de bônus de funcionários em {format}", "PDF"),
        [Key("EmployeePayments", "AccountantExport", "GET")] = new("Pagamentos", "Pagamentos", "baixou um relatório contábil em {format}", "PDF"),
        [Key("EmployeePayments", "VoucherSheetExport", "GET")] = new("Pagamentos", "Pagamentos", "baixou uma planilha de vales em {format}", "CSV"),
        [Key("EmployeePayments", "BonusReportExport", "GET")] = new("Pagamentos", "Pagamentos", "baixou um relatório de bônus em {format}", "PDF"),
        [Key("AuditAdministration", "Export", "GET")] = new("Administração", "Administração", "baixou um arquivo de auditoria em {format}", "CSV"),

        // Administração
        [Key("Users", "CreateUser", "POST")] = new("Usuários", "Administração", "cadastrou um novo usuário"),
        [Key("Users", "DeleteUser", "DELETE")] = new("Usuários", "Administração", "removeu um usuário")
    };

    public static IReadOnlyCollection<string> AllowedEventKeys => Definitions.Keys.ToArray();

    public static IReadOnlyCollection<string> DisplayModules => Definitions.Values
        .Select(x => x.DisplayModule).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();

    public static IReadOnlyCollection<string> GetAuditModules(string displayModule) => Definitions.Values
        .Where(x => string.Equals(x.DisplayModule, displayModule, StringComparison.OrdinalIgnoreCase))
        .Select(x => x.AuditModule).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();

    public static IReadOnlyCollection<string> FindEventKeysForSearch(string term) => Definitions
        .Where(x => x.Value.Message.Replace("{format}", x.Value.ExportFormat ?? string.Empty, StringComparison.Ordinal)
            .Contains(term, StringComparison.OrdinalIgnoreCase) ||
            x.Value.DisplayModule.Contains(term, StringComparison.OrdinalIgnoreCase))
        .Select(x => x.Key).ToArray();

    public static bool TryCreate(AuditEventData data, string? actorDisplayName, out BusinessUpdateText text)
    {
        text = default!;
        if (!TryGet(data.Category, data.Outcome, data.Module, data.ResourceType, data.Action, data.HttpMethod,
                data.TechnicalContext, actorDisplayName, out var result)) return false;
        text = result;
        return true;
    }

    public static bool TryGet(string category, string outcome, string auditModule, string controller,
        string action, string? method, string? technicalContext, string? actorDisplayName, out BusinessUpdateText text)
    {
        text = default!;
        if (category != "BusinessAudit" || outcome != "Success" || string.IsNullOrWhiteSpace(method) ||
            !Definitions.TryGetValue(Key(controller, action, method), out var definition) ||
            !string.Equals(definition.AuditModule, auditModule, StringComparison.Ordinal)) return false;

        var message = definition.Message;
        if (definition.ExportFormat is not null)
        {
            var expected = $"ExportFormat={definition.ExportFormat}";
            if (!string.Equals(technicalContext, expected, StringComparison.Ordinal)) return false;
            message = message.Replace("{format}", definition.ExportFormat, StringComparison.Ordinal);
        }
        else if (method.Equals("GET", StringComparison.OrdinalIgnoreCase)) return false;

        var actor = string.IsNullOrWhiteSpace(actorDisplayName) ? "Um usuário" : actorDisplayName.Trim();
        text = new BusinessUpdateText(definition.DisplayModule, $"{actor} {message}");
        return true;
    }
}
