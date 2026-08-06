import os
import base64
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Employee, Document, AttendanceRecord, AuditLog, LeaveRequest
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
        if ',' in photo_base64:
            photo_base64 = photo_base64.split(',')[1]
        image_data = base64.b64decode(photo_base64)
        filename = f"avatar_{user_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.jpg"
        filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, 'wb') as f:
            f.write(image_data)

        photo_url = f"/uploads/{filename}"
        employee.profile_photo_url = photo_url
        db.session.commit()

        log_audit(user_id, f"{employee.first_name} {employee.last_name}", "Updated Profile Photo", "Employee", user_id)

        return jsonify({
            'message': 'Profile photo updated successfully',
            'profilePhotoUrl': photo_url
        }), 200
    except Exception as e:
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
            print(f"Error marking leave records: {e}")

    db.session.commit()

    log_audit(
        user_id,
        f"{reviewer.first_name} {reviewer.last_name}",
        f"{action.capitalize()}d Leave Request #{req_id} for Employee {leave_req.employee_id}",
        "LeaveRequest",
        str(req_id)
    )

    return jsonify({
        'message': f'Leave request successfully {leave_req.status}.',
        'leaveRequest': leave_req.to_dict()
    }), 200

