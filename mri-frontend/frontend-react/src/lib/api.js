const API = import.meta.env.VITE_API_URL || '';
const HUB = import.meta.env.VITE_HUB_URL || (API ? API + '/hubs/sensor' : '/hubs/sensor');
const WORKFLOW_HUB = API ? API + '/hubs/workflow' : '/hubs/workflow';

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(API + path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers }
    });
  } catch {
    // Ağ hatası (fetch reddi) — genelde backend (API) çalışmıyor veya erişilemiyordur.
    throw new Error('Sunucuya ulaşılamadı. Backend (API) çalışıyor mu?');
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let message = text;
    try { message = JSON.parse(text); } catch { /* düz metin */ }
    throw new Error((typeof message === 'string' && message) || 'İstek başarısız (' + res.status + ')');
  }
  return res.status === 204 ? null : res.json();
}

/** ISO 8601'e çevirir; backend DateTime query parametreleri bunu bekler. */
const iso = (ms) => (Number.isFinite(ms) ? new Date(ms).toISOString() : undefined);

function query(params) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') usp.set(k, v); });
  const s = usp.toString();
  return s ? '?' + s : '';
}

export const api = {
  /** Sicil no ilk girişte kaydedilir; backend gerçek şifreli kimlik doğrulama yapmaz, token dönmez. */
  verify: (body) => request('/api/auth/verify', { method: 'POST', body: JSON.stringify(body) }),
  devices: () => request('/api/devices'),
  alarmsHistory: ({ deviceId, startMs, endMs }) =>
    request('/api/alarms/history' + query({ deviceId, startDate: iso(startMs), endDate: iso(endMs) })),
  reportUrl: ({ deviceId, startMs, endMs }) =>
    API + '/api/reports/pdf' + query({ deviceId, startDate: iso(startMs), endDate: iso(endMs) }),
  hubUrl: () => HUB,

  // Cihaz değişim maliyeti modülü
  replacementRates: () => request('/api/replacement-costs/rates'),
  replacementSimulate: (type) => request('/api/replacement-costs/simulate' + query({ type })),
  replacementList: () => request('/api/replacement-costs'),
  replacementDetail: (id) => request('/api/replacement-costs/' + id),
  replacementCreate: (body) => request('/api/replacement-costs', { method: 'POST', body: JSON.stringify(body) }),
  replacementDelete: (id) => request('/api/replacement-costs/' + id, { method: 'DELETE' }),

  // Randevu / çekim iş akışı
  appointments: ({ deviceKey, status, scope } = {}) =>
    request('/api/appointments' + query({ deviceKey, status, scope })),
  appointmentAvailability: ({ deviceKey, startMs, durationMinutes, excludeId }) =>
    request('/api/appointments/availability' + query({ deviceKey, start: iso(startMs), durationMinutes, excludeId })),
  appointmentCreate: (body) => request('/api/appointments', { method: 'POST', body: JSON.stringify(body) }),
  appointmentChangeStatus: (id, status) =>
    request('/api/appointments/' + id + '/status', { method: 'POST', body: JSON.stringify({ status }) }),
  appointmentDelete: (id) => request('/api/appointments/' + id, { method: 'DELETE' }),
  workflowHubUrl: () => WORKFLOW_HUB
};

/** Sunucu PDF'i varsa onu indirir; yoksa jsPDF ile istemcide üretir. */
export async function downloadReport(filters, fallbackRows, meta) {
  try {
    const res = await fetch(api.reportUrl(filters));
    if (!res.ok) throw new Error('sunucu raporu yok');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'esik-asim-raporu.pdf';
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    await clientPdf(fallbackRows, meta);
  }
}

/** Türkçe karakterleri (ş, ı, ğ...) doğru göstermek için jsPDF'in varsayılan
 * fontu yerine gömülü Roboto fontunu kullanır; dosyalar public/fonts altında. */
let robotoFontFiles = null;
function loadRobotoFontFiles() {
  if (!robotoFontFiles) {
    const toBase64 = async (url) => {
      const buf = await (await fetch(url)).arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
      return btoa(binary);
    };
    robotoFontFiles = Promise.all([toBase64('/fonts/Roboto-Regular.ttf'), toBase64('/fonts/Roboto-Bold.ttf')]);
  }
  return robotoFontFiles;
}

