namespace MriMonitoring.Api.Models;

/// <summary>
/// Bir çekim istemi / randevu ve tüm yaşam döngüsü. Cihaz bilgisi frontend cihaz
/// kataloğundan (DEVICES) snapshot olarak tutulur. Zaman aralığı [ScheduledStart,
/// ScheduledEnd) müsaitlik/çakışma kontrolünde kullanılır. Süreç <see cref="Status"/>
/// ile ilerler (bkz. <see cref="AppointmentStatuses"/>).
/// </summary>
public class Appointment
{
    public int Id { get; set; }

    // Cihaz (frontend kataloğu) — snapshot
    public required string DeviceKey { get; set; }
    public required string DeviceName { get; set; }
    public required string DeviceType { get; set; }

    // Hasta
    public required string PatientName { get; set; }
    public string? PatientProtocolNo { get; set; }

    // Zamanlama (UTC). ScheduledEnd = ScheduledStart + DurationMinutes; çakışma sorgusu için saklanır.
    public DateTime ScheduledStart { get; set; }
    public int DurationMinutes { get; set; }
    public DateTime ScheduledEnd { get; set; }

    /// <summary>İş akışı durumu (bkz. <see cref="AppointmentStatuses"/>).</summary>
    public required string Status { get; set; }

    public string? Notes { get; set; }

    public required string CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// Randevu iş akışı durumları ve izinli geçişler.
/// Katılım: <c>Scheduled</c> → <c>Waiting</c> (Geldi) / <c>NotArrived</c> (Gelmedi).
/// Çekim (teknisyen): <c>Waiting</c> (Bekliyor) → <c>Running</c> (Çalışıyor) → <c>ImageCreated</c> (Görüntü Oluşturuldu), her aşamada <c>Cancelled</c> (İptal).
/// Raporlama (doktor): <c>ImageCreated</c> → <c>ImageEvaluation</c> (Görüntü Değerlendirmesi) → <c>Reporting</c> (Raporlaştırma) → <c>Approved</c> (Hekim Onayı).
/// </summary>
public static class AppointmentStatuses
{
    public const string Scheduled = "Scheduled";
    public const string NotArrived = "NotArrived";
    public const string Waiting = "Waiting";
    public const string Running = "Running";
    public const string Cancelled = "Cancelled";
    public const string ImageCreated = "ImageCreated";
    public const string ImageEvaluation = "ImageEvaluation";
    public const string Reporting = "Reporting";
    public const string Approved = "Approved";

    public static readonly string[] All =
    [
        Scheduled, NotArrived, Waiting, Running, Cancelled, ImageCreated, ImageEvaluation, Reporting, Approved
    ];

    /// <summary>Bir durumdan geçilebilecek durumlar. Listede olmayan durumlar terminaldir.</summary>
    private static readonly Dictionary<string, string[]> Transitions = new()
    {
        [Scheduled] = [Waiting, NotArrived, Cancelled],
        [Waiting] = [Running, Cancelled],
        [Running] = [ImageCreated, Cancelled],
        [ImageCreated] = [ImageEvaluation],
        [ImageEvaluation] = [Reporting],
        [Reporting] = [Approved],
        // NotArrived, Cancelled, Approved → terminal
    };

    public static bool IsValid(string status) => All.Contains(status);

    public static bool CanTransition(string from, string to) =>
        Transitions.TryGetValue(from, out var next) && next.Contains(to);

    /// <summary>Bir randevunun cihazın zaman slotunu meşgul edip etmediği. İptal/Gelmedi slotu serbest bırakır.</summary>
    public static bool OccupiesSlot(string status) => status != NotArrived && status != Cancelled;
}
