from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Employee(db.Model):
    __tablename__ = 'employees'

    id = db.Column(db.String(20), primary_key=True)  # e.g. JODO990001
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    dob = db.Column(db.String(10), nullable=False)  # YYYY-MM-DD
    date_of_joining = db.Column(db.String(10), nullable=False)  # YYYY-MM-DD
    designation = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(100), nullable=False)
    employment_type = db.Column(db.String(50), default='Full-time')
    reporting_manager_id = db.Column(db.String(20), db.ForeignKey('employees.id'), nullable=True)
    role = db.Column(db.String(20), nullable=False, default='employee')  # 'super_admin' or 'employee'
    status = db.Column(db.String(20), nullable=False, default='active')  # 'active', 'inactive', 'terminated'
    profile_photo_url = db.Column(db.String(255), nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)
    must_change_password = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    reporting_manager = db.relationship('Employee', remote_side=[id], backref='direct_reports')
    documents = db.relationship('Document', backref='employee', lazy=True, cascade='all, delete-orphan')
    attendance_records = db.relationship('AttendanceRecord', backref='employee', lazy=True, cascade='all, delete-orphan')

    def __init__(self, **kwargs):
        super(Employee, self).__init__(**kwargs)

    def to_dict(self, include_sensitive=False):
        data = {
            'id': self.id,
            'firstName': self.first_name,
            'lastName': self.last_name,
            'fullName': f"{self.first_name} {self.last_name}",
            'phone': self.phone,
            'email': self.email,
            'dob': self.dob,
            'dateOfJoining': self.date_of_joining,
            'designation': self.designation,
            'department': self.department,
            'employmentType': self.employment_type,
            'reportingManagerId': self.reporting_manager_id,
            'reportingManagerName': f"{self.reporting_manager.first_name} {self.reporting_manager.last_name}" if self.reporting_manager else None,
            'role': self.role,
            'status': self.status,
            'profilePhotoUrl': self.profile_photo_url,
            'mustChangePassword': self.must_change_password,
            'createdBy': self.created_by,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }
        return data


class Document(db.Model):
    __tablename__ = 'documents'

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.String(20), db.ForeignKey('employees.id'), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # 'aadhaar', 'pan', 'education', 'other'
    file_url = db.Column(db.String(255), nullable=False)
    file_name = db.Column(db.String(255), nullable=True)
    uploaded_by = db.Column(db.String(100), nullable=True)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, **kwargs):
        super(Document, self).__init__(**kwargs)

    def to_dict(self):
        return {
            'id': self.id,
            'employeeId': self.employee_id,
            'type': self.type,
            'fileUrl': self.file_url,
            'fileName': self.file_name,
            'uploadedBy': self.uploaded_by,
            'uploadedAt': self.uploaded_at.isoformat() if self.uploaded_at else None
        }


class AttendanceRecord(db.Model):
    __tablename__ = 'attendance_records'

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.String(20), db.ForeignKey('employees.id'), nullable=False)
    date = db.Column(db.String(10), nullable=False)  # YYYY-MM-DD
    punch_in_time = db.Column(db.String(8), nullable=True)  # HH:MM:SS
    punch_in_photo_url = db.Column(db.String(255), nullable=True)
    punch_in_location = db.Column(db.String(255), nullable=True)
    punch_out_time = db.Column(db.String(8), nullable=True)  # HH:MM:SS
    punch_out_photo_url = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(20), nullable=False)  # 'on_time', 'in_buffer', 'late', 'absent', 'on_leave', 'half_day'
    late_reason = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, **kwargs):
        super(AttendanceRecord, self).__init__(**kwargs)

    def to_dict(self):
        return {
            'id': self.id,
            'employeeId': self.employee_id,
            'employeeName': f"{self.employee.first_name} {self.employee.last_name}" if self.employee else None,
            'department': self.employee.department if self.employee else None,
            'designation': self.employee.designation if self.employee else None,
            'date': self.date,
            'punchInTime': self.punch_in_time,
            'punchInPhotoUrl': self.punch_in_photo_url,
            'punchInLocation': self.punch_in_location,
            'punchOutTime': self.punch_out_time,
            'punchOutPhotoUrl': self.punch_out_photo_url,
            'status': self.status,
            'lateReason': self.late_reason
        }


