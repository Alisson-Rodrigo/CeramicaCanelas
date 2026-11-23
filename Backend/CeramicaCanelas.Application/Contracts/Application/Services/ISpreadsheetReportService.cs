namespace CeramicaCanelas.Application.Contracts.Application.Services;

public sealed record SpreadsheetReportSheet(string Name, IReadOnlyList<IReadOnlyList<object?>> Rows,
    int HeaderRow, IReadOnlyList<double> ColumnWidths, bool EnableFilter = true);

public interface ISpreadsheetReportService
{
    byte[] BuildXlsx(string worksheetName, IEnumerable<IEnumerable<object?>> rows);
    byte[] BuildKilnWorkbook(IReadOnlyList<SpreadsheetReportSheet> sheets, byte[]? logo = null);
}
