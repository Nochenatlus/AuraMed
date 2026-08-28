namespace MriMonitoring.Api.Models;

/// <summary>
/// Bir cihazın değiştirilmesine karar verildiğinde oluşturulan maliyet hesabı.
/// Cihaz bilgisi ve hesaplama anındaki günlük kurlar anlık (snapshot) saklanır;
/// cihaz kataloğu veya kur sonradan değişse bile kayıt bozulmaz. Cihaz, frontend
/// cihaz kataloğuyla (DEVICES) eşleşen bir anahtar/ad/tip ile tutulur.
/// </summary>
public class ReplacementCostEstimate
{
    public int Id { get; set; }

    /// <summary>Frontend cihaz kimliği (ör. "mri1", "petct1").</summary>
    public required string DeviceKey { get; set; }
    public required string DeviceName { get; set; }

    /// <summary>Cihaz tipi etiketi: "MRI", "Röntgen", "BT", "PET-CT", "Ultrason".</summary>
    public required string DeviceType { get; set; }

    /// <summary>İlişkili biyomedikal talep başlığı veya değişim gerekçesi (opsiyonel).</summary>
    public string? Reason { get; set; }

    /// <summary>Hesabı oluşturan teknisyen (ad soyad).</summary>
    public required string CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; }

    // Hesaplama anındaki günlük kurlar (1 birim döviz = kaç TL) — snapshot
    public double UsdRate { get; set; }
    public double EurRate { get; set; }

    /// <summary>Tüm kalemlerin TL karşılığının toplamı.</summary>
    public double TotalTry { get; set; }

    public List<ReplacementCostItem> Items { get; set; } = [];
}

/// <summary>
/// Değişim maliyetinin tek bir kalemi (ör. yeni cihaz alımı, söküm, kurulum).
/// Tutar kaynak para biriminde tutulur; <see cref="AmountTry"/> hesaplama
/// anındaki günlük kurla hesaplanan TL karşılığıdır.
/// </summary>
public class ReplacementCostItem
{
    public int Id { get; set; }

    public int EstimateId { get; set; }
    public ReplacementCostEstimate? Estimate { get; set; }

    public required string Name { get; set; }

    /// <summary>Kalem kategorisi kodu (bkz. <see cref="CostCategories"/>).</summary>
    public required string Category { get; set; }

    /// <summary>Kaynak para birimi: "TRY", "USD" veya "EUR".</summary>
    public required string Currency { get; set; }

    /// <summary>Kaynak para birimi cinsinden tutar.</summary>
    public double Amount { get; set; }

    /// <summary>Günlük kurla hesaplanan TL karşılığı.</summary>
    public double AmountTry { get; set; }
}

/// <summary>Desteklenen para birimleri ve maliyet kategorileri için sabitler.</summary>
public static class CostCategories
{
    public static readonly string[] Currencies = ["TRY", "USD", "EUR"];

    /// <summary>Geçerli kategori kodları — frontend etiket/ikon eşlemesiyle uyumlu tutulmalı.</summary>
    public static readonly string[] All =
    [
        "purchase",       // Yeni cihaz alımı
        "decommission",   // Eski cihazın sökümü/imhası
        "installation",   // Kurulum ve montaj
        "calibration",    // Kalibrasyon ve kabul testleri
        "parts",          // Yedek parça / sarf malzeme
        "labor",          // İşçilik
        "transport"       // Nakliye ve sigorta
    ];
}
