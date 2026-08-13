import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import AdminSidebar from '../../components/AdminSidebar';
import { apiFetch } from '../../utils/api';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_OFFICE_CONFIG } from '../../utils/constants';
import { Settings, Clock, Plus, Trash2, Save, Info, KeyRound, MapPin } from 'lucide-react';

export default function AttendanceSettings() {
  const navigate = useNavigate();
  const [idealPunchInTime, setIdealPunchInTime] = useState('10:00');
  const [idealPunchOutTime, setIdealPunchOutTime] = useState('18:30');
  const [bufferMinutesIn, setBufferMinutesIn] = useState(15);
  const [bufferMinutesOut, setBufferMinutesOut] = useState(15);
  const [weeklyOffs, setWeeklyOffs] = useState(['Saturday', 'Sunday']);
  const [halfDayThresholdIn, setHalfDayThresholdIn] = useState('12:00');

  // Second Half shift settings
  const [secondHalfStartTime, setSecondHalfStartTime] = useState('13:00');
  const [secondHalfEndTime, setSecondHalfEndTime] = useState('18:30');
  const [secondHalfMinPunchOut, setSecondHalfMinPunchOut] = useState('18:30');

  // Office Location & Geofencing Settings
  const [officeAddress, setOfficeAddress] = useState(DEFAULT_OFFICE_CONFIG.address);
  const [officeLat, setOfficeLat] = useState(DEFAULT_OFFICE_CONFIG.lat);
  const [officeLng, setOfficeLng] = useState(DEFAULT_OFFICE_CONFIG.lng);
  const [allowedRadiusMeters, setAllowedRadiusMeters] = useState(DEFAULT_OFFICE_CONFIG.allowedRadiusMeters);
  const [geofenceEnabled, setGeofenceEnabled] = useState(DEFAULT_OFFICE_CONFIG.geofenceEnabled);

  const [holidays, setHolidays] = useState([]);
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayLabel, setNewHolidayLabel] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [resettingDb, setResettingDb] = useState(false);

  const handleResetDatabase = async () => {
    if (!window.confirm("ARE YOU SURE? This will permanently delete all test employees, attendance records, and leave logs. Only the Super Admin (SUPERADMIN01 / Admin@123) will remain.")) {
      return;
    }
    setResettingDb(true);
    try {
      const res = await apiFetch('/admin/reset-database', { method: 'POST' });
      setSuccessMsg(res.message);
      setTimeout(() => setSuccessMsg(''), 6000);
      fetchRulesAndHolidays();
    } catch (err) {
      alert("Reset failed: " + err.message);
    } finally {
      setResettingDb(false);
    }
  };

  useEffect(() => {
    fetchRulesAndHolidays();
  }, []);

  const fetchRulesAndHolidays = async () => {
    setLoading(true);
    try {
      const ruleRes = await apiFetch('/settings/attendance-rules');
      const r = ruleRes.rule;
      if (r) {
        setIdealPunchInTime(r.idealPunchInTime || '10:00');
        setIdealPunchOutTime(r.idealPunchOutTime || '18:30');
        setBufferMinutesIn(r.bufferMinutesIn || 15);
        setBufferMinutesOut(r.bufferMinutesOut || 15);
        setWeeklyOffs(r.weeklyOffs || ['Saturday', 'Sunday']);
        setHalfDayThresholdIn(r.halfDayThresholdIn || '12:00');
        setSecondHalfStartTime(r.secondHalfStartTime || '13:00');
        setSecondHalfEndTime(r.secondHalfEndTime || '18:30');
        setSecondHalfMinPunchOut(r.secondHalfMinPunchOut || '18:30');
        setOfficeAddress(r.officeAddress || DEFAULT_OFFICE_CONFIG.address);
        setOfficeLat(r.officeLat ?? DEFAULT_OFFICE_CONFIG.lat);
        setOfficeLng(r.officeLng ?? DEFAULT_OFFICE_CONFIG.lng);
        setAllowedRadiusMeters(r.allowedRadiusMeters ?? DEFAULT_OFFICE_CONFIG.allowedRadiusMeters);
        setGeofenceEnabled(r.geofenceEnabled ?? DEFAULT_OFFICE_CONFIG.geofenceEnabled);
      }

      const holRes = await apiFetch('/settings/holidays');
      setHolidays(holRes.holidays || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Compute live preview string
  const calculateLateThreshold = () => {
    try {
      const [h, m] = idealPunchInTime.split(':').map(Number);
      const totalMinutes = h * 60 + m + Number(bufferMinutesIn);
      const endH = Math.floor(totalMinutes / 60) % 24;
      const endM = totalMinutes % 60;
      const period = endH >= 12 ? 'PM' : 'AM';
      const formattedH = endH % 12 || 12;
      const formattedM = endM < 10 ? `0${endM}` : endM;
      return `First Half / Full Day: In by 10:00 AM (${formattedH}:${formattedM} ${period} late cutoff). Second Half: In by 1:00 PM (${secondHalfStartTime} - ${secondHalfEndTime}).`;
    } catch (e) {
      return '';
    }
  };

  const handleSaveRules = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');

    try {
      const res = await apiFetch('/settings/attendance-rules', {
        method: 'POST',
        body: JSON.stringify({
          idealPunchInTime,
          idealPunchOutTime,
          bufferMinutesIn,
          bufferMinutesOut,
          weeklyOffs,
          halfDayThresholdIn,
          secondHalfStartTime,
          secondHalfEndTime,
          secondHalfMinPunchOut,
          officeAddress,
          officeLat,
          officeLng,
          allowedRadiusMeters,
          geofenceEnabled
        })
      });
      setSuccessMsg(res.message);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert("Failed to save settings: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!newHolidayDate || !newHolidayLabel) return;
    try {
      await apiFetch('/settings/holidays', {
        method: 'POST',
        body: JSON.stringify({ date: newHolidayDate, label: newHolidayLabel })
      });
      setNewHolidayDate('');
      setNewHolidayLabel('');
      fetchRulesAndHolidays();
    } catch (err) {
      alert("Failed to add holiday: " + err.message);
    }
  };

  const handleDeleteHoliday = async (id) => {
    if (!window.confirm("Remove this holiday from company calendar?")) return;
    try {
      await apiFetch(`/settings/holidays/${id}`, { method: 'DELETE' });
      fetchRulesAndHolidays();
    } catch (err) {
      alert("Failed to delete holiday: " + err.message);
    }
  };

  const toggleWeeklyOff = (day) => {
    if (weeklyOffs.includes(day)) {
      setWeeklyOffs(weeklyOffs.filter(d => d !== day));
    } else {
      setWeeklyOffs([...weeklyOffs, day]);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div style={{ padding: '3rem', textAlign: 'center' }}>Loading Settings...</div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="apc-layout-container">
        <AdminSidebar />

        <main className="apc-main-content" style={{ maxWidth: '850px' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 style={{ fontSize: '1.6rem' }}>Attendance Rules & Policy Settings</h1>
            <p style={{ fontSize: '0.88rem', color: 'var(--apc-text-secondary)' }}>
              Configure ideal punch timings, grace period buffers, and weekly off days.
            </p>
          </div>

          {successMsg && (
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--apc-success-bg)', border: '1px solid rgba(46,158,91,0.3)', color: 'var(--apc-success)', borderRadius: 'var(--apc-radius-sm)', marginBottom: '1rem', fontWeight: 600 }}>
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSaveRules}>
            {/* Live Calculation Preview Banner */}
            <div className="apc-card" style={{ background: 'linear-gradient(135deg, #FFFDF9 0%, #FDECC8 100%)', border: '1px solid var(--apc-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Info size={22} color="var(--apc-primary-dark)" style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ color: 'var(--apc-primary-dark)', fontSize: '0.95rem' }}>LIVE RULE PREVIEW</strong>
                <p style={{ fontSize: '0.9rem', color: 'var(--apc-text-primary)', marginTop: '2px', fontWeight: 600 }}>
                  "{calculateLateThreshold()}"
                </p>
                <span style={{ fontSize: '0.75rem', color: 'var(--apc-text-secondary)' }}>
                  Note: Changes apply from today forward and do not alter past historical records.
                </span>
              </div>
            </div>

            {/* Time & Buffer Rules Grid */}
            <div className="apc-card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--apc-border)', paddingBottom: '0.5rem' }}>
                Shift Timings & Grace Buffers
              </h3>

              <div className="apc-grid-2col" style={{ gap: '1.25rem' }}>
                <div className="apc-form-group">
                  <label htmlFor="idealIn">Ideal Punch-In Time</label>
                  <input
                    id="idealIn"
                    type="time"
                    className="apc-input"
                    value={idealPunchInTime}
                    onChange={e => setIdealPunchInTime(e.target.value)}
                    required
                  />
                </div>

                <div className="apc-form-group">
                  <label htmlFor="idealOut">Ideal Punch-Out Time</label>
                  <input
                    id="idealOut"
                    type="time"
                    className="apc-input"
                    value={idealPunchOutTime}
                    onChange={e => setIdealPunchOutTime(e.target.value)}
                    required
                  />
                </div>

                <div className="apc-form-group">
                  <label htmlFor="bufferIn">Punch-In Buffer (Minutes Grace)</label>
                  <input
                    id="bufferIn"
                    type="number"
                    min="0"
                    max="120"
                    className="apc-input"
                    value={bufferMinutesIn}
                    onChange={e => setBufferMinutesIn(e.target.value)}
                    required
                  />
                </div>

                <div className="apc-form-group">
                  <label htmlFor="bufferOut">Punch-Out Buffer (Minutes Grace)</label>
                  <input
                    id="bufferOut"
                    type="number"
                    min="0"
                    max="120"
                    className="apc-input"
                    value={bufferMinutesOut}
                    onChange={e => setBufferMinutesOut(e.target.value)}
                    required
                  />
                </div>

                <div className="apc-form-group" style={{ gridColumn: 'span 2' }}>
                  <label htmlFor="halfDay">Half-Day Threshold (Full Day Late Threshold)</label>
                  <input
                    id="halfDay"
                    type="time"
                    className="apc-input"
                    value={halfDayThresholdIn}
                    onChange={e => setHalfDayThresholdIn(e.target.value)}
                  />
                  <p className="apc-helper-text">Full-day punches recorded after this time will be marked as Half Day instead of Late.</p>
                </div>
              </div>
            </div>

            {/* Second Half (Half Day) Shift Rules Card */}
            <div className="apc-card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--apc-primary)' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--apc-border)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={18} color="var(--apc-primary)" /> Second Half (Half Day Shift) Rules
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--apc-text-secondary)', marginBottom: '1.25rem' }}>
                When an employee chooses <strong>Second Half (Half Day)</strong> during punch-in, punching in around 1:00 PM is marked as Half Day (not Late). If they punch out before the required punch-out time (e.g. 5:00 PM), status converts to Leave.
              </p>

              <div className="apc-grid-2col" style={{ gap: '1.25rem' }}>
                <div className="apc-form-group">
                  <label htmlFor="shStart">Second Half Punch-In Start Time</label>
                  <input
                    id="shStart"
                    type="time"
                    className="apc-input"
                    value={secondHalfStartTime}
                    onChange={e => setSecondHalfStartTime(e.target.value)}
                    required
                  />
                  <p className="apc-helper-text">Standard second half shift start (e.g., 13:00 / 1:00 PM).</p>
                </div>

                <div className="apc-form-group">
                  <label htmlFor="shEnd">Second Half Punch-Out Time</label>
                  <input
                    id="shEnd"
                    type="time"
                    className="apc-input"
                    value={secondHalfEndTime}
                    onChange={e => setSecondHalfEndTime(e.target.value)}
                    required
                  />
                  <p className="apc-helper-text">Standard second half shift end (e.g., 18:30 / 6:30 PM).</p>
                </div>

                <div className="apc-form-group" style={{ gridColumn: 'span 2' }}>
                  <label htmlFor="shMinOut">Second Half Minimum Punch-Out Threshold</label>
                  <input
                    id="shMinOut"
                    type="time"
                    className="apc-input"
                    value={secondHalfMinPunchOut}
                    onChange={e => setSecondHalfMinPunchOut(e.target.value)}
                    required
                  />
                  <p className="apc-helper-text">Punching out before this time (e.g. 5:00 PM / 5:30 PM) invalidates the half-day shift and converts status to Leave.</p>
                </div>
              </div>
            </div>

            {/* Office Location & Geo-Fencing Settings Card */}
            <div className="apc-card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid #2E9E5B' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--apc-border)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={18} color="#2E9E5B" /> Office Location & Geo-Fencing (40m Radius)
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--apc-text-secondary)', marginBottom: '1.25rem' }}>
                Restrict employee attendance punches to inside the office premises. Employees punching outside the allowed radius will be blocked.
              </p>

              <div className="apc-grid-2col" style={{ gap: '1.25rem' }}>
                <div className="apc-form-group" style={{ gridColumn: 'span 2' }}>
                  <label htmlFor="offAddr">Office Address / Location Name</label>
                  <input
                    id="offAddr"
                    type="text"
                    className="apc-input"
                    value={officeAddress}
                    onChange={e => setOfficeAddress(e.target.value)}
                    required
                  />
                </div>

                <div className="apc-form-group">
                  <label htmlFor="offLat">Office Latitude (GPS)</label>
                  <input
                    id="offLat"
                    type="number"
                    step="0.000001"
                    className="apc-input"
                    value={officeLat}
                    onChange={e => setOfficeLat(e.target.value)}
                    required
                  />
                </div>

                <div className="apc-form-group">
                  <label htmlFor="offLng">Office Longitude (GPS)</label>
                  <input
                    id="offLng"
                    type="number"
                    step="0.000001"
                    className="apc-input"
                    value={officeLng}
                    onChange={e => setOfficeLng(e.target.value)}
                    required
                  />
                </div>

                <div className="apc-form-group">
                  <label htmlFor="offRad">Allowed Radius (Meters)</label>
                  <input
                    id="offRad"
                    type="number"
                    min="5"
                    max="1000"
                    className="apc-input"
                    value={allowedRadiusMeters}
                    onChange={e => setAllowedRadiusMeters(e.target.value)}
                    required
                  />
                  <p className="apc-helper-text">Punches within this distance (default 40m) are accepted.</p>
                </div>

                <div className="apc-form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                    <input
                      type="checkbox"
                      checked={geofenceEnabled}
                      onChange={e => setGeofenceEnabled(e.target.checked)}
                      style={{ width: '18px', height: '18px' }}
                    />
                    Enable Strict Location Geo-Fencing
                  </label>
                  <p className="apc-helper-text">When checked, system forces GPS location check and blocks remote punches.</p>
                </div>
              </div>
            </div>

            {/* Weekly Off Days */}
            <div className="apc-card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--apc-border)', paddingBottom: '0.5rem' }}>
                Weekly Off Days
              </h3>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                  <label key={day} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input
                      type="checkbox"
                      checked={weeklyOffs.includes(day)}
                      onChange={() => toggleWeeklyOff(day)}
                    />
                    {day}
                  </label>
                ))}
              </div>
            </div>

            <button type="submit" className="apc-btn apc-btn-primary apc-btn-lg" disabled={saving}>
              <Save size={18} /> {saving ? 'Saving Rules...' : 'Save Attendance Rules'}
            </button>
          </form>

          {/* Holiday Calendar Management */}
          <div className="apc-card" style={{ marginTop: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--apc-border)', paddingBottom: '0.5rem' }}>
              Company Holiday Calendar
            </h3>

            <form onSubmit={handleAddHoliday} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <input
                type="date"
                className="apc-input"
                style={{ width: '180px' }}
                value={newHolidayDate}
                onChange={e => setNewHolidayDate(e.target.value)}
                required
              />
              <input
                type="text"
                className="apc-input"
                placeholder="Holiday Label (e.g. Independence Day)"
                style={{ flex: 1, minWidth: '200px' }}
                value={newHolidayLabel}
                onChange={e => setNewHolidayLabel(e.target.value)}
                required
              />
              <button type="submit" className="apc-btn apc-btn-secondary">
                <Plus size={16} /> Add Holiday
              </button>
            </form>

            <div className="apc-table-container">
              <table className="apc-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Holiday Label</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {holidays.map(h => (
                    <tr key={h.id}>
                      <td><strong>{h.date}</strong></td>
                      <td>{h.label}</td>
                      <td>
                        <button onClick={() => handleDeleteHoliday(h.id)} className="apc-btn apc-btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }}>
                          <Trash2 size={14} /> Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SUPER ADMIN PASSWORD & ACCOUNT SECURITY CARD */}
          <div className="apc-card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--apc-primary)' }}>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--apc-text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <KeyRound size={18} color="var(--apc-primary-dark)" /> Super Admin Password & Account Security
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--apc-text-secondary)', marginBottom: '1rem' }}>
              Update your Super Admin account password securely. You can change your password anytime to protect administrative access.
            </p>
            <button
              onClick={() => navigate('/profile/change-password')}
              className="apc-btn apc-btn-primary"
            >
              <KeyRound size={16} /> Change Super Admin Password
            </button>
          </div>

          {/* SYSTEM MAINTENANCE & DATA CLEANUP CARD */}
          <div className="apc-card" style={{ borderLeft: '4px solid var(--apc-danger)' }}>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--apc-danger)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Trash2 size={18} /> System Maintenance & Database Cleanup
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--apc-text-secondary)', marginBottom: '1rem' }}>
              Wipe out all temporary test employees, attendance logs, and dummy leave requests. Only the Super Admin (<strong>SUPERADMIN01</strong> / <strong>Admin@123</strong>) will remain active.
            </p>
            <button
              onClick={handleResetDatabase}
              className="apc-btn apc-btn-danger"
              disabled={resettingDb}
            >
              {resettingDb ? 'Cleaning Database...' : 'Clean Test Data & Reset Database'}
            </button>
          </div>
        </main>
      </div>
    </>
  );
}
