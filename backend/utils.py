import os
import base64
import re
import random
import string
from datetime import datetime, time, timezone, timedelta
from flask import current_app
from models import db, Employee, AttendanceRule, AuditLog, Holiday

# IST Timezone (+05:30) for AP Corporation operations
IST_TZ = timezone(timedelta(hours=5, minutes=30))

def get_current_now():
    """Returns current timezone-aware datetime object in IST."""
    return datetime.now(IST_TZ)

def get_current_date_str():
    """Returns current date YYYY-MM-DD in IST."""
    return get_current_now().strftime('%Y-%m-%d')

def get_current_time_str():
    """Returns current time HH:MM:SS in IST."""
    return get_current_now().strftime('%H:%M:%S')

def generate_employee_id(first_name: str, last_name: str, dob: str) -> str:
    """
    Generates a ~10-character human-parseable Employee ID:
    e.g. First Name: John, Last Name: Doe, DOB: 1999-04-15
    Prefix: JO-DO-99-XXXX
    Guarantees unique ID generation in DB.
    """
    fn = (first_name.strip()[:2] if len(first_name.strip()) >= 2 else (first_name.strip() + 'X')[:2]).upper()
    ln = (last_name.strip()[:2] if len(last_name.strip()) >= 2 else (last_name.strip() + 'X')[:2]).upper()
    
    birth_year_suffix = '00'
    if dob and len(dob) >= 4:
        birth_year_suffix = dob[:4][-2:]
        
    prefix = f"{fn}-{ln}-{birth_year_suffix}"
    
    # Loop to find next available candidate ID that does not exist in DB
    serial = 1
    while True:
        candidate_id = f"{prefix}-{serial:04d}"
        if not Employee.query.get(candidate_id):
            return candidate_id
        serial += 1


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


def save_base64_photo(base64_str, folder_name='uploads', return_data_uri=True):
    """Decodes base64 photo string, saves to disk backup, and returns persistent compressed Data URI or relative URL."""
    if not base64_str:
        return None
    try:
        raw_b64 = base64_str.split(',')[1] if ',' in base64_str else base64_str
        image_data = base64.b64decode(raw_b64)

        # Save to uploads folder as disk backup
        filename = f"{folder_name}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S_%f')}.jpg"
        filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, 'wb') as f:
            f.write(image_data)

        if return_data_uri:
            # Compress image using Pillow so DB footprint stays tiny (~25KB)
            try:
                import io
                from PIL import Image
                img = Image.open(io.BytesIO(image_data))
                img.thumbnail((300, 300))
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                buffer = io.BytesIO()
                img.save(buffer, format="JPEG", quality=80)
                compressed_b64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
                return f"data:image/jpeg;base64,{compressed_b64}"
            except Exception as pe:
                print(f"PIL compression notice: {pe}")
                if len(raw_b64) < 250000:
                    prefix = "data:image/jpeg;base64," if not base64_str.startswith('data:') else ""
                    return f"{prefix}{raw_b64}" if not base64_str.startswith('data:') else base64_str

        return f"/uploads/{filename}"
    except Exception as e:
        print(f"Error saving photo: {e}")
        return base64_str if base64_str and base64_str.startswith('data:') else None

