using MriMonitoring.Api.Models;
using QuestPDF.Fluent;
using QuestPDF.Helpers;

namespace MriMonitoring.Api.Services;

public class PdfReportService
{
    public byte[] GenerateAlarmReport(string deviceName, DateTime startDate, DateTime endDate, List<AlarmRecord> records)
    {
        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(30);
                page.DefaultTextStyle(x => x.FontSize(10));

                page.Header().Column(col =>
                {
                    col.Item().Text("AuraMed - Eşik Aşımı (Uyarı) Raporu").FontSize(16).Bold();
                    col.Item().PaddingTop(4).Text($"Cihaz: {deviceName}");
                    col.Item().Text($"Tarih aralığı: {startDate:dd.MM.yyyy HH:mm} - {endDate:dd.MM.yyyy HH:mm}");
                    col.Item().PaddingTop(8).LineHorizontal(1);
                });

                page.Content().PaddingTop(10).Table(table =>
                {
                    table.ColumnsDefinition(columns =>
                    {
                        columns.RelativeColumn(3);
                        columns.RelativeColumn(3);
                        columns.RelativeColumn(2);
                        columns.RelativeColumn(2);
                        columns.RelativeColumn(2);
                    });

                    table.Header(header =>
                    {
                        header.Cell().Text("Tarih/Saat").Bold();
                        header.Cell().Text("Cihaz").Bold();
                        header.Cell().Text("Parametre").Bold();
                        header.Cell().Text("Değer").Bold();
                        header.Cell().Text("Eşik").Bold();
                        header.Cell().ColumnSpan(5).PaddingTop(2).BorderBottom(1);
                    });

                    foreach (var record in records)
                    {
                        table.Cell().Background(Colors.Red.Lighten4).Text(record.Timestamp.ToLocalTime().ToString("dd.MM.yyyy HH:mm:ss"));
                        table.Cell().Background(Colors.Red.Lighten4).Text(record.Device?.Name ?? "-");
                        table.Cell().Background(Colors.Red.Lighten4).Text(GetParameterName(record.Parameter));
                        table.Cell().Background(Colors.Red.Lighten4).Text(FormatValueWithUnit(record.Parameter, record.Value));
                        table.Cell().Background(Colors.Red.Lighten4).Text("> " + FormatValueWithUnit(record.Parameter, record.ThresholdValue));
                    }
                });

                page.Footer().AlignCenter().Text(x =>
                {
                    x.Span("Oluşturulma: ");
                    x.Span(DateTime.Now.ToString("dd.MM.yyyy HH:mm"));
                    x.Span($"  •  Toplam kayıt: {records.Count}");
                });
            });
        });

        return document.GeneratePdf();
    }

    private static string GetParameterName(ParameterType parameter) => parameter switch
    {
        ParameterType.Temperature => "Sıcaklık",
        ParameterType.Humidity => "Nem",
        _ => "Radyasyon Dozu"
    };

    private static string FormatValueWithUnit(ParameterType parameter, double value) => parameter switch
    {
        ParameterType.Temperature => $"{value:0.0} °C",
        ParameterType.Humidity => $"{value:0.0} %RH",
        _ => $"{value:0.00} µSv/h"
    };
}