async function clientPdf(rows, meta) {
  const jspdf = window.jspdf;
  if (!jspdf) { alert('Rapor oluşturulamadı.'); return; }
  const doc = new jspdf.jsPDF();

  let useRoboto = false;
  try {
    const [regular, bold] = await loadRobotoFontFiles();
    doc.addFileToVFS('Roboto-Regular.ttf', regular);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.addFileToVFS('Roboto-Bold.ttf', bold);
    doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
    useRoboto = true;
  } catch { /* font yüklenemezse varsayılan fontla devam eder */ }
  const font = useRoboto ? 'Roboto' : 'helvetica';
  doc.setFont(font, 'bold');

  const marginX = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const drawHeader = () => {
    doc.setFont(font, 'bold');
    doc.setFontSize(16);
    doc.setTextColor(20, 20, 20);
    doc.text('AuraMed - Eşik Aşımı (Uyarı) Raporu', marginX, 18);
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text('Cihaz: ' + meta.deviceLabel, marginX, 26);
    doc.text('Tarih aralığı: ' + meta.start + ' - ' + meta.end, marginX, 32);
    doc.setDrawColor(180, 180, 180);
    doc.line(marginX, 36, pageWidth - marginX, 36);
  };

  const drawFooter = () => {
    doc.setFont(font, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    const text = 'Oluşturulma: ' + meta.createdAt + '  •  Toplam kayıt: ' + rows.length;
    doc.text(text, pageWidth / 2, pageHeight - 10, { align: 'center' });
  };

  /** Raporun tamamının en altına, sadece son sayfada, o gün vardiyada olan teknisyen bilgisi. */
  const drawTechnicianLine = () => {
    doc.setFont(font, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    const text = 'Vardiya teknisyeni: ' + meta.technicianName + '  •  Sicil: ' + meta.technicianSicil;
    doc.text(text, pageWidth / 2, pageHeight - 16, { align: 'center' });
  };

  if (doc.autoTable) {
    doc.autoTable({
      startY: 42,
      margin: { top: 42, left: marginX, right: marginX, bottom: 16 },
      head: [['Tarih/Saat', 'Cihaz', 'Parametre', 'Değer', 'Eşik']],
      body: rows.map(r => [r.timeStr, r.deviceName, r.paramLabel, r.valueStr, r.thresholdStr]),
      theme: 'plain',
      styles: { font, fontStyle: 'bold', fontSize: 9, textColor: [20, 20, 20], cellPadding: 2 },
      headStyles: { font, fontStyle: 'bold', fillColor: false, textColor: [20, 20, 20] },
      bodyStyles: { fillColor: [251, 222, 227] },
      alternateRowStyles: { fillColor: [251, 222, 227] },
      didDrawPage: () => { drawHeader(); drawFooter(); }
    });
    doc.setPage(doc.internal.getNumberOfPages());
    drawTechnicianLine();
  } else {
    drawHeader();
    let y = 46;
    doc.setFontSize(9);
    rows.forEach(r => { doc.text(r.timeStr + '  ' + r.deviceName + '  ' + r.paramLabel + '  ' + r.valueStr, marginX, y); y += 6; });
    drawFooter();
    drawTechnicianLine();
  }

  doc.save('esik-asim-raporu.pdf');
}

/** Biyomedikal destek geçmiş karnesini (arşivlenmiş talepler) PDF olarak indirir. */
export async function downloadBiomedicalHistoryReport(rows, meta) {
  const jspdf = window.jspdf;
  if (!jspdf) { alert('Rapor oluşturulamadı.'); return; }
  const doc = new jspdf.jsPDF();

  let useRoboto = false;
  try {
    const [regular, bold] = await loadRobotoFontFiles();
    doc.addFileToVFS('Roboto-Regular.ttf', regular);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.addFileToVFS('Roboto-Bold.ttf', bold);
    doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
    useRoboto = true;
  } catch { /* font yüklenemezse varsayılan fontla devam eder */ }
  const font = useRoboto ? 'Roboto' : 'helvetica';
  doc.setFont(font, 'bold');

  const marginX = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const drawHeader = () => {
    doc.setFont(font, 'bold');
    doc.setFontSize(16);
    doc.setTextColor(20, 20, 20);
    doc.text('AuraMed - Biyomedikal Destek Geçmiş Karnesi', marginX, 18);
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text('Toplam kayıt: ' + rows.length, marginX, 26);
    doc.setDrawColor(180, 180, 180);
    doc.line(marginX, 30, pageWidth - marginX, 30);
  };

  const drawFooter = () => {
    doc.setFont(font, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    const text = 'Oluşturulma: ' + meta.createdAt + '  •  Görüntüleyen: ' + meta.technicianName;
    doc.text(text, pageWidth / 2, pageHeight - 10, { align: 'center' });
  };

  if (doc.autoTable) {
    doc.autoTable({
      startY: 36,
      margin: { top: 36, left: marginX, right: marginX, bottom: 16 },
      head: [['Gönderim', 'Başlık', 'Gönderen', 'Açıklama', 'Çözüm']],
      body: rows.map((r) => [r.sentStr, r.title, r.sender, r.description, r.resolvedStr]),
      theme: 'plain',
      styles: { font, fontStyle: 'bold', fontSize: 8, textColor: [20, 20, 20], cellPadding: 2, overflow: 'linebreak' },
      headStyles: { font, fontStyle: 'bold', fillColor: false, textColor: [20, 20, 20] },
      columnStyles: { 3: { cellWidth: 68 } },
      bodyStyles: { fillColor: [222, 235, 251] },
      alternateRowStyles: { fillColor: [222, 235, 251] },
      didDrawPage: () => { drawHeader(); drawFooter(); }
    });
  } else {
    drawHeader();
    let y = 40;
    doc.setFontSize(9);
    rows.forEach((r) => { doc.text(r.sentStr + '  ' + r.title + '  ' + r.sender, marginX, y); y += 6; });
    drawFooter();
  }

  doc.save('biyomedikal-gecmis-karnesi.pdf');
}
