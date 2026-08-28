import { useCallback, useState } from 'react';
import { api } from '../lib/api.js';

const TECH_KEY = 'auramed_technician';
const SHIFT_KEY = 'auramed_shift_start';

export function useSession() {
  const [technician, setTechnician] = useState(() => {
    try { return JSON.parse(localStorage.getItem(TECH_KEY)); } catch { return null; }
  });
  const [shiftStart, setShiftStart] = useState(() => Number(localStorage.getItem(SHIFT_KEY)) || null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const login = useCallback(async (form) => {
    if (!form.name.trim() || !form.surname.trim() || !form.sicil.trim()) { setError('Lütfen tüm alanları doldurun.'); return; }
    setBusy(true); setError('');
    const role = form.role === 'doctor' ? 'doctor' : 'technician';
    const tech = { name: form.name.trim(), surname: form.surname.trim(), sicil: form.sicil.trim(), role };
    try {
      // Backend gerçek şifreli kimlik doğrulama yapmaz: sicil no ilk girişte kaydedilir,
      // sonraki girişlerde ad/soyad eşleşmesi kontrol edilir (bkz. AuthController.Verify).
      const res = await api.verify({ firstName: tech.name, lastName: tech.surname, employeeId: tech.sicil, role });
      tech.name = res.firstName; tech.surname = res.lastName; tech.sicil = res.employeeId; tech.role = res.role || role;
    } catch (err) {
      if (err.message && /sicil numarası/i.test(err.message)) {
        setError(err.message);
        setBusy(false);
        return;
      }
      // backend'e erişilemiyorsa yerel oturumla devam edilir (demo modu)
    }
    const now = Date.now();
    localStorage.setItem(TECH_KEY, JSON.stringify(tech));
    localStorage.setItem(SHIFT_KEY, String(now));
    setTechnician(tech); setShiftStart(now); setBusy(false);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TECH_KEY);
    localStorage.removeItem(SHIFT_KEY);
    setTechnician(null); setShiftStart(null);
  }, []);

  return { technician, shiftStart, error, busy, login, logout };
}
