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
    profile_photo_url = db.Column(db.Text, nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)
    must_change_password = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Salary & Leave Balances
    base_salary = db.Column(db.Float, default=0.0)
    casual_leave_balance = db.Column(db.Float, default=12.0)
    sick_leave_balance = db.Column(db.Float, default=12.0)
    paid_leave_balance = db.Column(db.Float, default=15.0)
    coff_balance = db.Column(db.Float, default=0.0)

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
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'baseSalary': getattr(self, 'base_salary', 0.0) or 0.0,
            'casualLeaveBalance': getattr(self, 'casual_leave_balance', 12.0) if getattr(self, 'casual_leave_balance', None) is not None else 12.0,
            'sickLeaveBalance': getattr(self, 'sick_leave_balance', 12.0) if getattr(self, 'sick_leave_balance', None) is not None else 12.0,
            'paidLeaveBalance': getattr(self, 'paid_leave_balance', 15.0) if getattr(self, 'paid_leave_balance', None) is not None else 15.0,
            'coffBalance': getattr(self, 'coff_balance', 0.0) or 0.0
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
    punch_out_location = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(20), nullable=False)  # 'on_time', 'in_buffer', 'late', 'absent', 'on_leave', 'half_day'
    shift_type = db.Column(db.String(20), nullable=False, default='full_day')  # 'full_day', 'second_half'
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
            'punchOutLocation': getattr(self, 'punch_out_location', None),
            'status': self.status,
            'shiftType': getattr(self, 'shift_type', 'full_day') or 'full_day',
            'lateReason': self.late_reason
        }


class AttendanceRule(db.Model):
    __tablename__ = 'attendance_rules'

    id = db.Column(db.Integer, primary_key=True)
    ideal_punch_in_time = db.Column(db.String(5), nullable=False, default='10:00')  # HH:MM
    ideal_punch_out_time = db.Column(db.String(5), nullable=False, default='18:30')  # HH:MM
    buffer_minutes_in = db.Column(db.Integer, nullable=False, default=15)
    buffer_minutes_out = db.Column(db.Integer, nullable=False, default=15)
    weekly_offs = db.Column(db.String(100), default='Saturday,Sunday')  # Comma separated
    half_day_threshold_in = db.Column(db.String(5), default='12:00')  # Punch after this = half day
    second_half_start_time = db.Column(db.String(5), nullable=False, default='13:00')  # HH:MM
    second_half_end_time = db.Column(db.String(5), nullable=False, default='18:30')    # HH:MM
    second_half_min_punch_out = db.Column(db.String(5), nullable=False, default='18:30') # HH:MM
    effective_from = db.Column(db.String(10), nullable=False, default=datetime.utcnow().strftime('%Y-%m-%d'))
    office_address = db.Column(db.Text, nullable=True, default='Flat no.7 Sakar Appartment Pandit Colony Lane, 7, Gangapur Rd, Nashik, Maharashtra 422002')
    office_lat = db.Column(db.Float, nullable=False, default=20.0024286)
    office_lng = db.Column(db.Float, nullable=False, default=73.776293)
    allowed_radius_meters = db.Column(db.Float, nullable=False, default=40.0)
    geofence_enabled = db.Column(db.Boolean, nullable=False, default=True)

    def __init__(self, **kwargs):
        super(AttendanceRule, self).__init__(**kwargs)

    def to_dict(self):
        return {
            'id': self.id,
            'idealPunchInTime': getattr(self, 'ideal_punch_in_time', '10:00') or '10:00',
            'idealPunchOutTime': getattr(self, 'ideal_punch_out_time', '18:30') or '18:30',
            'bufferMinutesIn': getattr(self, 'buffer_minutes_in', 15),
            'bufferMinutesOut': getattr(self, 'buffer_minutes_out', 15),
            'weeklyOffs': self.weekly_offs.split(',') if getattr(self, 'weekly_offs', None) else [],
            'halfDayThresholdIn': getattr(self, 'half_day_threshold_in', '12:00') or '12:00',
            'secondHalfStartTime': getattr(self, 'second_half_start_time', '13:00') or '13:00',
            'secondHalfEndTime': getattr(self, 'second_half_end_time', '18:30') or '18:30',
            'secondHalfMinPunchOut': getattr(self, 'second_half_min_punch_out', '18:30') or '18:30',
            'effectiveFrom': getattr(self, 'effective_from', None),
            'officeAddress': getattr(self, 'office_address', 'Flat no.7 Sakar Appartment Pandit Colony Lane, 7, Gangapur Rd, Nashik, Maharashtra 422002') or 'Flat no.7 Sakar Appartment Pandit Colony Lane, 7, Gangapur Rd, Nashik, Maharashtra 422002',
            'officeLat': getattr(self, 'office_lat', 20.0024286) if getattr(self, 'office_lat', None) is not None else 20.0024286,
            'officeLng': getattr(self, 'office_lng', 73.776293) if getattr(self, 'office_lng', None) is not None else 73.776293,
            'allowedRadiusMeters': getattr(self, 'allowed_radius_meters', 40.0) if getattr(self, 'allowed_radius_meters', None) is not None else 40.0,
            'geofenceEnabled': getattr(self, 'geofence_enabled', True) if getattr(self, 'geofence_enabled', None) is not None else True
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
    status = db.Column(db.String(30), nullable=False, default='pending')  # 'pending', 'approved', 'rejected', 'withdrawal_requested', 'withdrawn'
    reporting_manager_id = db.Column(db.String(20), db.ForeignKey('employees.id'), nullable=True)
    manager_comment = db.Column(db.Text, nullable=True)
    withdraw_reason = db.Column(db.Text, nullable=True)
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
            'withdrawReason': getattr(self, 'withdraw_reason', None),
            'reviewedAt': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }


