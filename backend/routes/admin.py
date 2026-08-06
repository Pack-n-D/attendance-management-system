import os
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from werkzeug.security import generate_password_hash
from werkzeug.utils import secure_filename
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from models import db, Employee, Document, AttendanceRecord, AttendanceRule, Holiday, AuditLog, LeaveRequest
from utils import generate_employee_id, validate_password, generate_random_password, log_audit, get_current_now, get_current_date_str, get_current_time_str, save_base64_photo

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

def admin_required():
    claims = get_jwt()
    if claims.get('role') != 'super_admin':
        return False
    return True

@admin_bp.before_request
@jwt_required()
def check_admin_access():
    # Only allow OPTIONS requests to pass unverified for CORS preflight
    if request.method == 'OPTIONS':
        return
    if not admin_required():
        return jsonify({'error': 'Unauthorized. Super Admin role required.'}), 403


# --- DASHBOARD ---
@admin_bp.route('/dashboard', methods=['GET'])
def get_dashboard_stats():
    today_str = datetime.utcnow().strftime('%Y-%m-%d')
    
    total_employees = Employee.query.filter_by(status='active', role='employee').count()
    
    # Today's records
    today_records = AttendanceRecord.query.filter_by(date=today_str).all()
    
    present_count = sum(1 for r in today_records if r.status in ['on_time', 'in_buffer'])
    late_count = sum(1 for r in today_records if r.status in ['late', 'half_day'])
    on_leave_count = sum(1 for r in today_records if r.status == 'on_leave')
    punched_count = len(today_records)
    absent_count = max(0, total_employees - punched_count - on_leave_count)
    
    # Late arrivals today
    late_arrivals = []
    for r in today_records:
        if r.status in ['late', 'half_day']:
            late_arrivals.append({
                'id': r.id,
                'employeeId': r.employee_id,
                'employeeName': f"{r.employee.first_name} {r.employee.last_name}" if r.employee else r.employee_id,
                'department': r.employee.department if r.employee else 'General',
                'punchInTime': r.punch_in_time,
                'lateReason': r.late_reason or 'No reason provided',
                'photoUrl': r.punch_in_photo_url
            })
            
    # 30-day trend chart data
    start_30_days_ago = datetime.utcnow() - timedelta(days=30)
    start_date_str = start_30_days_ago.strftime('%Y-%m-%d')
    
    past_records = AttendanceRecord.query.filter(AttendanceRecord.date >= start_date_str).all()
    
    # Group by date
    trend_by_date = {}
    for i in range(30):
        d_str = (datetime.utcnow() - timedelta(days=29 - i)).strftime('%Y-%m-%d')
        trend_by_date[d_str] = {'date': d_str, 'onTime': 0, 'late': 0, 'absent': 0, 'onLeave': 0}
        
    for r in past_records:
        if r.date in trend_by_date:
            if r.status in ['on_time', 'in_buffer']:
                trend_by_date[r.date]['onTime'] += 1
            elif r.status in ['late', 'half_day']:
                trend_by_date[r.date]['late'] += 1
            elif r.status == 'on_leave':
                trend_by_date[r.date]['onLeave'] += 1
            elif r.status == 'absent':
                trend_by_date[r.date]['absent'] += 1
                
    trend_chart = list(trend_by_date.values())
    
    # Pending org-wide leave requests
    pending_leaves = LeaveRequest.query.filter_by(status='pending').order_by(LeaveRequest.created_at.desc()).all()

    return jsonify({
        'todayDate': today_str,
        'stats': {
            'totalEmployees': total_employees,
            'present': present_count,
            'late': late_count,
            'absent': absent_count,
            'onLeave': on_leave_count
        },
        'lateArrivalsToday': late_arrivals,
        'pendingLeaveRequests': [l.to_dict() for l in pending_leaves],
        'trendChart': trend_chart
    }), 200


