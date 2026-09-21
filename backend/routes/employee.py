import os
import base64
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Employee, Document, AttendanceRecord, AuditLog, LeaveRequest, ReimbursementRequest, WFHRequest
from utils import log_audit, save_base64_photo

employee_bp = Blueprint('employee', __name__, url_prefix='/api/employee')

@employee_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()
    employee = Employee.query.get(user_id)
    if not employee:
        return jsonify({'error': 'Employee not found'}), 404

    docs = [d.to_dict() for d in employee.documents]
    return jsonify({
        'employee': employee.to_dict(),
        'documents': docs
    }), 200


@employee_bp.route('/profile/photo', methods=['POST'])
@jwt_required()
def update_profile_photo():
    user_id = get_jwt_identity()
    employee = Employee.query.get(user_id)
    if not employee:
        return jsonify({'error': 'Employee not found'}), 404

    data = request.get_json() or {}
    photo_base64 = data.get('photo')

    if not photo_base64:
        return jsonify({'error': 'Photo payload is missing'}), 400

    try:
        photo_url = save_base64_photo(photo_base64, folder_name=f"avatar_{user_id}", return_data_uri=True)
        if not photo_url:
            return jsonify({'error': 'Invalid photo format'}), 400

        employee.profile_photo_url = photo_url
        db.session.commit()

        log_audit(user_id, f"{employee.first_name} {employee.last_name}", "Updated Profile Photo", "Employee", user_id)

        return jsonify({
            'message': 'Profile photo updated successfully',
            'profilePhotoUrl': photo_url
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to upload photo: {str(e)}'}), 500


@employee_bp.route('/request-update', methods=['POST'])
@jwt_required()
def request_info_update():
    user_id = get_jwt_identity()
    employee = Employee.query.get(user_id)
    if not employee:
        return jsonify({'error': 'Employee not found'}), 404

    data = request.get_json() or {}
    field_name = data.get('field', 'General Profile Details')
    requested_value = data.get('requestedValue', '')
    reason = data.get('reason', '')

    log_audit(
        user_id,
        f"{employee.first_name} {employee.last_name}",
        f"Requested Info Update: {field_name} -> '{requested_value}' (Reason: {reason})",
        "Employee",
        user_id
    )

    return jsonify({
        'message': 'Your update request has been submitted to Super Admin for approval.'
    }), 200


@employee_bp.route('/attendance-history', methods=['GET'])
@jwt_required()
def get_personal_attendance_history():
    user_id = get_jwt_identity()
    
    # Optional date range filters or default to current month
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')

    query = AttendanceRecord.query.filter_by(employee_id=user_id)

    if start_date:
        query = query.filter(AttendanceRecord.date >= start_date)
    if end_date:
        query = query.filter(AttendanceRecord.date <= end_date)

    records = query.order_by(AttendanceRecord.date.desc()).all()

    # Monthly Summary stats
    present_count = sum(1 for r in records if r.status in ['on_time', 'in_buffer'])
    late_count = sum(1 for r in records if r.status in ['late', 'half_day'])
    absent_count = sum(1 for r in records if r.status == 'absent')
    on_leave_count = sum(1 for r in records if r.status == 'on_leave')

    return jsonify({
        'records': [r.to_dict() for r in records],
        'summary': {
            'present': present_count,
            'late': late_count,
            'absent': absent_count,
            'onLeave': on_leave_count,
            'totalDays': len(records)
        }
    }), 200


# --- LEAVE REQUEST MANAGEMENT ---

@employee_bp.route('/leave-requests', methods=['POST'])
@jwt_required()
def apply_leave():
    user_id = get_jwt_identity()
    employee = Employee.query.get(user_id)
    if not employee:
        return jsonify({'error': 'Employee not found'}), 404

    data = request.get_json() or {}
    start_date = data.get('startDate')
    end_date = data.get('endDate')
    leave_type = data.get('leaveType', 'Paid Leave')
    reason = data.get('reason')

    if not start_date or not end_date or not reason:
        return jsonify({'error': 'Start date, end date, and reason are required'}), 400

    # Auto assign reporting manager
    manager_id = employee.reporting_manager_id

    leave_req = LeaveRequest(
        employee_id=user_id,
        start_date=start_date,
        end_date=end_date,
        leave_type=leave_type,
        reason=reason.strip(),
        status='pending',
        reporting_manager_id=manager_id
    )

    db.session.add(leave_req)
    db.session.commit()

    manager_name = f"{employee.reporting_manager.first_name} {employee.reporting_manager.last_name}" if employee.reporting_manager else 'Super Admin'

    log_audit(
        user_id,
        f"{employee.first_name} {employee.last_name}",
        f"Applied for {leave_type} ({start_date} to {end_date}) -> Sent to Manager {manager_name}",
        "LeaveRequest",
        str(leave_req.id)
    )

    return jsonify({
        'message': f'Leave request submitted successfully! Sent to {manager_name} for approval.',
        'leaveRequest': leave_req.to_dict()
    }), 201


@employee_bp.route('/leave-requests', methods=['GET'])
@jwt_required()
def get_my_leave_requests():
    user_id = get_jwt_identity()
    requests = LeaveRequest.query.filter_by(employee_id=user_id).order_by(LeaveRequest.created_at.desc()).all()
    return jsonify({
        'leaveRequests': [r.to_dict() for r in requests]
    }), 200


@employee_bp.route('/managed-leave-requests', methods=['GET'])
@jwt_required()
def get_managed_leave_requests():
    user_id = get_jwt_identity()
    employee = Employee.query.get(user_id)
    
    # If user is super_admin, return all pending requests or requests where they are manager
    if employee and employee.role == 'super_admin':
        requests = LeaveRequest.query.order_by(LeaveRequest.created_at.desc()).all()
    else:
        requests = LeaveRequest.query.filter_by(reporting_manager_id=user_id).order_by(LeaveRequest.created_at.desc()).all()

    return jsonify({
        'leaveRequests': [r.to_dict() for r in requests]
    }), 200


@employee_bp.route('/leave-requests/<int:req_id>/withdraw', methods=['POST'])
@jwt_required()
def request_leave_withdrawal(req_id):
    user_id = get_jwt_identity()
    leave_req = LeaveRequest.query.get(req_id)
    if not leave_req:
        return jsonify({'error': 'Leave request not found'}), 404

    if leave_req.employee_id != user_id:
        return jsonify({'error': 'Unauthorized. This leave request does not belong to you.'}), 403

    data = request.get_json() or {}
    withdraw_reason = data.get('reason', '').strip()

    if leave_req.status == 'pending':
        leave_req.status = 'withdrawn'
        leave_req.withdraw_reason = withdraw_reason or 'Cancelled by employee'
        db.session.commit()
        log_audit(user_id, "Employee", f"Cancelled pending Leave Request #{req_id}", "LeaveRequest", str(req_id))
        return jsonify({
            'message': 'Pending leave request cancelled successfully.',
            'leaveRequest': leave_req.to_dict()
        }), 200

    elif leave_req.status == 'approved':
        leave_req.status = 'withdrawal_requested'
        leave_req.withdraw_reason = withdraw_reason or 'Emergency / Change of plans'
        db.session.commit()
        log_audit(user_id, "Employee", f"Requested withdrawal for approved Leave Request #{req_id}", "LeaveRequest", str(req_id))
        return jsonify({
            'message': 'Leave withdrawal request submitted to reporting manager.',
            'leaveRequest': leave_req.to_dict()
        }), 200

    else:
        return jsonify({'error': f'Cannot withdraw leave with current status ({leave_req.status}).'}), 400


@employee_bp.route('/leave-requests/<int:req_id>/review', methods=['POST'])
@jwt_required()
def review_leave_request(req_id):
    user_id = get_jwt_identity()
    reviewer = Employee.query.get(user_id)
    if not reviewer:
        return jsonify({'error': 'Reviewer employee record not found'}), 404

    leave_req = LeaveRequest.query.get(req_id)
    if not leave_req:
        return jsonify({'error': 'Leave request not found'}), 404

    # Permission check: must be assigned manager or super admin
    if reviewer.role != 'super_admin' and leave_req.reporting_manager_id != user_id:
        return jsonify({'error': 'Unauthorized. You are not the assigned reporting manager for this request.'}), 403

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

            message_str = f"Approved leave withdrawal for Employee {leave_req.employee_id}."
        else:
            # Reject withdrawal -> revert status to approved
            leave_req.status = 'approved'
            leave_req.manager_comment = comment
            leave_req.reviewed_at = datetime.utcnow()
            message_str = f"Rejected leave withdrawal request for Employee {leave_req.employee_id}."

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

            message_str = f"Approved Leave Request #{req_id}."
        else:
            leave_req.status = 'rejected'
            leave_req.manager_comment = comment
            leave_req.reviewed_at = datetime.utcnow()
            message_str = f"Rejected Leave Request #{req_id}."

    db.session.commit()

    log_audit(
        user_id,
        f"{reviewer.first_name} {reviewer.last_name}",
        f"Reviewed Leave Request #{req_id} ({action}) for Employee {leave_req.employee_id}",
        "LeaveRequest",
        str(req_id)
    )

    return jsonify({
        'message': message_str,
        'leaveRequest': leave_req.to_dict()
    }), 200


# --- WORK FROM HOME (WFH) MANAGEMENT ---

@employee_bp.route('/wfh-requests', methods=['POST'])
@jwt_required()
def apply_wfh():
    user_id = get_jwt_identity()
    employee = Employee.query.get(user_id)
    if not employee:
        return jsonify({'error': 'Employee not found'}), 404

    data = request.get_json() or {}
    start_date = data.get('startDate')
    end_date = data.get('endDate')
    reason = data.get('reason')

    if not start_date or not end_date or not reason:
        return jsonify({'error': 'Start date, end date, and reason are required for Work From Home application.'}), 400

    # Auto assign reporting manager
    manager_id = employee.reporting_manager_id

    wfh_req = WFHRequest(
        employee_id=user_id,
        start_date=start_date,
        end_date=end_date,
        reason=reason.strip(),
        status='pending',
        reporting_manager_id=manager_id
    )

    db.session.add(wfh_req)
    db.session.commit()

    manager_name = f"{employee.reporting_manager.first_name} {employee.reporting_manager.last_name}" if employee.reporting_manager else 'Super Admin'

    log_audit(
        user_id,
        f"{employee.first_name} {employee.last_name}",
        f"Applied for Work From Home ({start_date} to {end_date}) -> Sent to Manager {manager_name}",
        "WFHRequest",
        str(wfh_req.id)
    )

    return jsonify({
        'message': f'Work From Home request submitted successfully! Sent to {manager_name} for approval.',
        'wfhRequest': wfh_req.to_dict()
    }), 201


@employee_bp.route('/wfh-requests', methods=['GET'])
@jwt_required()
def get_my_wfh_requests():
    user_id = get_jwt_identity()
    requests = WFHRequest.query.filter_by(employee_id=user_id).order_by(WFHRequest.created_at.desc()).all()
    return jsonify({
        'wfhRequests': [r.to_dict() for r in requests]
    }), 200


@employee_bp.route('/managed-wfh-requests', methods=['GET'])
@jwt_required()
def get_managed_wfh_requests():
    user_id = get_jwt_identity()
    employee = Employee.query.get(user_id)
    
    # If user is super_admin, return all requests; otherwise direct reports
    if employee and employee.role == 'super_admin':
        requests = WFHRequest.query.order_by(WFHRequest.created_at.desc()).all()
    else:
        requests = WFHRequest.query.filter_by(reporting_manager_id=user_id).order_by(WFHRequest.created_at.desc()).all()

    return jsonify({
        'wfhRequests': [r.to_dict() for r in requests]
    }), 200


@employee_bp.route('/wfh-requests/<int:req_id>/withdraw', methods=['POST'])
@jwt_required()
def request_wfh_withdrawal(req_id):
    user_id = get_jwt_identity()
    wfh_req = WFHRequest.query.get(req_id)
    if not wfh_req:
        return jsonify({'error': 'Work From Home request not found'}), 404

    if wfh_req.employee_id != user_id:
        return jsonify({'error': 'Unauthorized. This WFH request does not belong to you.'}), 403

    data = request.get_json() or {}
    withdraw_reason = data.get('reason', '').strip()

    if wfh_req.status == 'pending':
        wfh_req.status = 'withdrawn'
        wfh_req.withdraw_reason = withdraw_reason or 'Cancelled by employee'
        db.session.commit()
        log_audit(user_id, "Employee", f"Cancelled pending WFH Request #{req_id}", "WFHRequest", str(req_id))
        return jsonify({
            'message': 'Pending Work From Home request cancelled successfully.',
            'wfhRequest': wfh_req.to_dict()
        }), 200

    elif wfh_req.status == 'approved':
        wfh_req.status = 'withdrawal_requested'
        wfh_req.withdraw_reason = withdraw_reason or 'Emergency / Reporting back to office'
        db.session.commit()
        log_audit(user_id, "Employee", f"Requested withdrawal for approved WFH Request #{req_id}", "WFHRequest", str(req_id))
        return jsonify({
            'message': 'WFH withdrawal request submitted to reporting manager.',
            'wfhRequest': wfh_req.to_dict()
        }), 200

    else:
        return jsonify({'error': f'Cannot withdraw WFH request with current status ({wfh_req.status}).'}), 400


@employee_bp.route('/wfh-requests/<int:req_id>/review', methods=['POST'])
@jwt_required()
def review_wfh_request(req_id):
    user_id = get_jwt_identity()
    reviewer = Employee.query.get(user_id)
    if not reviewer:
        return jsonify({'error': 'Reviewer employee record not found'}), 404

    wfh_req = WFHRequest.query.get(req_id)
    if not wfh_req:
        return jsonify({'error': 'Work From Home request not found'}), 404

    # Permission check: must be assigned manager or super admin
    if reviewer.role != 'super_admin' and wfh_req.reporting_manager_id != user_id:
        return jsonify({'error': 'Unauthorized. You are not the assigned reporting manager for this request.'}), 403

    data = request.get_json() or {}
    action = data.get('action')  # 'approve', 'reject', 'approve_withdrawal', 'reject_withdrawal'
    comment = data.get('comment', '')

    if action not in ['approve', 'reject', 'approve_withdrawal', 'reject_withdrawal']:
        return jsonify({'error': 'Invalid review action'}), 400

    # Handling Withdrawal Review
    if wfh_req.status == 'withdrawal_requested':
        if action in ['approve', 'approve_withdrawal']:
            wfh_req.status = 'withdrawn'
            wfh_req.manager_comment = comment
            wfh_req.reviewed_at = datetime.utcnow()
            message_str = f"Approved WFH withdrawal for Employee {wfh_req.employee_id}."
        else:
            wfh_req.status = 'approved'
            wfh_req.manager_comment = comment
            wfh_req.reviewed_at = datetime.utcnow()
            message_str = f"Rejected WFH withdrawal request for Employee {wfh_req.employee_id}."

    # Handling Normal Pending WFH Review
    else:
        if action in ['approve', 'approve_withdrawal']:
            wfh_req.status = 'approved'
            wfh_req.manager_comment = comment
            wfh_req.reviewed_at = datetime.utcnow()
            message_str = f"Approved Work From Home Request #{req_id} for Employee {wfh_req.employee_id} ({wfh_req.start_date} to {wfh_req.end_date})."
        else:
            wfh_req.status = 'rejected'
            wfh_req.manager_comment = comment
            wfh_req.reviewed_at = datetime.utcnow()
            message_str = f"Rejected Work From Home Request #{req_id}."

    db.session.commit()

    log_audit(
        user_id,
        f"{reviewer.first_name} {reviewer.last_name}",
        f"Reviewed WFH Request #{req_id} ({action}) for Employee {wfh_req.employee_id}",
        "WFHRequest",
        str(req_id)
    )

    return jsonify({
        'message': message_str,
        'wfhRequest': wfh_req.to_dict()
    }), 200



@employee_bp.route('/salary-slips', methods=['GET'])
@jwt_required()
def get_my_salary_slips():
    user_id = get_jwt_identity()
    employee = Employee.query.get(user_id)
    if not employee:
        return jsonify({'error': 'Employee not found'}), 404

    month_str = request.args.get('month')
    if not month_str:
        month_str = datetime.utcnow().strftime('%Y-%m')

    from utils import calculate_employee_salary_slip
    salary_slip_data = calculate_employee_salary_slip(employee, month_str)

    return jsonify({
        'employee': employee.to_dict(),
        'salarySlip': salary_slip_data
    }), 200


# --- REIMBURSEMENT MANAGEMENT ---

@employee_bp.route('/reimbursements', methods=['GET'])
@jwt_required()
def get_my_reimbursements():
    user_id = get_jwt_identity()
    requests = ReimbursementRequest.query.filter_by(employee_id=user_id).order_by(
        ReimbursementRequest.expense_date.desc(),
        ReimbursementRequest.id.desc()
    ).all()

    total_claimed = sum(r.amount for r in requests)
    total_approved = sum(r.amount for r in requests if r.status == 'approved')
    total_pending = sum(r.amount for r in requests if r.status == 'pending')

    return jsonify({
        'reimbursements': [r.to_dict() for r in requests],
        'totalClaimed': round(total_claimed, 2),
        'totalApproved': round(total_approved, 2),
        'totalPending': round(total_pending, 2)
    }), 200


@employee_bp.route('/reimbursements', methods=['POST'])
@jwt_required()
def submit_reimbursement():
    user_id = get_jwt_identity()
    employee = Employee.query.get(user_id)
    if not employee:
        return jsonify({'error': 'Employee not found'}), 404

    data = request.get_json() or {}
    category = data.get('category', '').strip()
    amount_raw = data.get('amount')
    expense_date = data.get('expenseDate', '').strip()
    description = data.get('description', '').strip()
    receipt_photo = data.get('receiptPhoto')

    if not category:
        return jsonify({'error': 'Expense category is required (e.g. Petrol, Hotel, Food)'}), 400

    try:
        amount = float(amount_raw)
        if amount <= 0:
            return jsonify({'error': 'Reimbursement amount must be greater than 0'}), 400
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid reimbursement amount'}), 400

    if not expense_date:
        expense_date = datetime.utcnow().strftime('%Y-%m-%d')

    photo_url = None
    if receipt_photo:
        photo_url = save_base64_photo(receipt_photo, folder_name=f"receipt_{user_id}")

    reimb = ReimbursementRequest(
        employee_id=user_id,
        category=category,
        amount=amount,
        expense_date=expense_date,
        description=description,
        receipt_photo_url=photo_url,
        status='pending'
    )
    db.session.add(reimb)
    db.session.commit()

    log_audit(
        user_id,
        f"{employee.first_name} {employee.last_name}",
        f"Submitted Reimbursement Claim #{reimb.id} for ₹{amount:.2f} ({category}) on {expense_date}",
        "ReimbursementRequest",
        str(reimb.id)
    )

    return jsonify({
        'message': f'Reimbursement request of ₹{amount:.2f} for {category} submitted successfully and sent to Admin for approval.',
        'reimbursement': reimb.to_dict()
    }), 201


@employee_bp.route('/reimbursements/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_my_reimbursement(id):
    user_id = get_jwt_identity()
    reimb = ReimbursementRequest.query.get(id)
    if not reimb:
        return jsonify({'error': 'Reimbursement request not found'}), 404

    if reimb.employee_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403

    if reimb.status != 'pending':
        return jsonify({'error': f'Cannot cancel a reimbursement that is already {reimb.status}'}), 400

    db.session.delete(reimb)
    db.session.commit()

    return jsonify({'message': 'Reimbursement request cancelled successfully'}), 200



