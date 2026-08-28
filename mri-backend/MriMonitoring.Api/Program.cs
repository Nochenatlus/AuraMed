        using Microsoft.EntityFrameworkCore;
using MriMonitoring.Api.Data;
using MriMonitoring.Api.Hubs;
using MriMonitoring.Api.Services;
using QuestPDF.Infrastructure;

QuestPDF.Settings.License = LicenseType.Community;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("Default") ?? "Data Source=mri.db"));

builder.Services.AddSignalR();
builder.Services.AddSingleton<PdfReportService>();
builder.Services.AddSingleton<ExchangeRateService>();
builder.Services.AddSingleton<ReplacementCostSimulator>();
builder.Services.AddHostedService<SensorSimulationService>();

// Frontend ile backend ayrı süreçler olarak çalıştığından (farklı port),
// SignalR ve REST çağrıları için CORS açık tutulur.
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.SetIsOriginAllowed(_ => true)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials());
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    DbSeeder.Seed(db);
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors();
app.UseAuthorization();

app.MapControllers();
app.MapHub<SensorHub>("/hubs/sensor");
app.MapHub<WorkflowHub>("/hubs/workflow");

app.Run();
