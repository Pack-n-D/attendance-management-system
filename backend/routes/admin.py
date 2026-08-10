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
    
    # Pending org-wide leave requests (including withdrawal requests)
    pending_leaves = LeaveRequest.query.filter(LeaveRequest.status.in_(['pending', 'withdrawal_requested'])).order_by(LeaveRequest.created_at.desc()).all()

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
        created_by=admin_name,
        base_salary=float(data.get('baseSalary', 0.0) or 0.0),
        casual_leave_balance=float(data.get('casualLeaveBalance', 12.0) or 12.0),
        sick_leave_balance=float(data.get('sickLeaveBalance', 12.0) or 12.0),
        paid_leave_balance=float(data.get('paidLeaveBalance', 15.0) or 15.0),
        coff_balance=float(data.get('coffBalance', 0.0) or 0.0)
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
    if 'baseSalary' in data: employee.base_salary = float(data['baseSalary'] or 0.0)
    if 'casualLeaveBalance' in data: employee.casual_leave_balance = float(data['casualLeaveBalance'] or 0.0)
    if 'sickLeaveBalance' in data: employee.sick_leave_balance = float(data['sickLeaveBalance'] or 0.0)
    if 'paidLeaveBalance' in data: employee.paid_leave_balance = float(data['paidLeaveBalance'] or 0.0)
    if 'coffBalance' in data: employee.coff_balance = float(data['coffBalance'] or 0.0)
    
    photo_payload = data.get('profilePhoto') or data.get('photo')
    if photo_payload:
        new_photo_url = save_base64_photo(photo_payload, folder_name=f"avatar_{id}", return_data_uri=True)
        if new_photo_url:
            employee.profile_photo_url = new_photo_url

    db.session.commit()

    log_audit(admin_id, admin_name, f"Updated Profile details for Employee {employee.id}", "Employee", employee.id)

    return jsonify({
        'message': 'Employee updated successfully',
        'employee': employee.to_dict()
    }), 200


