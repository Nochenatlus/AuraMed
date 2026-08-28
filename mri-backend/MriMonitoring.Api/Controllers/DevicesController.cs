using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MriMonitoring.Api.Data;
using MriMonitoring.Api.Models;

namespace MriMonitoring.Api.Controllers;

[ApiController]
[Route("api/devices")]
public class DevicesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<DeviceStatusDto>>> GetAll()
    {
        var devices = await db.Devices.AsNoTracking().ToListAsync();
        var result = new List<DeviceStatusDto>();

        foreach (var device in devices)
        {
            var lastReading = await db.Readings
                .AsNoTracking()
                .Where(r => r.DeviceId == device.Id)
                .OrderByDescending(r => r.Timestamp)
                .FirstOrDefaultAsync();

            result.Add(new DeviceStatusDto(
                device.Id,
                device.Name,
                device.Room,
                device.Type,
                device.Manufacturer,
                device.Model,
                device.SerialNumber,
                device.TemperatureMin,
                device.TemperatureMax,
                device.HumidityMin,
                device.HumidityMax,
                device.RadiationMin,
                device.RadiationMax,
                lastReading?.Temperature,
                lastReading?.Humidity,
                lastReading?.RadiationDose,
                device.IsRoomOccupied,
                lastReading?.Timestamp,
                lastReading?.IsThresholdExceeded ?? false));
        }

        return Ok(result.OrderBy(d => d.Type).ThenBy(d => d.Name));
    }
}
