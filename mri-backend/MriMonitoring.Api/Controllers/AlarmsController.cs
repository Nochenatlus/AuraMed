using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MriMonitoring.Api.Data;
using MriMonitoring.Api.Models;

namespace MriMonitoring.Api.Controllers;

[ApiController]
[Route("api/alarms")]
public class AlarmsController(AppDbContext db) : ControllerBase
{
    [HttpGet("history")]
    public async Task<ActionResult<List<AlarmHistoryDto>>> GetHistory(
        [FromQuery] int? deviceId,
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate)
    {
        var startDateUtc = DateTime.SpecifyKind(startDate, DateTimeKind.Utc);
        var endDateUtc = DateTime.SpecifyKind(endDate, DateTimeKind.Utc);

        var query = db.Alarms
            .AsNoTracking()
            .Include(a => a.Device)
            .Where(a => a.Timestamp >= startDateUtc && a.Timestamp <= endDateUtc);

        if (deviceId is > 0)
        {
            query = query.Where(a => a.DeviceId == deviceId);
        }

        var records = await query
            .OrderByDescending(a => a.Timestamp)
            .Select(a => new AlarmHistoryDto(a.Timestamp, a.DeviceId, a.Device!.Name, a.Parameter, a.Value, a.ThresholdValue))
            .ToListAsync();

        return Ok(records);
    }

    [HttpGet("latest")]
    public async Task<ActionResult<AlarmHistoryDto>> GetLatest()
    {
        var latest = await db.Alarms
            .AsNoTracking()
            .Include(a => a.Device)
            .OrderByDescending(a => a.Timestamp)
            .Select(a => new AlarmHistoryDto(a.Timestamp, a.DeviceId, a.Device!.Name, a.Parameter, a.Value, a.ThresholdValue))
            .FirstOrDefaultAsync();

        return latest is null ? NotFound() : Ok(latest);
    }
}
