import os
import base64
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Employee, Document, AttendanceRecord, AuditLog
from utils import log_audit

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
