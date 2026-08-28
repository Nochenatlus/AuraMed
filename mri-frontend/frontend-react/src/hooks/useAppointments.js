import { useCallback, useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { api } from '../lib/api.js';

/**
 * Randevu/çekim listesini yükler ve WorkflowHub üzerinden canlı güncel tutar.
 * Bir panelde durum değişince (AppointmentChanged) tüm açık paneller yeniden yükler.
 * SignalR kurulamazsa periyodik yoklamaya (polling) düşer; arayüz aynı çalışır.
 *
 * @param enabled Hook aktif mi
 * @param scope   'technician' | 'doctor' — backend aşama grubu filtresi
 */
export function useAppointments(enabled, scope) {
  const [appointments, setAppointments] = useState([]);
  const [connection, setConnection] = useState('baglaniyor');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const scopeRef = useRef(scope);
  scopeRef.current = scope;

  const load = useCallback(async () => {
    try {
      const list = await api.appointments(scopeRef.current ? { scope: scopeRef.current } : {});
      setAppointments(list);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    let hub, alive = true, pollTimer;
    load();

    const startPolling = () => { if (!pollTimer) pollTimer = setInterval(load, 4000); };

    hub = new signalR.HubConnectionBuilder()
      .withUrl(api.workflowHubUrl())
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    hub.on('AppointmentChanged', () => { if (alive) load(); });
    hub.on('AppointmentDeleted', () => { if (alive) load(); });
    hub.onreconnecting(() => { if (alive) setConnection('kopuk'); });
    hub.onreconnected(() => { if (alive) { setConnection('canli'); load(); } });
    hub.onclose(() => { if (alive) { setConnection('kopuk'); startPolling(); } });

    hub.start()
      .then(() => { if (!alive) { hub.stop(); return; } setConnection('canli'); })
      .catch(() => { if (alive) { setConnection('demo'); startPolling(); } });

    return () => { alive = false; if (hub) hub.stop(); clearInterval(pollTimer); };
  }, [enabled, load]);

  return { appointments, connection, error, loading, reload: load };
}