# --- EMPLOYEE MANAGEMENT ---
@admin_bp.route('/employees/generate-id', methods=['POST'])
def generate_id_preview():
    data = request.get_json() or {}
    first_name = data.get('firstName', '')
    last_name = data.get('lastName', '')
    dob = data.get('dob', '')
    
    if not first_name or not last_name:
        return jsonify({'employeeId': 'JO-DO-99-0001'})
        
    emp_id = generate_employee_id(first_name, last_name, dob)
    return jsonify({'employeeId': emp_id})


@admin_bp.route('/employees', methods=['GET'])
def get_employees():
    search = request.args.get('search', '').strip()
    department = request.args.get('department', '').strip()
    status = request.args.get('status', '').strip()

    query = Employee.query.filter_by(role='employee')

    if search:
        query = query.filter(
            (Employee.first_name.ilike(f"%{search}%")) |
            (Employee.last_name.ilike(f"%{search}%")) |
            (Employee.id.ilike(f"%{search}%")) |
            (Employee.phone.ilike(f"%{search}%")) |
            (Employee.email.ilike(f"%{search}%"))
        )

    if department:
        query = query.filter(Employee.department == department)

    if status:
        query = query.filter(Employee.status == status)

    employees = query.order_by(Employee.created_at.desc()).all()
    
    # Attach today's attendance status to each employee
    today_str = datetime.utcnow().strftime('%Y-%m-%d')
    result = []
    for emp in employees:
        emp_dict = emp.to_dict()
        today_att = AttendanceRecord.query.filter_by(employee_id=emp.id, date=today_str).first()
        emp_dict['todayAttendanceStatus'] = today_att.status if today_att else 'not_punched'
        result.append(emp_dict)

    return jsonify({'employees': result}), 200


@admin_bp.route('/employees', methods=['POST'])
def create_employee():
    admin_id = get_jwt_identity()
    admin_user = Employee.query.get(admin_id)
    admin_name = f"{admin_user.first_name} {admin_user.last_name}" if admin_user else "Super Admin"

    data = request.get_json() or {}
    
    # Required Fields validation
    required_fields = ['firstName', 'lastName', 'phone', 'email', 'dob', 'dateOfJoining', 'designation', 'department']
    for f in required_fields:
        if not data.get(f):
            return jsonify({'error': f'Field {f} is required'}), 400

    # Generate Employee ID
    emp_id = generate_employee_id(data['firstName'], data['lastName'], data['dob'])
    
    # Password verification
    password = data.get('password')
    if not password:
        password = generate_random_password()
        
    valid_pass, pass_msg = validate_password(password)
    if not valid_pass:
        return jsonify({'error': pass_msg}), 400

    email = data['email'].strip().lower()
    existing_emp = Employee.query.filter_by(email=email).first()
    if existing_emp:
        return jsonify({'error': f"An employee with email '{email}' already exists in the system."}), 400

    # Save profile photo if provided
    profile_photo_b64 = data.get('profilePhoto') or data.get('photo')
    photo_url = save_base64_photo(profile_photo_b64, folder_name=f"avatar_{emp_id}") if profile_photo_b64 else None

    # Create employee record
    employee = Employee(
        id=emp_id,
        first_name=data['firstName'].strip(),
        last_name=data['lastName'].strip(),
        phone=data['phone'].strip(),
        email=email,
        dob=data['dob'],
        date_of_joining=data['dateOfJoining'],
        designation=data['designation'].strip(),
        department=data['department'].strip(),
        employment_type=data.get('employmentType', 'Full-time'),
        reporting_manager_id=data.get('reportingManagerId'),
        role='employee',
        status='active',
        profile_photo_url=photo_url,
        password_hash=generate_password_hash(password),
        must_change_password=data.get('mustChangePassword', True),
        created_by=admin_name
    )

    try:
        db.session.add(employee)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f"Could not create employee: {str(e)}"}), 400

    log_audit(admin_id, admin_name, f"Created Employee {employee.first_name} {employee.last_name}", "Employee", employee.id)

    # Return employee object + welcome card credentials payload
    return jsonify({
        'message': 'Employee created successfully',
        'employee': employee.to_dict(),
        'welcomeCard': {
            'employeeId': employee.id,
            'fullName': f"{employee.first_name} {employee.last_name}",
            'email': employee.email,
            'tempPassword': password,
            'designation': employee.designation,
            'department': employee.department,
            'dateOfJoining': employee.date_of_joining,
            'profilePhotoUrl': employee.profile_photo_url
        }
    }), 201


