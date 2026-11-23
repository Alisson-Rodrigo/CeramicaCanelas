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
                writer.WriteStartElement("sheets", SpreadsheetNamespace);
                for (var i = 0; i < sheets.Count; i++)
                {
                    writer.WriteStartElement("sheet", SpreadsheetNamespace); writer.WriteAttributeString("name", SanitizeSheetName(sheets[i].Name));
                    writer.WriteAttributeString("sheetId", (i + 1).ToString(CultureInfo.InvariantCulture));
                    writer.WriteAttributeString("r", "id", RelationshipNamespace, $"rId{i + 1}"); writer.WriteEndElement();
                }
                writer.WriteEndElement(); writer.WriteEndElement();
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

    private static void WriteKilnSheet(ZipArchive archive, SpreadsheetReportSheet sheet, int sheetNumber, bool includeLogo)
    {
        WriteXml(archive, $"xl/worksheets/sheet{sheetNumber}.xml", writer =>
        {
            writer.WriteStartElement("worksheet", SpreadsheetNamespace); writer.WriteAttributeString("xmlns", "r", null, RelationshipNamespace);
            var rows = sheet.Rows;
            var columnCount = rows.Count == 0 ? sheet.ColumnWidths.Count : rows.Max(x => x.Count);
            writer.WriteStartElement("sheetViews", SpreadsheetNamespace); writer.WriteStartElement("sheetView", SpreadsheetNamespace); writer.WriteAttributeString("workbookViewId", "0");
            if (sheet.HeaderRow > 0)
            {
                writer.WriteStartElement("pane", SpreadsheetNamespace); writer.WriteAttributeString("ySplit", sheet.HeaderRow.ToString(CultureInfo.InvariantCulture));
                writer.WriteAttributeString("topLeftCell", $"A{sheet.HeaderRow + 1}"); writer.WriteAttributeString("activePane", "bottomLeft");
                writer.WriteAttributeString("state", "frozen"); writer.WriteEndElement();
            }
            writer.WriteEndElement(); writer.WriteEndElement();
            writer.WriteStartElement("sheetFormatPr", SpreadsheetNamespace); writer.WriteAttributeString("defaultRowHeight", "20"); writer.WriteEndElement();
            if (columnCount > 0)
            {
                writer.WriteStartElement("cols", SpreadsheetNamespace);
                for (var i = 0; i < columnCount; i++)
                {
                    var width = i < sheet.ColumnWidths.Count ? sheet.ColumnWidths[i] : 18d;
                    writer.WriteStartElement("col", SpreadsheetNamespace); writer.WriteAttributeString("min", (i + 1).ToString(CultureInfo.InvariantCulture));
                    writer.WriteAttributeString("max", (i + 1).ToString(CultureInfo.InvariantCulture)); writer.WriteAttributeString("width", width.ToString(CultureInfo.InvariantCulture));
                    writer.WriteAttributeString("customWidth", "1"); writer.WriteEndElement();
                }
                writer.WriteEndElement();
            }
            writer.WriteStartElement("sheetData", SpreadsheetNamespace);
            for (var rowIndex = 0; rowIndex < rows.Count; rowIndex++)
            {
                var rowNumber = rowIndex + 1;
                writer.WriteStartElement("row", SpreadsheetNamespace); writer.WriteAttributeString("r", rowNumber.ToString(CultureInfo.InvariantCulture));
                for (var columnIndex = 0; columnIndex < rows[rowIndex].Count; columnIndex++)
                {
                    var value = rows[rowIndex][columnIndex];
                    if (value is null) continue;
                    var reference = ColumnName(columnIndex + 1) + rowNumber.ToString(CultureInfo.InvariantCulture);
                    var style = rowNumber == 1 ? 1 : rowNumber == 2 || rowNumber == 3 ? 2 : rowNumber == sheet.HeaderRow ? 3 : 0;
                    if (value is DateTime) style = 5;
                    else if (value is DateOnly) style = 4;
                    else if (IsNumber(value)) style = 6;
                    else if (string.Equals(Convert.ToString(value, CultureInfo.InvariantCulture), "Total por produto", StringComparison.Ordinal)) style = 3;
                    if (rowNumber > sheet.HeaderRow && Convert.ToString(value, CultureInfo.InvariantCulture) is { } text &&
                        (text.Contains("Pendente", StringComparison.OrdinalIgnoreCase) || text.Contains("Acima do tempo", StringComparison.OrdinalIgnoreCase))) style = 7;
                    writer.WriteStartElement("c", SpreadsheetNamespace); writer.WriteAttributeString("r", reference); writer.WriteAttributeString("s", style.ToString(CultureInfo.InvariantCulture));
                    if (value is DateTime dateTime) writer.WriteElementString("v", SpreadsheetNamespace, dateTime.ToOADate().ToString(CultureInfo.InvariantCulture));
                    else if (value is DateOnly dateOnly) writer.WriteElementString("v", SpreadsheetNamespace, dateOnly.ToDateTime(TimeOnly.MinValue).ToOADate().ToString(CultureInfo.InvariantCulture));
                    else if (IsNumber(value)) { writer.WriteAttributeString("t", "n"); writer.WriteElementString("v", SpreadsheetNamespace, Convert.ToString(value, CultureInfo.InvariantCulture)); }
                    else
                    {
                        writer.WriteAttributeString("t", "inlineStr"); writer.WriteStartElement("is", SpreadsheetNamespace); writer.WriteStartElement("t", SpreadsheetNamespace);
                        writer.WriteAttributeString("xml", "space", "http://www.w3.org/XML/1998/namespace", "preserve");
                        writer.WriteString(Convert.ToString(value, CultureInfo.InvariantCulture) ?? string.Empty); writer.WriteEndElement(); writer.WriteEndElement();
                    }
                    writer.WriteEndElement();
                }
                writer.WriteEndElement();
            }
            writer.WriteEndElement();
            if (sheet.EnableFilter && sheet.HeaderRow > 0 && rows.Count >= sheet.HeaderRow && columnCount > 0)
            {
                writer.WriteStartElement("autoFilter", SpreadsheetNamespace);
                writer.WriteAttributeString("ref", $"A{sheet.HeaderRow}:{ColumnName(columnCount)}{rows.Count}"); writer.WriteEndElement();
            }
            if (sheet.Name == "Resumo")
            {
                writer.WriteStartElement("mergeCells", SpreadsheetNamespace); writer.WriteAttributeString("count", "2");
                writer.WriteStartElement("mergeCell", SpreadsheetNamespace); writer.WriteAttributeString("ref", "D1:E1"); writer.WriteEndElement();
                writer.WriteStartElement("mergeCell", SpreadsheetNamespace); writer.WriteAttributeString("ref", "D2:E2"); writer.WriteEndElement(); writer.WriteEndElement();
            }
            if (sheet.Name == "Queimas" && rows.Count > sheet.HeaderRow)
            {
                WriteConditionalFormatting(writer, $"F{sheet.HeaderRow + 1}:F{rows.Count}", "Acima do tempo", 0, $"F{sheet.HeaderRow + 1}");
                WriteConditionalFormatting(writer, $"J{sheet.HeaderRow + 1}:J{rows.Count}", "Pendente", 1, $"J{sheet.HeaderRow + 1}");
            }
            if (includeLogo) { writer.WriteStartElement("drawing", SpreadsheetNamespace); writer.WriteAttributeString("r", "id", RelationshipNamespace, "rId1"); writer.WriteEndElement(); }
            writer.WriteEndElement();
        });
    }

    private static void WriteKilnStyles(ZipArchive archive) => WriteXml(archive, "xl/styles.xml", writer =>
    {
        writer.WriteStartElement("styleSheet", SpreadsheetNamespace);
        writer.WriteStartElement("numFmts", SpreadsheetNamespace); writer.WriteAttributeString("count", "3");
        WriteNumberFormat(writer, "164", "dd/mm/yyyy"); WriteNumberFormat(writer, "165", "dd/mm/yyyy hh:mm"); WriteNumberFormat(writer, "166", "#,##0.##"); writer.WriteEndElement();
        writer.WriteStartElement("fonts", SpreadsheetNamespace); writer.WriteAttributeString("count", "3");
        WriteFont(writer, false, null, "FF1F2937", 11); WriteFont(writer, true, "FFB9380A", "FFFFFFFF", 15); WriteFont(writer, true, null, "FFFFFFFF", 10); writer.WriteEndElement();
        writer.WriteStartElement("fills", SpreadsheetNamespace); writer.WriteAttributeString("count", "4");
        WriteFill(writer, "none", null); WriteFill(writer, "gray125", null); WriteFill(writer, "solid", "FFB9380A"); WriteFill(writer, "solid", "FFFFE5B4"); writer.WriteEndElement();
        writer.WriteStartElement("borders", SpreadsheetNamespace); writer.WriteAttributeString("count", "2"); writer.WriteStartElement("border", SpreadsheetNamespace); writer.WriteEndElement();
        writer.WriteStartElement("border", SpreadsheetNamespace); WriteBorderSide(writer, "left"); WriteBorderSide(writer, "right"); WriteBorderSide(writer, "top"); WriteBorderSide(writer, "bottom"); writer.WriteStartElement("diagonal", SpreadsheetNamespace); writer.WriteEndElement(); writer.WriteEndElement(); writer.WriteEndElement();
        writer.WriteStartElement("cellStyleXfs", SpreadsheetNamespace); writer.WriteAttributeString("count", "1"); writer.WriteStartElement("xf", SpreadsheetNamespace); writer.WriteAttributeString("numFmtId", "0"); writer.WriteAttributeString("fontId", "0"); writer.WriteAttributeString("fillId", "0"); writer.WriteAttributeString("borderId", "0"); writer.WriteEndElement(); writer.WriteEndElement();
        writer.WriteStartElement("cellXfs", SpreadsheetNamespace); writer.WriteAttributeString("count", "8");
        WriteXf(writer, 0, 0, 0, 0); WriteXf(writer, 0, 1, 2, 0, true); WriteXf(writer, 0, 0, 0, 0); WriteXf(writer, 0, 2, 2, 1, true);
        WriteXf(writer, 164, 0, 0, 1); WriteXf(writer, 165, 0, 0, 1); WriteXf(writer, 166, 0, 0, 1); WriteXf(writer, 0, 0, 3, 1, true);
        writer.WriteEndElement(); writer.WriteStartElement("cellStyles", SpreadsheetNamespace); writer.WriteAttributeString("count", "1");
        writer.WriteStartElement("cellStyle", SpreadsheetNamespace); writer.WriteAttributeString("name", "Normal"); writer.WriteAttributeString("xfId", "0"); writer.WriteAttributeString("builtinId", "0"); writer.WriteEndElement(); writer.WriteEndElement();
        writer.WriteStartElement("dxfs", SpreadsheetNamespace); writer.WriteAttributeString("count", "2");
        WriteDifferentialStyle(writer, "FF9A3412", "FFFFEDD5"); WriteDifferentialStyle(writer, "FF92400E", "FFFEF3C7"); writer.WriteEndElement(); writer.WriteEndElement();
    });

    private static void WriteConditionalFormatting(XmlWriter writer, string range, string text, int differentialStyleId, string firstCell)
    {
        writer.WriteStartElement("conditionalFormatting", SpreadsheetNamespace); writer.WriteAttributeString("sqref", range);
        writer.WriteStartElement("cfRule", SpreadsheetNamespace); writer.WriteAttributeString("type", "containsText"); writer.WriteAttributeString("dxfId", differentialStyleId.ToString(CultureInfo.InvariantCulture)); writer.WriteAttributeString("priority", (differentialStyleId + 1).ToString(CultureInfo.InvariantCulture)); writer.WriteAttributeString("operator", "containsText"); writer.WriteAttributeString("text", text);
        writer.WriteElementString("formula", SpreadsheetNamespace, $"NOT(ISERROR(SEARCH(\"{text}\",{firstCell})))"); writer.WriteEndElement(); writer.WriteEndElement();
    }

    private static void WriteDifferentialStyle(XmlWriter writer, string fontColor, string fillColor)
    {
        writer.WriteStartElement("dxf", SpreadsheetNamespace); writer.WriteStartElement("font", SpreadsheetNamespace); writer.WriteElementString("b", SpreadsheetNamespace, string.Empty); writer.WriteStartElement("color", SpreadsheetNamespace); writer.WriteAttributeString("rgb", fontColor); writer.WriteEndElement(); writer.WriteEndElement();
        WriteFill(writer, "solid", fillColor); writer.WriteEndElement();
    }

    private static void WriteKilnDrawing(ZipArchive archive) => WriteXml(archive, "xl/drawings/drawing1.xml", writer =>
    {
        writer.WriteStartElement("xdr", "wsDr", DrawingNamespace); writer.WriteAttributeString("xmlns", "a", null, DrawingMainNamespace); writer.WriteAttributeString("xmlns", "r", null, RelationshipNamespace);
        writer.WriteStartElement("xdr", "twoCellAnchor", DrawingNamespace); writer.WriteAttributeString("editAs", "oneCell");
        WriteAnchorPoint(writer, "from", 0, 0); WriteAnchorPoint(writer, "to", 2, 5);
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
        writer.WriteElementString("xdr", "colOff", DrawingNamespace, "0"); writer.WriteElementString("xdr", "row", DrawingNamespace, row.ToString(CultureInfo.InvariantCulture));
        writer.WriteElementString("xdr", "rowOff", DrawingNamespace, "0"); writer.WriteEndElement();
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
    private static void WriteFont(XmlWriter writer, bool bold, string? sizeColor, string color, int size)
    {
        writer.WriteStartElement("font", SpreadsheetNamespace); if (bold) writer.WriteElementString("b", SpreadsheetNamespace, string.Empty);
        writer.WriteStartElement("sz", SpreadsheetNamespace); writer.WriteAttributeString("val", size.ToString(CultureInfo.InvariantCulture)); writer.WriteEndElement();
        writer.WriteStartElement("color", SpreadsheetNamespace); writer.WriteAttributeString("rgb", color); writer.WriteEndElement(); writer.WriteElementString("name", SpreadsheetNamespace, "Aptos"); writer.WriteEndElement();
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
    private static void WriteXf(XmlWriter writer, int numFmt, int font, int fill, int border, bool apply = false)
    {
        writer.WriteStartElement("xf", SpreadsheetNamespace); writer.WriteAttributeString("numFmtId", numFmt.ToString(CultureInfo.InvariantCulture)); writer.WriteAttributeString("fontId", font.ToString(CultureInfo.InvariantCulture));
        writer.WriteAttributeString("fillId", fill.ToString(CultureInfo.InvariantCulture)); writer.WriteAttributeString("borderId", border.ToString(CultureInfo.InvariantCulture)); writer.WriteAttributeString("xfId", "0");
        if (numFmt != 0) writer.WriteAttributeString("applyNumberFormat", "1"); if (font != 0) writer.WriteAttributeString("applyFont", "1"); if (fill != 0) writer.WriteAttributeString("applyFill", "1");
        if (apply) writer.WriteAttributeString("applyBorder", "1"); writer.WriteEndElement();
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
