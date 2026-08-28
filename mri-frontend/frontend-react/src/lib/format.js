const pad = (n) => (n < 10 ? '0' + n : '' + n);

export const fmt = (p, v) => (v == null || Number.isNaN(v) ? '—' : Number(v).toFixed(p ? p.decimals : 1));
export const fmtDate = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
export const fmtDateTime = (d) => pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
export const fmtDateTimeSec = (d) => fmtDateTime(d) + ':' + pad(d.getSeconds());
export const fmtTime = (d) => pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
export const dayStartMs = (s) => (s ? new Date(s + 'T00:00:00').getTime() : -Infinity);
export const dayEndMs = (s) => (s ? new Date(s + 'T23:59:59').getTime() : Infinity);
export const fmtCurrency = (n) => Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
