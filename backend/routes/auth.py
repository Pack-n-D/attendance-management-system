from flask import Blueprint, request, jsonify
from werkzeug.security import check_password_hash, generate_password_hash
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity, get_jwt
from models import db, Employee
from utils import validate_password, log_audit

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# Failed login attempt tracker (in-memory lock for demo safety)
failed_password_attempts = {}

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json() or {}
        identifier = data.get('identifier', '').strip()  # Can be Employee ID or Email
        password = data.get('password', '')

        if not identifier or not password:
            return jsonify({'error': 'Employee ID/Email and password are required'}), 400

        # Search by ID or Email
        employee = Employee.query.filter(
            (Employee.id == identifier) | (Employee.email == identifier)
        ).first()

        if not employee:
            return jsonify({'error': 'Invalid credentials'}), 401

        if employee.status != 'active':
            return jsonify({'error': f'Account is {employee.status}. Please contact Super Admin.'}), 403

        if not check_password_hash(employee.password_hash, password):
            return jsonify({'error': 'Invalid credentials'}), 401

        # Create tokens with claims
        additional_claims = {
            'role': employee.role,
            'mustChangePassword': employee.must_change_password,
            'name': f"{employee.first_name} {employee.last_name}"
        }
        
        access_token = create_access_token(identity=employee.id, additional_claims=additional_claims)
        refresh_token = create_refresh_token(identity=employee.id)

        log_audit(employee.id, f"{employee.first_name} {employee.last_name}", "User Logged In", "Employee", employee.id)

        return jsonify({
            'message': 'Login successful',
            'token': access_token,
            'refreshToken': refresh_token,
            'user': employee.to_dict()
        }), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Server Login Error: {str(e)}'}), 500


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    current_user_id = get_jwt_identity()
    employee = Employee.query.get(current_user_id)
    if not employee:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'user': employee.to_dict()}), 200


@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    current_user_id = get_jwt_identity()
    employee = Employee.query.get(current_user_id)

    if not employee:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json() or {}
    current_password = data.get('currentPassword', '')
    dob_confirm = data.get('dob', '').strip()  # Identity check
    new_password = data.get('newPassword', '')
    confirm_password = data.get('confirmPassword', '')

    # Lockout check (5 failed attempts limit)
    attempts = failed_password_attempts.get(current_user_id, 0)
    if attempts >= 5:
        return jsonify({'error': 'Too many failed attempts. Password change locked for 15 minutes.'}), 429

    # Verify current password
    if not check_password_hash(employee.password_hash, current_password):
        failed_password_attempts[current_user_id] = attempts + 1
        return jsonify({'error': f'Incorrect current password. ({5 - (attempts + 1)} attempts remaining)'}), 400

    # Reset failed attempts counter on correct current password
    failed_password_attempts[current_user_id] = 0

    # Verify DOB if employee role
    if employee.role == 'employee' and dob_confirm and employee.dob != dob_confirm:
        return jsonify({'error': 'Date of Birth does not match employee record.'}), 400

    if new_password != confirm_password:
        return jsonify({'error': 'New passwords do not match.'}), 400

    valid, msg = validate_password(new_password)
    if not valid:
        return jsonify({'error': msg}), 400

    # Update password and clear mustChangePassword flag
    employee.password_hash = generate_password_hash(new_password)
    employee.must_change_password = False
    db.session.commit()

    log_audit(employee.id, f"{employee.first_name} {employee.last_name}", "Password Changed Successfully", "Employee", employee.id)

    return jsonify({'message': 'Password changed successfully. Please log in with your new credentials.'}), 200