@admin_bp.route('/employees/<id>', methods=['GET'])
def get_employee_detail(id):
    employee = Employee.query.get(id)
    if not employee:
        return jsonify({'error': 'Employee not found'}), 404

    docs = [d.to_dict() for d in employee.documents]
    attendance_records = [a.to_dict() for a in AttendanceRecord.query.filter_by(employee_id=id).order_by(AttendanceRecord.date.desc()).all()]

    return jsonify({
        'employee': employee.to_dict(),
        'documents': docs,
        'attendanceLogs': attendance_records
    }), 200


@admin_bp.route('/employees/<id>', methods=['PUT'])
def update_employee(id):
    admin_id = get_jwt_identity()
    admin_user = Employee.query.get(admin_id)
    admin_name = f"{admin_user.first_name} {admin_user.last_name}" if admin_user else "Super Admin"

    employee = Employee.query.get(id)
    if not employee:
        return jsonify({'error': 'Employee not found'}), 404

    data = request.get_json() or {}
    
    if 'firstName' in data: employee.first_name = data['firstName'].strip()
    if 'lastName' in data: employee.last_name = data['lastName'].strip()
    if 'phone' in data: employee.phone = data['phone'].strip()
    if 'email' in data: employee.email = data['email'].strip().lower()
    if 'dob' in data: employee.dob = data['dob']
    if 'dateOfJoining' in data: employee.date_of_joining = data['dateOfJoining']
    if 'designation' in data: employee.designation = data['designation'].strip()
    if 'department' in data: employee.department = data['department'].strip()
    if 'employmentType' in data: employee.employment_type = data['employmentType']
    if 'reportingManagerId' in data: employee.reporting_manager_id = data['reportingManagerId']

    db.session.commit()

    log_audit(admin_id, admin_name, f"Updated Profile details for Employee {employee.id}", "Employee", employee.id)

    return jsonify({
        'message': 'Employee updated successfully',
        'employee': employee.to_dict()
    }), 200


@admin_bp.route('/employees/<id>/reset-password', methods=['POST'])
def reset_employee_password(id):
    admin_id = get_jwt_identity()
    admin_user = Employee.query.get(admin_id)
    admin_name = f"{admin_user.first_name} {admin_user.last_name}" if admin_user else "Super Admin"

    employee = Employee.query.get(id)
    if not employee:
        return jsonify({'error': 'Employee not found'}), 404

    new_password = generate_random_password()
    employee.password_hash = generate_password_hash(new_password)
    employee.must_change_password = True
    db.session.commit()

    log_audit(admin_id, admin_name, f"Reset Password for Employee {employee.id}", "Employee", employee.id)

    return jsonify({
        'message': f"Password for {employee.first_name} {employee.last_name} reset successfully.",
        'tempPassword': new_password
    }), 200


@admin_bp.route('/employees/<id>/toggle-status', methods=['POST'])
def toggle_employee_status(id):
    admin_id = get_jwt_identity()
    admin_user = Employee.query.get(admin_id)
    admin_name = f"{admin_user.first_name} {admin_user.last_name}" if admin_user else "Super Admin"

    employee = Employee.query.get(id)
    if not employee:
        return jsonify({'error': 'Employee not found'}), 404

    new_status = 'inactive' if employee.status == 'active' else 'active'
    employee.status = new_status
    db.session.commit()

    log_audit(admin_id, admin_name, f"Changed status of Employee {employee.id} to {new_status}", "Employee", employee.id)

    return jsonify({
        'message': f"Employee status updated to {new_status}",
        'status': new_status
    }), 200


# --- ADMIN LEAVE MANAGEMENT ---

