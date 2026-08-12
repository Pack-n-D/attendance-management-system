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


def compute_attendance_status(punch_in_time_str: str, date_str: str, rule: AttendanceRule, shift_type: str = 'full_day') -> tuple:
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
        
        # Second Half shift calculation
        if shift_type == 'second_half':
            second_start = getattr(rule, 'second_half_start_time', '13:00') or '13:00'
            sh_h, sh_m = map(int, second_start.split(':'))
            
            # Buffer for second half punch in
            total_sh_minutes = sh_h * 60 + sh_m
            buf = getattr(rule, 'buffer_minutes_in', 15) or 15
            sh_buffer_end_minutes = total_sh_minutes + buf
            sh_buffer_end_h = sh_buffer_end_minutes // 60
            sh_buffer_end_m = sh_buffer_end_minutes % 60
            sh_buffer_end_time = time(sh_buffer_end_h % 24, sh_buffer_end_m)
            
            if punch_time <= sh_buffer_end_time:
                # Punching in around 1:00 PM for second half is NOT marked late, it is half_day without requiring late reason
                return 'half_day', False
            else:
                # Punching in after 1:00 PM buffer requires a late reason
                return 'half_day', True

        # Full Day shift calculation
        ideal_in = getattr(rule, 'ideal_punch_in_time', '10:00') or '10:00'
        ideal_h, ideal_m = map(int, ideal_in.split(':'))
        ideal_time = time(ideal_h, ideal_m)
        
        # Buffer end time
        buf = getattr(rule, 'buffer_minutes_in', 15) or 15
        total_ideal_minutes = ideal_h * 60 + ideal_m
        buffer_end_minutes = total_ideal_minutes + buf
        buffer_end_h = buffer_end_minutes // 60
        buffer_end_m = buffer_end_minutes % 60
        buffer_end_time = time(buffer_end_h % 24, buffer_end_m)
        
        # Half day threshold for full day punch-in
        half_in = getattr(rule, 'half_day_threshold_in', '12:00') or '12:00'
        half_h, half_m = map(int, half_in.split(':'))
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


def is_holiday_or_weekly_off(date_str: str) -> tuple:
    """
    Checks if date_str (YYYY-MM-DD) is a Holiday or a Weekly Off.
    Returns (is_off: bool, reason_str: str)
    """
    try:
        holiday = Holiday.query.filter_by(date=date_str).first()
        if holiday:
            return True, f"Holiday: {holiday.label}"

        dt = datetime.strptime(date_str, '%Y-%m-%d')
        weekday_name = dt.strftime('%A')
        
        rule = AttendanceRule.query.order_by(AttendanceRule.id.desc()).first()
        if rule and rule.weekly_offs:
            weekly_offs_list = [w.strip() for w in rule.weekly_offs.split(',')]
            if weekday_name in weekly_offs_list:
                return True, f"Weekly Off ({weekday_name})"

        return False, ""
    except Exception:
        return False, ""


def calculate_monthly_salary_slip(employee, month_str: str) -> dict:
    """
    Computes detailed salary slip metrics for employee for month_str 'YYYY-MM'.
    """
    import calendar
    from models import AttendanceRecord

    try:
        year, month = map(int, month_str.split('-'))
    except Exception:
        now = get_current_now()
        year, month = now.year, now.month
        month_str = f"{year:04d}-{month:02d}"

    days_in_month = calendar.monthrange(year, month)[1]
    start_date_str = f"{month_str}-01"
    end_date_str = f"{month_str}-{days_in_month:02d}"

    rule = AttendanceRule.query.order_by(AttendanceRule.id.desc()).first()

    # Standard shift duration in hours
    try:
        ideal_in = datetime.strptime(rule.ideal_punch_in_time, '%H:%M') if rule else datetime.strptime('09:30', '%H:%M')
        ideal_out = datetime.strptime(rule.ideal_punch_out_time, '%H:%M') if rule else datetime.strptime('18:30', '%H:%M')
        shift_duration_hours = (ideal_out - ideal_in).seconds / 3600.0
    except Exception:
        shift_duration_hours = 9.0

    # Count total working days in month
    working_days = 0
    holidays_count = 0
    weekly_offs_count = 0

    for day in range(1, days_in_month + 1):
        d_str = f"{month_str}-{day:02d}"
        is_off, reason = is_holiday_or_weekly_off(d_str)
        if "Weekly Off" in reason:
            weekly_offs_count += 1
        elif "Holiday" in reason:
            holidays_count += 1
        else:
            working_days += 1

    if working_days <= 0:
        working_days = max(1, days_in_month - weekly_offs_count)

    # Fetch employee's attendance records for the month
    records = AttendanceRecord.query.filter(
        AttendanceRecord.employee_id == employee.id,
        AttendanceRecord.date >= start_date_str,
        AttendanceRecord.date <= end_date_str
    ).all()

    on_time_count = 0
    half_day_count = 0
    on_leave_count = 0
    absent_count = 0
    overtime_hours = 0.0

    for r in records:
        if r.status in ['on_time', 'in_buffer', 'late']:
            on_time_count += 1
        elif r.status == 'half_day':
            half_day_count += 1
        elif r.status == 'on_leave':
            on_leave_count += 1
        elif r.status == 'absent':
            absent_count += 1

        if r.punch_in_time and r.punch_out_time:
            try:
                t1 = datetime.strptime(r.punch_in_time, '%H:%M:%S') if len(r.punch_in_time) == 8 else datetime.strptime(r.punch_in_time, '%H:%M')
                t2 = datetime.strptime(r.punch_out_time, '%H:%M:%S') if len(r.punch_out_time) == 8 else datetime.strptime(r.punch_out_time, '%H:%M')
                worked_hrs = (t2 - t1).seconds / 3600.0
                if worked_hrs > shift_duration_hours:
                    overtime_hours += (worked_hrs - shift_duration_hours)
            except Exception:
                pass

    base_salary = getattr(employee, 'base_salary', 0.0) or 0.0
    present_days = on_time_count + (0.5 * half_day_count)
    paid_leaves = on_leave_count

    per_day_rate = base_salary / working_days if working_days > 0 else 0.0
    hourly_rate = per_day_rate / 8.0 if per_day_rate > 0 else 0.0
    overtime_rate = hourly_rate * 1.5
    overtime_pay = overtime_hours * overtime_rate

    total_covered_days = present_days + paid_leaves
    unpaid_absent_days = max(0.0, working_days - total_covered_days)
    unpaid_deductions = unpaid_absent_days * per_day_rate

    gross_salary = base_salary + overtime_pay
    net_salary = max(0.0, gross_salary - unpaid_deductions)

    return {
        'month': month_str,
        'baseSalary': round(base_salary, 2),
        'workingDays': working_days,
        'daysInMonth': days_in_month,
        'weeklyOffsCount': weekly_offs_count,
        'holidaysCount': holidays_count,
        'presentDays': present_days,
        'halfDays': half_day_count,
        'absentDays': absent_count,
        'paidLeaves': paid_leaves,
        'unpaidAbsentDays': round(unpaid_absent_days, 1),
        'overtimeHours': round(overtime_hours, 2),
        'overtimePay': round(overtime_pay, 2),
        'perDayRate': round(per_day_rate, 2),
        'unpaidDeductions': round(unpaid_deductions, 2),
        'grossSalary': round(gross_salary, 2),
        'netSalary': round(net_salary, 2)
    }


