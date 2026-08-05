# APC Attendance Management Platform — Production Deployment Guide

This guide covers deployment options for **AP Corporation (APC)**:
1. **Local Network / Office On-Premise Hosting** (Host on office PC/Server for local Wi-Fi access)
2. **Cloud Hosting** (Vercel/Netlify for Frontend + Render/Railway for Backend)

---

## 1. Local Network / Office On-Premise Hosting

To host the application inside your office network so employees can punch in from their phones over office Wi-Fi (`e.g., http://192.168.x.x:5000`):

### Step A: Build Frontend Production Assets
```powershell
cd frontend
npm.cmd run build
```
This generates an optimized static production bundle in `frontend/dist`.

### Step B: Run Flask Backend with Production Server (Waitress)
Install `waitress` (production WSGI server for Windows/Linux):
```powershell
cd backend
pip install waitress
```

Start the production server bound to all network interfaces (`0.0.0.0`):
```powershell
python -m waitress --host=0.0.0.0 --port=5000 app:app
```

Now any device connected to the office Wi-Fi can access the portal using the host PC's IP address!

---

## 2. Cloud Deployment (Render + Vercel / Netlify)

### A. Deploy Backend to Render / Railway
1. Push the repository to GitHub.
2. Create a new **Web Service** on Render/Railway pointing to the `backend/` directory.
3. **Environment Variables** to set in Cloud Dashboard:
   - `SECRET_KEY`: `apc-prod-super-secret-key-2026`
   - `JWT_SECRET_KEY`: `apc-jwt-prod-secret-2026`
   - `DATABASE_URL`: `sqlite:///apc_attendance.db` (or your PostgreSQL connection string: `postgresql://user:password@host:5432/apc_db`)
4. **Start Command**: `gunicorn app:app` (or `python app.py`)

### B. Deploy Frontend to Vercel / Netlify
1. Connect repository to Vercel/Netlify.
2. **Root Directory**: `frontend`
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`
5. **Environment Variable**: `VITE_API_URL` pointing to your backend cloud URL (e.g. `https://apc-backend.onrender.com`)

---

## 🔒 Security Checklist for Production

- [x] Passwords hashed with bcrypt (`generate_password_hash`).
- [x] JWT Token expiration set to 8 hours.
- [x] Server-side timestamp generation (prevents device clock tampering).
- [x] Mandatory late-reason enforcement on punch-in past grace buffer.
- [x] Role-based access control (RBAC) enforced server-side.
- [x] Audit log tracks all employee creations, status changes, and rule updates.
