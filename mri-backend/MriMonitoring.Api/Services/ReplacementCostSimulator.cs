using MriMonitoring.Api.Models;

namespace MriMonitoring.Api.Services;

/// <summary>
/// Bir cihazın değiştirilmesine karar verildiğinde oluşacak maliyet kalemlerini
/// <b>mock data</b> ile üretir. Kalemler ortak bir şablondan gelir; cihaz tipine
/// göre bir ölçek çarpanıyla büyür/küçülür (ör. PET-CT en pahalı, Ultrason en ucuz),
/// böylece "simülasyon" her tip için gerçekçi ama tekrarlanabilir olur.
/// </summary>
public class ReplacementCostSimulator
{
    private record Template(string Name, string Category, string Currency, double Amount);

    // MRI'yi referans alan ortak kalem şablonu; tutarlar tipe göre ölçeklenir.
    private static readonly Template[] BaseTemplate =
    [
        new("Yeni cihaz alımı",               "purchase",     "USD", 1_250_000),
        new("Eski cihazın sökümü ve imhası",  "decommission", "TRY",   420_000),
        new("Kurulum, montaj ve ekranlama",   "installation", "EUR",    85_000),
        new("Kalibrasyon ve kabul testleri",  "calibration",  "USD",    18_000),
        new("Yedek parça ve sarf malzeme",    "parts",        "EUR",    32_000),
        new("Teknik ekip işçiliği",           "labor",        "TRY",   210_000),
        new("Nakliye, kaldırma ve sigorta",   "transport",    "USD",    28_000),
    ];

    // Cihaz tipine göre yeni cihaz alım bazı (USD). Diğer kalemler bu orana göre ölçeklenir.
    private static readonly Dictionary<string, double> PurchaseBaseUsd = new()
    {
        ["PET-CT"]  = 1_600_000,
        ["MRI"]     = 1_250_000,
        ["BT"]      =   650_000,
        ["Röntgen"] =   180_000,
        ["Ultrason"] =   90_000,
    };

    private const double ReferenceBaseUsd = 1_250_000; // BaseTemplate'in purchase tutarı

    /// <summary>
    /// Verilen cihaz tipi ve günlük kurlar için mock maliyet kalemlerini, TL karşılıklarıyla üretir.
    /// Kayıt yapılmaz; yalnızca önerilen (düzenlenebilir) kalemler döner.
    /// </summary>
    public List<ReplacementCostItem> Simulate(string deviceType, double usdRate, double eurRate)
    {
        var baseUsd = PurchaseBaseUsd.TryGetValue(deviceType, out var b) ? b : 180_000;
        var scale = baseUsd / ReferenceBaseUsd;

        return BaseTemplate.Select((t, idx) =>
        {
            var name = idx == 0 ? $"Yeni cihaz alımı ({deviceType})" : t.Name;
            var amount = Math.Round(t.Amount * scale, 2);
            return new ReplacementCostItem
            {
                Name = name,
                Category = t.Category,
                Currency = t.Currency,
                Amount = amount,
                AmountTry = Math.Round(ExchangeRateService.ToTry(t.Currency, amount, usdRate, eurRate), 2)
            };
        }).ToList();
    }
}
