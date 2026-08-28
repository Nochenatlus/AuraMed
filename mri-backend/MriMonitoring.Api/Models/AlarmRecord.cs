namespace MriMonitoring.Api.Models;

public enum ParameterType
{
    Temperature,
    Humidity,
    Radiation
}

public class AlarmRecord
{
    public int Id { get; set; }
    public int DeviceId { get; set; }
    public Device? Device { get; set; }

    public DateTime Timestamp { get; set; }
    public ParameterType Parameter { get; set; }
    public double Value { get; set; }
    public double ThresholdValue { get; set; }
    public required string Message { get; set; }
}
