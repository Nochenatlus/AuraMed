using Microsoft.EntityFrameworkCore;
using MriMonitoring.Api.Models;

namespace MriMonitoring.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Device> Devices => Set<Device>();
    public DbSet<SensorReading> Readings => Set<SensorReading>();
    public DbSet<AlarmRecord> Alarms => Set<AlarmRecord>();
    public DbSet<Technician> Technicians => Set<Technician>();
    public DbSet<ReplacementCostEstimate> ReplacementCostEstimates => Set<ReplacementCostEstimate>();
    public DbSet<ReplacementCostItem> ReplacementCostItems => Set<ReplacementCostItem>();
    public DbSet<Appointment> Appointments => Set<Appointment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Technician>()
            .HasIndex(t => t.EmployeeId)
            .IsUnique();

        modelBuilder.Entity<SensorReading>()
            .HasIndex(r => new { r.DeviceId, r.Timestamp });

        modelBuilder.Entity<ReplacementCostEstimate>()
            .HasMany(e => e.Items)
            .WithOne(i => i.Estimate!)
            .HasForeignKey(i => i.EstimateId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
