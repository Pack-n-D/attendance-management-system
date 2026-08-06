import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import StatusBadge from '../../components/StatusBadge';
import AdminSidebar from '../../components/AdminSidebar';
import { apiFetch, exportAttendanceCSV, getPhotoUrl } from '../../utils/api';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Search, Download } from 'lucide-react';

export default function EmployeeList() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchEmployees();
  }, [search, department, status]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (department) params.append('department', department);
      if (status) params.append('status', status);

      const res = await apiFetch(`/admin/employees?${params.toString()}`);
      setEmployees(res.employees || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    exportAttendanceCSV();
  };

  return (
    <>
      <Navbar />
      <div className="apc-layout-container">
        <AdminSidebar />

        <main className="apc-main-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '1.6rem' }}>Employee Directory</h1>
              <p style={{ fontSize: '0.88rem', color: 'var(--apc-text-secondary)' }}>Manage organisation staff records and status</p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button onClick={handleExportCSV} className="apc-btn apc-btn-secondary">
                <Download size={16} /> Export CSV
              </button>
              <button onClick={() => navigate('/admin/employees/new')} className="apc-btn apc-btn-primary">
                <PlusCircle size={16} /> Add Employee
              </button>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="apc-card" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="apc-input"
                  placeholder="Search by name, ID, phone..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ paddingLeft: '2.2rem' }}
                />
                <Search size={16} color="var(--apc-text-secondary)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              </div>

              <select className="apc-select" value={department} onChange={e => setDepartment(e.target.value)}>
                <option value="">All Departments</option>
                <option value="Creative">Creative</option>
                <option value="Client Servicing">Client Servicing</option>
                <option value="Media Buying">Media Buying</option>
                <option value="Finance">Finance</option>
                <option value="HR">HR</option>
              </select>

              <select className="apc-select" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="">All Account Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Data-dense Employee Table */}
          <div className="apc-table-container">
            <table className="apc-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Employee ID</th>
                  <th>Designation</th>
                  <th>Department</th>
                  <th>Phone</th>
                  <th>Account Status</th>
                  <th>Today's Attendance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>Loading employee list...</td></tr>
                ) : employees.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--apc-text-secondary)' }}>No employees found matching criteria.</td></tr>
                ) : (
                  employees.map(emp => {
                    if (!emp) return null;
                    const empName = emp.fullName || `${emp.first_name || emp.firstName || ''} ${emp.last_name || emp.lastName || ''}`.trim() || emp.id || 'Employee';
                    const initialStr = String(emp.first_name || emp.firstName || empName || 'E');
                    const empInitial = initialStr.charAt(0).toUpperCase() || 'E';
                    
                    return (
                      <tr key={emp.id || Math.random()}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--apc-primary-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', overflow: 'hidden' }}>
                              {emp.profilePhotoUrl ? (
                                <img src={getPhotoUrl(emp.profilePhotoUrl)} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                empInitial
                              )}
                            </div>
                            <strong>{empName}</strong>
                          </div>
                        </td>
                        <td><code style={{ fontWeight: 'bold', color: 'var(--apc-primary-dark)' }}>{emp.id}</code></td>
                        <td>{emp.designation || '—'}</td>
                        <td>{emp.department || 'General'}</td>
                        <td>{emp.phone || '—'}</td>
                        <td><StatusBadge status={emp.status} /></td>
                        <td><StatusBadge status={emp.todayAttendanceStatus} /></td>
                        <td>
                          <button onClick={() => navigate(`/admin/employees/${emp.id}`)} className="apc-btn apc-btn-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem' }}>
                            View / Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </>
  );
}
