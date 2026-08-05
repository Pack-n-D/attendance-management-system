import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import StatusBadge from '../../components/StatusBadge';
import { apiFetch, exportAttendanceCSV } from '../../utils/api';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, FileText, Calendar, Key, RefreshCw, Power, Download, Save, Check } from 'lucide-react';

export default function EmployeeProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [tab, setTab] = useState('overview'); // 'overview', 'documents', 'attendance', 'account'
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit states for overview
  const [editingOverview, setEditingOverview] = useState(false);
  const [form, setForm] = useState({});

  // Reset password popup
  const [resetModalData, setResetModalData] = useState(null);

  useEffect(() => {
    fetchProfileDetail();
  }, [id]);

  const fetchProfileDetail = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/admin/employees/${id}`);
      setData(res);
      setForm(res.employee || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOverview = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(`/admin/employees/${id}`, {
        method: 'PUT',
        body: JSON.stringify(form)
      });
      setData(prev => ({ ...prev, employee: res.employee }));
      setEditingOverview(false);
    } catch (err) {
      alert("Failed to save changes: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!window.confirm("Are you sure you want to reset password for this employee?")) return;
    try {
      const res = await apiFetch(`/admin/employees/${id}/reset-password`, { method: 'POST' });
      setResetModalData(res.tempPassword);
    } catch (err) {
      alert("Reset password failed: " + err.message);
    }
  };

  const handleToggleStatus = async () => {
    const actionStr = emp?.status === 'active' ? 'deactivate' : 'reactivate';
    if (!window.confirm(`Are you sure you want to ${actionStr} employee ${emp?.fullName}?`)) return;
    try {
      const res = await apiFetch(`/admin/employees/${id}/toggle-status`, { method: 'POST' });
      fetchProfileDetail();
    } catch (err) {
      alert("Failed to toggle status: " + err.message);
    }
  };

  const emp = data?.employee;
  const docs = data?.documents || [];
  const logs = data?.attendanceLogs || [];

  if (loading) {
    return (
      <>
        <Navbar />
        <div style={{ padding: '3rem', textAlign: 'center' }}>Loading Employee Profile...</div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="apc-main-content">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <button onClick={() => navigate('/admin/employees')} className="apc-btn apc-btn-secondary" style={{ padding: '0.4rem 0.6rem' }}>
            <ArrowLeft size={16} /> Back to Directory
          </button>
          <div>
            <h1 style={{ fontSize: '1.5rem' }}>{emp?.fullName}</h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--apc-text-secondary)' }}>
              Employee ID: <strong style={{ fontFamily: 'monospace' }}>{emp?.id}</strong> · {emp?.department}
            </p>
          </div>
        </div>

        {/* Profile Tabs Navigation */}
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--apc-border)', marginBottom: '1.5rem' }}>
          {[
            { id: 'overview', label: 'Overview', icon: User },
            { id: 'documents', label: 'Documents', icon: FileText },
            { id: 'attendance', label: 'Attendance Log', icon: Calendar },
            { id: 'account', label: 'Account & Security', icon: Key }
          ].map(t => {
            const IconComponent = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`apc-btn ${tab === t.id ? 'apc-btn-primary' : 'apc-btn-secondary'}`}
                style={{ borderRadius: '6px 6px 0 0', borderBottom: 'none' }}
              >
                <IconComponent size={16} /> {t.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {tab === 'overview' && (
          <div className="apc-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--apc-border)', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.1rem' }}>Employee Information</h3>
              {!editingOverview ? (
                <button onClick={() => setEditingOverview(true)} className="apc-btn apc-btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                  Edit Details
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => setEditingOverview(false)} className="apc-btn apc-btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                    Cancel
                  </button>
                  <button onClick={handleSaveOverview} className="apc-btn apc-btn-primary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }} disabled={saving}>
                    <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)', display: 'block' }}>FIRST NAME</span>
                {editingOverview ? (
                  <input className="apc-input" value={form.firstName || ''} onChange={e => setForm({ ...form, firstName: e.target.value })} />
                ) : (
                  <strong>{emp?.firstName}</strong>
                )}
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)', display: 'block' }}>LAST NAME</span>
                {editingOverview ? (
                  <input className="apc-input" value={form.lastName || ''} onChange={e => setForm({ ...form, lastName: e.target.value })} />
                ) : (
                  <strong>{emp?.lastName}</strong>
                )}
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)', display: 'block' }}>EMAIL</span>
                {editingOverview ? (
                  <input className="apc-input" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} />
                ) : (
                  <strong>{emp?.email}</strong>
                )}
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)', display: 'block' }}>PHONE</span>
                {editingOverview ? (
                  <input className="apc-input" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} />
                ) : (
                  <strong>{emp?.phone}</strong>
                )}
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)', display: 'block' }}>DESIGNATION</span>
                {editingOverview ? (
                  <input className="apc-input" value={form.designation || ''} onChange={e => setForm({ ...form, designation: e.target.value })} />
                ) : (
                  <strong>{emp?.designation}</strong>
                )}
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)', display: 'block' }}>DEPARTMENT</span>
                {editingOverview ? (
                  <select className="apc-select" value={form.department || ''} onChange={e => setForm({ ...form, department: e.target.value })}>
                    <option value="Creative">Creative</option>
                    <option value="Client Servicing">Client Servicing</option>
                    <option value="Media Buying">Media Buying</option>
                    <option value="Finance">Finance</option>
                    <option value="HR">HR</option>
                  </select>
                ) : (
                  <strong>{emp?.department}</strong>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DOCUMENTS */}
        {tab === 'documents' && (
          <div className="apc-card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--apc-border)', paddingBottom: '0.5rem' }}>
              Uploaded Compliance Documents
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {['aadhaar', 'pan', 'education'].map(docType => {
                const doc = docs.find(d => d.type === docType);
                return (
                  <div key={docType} style={{ padding: '1rem', border: '1px solid var(--apc-border)', borderRadius: 'var(--apc-radius-sm)', background: 'var(--apc-bg)' }}>
                    <h4 style={{ textTransform: 'uppercase', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{docType} Document</h4>
                    {doc ? (
                      <div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--apc-text-secondary)', marginBottom: '0.5rem' }}>{doc.fileName}</p>
                        <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="apc-btn apc-btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}>
                          <Download size={14} /> Download File
                        </a>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--apc-text-secondary)' }}>No document uploaded</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: ATTENDANCE LOG */}
        {tab === 'attendance' && (
          <div className="apc-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem' }}>Personal Attendance History ({logs.length} records)</h3>
              <button onClick={() => exportAttendanceCSV()} className="apc-btn apc-btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                <Download size={14} /> Export CSV
              </button>
            </div>

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
                  {logs.map(l => (
                    <tr key={l.id}>
                      <td><strong>{l.date}</strong></td>
                      <td>{l.punchInTime || '—'}</td>
                      <td>{l.punchOutTime || '—'}</td>
                      <td><StatusBadge status={l.status} /></td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--apc-text-secondary)' }}>{l.lateReason || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: ACCOUNT */}
        {tab === 'account' && (
          <div className="apc-card" style={{ maxWidth: '540px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--apc-border)', paddingBottom: '0.5rem' }}>
              Account & Security Controls
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)', display: 'block' }}>ACCOUNT STATUS</span>
                <div style={{ marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <StatusBadge status={emp?.status} />
                  <button onClick={handleToggleStatus} className="apc-btn apc-btn-danger" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                    <Power size={14} /> {emp?.status === 'active' ? 'Deactivate Employee' : 'Reactivate Employee'}
                  </button>
                </div>
              </div>

              <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--apc-border)' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)', display: 'block' }}>ADMIN PASSWORD RESET</span>
                <p style={{ fontSize: '0.85rem', color: 'var(--apc-text-secondary)', margin: '0.25rem 0 0.75rem 0' }}>
                  Triggers a random password generation. The employee will be forced to update it upon next login.
                </p>
                <button onClick={handleResetPassword} className="apc-btn apc-btn-secondary">
                  <RefreshCw size={16} /> Reset Employee Password
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reset Password Result Modal */}
        {resetModalData && (
          <div className="apc-modal-overlay">
            <div className="apc-modal" style={{ maxWidth: '400px' }}>
              <h3>Password Reset Completed</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--apc-text-secondary)', margin: '0.5rem 0 1rem 0' }}>
                Temporary password generated for {emp?.fullName}:
              </p>
              <div style={{ background: 'var(--apc-primary-tint)', padding: '0.85rem', borderRadius: 'var(--apc-radius-sm)', textCenter: 'center', border: '1px solid var(--apc-primary)' }}>
                <code style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{resetModalData}</code>
              </div>
              <div style={{ textAlign: 'right', marginTop: '1.25rem' }}>
                <button onClick={() => setResetModalData(null)} className="apc-btn apc-btn-primary">
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
