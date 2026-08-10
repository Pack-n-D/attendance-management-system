import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../../components/Navbar';
import StatusBadge from '../../components/StatusBadge';
import Avatar from '../../components/Avatar';
import { apiFetch, exportAttendanceCSV } from '../../utils/api';
import { DEPARTMENTS } from '../../utils/constants';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, FileText, Calendar, Key, RefreshCw, Power, Download, Save, Check, Trash2, Camera } from 'lucide-react';

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
  const fileInputRef = useRef(null);

  const handleAdminPhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await apiFetch(`/admin/employees/${id}/photo`, {
          method: 'POST',
          body: JSON.stringify({ photo: reader.result })
        });
        fetchProfileDetail();
      } catch (err) {
        alert("Failed to upload photo: " + err.message);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteProfile = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete employee ${emp?.fullName} (${emp?.id})? This action cannot be undone.`)) {
      return;
    }
    try {
      await apiFetch(`/admin/employees/${id}`, { method: 'DELETE' });
      navigate('/admin/employees');
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  };

  const [salaryMonth, setSalaryMonth] = useState(new Date().toISOString().slice(0, 7));
  const [salarySlip, setSalarySlip] = useState(null);
  const [loadingSalary, setLoadingSalary] = useState(false);

  useEffect(() => {
    fetchProfileDetail();
  }, [id]);

  useEffect(() => {
    if (tab === 'payroll' && id) {
      fetchSalarySlip(salaryMonth);
    }
  }, [tab, id, salaryMonth]);

  const fetchSalarySlip = async (mStr) => {
    setLoadingSalary(true);
    try {
      const res = await apiFetch(`/admin/employees/${id}/salary-slip?month=${mStr}`);
      setSalarySlip(res.salarySlip);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSalary(false);
    }
  };

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button onClick={() => navigate('/admin/employees')} className="apc-btn apc-btn-secondary" style={{ padding: '0.4rem 0.6rem' }}>
              <ArrowLeft size={16} /> Back to Directory
            </button>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <Avatar src={emp?.profilePhotoUrl} name={emp?.fullName} size={48} />
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px',
                  backgroundColor: 'var(--apc-primary)',
                  border: '2px solid #FFFFFF',
                  borderRadius: '50%',
                  width: '22px',
                  height: '22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title="Change photo for this employee"
              >
                <Camera size={11} color="#1A1612" />
              </button>
              <input type="file" ref={fileInputRef} onChange={handleAdminPhotoUpload} accept="image/*" style={{ display: 'none' }} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', margin: 0 }}>{emp?.fullName}</h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--apc-text-secondary)' }}>
                Employee ID: <strong style={{ fontFamily: 'monospace' }}>{emp?.id}</strong> · {emp?.department}
              </p>
            </div>
          </div>

          {emp?.role !== 'super_admin' && emp?.id !== 'SUPERADMIN01' && (
            <button onClick={handleDeleteProfile} className="apc-btn apc-btn-danger">
              <Trash2 size={16} /> Delete Employee Record
            </button>
          )}
        </div>

        {/* Profile Tabs Navigation */}
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--apc-border)', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {[
            { id: 'overview', label: 'Overview', icon: User },
            { id: 'payroll', label: 'Payroll & Salary Slips', icon: FileText },
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
                <span style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)', display: 'block' }}>DATE OF BIRTH</span>
                {editingOverview ? (
                  <input type="date" className="apc-input" value={form.dob || ''} onChange={e => setForm({ ...form, dob: e.target.value })} />
                ) : (
                  <strong>{emp?.dob || '—'}</strong>
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
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                ) : (
                  <strong>{emp?.department}</strong>
                )}
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)', display: 'block' }}>BASE SALARY (MONTHLY)</span>
                {editingOverview ? (
                  <input type="number" min="0" className="apc-input" value={form.baseSalary ?? 0} onChange={e => setForm({ ...form, baseSalary: e.target.value })} />
                ) : (
                  <strong style={{ color: 'var(--apc-primary-dark)', fontSize: '1.05rem' }}>₹{Number(emp?.baseSalary || 0).toLocaleString('en-IN')}</strong>
                )}
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)', display: 'block' }}>CASUAL LEAVES REMAINING</span>
                {editingOverview ? (
                  <input type="number" step="0.5" className="apc-input" value={form.casualLeaveBalance ?? 12} onChange={e => setForm({ ...form, casualLeaveBalance: e.target.value })} />
                ) : (
                  <strong>{emp?.casualLeaveBalance ?? 12} days</strong>
                )}
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)', display: 'block' }}>SICK LEAVES REMAINING</span>
                {editingOverview ? (
                  <input type="number" step="0.5" className="apc-input" value={form.sickLeaveBalance ?? 12} onChange={e => setForm({ ...form, sickLeaveBalance: e.target.value })} />
                ) : (
                  <strong>{emp?.sickLeaveBalance ?? 12} days</strong>
                )}
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)', display: 'block' }}>PAID LEAVES REMAINING</span>
                {editingOverview ? (
                  <input type="number" step="0.5" className="apc-input" value={form.paidLeaveBalance ?? 15} onChange={e => setForm({ ...form, paidLeaveBalance: e.target.value })} />
                ) : (
                  <strong>{emp?.paidLeaveBalance ?? 15} days</strong>
                )}
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)', display: 'block' }}>C-OFF BALANCE (EARNED)</span>
                {editingOverview ? (
                  <input type="number" step="0.5" className="apc-input" value={form.coffBalance ?? 0} onChange={e => setForm({ ...form, coffBalance: e.target.value })} />
                ) : (
                  <strong style={{ color: 'var(--apc-success)' }}>{emp?.coffBalance ?? 0} days</strong>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB: PAYROLL & SALARY SLIPS */}
        {tab === 'payroll' && (
          <div className="apc-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem' }}>MNC Employee Salary Slip</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--apc-text-secondary)' }}>
                  Auto-calculated based on punch records, overtime, half days & leave deductions.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="month"
                  className="apc-input"
                  style={{ width: 'auto', padding: '0.35rem 0.65rem' }}
                  value={salaryMonth}
                  onChange={e => setSalaryMonth(e.target.value)}
                />
                <button onClick={() => window.print()} className="apc-btn apc-btn-secondary" style={{ padding: '0.4rem 0.85rem' }}>
                  <Download size={15} /> Print Payslip
                </button>
              </div>
            </div>

            {loadingSalary ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>Calculating monthly salary slip...</div>
            ) : salarySlip ? (
              <div
                style={{
                  border: '2px solid var(--apc-border)',
                  borderRadius: 'var(--apc-radius-md)',
                  padding: '1.5rem',
                  background: '#FFFFFF',
                  color: '#1A1612'
                }}
              >
                {/* MNC Payslip Header */}
                <div style={{ borderBottom: '2px solid var(--apc-primary)', paddingBottom: '1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2 style={{ color: 'var(--apc-primary-dark)', fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
                      AP CORPORATION PRIVATE LIMITED
                    </h2>
                    <span style={{ fontSize: '0.8rem', color: 'var(--apc-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      CORPORATE PAYSLIP — {salarySlip.month}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, background: 'var(--apc-primary-tint)', padding: '0.25rem 0.6rem', borderRadius: '4px', border: '1px solid var(--apc-primary)' }}>
                      STATUS: CONFIRMED
                    </span>
                  </div>
                </div>

                {/* Employee Meta Grid */}
                <div className="apc-payslip-meta-grid" style={{ padding: '0.85rem', background: 'var(--apc-bg)', borderRadius: 'var(--apc-radius-sm)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                  <div><strong>Employee ID:</strong> <br/><span style={{ fontFamily: 'monospace' }}>{emp?.id}</span></div>
                  <div><strong>Employee Name:</strong> <br/>{emp?.fullName}</div>
                  <div><strong>Department:</strong> <br/>{emp?.department}</div>
                  <div><strong>Designation:</strong> <br/>{emp?.designation}</div>
                </div>

                {/* Attendance Summary Grid */}
                <h4 style={{ fontSize: '0.95rem', color: 'var(--apc-text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.5px' }}>
                  ATTENDANCE & SHIFT METRICS
                </h4>
                <div className="apc-payslip-metrics-grid" style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
                  <div style={{ padding: '0.65rem', background: 'var(--apc-surface)', borderRadius: '4px', border: '1px solid var(--apc-border)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--apc-text-secondary)', display: 'block' }}>WORKING DAYS</span>
                    <strong style={{ fontSize: '1.1rem' }}>{salarySlip.workingDays}</strong>
                  </div>
                  <div style={{ padding: '0.65rem', background: 'var(--apc-surface)', borderRadius: '4px', border: '1px solid var(--apc-border)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--apc-text-secondary)', display: 'block' }}>PRESENT DAYS</span>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--apc-success)' }}>{salarySlip.presentDays}</strong>
                  </div>
                  <div style={{ padding: '0.65rem', background: 'var(--apc-surface)', borderRadius: '4px', border: '1px solid var(--apc-border)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--apc-text-secondary)', display: 'block' }}>HALF DAYS</span>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--apc-warning)' }}>{salarySlip.halfDays}</strong>
                  </div>
                  <div style={{ padding: '0.65rem', background: 'var(--apc-surface)', borderRadius: '4px', border: '1px solid var(--apc-border)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--apc-text-secondary)', display: 'block' }}>PAID LEAVES</span>
                    <strong style={{ fontSize: '1.1rem' }}>{salarySlip.paidLeaves}</strong>
                  </div>
                  <div style={{ padding: '0.65rem', background: 'var(--apc-surface)', borderRadius: '4px', border: '1px solid var(--apc-border)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--apc-text-secondary)', display: 'block' }}>OVERTIME HOURS</span>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--apc-primary-dark)' }}>{salarySlip.overtimeHours} hrs</strong>
                  </div>
                </div>

                {/* Financial Table */}
                <h4 style={{ fontSize: '0.95rem', color: 'var(--apc-text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.5px' }}>
                  FINANCIAL BREAKDOWN (INR)
                </h4>
                <div className="apc-table-container" style={{ marginBottom: '1.25rem' }}>
                  <table className="apc-table" style={{ fontSize: '0.88rem' }}>
                    <thead>
                      <tr>
                        <th>EARNINGS ITEM</th>
                        <th style={{ textAlign: 'right' }}>AMOUNT (₹)</th>
                        <th>DEDUCTIONS ITEM</th>
                        <th style={{ textAlign: 'right' }}>AMOUNT (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Base Monthly Salary</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{salarySlip.baseSalary.toLocaleString('en-IN')}</td>
                        <td>Unpaid Absence ({salarySlip.unpaidAbsentDays} days)</td>
                        <td style={{ textAlign: 'right', color: 'var(--apc-danger)', fontWeight: 600 }}>- ₹{salarySlip.unpaidDeductions.toLocaleString('en-IN')}</td>
                      </tr>
                      <tr>
                        <td>Overtime Pay ({salarySlip.overtimeHours} hrs @ 1.5x)</td>
                        <td style={{ textAlign: 'right', color: 'var(--apc-success)', fontWeight: 600 }}>+ ₹{salarySlip.overtimePay.toLocaleString('en-IN')}</td>
                        <td>Taxes / Statutory</td>
                        <td style={{ textAlign: 'right' }}>₹0.00</td>
                      </tr>
                      <tr style={{ background: 'var(--apc-bg)', fontWeight: 'bold' }}>
                        <td>GROSS EARNINGS</td>
                        <td style={{ textAlign: 'right', color: 'var(--apc-primary-dark)' }}>₹{salarySlip.grossSalary.toLocaleString('en-IN')}</td>
                        <td>TOTAL DEDUCTIONS</td>
                        <td style={{ textAlign: 'right', color: 'var(--apc-danger)' }}>- ₹{salarySlip.unpaidDeductions.toLocaleString('en-IN')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Net Salary Highlight Footer */}
                <div style={{ background: 'linear-gradient(135deg, rgba(245, 166, 35, 0.15) 0%, rgba(200, 120, 20, 0.05) 100%)', padding: '1rem 1.25rem', borderRadius: 'var(--apc-radius-sm)', border: '1px solid var(--apc-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--apc-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      TOTAL NET PAYABLE SALARY
                    </span>
                    <p style={{ fontSize: '0.8rem', margin: '2px 0 0 0', color: 'var(--apc-text-secondary)' }}>
                      Direct Bank Transfer / Auto-Disbursed
                    </p>
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--apc-primary-dark)' }}>
                    ₹{salarySlip.netSalary.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--apc-text-secondary)' }}>
                No salary slip calculated for this month.
              </div>
            )}
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
