using System.Security.Claims;
using CeramicaCanelas.WebApi.Auditing;
using Microsoft.AspNetCore.Mvc.Controllers;

namespace CeramicaCanelas.WebApi.Middleware;

public sealed class AuditCaptureMiddleware(RequestDelegate next, ILogger<AuditCaptureMiddleware> logger)
{
    private static readonly HashSet<string> RelevantReads = new(StringComparer.OrdinalIgnoreCase)
    {
        "UsersController.GetUsers", "PaymentsController.ExportPayments", "PaymentsController.ExportBonuses",
        "PaymentsController.AccountantSummary", "PaymentsController.Audit", "PaymentsController.Absences", "PaymentsController.Dsr", "PaymentsController.GetRules", "PaymentsController.EmployeeVouchers", "PaymentsController.EmployeeAccountantSubmissions", "PaymentsController.MonthlySummary",
        "EmployeePaymentsController.Export", "EmployeePaymentsController.ExportBonuses",
        "EmployeePaymentsController.AccountantExport", "EmployeePaymentsController.VoucherSheetExport",
        "EmployeePaymentsController.BonusReportExport", "EmployeePaymentsController.Hours", "EmployeePaymentsController.VoucherSheet", "EmployeePaymentsController.BonusReport", "EmployeePaymentsController.Absences", "EmployeePaymentsController.Rules",
        "EmployeePaymentsController.AccountantSummary", "EmployeePaymentsController.Audit",
        "EmployeePaymentsController.VoucherReport", "EmployeePaymentsController.BonusReport",
        "SalesController.GetProductItemsPdf", "SalesController.GetSaleReceipt", "ExtractController.GetExtractsReport",
        "DashboardFinancialController.GetFlowReport", "DashboardFinancialController.GetBalanceExpense",
        "DashboardFinancialController.GetBalanceIncome", "DashboardFinancialController.GetDashboardSummary",
        "DashboardFinancialController.GetPendingLaunches", "DashboardFinancialController.GetClientsBalance",
        "DashboardFinancialController.GetWithExtract", "DashboardFinancialController.GetTrialBalanceReportPdf",
        "DashboardController.GetStockPanel", "DashboardController.GetMonthlyCostByCategory",
        "DashboardController.GetReportsEmployees", "DashboardController.GetReportsProducts",
        "DashboardController.GetMostUsed", "DashboardController.GetProductsOutOf", "DashboardController.GetProductsUnreturned", "DashboardController.GetDashboardIndicators",
        "ProductsController.GetProducts", "ProductsController.GetPagedProducts", "CategoriesController.GetCategories",
        "EmployeesController.GetEmployees", "EmployeesController.GetEmployeesPages",
        "ProductsEntryController.GetProductsEntry", "ProductsEntryController.GetPagedProductsEntry",
        "ProductsExitController.GetProductsExit", "ProductsExitController.GetPagedProductsExit",
        "SupplierRepository.GetPagedSuppliers",
        "SalesController.GetPagedSales", "SalesController.GetPagedPendingSales", "SalesController.GetProductItemsPaged", "SalesController.GetDashboardIndicators",
        "LaunchController.GetPagedLaunches", "LaunchController.GetDailyHistory", "LaunchController.GetTrialBalanceReportPdf",
        "LaunchCategoriesController.GetPagesLaunchCategories", "LaunchCategoryGroupsController.GetPagedLaunchCategoryGroups",
        "CustomerController.GetPagedCustomers", "ExtractController.GetPagedExtracts",
        "PaymentsController.GetPeople", "PaymentsController.GetVouchers", "PaymentsController.GetHistory", "PaymentsController.GetPreparation", "PaymentsController.GetAdjustments",
        "EmployeePaymentsController.People", "EmployeePaymentsController.Vouchers", "EmployeePaymentsController.Submissions", "EmployeePaymentsController.Monthly", "EmployeePaymentsController.History", "EmployeePaymentsController.GetPreparation", "EmployeePaymentsController.Adjustments",
        "AuditAdministrationController.Events", "AuditAdministrationController.Export", "AuditAdministrationController.Notifications"
    };

