using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MriMonitoring.Api.Data;
using MriMonitoring.Api.Services;

namespace MriMonitoring.Api.Controllers;

[ApiController]
[Route("api/reports")]
public class ReportsController(AppDbContext db, PdfReportService pdfReportService) : ControllerBase
{
    [HttpGet("pdf")]
    public async Task<IActionResult> Pdf(
        [FromQuery] int? deviceId,
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate)
    {
        var startDateUtc = DateTime.SpecifyKind(startDate, DateTimeKind.Utc);
        var endDateUtc = DateTime.SpecifyKind(endDate, DateTimeKind.Utc);

        string deviceName = "Tüm Cihazlar";
        if (deviceId is > 0)
        {
            var device = await db.Devices.AsNoTracking().FirstOrDefaultAsync(d => d.Id == deviceId);
            if (device is null)
            {
                return NotFound("Cihaz bulunamadı.");
            }
            deviceName = device.Name;
        }

        var query = db.Alarms
            .AsNoTracking()
            .Include(a => a.Device)
            .Where(a => a.Timestamp >= startDateUtc && a.Timestamp <= endDateUtc);

        if (deviceId is > 0)
        {
            query = query.Where(a => a.DeviceId == deviceId);
        }

        var records = await query.OrderBy(a => a.Timestamp).ToListAsync();

        var pdfBytes = pdfReportService.GenerateAlarmReport(deviceName, startDateUtc, endDateUtc, records);
        var fileName = $"uyari-raporu_{startDateUtc:yyyyMMdd}_{endDateUtc:yyyyMMdd}.pdf";

        return File(pdfBytes, "application/pdf", fileName);
    }
}