class AttendanceRule(db.Model):
    __tablename__ = 'attendance_rules'

    id = db.Column(db.Integer, primary_key=True)
    ideal_punch_in_time = db.Column(db.String(5), nullable=False, default='09:30')  # HH:MM
    ideal_punch_out_time = db.Column(db.String(5), nullable=False, default='18:30')  # HH:MM
    buffer_minutes_in = db.Column(db.Integer, nullable=False, default=15)
    buffer_minutes_out = db.Column(db.Integer, nullable=False, default=15)
    weekly_offs = db.Column(db.String(100), default='Saturday,Sunday')  # Comma separated
    half_day_threshold_in = db.Column(db.String(5), default='12:00')  # Punch after this = half day
    effective_from = db.Column(db.String(10), nullable=False, default=datetime.utcnow().strftime('%Y-%m-%d'))

    def __init__(self, **kwargs):
        super(AttendanceRule, self).__init__(**kwargs)

    def to_dict(self):
        return {
            'id': self.id,
            'idealPunchInTime': self.ideal_punch_in_time,
            'idealPunchOutTime': self.ideal_punch_out_time,
            'bufferMinutesIn': self.buffer_minutes_in,
            'bufferMinutesOut': self.buffer_minutes_out,
            'weeklyOffs': self.weekly_offs.split(',') if self.weekly_offs else [],
            'halfDayThresholdIn': self.half_day_threshold_in,
            'effectiveFrom': self.effective_from
        }


class Holiday(db.Model):
    __tablename__ = 'holidays'

    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.String(10), nullable=False, unique=True)  # YYYY-MM-DD
    label = db.Column(db.String(100), nullable=False)

    def __init__(self, **kwargs):
        super(Holiday, self).__init__(**kwargs)

    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date,
            'label': self.label
        }


class AuditLog(db.Model):
    __tablename__ = 'audit_logs'

    id = db.Column(db.Integer, primary_key=True)
    actor_id = db.Column(db.String(20), nullable=False)
    actor_name = db.Column(db.String(100), nullable=False)
    action = db.Column(db.String(100), nullable=False)
    target_type = db.Column(db.String(50), nullable=False)
    target_id = db.Column(db.String(50), nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, **kwargs):
        super(AuditLog, self).__init__(**kwargs)

    def to_dict(self):
        return {
            'id': self.id,
            'actorId': self.actor_id,
            'actorName': self.actor_name,
            'action': self.action,
            'targetType': self.target_type,
            'targetId': self.target_id,
            'timestamp': self.timestamp.isoformat()
        }


class LeaveRequest(db.Model):
    __tablename__ = 'leave_requests'

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.String(20), db.ForeignKey('employees.id'), nullable=False)
    start_date = db.Column(db.String(10), nullable=False)  # YYYY-MM-DD
    end_date = db.Column(db.String(10), nullable=False)    # YYYY-MM-DD
    leave_type = db.Column(db.String(50), nullable=False, default='Paid Leave')  # 'Casual Leave', 'Sick Leave', 'Paid Leave'
    reason = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), nullable=False, default='pending')  # 'pending', 'approved', 'rejected'
    reporting_manager_id = db.Column(db.String(20), db.ForeignKey('employees.id'), nullable=True)
    manager_comment = db.Column(db.Text, nullable=True)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    employee = db.relationship('Employee', foreign_keys=[employee_id], backref='my_leave_requests')
    reporting_manager = db.relationship('Employee', foreign_keys=[reporting_manager_id], backref='managed_leave_requests')

    def __init__(self, **kwargs):
        super(LeaveRequest, self).__init__(**kwargs)

    def to_dict(self):
        return {
            'id': self.id,
            'employeeId': self.employee_id,
            'employeeName': f"{self.employee.first_name} {self.employee.last_name}" if self.employee else self.employee_id,
            'department': self.employee.department if self.employee else None,
            'designation': self.employee.designation if self.employee else None,
            'startDate': self.start_date,
            'endDate': self.end_date,
            'leaveType': self.leave_type,
            'reason': self.reason,
            'status': self.status,
            'reportingManagerId': self.reporting_manager_id,
            'reportingManagerName': f"{self.reporting_manager.first_name} {self.reporting_manager.last_name}" if self.reporting_manager else None,
            'managerComment': self.manager_comment,
            'reviewedAt': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }

