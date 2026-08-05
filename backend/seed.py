from datetime import datetime
from werkzeug.security import generate_password_hash
from app import app
from models import db, Employee, AttendanceRule, Holiday, AuditLog

def seed_database():
    with app.app_context():
        # Re-create tables cleanly
        db.drop_all()
        db.create_all()

        print("Creating default attendance rule...")
        rule = AttendanceRule(
            ideal_punch_in_time='09:30',
            ideal_punch_out_time='18:30',
            buffer_minutes_in=15,
            buffer_minutes_out=15,
            weekly_offs='Saturday,Sunday',
            half_day_threshold_in='12:00',
            effective_from=datetime.utcnow().strftime('%Y-%m-%d')
        )
        db.session.add(rule)

        print("Creating official company holidays...")
        holidays = [
            Holiday(date='2026-08-15', label='Independence Day'),
            Holiday(date='2026-10-24', label='Diwali'),
            Holiday(date='2026-12-25', label='Christmas Day')
        ]
        for h in holidays:
            db.session.add(h)

        print("Creating Super Admin account...")
        admin = Employee(
            id='SUPERADMIN01',
            first_name='APC',
            last_name='Admin',
            phone='+1 800-555-0199',
            email='admin@apc.com',
            dob='1990-01-01',
            date_of_joining='2020-01-01',
            designation='Platform Super Admin',
            department='Management',
            employment_type='Full-time',
            role='super_admin',
            status='active',
            password_hash=generate_password_hash('Admin@123'),
            must_change_password=False,
            created_by='System Seed'
        )
        db.session.add(admin)

        # Seed initial audit log
        log = AuditLog(
            actor_id='SUPERADMIN01',
            actor_name='APC Admin',
            action='System Initialized (Super Admin Created)',
            target_type='System'
        )
        db.session.add(log)

        db.session.commit()
        print("Database seeded with clean Super Admin account successfully!")

if __name__ == '__main__':
    seed_database()
