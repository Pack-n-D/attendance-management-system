from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from models import db, AttendanceRule, Holiday, Employee
from utils import log_audit, get_current_date_str

settings_bp = Blueprint('settings', __name__, url_prefix='/api/settings')

def admin_required():
    claims = get_jwt()
    return claims.get('role') == 'super_admin'

@settings_bp.route('/attendance-rules', methods=['GET'])
@jwt_required()
def get_rules():
    rule = AttendanceRule.query.order_by(AttendanceRule.id.desc()).first()
    if not rule:
        rule = AttendanceRule()
        db.session.add(rule)
        db.session.commit()
    return jsonify({'rule': rule.to_dict()}), 200


@settings_bp.route('/attendance-rules', methods=['POST', 'PUT'])
@jwt_required()
def update_rules():
    if not admin_required():
        return jsonify({'error': 'Unauthorized'}), 403

    admin_id = get_jwt_identity()
    admin_user = Employee.query.get(admin_id)
    admin_name = f"{admin_user.first_name} {admin_user.last_name}" if admin_user else "Super Admin"

    data = request.get_json() or {}
    
    rule = AttendanceRule(
        ideal_punch_in_time=data.get('idealPunchInTime', '10:00'),
        ideal_punch_out_time=data.get('idealPunchOutTime', '18:30'),
        buffer_minutes_in=int(data.get('bufferMinutesIn', 15)),
        buffer_minutes_out=int(data.get('bufferMinutesOut', 15)),
        weekly_offs=",".join(data.get('weeklyOffs', ['Saturday', 'Sunday'])),
        half_day_threshold_in=data.get('halfDayThresholdIn', '12:00'),
        second_half_start_time=data.get('secondHalfStartTime', '13:00'),
        second_half_end_time=data.get('secondHalfEndTime', '18:30'),
        second_half_min_punch_out=data.get('secondHalfMinPunchOut', '18:30'),
        effective_from=datetime.utcnow().strftime('%Y-%m-%d')
    )

    db.session.add(rule)
    db.session.commit()

    log_audit(admin_id, admin_name, f"Updated Attendance Rules (Ideal In: {rule.ideal_punch_in_time}, 2nd Half: {rule.second_half_start_time}-{rule.second_half_end_time})", "AttendanceRule", str(rule.id))

    return jsonify({
        'message': 'Attendance rules updated successfully (effective from today forward)',
        'rule': rule.to_dict()
    }), 200


@settings_bp.route('/holidays', methods=['GET'])
@jwt_required()
def get_holidays():
    holidays = Holiday.query.order_by(Holiday.date.asc()).all()
    return jsonify({'holidays': [h.to_dict() for h in holidays]}), 200


@settings_bp.route('/holidays', methods=['POST'])
@jwt_required()
def add_holiday():
    if not admin_required():
        return jsonify({'error': 'Unauthorized'}), 403

    admin_id = get_jwt_identity()
    admin_user = Employee.query.get(admin_id)
    admin_name = f"{admin_user.first_name} {admin_user.last_name}" if admin_user else "Super Admin"

    data = request.get_json() or {}
    date_str = data.get('date')
    label = data.get('label')

    if not date_str or not label:
        return jsonify({'error': 'Date and label are required'}), 400

    existing = Holiday.query.filter_by(date=date_str).first()
    if existing:
        return jsonify({'error': f'Holiday for {date_str} already exists'}), 400

    holiday = Holiday(date=date_str, label=label.strip())
    db.session.add(holiday)
    db.session.commit()

    log_audit(admin_id, admin_name, f"Added holiday: {label} on {date_str}", "Holiday", str(holiday.id))

    return jsonify({
        'message': 'Holiday added successfully',
        'holiday': holiday.to_dict()
    }), 201


@settings_bp.route('/holidays/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_holiday(id):
    if not admin_required():
        return jsonify({'error': 'Unauthorized'}), 403

    admin_id = get_jwt_identity()
    admin_user = Employee.query.get(admin_id)
    admin_name = f"{admin_user.first_name} {admin_user.last_name}" if admin_user else "Super Admin"

    holiday = Holiday.query.get(id)
    if not holiday:
        return jsonify({'error': 'Holiday not found'}), 404

    db.session.delete(holiday)
    db.session.commit()

    log_audit(admin_id, admin_name, f"Deleted holiday {holiday.label}", "Holiday", str(id))

    return jsonify({'message': 'Holiday deleted successfully'}), 200
