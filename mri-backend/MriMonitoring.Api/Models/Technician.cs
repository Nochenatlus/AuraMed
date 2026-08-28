namespace MriMonitoring.Api.Models;

public class Technician
{
    public int Id { get; set; }
    public required string FirstName { get; set; }
    public required string LastName { get; set; }
    public required string EmployeeId { get; set; }

    /// <summary>Kullanıcı rolü: "technician" veya "doctor". Varsayılan teknisyen.</summary>
    public string Role { get; set; } = "technician";
}
