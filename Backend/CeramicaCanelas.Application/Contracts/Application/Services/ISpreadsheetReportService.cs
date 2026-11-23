namespace CeramicaCanelas.Application.Contracts.Application.Services;

public sealed record SpreadsheetReportSheet(string Name, IReadOnlyList<IReadOnlyList<object?>> Rows,
    int HeaderRow, IReadOnlyList<double> ColumnWidths, bool EnableFilter = true);

/// <summary>Fórmula Excel sem o sinal inicial de igual e seu valor em cache para leitores sem recálculo.</summary>
public sealed record SpreadsheetFormula(string Formula, double? CachedValue = null, bool IsPercentage = false);

public interface ISpreadsheetReportService
{
    byte[] BuildXlsx(string worksheetName, IEnumerable<IEnumerable<object?>> rows);
    byte[] BuildKilnWorkbook(IReadOnlyList<SpreadsheetReportSheet> sheets, byte[]? logo = null);
}
