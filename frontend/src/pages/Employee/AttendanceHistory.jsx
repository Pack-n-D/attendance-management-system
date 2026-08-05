import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import StatusBadge from '../../components/StatusBadge';
import { apiFetch } from '../../utils/api';
import { Calendar as CalendarIcon, List, Clock, AlertCircle } from 'lucide-react';

export default function AttendanceHistory() {
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'table'
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/employee/attendance-history');
      setHistoryData(data);
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoading(false);
    }
  };

  const records = historyData?.records || [];
  const summary = historyData?.summary || { present: 0, late: 0, absent: 0, onLeave: 0 };

  return (
    <>
      <Navbar />
      <main className="apc-main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem' }}>Attendance History</h1>
            <p style={{ fontSize: '0.88rem', color: 'var(--apc-text-secondary)' }}>View your personal attendance logs and monthly summary</p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--apc-surface)', padding: '4px', borderRadius: 'var(--apc-radius-sm)', border: '1px solid var(--apc-border)' }}>
            <button
              onClick={() => setViewMode('calendar')}
              className={`apc-btn ${viewMode === 'calendar' ? 'apc-btn-primary' : 'apc-btn-secondary'}`}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
            >
              <CalendarIcon size={16} /> Calendar View
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`apc-btn ${viewMode === 'table' ? 'apc-btn-primary' : 'apc-btn-secondary'}`}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
            >
              <List size={16} /> List View
            </button>
          </div>
        </div>

        {/* Monthly Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="apc-card" style={{ borderLeft: '4px solid var(--apc-success)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)', fontWeight: 600 }}>PRESENT</span>
            <h2 style={{ fontSize: '1.6rem', color: 'var(--apc-success)', marginTop: '0.25rem' }}>{summary.present}</h2>
          </div>
          <div className="apc-card" style={{ borderLeft: '4px solid var(--apc-danger)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)', fontWeight: 600 }}>LATE</span>
            <h2 style={{ fontSize: '1.6rem', color: 'var(--apc-danger)', marginTop: '0.25rem' }}>{summary.late}</h2>
          </div>
          <div className="apc-card" style={{ borderLeft: '4px solid var(--apc-info)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)', fontWeight: 600 }}>ON LEAVE</span>
            <h2 style={{ fontSize: '1.6rem', color: 'var(--apc-info)', marginTop: '0.25rem' }}>{summary.onLeave}</h2>
          </div>
          <div className="apc-card" style={{ borderLeft: '4px solid var(--apc-text-secondary)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)', fontWeight: 600 }}>ABSENT</span>
            <h2 style={{ fontSize: '1.6rem', color: 'var(--apc-text-secondary)', marginTop: '0.25rem' }}>{summary.absent}</h2>
          </div>
        </div>

        {/* Content Views */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>Loading attendance records...</div>
        ) : viewMode === 'calendar' ? (
          /* Grid View */
          <div className="apc-card">
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Recent Attendance Days</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.85rem' }}>
              {records.map(rec => (
                <div
                  key={rec.id}
                  onClick={() => setSelectedRecord(rec)}
                  className="apc-card"
                  style={{
                    cursor: 'pointer',
                    padding: '0.85rem',
                    borderRadius: 'var(--apc-radius-sm)',
                    border: '1px solid var(--apc-border)',
                    backgroundColor: 'var(--apc-surface)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>{rec.date}</div>
                  <StatusBadge status={rec.status} />
                  <div style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)', marginTop: '0.5rem' }}>
                    In: {rec.punchInTime || '—'}<br />
                    Out: {rec.punchOutTime || '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Table View */
          <div className="apc-table-container">
            <table className="apc-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Punch In</th>
                  <th>Punch Out</th>
                  <th>Status</th>
                  <th>Late Reason</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--apc-text-secondary)', padding: '2rem' }}>
                      No attendance records found.
                    </td>
                  </tr>
                ) : (
                  records.map(r => (
                    <tr key={r.id} onClick={() => setSelectedRecord(r)} style={{ cursor: 'pointer' }}>
                      <td><strong>{r.date}</strong></td>
                      <td>{r.punchInTime || '—'}</td>
                      <td>{r.punchOutTime || '—'}</td>
                      <td><StatusBadge status={r.status} /></td>
                      <td style={{ color: 'var(--apc-text-secondary)', fontSize: '0.85rem' }}>{r.lateReason || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Record Detail Modal */}
        {selectedRecord && (
          <div className="apc-modal-overlay">
            <div className="apc-modal" style={{ maxWidth: '420px' }}>
              <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--apc-border)', paddingBottom: '0.5rem' }}>
                Attendance Detail — {selectedRecord.date}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
                <div>
                  <span style={{ color: 'var(--apc-text-secondary)', fontSize: '0.8rem', display: 'block' }}>STATUS</span>
                  <StatusBadge status={selectedRecord.status} />
                </div>
                <div>
                  <span style={{ color: 'var(--apc-text-secondary)', fontSize: '0.8rem', display: 'block' }}>TIMINGS</span>
                  <strong>Punch In: {selectedRecord.punchInTime || 'Not recorded'}</strong><br />
                  <strong>Punch Out: {selectedRecord.punchOutTime || 'Not recorded'}</strong>
                </div>

                {selectedRecord.lateReason && (
                  <div style={{ background: 'var(--apc-warning-bg)', padding: '0.75rem', borderRadius: 'var(--apc-radius-sm)', border: '1px solid rgba(226,163,59,0.3)' }}>
                    <span style={{ color: 'var(--apc-warning)', fontWeight: 600, fontSize: '0.8rem', display: 'block' }}>LATE REASON</span>
                    <p style={{ fontSize: '0.88rem', marginTop: '2px' }}>{selectedRecord.lateReason}</p>
                  </div>
                )}

                {selectedRecord.punchInPhotoUrl && (
                  <div>
                    <span style={{ color: 'var(--apc-text-secondary)', fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>PUNCH PHOTO</span>
                    <img src={selectedRecord.punchInPhotoUrl} alt="Punch Selfie" style={{ width: '100%', borderRadius: 'var(--apc-radius-sm)', maxHeight: '200px', objectFit: 'cover' }} />
                  </div>
                )}
              </div>

              <div style={{ textAlign: 'right', marginTop: '1.25rem' }}>
                <button onClick={() => setSelectedRecord(null)} className="apc-btn apc-btn-primary">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
