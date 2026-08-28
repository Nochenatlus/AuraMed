using Microsoft.AspNetCore.SignalR;

namespace MriMonitoring.Api.Hubs;

/// <summary>
/// Randevu / çekim iş akışı için canlı yayın kanalı. Sunucu, randevu oluşturma ve
/// durum değişikliklerinde "AppointmentChanged" olayını tüm istemcilere gönderir;
/// böylece teknisyen ve doktor panelleri anlık güncellenir.
/// </summary>
public class WorkflowHub : Hub
{
}
