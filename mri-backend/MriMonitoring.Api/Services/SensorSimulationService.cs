using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using MriMonitoring.Api.Data;
using MriMonitoring.Api.Hubs;
using MriMonitoring.Api.Models;

namespace MriMonitoring.Api.Services;

/// Gerçek sensör donanımı olmadığından oda sıcaklık/nem/radyasyon
/// değerlerini random-walk ile simüle eder; ~%5 ihtimalle demo amaçlı
/// eşik-dışı değer üretir. Oda doluluk durumu da düşük ihtimalle değişir.

public class SensorSimulationService(
    IServiceScopeFactory scopeFactory,
    IHubContext<SensorHub> hubContext,
    ILogger<SensorSimulationService> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromSeconds(5);
    private readonly Random _random = new();
    private readonly Dictionary<int, (double Temperature, double Humidity, double Radiation)> _lastValues = new();
    private readonly Dictionary<int, bool> _roomOccupied = new();


    /// Şu anda eşik dışında olan (cihaz, parametre) çiftleri - ilk tespit ile
    /// devam eden ihlali ayırt etmek için.

    private readonly HashSet<(int DeviceId, ParameterType Parameter)> _activeViolations = new();

    /// <summary>Bir (cihaz, parametre) çiftinin arka arkaya kaç turdur eşik dışında olduğu.</summary>
    private readonly Dictionary<(int DeviceId, ParameterType Parameter), int> _consecutiveCounts = new();

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Cihaz listesi + başlangıç değerleri her seferinde tekrar sorgulamamak için ilk turda yüklenir.
        using (var scope = scopeFactory.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            DbSeeder.Seed(db);

            foreach (var device in db.Devices.AsNoTracking())
            {
                _lastValues[device.Id] = (
                    (device.TemperatureMin + device.TemperatureMax) / 2,
                    (device.HumidityMin + device.HumidityMax) / 2,
                    device.RadiationMax / 2);
                _roomOccupied[device.Id] = device.IsRoomOccupied;
            }
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await GenerateReadingBatch(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Sensör simülasyon turu başarısız oldu");
            }

            await Task.Delay(Interval, stoppingToken);
        }
    }

    private async Task GenerateReadingBatch(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var devices = await db.Devices.ToListAsync(ct);

        foreach (var device in devices)
        {
            var (previousTemperature, previousHumidity, previousRadiation) = _lastValues.TryGetValue(device.Id, out var v)
                ? v
                : ((device.TemperatureMin + device.TemperatureMax) / 2, (device.HumidityMin + device.HumidityMax) / 2, device.RadiationMax / 2);

            var newTemperature = RandomWalk(previousTemperature, device.TemperatureMin, device.TemperatureMax, 0.3);
            var newHumidity = RandomWalk(previousHumidity, device.HumidityMin, device.HumidityMax, 1.0);
            var newRadiation = RandomWalk(previousRadiation, 0, device.RadiationMax, device.RadiationMax * 0.05);
            newRadiation = Math.Max(0, newRadiation);

            // Demoda uyarıyı görebilmek için düşük ihtimalle bilinçli eşik-dışı değer ürettiğimiz kısım.
            if (_random.NextDouble() < 0.05)
            {
                switch (_random.Next(3))
                {
                    case 0:
                        newTemperature = device.TemperatureMax + 1 + _random.NextDouble() * 2;
                        break;
                    case 1:
                        newHumidity = device.HumidityMax + 3 + _random.NextDouble() * 5;
                        break;
                    default:
                        newRadiation = device.RadiationMax + device.RadiationMax * 0.2 + _random.NextDouble() * device.RadiationMax * 0.3;
                        break;
                }
            }

            _lastValues[device.Id] = (newTemperature, newHumidity, newRadiation);

            // Oda doluluğu nadiren değişir (gerçekçi olması için).
            var isRoomOccupied = _roomOccupied.GetValueOrDefault(device.Id, device.IsRoomOccupied);
            if (_random.NextDouble() < 0.03)
            {
                isRoomOccupied = !isRoomOccupied;
            }
            _roomOccupied[device.Id] = isRoomOccupied;
            device.IsRoomOccupied = isRoomOccupied;

            var temperatureExceeded = newTemperature < device.TemperatureMin || newTemperature > device.TemperatureMax;
            var humidityExceeded = newHumidity < device.HumidityMin || newHumidity > device.HumidityMax;
            var radiationExceeded = newRadiation > device.RadiationMax;
            var isThresholdExceeded = temperatureExceeded || humidityExceeded || radiationExceeded;
            var timestamp = DateTime.UtcNow;

            db.Readings.Add(new SensorReading
            {
                DeviceId = device.Id,
                Timestamp = timestamp,
                Temperature = newTemperature,
                Humidity = newHumidity,
                RadiationDose = newRadiation,
                IsThresholdExceeded = isThresholdExceeded
            });

            await hubContext.Clients.All.SendAsync(
                "ReceiveReading",
                new ReadingBroadcastDto(device.Id, device.Name, device.Room, newTemperature, newHumidity, newRadiation, isRoomOccupied, timestamp, isThresholdExceeded),
                ct);

            await ProcessViolation(db, device, ParameterType.Temperature, temperatureExceeded, newTemperature,
                newTemperature > device.TemperatureMax ? device.TemperatureMax : device.TemperatureMin, timestamp, ct);

            await ProcessViolation(db, device, ParameterType.Humidity, humidityExceeded, newHumidity,
                newHumidity > device.HumidityMax ? device.HumidityMax : device.HumidityMin, timestamp, ct);

            await ProcessViolation(db, device, ParameterType.Radiation, radiationExceeded, newRadiation, device.RadiationMax, timestamp, ct);
        }

        await db.SaveChangesAsync(ct);
    }

    /// Bir (cihaz, parametre) çiftinin eşik durumunu değerlendirir:
    /// - İlk kez eşik dışına çıkıyorsa "ReceiveAlarm" yayınlanır (frontend'de
    ///   modal + ses tetikler).
    /// - ihlal hala devam ediyorsa "ReceiveAlarmOngoing" yayınlanıyor.
    /// - İhlal sona erdiyse "ReceiveAlarmCleared" yayınlanacak.
    /// Her iki durumda da (ilk/devam) denetim amacıyla AlarmRecord'a yazılır.

    private async Task ProcessViolation(
        AppDbContext db,
        Device device,
        ParameterType parameter,
        bool isExceeded,
        double value,
        double thresholdValue,
        DateTime timestamp,
        CancellationToken ct)
    {
        var key = (device.Id, parameter);
        var wasAlreadyActive = _activeViolations.Contains(key);

        if (!isExceeded)
        {
            if (wasAlreadyActive)
            {
                _activeViolations.Remove(key);
                _consecutiveCounts.Remove(key);
                await hubContext.Clients.All.SendAsync("ReceiveAlarmCleared", new AlarmClearedDto(device.Id, parameter), ct);
            }
            return;
        }

        var consecutiveCount = _consecutiveCounts.GetValueOrDefault(key) + 1;
        _consecutiveCounts[key] = consecutiveCount;

        var parameterName = parameter switch
        {
            ParameterType.Temperature => "Sıcaklık",
            ParameterType.Humidity => "Nem",
            _ => "Radyasyon Dozu"
        };
        var message = $"{device.Name} ({device.Room}) - {parameterName} eşik değerini aştı: {value:0.0}";

        db.Alarms.Add(new AlarmRecord
        {
            DeviceId = device.Id,
            Timestamp = timestamp,
            Parameter = parameter,
            Value = value,
            ThresholdValue = thresholdValue,
            Message = message
        });

        var dto = new AlarmBroadcastDto(device.Id, device.Name, device.Room, parameter, value, thresholdValue, message, timestamp, consecutiveCount);

        if (wasAlreadyActive)
        {
            await hubContext.Clients.All.SendAsync("ReceiveAlarmOngoing", dto, ct);
        }
        else
        {
            _activeViolations.Add(key);
            await hubContext.Clients.All.SendAsync("ReceiveAlarm", dto, ct);
        }
    }

    private double RandomWalk(double current, double min, double max, double stepSize)
    {
        var center = (min + max) / 2;
        var rangeSize = Math.Max(max - min, 1);

        // Saf random-walk sınırsız sürüklenir; değeri banda doğru hafifçe
        // geri çeken bir terim olmadan zamanla eşiğin tamamen dışına çıkar.
        var pullback = (center - current) * 0.1;
        var step = (_random.NextDouble() - 0.5) * 2 * stepSize;
        var next = current + step + pullback;

        // Değeri çoğunlukla eşik bandı içinde tut, nadiren hafif taşabilsin.
        var lowerBound = min - rangeSize * 0.15;
        var upperBound = max + rangeSize * 0.15;
        return Math.Clamp(next, lowerBound, upperBound);
    }
}