class SalarySlip(db.Model):
    __tablename__ = 'salary_slips'

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.String(20), db.ForeignKey('employees.id'), nullable=False)
    month = db.Column(db.String(7), nullable=False)  # YYYY-MM
    base_salary = db.Column(db.Float, nullable=False, default=0.0)
    working_days = db.Column(db.Integer, nullable=False, default=0)
    present_days = db.Column(db.Float, nullable=False, default=0.0)
    half_days = db.Column(db.Integer, nullable=False, default=0)
    absent_days = db.Column(db.Integer, nullable=False, default=0)
    paid_leaves = db.Column(db.Float, nullable=False, default=0.0)
    overtime_hours = db.Column(db.Float, nullable=False, default=0.0)
    overtime_pay = db.Column(db.Float, nullable=False, default=0.0)
    unpaid_deductions = db.Column(db.Float, nullable=False, default=0.0)
    gross_salary = db.Column(db.Float, nullable=False, default=0.0)
    net_salary = db.Column(db.Float, nullable=False, default=0.0)
    status = db.Column(db.String(20), nullable=False, default='generated')  # 'generated', 'paid'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    employee = db.relationship('Employee', backref='salary_slips', lazy=True)

    def __init__(self, **kwargs):
        super(SalarySlip, self).__init__(**kwargs)

    def to_dict(self):
        return {
            'id': self.id,
            'employeeId': self.employee_id,
            'employeeName': f"{self.employee.first_name} {self.employee.last_name}" if self.employee else self.employee_id,
            'department': self.employee.department if self.employee else None,
            'designation': self.employee.designation if self.employee else None,
            'month': self.month,
            'baseSalary': self.base_salary,
            'workingDays': self.working_days,
            'presentDays': self.present_days,
            'halfDays': self.half_days,
            'absentDays': self.absent_days,
            'paidLeaves': self.paid_leaves,
            'overtimeHours': round(self.overtime_hours, 2),
            'overtimePay': round(self.overtime_pay, 2),
            'unpaidDeductions': round(self.unpaid_deductions, 2),
            'grossSalary': round(self.gross_salary, 2),
            'netSalary': round(self.net_salary, 2),
            'status': self.status,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }


