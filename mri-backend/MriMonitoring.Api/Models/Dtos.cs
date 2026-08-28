namespace MriMonitoring.Api.Models;

public record DeviceStatusDto(
    int DeviceId,
    string Name,
    string Room,
    DeviceType Type,
    string Manufacturer,
    string Model,
    string SerialNumber,
    double TemperatureMin,
    double TemperatureMax,
    double HumidityMin,
    double HumidityMax,
    double RadiationMin,
    double RadiationMax,
    double? LastTemperature,
    double? LastHumidity,
    double? LastRadiation,
    bool IsRoomOccupied,
    DateTime? LastUpdated,
    bool IsThresholdExceeded);

public record ReadingBroadcastDto(
    int DeviceId,
    string Name,
    string Room,
    double Temperature,
    double Humidity,
    double RadiationDose,
    bool IsRoomOccupied,
    DateTime Timestamp,
    bool IsThresholdExceeded);

public record AlarmBroadcastDto(
    int DeviceId,
    string Name,
    string Room,
    ParameterType Parameter,
    double Value,
    double ThresholdValue,
    string Message,
    DateTime Timestamp,
    int ConsecutiveCount);

public record AlarmClearedDto(int DeviceId, ParameterType Parameter);

public record AlarmHistoryDto(
    DateTime Timestamp,
    int DeviceId,
    string DeviceName,
    ParameterType Parameter,
    double Value,
    double ThresholdValue);

public record TechnicianLoginRequest(string FirstName, string LastName, string EmployeeId, string? Role);

public record TechnicianDto(string FirstName, string LastName, string EmployeeId, string Role);

// ---- Randevu / Çekim iş akışı ----

public record AppointmentDto(
    int Id,
    string DeviceKey,
    string DeviceName,
    string DeviceType,
    string PatientName,
    string? PatientProtocolNo,
    DateTime ScheduledStart,
    int DurationMinutes,
    DateTime ScheduledEnd,
    string Status,
    string? Notes,
    string CreatedBy,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record CreateAppointmentRequest(
    string DeviceKey,
    string DeviceName,
    string DeviceType,
    string PatientName,
    string? PatientProtocolNo,
    DateTime ScheduledStart,
    int DurationMinutes,
    string? Notes,
    string CreatedBy);

public record ChangeStatusRequest(string Status);

/// <summary>Müsaitlik sorgusu sonucu — çakışan randevular ve dolu ise en yakın müsait başlangıç.</summary>
public record AvailabilityDto(bool Available, List<AppointmentDto> Conflicts, DateTime? SuggestedStart);

// ---- Cihaz değişim maliyeti (Replacement Cost) ----

public record DailyRatesDto(DateTime Date, double UsdTry, double EurTry);

public record CostItemDto(string Name, string Category, string Currency, double Amount, double AmountTry);

/// <summary>Simülasyon veya kayıtlı hesabın tam gösterimi (kalemler dahil).</summary>
public record ReplacementEstimateDto(
    int? Id,
    string DeviceKey,
    string DeviceName,
    string DeviceType,
    string? Reason,
    string CreatedBy,
    DateTime? CreatedAt,
    double UsdRate,
    double EurRate,
    double TotalTry,
    List<CostItemDto> Items);

/// <summary>Liste görünümü için özet (kalem detayı olmadan).</summary>
public record EstimateSummaryDto(
    int Id,
    string DeviceKey,
    string DeviceName,
    string DeviceType,
    string? Reason,
    string CreatedBy,
    DateTime CreatedAt,
    double TotalTry,
    int ItemCount);

// POST gövdesi — tutarlar kaynak para biriminde gelir; TL karşılığı ve toplam
// sunucuda o günün kuruyla yeniden hesaplanıp snapshot olarak kaydedilir.
public record CreateEstimateRequest(
    string DeviceKey,
    string DeviceName,
    string DeviceType,
    string? Reason,
    string CreatedBy,
    List<CreateCostItemRequest> Items);

public record CreateCostItemRequest(string Name, string Category, string Currency, double Amount);
