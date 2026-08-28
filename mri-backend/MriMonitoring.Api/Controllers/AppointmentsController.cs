using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using MriMonitoring.Api.Data;
using MriMonitoring.Api.Hubs;
using MriMonitoring.Api.Models;

namespace MriMonitoring.Api.Controllers;

/// <summary>
/// Çekim istemi / randevu iş akışı: müsaitlik sorgusu ile çakışmasız randevu oluşturma,
/// katılım (Geldi/Gelmedi) ve çekim/raporlama aşamaları arasında geçiş. Değişiklikler
/// WorkflowHub üzerinden tüm istemcilere anlık yayınlanır.
/// </summary>
[ApiController]
[Route("api/appointments")]
public class AppointmentsController(AppDbContext db, IHubContext<WorkflowHub> hub) : ControllerBase
{
    /// <summary>
    /// Randevuları listeler. Opsiyonel filtreler: gün (date, yerel gün başlangıcı UTC verilir),
    /// cihaz (deviceKey) ve aşama grubu (scope=technician: çekim öncesi/çekim aşamaları,
    /// scope=doctor: görüntü/raporlama aşamaları).
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<AppointmentDto>>> GetAll(
        [FromQuery] string? deviceKey,
        [FromQuery] string? status,
        [FromQuery] string? scope)
    {
        var query = db.Appointments.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(deviceKey))
        {
            query = query.Where(a => a.DeviceKey == deviceKey);
        }
        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(a => a.Status == status);
        }

        var list = await query.OrderBy(a => a.ScheduledStart).ToListAsync();

        // Aşama grubu filtresi (bellek içinde — küçük veri).
        if (string.Equals(scope, "doctor", StringComparison.OrdinalIgnoreCase))
        {
            var doctorStages = new[] { AppointmentStatuses.ImageCreated, AppointmentStatuses.ImageEvaluation, AppointmentStatuses.Reporting, AppointmentStatuses.Approved };
            list = list.Where(a => doctorStages.Contains(a.Status)).ToList();
        }
        else if (string.Equals(scope, "technician", StringComparison.OrdinalIgnoreCase))
        {
            var techStages = new[] { AppointmentStatuses.Scheduled, AppointmentStatuses.Waiting, AppointmentStatuses.Running, AppointmentStatuses.NotArrived, AppointmentStatuses.Cancelled };
            list = list.Where(a => techStages.Contains(a.Status)).ToList();
        }

        return Ok(list.Select(ToDto).ToList());
    }

    /// <summary>
    /// Bir cihazın belirli [start, start+durationMinutes) aralığında müsait olup olmadığını,
    /// çakışan randevularla birlikte döner. İptal/Gelmedi randevular slotu meşgul etmez.
    /// </summary>
    [HttpGet("availability")]
    public async Task<ActionResult<AvailabilityDto>> CheckAvailability(
        [FromQuery] string deviceKey,
        [FromQuery] DateTime start,
        [FromQuery] int durationMinutes,
        [FromQuery] int? excludeId)
    {
        if (string.IsNullOrWhiteSpace(deviceKey))
        {
            return BadRequest("Cihaz (deviceKey) zorunludur.");
        }
        if (durationMinutes <= 0)
        {
            return BadRequest("Süre (durationMinutes) 0'dan büyük olmalıdır.");
        }

        var startUtc = DateTime.SpecifyKind(start, DateTimeKind.Utc);
        var conflicts = await FindConflicts(deviceKey, startUtc, durationMinutes, excludeId);
        DateTime? suggested = conflicts.Count == 0 ? null : Utc(await FindNearestAvailable(deviceKey, startUtc, durationMinutes, excludeId));
        return Ok(new AvailabilityDto(conflicts.Count == 0, conflicts.Select(ToDto).ToList(), suggested));
    }

    /// <summary>Çakışmasızsa yeni randevu oluşturur; çakışma varsa 409 (Conflict) döner.</summary>
    [HttpPost]
    public async Task<ActionResult<AppointmentDto>> Create(CreateAppointmentRequest req)
    {
        var patient = (req.PatientName ?? string.Empty).Trim();
        var deviceKey = (req.DeviceKey ?? string.Empty).Trim();
        var createdBy = (req.CreatedBy ?? string.Empty).Trim();

        if (patient.Length == 0) return BadRequest("Hasta adı zorunludur.");
        if (deviceKey.Length == 0) return BadRequest("Cihaz zorunludur.");
        if (createdBy.Length == 0) return BadRequest("Oluşturan kişi zorunludur.");
        if (req.DurationMinutes <= 0) return BadRequest("Süre 0'dan büyük olmalıdır.");

        // Dakikaya yuvarla — randevular dakika hassasiyetinde tutulur (saniye taşması çakışmayı bozmasın).
        var startRaw = DateTime.SpecifyKind(req.ScheduledStart, DateTimeKind.Utc);
        var start = new DateTime(startRaw.Year, startRaw.Month, startRaw.Day, startRaw.Hour, startRaw.Minute, 0, DateTimeKind.Utc);

        var conflicts = await FindConflicts(deviceKey, start, req.DurationMinutes, null);
        if (conflicts.Count > 0)
        {
            var suggested = Utc(await FindNearestAvailable(deviceKey, start, req.DurationMinutes, null));
            return Conflict(new AvailabilityDto(false, conflicts.Select(ToDto).ToList(), suggested));
        }

        var now = DateTime.UtcNow;
        var appointment = new Appointment
        {
            DeviceKey = deviceKey,
            DeviceName = (req.DeviceName ?? string.Empty).Trim(),
            DeviceType = (req.DeviceType ?? string.Empty).Trim(),
            PatientName = patient,
            PatientProtocolNo = string.IsNullOrWhiteSpace(req.PatientProtocolNo) ? null : req.PatientProtocolNo.Trim(),
            ScheduledStart = start,
            DurationMinutes = req.DurationMinutes,
            ScheduledEnd = start.AddMinutes(req.DurationMinutes),
            Status = AppointmentStatuses.Scheduled,
            Notes = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim(),
            CreatedBy = createdBy,
            CreatedAt = now,
            UpdatedAt = now
        };

        db.Appointments.Add(appointment);
        await db.SaveChangesAsync();

        var dto = ToDto(appointment);
        await hub.Clients.All.SendAsync("AppointmentChanged", dto);
        return CreatedAtAction(nameof(GetById), new { id = appointment.Id }, dto);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<AppointmentDto>> GetById(int id)
    {
        var a = await db.Appointments.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        return a is null ? NotFound() : Ok(ToDto(a));
    }

    /// <summary>
    /// Randevunun durumunu değiştirir (katılım işaretleme ve çekim/raporlama aşamaları).
    /// Yalnızca geçerli geçişlere izin verilir; değişiklik anlık yayınlanır.
    /// </summary>
    [HttpPost("{id:int}/status")]
    public async Task<ActionResult<AppointmentDto>> ChangeStatus(int id, ChangeStatusRequest req)
    {
        var target = (req.Status ?? string.Empty).Trim();
        if (!AppointmentStatuses.IsValid(target))
        {
            return BadRequest($"Geçersiz durum: {target}.");
        }

        var appointment = await db.Appointments.FirstOrDefaultAsync(x => x.Id == id);
        if (appointment is null) return NotFound();

        if (!AppointmentStatuses.CanTransition(appointment.Status, target))
        {
            return BadRequest($"'{appointment.Status}' durumundan '{target}' durumuna geçilemez.");
        }

        appointment.Status = target;
        appointment.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var dto = ToDto(appointment);
        await hub.Clients.All.SendAsync("AppointmentChanged", dto);
        return Ok(dto);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var appointment = await db.Appointments.FirstOrDefaultAsync(x => x.Id == id);
        if (appointment is null) return NotFound();

        db.Appointments.Remove(appointment);
        await db.SaveChangesAsync();

        await hub.Clients.All.SendAsync("AppointmentDeleted", id);
        return NoContent();
    }

    /// <summary>
    /// Verilen aralıkla çakışan, slotu meşgul eden randevuları bulur.
    /// Çakışma: existing.Start &lt; newEnd VE existing.End &gt; newStart.
    /// </summary>
    private async Task<List<Appointment>> FindConflicts(string deviceKey, DateTime start, int durationMinutes, int? excludeId)
    {
        var end = start.AddMinutes(durationMinutes);
        var sameDevice = await db.Appointments.AsNoTracking()
            .Where(a => a.DeviceKey == deviceKey && (excludeId == null || a.Id != excludeId))
            .ToListAsync();

        return sameDevice
            .Where(a => AppointmentStatuses.OccupiesSlot(a.Status) && a.ScheduledStart < end && a.ScheduledEnd > start)
            .OrderBy(a => a.ScheduledStart)
            .ToList();
    }

    /// <summary>
    /// Verilen başlangıçtan itibaren (dahil) çakışma olmayan en yakın başlangıç saatini bulur.
    /// Çakışan bloğun bittiği ana atlayarak ilerler; slotu meşgul etmeyenleri (İptal/Gelmedi) yok sayar.
    /// </summary>
    private async Task<DateTime> FindNearestAvailable(string deviceKey, DateTime start, int durationMinutes, int? excludeId)
    {
        var occupying = (await db.Appointments.AsNoTracking()
                .Where(a => a.DeviceKey == deviceKey && (excludeId == null || a.Id != excludeId))
                .ToListAsync())
            .Where(a => AppointmentStatuses.OccupiesSlot(a.Status))
            .OrderBy(a => a.ScheduledStart)
            .ToList();

        var candidate = start;
        // Her turda mevcut adayla çakışan randevuların en geç bitişine atlar; sonlu sayıda randevu olduğu için sonlanır.
        while (true)
        {
            var end = candidate.AddMinutes(durationMinutes);
            var overlap = occupying.Where(a => a.ScheduledStart < end && a.ScheduledEnd > candidate).ToList();
            if (overlap.Count == 0)
            {
                return candidate;
            }
            candidate = overlap.Max(a => a.ScheduledEnd);
        }
    }

    // SQLite'tan okunan DateTime'lar Kind=Unspecified döner; UTC olarak işaretliyoruz ki
    // JSON'a 'Z' ekiyle serileşsin ve frontend yerel saate doğru çevirsin (saat kayması olmaz).
    private static DateTime Utc(DateTime d) => DateTime.SpecifyKind(d, DateTimeKind.Utc);

    private static AppointmentDto ToDto(Appointment a) => new(
        a.Id, a.DeviceKey, a.DeviceName, a.DeviceType, a.PatientName, a.PatientProtocolNo,
        Utc(a.ScheduledStart), a.DurationMinutes, Utc(a.ScheduledEnd), a.Status, a.Notes,
        a.CreatedBy, Utc(a.CreatedAt), Utc(a.UpdatedAt));
}
