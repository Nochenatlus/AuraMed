using Microsoft.EntityFrameworkCore;
using MriMonitoring.Api.Models;

namespace MriMonitoring.Api.Data;

public static class DbSeeder
{
    public static void Seed(AppDbContext db)
    {
        db.Database.EnsureCreated();

        // EnsureCreated yalnızca veritabanı hiç yoksa şemayı kurar; mevcut mri.db'ye
        // sonradan eklenen tabloları oluşturmaz. Migration kullanılmadığından, değişim
        // maliyeti tablolarını idempotent (IF NOT EXISTS) şekilde burada garanti ediyoruz.
        EnsureReplacementCostTables(db);
        EnsureAppointmentsTable(db);
        EnsureTechnicianRoleColumn(db);
        SeedSampleAppointments(db);

        if (db.Devices.Any())
        {
            return;
        }

        db.Devices.AddRange(
            new Device
            {
                Name = "MRI Cihazı 1",
                Room = "Radyoloji - Kat 2, Oda 204",
                Type = DeviceType.Mri,
                Manufacturer = "Siemens Healthineers",
                Model = "MAGNETOM Skyra 3T",
                SerialNumber = "SIE-3T-2021-4471",
                TemperatureMin = 18,
                TemperatureMax = 22,
                HumidityMin = 40,
                HumidityMax = 60,
                RadiationMin = 0,
                RadiationMax = 0.30,
                IsRoomOccupied = false
            },
            new Device
            {
                Name = "MRI Cihazı 2",
                Room = "Radyoloji - Kat 2, Oda 206",
                Type = DeviceType.Mri,
                Manufacturer = "GE Healthcare",
                Model = "SIGNA Premier 3T",
                SerialNumber = "GE-3T-2022-5583",
                TemperatureMin = 18,
                TemperatureMax = 22,
                HumidityMin = 40,
                HumidityMax = 60,
                RadiationMin = 0,
                RadiationMax = 0.30,
                IsRoomOccupied = false
            },
            new Device
            {
                Name = "Röntgen Cihazı 1",
                Room = "Acil Servis - Kat 0",
                Type = DeviceType.Xray,
                Manufacturer = "Philips",
                Model = "DigitalDiagnost C90",
                SerialNumber = "PH-C90-2020-3312",
                TemperatureMin = 18,
                TemperatureMax = 26,
                HumidityMin = 30,
                HumidityMax = 65,
                RadiationMin = 0,
                RadiationMax = 0.50,
                IsRoomOccupied = false
            },
            new Device
            {
                Name = "Röntgen Cihazı 2",
                Room = "Acil Servis - Kat 0, Oda 2",
                Type = DeviceType.Xray,
                Manufacturer = "Canon Medical",
                Model = "CXDI Elan",
                SerialNumber = "CM-EL-2019-8847",
                TemperatureMin = 18,
                TemperatureMax = 26,
                HumidityMin = 30,
                HumidityMax = 65,
                RadiationMin = 0,
                RadiationMax = 0.50,
                IsRoomOccupied = true
            });

        db.SaveChanges();
    }

    /// <summary>
    /// Değişim maliyeti tablolarını (yalnızca yoksa) oluşturur. Kolon adları ve tipleri
    /// EF Core'un varsayılan eşlemesiyle birebir aynıdır; böylece hem taze veritabanında
    /// (EnsureCreated tarafından üretilir) hem de mevcut veritabanında tutarlı kalır.
    /// </summary>
    private static void EnsureReplacementCostTables(AppDbContext db)
    {
        // Eski şema (DeviceId + Devices FK) tespit edilirse yeni şemaya (DeviceKey/DeviceType,
        // FK'siz snapshot) geçmek için boş tabloları düşür. Üretim verisi yoktur; dev aşamasında güvenli.
        var estimatesExists = Scalar(db, "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='ReplacementCostEstimates'") > 0;
        if (estimatesExists)
        {
            var hasDeviceKey = Scalar(db, "SELECT count(*) FROM pragma_table_info('ReplacementCostEstimates') WHERE name='DeviceKey'") > 0;
            if (!hasDeviceKey)
            {
                db.Database.ExecuteSqlRaw("""DROP TABLE IF EXISTS "ReplacementCostItems";""");
                db.Database.ExecuteSqlRaw("""DROP TABLE IF EXISTS "ReplacementCostEstimates";""");
            }
        }

        db.Database.ExecuteSqlRaw(
            """
            CREATE TABLE IF NOT EXISTS "ReplacementCostEstimates" (
                "Id" INTEGER NOT NULL CONSTRAINT "PK_ReplacementCostEstimates" PRIMARY KEY AUTOINCREMENT,
                "DeviceKey" TEXT NOT NULL,
                "DeviceName" TEXT NOT NULL,
                "DeviceType" TEXT NOT NULL,
                "Reason" TEXT NULL,
                "CreatedBy" TEXT NOT NULL,
                "CreatedAt" TEXT NOT NULL,
                "UsdRate" REAL NOT NULL,
                "EurRate" REAL NOT NULL,
                "TotalTry" REAL NOT NULL
            );
            """);

        db.Database.ExecuteSqlRaw(
            """
            CREATE TABLE IF NOT EXISTS "ReplacementCostItems" (
                "Id" INTEGER NOT NULL CONSTRAINT "PK_ReplacementCostItems" PRIMARY KEY AUTOINCREMENT,
                "EstimateId" INTEGER NOT NULL,
                "Name" TEXT NOT NULL,
                "Category" TEXT NOT NULL,
                "Currency" TEXT NOT NULL,
                "Amount" REAL NOT NULL,
                "AmountTry" REAL NOT NULL,
                CONSTRAINT "FK_ReplacementCostItems_ReplacementCostEstimates_EstimateId" FOREIGN KEY ("EstimateId") REFERENCES "ReplacementCostEstimates" ("Id") ON DELETE CASCADE
            );
            """);

        db.Database.ExecuteSqlRaw(
            """CREATE INDEX IF NOT EXISTS "IX_ReplacementCostItems_EstimateId" ON "ReplacementCostItems" ("EstimateId");""");
    }

