import re
import random
import string
from datetime import datetime, time
from models import db, Employee, AttendanceRule, AuditLog, Holiday

def generate_employee_id(first_name: str, last_name: str, dob: str) -> str:
    """
    Generates a ~10-character human-parseable Employee ID:
    e.g. First Name: John, Last Name: Doe, DOB: 1999-04-15
    Prefix: JO-DO-99-XXXX
    """
    fn = (first_name.strip()[:2] if len(first_name.strip()) >= 2 else (first_name.strip() + 'X')[:2]).upper()
    ln = (last_name.strip()[:2] if len(last_name.strip()) >= 2 else (last_name.strip() + 'X')[:2]).upper()
    
    birth_year_suffix = '00'
    if dob and len(dob) >= 4:
        birth_year_suffix = dob[:4][-2:]
        
    prefix = f"{fn}-{ln}-{birth_year_suffix}"
    
    # Find existing matching prefixes in DB to increment serial
    existing_count = Employee.query.filter(Employee.id.like(f"{prefix}-%")).count()
    serial = existing_count + 1
    
    return f"{prefix}-{serial:04d}"


def validate_password(password: str):
    """
    Rules:
    - Minimum 8 characters
    - At least 1 uppercase letter
    - At least 1 number
    - At least 1 special character
    - No spaces
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if " " in password:
        return False, "Password must not contain spaces."
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter."
    if not re.search(r"[0-9]", password):
        return False, "Password must contain at least one number."
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>/?]", password):
        return False, "Password must contain at least one special character."
    return True, "Password is valid."


def generate_random_password(length=10) -> str:
    """Generates a password satisfying all security rules."""
    uppers = "ABCDEFGHJKLMNPQRSTUVWXYZ"
    lowers = "abcdefghijkmnopqrstuvwxyz"
    digits = "23456789"
    specials = "!@#$%^&*"
    
    # Ensure at least one of each required type
    pass_chars = [
        random.choice(uppers),
        random.choice(lowers),
        random.choice(digits),
        random.choice(specials)
    ]
    
    all_chars = uppers + lowers + digits + specials
    for _ in range(length - 4):
        pass_chars.append(random.choice(all_chars))
        
    random.shuffle(pass_chars)
    return "".join(pass_chars)


def compute_attendance_status(punch_in_time_str: str, date_str: str, rule: AttendanceRule) -> tuple:
    """
    Determines status: 'on_time', 'in_buffer', 'late', 'half_day', 'on_leave', 'absent'
    Returns (status_string, requires_late_reason_boolean)
    """
    if not punch_in_time_str:
        return 'absent', False
        
    # Check if holiday
    holiday = Holiday.query.filter_by(date=date_str).first()
    if holiday:
        return 'on_leave', False

    # Convert times
    try:
        in_hour, in_minute, *rest = map(int, punch_in_time_str.split(':'))
        punch_time = time(in_hour, in_minute)
        
        ideal_h, ideal_m = map(int, rule.ideal_punch_in_time.split(':'))
        ideal_time = time(ideal_h, ideal_m)
        
        # Buffer end time
        total_ideal_minutes = ideal_h * 60 + ideal_m
        buffer_end_minutes = total_ideal_minutes + rule.buffer_minutes_in
        buffer_end_h = buffer_end_minutes // 60
        buffer_end_m = buffer_end_minutes % 60
        buffer_end_time = time(buffer_end_h, buffer_end_m)
        
        # Half day threshold
        half_h, half_m = map(int, (rule.half_day_threshold_in or '12:00').split(':'))
        half_day_time = time(half_h, half_m)
        
        if punch_time <= ideal_time:
            return 'on_time', False
        elif punch_time <= buffer_end_time:
            return 'in_buffer', False
        elif punch_time <= half_day_time:
            return 'late', True
        else:
            return 'half_day', True
    except Exception as e:
        return 'on_time', False


def log_audit(actor_id: str, actor_name: str, action: str, target_type: str, target_id: str = None):
    """Creates an entry in audit_logs."""
    try:
        log = AuditLog(
            actor_id=actor_id,
            actor_name=actor_name,
            action=action,
            target_type=target_type,
            target_id=target_id
        )
        db.session.add(log)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Audit log error: {e}")
