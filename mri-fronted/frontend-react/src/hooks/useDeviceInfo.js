import { useCallback, useState } from 'react';
import { deviceFieldsForType } from '../lib/constants.js';

const INFO_KEY = (deviceId) => 'auramed_device_info_' + deviceId;
const RECORDS_KEY = (deviceId) => 'auramed_device_records_' + deviceId;
const MAINTENANCE_KEY = (deviceId) => 'auramed_device_maintenance_' + deviceId;
const COSTS_KEY = (deviceId) => 'auramed_device_costs_' + deviceId;
const EVALUATIONS_KEY = (deviceId) => 'auramed_device_evaluations_' + deviceId;

/** Cihaz tipine göre teknik bilgi formunun boş şablonu (her alan '' ile başlar). */
function emptyInfoForType(type) {
  const info = { lastMaintenance: '' };
  deviceFieldsForType(type).forEach((f) => { info[f.key] = ''; });
  return info;
}

/** Cihazın teknik bilgi formu — backend'de karşılığı yok, teknisyen elle girer ve tarayıcıda saklanır. */
export function useDeviceInfo(deviceId, deviceType) {
  const [info, setInfo] = useState(() => {
    const empty = emptyInfoForType(deviceType);
    try { return { ...empty, ...JSON.parse(localStorage.getItem(INFO_KEY(deviceId))) }; } catch { return empty; }
  });

  const update = useCallback((field, value) => {
    setInfo((prev) => {
      const next = { ...prev, [field]: value };
      localStorage.setItem(INFO_KEY(deviceId), JSON.stringify(next));
      return next;
    });
  }, [deviceId]);

  return [info, update];
}

/** Ekle/sil/tarayıcıda-sakla kalıbını paylaşan tüm cihaz kayıt listeleri (çekim, bakım, maliyet, değerlendirme) için ortak hook. */
function useLocalRecords(storageKey, sortFn) {
  const [records, setRecords] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey)) || []; } catch { return []; }
  });

  const add = useCallback((record) => {
    setRecords((prev) => {
      const next = [{ id: Date.now() + Math.random(), ...record }, ...prev];
      if (sortFn) next.sort(sortFn);
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const remove = useCallback((id) => {
    setRecords((prev) => {
      const next = prev.filter((r) => r.id !== id);
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  return [records, add, remove];
}

const byDateDesc = (a, b) => (a.date < b.date ? 1 : -1);

/** Günlük çekim / randevu kayıtları. */
export function useDeviceRecords(deviceId) {
  return useLocalRecords(RECORDS_KEY(deviceId), byDateDesc);
}

/** Yapılan / planlanan bakım-kontrol tarihleri. */
export function useDeviceMaintenance(deviceId) {
  return useLocalRecords(MAINTENANCE_KEY(deviceId), byDateDesc);
}

/** Yenileme / değiştirme maliyet kalemleri. */
export function useDeviceCosts(deviceId) {
  return useLocalRecords(COSTS_KEY(deviceId));
}

/** Bakım / yenileme sonrası değerlendirme notları. */
export function useDeviceEvaluations(deviceId) {
  return useLocalRecords(EVALUATIONS_KEY(deviceId), byDateDesc);
}
