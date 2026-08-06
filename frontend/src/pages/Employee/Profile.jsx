import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';
import { Camera, FileText, Lock, Send, CheckCircle } from 'lucide-react';

export default function Profile() {
  const { user, updateUserProfile } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestField, setRequestField] = useState('Phone Number');
  const [requestedValue, setRequestedValue] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [requestSuccess, setRequestSuccess] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/employee/profile');
      setProfileData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await apiFetch('/employee/profile/photo', {
          method: 'POST',
          body: JSON.stringify({ photo: reader.result })
        });
        if (user) {
          updateUserProfile({ ...user, profilePhotoUrl: res.profilePhotoUrl });
        }
        fetchProfile();
      } catch (err) {
        alert("Photo upload failed: " + err.message);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSendRequest = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/employee/request-update', {
        method: 'POST',
        body: JSON.stringify({
          field: requestField,
          requestedValue,
          reason: requestReason
        })
      });
      setRequestSuccess('Your update request has been sent to Super Admin!');
      setTimeout(() => {
        setShowRequestModal(false);
        setRequestSuccess('');
        setRequestedValue('');
        setRequestReason('');
      }, 2000);
    } catch (err) {
      alert("Failed to submit request: " + err.message);
    }
  };

  const emp = profileData?.employee || user;
  const docs = profileData?.documents || [];

  if (loading) {
    return (
      <>
        <Navbar />
        <div style={{ padding: '3rem', textAlign: 'center' }}>Loading employee profile...</div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="apc-main-content" style={{ maxWidth: '800px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem' }}>My Profile</h1>
            <p style={{ fontSize: '0.88rem', color: 'var(--apc-text-secondary)' }}>View your personal info and document records</p>
          </div>

          <button onClick={() => setShowRequestModal(true)} className="apc-btn apc-btn-secondary">
            Request Info Update
          </button>
        </div>

        {/* Profile Header Card */}
        <div className="apc-card apc-card-elevated" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <div
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                backgroundColor: 'var(--apc-primary-tint)',
                border: '3px solid var(--apc-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem',
                fontWeight: 800,
                color: 'var(--apc-primary-dark)',
                overflow: 'hidden'
              }}
            >
              {emp?.profilePhotoUrl ? (
                <img src={emp.profilePhotoUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                emp?.firstName ? emp.firstName[0].toUpperCase() : 'E'
              )}
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                backgroundColor: 'var(--apc-primary)',
                border: '2px solid #FFFFFF',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Update profile photo"
            >
              <Camera size={16} color="#1A1612" />
            </button>
            <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" style={{ display: 'none' }} />
          </div>

          <div>
            <h2 style={{ fontSize: '1.4rem' }}>{emp?.fullName || `${emp?.firstName} ${emp?.lastName}`}</h2>
            <p style={{ color: 'var(--apc-primary-dark)', fontWeight: 600, fontSize: '0.95rem' }}>{emp?.designation}</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--apc-text-secondary)' }}>
              Employee ID: <strong style={{ fontFamily: 'monospace' }}>{emp?.id}</strong> · {emp?.department}
            </p>
          </div>
        </div>

        {/* View-Only Personal Details Grid */}
        <div className="apc-card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--apc-border)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lock size={16} color="var(--apc-text-secondary)" /> Employment & Personal Info (Admin Managed)
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)', display: 'block' }}>FULL NAME</span>
              <strong>{emp?.firstName} {emp?.lastName}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)', display: 'block' }}>EMAIL ADDRESS</span>
              <strong>{emp?.email}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)', display: 'block' }}>PHONE NUMBER</span>
              <strong>{emp?.phone}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)', display: 'block' }}>DATE OF BIRTH</span>
              <strong>{emp?.dob}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)', display: 'block' }}>DATE OF JOINING</span>
              <strong>{emp?.dateOfJoining}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)', display: 'block' }}>EMPLOYMENT TYPE</span>
              <strong>{emp?.employmentType}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)', display: 'block' }}>REPORTING MANAGER</span>
              <strong style={{ color: 'var(--apc-primary-dark)' }}>{emp?.reportingManagerName || 'Super Admin'}</strong>
            </div>
          </div>
        </div>

        {/* Documents Thumbnails Card */}
        <div className="apc-card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--apc-border)', paddingBottom: '0.5rem' }}>
            Official Documents (Read-Only)
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            {['aadhaar', 'pan', 'education'].map(docType => {
              const matchedDoc = docs.find(d => d.type === docType);
              return (
                <div key={docType} style={{ padding: '0.85rem', border: '1px solid var(--apc-border)', borderRadius: 'var(--apc-radius-sm)', backgroundColor: 'var(--apc-bg)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <FileText size={18} color="var(--apc-primary-dark)" />
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase' }}>{docType}</span>
                  </div>
                  {matchedDoc ? (
                    <a href={matchedDoc.fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: 'var(--apc-info)' }}>
                      View / Download File
                    </a>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--apc-text-secondary)' }}>Not Uploaded</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Request Info Update Modal */}
        {showRequestModal && (
          <div className="apc-modal-overlay">
            <div className="apc-modal" style={{ maxWidth: '440px' }}>
              <h3>Request Info Update</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--apc-text-secondary)', marginBottom: '1rem' }}>
                Per APC policy, employee data is managed by Super Admin. Submit a request below.
              </p>

              {requestSuccess ? (
                <div style={{ color: 'var(--apc-success)', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem' }}>
                  <CheckCircle size={20} /> {requestSuccess}
                </div>
              ) : (
                <form onSubmit={handleSendRequest}>
                  <div className="apc-form-group">
                    <label>Select Field to Update</label>
                    <select className="apc-select" value={requestField} onChange={e => setRequestField(e.target.value)}>
                      <option value="Phone Number">Phone Number</option>
                      <option value="Current Address">Current Address</option>
                      <option value="Emergency Contact">Emergency Contact</option>
                      <option value="Other Details">Other Details</option>
                    </select>
                  </div>

                  <div className="apc-form-group">
                    <label>Requested New Value</label>
                    <input
                      type="text"
                      className="apc-input"
                      required
                      placeholder="e.g. +1 555-9999"
                      value={requestedValue}
                      onChange={e => setRequestedValue(e.target.value)}
                    />
                  </div>

                  <div className="apc-form-group">
                    <label>Reason for Request</label>
                    <textarea
                      className="apc-textarea"
                      rows={2}
                      placeholder="e.g. Changed primary phone number"
                      value={requestReason}
                      onChange={e => setRequestReason(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button type="button" onClick={() => setShowRequestModal(false)} className="apc-btn apc-btn-secondary">
                      Cancel
                    </button>
                    <button type="submit" className="apc-btn apc-btn-primary">
                      <Send size={16} /> Submit Request
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
