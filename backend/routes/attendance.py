import os
import base64
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app, Response
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from models import db, Employee, AttendanceRecord, AttendanceRule, Holiday, AuditLog
from utils import compute_attendance_status, log_audit, get_current_now, get_current_date_str, get_current_time_str

attendance_bp = Blueprint('attendance', __name__, url_prefix='/api/attendance')

def save_base64_photo(base64_str, folder_name='punches'):
    """Decodes base64 photo string and saves to uploads folder."""
    if not base64_str:
        return None
    try:
        if ',' in base64_str:
            base64_str = base64_str.split(',')[1]
        image_data = base64.b64decode(base64_str)
        filename = f"{folder_name}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S_%f')}.jpg"
        filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, 'wb') as f:
            f.write(image_data)
        return f"/uploads/{filename}"
    except Exception as e:
        print(f"Error saving photo: {e}")
        return None


@attendance_bp.route('/today-status', methods=['GET'])
@jwt_required()
def get_today_status():
    user_id = get_jwt_identity()
    today_str = datetime.utcnow().strftime('%Y-%m-%d')
    
    rule = AttendanceRule.query.order_by(AttendanceRule.id.desc()).first()
    if not rule:
        rule = AttendanceRule()

    record = AttendanceRecord.query.filter_by(employee_id=user_id, date=today_str).first()
    
    return jsonify({
        'todayDate': today_str,
        'currentTime': datetime.utcnow().strftime('%H:%M:%S'),
        'rule': rule.to_dict(),
        'record': record.to_dict() if record else None
    }), 200


@attendance_bp.route('/punch-in', methods=['POST'])
@jwt_required()
def punch_in():
    user_id = get_jwt_identity()
    employee = Employee.query.get(user_id)
    if not employee:
        return jsonify({'error': 'Employee not found'}), 404

    data = request.get_json() or {}
    client_time = data.get('clientTime')
    today_str = get_current_date_str()
    now_time_str = client_time if (client_time and len(client_time) >= 5) else get_current_time_str()

    # Check if already punched in
    existing = AttendanceRecord.query.filter_by(employee_id=user_id, date=today_str).first()
    if existing and existing.punch_in_time:
        return jsonify({'error': f'Already punched in today at {existing.punch_in_time}'}), 400

    photo_base64 = data.get('photo')
    location = data.get('location')
    late_reason = data.get('lateReason', '').strip()

    # Get current active rule
    rule = AttendanceRule.query.order_by(AttendanceRule.id.desc()).first()
    if not rule:
        rule = AttendanceRule()

    # Compute status server-side
    status, requires_reason = compute_attendance_status(now_time_str, today_str, rule)

    # Validate late reason if required
    if requires_reason and not late_reason:
        return jsonify({
            'error': 'Late reason is required for punch-in beyond buffer time.',
            'requiresLateReason': True
        }), 400

    photo_url = save_base64_photo(photo_base64, folder_name=f"punch_in_{user_id}")

    if not existing:
        record = AttendanceRecord(
            employee_id=user_id,
            date=today_str,
            punch_in_time=now_time_str,
            punch_in_photo_url=photo_url,
            punch_in_location=location,
            status=status,
            late_reason=late_reason if requires_reason else None
        )
        db.session.add(record)
    else:
        record = existing
        record.punch_in_time = now_time_str
        record.punch_in_photo_url = photo_url
        record.punch_in_location = location
        record.status = status
        record.late_reason = late_reason if requires_reason else None

    db.session.commit()

    return jsonify({
        'message': f"Punched in successfully at {now_time_str}",
        'recordedTime': now_time_str,
        'status': status,
        'record': record.to_dict()
    }), 200


@attendance_bp.route('/punch-out', methods=['POST'])
@jwt_required()
def punch_out():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    client_time = data.get('clientTime')
    today_str = get_current_date_str()
    now_time_str = client_time if (client_time and len(client_time) >= 5) else get_current_time_str()

    record = AttendanceRecord.query.filter_by(employee_id=user_id, date=today_str).first()
    if not record:
        rule = AttendanceRule.query.order_by(AttendanceRule.id.desc()).first()
        ideal_in = rule.ideal_punch_in_time + ":00" if rule else "09:30:00"
        record = AttendanceRecord(
            employee_id=user_id,
            date=today_str,
            punch_in_time=ideal_in,
            status='on_time'
        )
        db.session.add(record)
    elif not record.punch_in_time:
        rule = AttendanceRule.query.order_by(AttendanceRule.id.desc()).first()
        record.punch_in_time = rule.ideal_punch_in_time + ":00" if rule else "09:30:00"

    if record.punch_out_time:
        return jsonify({'error': f'Already punched out today at {record.punch_out_time}'}), 400

    data = request.get_json() or {}
    photo_base64 = data.get('photo')

    photo_url = save_base64_photo(photo_base64, folder_name=f"punch_out_{user_id}")

    record.punch_out_time = now_time_str
    record.punch_out_photo_url = photo_url
    db.session.commit()

    return jsonify({
        'message': f"Punched out successfully at {now_time_str}",
        'recordedTime': now_time_str,
        'record': record.to_dict()
    }), 200


@attendance_bp.route('/log', methods=['GET'])
@jwt_required()
def get_attendance_log():
    claims = get_jwt()
    current_user_id = get_jwt_identity()
    is_admin = (claims.get('role') == 'super_admin')

    search = request.args.get('search', '').strip()
    department = request.args.get('department', '').strip()
    status = request.args.get('status', '').strip()
    start_date = request.args.get('startDate', '').strip()
    end_date = request.args.get('endDate', '').strip()

    query = AttendanceRecord.query.join(Employee)

    if not is_admin:
        query = query.filter(AttendanceRecord.employee_id == current_user_id)

    if search and is_admin:
        query = query.filter(
            (Employee.first_name.ilike(f"%{search}%")) |
            (Employee.last_name.ilike(f"%{search}%")) |
            (Employee.id.ilike(f"%{search}%"))
        )

    if department and is_admin:
        query = query.filter(Employee.department == department)

    if status:
        query = query.filter(AttendanceRecord.status == status)

    if start_date:
        query = query.filter(AttendanceRecord.date >= start_date)

    if end_date:
        query = query.filter(AttendanceRecord.date <= end_date)

    records = query.order_by(AttendanceRecord.date.desc(), AttendanceRecord.id.desc()).all()
    return jsonify({'records': [r.to_dict() for r in records]}), 200


@attendance_bp.route('/export/csv', methods=['GET'])
@jwt_required(locations=['headers', 'query_string'])
def export_attendance_csv():
    claims = get_jwt()
    if claims.get('role') != 'super_admin':
        return jsonify({'error': 'Unauthorized'}), 403

    records = AttendanceRecord.query.join(Employee).order_by(AttendanceRecord.date.desc()).all()

    csv_lines = ["Date,Employee ID,Employee Name,Department,Designation,Punch In,Punch Out,Status,Late Reason"]
    for r in records:
        emp_name = f"{r.employee.first_name} {r.employee.last_name}" if r.employee else ""
        dept = r.employee.department if r.employee else ""
        desig = r.employee.designation if r.employee else ""
        reason = (r.late_reason or "").replace(",", ";")
        csv_lines.append(f'"{r.date}","{r.employee_id}","{emp_name}","{dept}","{desig}","{r.punch_in_time or ""}","{r.punch_out_time or ""}","{r.status}","{reason}"')

    csv_content = "\n".join(csv_lines)
    return Response(
        csv_content,
        mimetype="text/csv",
        headers={"Content-disposition": "attachment; filename=apc_attendance_export.csv"}
    )
