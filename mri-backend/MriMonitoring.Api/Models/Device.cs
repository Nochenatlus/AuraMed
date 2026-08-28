namespace MriMonitoring.Api.Models;

public enum DeviceType
{
    Mri,
    Xray
}

public class Device
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Room { get; set; }
    public DeviceType Type { get; set; }
    public required string Manufacturer { get; set; }
    public required string Model { get; set; }
    public required string SerialNumber { get; set; }

    public double TemperatureMin { get; set; }
    public double TemperatureMax { get; set; }
    public double HumidityMin { get; set; }
    public double HumidityMax { get; set; }
    public double RadiationMin { get; set; }
    public double RadiationMax { get; set; }

    /// <summary>Şu anki oda doluluk durumu - sadece anlık gösterim, geçmişi tutulmaz.</summary>
    public bool IsRoomOccupied { get; set; }

    public List<SensorReading> Readings { get; set; } = [];
    public List<AlarmRecord> Alarms { get; set; } = [];
}