    public async Task InvokeAsync(HttpContext context)
    {
        await next(context);
        if (context.Items.ContainsKey("AuditExceptionWritten")) return;
        if (!context.Request.Path.StartsWithSegments("/api")) return;

        var descriptor = context.GetEndpoint()?.Metadata.GetMetadata<ControllerActionDescriptor>();
        var identity = context.User.Identity?.IsAuthenticated == true;
        var method = context.Request.Method;
        var mutation = method is "POST" or "PUT" or "PATCH" or "DELETE";
        var actionKey = descriptor is null ? string.Empty : $"{descriptor.ControllerName}Controller.{descriptor.ActionName}";
        var isRelevantRead = method == "GET" && RelevantReads.Contains(actionKey);
        var securityFailure = context.Response.StatusCode is 401 or 403;
        var serverFailure = context.Response.StatusCode >= 500;
        if (!(identity && (mutation && !actionKey.Contains("Preview", StringComparison.OrdinalIgnoreCase) || isRelevantRead)) && !securityFailure && !serverFailure)
            return;
        var writer = context.RequestServices.GetService<IAuditEventWriter>();
        if (writer is null) return;
        await WriteCapture(context, writer, descriptor, method, securityFailure, serverFailure);
    }

    private async Task WriteCapture(HttpContext context, IAuditEventWriter writer, ControllerActionDescriptor? descriptor, string method, bool securityFailure, bool serverFailure)
    {
        var category = securityFailure ? "SecurityAlert" : serverFailure ? "TechnicalDiagnostic" : "BusinessAudit";
        var module = ModuleName(descriptor?.ControllerName, context.Request.Path);
        var route = descriptor?.AttributeRouteInfo?.Template;
        var resourceId = context.Request.RouteValues.FirstOrDefault(x => x.Key.Equals("id", StringComparison.OrdinalIgnoreCase) || x.Key.EndsWith("Id", StringComparison.OrdinalIgnoreCase)).Value?.ToString()
            ?? context.Items["AuditResourceId"]?.ToString();
        var outcome = context.Response.StatusCode is >= 200 and < 400 ? "Success" : "Failure";
        var technicalContext = serverFailure ? "HttpRequestFailure" : securityFailure ? "AuthorizationOrAuthenticationFailure" : null;
        if (method == "GET" && IsDownload(context.Response.ContentType)) technicalContext = "ExportFormat=" + SafeContentType(context.Response.ContentType);
        var data = new AuditEventData(category, descriptor?.ActionName ?? method, outcome,
            securityFailure ? "High" : serverFailure ? "Critical" : "Information", module,
            descriptor?.ControllerName ?? "Endpoint", resourceId,
            context.User.FindFirstValue(ClaimTypes.NameIdentifier), context.User.FindFirstValue(ClaimTypes.Name),
            DateTime.UtcNow, context.Connection.RemoteIpAddress?.ToString(), method, route,
            context.Response.StatusCode, context.TraceIdentifier, technicalContext);
        try { await writer.WriteAsync(data, context.RequestAborted); }
        catch (Exception ex) { logger.LogError("Audit middleware failed. TraceId={TraceId} ExceptionType={ExceptionType}", context.TraceIdentifier, ex.GetType().Name); }
    }

    private static bool IsDownload(string? contentType) => contentType is not null &&
        (contentType.Contains("pdf", StringComparison.OrdinalIgnoreCase) || contentType.Contains("csv", StringComparison.OrdinalIgnoreCase) || contentType.Contains("spreadsheet", StringComparison.OrdinalIgnoreCase) || contentType.Contains("excel", StringComparison.OrdinalIgnoreCase) || contentType.Contains("octet-stream", StringComparison.OrdinalIgnoreCase));

    private static string SafeContentType(string? contentType) => contentType?.Split(';', 2)[0].Trim() switch
    {
        "application/pdf" => "PDF", "text/csv" => "CSV",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" => "XLSX",
        "application/vnd.ms-excel" => "XLS", "application/octet-stream" => "Binary", _ => "File"
    };

    private static string ModuleName(string? controller, PathString path) => controller switch
    {
        "Products" or "Categories" or "SupplierRepository" or "Employees" or "ProductsEntry" or "ProductsExit" => "Almoxarifado",
        "EmployeePayments" or "Payments" => "Pagamentos",
        "Sales" => "Vendas",
        "Launch" or "LaunchCategories" or "LaunchCategoryGroups" or "Customer" or "DashboardFinancial" or "Extract" => "Financeiro",
        "Users" => "Usuários",
        "Auth" => "Autenticação",
        "AuditAdministration" => "Administração",
        "Notifications" => "Notificações",
        _ => "API"
    };
}
