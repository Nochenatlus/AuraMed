export const DEVICES = [
  { id: 'mri1',   name: 'MRI Cihazı',     type: 'MRI',      location: 'Radyoloji · Kat 2, Oda 204',  icon: 'ph ph-circle-dashed' },
  { id: 'xray1',  name: 'Röntgen Cihazı', type: 'Röntgen',  location: 'Acil Servis · Kat 0',         icon: 'ph ph-scan' },
  { id: 'bt1',    name: 'BT Cihazı',      type: 'BT',       location: 'Radyoloji · Kat 1, Oda 108',  icon: 'ph ph-aperture' },
  { id: 'petct1', name: 'PET-CT Cihazı',  type: 'PET-CT',   location: 'Nükleer Tıp · Kat -1, Oda 12', icon: 'ph ph-atom' },
  { id: 'us1',    name: 'Ultrason Cihazı', type: 'Ultrason', location: 'Radyoloji · Kat 2, Oda 210',  icon: 'ph ph-waveform' }
];

export const DEVICE_TYPES = ['MRI', 'Röntgen', 'BT', 'PET-CT', 'Ultrason'];

export const PARAM_KEYS = ['sicaklik', 'nem', 'radyasyon'];

/** Parametrenin cihaz tipinden bağımsız kısmı (etiket/ikon/birim/ondalık basamak). */
const PARAM_META = {
  sicaklik:  { label: 'Sıcaklık',       unit: '°C',    icon: 'ph ph-thermometer', decimals: 1 },
  nem:       { label: 'Nem',            unit: '%RH',   icon: 'ph ph-drop',        decimals: 1 },
  radyasyon: { label: 'Radyasyon Dozu', unit: 'µSv/h', icon: 'ph ph-radioactive', decimals: 2 }
};

/** Cihaz tipine göre eşik/normal aralık/adım değerleri. */
const THRESHOLDS_BY_TYPE = {
  MRI: {
    sicaklik:  { threshold: 26,  min: 18,   max: 24,  step: 0.15 },
    nem:       { threshold: 65,  min: 35,   max: 55,  step: 0.6 },
    radyasyon: { threshold: 0.5, min: 0.05, max: 0.3, step: 0.01 }
  },
  'Röntgen': {
    sicaklik:  { threshold: 26,  min: 18,   max: 24,  step: 0.15 },
    nem:       { threshold: 65,  min: 35,   max: 55,  step: 0.6 },
    radyasyon: { threshold: 0.5, min: 0.05, max: 0.3, step: 0.01 }
  },
  BT: {
    sicaklik:  { threshold: 27,  min: 19,  max: 25,  step: 0.15 },
    nem:       { threshold: 65,  min: 35,  max: 55,  step: 0.6 },
    radyasyon: { threshold: 0.9, min: 0.1, max: 0.5, step: 0.02 }
  },
  'PET-CT': {
    sicaklik:  { threshold: 27,  min: 19,  max: 25,  step: 0.15 },
    nem:       { threshold: 60,  min: 30,  max: 50,  step: 0.6 },
    radyasyon: { threshold: 2.0, min: 0.2, max: 1.5, step: 0.05 }
  },
  Ultrason: {
    sicaklik:  { threshold: 29,   min: 20, max: 26,   step: 0.15 },
    nem:       { threshold: 70,   min: 40, max: 60,   step: 0.6 },
    radyasyon: { threshold: 0.1,  min: 0,  max: 0.05,  step: 0.005 }
  }
};

/** Cihaz tipinden bağımsız gösterim (etiket/ikon/birim) için tam parametre listesi — eşik gerekmeyen genel listelemelerde kullanılır. */
export const PARAM_DEFS = PARAM_KEYS.map((key) => ({ key, ...PARAM_META[key] }));

/** Bir cihaz tipinin tam parametre tanımlarını (etiket + eşik/aralık) döner. */
export function paramsForType(type) {
  const t = THRESHOLDS_BY_TYPE[type] || THRESHOLDS_BY_TYPE.MRI;
  return PARAM_KEYS.map((key) => ({ key, ...PARAM_META[key], ...t[key] }));
}

const PARAMS_BY_DEVICE = Object.fromEntries(DEVICES.map((d) => [d.id, paramsForType(d.type)]));

/** Bir cihazın (id ile) tam parametre tanımlarını döner; canlı state güncellemeleri sırasında da güncel tutulur. */
export function paramsForDevice(deviceId) {
  return PARAMS_BY_DEVICE[deviceId] || paramsForType('MRI');
}

const TYPE_FIELDS = {
  model:    { label: 'Cihaz Tanımı & Model', placeholder: 'Örn. Siemens Magnetom Prisma' },
  serialNo: { label: 'Seri / Envanter No',   placeholder: 'Örn. SN-20481' }
};

/** Cihaz teknik bilgi formu — her cihaz tipinin kendine özgü alanları vardır. */
export const FIELDS_BY_TYPE = {
  MRI: [
    { key: 'model', ...TYPE_FIELDS.model },
    { key: 'magneticField',   label: 'Manyetik Alan Gücü',                     placeholder: 'Örn. 1.5 Tesla' },
    { key: 'serialNo', ...TYPE_FIELDS.serialNo },
    { key: 'boreSize',        label: 'Gantry / Açıklık Çapı (Bore Size)',      placeholder: 'Örn. 70 cm' },
    { key: 'gradientSystem',  label: 'Gradient Sistemi',                       placeholder: 'Örn. XQ Gradient 45 mT/m' },
    { key: 'coolingType',     label: 'Soğutma Tipi',                           placeholder: 'Örn. Helyum Soğutmalı' }
  ],
  'Röntgen': [
    { key: 'model', ...TYPE_FIELDS.model },
    { key: 'serialNo', ...TYPE_FIELDS.serialNo },
    { key: 'tubeVoltage',  label: 'Tüp Voltajı (kVp)', placeholder: 'Örn. 40-150 kVp' },
    { key: 'tubeCurrent',  label: 'Tüp Akımı (mA)',    placeholder: 'Örn. 10-630 mA' },
    { key: 'detectorType', label: 'Dedektör Tipi',     placeholder: 'Örn. Dijital Flat Panel' }
  ],
  BT: [
    { key: 'model', ...TYPE_FIELDS.model },
    { key: 'serialNo', ...TYPE_FIELDS.serialNo },
    { key: 'sliceCount',     label: 'Kesit Sayısı',           placeholder: 'Örn. 128 Kesit' },
    { key: 'tubeVoltage',    label: 'Tüp Voltajı (kVp)',      placeholder: 'Örn. 80-140 kVp' },
    { key: 'gantryAperture', label: 'Gantry Açıklığı',        placeholder: 'Örn. 78 cm' }
  ],
  'PET-CT': [
    { key: 'model', ...TYPE_FIELDS.model },
    { key: 'serialNo', ...TYPE_FIELDS.serialNo },
    { key: 'isotopeType',    label: 'Kullanılan İzotop',            placeholder: 'Örn. F-18 FDG' },
    { key: 'detectorRings',  label: 'Dedektör Halka Sayısı',        placeholder: 'Örn. 4 Halka' },
    { key: 'axialFov',       label: 'Aksiyal Görüş Alanı (FOV)',    placeholder: 'Örn. 26 cm' }
  ],
  Ultrason: [
    { key: 'model', ...TYPE_FIELDS.model },
    { key: 'serialNo', ...TYPE_FIELDS.serialNo },
    { key: 'probeFrequency', label: 'Prob Frekansı', placeholder: 'Örn. 2-5 MHz' },
    { key: 'probeType',      label: 'Prob Tipi',     placeholder: 'Örn. Konveks / Lineer' }
  ]
};

export const deviceFieldsForType = (type) => FIELDS_BY_TYPE[type] || FIELDS_BY_TYPE.MRI;

export const ROLES = { technician: 'technician', doctor: 'doctor' };
export const ROLE_LABELS = { technician: 'Teknisyen', doctor: 'Doktor' };

/** Sidebar görünümleri. roles: bu görünümü hangi roller görebilir. */
export const VIEWS = [
  { id: 'panel',        label: 'İzleme Paneli',          icon: 'ph ph-gauge',                   roles: ['technician'] },
  { id: 'devices',      label: 'Cihazlar',               icon: 'ph ph-first-aid-kit',           roles: ['technician'] },
  { id: 'appointments', label: 'Çekim Randevuları',      icon: 'ph ph-calendar-check',          roles: ['technician'] },
  { id: 'imaging',        label: 'Görüntü Değerlendirme', icon: 'ph ph-magnifying-glass',      roles: ['doctor'] },
  { id: 'reporting',      label: 'Raporlama',             icon: 'ph ph-file-text',             roles: ['doctor'] },
  { id: 'approvedReports', label: 'Onaylanmış Raporlar',  icon: 'ph ph-seal-check',            roles: ['doctor'] },
  { id: 'reports',      label: 'Raporlar',               icon: 'ph ph-clipboard-text',          roles: ['technician'] },
  { id: 'replacement',  label: 'Değişim Maliyeti',       icon: 'ph ph-currency-circle-dollar',  roles: ['technician'] },
  { id: 'biomedical',   label: 'Biyomedikal Destek',     icon: 'ph ph-headset',                 roles: ['technician'] }
];

export const viewsForRole = (role) => VIEWS.filter((v) => v.roles.includes(role || 'technician'));

/** Randevu/çekim iş akışı durum meta verisi (backend AppointmentStatuses ile birebir). */
export const APPOINTMENT_STATUS = {
  Scheduled:       { label: 'Planlandı',                icon: 'ph ph-calendar-dots',    tone: 'neutral' },
  NotArrived:      { label: 'Gelmedi',                  icon: 'ph ph-user-minus',       tone: 'danger' },
  Waiting:         { label: 'Bekliyor',                 icon: 'ph ph-hourglass-medium', tone: 'accent' },
  Running:         { label: 'Çalışıyor',                icon: 'ph ph-spinner-gap',      tone: 'accent' },
  Cancelled:       { label: 'İptal',                    icon: 'ph ph-x-circle',         tone: 'danger' },
  ImageCreated:    { label: 'Görüntü Oluşturuldu',      icon: 'ph ph-image-square',     tone: 'info' },
  ImageEvaluation: { label: 'Görüntü Değerlendirmesi',  icon: 'ph ph-magnifying-glass', tone: 'info' },
  Reporting:       { label: 'Raporlaştırma',            icon: 'ph ph-file-text',        tone: 'info' },
  Approved:        { label: 'Hekim Onayı',              icon: 'ph ph-seal-check',       tone: 'success' }
};

/** Durum tonunu mevcut .tag sınıflarına eşler. */
export const STATUS_TAG_CLASS = { neutral: 'tag-neutral', accent: 'tag-accent', info: 'tag-accent-2', success: 'tag-success', danger: 'tag-danger' };

/** Cihaz tipine göre varsayılan çekim süresi (dakika). */
export const DEFAULT_DURATION_BY_TYPE = { MRI: 30, 'Röntgen': 15, BT: 20, 'PET-CT': 45, Ultrason: 20 };
export const defaultDurationForType = (type) => DEFAULT_DURATION_BY_TYPE[type] || 20;

/** Cihaz değişim maliyeti kalem kategorileri — backend'deki kategori kodlarıyla birebir eşleşir. */
export const COST_CATEGORIES = [
  { key: 'purchase',     label: 'Yeni Cihaz Alımı',    icon: 'ph ph-shopping-cart' },
  { key: 'decommission', label: 'Söküm / İmha',        icon: 'ph ph-recycle' },
  { key: 'installation', label: 'Kurulum & Montaj',    icon: 'ph ph-wrench' },
  { key: 'calibration',  label: 'Kalibrasyon & Test',  icon: 'ph ph-gauge' },
  { key: 'parts',        label: 'Yedek Parça',         icon: 'ph ph-gear' },
  { key: 'labor',        label: 'İşçilik',             icon: 'ph ph-users-three' },
  { key: 'transport',    label: 'Nakliye & Sigorta',   icon: 'ph ph-truck' }
];
export const COST_CATEGORY_BY_KEY = Object.fromEntries(COST_CATEGORIES.map((c) => [c.key, c]));

/** Backend'in desteklediği para birimleri (TRY = TL). */
export const CURRENCIES = ['TRY', 'USD', 'EUR'];

export const PARAM_BY_KEY = Object.fromEntries(PARAM_DEFS.map((p) => [p.key, p]));
export const DEVICE_BY_ID = Object.fromEntries(DEVICES.map((d) => [d.id, d]));

const TYPE_ICONS = {
  MRI: 'ph ph-circle-dashed',
  'Röntgen': 'ph ph-scan',
  BT: 'ph ph-aperture',
  'PET-CT': 'ph ph-atom',
  Ultrason: 'ph ph-waveform'
};
export const deviceIcon = (type) => TYPE_ICONS[type] || 'ph ph-scan';

/** Backend'in DeviceType enum'ı JSON'da sayı olarak gelir.
 * Varsayılan sıra: Mri=0, Xray=1, Bt=2, PetCt=3, Ultrasound=4.
 * Backend'de yeni tipler farklı sırayla eklenirse bu eşleme güncellenmelidir. */
const BACKEND_TYPE_LABELS = ['MRI', 'Röntgen', 'BT', 'PET-CT', 'Ultrason'];
export const backendTypeLabel = (type) => {
  if (typeof type === 'number') return BACKEND_TYPE_LABELS[type] || 'MRI';
  return DEVICE_TYPES.includes(type) ? type : (type === 'Xray' ? 'Röntgen' : type === 'Mri' ? 'MRI' : 'MRI');
};

export const TICK_MS = { yavas: 5000, normal: 2500, hizli: 1200 };
