import { useCallback, useState } from 'react';

const CHAT_KEY = 'auramed_biomedical_requests';
const HISTORY_KEY = 'auramed_biomedical_history';

/**
 * Biyomedikal birime iletilecek talep/mesaj kaydı — gerçek zamanlı bir sohbet
 * altyapısı yok, teknisyen mesaj yazar ve durumu kendisi işaretler. Çözülen
 * talepler silinmez; geçmiş karnesine arşivlenir, veri kaybolmaz.
 */
export function useBiomedicalChat() {
  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CHAT_KEY)) || []; } catch { return []; }
  });
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch { return []; }
  });

  const persist = (list) => localStorage.setItem(CHAT_KEY, JSON.stringify(list));
  const persistHistory = (list) => localStorage.setItem(HISTORY_KEY, JSON.stringify(list));

  const send = useCallback((sender, title, description) => {
    setMessages((prev) => {
      const next = [...prev, { id: Date.now() + Math.random(), sender, title, description, timestamp: Date.now(), resolved: false }];
      persist(next);
      return next;
    });
  }, []);

  const toggleResolved = useCallback((id) => {
    setMessages((prev) => {
      const next = prev.map((m) => (m.id === id ? { ...m, resolved: !m.resolved } : m));
      persist(next);
      return next;
    });
  }, []);

  /** Sadece çözüldü olarak işaretlenmiş talepler arşivlenebilir; veri silinmez, geçmiş karnesine taşınır. */
  const archive = useCallback((id) => {
    setMessages((prev) => {
      const item = prev.find((m) => m.id === id && m.resolved);
      if (!item) return prev;
      setHistory((prevHistory) => {
        const nextHistory = [...prevHistory, { ...item, archivedAt: Date.now() }];
        persistHistory(nextHistory);
        return nextHistory;
      });
      const next = prev.filter((m) => m.id !== id);
      persist(next);
      return next;
    });
  }, []);

  /** Karneden kalıcı olarak kayıt siler — yalnızca admin kullanımı için. */
  const removeHistory = useCallback((id) => {
    setHistory((prev) => {
      const next = prev.filter((h) => h.id !== id);
      persistHistory(next);
      return next;
    });
  }, []);

  return { messages, history, send, toggleResolved, archive, removeHistory };
}
