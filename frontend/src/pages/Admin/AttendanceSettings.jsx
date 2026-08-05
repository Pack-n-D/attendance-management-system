import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import AdminSidebar from '../../components/AdminSidebar';
import { apiFetch } from '../../utils/api';
import { Settings, Clock, Plus, Trash2, Save, Info } from 'lucide-react';

export default function AttendanceSettings() {
  const [idealPunchInTime, setIdealPunchInTime] = useState('09:30');
  const [idealPunchOutTime, setIdealPunchOutTime] = useState('18:30');
  const [bufferMinutesIn, setBufferMinutesIn] = useState(15);
  const [bufferMinutesOut, setBufferMinutesOut] = useState(15);
  const [weeklyOffs, setWeeklyOffs] = useState(['Saturday', 'Sunday']);
  const [halfDayThresholdIn, setHalfDayThresholdIn] = useState('12:00');

  const [holidays, setHolidays] = useState([]);
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayLabel, setNewHolidayLabel] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchRulesAndHolidays();
  }, []);

  const fetchRulesAndHolidays = async () => {
    setLoading(true);
    try {
      const ruleRes = await apiFetch('/settings/attendance-rules');
      const r = ruleRes.rule;
      if (r) {
        setIdealPunchInTime(r.idealPunchInTime);
        setIdealPunchOutTime(r.idealPunchOutTime);
        setBufferMinutesIn(r.bufferMinutesIn);
        setBufferMinutesOut(r.bufferMinutesOut);
        setWeeklyOffs(r.weeklyOffs || ['Saturday', 'Sunday']);
        setHalfDayThresholdIn(r.halfDayThresholdIn || '12:00');
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
      return `Punch-in after ${formattedH}:${formattedM} ${period} will be marked Late.`;
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
          halfDayThresholdIn
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
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
                  <label htmlFor="halfDay">Half-Day Threshold (Punch-In After)</label>
                  <input
                    id="halfDay"
                    type="time"
                    className="apc-input"
                    value={halfDayThresholdIn}
                    onChange={e => setHalfDayThresholdIn(e.target.value)}
                  />
                  <p className="apc-helper-text">Punches recorded after this time will be marked as Half Day instead of Late.</p>
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
        </main>
      </div>
    </>
  );
}
