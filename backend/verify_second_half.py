import sys
from datetime import datetime
from app import create_app
from models import db, AttendanceRule, AttendanceRecord, Employee
from utils import compute_attendance_status

def test_second_half_logic():
    app = create_app()
    with app.app_context():
        rule = AttendanceRule.query.order_by(AttendanceRule.id.desc()).first()
        if not rule:
            rule = AttendanceRule()
            db.session.add(rule)
            db.session.commit()

        print(f"Current Rule ideal in: {rule.ideal_punch_in_time}, 2nd half start: {rule.second_half_start_time}, min out: {rule.second_half_min_punch_out}")

        # Test 0: Punch in at 09:37:53 (Sara Ambavane case) -> MUST be on_time!
        status, req = compute_attendance_status('09:37:53', '2026-09-04', rule, shift_type='full_day')
        assert status == 'on_time' and not req, f"Expected on_time at 09:37, got {status}, req={req}"
        print("✓ Test 0 Passed: Morning punch in at 09:37:53 AM marked on_time")

        # Test 0b: Even if shift_type was somehow set to second_half at 09:37 AM, morning punch MUST be on_time!
        status_sh, req_sh = compute_attendance_status('09:37:53', '2026-09-04', rule, shift_type='second_half')
        assert status_sh == 'on_time' and not req_sh, f"Expected on_time at 09:37 even with second_half flag, got {status_sh}, req={req_sh}"
        print("✓ Test 0b Passed: Morning punch in at 09:37:53 AM with second_half flag is safely resolved to on_time")

        # Test 1: Full day punch in at 10:00 (on_time)
        status, req = compute_attendance_status('10:00:00', '2026-08-12', rule, shift_type='full_day')
        assert status == 'on_time' and not req, f"Expected on_time, got {status}, req={req}"
        print("✓ Test 1 Passed: Full day on time at 10:00 AM")

        # Test 2: Full day punch in at 10:25 (late)
        status, req = compute_attendance_status('10:25:00', '2026-08-12', rule, shift_type='full_day')
        assert status == 'late' and req, f"Expected late with reason required, got {status}, req={req}"
        print("✓ Test 2 Passed: Full day late at 10:25 AM")

        # Test 3: Second half punch in at 13:00 (half_day, no late reason required)
        status, req = compute_attendance_status('13:00:00', '2026-08-12', rule, shift_type='second_half')
        assert status == 'half_day' and not req, f"Expected half_day (no reason req), got {status}, req={req}"
        print("✓ Test 3 Passed: Second half punch in at 1:00 PM marked half_day without late penalty")

        # Test 4: Second half punch in at 13:10 (within buffer, half_day no reason)
        status, req = compute_attendance_status('13:10:00', '2026-08-12', rule, shift_type='second_half')
        assert status == 'half_day' and not req, f"Expected half_day within buffer, got {status}, req={req}"
        print("✓ Test 4 Passed: Second half punch in within grace buffer")

        # Test 5: Second half punch in at 14:00 (late second half, reason required)
        status, req = compute_attendance_status('14:00:00', '2026-08-12', rule, shift_type='second_half')
        assert status == 'half_day' and req, f"Expected half_day with reason required, got {status}, req={req}"
        print("✓ Test 5 Passed: Second half punch in late at 2:00 PM requires reason")

        print("\nALL SECOND HALF ATTENDANCE LOGIC TESTS PASSED SUCCESSFULLY!")

if __name__ == '__main__':
    test_second_half_logic()
