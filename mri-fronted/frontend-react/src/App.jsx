import { useEffect, useRef, useState } from 'react';
import { useSession } from './hooks/useSession.js';
import { useMonitor } from './hooks/useMonitor.js';
import { useSidebarState } from './hooks/useSidebarState.js';
import { useTheme } from './hooks/useTheme.js';
import { downloadReport } from './lib/api.js';
import { DEVICES, VIEWS, DEVICE_BY_ID, paramsForDevice } from './lib/constants.js';
import { fmt, fmtDateTime, fmtDateTimeSec, dayStartMs, dayEndMs } from './lib/format.js';
import Login from './components/Login.jsx';
import Sidebar from './components/Sidebar.jsx';
import TopBar from './components/TopBar.jsx';
import KpiRow from './components/KpiRow.jsx';
import DeviceCard from './components/DeviceCard.jsx';
import DeviceDetail from './components/DeviceDetail.jsx';
import DevicesTable from './components/DevicesTable.jsx';
import ThresholdsView from './components/ThresholdsView.jsx';
import ReportsView from './components/ReportsView.jsx';
import AlertBanner from './components/AlertBanner.jsx';
import AlertModal from './components/AlertModal.jsx';
import BiomedicalChat from './components/BiomedicalChat.jsx';
import ReplacementCostView from './components/ReplacementCostView.jsx';
import AppointmentsView from './components/AppointmentsView.jsx';
import DoctorEvaluationView from './components/DoctorEvaluationView.jsx';
import ReportingView from './components/ReportingView.jsx';
import ApprovedReportsView from './components/ApprovedReportsView.jsx';

function enrichEvent(e) {
  const d = DEVICE_BY_ID[e.deviceId];
  const p = d && paramsForDevice(d.id).find((x) => x.key === e.param);
  return {
    id: e.id,
    deviceId: e.deviceId,
    deviceName: d ? d.name : e.deviceId,
    icon: p ? p.icon : 'ph ph-bell',
    paramLabel: p ? p.label : e.param,
    valueStr: p ? fmt(p, e.value) + ' ' + p.unit : String(e.value),
    thresholdStr: p ? '> ' + fmt(p, p.threshold) + ' ' + p.unit : '',
    timeStr: fmtDateTimeSec(new Date(e.timestamp)),
    timestamp: e.timestamp
  };
}