@admin_bp.route('/leave-requests', methods=['GET'])
def get_all_leave_requests():
    status = request.args.get('status')
    search = request.args.get('search')

    query = LeaveRequest.query.join(Employee, LeaveRequest.employee_id == Employee.id)

    if status:
        query = query.filter(LeaveRequest.status == status)

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            (Employee.first_name.ilike(search_pattern)) |
            (Employee.last_name.ilike(search_pattern)) |
            (Employee.id.ilike(search_pattern))
        )

    requests = query.order_by(LeaveRequest.created_at.desc()).all()
    return jsonify({
        'leaveRequests': [r.to_dict() for r in requests]
    }), 200


@admin_bp.route('/leave-requests/<int:req_id>/review', methods=['POST'])
def admin_review_leave_request(req_id):
    admin_id = get_jwt_identity()
    admin_user = Employee.query.get(admin_id)
    admin_name = f"{admin_user.first_name} {admin_user.last_name}" if admin_user else "Super Admin"

    leave_req = LeaveRequest.query.get(req_id)
    if not leave_req:
        return jsonify({'error': 'Leave request not found'}), 404

    data = request.get_json() or {}
    action = data.get('action')  # 'approve' or 'reject'
    comment = data.get('comment', '')

    if action not in ['approve', 'reject']:
        return jsonify({'error': 'Action must be approve or reject'}), 400

    leave_req.status = 'approved' if action == 'approve' else 'rejected'
    leave_req.manager_comment = comment
    leave_req.reviewed_at = datetime.utcnow()

    # If approved, update attendance records to on_leave for that date range
    if action == 'approve':
        try:
            start_dt = datetime.strptime(leave_req.start_date, '%Y-%m-%d')
            end_dt = datetime.strptime(leave_req.end_date, '%Y-%m-%d')
            curr_dt = start_dt

            while curr_dt <= end_dt:
                d_str = curr_dt.strftime('%Y-%m-%d')
                rec = AttendanceRecord.query.filter_by(employee_id=leave_req.employee_id, date=d_str).first()
                if rec:
                    rec.status = 'on_leave'
                else:
                    rec = AttendanceRecord(
                        employee_id=leave_req.employee_id,
                        date=d_str,
                        status='on_leave',
                        late_reason=f"Approved Leave: {leave_req.leave_type} - {leave_req.reason}"
                    )
                    db.session.add(rec)
                curr_dt += timedelta(days=1)
        except Exception as e:
            print(f"Error updating leave attendance records: {e}")

    db.session.commit()

    log_audit(
        admin_id,
        admin_name,
        f"Super Admin {action.capitalize()}d Leave Request #{req_id} for Employee {leave_req.employee_id}",
        "LeaveRequest",
        str(req_id)
    )

    return jsonify({
        'message': f'Leave request successfully {leave_req.status} by Super Admin.',
        'leaveRequest': leave_req.to_dict()
    }), 200



# --- AUDIT LOG ---
@admin_bp.route('/audit-log', methods=['GET'])
def get_audit_logs():
    logs = AuditLog.query.order_by(AuditLog.timestamp.desc()).limit(200).all()
    return jsonify({'auditLogs': [l.to_dict() for l in logs]}), 200


# --- SYSTEM RESET ---
@admin_bp.route('/reset-database', methods=['POST'])
def reset_database():
    admin_id = get_jwt_identity()
    admin_user = Employee.query.get(admin_id)

    if not admin_user or admin_user.role != 'super_admin':
        return jsonify({'error': 'Unauthorized. Super Admin role required.'}), 403

    try:
        # Delete test records
        AttendanceRecord.query.delete()
        LeaveRequest.query.delete()
        Document.query.delete()
        AuditLog.query.delete()
        
        # Remove non-super-admin employees
        Employee.query.filter(Employee.role != 'super_admin').delete()
        
        # Preserve & refresh Super Admin credentials
        admin_user.password_hash = generate_password_hash('Admin@123')
        admin_user.must_change_password = False
        admin_user.status = 'active'

        db.session.commit()

        log_audit(admin_id, f"{admin_user.first_name} {admin_user.last_name}", "Database Reset Performed - Cleaned Test Entries", "System", admin_id)

        return jsonify({
            'message': 'Database cleaned successfully! All dummy test entries have been removed. Super Admin remains active with password Admin@123.'
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database reset failed: {str(e)}'}), 500
