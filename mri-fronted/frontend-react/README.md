# AuraMed — React Arayüz (Vite)

MRI / Röntgen izleme panelinin React sürümü (v2 tasarımı). Nocturne tasarım sistemi token'ları `src/styles/nocturne.css` içinde vendor'lanmıştır.

## Çalıştırma (VSCode)

```bash
# 1) Backend (../mri-backend) — ASP.NET Core, SQLite, SignalR
cd mri-backend/MriMonitoring.Api && dotnet run      # http://localhost:5119

# 2) React arayüz (yeni terminal)
cd frontend-react && npm install && npm run dev     # http://localhost:5173
```

Vite `/api` ve `/hubs` isteklerini `localhost:5119`'a proxy'ler. Backend başka adreste ise `.env`:

```
VITE_API_URL=https://sunucu-adresim
VITE_HUB_URL=wss://sunucu-adresim/hubs/sensor
```

## Backend sözleşmesi (MriMonitoring.Api)

| Uç | Yanıt |
| --- | --- |
| `POST /api/auth/verify` `{firstName,lastName,employeeId}` | `{ firstName, lastName, employeeId }` — token yok, gerçek kimlik doğrulama değildir |
| `GET /api/devices` | `[{ deviceId, name, room, type, lastTemperature, lastHumidity, lastRadiation, isRoomOccupied, isThresholdExceeded, ... }]` |
| `GET /api/alarms/history?deviceId&startDate&endDate` | `[{ timestamp, deviceId, deviceName, parameter, value, thresholdValue }]` |
| `GET /api/reports/pdf?deviceId&startDate&endDate` | PDF akışı (QuestPDF) |
| SignalR hub `/hubs/sensor` | `ReceiveReading`, `ReceiveAlarm`, `ReceiveAlarmOngoing`, `ReceiveAlarmCleared` olayları (~5 sn'de bir) |

Backend cihazları veritabanından (SQLite, `DbSeeder`) sırayla döner: 2 MRI + 2 Röntgen. Arayüz bunları sabit `mri1/mri2/xray1/xray2` slotlarına tip + sıraya göre eşler (`hooks/useMonitor.js`). Eşik değerleri arayüzde global/parametre bazlı gösterilir (`lib/constants.js`); backend'deki cihaz bazlı min/max değerlerden bağımsızdır — bu bir demo arayüz basitleştirmesidir.

Backend erişilemezse arayüz **demo moduna** düşer (yerel simülasyon) ve PDF'i istemcide jsPDF ile üretir — böylece tek başına da çalışır.

## Yapı

```
frontend-react/
├─ index.html                 # Nocturne CSS, Phosphor ikonlar, jsPDF
├─ vite.config.js             # /api + /hubs proxy
└─ src/
   ├─ App.jsx                 # görünüm yönlendirme, seçim, filtreler
   ├─ hooks/useMonitor.js     # REST + SignalR canlı veri, demo simülasyon
   ├─ hooks/useSession.js     # teknisyen oturumu, vardiya saati
   ├─ lib/api.js              # fetch sarmalayıcı, SignalR hub adresi, PDF indirme
   ├─ lib/constants.js        # cihazlar, parametreler, eşikler, menü
   ├─ lib/format.js           # tarih / sayı biçimleme
   ├─ styles/nocturne.css     # tasarım sistemi token'ları
   ├─ styles/app.css          # gövde reset + animasyonlar
   └─ components/
      ├─ Login.jsx            # iki kolonlu giriş, biyomedikal ikon arka planı
      ├─ Sidebar.jsx          # 4 görünümlü menü + canlı akış kartı
      ├─ TopBar.jsx           # başlık, sistem durumu, saat, teknisyen menüsü
      ├─ AlertBanner.jsx      # eşik aşımı bandı
      ├─ KpiRow.jsx           # 4 KPI kartı
      ├─ DeviceCard.jsx       # cihaz kartı + mini bar göstergeler
      ├─ MainChart.jsx        # alan grafiği, eşik çizgisi, min/maks/ort
      ├─ ParamCards.jsx       # 3 parametre kartı + sparkline
      ├─ DevicesTable.jsx     # cihaz tablosu
      ├─ ThresholdsView.jsx   # eşik değerleri
      ├─ ReportsView.jsx      # filtre + tablo + PDF
      └─ AlertModal.jsx       # eşik aşımı modalı
```