    /// <summary>Randevu/çekim iş akışı tablosunu (yoksa) oluşturur. EF varsayılan eşlemesiyle uyumlu.</summary>
    private static void EnsureAppointmentsTable(AppDbContext db)
    {
        db.Database.ExecuteSqlRaw(
            """
            CREATE TABLE IF NOT EXISTS "Appointments" (
                "Id" INTEGER NOT NULL CONSTRAINT "PK_Appointments" PRIMARY KEY AUTOINCREMENT,
                "DeviceKey" TEXT NOT NULL,
                "DeviceName" TEXT NOT NULL,
                "DeviceType" TEXT NOT NULL,
                "PatientName" TEXT NOT NULL,
                "PatientProtocolNo" TEXT NULL,
                "ScheduledStart" TEXT NOT NULL,
                "DurationMinutes" INTEGER NOT NULL,
                "ScheduledEnd" TEXT NOT NULL,
                "Status" TEXT NOT NULL,
                "Notes" TEXT NULL,
                "CreatedBy" TEXT NOT NULL,
                "CreatedAt" TEXT NOT NULL,
                "UpdatedAt" TEXT NOT NULL
            );
            """);

        db.Database.ExecuteSqlRaw(
            """CREATE INDEX IF NOT EXISTS "IX_Appointments_DeviceKey_ScheduledStart" ON "Appointments" ("DeviceKey", "ScheduledStart");""");
    }

    /// <summary>Panellerin ilk açılışta dolu görünmesi için birkaç örnek randevu ekler (tablo boşsa).</summary>
    private static void SeedSampleAppointments(AppDbContext db)
    {
        if (db.Appointments.Any())
        {
            return;
        }

        // Dakikaya yuvarla — randevu saatleri dakika hassasiyetindedir (saniye taşması çakışma yaratmasın).
        var utcNow = DateTime.UtcNow;
        var now = new DateTime(utcNow.Year, utcNow.Month, utcNow.Day, utcNow.Hour, utcNow.Minute, 0, DateTimeKind.Utc);

        Appointment Make(string key, string name, string type, string patient, string? protocolNo,
            DateTime start, int duration, string status, string? notes) => new()
        {
            DeviceKey = key,
            DeviceName = name,
            DeviceType = type,
            PatientName = patient,
            PatientProtocolNo = protocolNo,
            ScheduledStart = start,
            DurationMinutes = duration,
            ScheduledEnd = start.AddMinutes(duration),
            Status = status,
            Notes = notes,
            CreatedBy = "Sistem (örnek)",
            CreatedAt = now,
            UpdatedAt = now
        };

        db.Appointments.AddRange(
            Make("mri1", "MRI Cihazı", "MRI", "Metehan Deniz", "P-100234", now.AddHours(2), 30, AppointmentStatuses.Scheduled, "Lomber MRI istemi"),
            Make("xray1", "Röntgen Cihazı", "Röntgen", "Toprak Doğu", "P-100235", now.AddMinutes(-5), 15, AppointmentStatuses.Waiting, "Akciğer grafisi"),
            Make("bt1", "BT Cihazı", "BT", "Ata Kaya", "P-100236", now.AddHours(-1), 20, AppointmentStatuses.ImageCreated, "Toraks BT"),
            Make("petct1", "PET-CT Cihazı", "PET-CT", "Gizem Demir", "P-100237", now.AddDays(-1), 45, AppointmentStatuses.Approved, "Onkolojik tarama"));

        db.SaveChanges();
    }

    /// <summary>Mevcut Technicians tablosuna Role kolonunu (yoksa) ekler.</summary>
    private static void EnsureTechnicianRoleColumn(AppDbContext db)
    {
        var hasRole = Scalar(db, "SELECT count(*) FROM pragma_table_info('Technicians') WHERE name='Role'") > 0;
        if (!hasRole)
        {
            db.Database.ExecuteSqlRaw("""ALTER TABLE "Technicians" ADD COLUMN "Role" TEXT NOT NULL DEFAULT 'technician';""");
        }
    }

    /// <summary>Tek bir sayısal değer döndüren ham SQL sorgusu çalıştırır (şema kontrolü için).</summary>
    private static long Scalar(AppDbContext db, string sql)
    {
        var conn = db.Database.GetDbConnection();
        var wasClosed = conn.State != System.Data.ConnectionState.Open;
        if (wasClosed) conn.Open();
        try
        {
            using var cmd = conn.CreateCommand();
            cmd.CommandText = sql;
            return Convert.ToInt64(cmd.ExecuteScalar() ?? 0L);
        }
        finally
        {
            if (wasClosed) conn.Close();
        }
    }
}
