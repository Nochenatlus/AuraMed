namespace MriMonitoring.Api.Services;

/// <summary>
/// Günlük döviz kurlarını (USD/TRY, EUR/TRY) <b>mock/simülasyon</b> olarak üretir.
/// Gerçek bir kur servisine bağlı değildir; tutarlar tarihe göre deterministik bir
/// tohumla üretilir, böylece aynı gün her zaman aynı kuru döner ama günden güne
/// gerçekçi küçük dalgalanmalar gösterir.
/// </summary>
public class ExchangeRateService
{
    // Baz kurlar (1 birim döviz = kaç TL). Simülasyonun başlangıç noktası.
    private const double UsdBase = 48.13;
    private const double EurBase = 56.23;
    private const double DailyJitter = 0.05; // ±%3 günlük dalgalanma

    public (double Usd, double Eur) GetDailyRates(DateOnly date)
    {
        // Tarih numarasını tohum alıyoruz: aynı gün -> aynı kur (deterministik mock).
        var rng = new Random(date.DayNumber);
        double Jitter(double basis) => Math.Round(basis * (1 + (rng.NextDouble() * 2 - 1) * DailyJitter), 4);
        return (Jitter(UsdBase), Jitter(EurBase));
    }

    public (double Usd, double Eur) GetTodayRates() => GetDailyRates(DateOnly.FromDateTime(DateTime.UtcNow));

    /// <summary>Bir tutarı kaynak para biriminden, verilen günlük kurlarla TL'ye çevirir.</summary>
    public static double ToTry(string currency, double amount, double usdRate, double eurRate) => currency switch
    {
        "USD" => amount * usdRate,
        "EUR" => amount * eurRate,
        _ => amount // TRY veya bilinmeyen -> olduğu gibi
    };
}
