import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import WelcomeCardModal from '../../components/WelcomeCardModal';
import { apiFetch } from '../../utils/api';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ArrowLeft, RefreshCw, Eye, EyeOff, Copy, Check, Lock, FileText, ChevronDown, ChevronUp } from 'lucide-react';

export default function CreateEmployee() {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  // Step 1 Form Data
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [dateOfJoining, setDateOfJoining] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('Creative');
  const [employmentType, setEmploymentType] = useState('Full-time');
  const [reportingManagerId, setReportingManagerId] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);

  // Optional Accordion state
  const [showDocAccordion, setShowDocAccordion] = useState(false);
  const [managers, setManagers] = useState([]);

  // Step 2 Credentials Data
  const [generatedId, setGeneratedId] = useState('JO-DO-99-0001');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(true);

  // Errors & UI state
  const [touched, setTouched] = useState({});
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [welcomeCardData, setWelcomeCardData] = useState(null);

  useEffect(() => {
    // Fetch potential reporting managers
    apiFetch('/admin/employees')
      .then(res => setManagers(res.employees || []))
      .catch(() => { });
  }, []);

  // Update preview ID on Step 1 input changes
  useEffect(() => {
    if (firstName && lastName) {
      apiFetch('/admin/employees/generate-id', {
        method: 'POST',
        body: JSON.stringify({ firstName, lastName, dob })
      })
        .then(res => setGeneratedId(res.employeeId))
        .catch(() => { });
    }
  }, [firstName, lastName, dob]);

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const isStep1Valid = () => {
    return (
      firstName.trim() !== '' &&
      lastName.trim() !== '' &&
      phone.trim().length >= 8 &&
      email.includes('@') &&
      dob !== '' &&
      dateOfJoining !== '' &&
      designation.trim() !== '' &&
      department !== ''
    );
  };

  const handleGeneratePassword = () => {
    const uppers = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lowers = "abcdefghijkmnopqrstuvwxyz";
    const digits = "23456789";
    const specials = "!@#$%^&*";
    let chars = [
      uppers[Math.floor(Math.random() * uppers.length)],
      lowers[Math.floor(Math.random() * lowers.length)],
      digits[Math.floor(Math.random() * digits.length)],
      specials[Math.floor(Math.random() * specials.length)],
    ];
    const all = uppers + lowers + digits + specials;
    for (let i = 0; i < 6; i++) {
      chars.push(all[Math.floor(Math.random() * all.length)]);
    }
    chars = chars.sort(() => 0.5 - Math.random());
    const pass = chars.join('');
    setPassword(pass);
    setConfirmPassword(pass);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(generatedId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch('/admin/employees', {
        method: 'POST',
        body: JSON.stringify({
          firstName,
          lastName,
          phone,
          email,
          dob,
          dateOfJoining,
          designation,
          department,
          employmentType,
          reportingManagerId: reportingManagerId || null,
          password,
          mustChangePassword,
          profilePhoto
        })
      });

      setWelcomeCardData({
        ...res.welcomeCard,
        profilePhotoUrl: profilePhoto ? profilePhoto : res.welcomeCard?.profilePhotoUrl
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="apc-main-content" style={{ maxWidth: '720px' }}>
        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => navigate('/admin/employees')} className="apc-btn apc-btn-secondary" style={{ padding: '0.4rem 0.6rem' }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.5rem' }}>Create New Employee</h1>
            <p style={{ fontSize: '0.88rem', color: 'var(--apc-text-secondary)' }}>Add a new staff member to AP Corporation</p>
          </div>
        </div>

        {/* Persistent Step Indicator */}
        <div className="apc-steps">
          <div className={`apc-step-item ${step === 1 ? 'active' : ''}`}>
            <span className="apc-step-number">1</span>
            Step 1 of 2: Personal & Role Details
          </div>
          <ChevronRight size={16} color="var(--apc-text-secondary)" />
          <div className={`apc-step-item ${step === 2 ? 'active' : ''}`}>
            <span className="apc-step-number">2</span>
            Step 2 of 2: ID & Credentials
          </div>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--apc-danger-bg)', border: '1px solid rgba(214,69,69,0.3)', color: 'var(--apc-danger)', borderRadius: 'var(--apc-radius-sm)', marginBottom: '1rem', fontSize: '0.88rem' }}>
            {error}
          </div>
        )}

        <div className="apc-card apc-card-elevated">
          {step === 1 ? (
            /* STEP 1: DETAILS */
            <form onSubmit={e => { e.preventDefault(); setStep(2); }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="apc-form-group">
                  <label htmlFor="firstName">First Name <span className="required">*</span></label>
                  <input
                    id="firstName"
                    type="text"
                    className={`apc-input ${touched.firstName && !firstName ? 'invalid' : ''}`}
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    onBlur={() => handleBlur('firstName')}
                    required
                  />
                </div>

                <div className="apc-form-group">
                  <label htmlFor="lastName">Last Name <span className="required">*</span></label>
                  <input
                    id="lastName"
                    type="text"
                    className={`apc-input ${touched.lastName && !lastName ? 'invalid' : ''}`}
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    onBlur={() => handleBlur('lastName')}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="apc-form-group">
                  <label htmlFor="email">Email Address <span className="required">*</span></label>
                  <input
                    id="email"
                    type="email"
                    className={`apc-input ${touched.email && !email.includes('@') ? 'invalid' : ''}`}
                    placeholder="john.doe@apc.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onBlur={() => handleBlur('email')}
                    required
                  />
                </div>

                <div className="apc-form-group">
                  <label htmlFor="phone">Phone Number <span className="required">*</span></label>
                  <input
                    id="phone"
                    type="text"
                    className={`apc-input ${touched.phone && phone.length < 8 ? 'invalid' : ''}`}
                    placeholder="+1 555-0199"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    onBlur={() => handleBlur('phone')}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="apc-form-group">
                  <label htmlFor="dob">Date of Birth <span className="required">*</span></label>
                  <input
                    id="dob"
                    type="date"
                    className="apc-input"
                    value={dob}
                    onChange={e => setDob(e.target.value)}
                    required
                  />
                </div>

                <div className="apc-form-group">
                  <label htmlFor="dateOfJoining">Date of Joining <span className="required">*</span></label>
                  <input
                    id="dateOfJoining"
                    type="date"
                    className="apc-input"
                    value={dateOfJoining}
                    onChange={e => setDateOfJoining(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="apc-form-group">
                  <label htmlFor="department">Department <span className="required">*</span></label>
                  <select id="department" className="apc-select" value={department} onChange={e => setDepartment(e.target.value)}>
                    <option value="Creative">Creative</option>
                    <option value="Client Servicing">Client Servicing</option>
                    <option value="Media Buying">Media Buying</option>
                    <option value="Finance">Finance</option>
                    <option value="HR">HR</option>
                    <option value="Development">IT</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </div>

                <div className="apc-form-group">
                  <label htmlFor="designation">Designation <span className="required">*</span></label>
                  <input
                    id="designation"
                    type="text"
                    className="apc-input"
                    placeholder="e.g. Senior Copywriter"
                    value={designation}
                    onChange={e => setDesignation(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="apc-form-group">
                  <label htmlFor="employmentType">Employment Type</label>
                  <select id="employmentType" className="apc-select" value={employmentType} onChange={e => setEmploymentType(e.target.value)}>
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Intern">Intern</option>
                    <option value="Contract">Contract</option>
                  </select>
                </div>

                <div className="apc-form-group">
                  <label htmlFor="reportingManager">Reporting Manager (Optional)</label>
                  <select id="reportingManager" className="apc-select" value={reportingManagerId} onChange={e => setReportingManagerId(e.target.value)}>
                    <option value="">None / Direct Report</option>
                    {managers.map(m => (
                      <option key={m.id} value={m.id}>{m.fullName} ({m.designation})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Collapsible Documents Accordion */}
              <div style={{ border: '1px solid var(--apc-border)', borderRadius: 'var(--apc-radius-sm)', overflow: 'hidden', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowDocAccordion(!showDocAccordion)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'var(--apc-bg)',
                    border: 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={16} color="var(--apc-primary-dark)" /> Documents (Optional Uploads)
                  </span>
                  {showDocAccordion ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showDocAccordion && (
                  <div style={{ padding: '1rem', background: 'var(--apc-surface)' }}>
                    <div className="apc-form-group">
                      <label>Profile Photo</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <input
                          type="file"
                          accept="image/*"
                          className="apc-input"
                          onChange={e => {
                            const file = e.target.files[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => setProfilePhoto(reader.result);
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        {profilePhoto && (
                          <img
                            src={profilePhoto}
                            alt="Preview"
                            style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--apc-primary)' }}
                          />
                        )}
                      </div>
                    </div>
                    <div className="apc-form-group">
                      <label>Aadhaar Card (PDF / Image)</label>
                      <input type="file" accept=".pdf,image/*" className="apc-input" />
                    </div>
                    <div className="apc-form-group">
                      <label>PAN Card (PDF / Image)</label>
                      <input type="file" accept=".pdf,image/*" className="apc-input" />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="submit" className="apc-btn apc-btn-primary apc-btn-lg" disabled={!isStep1Valid()}>
                  Next: Setup Credentials <ChevronRight size={18} />
                </button>
              </div>
            </form>
          ) : (
            /* STEP 2: CREDENTIALS */
            <form onSubmit={handleSubmit}>
              {/* Auto-Generated Employee ID */}
              <div className="apc-form-group" style={{ background: 'var(--apc-primary-tint)', padding: '1rem', borderRadius: 'var(--apc-radius-sm)', border: '1px solid var(--apc-primary)' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--apc-primary-dark)', textTransform: 'uppercase' }}>
                  AUTO-GENERATED EMPLOYEE ID (READ-ONLY)
                </label>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                  <code style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--apc-text-primary)' }}>
                    {generatedId}
                  </code>
                  <button type="button" onClick={handleCopyId} className="apc-btn apc-btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                    {copiedId ? <Check size={14} color="var(--apc-success)" /> : <Copy size={14} />} {copiedId ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Password Fields */}
              <div className="apc-form-group" style={{ marginTop: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label htmlFor="password">Initial Password <span className="required">*</span></label>
                  <button type="button" onClick={handleGeneratePassword} className="apc-btn apc-btn-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem' }}>
                    <RefreshCw size={12} /> Auto-Generate Password
                  </button>
                </div>

                <div style={{ position: 'relative' }}>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="apc-input"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    {showPassword ? <EyeOff size={16} color="var(--apc-text-secondary)" /> : <Eye size={16} color="var(--apc-text-secondary)" />}
                  </button>
                </div>

                {/* Visible Password Rule Text */}
                <div style={{ backgroundColor: 'var(--apc-bg)', padding: '0.6rem 0.75rem', borderRadius: 'var(--apc-radius-sm)', border: '1px solid var(--apc-border)', marginTop: '0.35rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--apc-text-primary)', display: 'block', marginBottom: '2px' }}>
                    PASSWORD COMPLIANCE RULES:
                  </span>
                  <span style={{ fontSize: '0.73rem', color: 'var(--apc-text-secondary)', display: 'block' }}>
                    Min 8 characters · 1 uppercase · 1 number · 1 special character · No spaces
                  </span>
                </div>
              </div>

              <div className="apc-form-group">
                <label htmlFor="confirmPassword">Confirm Initial Password <span className="required">*</span></label>
                <input
                  id="confirmPassword"
                  type="password"
                  className="apc-input"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
              </div>

              {/* Force password change toggle */}
              <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="mustChange"
                  checked={mustChangePassword}
                  onChange={e => setMustChangePassword(e.target.checked)}
                />
                <label htmlFor="mustChange" style={{ fontSize: '0.88rem', fontWeight: 500, cursor: 'pointer' }}>
                  Require employee to change password on first login (Recommended)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.75rem' }}>
                <button type="button" onClick={() => setStep(1)} className="apc-btn apc-btn-secondary">
                  ← Back to Details
                </button>
                <button type="submit" className="apc-btn apc-btn-primary apc-btn-lg" disabled={submitting || !password}>
                  {submitting ? 'Creating Employee...' : 'Create Employee'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Welcome Card Modal after successful creation */}
        {welcomeCardData && (
          <WelcomeCardModal
            data={welcomeCardData}
            onClose={() => navigate('/admin/employees')}
          />
        )}
      </main>
    </>
  );
}
