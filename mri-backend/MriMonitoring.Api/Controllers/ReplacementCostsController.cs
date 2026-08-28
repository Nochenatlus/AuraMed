using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MriMonitoring.Api.Data;
using MriMonitoring.Api.Models;
using MriMonitoring.Api.Services;

namespace MriMonitoring.Api.Controllers;

/// <summary>
/// Cihaz değişimine karar verildiğinde oluşan maliyet kalemlerini günlük (mock) kur
/// üzerinden hesaplar, simüle eder ve veritabanına kaydeder. Cihaz bilgisi frontend
/// cihaz kataloğundan gelir ve snapshot olarak saklanır (Devices tablosuna bağlı değil).
/// </summary>
[ApiController]
[Route("api/replacement-costs")]
public class ReplacementCostsController(
    AppDbContext db,
    ExchangeRateService rates,
    ReplacementCostSimulator simulator) : ControllerBase
{
    /// <summary>Bugünün mock günlük kurları (USD/TRY, EUR/TRY).</summary>
    [HttpGet("rates")]
    public ActionResult<DailyRatesDto> GetRates()
    {
        var (usd, eur) = rates.GetTodayRates();
        return Ok(new DailyRatesDto(DateTime.UtcNow.Date, usd, eur));
    }

    /// <summary>
    /// Verilen cihaz tipi için mock maliyet kalemlerini bugünün kuruyla hesaplayıp döner.
    /// Kayıt yapmaz; frontend bunu düzenleyip sonra POST ile kaydedebilir.
    /// </summary>
    [HttpGet("simulate")]
    public ActionResult<ReplacementEstimateDto> Simulate([FromQuery] string type)
    {
        if (string.IsNullOrWhiteSpace(type))
        {
            return BadRequest("Cihaz tipi (type) zorunludur.");
        }

        var (usd, eur) = rates.GetTodayRates();
        var items = simulator.Simulate(type.Trim(), usd, eur);
        var total = Math.Round(items.Sum(i => i.AmountTry), 2);

        var dto = new ReplacementEstimateDto(
            Id: null,
            DeviceKey: string.Empty,
            DeviceName: string.Empty,
            DeviceType: type.Trim(),
            Reason: null,
            CreatedBy: string.Empty,
            CreatedAt: null,
            UsdRate: usd,
            EurRate: eur,
            TotalTry: total,
            Items: items.Select(i => new CostItemDto(i.Name, i.Category, i.Currency, i.Amount, i.AmountTry)).ToList());

        return Ok(dto);
    }

    /// <summary>Kayıtlı hesapların özet listesi (en yeni önce).</summary>
    [HttpGet]
    public async Task<ActionResult<List<EstimateSummaryDto>>> GetAll()
    {
        var list = await db.ReplacementCostEstimates
            .AsNoTracking()
            .OrderByDescending(e => e.CreatedAt)
            .Select(e => new EstimateSummaryDto(
                e.Id, e.DeviceKey, e.DeviceName, e.DeviceType, e.Reason, e.CreatedBy,
                e.CreatedAt, e.TotalTry, e.Items.Count))
            .ToListAsync();

        return Ok(list);
    }

    /// <summary>Tek bir kayıtlı hesabın kalem detaylarıyla tam gösterimi.</summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ReplacementEstimateDto>> GetById(int id)
    {
        var e = await db.ReplacementCostEstimates
            .AsNoTracking()
            .Include(x => x.Items)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (e is null)
        {
            return NotFound("Hesap bulunamadı.");
        }

        return Ok(ToDto(e));
    }

    /// <summary>
    /// Bir maliyet hesabını kaydeder. TL karşılıkları ve toplam, güvenlik için
    /// istemciden gelen değere güvenilmeden o günün kuruyla sunucuda hesaplanır;
    /// kullanılan kurlar ve cihaz bilgisi snapshot olarak saklanır.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ReplacementEstimateDto>> Create(CreateEstimateRequest req)
    {
        var createdBy = (req.CreatedBy ?? string.Empty).Trim();
        if (createdBy.Length == 0)
        {
            return BadRequest("Oluşturan teknisyen bilgisi zorunludur.");
        }

        var deviceName = (req.DeviceName ?? string.Empty).Trim();
        if (deviceName.Length == 0)
        {
            return BadRequest("Cihaz bilgisi zorunludur.");
        }

        if (req.Items is null || req.Items.Count == 0)
        {
            return BadRequest("En az bir maliyet kalemi girilmelidir.");
        }

        foreach (var item in req.Items)
        {
            if (string.IsNullOrWhiteSpace(item.Name))
            {
                return BadRequest("Kalem adı boş olamaz.");
            }
            if (!CostCategories.Currencies.Contains(item.Currency))
            {
                return BadRequest($"Geçersiz para birimi: {item.Currency}. Geçerli: {string.Join(", ", CostCategories.Currencies)}.");
            }
            if (item.Amount < 0)
            {
                return BadRequest("Tutar negatif olamaz.");
            }
        }

        var (usd, eur) = rates.GetTodayRates();

        var estimate = new ReplacementCostEstimate
        {
            DeviceKey = (req.DeviceKey ?? string.Empty).Trim(),
            DeviceName = deviceName,
            DeviceType = (req.DeviceType ?? string.Empty).Trim(),
            Reason = string.IsNullOrWhiteSpace(req.Reason) ? null : req.Reason.Trim(),
            CreatedBy = createdBy,
            CreatedAt = DateTime.UtcNow,
            UsdRate = usd,
            EurRate = eur,
            Items = req.Items.Select(i =>
            {
                var amount = Math.Round(i.Amount, 2);
                return new ReplacementCostItem
                {
                    Name = i.Name.Trim(),
                    Category = i.Category,
                    Currency = i.Currency,
                    Amount = amount,
                    AmountTry = Math.Round(ExchangeRateService.ToTry(i.Currency, amount, usd, eur), 2)
                };
            }).ToList()
        };
        estimate.TotalTry = Math.Round(estimate.Items.Sum(i => i.AmountTry), 2);

        db.ReplacementCostEstimates.Add(estimate);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = estimate.Id }, ToDto(estimate));
    }

    /// <summary>Kayıtlı bir hesabı (ve kalemlerini) siler.</summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var e = await db.ReplacementCostEstimates.FirstOrDefaultAsync(x => x.Id == id);
        if (e is null)
        {
            return NotFound();
        }

        db.ReplacementCostEstimates.Remove(e);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static ReplacementEstimateDto ToDto(ReplacementCostEstimate e) => new(
        e.Id, e.DeviceKey, e.DeviceName, e.DeviceType, e.Reason, e.CreatedBy, e.CreatedAt,
        e.UsdRate, e.EurRate, e.TotalTry,
        e.Items.Select(i => new CostItemDto(i.Name, i.Category, i.Currency, i.Amount, i.AmountTry)).ToList());
}