export default function App() {
  const { technician, shiftStart, error, busy, login, logout } = useSession();
  const monitor = useMonitor(!!technician);
  const { values, history, activeAlerts, occupancy, events, modalAlert, setModalAlert, connection, tickMs } = monitor;

  const [view, setView] = useState(() => (technician?.role === 'doctor' ? 'imaging' : 'panel'));
  const [selectedDevice, setSelectedDevice] = useState(DEVICES[0].id);
  const [detailOrigin, setDetailOrigin] = useState('panel');
  const [now, setNow] = useState(Date.now());
  const [filters, setFilters] = useState({ deviceId: 'all', start: '', end: '' });
  const [exporting, setExporting] = useState(false);
  const { collapsed: sidebarCollapsed, toggleCollapse: toggleSidebarCollapse, mobileOpen: sidebarMobileOpen, setMobileOpen: setSidebarMobileOpen } = useSidebarState();
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Role göre giriş sonrası varsayılan sayfaya yönlendir (doktor → Görüntüleme, teknisyen → Panel).
  const roleRef = useRef(null);
  useEffect(() => {
    const role = technician?.role;
    if (!role) { roleRef.current = null; return; }
    if (roleRef.current !== role) {
      roleRef.current = role;
      setView(role === 'doctor' ? 'imaging' : 'panel');
    }
  }, [technician?.role]);

  if (!technician) {
    return <Login onSubmit={login} error={error} busy={busy} />;
  }

  // Doktor rolü izleme paneli ve eşik uyarılarını (banner + modal) görmez; bunlar teknisyene özeldir.
  const isDoctor = technician.role === 'doctor';

  const activeItems = [];
  let totalAlerts = 0;
  DEVICES.forEach((d) => {
    paramsForDevice(d.id).forEach((p) => {
      if (activeAlerts[d.id][p.key]) {
        totalAlerts += 1;
        activeItems.push({ id: d.id + '-' + p.key, text: d.name + ' · ' + p.label + ' ' + fmt(p, values[d.id][p.key]) + p.unit });
      }
    });
  });
  const anyAlert = totalAlerts > 0;
  const occupiedCount = DEVICES.filter((d) => occupancy[d.id]).length;

  const kpis = [
    { label: 'Toplam Cihaz', value: DEVICES.length, icon: 'ph ph-first-aid-kit' },
    { label: 'Aktif Uyarı', value: totalAlerts, icon: 'ph ph-siren', valueColor: anyAlert ? 'var(--color-accent-300)' : undefined },
    { label: 'Dolu Oda', value: occupiedCount, icon: 'ph ph-user-focus' },
    { label: 'Toplam Kayıt', value: events.length, icon: 'ph ph-clipboard-text' }
  ];

  const detailDevice = view === 'deviceDetail' ? DEVICE_BY_ID[selectedDevice] : null;
  const currentView = detailDevice
    ? { label: detailDevice.name, icon: detailDevice.icon }
    : VIEWS.find((v) => v.id === view) || VIEWS[0];

  const filteredRows = events
    .filter((e) => filters.deviceId === 'all' || e.deviceId === filters.deviceId)
    .filter((e) => e.timestamp >= dayStartMs(filters.start) && e.timestamp <= dayEndMs(filters.end))
    .map(enrichEvent);

  const handleExport = async () => {
    if (!filters.start || !filters.end) return;
    setExporting(true);
    try {
      const meta = {
        deviceLabel: filters.deviceId === 'all' ? 'Tüm Cihazlar' : DEVICE_BY_ID[filters.deviceId].name,
        start: filters.start ? fmtDateTime(new Date(dayStartMs(filters.start))) : '—',
        end: filters.end ? fmtDateTime(new Date(dayEndMs(filters.end))) : '—',
        createdAt: fmtDateTime(new Date()),
        technicianName: technician.name + ' ' + technician.surname,
        technicianSicil: technician.sicil
      };
      await downloadReport(
        { deviceId: filters.deviceId === 'all' ? undefined : filters.deviceId, startMs: filters.start ? dayStartMs(filters.start) : undefined, endMs: filters.end ? dayEndMs(filters.end) : undefined },
        filteredRows,
        meta
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar
        view={view} onView={setView} alertCount={totalAlerts} tickMs={tickMs} eventCount={events.length} connection={connection}
        collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebarCollapse}
        mobileOpen={sidebarMobileOpen} onCloseMobile={() => setSidebarMobileOpen(false)}
        technician={technician} shiftStart={shiftStart} onLogout={logout}
        theme={resolvedTheme} onSetTheme={setTheme}
      />
      <div className={'sidebar-backdrop' + (sidebarMobileOpen ? ' sidebar-open' : '')} onClick={() => setSidebarMobileOpen(false)} />

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <TopBar
          viewTitle={currentView.label}
          viewIcon={currentView.icon}
          anyAlert={anyAlert && !isDoctor}
          now={now}
          onOpenSidebar={() => setSidebarMobileOpen(true)}
        />

        {!isDoctor && <AlertBanner items={activeItems} technicianName={technician.name + ' ' + technician.surname} />}

        {view === 'panel' && (
          <div style={{ padding: 'var(--space-4) var(--space-5) var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            <KpiRow kpis={kpis} />
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 'var(--space-5)', maxWidth: 1060, width: '100%', margin: '0 auto' }}>
              {DEVICES.map((d) => (
                <div key={d.id} style={{ flex: '1 1 max(280px, calc(50% - var(--space-5) / 2))', maxWidth: 'calc(50% - var(--space-5) / 2)' }}>
                  <DeviceCard
                    device={d}
                    history={history[d.id]}
                    alerts={activeAlerts[d.id]}
                    occupied={occupancy[d.id]}
                    onSelect={() => { setSelectedDevice(d.id); setDetailOrigin('panel'); setView('deviceDetail'); }}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: '15px', border: '1px solid', borderRadius: '8px', backgroundColor: '#fffff' }}>
                <i className="ph ph-sliders-horizontal" style={{ fontSize: 17, color: 'var(--color-accent)'}} />
                <h6 style={{ margin: 0, color: 'var(--color-neutral-400)' }}>Eşik Değerleri</h6>
              </div>
              <ThresholdsView events={events} />
            </div>
          </div>
        )}

        {view === 'devices' && (
          <DevicesTable
            values={values}
            alerts={activeAlerts}
            occupancy={occupancy}
            onSelect={(id) => { setSelectedDevice(id); setDetailOrigin('devices'); setView('deviceDetail'); }}
          />
        )}

        {view === 'deviceDetail' && detailDevice && (
          <DeviceDetail
            key={detailDevice.id}
            device={detailDevice}
            values={values[detailDevice.id]}
            history={history[detailDevice.id]}
            tickMs={tickMs}
            alerts={activeAlerts[detailDevice.id]}
            occupied={occupancy[detailDevice.id]}
            showLiveData={detailOrigin === 'panel'}
            onBack={() => setView(detailOrigin)}
          />
        )}

        {view === 'reports' && (
          <ReportsView filters={filters} setFilters={setFilters} rows={filteredRows} onExport={handleExport} exporting={exporting} />
        )}

        {view === 'biomedical' && (
          <BiomedicalChat technicianName={technician.name + ' ' + technician.surname} />
        )}

        {view === 'replacement' && (
          <ReplacementCostView technicianName={technician.name + ' ' + technician.surname} />
        )}

        {view === 'appointments' && (
          <AppointmentsView technicianName={technician.name + ' ' + technician.surname} />
        )}

        {view === 'imaging' && (
          <DoctorEvaluationView onNavigate={setView} />
        )}

        {view === 'reporting' && (
          <ReportingView />
        )}

        {view === 'approvedReports' && (
          <ApprovedReportsView />
        )}
      </div>

      {!isDoctor && <AlertModal alert={modalAlert} onDismiss={() => setModalAlert(null)} />}
    </div>
  );
}

