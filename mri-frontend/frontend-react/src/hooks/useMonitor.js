import { useCallback, useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { api } from '../lib/api.js';
import { DEVICES, TICK_MS, backendTypeLabel, deviceIcon, paramsForDevice } from '../lib/constants.js';
import { fmt, fmtDateTime } from '../lib/format.js';

const HISTORY_LEN = 40;
/** Eşik aşım modalının en fazla açılma sıklığı (ms). Şimdilik 20 dk — sunum için. */
const MODAL_MIN_INTERVAL_MS = 20 * 60 * 1000;

function seedState() {
  const values = {}, history = {}, activeAlerts = {}, occupancy = {};
  DEVICES.forEach((d) => {
    values[d.id] = {}; history[d.id] = {}; activeAlerts[d.id] = {};
    occupancy[d.id] = Math.random() < 0.5;
    paramsForDevice(d.id).forEach((p) => {
      const mid = (p.min + p.max) / 2;
      values[d.id][p.key] = mid;
      history[d.id][p.key] = new Array(HISTORY_LEN).fill(mid).map((v) => v + (Math.random() - 0.5) * p.step * 4);
      activeAlerts[d.id][p.key] = false;
    });
  });
  return { values, history, activeAlerts, occupancy };
}

function seedEvents() {
  const events = [];
  const now = Date.now();
  DEVICES.forEach((d) => {
    const params = paramsForDevice(d.id);
    const count = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const p = params[Math.floor(Math.random() * params.length)];
      const ts = now - Math.floor(Math.random() * 30 * 24 * 3600 * 1000);
      events.push({ id: ts + '-' + d.id + '-' + i, deviceId: d.id, param: p.key, value: p.threshold * (1.05 + Math.random() * 0.4), timestamp: ts });
    }
  });
  return events.sort((a, b) => b.timestamp - a.timestamp);
}

/** Backend cihazlarını (Type sırasına göre gelir) sabit frontend cihaz slotlarına eşler. */
function mapBackendDevices(list) {
  const byType = {};
  DEVICES.forEach((d) => { (byType[d.type] = byType[d.type] || []).push(d.id); });
  const seenPerType = {};
  const backendToFrontend = {};
  const frontendToBackend = {};
  list.forEach((d) => {
    const label = backendTypeLabel(d.type);
    const idx = seenPerType[label] || 0;
    seenPerType[label] = idx + 1;
    const frontendId = (byType[label] || [])[idx];
    if (frontendId) { backendToFrontend[d.deviceId] = frontendId; frontendToBackend[frontendId] = d.deviceId; }
  });
  return { backendToFrontend, frontendToBackend };
}

/**
 * Canlı veri kaynağı.
 * connection: 'baglaniyor' | 'canli' | 'kopuk' | 'demo'
 * Backend (MriMonitoring.Api) erişilemezse yerel simülasyona düşer, arayüz aynı çalışır.
 */
