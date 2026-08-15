import os
import base64
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app, Response
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from models import db, Employee, AttendanceRecord, AttendanceRule, Holiday, AuditLog
from utils import compute_attendance_status, log_audit, get_current_now, get_current_date_str, get_current_time_str, validate_geofence

attendance_bp = Blueprint('attendance', __name__, url_prefix='/api/attendance')

def save_base64_photo(base64_str, folder_name='punches'):
    """Decodes base64 photo string, saves to uploads folder, and returns full Data URL for reliable cloud display."""
    if not base64_str:
        return None
    try:
        raw_b64 = base64_str.split(',')[1] if ',' in base64_str else base64_str
        image_data = base64.b64decode(raw_b64)
        filename = f"{folder_name}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S_%f')}.jpg"
        filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, 'wb') as f:
            f.write(image_data)
        
        # Return full data URL so image works 100% reliably across Railway container restarts and CORS
        if base64_str.startswith('data:'):
            return base64_str
        return f"data:image/jpeg;base64,{raw_b64}"
    except Exception as e:
        print(f"Error saving photo: {e}")
        return base64_str if (base64_str and base64_str.startswith('data:')) else None


@attendance_bp.route('/today-status', methods=['GET'])
@jwt_required()
def get_today_status():
    user_id = get_jwt_identity()
    today_str = get_current_date_str()
    now_time_str = get_current_time_str()
    
    rule = AttendanceRule.query.order_by(AttendanceRule.id.desc()).first()
    if not rule:
        rule = AttendanceRule()

    record = AttendanceRecord.query.filter_by(employee_id=user_id, date=today_str).first()
    if not record:
        # Fallback check for UTC date if different
        utc_date = datetime.utcnow().strftime('%Y-%m-%d')
        if utc_date != today_str:
            record = AttendanceRecord.query.filter_by(employee_id=user_id, date=utc_date).first()
    
    return jsonify({
        'todayDate': today_str,
        'currentTime': now_time_str,
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
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    accuracy = data.get('accuracy')
    location = data.get('location')
    late_reason = data.get('lateReason', '').strip()
    shift_type = data.get('shiftType', 'full_day')
    if shift_type not in ['full_day', 'second_half']:
        shift_type = 'full_day'

    # Get current active rule
    rule = AttendanceRule.query.order_by(AttendanceRule.id.desc()).first()
    if not rule:
        rule = AttendanceRule()

    # Validate Geofence (office radius requirement with mobile accuracy buffer)
    is_geo_valid, geo_msg, geo_dist = validate_geofence(latitude, longitude, rule, user_accuracy=accuracy)
    if not is_geo_valid:
        return jsonify({
            'error': geo_msg,
            'outsideArea': True,
            'distance': geo_dist
        }), 400

    if not location and geo_dist is not None:
        location = f"AP Corporation Office ({geo_dist}m)"

    # Compute status server-side
    status, requires_reason = compute_attendance_status(now_time_str, today_str, rule, shift_type=shift_type)

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
            shift_type=shift_type,
            late_reason=late_reason if requires_reason else None
        )
        db.session.add(record)
    else:
        record = existing
        record.punch_in_time = now_time_str
        record.punch_in_photo_url = photo_url
        record.punch_in_location = location
        record.status = status
        record.shift_type = shift_type
        record.late_reason = late_reason if requires_reason else None

    db.session.commit()

    return jsonify({
        'message': f"Punched in successfully at {now_time_str} ({'Second Half / Half Day' if shift_type == 'second_half' else 'Full Day'})",
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

    rule = AttendanceRule.query.order_by(AttendanceRule.id.desc()).first()
    if not rule:
        rule = AttendanceRule()

    latitude = data.get('latitude')
    longitude = data.get('longitude')
    accuracy = data.get('accuracy')
    location = data.get('location')

    # Validate Geofence for Punch Out as well
    is_geo_valid, geo_msg, geo_dist = validate_geofence(latitude, longitude, rule, user_accuracy=accuracy)
    if not is_geo_valid:
        return jsonify({
            'error': geo_msg,
            'outsideArea': True,
            'distance': geo_dist
        }), 400

    if not location and geo_dist is not None:
        location = f"AP Corporation Office ({geo_dist}m)"

    record = AttendanceRecord.query.filter_by(employee_id=user_id, date=today_str).first()
    if not record:
        ideal_in = getattr(rule, 'ideal_punch_in_time', '10:00') + ":00"
        record = AttendanceRecord(
            employee_id=user_id,
            date=today_str,
            punch_in_time=ideal_in,
            status='on_time',
            shift_type='full_day'
        )
        db.session.add(record)
    elif not record.punch_in_time:
        ideal_in = getattr(rule, 'ideal_punch_in_time', '10:00') + ":00"
        record.punch_in_time = ideal_in

    if record.punch_out_time:
        return jsonify({'error': f'Already punched out today at {record.punch_out_time}'}), 400

    photo_base64 = data.get('photo')
    photo_url = save_base64_photo(photo_base64, folder_name=f"punch_out_{user_id}")

    record.punch_out_time = now_time_str
    record.punch_out_photo_url = photo_url
    record.punch_out_location = location

    # Check Second Half early punch out rule:
    # If punching out before required second half min punch out (e.g. 18:30), mark status as on_leave (unfulfilled half day)
    st = getattr(record, 'shift_type', 'full_day') or 'full_day'
    if st == 'second_half':
        min_out = getattr(rule, 'second_half_min_punch_out', '18:30') or '18:30'
        current_out_short = now_time_str[:5] if len(now_time_str) >= 5 else "00:00"
        if current_out_short < min_out:
            record.status = 'on_leave'

    # Calculate worked duration and overtime hours
    overtime_msg = ""
    try:
        if record.punch_in_time and record.punch_out_time:
            in_fmt = '%H:%M:%S' if len(record.punch_in_time) == 8 else '%H:%M'
            out_fmt = '%H:%M:%S' if len(now_time_str) == 8 else '%H:%M'
            t1 = datetime.strptime(record.punch_in_time, in_fmt)
            t2 = datetime.strptime(now_time_str, out_fmt)
            worked_seconds = (t2 - t1).seconds
            worked_hours = round(worked_seconds / 3600.0, 2)

            ideal_in_str = getattr(rule, 'ideal_punch_in_time', '09:30') or '09:30'
            ideal_out_str = getattr(rule, 'ideal_punch_out_time', '18:30') or '18:30'
            t_ideal_in = datetime.strptime(ideal_in_str, '%H:%M')
            t_ideal_out = datetime.strptime(ideal_out_str, '%H:%M')
            ideal_shift_hours = (t_ideal_out - t_ideal_in).seconds / 3600.0

            if worked_hours > ideal_shift_hours:
                ot_hrs = round(worked_hours - ideal_shift_hours, 2)
                overtime_msg = f" ⏱️ Overtime Recorded: {ot_hrs} hrs extra worked (Total: {worked_hours} hrs)."
            else:
                overtime_msg = f" (Total worked: {worked_hours} hrs)."
    except Exception as ot_err:
        print(f"Overtime calculation notice: {ot_err}")

    # Check if working on a holiday or weekly off to credit C-Off
    from utils import is_holiday_or_weekly_off
    is_off, reason = is_holiday_or_weekly_off(today_str)
    coff_msg = ""
    if is_off:
        employee = Employee.query.get(user_id)
        if employee:
            employee.coff_balance = (getattr(employee, 'coff_balance', 0.0) or 0.0) + 1.0
            log_audit(user_id, f"{employee.first_name} {employee.last_name}", f"Auto-Credited 1.0 C-Off Day for working on {reason} on {today_str}", "Employee", user_id)
            coff_msg = f" 🎉 1.0 C-Off Day earned for working on {reason}!"

    db.session.commit()

    return jsonify({
        'message': f"Punched out successfully at {now_time_str}.{overtime_msg}{coff_msg}",
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
