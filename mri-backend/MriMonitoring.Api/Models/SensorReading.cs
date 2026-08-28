namespace MriMonitoring.Api.Models;

public class SensorReading
{
    public int Id { get; set; }
    public int DeviceId { get; set; }
    public Device? Device { get; set; }

    public DateTime Timestamp { get; set; }
    public double Temperature { get; set; }
    public double Humidity { get; set; }
    public double RadiationDose { get; set; }
    public bool IsThresholdExceeded { get; set; }
}