@admin_bp.route('/employees/<id>/photo', methods=['POST', 'PUT'])
def update_employee_photo_admin(id):
    admin_id = get_jwt_identity()
    admin_user = Employee.query.get(admin_id)
    admin_name = f"{admin_user.first_name} {admin_user.last_name}" if admin_user else "Super Admin"

    employee = Employee.query.get(id)
    if not employee:
        return jsonify({'error': 'Employee not found'}), 404

    data = request.get_json() or {}
    photo_base64 = data.get('photo') or data.get('profilePhoto')

    if not photo_base64:
        return jsonify({'error': 'Photo payload is missing'}), 400

    try:
        photo_url = save_base64_photo(photo_base64, folder_name=f"avatar_{id}", return_data_uri=True)
        if not photo_url:
            return jsonify({'error': 'Invalid photo format'}), 400

        employee.profile_photo_url = photo_url
        db.session.commit()

        log_audit(admin_id, admin_name, f"Updated Profile Photo for Employee {employee.first_name} {employee.last_name}", "Employee", id)

        return jsonify({
            'message': 'Employee profile photo updated successfully',
            'profilePhotoUrl': photo_url
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to update photo: {str(e)}'}), 500


@admin_bp.route('/employees/<id>/documents', methods=['POST', 'PUT'])
def upload_employee_document_admin(id):
    admin_id = get_jwt_identity()
    admin_user = Employee.query.get(admin_id)
    admin_name = f"{admin_user.first_name} {admin_user.last_name}" if admin_user else "Super Admin"

    employee = Employee.query.get(id)
    if not employee:
        return jsonify({'error': 'Employee not found'}), 404

    data = request.get_json() or {}
    doc_type = data.get('docType') or data.get('type')
    file_name = data.get('fileName') or 'document'
    file_data = data.get('fileData') or data.get('fileUrl')

    if not doc_type or not file_data:
        return jsonify({'error': 'docType and fileData are required'}), 400

    try:
        file_url = file_data
        if file_data.startswith('data:'):
            file_url = save_base64_photo(file_data, folder_name=f"doc_{id}_{doc_type}", return_data_uri=True)

        existing_doc = Document.query.filter_by(employee_id=id, type=doc_type).first()
        if existing_doc:
            existing_doc.file_url = file_url
            existing_doc.file_name = file_name
            existing_doc.uploaded_by = admin_name
            existing_doc.uploaded_at = datetime.utcnow()
            doc_record = existing_doc
        else:
            doc_record = Document(
                employee_id=id,
                type=doc_type,
                file_url=file_url,
                file_name=file_name,
                uploaded_by=admin_name,
                uploaded_at=datetime.utcnow()
            )
            db.session.add(doc_record)

        db.session.commit()
        log_audit(admin_id, admin_name, f"Uploaded {doc_type.upper()} document for Employee {employee.id}", "Document", str(doc_record.id))

        docs = [d.to_dict() for d in employee.documents]
        return jsonify({
            'message': f'Document {doc_type.upper()} uploaded successfully',
            'documents': docs,
            'document': doc_record.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to upload document: {str(e)}'}), 500


@admin_bp.route('/employees/<id>/documents/<int:doc_id>', methods=['DELETE'])
def delete_employee_document_admin(id, doc_id):
    admin_id = get_jwt_identity()
    admin_user = Employee.query.get(admin_id)
    admin_name = f"{admin_user.first_name} {admin_user.last_name}" if admin_user else "Super Admin"

    doc = Document.query.filter_by(id=doc_id, employee_id=id).first()
    if not doc:
        return jsonify({'error': 'Document record not found'}), 404

    doc_type = doc.type
    db.session.delete(doc)
    db.session.commit()

    log_audit(admin_id, admin_name, f"Deleted {doc_type.upper()} document for Employee {id}", "Document", str(doc_id))

    employee = Employee.query.get(id)
    docs = [d.to_dict() for d in employee.documents] if employee else []
    return jsonify({
        'message': f'Document {doc_type.upper()} deleted successfully',
        'documents': docs
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


@admin_bp.route('/employees/<id>', methods=['DELETE'])
def delete_employee(id):
    admin_id = get_jwt_identity()
    admin_user = Employee.query.get(admin_id)
    admin_name = f"{admin_user.first_name} {admin_user.last_name}" if admin_user else "Super Admin"

    employee = Employee.query.get(id)
    if not employee:
        return jsonify({'error': 'Employee not found'}), 404

    if employee.role == 'super_admin' or employee.id == 'SUPERADMIN01':
        return jsonify({'error': 'Super Admin account cannot be deleted.'}), 403

    try:
        emp_name = f"{employee.first_name} {employee.last_name}"
        # Delete associated records
        AttendanceRecord.query.filter_by(employee_id=id).delete()
        LeaveRequest.query.filter_by(employee_id=id).delete()
        Document.query.filter_by(employee_id=id).delete()
        
        db.session.delete(employee)
        db.session.commit()

        log_audit(admin_id, admin_name, f"Deleted Employee record {id} ({emp_name})", "Employee", id)

        return jsonify({'message': f"Employee {emp_name} ({id}) deleted successfully."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f"Failed to delete employee: {str(e)}"}), 500


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
    action = data.get('action')  # 'approve', 'reject', 'approve_withdrawal', 'reject_withdrawal'
    comment = data.get('comment', '')

    if action not in ['approve', 'reject', 'approve_withdrawal', 'reject_withdrawal']:
        return jsonify({'error': 'Invalid review action'}), 400

    start_dt = datetime.strptime(leave_req.start_date, '%Y-%m-%d')
    end_dt = datetime.strptime(leave_req.end_date, '%Y-%m-%d')
    num_days = (end_dt - start_dt).days + 1
    target_emp = Employee.query.get(leave_req.employee_id)

    # Handling Withdrawal Request Review
    if leave_req.status == 'withdrawal_requested':
        if action in ['approve', 'approve_withdrawal']:
            leave_req.status = 'withdrawn'
            leave_req.manager_comment = comment
            leave_req.reviewed_at = datetime.utcnow()

            # Credit back leave balance
            if target_emp:
                l_type = leave_req.leave_type
                if l_type == 'Casual Leave':
                    target_emp.casual_leave_balance = (getattr(target_emp, 'casual_leave_balance', 12.0) or 0.0) + num_days
                elif l_type == 'Sick Leave':
                    target_emp.sick_leave_balance = (getattr(target_emp, 'sick_leave_balance', 12.0) or 0.0) + num_days
                elif l_type == 'Paid Leave':
                    target_emp.paid_leave_balance = (getattr(target_emp, 'paid_leave_balance', 15.0) or 0.0) + num_days
                elif l_type in ['Compensatory Off (C-Off)', 'C-Off']:
                    target_emp.coff_balance = (getattr(target_emp, 'coff_balance', 0.0) or 0.0) + num_days

            # Clear on_leave attendance records
            curr_dt = start_dt
            while curr_dt <= end_dt:
                d_str = curr_dt.strftime('%Y-%m-%d')
                rec = AttendanceRecord.query.filter_by(employee_id=leave_req.employee_id, date=d_str).first()
                if rec and rec.status == 'on_leave':
                    if not rec.punch_in_time:
                        db.session.delete(rec)
                    else:
                        rec.status = 'on_time'
                curr_dt += timedelta(days=1)

            message_str = f"Super Admin approved leave withdrawal for Employee {leave_req.employee_id}."
        else:
            # Reject withdrawal -> revert status to approved
            leave_req.status = 'approved'
            leave_req.manager_comment = comment
            leave_req.reviewed_at = datetime.utcnow()
            message_str = f"Super Admin rejected leave withdrawal request for Employee {leave_req.employee_id}."

    # Handling Normal Pending Leave Review
    else:
        if action in ['approve', 'approve_withdrawal']:
            leave_req.status = 'approved'
            leave_req.manager_comment = comment
            leave_req.reviewed_at = datetime.utcnow()

            # Deduct leave balance
            if target_emp:
                l_type = leave_req.leave_type
                if l_type == 'Casual Leave':
                    target_emp.casual_leave_balance = max(0.0, (getattr(target_emp, 'casual_leave_balance', 12.0) or 12.0) - num_days)
                elif l_type == 'Sick Leave':
                    target_emp.sick_leave_balance = max(0.0, (getattr(target_emp, 'sick_leave_balance', 12.0) or 12.0) - num_days)
                elif l_type == 'Paid Leave':
                    target_emp.paid_leave_balance = max(0.0, (getattr(target_emp, 'paid_leave_balance', 15.0) or 15.0) - num_days)
                elif l_type in ['Compensatory Off (C-Off)', 'C-Off']:
                    target_emp.coff_balance = max(0.0, (getattr(target_emp, 'coff_balance', 0.0) or 0.0) - num_days)

            # Create/update on_leave attendance records
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

            message_str = f"Super Admin approved Leave Request #{req_id}."
        else:
            leave_req.status = 'rejected'
            leave_req.manager_comment = comment
            leave_req.reviewed_at = datetime.utcnow()
            message_str = f"Super Admin rejected Leave Request #{req_id}."

    db.session.commit()

    log_audit(
        admin_id,
        admin_name,
        f"Super Admin Reviewed Leave Request #{req_id} ({action}) for Employee {leave_req.employee_id}",
        "LeaveRequest",
        str(req_id)
    )

    return jsonify({
        'message': message_str,
        'leaveRequest': leave_req.to_dict()
    }), 200


@admin_bp.route('/employees/<id>/salary-slip', methods=['GET'])
def get_employee_salary_slip_admin(id):
    employee = Employee.query.get(id)
    if not employee:
        return jsonify({'error': 'Employee not found'}), 404

    month_str = request.args.get('month')
    if not month_str:
        month_str = datetime.utcnow().strftime('%Y-%m')

    from utils import calculate_monthly_salary_slip
    salary_slip_data = calculate_monthly_salary_slip(employee, month_str)

    return jsonify({
        'employee': employee.to_dict(),
        'salarySlip': salary_slip_data
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
