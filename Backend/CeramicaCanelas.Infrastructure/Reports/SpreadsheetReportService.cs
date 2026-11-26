using System.Globalization;
using System.IO.Compression;
using System.Text;
using System.Xml;
using CeramicaCanelas.Application.Contracts.Application.Services;

namespace CeramicaCanelas.Infrastructure.Reports;

public sealed class SpreadsheetReportService : ISpreadsheetReportService
{
    private const string SpreadsheetNamespace = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
    private const string RelationshipNamespace = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
    private const string PackageRelationshipNamespace = "http://schemas.openxmlformats.org/package/2006/relationships";
    private const string ContentTypesNamespace = "http://schemas.openxmlformats.org/package/2006/content-types";
    private const string DrawingNamespace = "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing";
    private const string DrawingMainNamespace = "http://schemas.openxmlformats.org/drawingml/2006/main";

    public byte[] BuildKilnWorkbook(IReadOnlyList<SpreadsheetReportSheet> sheets, byte[]? logo = null)
    {
        if (sheets.Count == 0) throw new ArgumentException("O relatório precisa ter ao menos uma aba.", nameof(sheets));
        using var output = new MemoryStream();
        using (var archive = new ZipArchive(output, ZipArchiveMode.Create, leaveOpen: true))
        {
            WriteXml(archive, "[Content_Types].xml", writer =>
            {
                writer.WriteStartElement("Types", ContentTypesNamespace);
                WriteDefault(writer, "rels", "application/vnd.openxmlformats-package.relationships+xml");
                WriteDefault(writer, "xml", "application/xml");
                if (logo is not null) WriteDefault(writer, "png", "image/png");
                WriteOverride(writer, "/xl/workbook.xml", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml");
                WriteOverride(writer, "/xl/styles.xml", "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml");
                for (var i = 0; i < sheets.Count; i++) WriteOverride(writer, $"/xl/worksheets/sheet{i + 1}.xml", "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml");
                if (logo is not null) WriteOverride(writer, "/xl/drawings/drawing1.xml", "application/vnd.openxmlformats-officedocument.drawing+xml");
                writer.WriteEndElement();
            });
            WriteXml(archive, "_rels/.rels", writer =>
            {
                writer.WriteStartElement("Relationships", PackageRelationshipNamespace);
                WriteRelationship(writer, "rId1", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument", "xl/workbook.xml");
                writer.WriteEndElement();
            });
            WriteXml(archive, "xl/workbook.xml", writer =>
            {
                writer.WriteStartElement("workbook", SpreadsheetNamespace); writer.WriteAttributeString("xmlns", "r", null, RelationshipNamespace);
                Start(writer, "bookViews");
                Tag(writer, "workbookView", ("activeTab", "0"), ("firstSheet", "0"));
                writer.WriteEndElement();
                writer.WriteStartElement("sheets", SpreadsheetNamespace);
                for (var i = 0; i < sheets.Count; i++)
                {
                    writer.WriteStartElement("sheet", SpreadsheetNamespace); writer.WriteAttributeString("name", SanitizeSheetName(sheets[i].Name));
                    writer.WriteAttributeString("sheetId", (i + 1).ToString(CultureInfo.InvariantCulture));
                    writer.WriteAttributeString("r", "id", RelationshipNamespace, $"rId{i + 1}"); writer.WriteEndElement();
                }
                writer.WriteEndElement();
                Start(writer, "definedNames");
                for (var i = 0; i < sheets.Count; i++)
                {
                    var sheet = sheets[i];
                    if (sheet.Rows.Count == 0 || ColumnCount(sheet) == 0) continue;
                    var reference = SheetReference(sheet);
                    Start(writer, "definedName", ("name", "_xlnm.Print_Area"), ("localSheetId", Inv(i)));
                    writer.WriteString($"{reference}!${(sheet.HideIdentifier ? "B" : "A")}$1:${ColumnName(ColumnCount(sheet))}${sheet.Rows.Count}");
                    writer.WriteEndElement();
                    var printTitleRows = sheet.HeaderRow > 0 ? sheet.HeaderRow :
                        sheet.Bands.ContainsKey(1) ? Math.Min(sheet.Rows.Count, 4) : 0;
                    if (printTitleRows == 0) continue;
                    Start(writer, "definedName", ("name", "_xlnm.Print_Titles"), ("localSheetId", Inv(i)));
                    writer.WriteString($"{reference}!$1:${printTitleRows}");
                    writer.WriteEndElement();
                }
                writer.WriteEndElement();
                Tag(writer, "calcPr", ("fullCalcOnLoad", "1"));
                writer.WriteEndElement();
            });
            WriteXml(archive, "xl/_rels/workbook.xml.rels", writer =>
            {
                writer.WriteStartElement("Relationships", PackageRelationshipNamespace);
                for (var i = 0; i < sheets.Count; i++) WriteRelationship(writer, $"rId{i + 1}", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet", $"worksheets/sheet{i + 1}.xml");
                WriteRelationship(writer, $"rId{sheets.Count + 1}", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles", "styles.xml");
                writer.WriteEndElement();
            });
            WriteKilnStyles(archive);
            for (var i = 0; i < sheets.Count; i++)
            {
                var includeLogo = i == 0 && logo is not null;
                WriteKilnSheet(archive, sheets[i], i + 1, includeLogo);
            }
            if (logo is not null)
            {
                var media = archive.CreateEntry("xl/media/logo.png", CompressionLevel.Fastest);
                using (var stream = media.Open()) stream.Write(logo);
                WriteKilnDrawing(archive);
                WriteXml(archive, "xl/worksheets/_rels/sheet1.xml.rels", writer =>
                {
                    writer.WriteStartElement("Relationships", PackageRelationshipNamespace);
                    WriteRelationship(writer, "rId1", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing", "../drawings/drawing1.xml");
                    writer.WriteEndElement();
                });
                WriteXml(archive, "xl/drawings/_rels/drawing1.xml.rels", writer =>
                {
                    writer.WriteStartElement("Relationships", PackageRelationshipNamespace);
                    WriteRelationship(writer, "rId1", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image", "../media/logo.png");
                    writer.WriteEndElement();
                });
            }
        }
        return output.ToArray();
    }

    private enum CellTheme
    {
        Plain, Title, Metadata, MetricLabel, MetricValue, Section, Header, Note, Stripe, GroupStart, GroupStartStripe,
        Regular, Pending, Critical, Unavailable
    }
    private static readonly int[] NumberFormats = [0, 164, 165, 166, 167, 168];
    private static readonly (int Font, int Fill, int Border)[] ThemeStyles =
    [
        (0, 0, 0), (1, 2, 0), (2, 0, 0), (2, 4, 1), (3, 4, 1), (4, 3, 0),
        (5, 5, 1), (2, 4, 0), (0, 4, 0), (0, 0, 2), (0, 4, 2),
        (6, 6, 0), (7, 7, 0), (8, 8, 0), (9, 9, 0)
    ];
    private static readonly (string Font, string Fill)[] StatusColors =
    [
        ("FF20543A", "FFE5F3EA"), ("FF754910", "FFFFF1D8"), ("FF8C2826", "FFFCE7E6"), ("FF475569", "FFECEFF2")
    ];
    private const string BrandColor = "FFB9380A";

    private static int ColumnCount(SpreadsheetReportSheet sheet) =>
        Math.Max(sheet.ColumnWidths.Count, sheet.Rows.Select(row => row.Count).DefaultIfEmpty().Max());

    private static string SheetReference(SpreadsheetReportSheet sheet) => $"'{SanitizeSheetName(sheet.Name).Replace("'", "''")}'";

    private static void WriteKilnSheet(ZipArchive archive, SpreadsheetReportSheet sheet, int sheetNumber, bool includeLogo)
    {
        WriteXml(archive, $"xl/worksheets/sheet{sheetNumber}.xml", writer =>
        {
            var rows = sheet.Rows;
            var count = ColumnCount(sheet);
            writer.WriteStartElement("worksheet", SpreadsheetNamespace);
            writer.WriteAttributeString("xmlns", "r", null, RelationshipNamespace);
            Start(writer, "sheetPr");
            Tag(writer, "tabColor", ("rgb", sheetNumber switch { 1 => BrandColor, 2 => "FF9A3412", _ => "FF475569" }));
            Tag(writer, "pageSetUpPr", ("fitToPage", "1"));
            writer.WriteEndElement();
            Start(writer, "sheetViews");
            Start(writer, "sheetView", ("showGridLines", "0"), ("workbookViewId", "0"),
                ("zoomScale", sheet.HideIdentifier ? "85" : "95"), ("tabSelected", sheetNumber == 1 ? "1" : "0"));
            if (sheet.HeaderRow > 0)
            {
                var pane = sheet.HideIdentifier ? "bottomRight" : "bottomLeft";
                var firstCell = $"{(sheet.HideIdentifier ? "C" : "A")}{sheet.HeaderRow + 1}";
                Start(writer, "pane", ("ySplit", Inv(sheet.HeaderRow)), ("topLeftCell", firstCell), ("activePane", pane), ("state", "frozen"));
                if (sheet.HideIdentifier) writer.WriteAttributeString("xSplit", "2");
                writer.WriteEndElement();
                Tag(writer, "selection", ("pane", pane), ("activeCell", firstCell), ("sqref", firstCell));
            }
            writer.WriteEndElement();
            writer.WriteEndElement();
            Tag(writer, "sheetFormatPr", ("defaultRowHeight", "20"));
            if (count > 0)
            {
                Start(writer, "cols");
                for (var col = 0; col < count; col++)
                {
                    Start(writer, "col", ("min", Inv(col + 1)), ("max", Inv(col + 1)),
                        ("width", Inv(Width(sheet, col))), ("customWidth", "1"));
                    if (col == 0 && sheet.HideIdentifier) writer.WriteAttributeString("hidden", "1");
                    writer.WriteEndElement();
                }
                writer.WriteEndElement();
            }

            Start(writer, "sheetData");
            string? previousId = null;
            var alternate = false;
            for (var rowIndex = 0; rowIndex < rows.Count; rowIndex++)
            {
                var row = rows[rowIndex];
                var number = rowIndex + 1;
                var startsGroup = false;
                if (sheet.HideIdentifier && number > sheet.HeaderRow)
                {
                    var id = row.FirstOrDefault() as string;
                    startsGroup = id != previousId;
                    if (startsGroup) alternate = !alternate;
                    previousId = id;
                }
                else alternate = number % 2 == 0;

                var theme = ResolveTheme(sheet, number, row.Count > 0, startsGroup, alternate);
                var height = RowHeight(sheet, row, number, theme);
                Start(writer, "row", ("r", Inv(number)), ("ht", Inv(height)), ("customHeight", "1"));
                for (var col = 0; col < count; col++)
                {
                    var value = col < row.Count ? row[col] : null;
                    var cellTheme = theme;
                    if (number > sheet.HeaderRow && value is string label &&
                        sheet.StatusColumns.TryGetValue(col + 1, out var rules) && rules.TryGetValue(label, out var status))
                        cellTheme = (CellTheme)((int)CellTheme.Regular + (int)status);
                    WriteKilnCell(writer, ColumnName(col + 1) + Inv(number), value, cellTheme);
                }
                writer.WriteEndElement();
            }
            writer.WriteEndElement();

            if (sheet.EnableFilter && sheet.HeaderRow > 0 && rows.Count >= sheet.HeaderRow && count > 0)
                Tag(writer, "autoFilter", ("ref", $"A{sheet.HeaderRow}:{ColumnName(count)}{rows.Count}"));
            if (sheet.MergedRanges.Count > 0)
            {
                Start(writer, "mergeCells", ("count", Inv(sheet.MergedRanges.Count)));
                foreach (var range in sheet.MergedRanges) Tag(writer, "mergeCell", ("ref", range));
                writer.WriteEndElement();
            }
            if (sheet.DataBarRange is string bars)
            {
                Start(writer, "conditionalFormatting", ("sqref", bars));
                Start(writer, "cfRule", ("type", "dataBar"), ("priority", "1"));
                Start(writer, "dataBar");
                Tag(writer, "cfvo", ("type", "num"), ("val", "0"));
                Tag(writer, "cfvo", ("type", "max"));
                Tag(writer, "color", ("rgb", "FFF1B299"));
                writer.WriteEndElement();
                writer.WriteEndElement();
                writer.WriteEndElement();
            }

            Tag(writer, "printOptions", ("horizontalCentered", "1"), ("gridLines", "0"));
            Tag(writer, "pageMargins", ("left", "0.28"), ("right", "0.28"), ("top", "0.45"), ("bottom", "0.45"),
                ("header", "0.18"), ("footer", "0.18"));
            Tag(writer, "pageSetup", ("paperSize", "9"), ("orientation", sheet.HideIdentifier ? "landscape" : "portrait"),
                ("fitToWidth", "1"), ("fitToHeight", "0"));
            Start(writer, "headerFooter");
            writer.WriteElementString("oddHeader", SpreadsheetNamespace, "&LCerâmica Canelas&RControle de Fornos");
            writer.WriteElementString("oddFooter", SpreadsheetNamespace, "&L" + sheet.Name + "&RPágina &P");
            writer.WriteEndElement();
            if (includeLogo)
            {
                Start(writer, "drawing");
                writer.WriteAttributeString("r", "id", RelationshipNamespace, "rId1");
                writer.WriteEndElement();
            }
            writer.WriteEndElement();
        });
    }

    private static CellTheme ResolveTheme(SpreadsheetReportSheet sheet, int row, bool hasData, bool startsGroup, bool alternate)
    {
        if (sheet.Bands.TryGetValue(row, out var band))
            return band switch
            {
                SpreadsheetBand.Title => CellTheme.Title,
                SpreadsheetBand.Metadata => CellTheme.Metadata,
                SpreadsheetBand.Label => CellTheme.MetricLabel,
                SpreadsheetBand.Value => CellTheme.MetricValue,
                SpreadsheetBand.Section => CellTheme.Section,
                SpreadsheetBand.Header => CellTheme.Header,
                _ => CellTheme.Note
            };
        if (sheet.EnableFilter && row == sheet.HeaderRow) return CellTheme.Header;
        if (sheet.EnableFilter && row == 1) return CellTheme.Title;
        if (sheet.EnableFilter && row < sheet.HeaderRow) return CellTheme.Metadata;
        if (startsGroup) return alternate ? CellTheme.GroupStartStripe : CellTheme.GroupStart;
        return hasData && alternate ? CellTheme.Stripe : CellTheme.Plain;
    }

    private static double Width(SpreadsheetReportSheet sheet, int index) => index < sheet.ColumnWidths.Count ? sheet.ColumnWidths[index] : 18;

    private static int RowHeight(SpreadsheetReportSheet sheet, IReadOnlyList<object?> row, int number, CellTheme theme)
    {
        if (row.Count == 0) return 9;
        if (theme == CellTheme.Title) return 33;
        if (theme == CellTheme.MetricLabel || theme == CellTheme.Section) return 23;
        var lines = 1;
        for (var col = sheet.HideIdentifier ? 1 : 0; col < row.Count; col++)
        {
            if (row[col] is not string text) continue;
            var width = Width(sheet, col);
            if (sheet.MergedRanges.Count > 0 && (!sheet.HideIdentifier || number <= sheet.HeaderRow))
            {
                var start = ColumnName(col + 1) + Inv(number) + ":";
                var merge = sheet.MergedRanges.FirstOrDefault(span => span.StartsWith(start, StringComparison.Ordinal));
                if (merge is not null)
                {
                    var end = new string(merge[start.Length..].TakeWhile(char.IsLetter).ToArray());
                    for (var mergedColumn = col + 1; mergedColumn < sheet.ColumnWidths.Count; mergedColumn++)
                    {
                        width += Width(sheet, mergedColumn);
                        if (ColumnName(mergedColumn + 1) == end) break;
                    }
                }
            }
            var available = Math.Max(6, (int)(width * (theme == CellTheme.MetricValue ? .72 : 1.08)) - 1);
            var wrapped = 0;
            foreach (var line in text.Split('\n'))
            {
                var current = 0;
                foreach (var word in line.Split(' '))
                {
                    if (current + word.Length + 1 > available && current > 0) { wrapped++; current = 0; }
                    wrapped += Math.Max(0, (word.Length - 1) / available);
                    current += (word.Length == 0 ? 0 : (word.Length - 1) % available + 1) + 1;
                }
                wrapped++;
            }
            lines = Math.Max(lines, wrapped);
        }
        return theme switch
        {
            CellTheme.MetricValue => Math.Min(409, Math.Max(38, 22 * lines + 8)),
            CellTheme.Header => Math.Max(34, 13 * lines + 8),
            _ => Math.Min(409, Math.Max(20, 12 * lines + 7))
        };
    }

    private static void WriteKilnCell(XmlWriter writer, string reference, object? value, CellTheme theme)
    {
        var format = value switch
        {
            DateOnly => 1, DateTime => 2, SpreadsheetFormula { IsPercentage: true } => 4,
            TimeSpan => 5, SpreadsheetFormula => 3, _ when IsNumber(value) => 3, _ => 0
        };
        Start(writer, "c", ("r", reference), ("s", Inv((int)theme * NumberFormats.Length + format)));
        if (value is SpreadsheetFormula formula)
        {
            writer.WriteAttributeString("t", "n");
            writer.WriteElementString("f", SpreadsheetNamespace, formula.Formula.TrimStart('='));
            if (formula.CachedValue is double cached) writer.WriteElementString("v", SpreadsheetNamespace, Inv(cached));
        }
        else if (format != 0)
        {
            writer.WriteAttributeString("t", "n");
            var number = value switch
            {
                DateTime datetime => Inv(datetime.ToOADate()),
                DateOnly date => Inv(date.ToDateTime(TimeOnly.MinValue).ToOADate()),
                TimeSpan duration => Inv(duration.TotalDays),
                _ => Inv(value!)
            };
            writer.WriteElementString("v", SpreadsheetNamespace, number);
        }
        else if (value is not null)
        {
            writer.WriteAttributeString("t", "inlineStr");
            Start(writer, "is");
            Start(writer, "t");
            writer.WriteAttributeString("xml", "space", "http://www.w3.org/XML/1998/namespace", "preserve");
            writer.WriteString(Inv(value));
            writer.WriteEndElement();
            writer.WriteEndElement();
        }
        writer.WriteEndElement();
    }

    private static void WriteKilnStyles(ZipArchive archive) => WriteXml(archive, "xl/styles.xml", writer =>
    {
        Start(writer, "styleSheet");
        Start(writer, "numFmts", ("count", "5"));
        WriteNumberFormat(writer, "164", "dd/mm/yyyy");
        WriteNumberFormat(writer, "165", "dd/mm/yyyy hh:mm");
        WriteNumberFormat(writer, "166", "#,##0");
        WriteNumberFormat(writer, "167", "0.00%");
        WriteNumberFormat(writer, "168", "[h]\"h\" mm\"min\"");
        writer.WriteEndElement();
        Start(writer, "fonts", ("count", Inv(6 + StatusColors.Length)));
        WriteFont(writer, false, "FF26313D", 10);
        WriteFont(writer, true, "FFFFFFFF", 18);
        WriteFont(writer, false, "FF475569", 10);
        WriteFont(writer, true, "FF1E293B", 17);
        WriteFont(writer, true, "FFFFFFFF", 11);
        WriteFont(writer, true, "FFFFFFFF", 10);
        foreach (var (font, _) in StatusColors) WriteFont(writer, true, font, 10);
        writer.WriteEndElement();
        Start(writer, "fills", ("count", Inv(6 + StatusColors.Length)));
        WriteFill(writer, "none", null);
        WriteFill(writer, "gray125", null);
        foreach (var color in new[] { BrandColor, "FF344151", "FFF4F6F8", "FF253140" }) WriteFill(writer, "solid", color);
        foreach (var (_, fill) in StatusColors) WriteFill(writer, "solid", fill);
        writer.WriteEndElement();
        Start(writer, "borders", ("count", "3"));
        Tag(writer, "border");
        Start(writer, "border"); WriteBorderSide(writer, "bottom"); writer.WriteEndElement();
        Start(writer, "border"); WriteBorderSide(writer, "top"); writer.WriteEndElement();
        writer.WriteEndElement();
        Start(writer, "cellStyleXfs", ("count", "1"));
        Tag(writer, "xf", ("numFmtId", "0"), ("fontId", "0"), ("fillId", "0"), ("borderId", "0"));
        writer.WriteEndElement();
        Start(writer, "cellXfs", ("count", Inv(ThemeStyles.Length * NumberFormats.Length)));
        for (var styleIndex = 0; styleIndex < ThemeStyles.Length; styleIndex++)
        {
            var (font, fill, border) = ThemeStyles[styleIndex];
            var center = (CellTheme)styleIndex is CellTheme.MetricLabel or CellTheme.MetricValue;
            foreach (var number in NumberFormats)
            {
                Start(writer, "xf", ("numFmtId", Inv(number)), ("fontId", Inv(font)), ("fillId", Inv(fill)),
                    ("borderId", Inv(border)), ("xfId", "0"), ("applyAlignment", "1"), ("applyFont", "1"),
                    ("applyFill", "1"), ("applyBorder", "1"), ("applyNumberFormat", "1"));
                Tag(writer, "alignment", ("vertical", "center"), ("wrapText", "1"),
                    ("horizontal", center ? "center" : number is 164 or 165 ? "center" : number == 0 ? "left" : "right"));
                writer.WriteEndElement();
            }
        }
        writer.WriteEndElement();
        Start(writer, "cellStyles", ("count", "1"));
        Tag(writer, "cellStyle", ("name", "Normal"), ("xfId", "0"), ("builtinId", "0"));
        writer.WriteEndElement();
        writer.WriteEndElement();
    });

    private static string Inv(object value) => Convert.ToString(value, CultureInfo.InvariantCulture) ?? string.Empty;

    private static void Start(XmlWriter writer, string name, params (string Key, string Value)[] attributes)
    {
        writer.WriteStartElement(name, SpreadsheetNamespace);
        foreach (var (key, value) in attributes) writer.WriteAttributeString(key, value);
    }

    private static void Tag(XmlWriter writer, string name, params (string Key, string Value)[] attributes)
    {
        Start(writer, name, attributes);
        writer.WriteEndElement();
    }

    private static void WriteKilnDrawing(ZipArchive archive) => WriteXml(archive, "xl/drawings/drawing1.xml", writer =>
    {
        writer.WriteStartElement("xdr", "wsDr", DrawingNamespace); writer.WriteAttributeString("xmlns", "a", null, DrawingMainNamespace); writer.WriteAttributeString("xmlns", "r", null, RelationshipNamespace);
        writer.WriteStartElement("xdr", "oneCellAnchor", DrawingNamespace);
        WriteAnchorPoint(writer, "from", 0, 0);
        writer.WriteStartElement("xdr", "ext", DrawingNamespace);
        writer.WriteAttributeString("cx", "990600");
        writer.WriteAttributeString("cy", "990600");
        writer.WriteEndElement();
        writer.WriteStartElement("xdr", "pic", DrawingNamespace); writer.WriteStartElement("xdr", "nvPicPr", DrawingNamespace);
        writer.WriteStartElement("xdr", "cNvPr", DrawingNamespace); writer.WriteAttributeString("id", "1"); writer.WriteAttributeString("name", "Logo Cerâmica Canelas"); writer.WriteEndElement();
        writer.WriteStartElement("xdr", "cNvPicPr", DrawingNamespace); writer.WriteEndElement(); writer.WriteEndElement();
        writer.WriteStartElement("xdr", "blipFill", DrawingNamespace); writer.WriteStartElement("a", "blip", DrawingMainNamespace); writer.WriteAttributeString("r", "embed", RelationshipNamespace, "rId1"); writer.WriteEndElement();
        writer.WriteStartElement("a", "stretch", DrawingMainNamespace); writer.WriteStartElement("a", "fillRect", DrawingMainNamespace); writer.WriteEndElement(); writer.WriteEndElement(); writer.WriteEndElement();
        writer.WriteStartElement("xdr", "spPr", DrawingNamespace); writer.WriteStartElement("a", "xfrm", DrawingMainNamespace); writer.WriteStartElement("a", "off", DrawingMainNamespace); writer.WriteAttributeString("x", "0"); writer.WriteAttributeString("y", "0"); writer.WriteEndElement(); writer.WriteStartElement("a", "ext", DrawingMainNamespace); writer.WriteAttributeString("cx", "914400"); writer.WriteAttributeString("cy", "914400"); writer.WriteEndElement(); writer.WriteEndElement(); writer.WriteStartElement("a", "prstGeom", DrawingMainNamespace); writer.WriteAttributeString("prst", "rect"); writer.WriteStartElement("a", "avLst", DrawingMainNamespace); writer.WriteEndElement(); writer.WriteEndElement(); writer.WriteEndElement();
        writer.WriteEndElement(); writer.WriteStartElement("xdr", "clientData", DrawingNamespace); writer.WriteEndElement(); writer.WriteEndElement(); writer.WriteEndElement();
    });

    private static void WriteAnchorPoint(XmlWriter writer, string element, int column, int row)
    {
        writer.WriteStartElement("xdr", element, DrawingNamespace); writer.WriteElementString("xdr", "col", DrawingNamespace, column.ToString(CultureInfo.InvariantCulture));
        writer.WriteElementString("xdr", "colOff", DrawingNamespace, "495300"); writer.WriteElementString("xdr", "row", DrawingNamespace, row.ToString(CultureInfo.InvariantCulture));
        writer.WriteElementString("xdr", "rowOff", DrawingNamespace, "57150"); writer.WriteEndElement();
    }

    private static void WriteRelationship(XmlWriter writer, string id, string type, string target)
    {
        writer.WriteStartElement("Relationship", PackageRelationshipNamespace); writer.WriteAttributeString("Id", id); writer.WriteAttributeString("Type", type); writer.WriteAttributeString("Target", target); writer.WriteEndElement();
    }
    private static void WriteDefault(XmlWriter writer, string extension, string contentType)
    {
        writer.WriteStartElement("Default", ContentTypesNamespace); writer.WriteAttributeString("Extension", extension); writer.WriteAttributeString("ContentType", contentType); writer.WriteEndElement();
    }
    private static void WriteOverride(XmlWriter writer, string partName, string contentType)
    {
        writer.WriteStartElement("Override", ContentTypesNamespace); writer.WriteAttributeString("PartName", partName); writer.WriteAttributeString("ContentType", contentType); writer.WriteEndElement();
    }
    private static void WriteNumberFormat(XmlWriter writer, string id, string format)
    {
        writer.WriteStartElement("numFmt", SpreadsheetNamespace); writer.WriteAttributeString("numFmtId", id); writer.WriteAttributeString("formatCode", format); writer.WriteEndElement();
    }
    private static void WriteFont(XmlWriter writer, bool bold, string color, int size)
    {
        writer.WriteStartElement("font", SpreadsheetNamespace); if (bold) writer.WriteElementString("b", SpreadsheetNamespace, string.Empty);
        writer.WriteStartElement("sz", SpreadsheetNamespace); writer.WriteAttributeString("val", size.ToString(CultureInfo.InvariantCulture)); writer.WriteEndElement();
        Tag(writer, "color", ("rgb", color));
        Tag(writer, "name", ("val", "Aptos"));
        writer.WriteEndElement();
    }
    private static void WriteFill(XmlWriter writer, string pattern, string? color)
    {
        writer.WriteStartElement("fill", SpreadsheetNamespace); writer.WriteStartElement("patternFill", SpreadsheetNamespace); writer.WriteAttributeString("patternType", pattern);
        if (color is not null) { writer.WriteStartElement("fgColor", SpreadsheetNamespace); writer.WriteAttributeString("rgb", color); writer.WriteEndElement(); }
        writer.WriteEndElement(); writer.WriteEndElement();
    }
    private static void WriteBorderSide(XmlWriter writer, string side)
    {
        writer.WriteStartElement(side, SpreadsheetNamespace); writer.WriteAttributeString("style", "thin"); writer.WriteStartElement("color", SpreadsheetNamespace); writer.WriteAttributeString("rgb", "FFD1D5DB"); writer.WriteEndElement(); writer.WriteEndElement();
    }
    public byte[] BuildXlsx(string worksheetName, IEnumerable<IEnumerable<object?>> rows)
    {
        using var output = new MemoryStream();
        using (var archive = new ZipArchive(output, ZipArchiveMode.Create, leaveOpen: true))
        {
            WriteXml(archive, "[Content_Types].xml", writer =>
            {
                writer.WriteStartElement("Types", ContentTypesNamespace);
                writer.WriteStartElement("Default", ContentTypesNamespace); writer.WriteAttributeString("Extension", "rels"); writer.WriteAttributeString("ContentType", "application/vnd.openxmlformats-package.relationships+xml"); writer.WriteEndElement();
                writer.WriteStartElement("Default", ContentTypesNamespace); writer.WriteAttributeString("Extension", "xml"); writer.WriteAttributeString("ContentType", "application/xml"); writer.WriteEndElement();
                writer.WriteStartElement("Override", ContentTypesNamespace); writer.WriteAttributeString("PartName", "/xl/workbook.xml"); writer.WriteAttributeString("ContentType", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"); writer.WriteEndElement();
                writer.WriteStartElement("Override", ContentTypesNamespace); writer.WriteAttributeString("PartName", "/xl/worksheets/sheet1.xml"); writer.WriteAttributeString("ContentType", "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"); writer.WriteEndElement();
                writer.WriteEndElement();
            });

            WriteXml(archive, "_rels/.rels", writer =>
            {
                writer.WriteStartElement("Relationships", PackageRelationshipNamespace);
                writer.WriteStartElement("Relationship", PackageRelationshipNamespace); writer.WriteAttributeString("Id", "rId1"); writer.WriteAttributeString("Type", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"); writer.WriteAttributeString("Target", "xl/workbook.xml"); writer.WriteEndElement();
                writer.WriteEndElement();
            });

            WriteXml(archive, "xl/workbook.xml", writer =>
            {
                writer.WriteStartElement("workbook", SpreadsheetNamespace); writer.WriteAttributeString("xmlns", "r", null, RelationshipNamespace);
                writer.WriteStartElement("sheets", SpreadsheetNamespace);
                writer.WriteStartElement("sheet", SpreadsheetNamespace); writer.WriteAttributeString("name", SanitizeSheetName(worksheetName)); writer.WriteAttributeString("sheetId", "1"); writer.WriteAttributeString("r", "id", RelationshipNamespace, "rId1"); writer.WriteEndElement();
                writer.WriteEndElement(); writer.WriteEndElement();
            });

            WriteXml(archive, "xl/_rels/workbook.xml.rels", writer =>
            {
                writer.WriteStartElement("Relationships", PackageRelationshipNamespace);
                writer.WriteStartElement("Relationship", PackageRelationshipNamespace); writer.WriteAttributeString("Id", "rId1"); writer.WriteAttributeString("Type", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"); writer.WriteAttributeString("Target", "worksheets/sheet1.xml"); writer.WriteEndElement();
                writer.WriteEndElement();
            });

            WriteXml(archive, "xl/worksheets/sheet1.xml", writer =>
            {
                writer.WriteStartElement("worksheet", SpreadsheetNamespace);
                writer.WriteStartElement("sheetViews", SpreadsheetNamespace); writer.WriteStartElement("sheetView", SpreadsheetNamespace); writer.WriteAttributeString("workbookViewId", "0"); writer.WriteEndElement(); writer.WriteEndElement();
                writer.WriteStartElement("sheetFormatPr", SpreadsheetNamespace); writer.WriteAttributeString("defaultRowHeight", "18"); writer.WriteEndElement();
                writer.WriteStartElement("sheetData", SpreadsheetNamespace);
                var rowNumber = 0;
                foreach (var row in rows)
                {
                    rowNumber++;
                    writer.WriteStartElement("row", SpreadsheetNamespace); writer.WriteAttributeString("r", rowNumber.ToString(CultureInfo.InvariantCulture));
                    var columnNumber = 0;
                    foreach (var value in row)
                    {
                        columnNumber++;
                        var reference = ColumnName(columnNumber) + rowNumber.ToString(CultureInfo.InvariantCulture);
                        if (IsNumber(value))
                        {
                            writer.WriteStartElement("c", SpreadsheetNamespace); writer.WriteAttributeString("r", reference); writer.WriteAttributeString("t", "n");
                            writer.WriteElementString("v", SpreadsheetNamespace, Convert.ToString(value, CultureInfo.InvariantCulture));
                            writer.WriteEndElement();
                        }
                        else
                        {
                            writer.WriteStartElement("c", SpreadsheetNamespace); writer.WriteAttributeString("r", reference); writer.WriteAttributeString("t", "inlineStr");
                            writer.WriteStartElement("is", SpreadsheetNamespace); writer.WriteStartElement("t", SpreadsheetNamespace); writer.WriteAttributeString("xml", "space", "http://www.w3.org/XML/1998/namespace", "preserve");
                            writer.WriteString(Convert.ToString(value, CultureInfo.InvariantCulture) ?? string.Empty);
                            writer.WriteEndElement(); writer.WriteEndElement(); writer.WriteEndElement();
                        }
                    }
                    writer.WriteEndElement();
                }
                writer.WriteEndElement(); writer.WriteEndElement();
            });
        }

        return output.ToArray();
    }

    private static void WriteXml(ZipArchive archive, string path, Action<XmlWriter> write)
    {
        var entry = archive.CreateEntry(path, CompressionLevel.Fastest);
        using var stream = entry.Open();
        using var writer = XmlWriter.Create(stream, new XmlWriterSettings { Encoding = new UTF8Encoding(false), Indent = false, CloseOutput = false });
        writer.WriteStartDocument();
        write(writer);
        writer.WriteEndDocument();
    }

    private static bool IsNumber(object? value) => value is byte or short or int or long or float or double or decimal;

    private static string ColumnName(int number)
    {
        var name = new StringBuilder();
        while (number > 0)
        {
            number--;
            name.Insert(0, (char)('A' + number % 26));
            number /= 26;
        }
        return name.ToString();
    }

    private static string SanitizeSheetName(string name)
    {
        var sanitized = new string((name ?? "Planilha").Where(c => !"[]:*?/\\".Contains(c)).Take(31).ToArray()).Trim();
        return string.IsNullOrWhiteSpace(sanitized) ? "Planilha" : sanitized;
    }
}
