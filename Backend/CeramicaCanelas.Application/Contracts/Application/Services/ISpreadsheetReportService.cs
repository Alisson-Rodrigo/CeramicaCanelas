namespace CeramicaCanelas.Application.Contracts.Application.Services;

public sealed record SpreadsheetReportSheet(string Name, IReadOnlyList<IReadOnlyList<object?>> Rows,
    int HeaderRow, IReadOnlyList<double> ColumnWidths, bool EnableFilter = true)
{
    public IReadOnlyList<string> MergedRanges { get; init; } = [];
    public IReadOnlyDictionary<int, SpreadsheetBand> Bands { get; init; } = new Dictionary<int, SpreadsheetBand>();
    public IReadOnlyDictionary<int, IReadOnlyDictionary<string, SpreadsheetStatus>> StatusColumns { get; init; } =
        new Dictionary<int, IReadOnlyDictionary<string, SpreadsheetStatus>>();
    public bool HideIdentifier { get; init; }
    public string? DataBarRange { get; init; }
}

public enum SpreadsheetBand { Title, Metadata, Label, Value, Section, Header, Note }
public enum SpreadsheetStatus { Regular, Pending, Critical, Unavailable }

/// <summary>Fórmula Excel sem o sinal inicial de igual e seu valor em cache para leitores sem recálculo.</summary>
public sealed record SpreadsheetFormula(string Formula, double? CachedValue = null, bool IsPercentage = false);

public interface ISpreadsheetReportService
{
    byte[] BuildXlsx(string worksheetName, IEnumerable<IEnumerable<object?>> rows);
    byte[] BuildKilnWorkbook(IReadOnlyList<SpreadsheetReportSheet> sheets, byte[]? logo = null);
}