export function useMonitor(enabled, speed = 'normal') {
  const tickMs = TICK_MS[speed] || TICK_MS.normal;
  const [core, setCore] = useState(seedState);
  const [events, setEvents] = useState(seedEvents);
  const [modalAlert, setModalAlert] = useState(null);
  const [connection, setConnection] = useState('baglaniyor');
  const spikeRef = useRef(null);
  const coreRef = useRef(core);
  coreRef.current = core;
  const idMapRef = useRef({ backendToFrontend: {}, frontendToBackend: {} });
  const [deviceIdMap, setDeviceIdMap] = useState({});
  // Eşik aşım modalı en fazla bu aralıkta bir açılır (sunum sırasında ekranı bölmesin diye).
  // Uyarı kayıtları/banner etkilenmez; yalnızca açılır pencere seyrekleşir.
  const lastModalAtRef = useRef(0);

  const pushEvent = useCallback((deviceId, paramKey, value, ts) => {
    const d = DEVICES.find((x) => x.id === deviceId);
    const p = d && paramsForDevice(d.id).find((x) => x.key === paramKey);
    if (!d || !p) return;
    setEvents((prev) => [{ id: ts + '-' + deviceId + '-' + paramKey, deviceId, param: paramKey, value, timestamp: ts }, ...prev]);

    // Modalı 20 dakikada bir göster (throttle).
    const now = Date.now();
    if (now - lastModalAtRef.current < MODAL_MIN_INTERVAL_MS) return;
    lastModalAtRef.current = now;
    setModalAlert({
      deviceName: d.name,
      paramLabel: p.label,
      valueStr: fmt(p, value) + ' ' + p.unit,
      thresholdStr: '> ' + fmt(p, p.threshold) + ' ' + p.unit,
      timeStr: fmtDateTime(new Date(ts))
    });
  }, []);

  /** Gelen okumaları (backend veya simülasyon) state'e işler, yeni eşik aşımını yakalar. */
  const applyReadings = useCallback((readings, occupancyPatch) => {
    setCore((prev) => {
      const values = {}, history = {}, activeAlerts = {};
      DEVICES.forEach((d) => {
        values[d.id] = { ...prev.values[d.id] };
        history[d.id] = { ...prev.history[d.id] };
        activeAlerts[d.id] = { ...prev.activeAlerts[d.id] };
        paramsForDevice(d.id).forEach((p) => {
          const v = readings[d.id] && readings[d.id][p.key];
          if (v == null) return;
          values[d.id][p.key] = v;
          history[d.id][p.key] = [...prev.history[d.id][p.key].slice(-(HISTORY_LEN - 1)), v];
          const was = prev.activeAlerts[d.id][p.key];
          const is = v > p.threshold;
          if (is && !was) pushEvent(d.id, p.key, v, Date.now());
          activeAlerts[d.id][p.key] = is;
        });
      });
      return { values, history, activeAlerts, occupancy: occupancyPatch || prev.occupancy };
    });
  }, [pushEvent]);

  /** Yerel simülasyon adımı (backend yoksa). */
  const simulate = useCallback(() => {
    const prev = coreRef.current;
    let spike = spikeRef.current;
    const readings = {};
    DEVICES.forEach((d) => {
      readings[d.id] = {};
      paramsForDevice(d.id).forEach((p) => {
        let v = prev.values[d.id][p.key];
        if (spike && spike.deviceId === d.id && spike.param === p.key) {
          v = p.threshold + spike.overshoot + (Math.random() - 0.5) * p.step;
        } else {
          const mid = (p.min + p.max) / 2;
          v += (Math.random() - 0.5) * p.step * 2 + (mid - v) * 0.04;
        }
        readings[d.id][p.key] = v;
      });
    });
    if (spike) {
      spike.ticksLeft -= 1;
      if (spike.ticksLeft <= 0) spike = null;
    } else if (Math.random() < 0.07) {
      const d = DEVICES[Math.floor(Math.random() * DEVICES.length)];
      const params = paramsForDevice(d.id);
      const p = params[Math.floor(Math.random() * params.length)];
      spike = { deviceId: d.id, param: p.key, overshoot: p.threshold * (0.1 + Math.random() * 0.5), ticksLeft: 2 + Math.floor(Math.random() * 3) };
    }
    spikeRef.current = spike;
    const occupancy = { ...prev.occupancy };
    DEVICES.forEach((d) => { if (Math.random() < 0.04) occupancy[d.id] = !occupancy[d.id]; });
    applyReadings(readings, occupancy);
  }, [applyReadings]);

  /** Backend'den (GET /api/devices) anlık cihaz durumunu çeker. */
  const pull = useCallback(async () => {
    const list = await api.devices();
    const { backendToFrontend, frontendToBackend } = mapBackendDevices(list);
    idMapRef.current = { backendToFrontend, frontendToBackend };
    setDeviceIdMap(frontendToBackend);

    const readings = {}, occupancy = { ...coreRef.current.occupancy };
    list.forEach((d) => {
      const frontendId = backendToFrontend[d.deviceId];
      if (!frontendId) return;
      readings[frontendId] = { sicaklik: d.lastTemperature, nem: d.lastHumidity, radyasyon: d.lastRadiation };
      occupancy[frontendId] = !!d.isRoomOccupied;
      const local = DEVICES.find((x) => x.id === frontendId);
      if (local) { local.name = d.name || local.name; local.location = d.room || local.location; local.icon = deviceIcon(backendTypeLabel(d.type)); }
    });
    applyReadings(readings, occupancy);
  }, [applyReadings]);

  useEffect(() => {
    if (!enabled) return undefined;
    let hub, simTimer, pollTimer, alive = true;

    const startSim = () => { setConnection('demo'); simTimer = setInterval(simulate, tickMs); };
    const startPolling = () => { pollTimer = setInterval(() => pull().catch(() => {}), tickMs); };

    /** Bir SignalR ReceiveReading olayını frontend state'ine işler. */
    const onReading = (dto) => {
      const frontendId = idMapRef.current.backendToFrontend[dto.deviceId];
      if (!frontendId) return;
      applyReadings(
        { [frontendId]: { sicaklik: dto.temperature, nem: dto.humidity, radyasyon: dto.radiationDose } },
        { ...coreRef.current.occupancy, [frontendId]: !!dto.isRoomOccupied }
      );
    };

    pull()
      .then(() => {
        if (!alive) return;
        setConnection('canli');
        hub = new signalR.HubConnectionBuilder()
          .withUrl(api.hubUrl())
          .withAutomaticReconnect()
          .configureLogging(signalR.LogLevel.Warning)
          .build();

        hub.on('ReceiveReading', onReading);
        hub.onreconnecting(() => { if (alive) setConnection('kopuk'); });
        hub.onreconnected(() => { if (alive) setConnection('canli'); });
        hub.onclose(() => { if (alive) { setConnection('kopuk'); startPolling(); } });

        hub.start()
          .then(() => { if (!alive) hub.stop(); })
          .catch(() => { if (alive) { setConnection('kopuk'); startPolling(); } });
      })
      .catch(() => { if (alive) startSim(); });

    return () => {
      alive = false;
      if (hub) hub.stop();
      clearInterval(simTimer);
      clearInterval(pollTimer);
    };
  }, [enabled, tickMs, pull, simulate, applyReadings]);

  return { ...core, events, setEvents, modalAlert, setModalAlert, connection, tickMs, deviceIdMap };
}
