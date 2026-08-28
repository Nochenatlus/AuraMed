using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MriMonitoring.Api.Data;
using MriMonitoring.Api.Models;

namespace MriMonitoring.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AppDbContext db) : ControllerBase
{
    /// <summary>
    /// Sicil no ilk girişte kaydedilir (self-register); sonraki girişlerde
    /// ad/soyad eşleşmesi kontrol edilir. Şifre kullanılmaz - bu bir
    /// kimliklendirme adımıdır, güvenli kimlik doğrulama değildir.
    /// </summary>
    [HttpPost("verify")]
    public async Task<ActionResult<TechnicianDto>> Verify(TechnicianLoginRequest req)
    {
        var firstName = req.FirstName.Trim();
        var lastName = req.LastName.Trim();
        var employeeId = req.EmployeeId.Trim();

        if (firstName.Length == 0 || lastName.Length == 0 || employeeId.Length == 0)
        {
            return BadRequest("Ad, soyad ve sicil no zorunludur.");
        }

        // Rol: yalnızca "doctor" veya "technician"; boş/geçersizse teknisyen.
        var role = string.Equals(req.Role?.Trim(), "doctor", StringComparison.OrdinalIgnoreCase) ? "doctor" : "technician";

        var existing = await db.Technicians.FirstOrDefaultAsync(t => t.EmployeeId == employeeId);

        if (existing is null)
        {
            var newTechnician = new Technician { FirstName = firstName, LastName = lastName, EmployeeId = employeeId, Role = role };
            db.Technicians.Add(newTechnician);
            await db.SaveChangesAsync();
            return Ok(new TechnicianDto(newTechnician.FirstName, newTechnician.LastName, newTechnician.EmployeeId, newTechnician.Role));
        }

        if (!string.Equals(existing.FirstName, firstName, StringComparison.OrdinalIgnoreCase) ||
            !string.Equals(existing.LastName, lastName, StringComparison.OrdinalIgnoreCase))
        {
            return Conflict("Bu sicil numarası farklı bir isimle kayıtlı.");
        }

        // Mevcut kullanıcı rolünü bu girişte seçtiğiyle günceller (rol değiştirebilsin).
        if (!string.Equals(existing.Role, role, StringComparison.Ordinal))
        {
            existing.Role = role;
            await db.SaveChangesAsync();
        }

        return Ok(new TechnicianDto(existing.FirstName, existing.LastName, existing.EmployeeId, existing.Role));
    }
}
