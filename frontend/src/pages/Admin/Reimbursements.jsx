import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import AdminSidebar from '../../components/AdminSidebar';
import StatusBadge from '../../components/StatusBadge';
import { apiFetch } from '../../utils/api';
import { Receipt, Check, X, Search, Filter, Calendar, Image, AlertCircle, RefreshCw, MessageSquare } from 'lucide-react';

export default function Reimbursements() {
  const [reimbursements, setReimbursements] = useState([]);
  const [stats, setStats] = useState({
    totalClaimed: 0,
    totalApproved: 0,
    totalPending: 0,
    totalRejected: 0,
    pendingCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Review Modal State
  const [reviewModal, setReviewModal] = useState(null); // { req, action: 'approve'|'reject' }
  const [adminComment, setAdminComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    fetchReimbursements();
  }, [statusFilter, categoryFilter, startDate, endDate]);

  const fetchReimbursements = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (categoryFilter) params.append('category', categoryFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (search) params.append('search', search);

      const res = await apiFetch(`/admin/reimbursements?${params.toString()}`);
      setReimbursements(res.reimbursements || []);
      if (res.stats) setStats(res.stats);
    } catch (err) {
      console.error('Failed to fetch reimbursements:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchReimbursements();
  };

  const handleReviewSubmit = async () => {
    if (!reviewModal) return;
    setSubmittingReview(true);
    setActionMsg('');
    try {
      const res = await apiFetch(`/admin/reimbursements/${reviewModal.req.id}/review`, {
        method: 'POST',
        body: JSON.stringify({
          action: reviewModal.action,
          comment: adminComment
        })
      });
      setActionMsg(res.message);
      setReviewModal(null);
      setAdminComment('');
      fetchReimbursements();
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err) {
      alert(`Review action failed: ${err.message}`);
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="apc-layout-container">
        <AdminSidebar />
        <main className="apc-main-content">
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h1 style={{ fontSize: '1.4rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Receipt size={22} color="var(--apc-primary)" /> Employee Expense Reimbursements
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--apc-text-secondary)', margin: '2px 0 0 0' }}>
                Review and approve petrol, hotel, travel & client claims. Approved claims auto-credit to salary slips.
              </p>
            </div>

            <button onClick={fetchReimbursements} className="apc-btn apc-btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {actionMsg && (
            <div style={{ padding: '0.75rem 1rem', background: 'rgba(46, 158, 91, 0.12)', color: 'var(--apc-success)', border: '1px solid var(--apc-success)', borderRadius: 'var(--apc-radius-sm)', marginBottom: '1rem', fontSize: '0.88rem' }}>
              ✓ {actionMsg}
            </div>
          )}

          {/* Stats KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
            <div className="apc-card" style={{ padding: '1rem', textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--apc-text-secondary)', textTransform: 'uppercase', display: 'block' }}>TOTAL CLAIMS</span>
              <strong style={{ fontSize: '1.4rem', color: 'var(--apc-text-primary)' }}>₹{stats.totalClaimed.toLocaleString('en-IN')}</strong>
              <span style={{ fontSize: '0.72rem', color: 'var(--apc-text-secondary)', display: 'block' }}>All Time Submitted</span>
            </div>

            <div className="apc-card" style={{ padding: '1rem', textAlign: 'center', borderTop: '3px solid #D97706' }}>
              <span style={{ fontSize: '0.75rem', color: '#B45309', textTransform: 'uppercase', display: 'block' }}>PENDING REVIEW</span>
              <strong style={{ fontSize: '1.4rem', color: '#D97706' }}>₹{stats.totalPending.toLocaleString('en-IN')}</strong>
              <span style={{ fontSize: '0.72rem', color: '#B45309', display: 'block' }}>{stats.pendingCount} Pending Requests</span>
            </div>

            <div className="apc-card" style={{ padding: '1rem', textAlign: 'center', borderTop: '3px solid var(--apc-success)' }}>
              <span style={{ fontSize: '0.75rem', color: '#1E6B3C', textTransform: 'uppercase', display: 'block' }}>APPROVED (CREDITED)</span>
              <strong style={{ fontSize: '1.4rem', color: 'var(--apc-success)' }}>₹{stats.totalApproved.toLocaleString('en-IN')}</strong>
              <span style={{ fontSize: '0.72rem', color: '#1E6B3C', display: 'block' }}>In Salary Slips</span>
            </div>

            <div className="apc-card" style={{ padding: '1rem', textAlign: 'center', borderTop: '3px solid var(--apc-danger)' }}>
              <span style={{ fontSize: '0.75rem', color: '#C62828', textTransform: 'uppercase', display: 'block' }}>REJECTED CLAIMS</span>
              <strong style={{ fontSize: '1.4rem', color: 'var(--apc-danger)' }}>₹{stats.totalRejected.toLocaleString('en-IN')}</strong>
              <span style={{ fontSize: '0.72rem', color: '#C62828', display: 'block' }}>Declined Claims</span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="apc-card" style={{ padding: '1rem', marginBottom: '1.25rem' }}>
            <form onSubmit={handleSearchSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Search Employee / Note</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="apc-input"
                    placeholder="Search name, ID, desc..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ paddingRight: '2rem' }}
                  />
                  <button type="submit" style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--apc-text-secondary)' }}>
                    <Search size={15} />
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Status</label>
                <select className="apc-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="">All Statuses</option>
                  <option value="pending">Pending Approval</option>
                  <option value="approved">Approved (Credited)</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Category</label>
                <select className="apc-select" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                  <option value="">All Categories</option>
                  <option value="Petrol">⛽ Petrol / Fuel</option>
                  <option value="Hotel">🏨 Hotel</option>
                  <option value="Food">🍽️ Food</option>
                  <option value="Travel">✈️ Travel</option>
                  <option value="Internet/Mobile">📱 Mobile / Internet</option>
                  <option value="Client Meeting">🤝 Client Entertainment</option>
                  <option value="Office Supplies">📦 Office Supplies</option>
                  <option value="Other">📝 Other</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>From Date</label>
                <input type="date" className="apc-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>To Date</label>
                <input type="date" className="apc-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </form>
          </div>

          {/* Reimbursements Table */}
          <div className="apc-card" style={{ padding: '0.5rem' }}>
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--apc-text-secondary)' }}>
                Loading reimbursement records...
              </div>
            ) : reimbursements.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--apc-text-secondary)' }}>
                No reimbursement requests found matching the filter criteria.
              </div>
            ) : (
              <div className="apc-table-container">
                <table className="apc-table">
                  <thead>
                    <tr>
                      <th>EMPLOYEE</th>
                      <th>CATEGORY</th>
                      <th>EXPENSE DATE</th>
                      <th>DESCRIPTION & RECEIPT</th>
                      <th style={{ textAlign: 'right' }}>AMOUNT (₹)</th>
                      <th>STATUS</th>
                      <th style={{ textAlign: 'center' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reimbursements.map(r => (
                      <tr key={r.id}>
                        <td>
                          <strong>{r.employeeName}</strong>
                          <div style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)', fontFamily: 'monospace' }}>
                            {r.employeeId} · {r.department}
                          </div>
                        </td>

                        <td>
                          <span style={{ fontWeight: 600, color: 'var(--apc-text-primary)' }}>{r.category}</span>
                        </td>

                        <td style={{ fontSize: '0.85rem' }}>
                          {r.expenseDate}
                        </td>

                        <td>
                          <div style={{ fontSize: '0.84rem', maxWidth: '240px' }}>
                            {r.description || <span style={{ color: 'var(--apc-text-secondary)' }}>No description</span>}
                          </div>
                          {r.receiptPhotoUrl && (
                            <a
                              href={r.receiptPhotoUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.74rem',
                                color: 'var(--apc-primary-dark)',
                                marginTop: '3px',
                                textDecoration: 'none',
                                background: 'var(--apc-surface)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                border: '1px solid var(--apc-border)'
                              }}
                            >
                              <Image size={12} /> View Bill
                            </a>
                          )}
                          {r.adminComment && (
                            <div style={{ fontSize: '0.74rem', color: 'var(--apc-text-secondary)', marginTop: '2px', fontStyle: 'italic' }}>
                              Note: {r.adminComment}
                            </div>
                          )}
                        </td>

                        <td style={{ textAlign: 'right', fontSize: '1.05rem', fontWeight: 700, color: r.status === 'approved' ? 'var(--apc-success)' : 'var(--apc-text-primary)' }}>
                          ₹{r.amount.toLocaleString('en-IN')}
                        </td>

                        <td>
                          <StatusBadge status={r.status} />
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          {r.status === 'pending' ? (
                            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                              <button
                                onClick={() => setReviewModal({ req: r, action: 'approve' })}
                                className="apc-btn apc-btn-primary"
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', background: '#2E9E5B' }}
                                title="Approve Claim"
                              >
                                <Check size={14} /> Approve
                              </button>
                              <button
                                onClick={() => setReviewModal({ req: r, action: 'reject' })}
                                className="apc-btn apc-btn-secondary"
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', color: 'var(--apc-danger)' }}
                                title="Reject Claim"
                              >
                                <X size={14} /> Reject
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)' }}>
                              Reviewed
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </main>
      </div>

      {/* Review Modal */}
      {reviewModal && (
        <div className="apc-modal-overlay">
          <div className="apc-modal" style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.15rem', margin: 0 }}>
                {reviewModal.action === 'approve' ? '✅ Approve Reimbursement' : '❌ Reject Reimbursement'}
              </h3>
              <button onClick={() => setReviewModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="var(--apc-text-secondary)" />
              </button>
            </div>

            <div style={{ padding: '0.75rem', background: 'var(--apc-bg)', borderRadius: 'var(--apc-radius-sm)', marginBottom: '1rem', fontSize: '0.88rem' }}>
              <div><strong>Employee:</strong> {reviewModal.req.employeeName} ({reviewModal.req.employeeId})</div>
              <div><strong>Expense:</strong> {reviewModal.req.category} on {reviewModal.req.expenseDate}</div>
              <div><strong>Claim Amount:</strong> <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--apc-primary-dark)' }}>₹{reviewModal.req.amount.toLocaleString('en-IN')}</span></div>
              {reviewModal.req.description && (
                <div style={{ marginTop: '0.25rem', fontSize: '0.82rem', color: 'var(--apc-text-secondary)' }}>
                  "{reviewModal.req.description}"
                </div>
              )}
            </div>

            <div className="apc-form-group">
              <label>Admin Remarks / Comment (Optional)</label>
              <textarea
                className="apc-textarea"
                rows={2}
                placeholder={reviewModal.action === 'approve' ? "Approved for next payroll disbursement..." : "State reason for rejection..."}
                value={adminComment}
                onChange={e => setAdminComment(e.target.value)}
              />
            </div>

            {reviewModal.action === 'approve' && (
              <p style={{ fontSize: '0.78rem', color: 'var(--apc-success)', margin: '0 0 1rem 0' }}>
                ℹ️ Once approved, ₹{reviewModal.req.amount} will be automatically added as a Reimbursement Credit on {reviewModal.req.employeeName}'s salary slip for {reviewModal.req.expenseDate.slice(0, 7)}.
              </p>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setReviewModal(null)} className="apc-btn apc-btn-secondary" disabled={submittingReview}>
                Cancel
              </button>
              <button
                onClick={handleReviewSubmit}
                className="apc-btn apc-btn-primary"
                style={{ background: reviewModal.action === 'approve' ? '#2E9E5B' : '#E53935' }}
                disabled={submittingReview}
              >
                {submittingReview ? 'Processing...' : reviewModal.action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
