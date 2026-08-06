import os
from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import Config, UPLOAD_FOLDER
from models import db

from routes.auth import auth_bp
from routes.admin import admin_bp
from routes.employee import employee_bp
from routes.attendance import attendance_bp
from routes.settings import settings_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable CORS for frontend client
    CORS(app, resources={r"/*": {"origins": "*"}})

    @app.after_request
    def add_cors_headers(response):
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        return response

    # Ensure upload folder exists
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

    # Initialize extensions
    db.init_app(app)
    JWTManager(app)

    # Register API Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(employee_bp)
    app.register_blueprint(attendance_bp)
    app.register_blueprint(settings_bp)

    # Ensure database tables and initial Super Admin exist on startup
    with app.app_context():
        try:
            db.create_all()
            from models import Employee, AttendanceRule
            from werkzeug.security import generate_password_hash

            # Guarantee Super Admin exists and password hash is set to Admin@123
            admin = Employee.query.filter((Employee.id == 'SUPERADMIN01') | (Employee.email == 'admin@apc.com')).first()
            if not admin:
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
                    created_by='Auto Init'
                )
                db.session.add(admin)
            else:
                admin.password_hash = generate_password_hash('Admin@123')
                admin.status = 'active'
                admin.role = 'super_admin'
                admin.must_change_password = False
            
            db.session.commit()

            # Seed Karan Muntode (Reporting Manager) if not present
            karan = Employee.query.filter_by(email='karan@apc.com').first()
            if not karan:
                karan = Employee(
                    id='KA-MU-95-0001',
                    first_name='Karan',
                    last_name='Muntode',
                    phone='+91 9876543210',
                    email='karan@apc.com',
                    dob='1995-05-12',
                    date_of_joining='2022-01-15',
                    designation='Team Manager / Lead',
                    department='Client Servicing',
                    employment_type='Full-time',
                    role='employee',
                    status='active',
                    password_hash=generate_password_hash('Password@123'),
                    must_change_password=False,
                    created_by='Auto Init'
                )
                db.session.add(karan)
                db.session.commit()

            # Seed Shivnath Gosavi (Employee reporting to Karan Muntode) if not present
            shivnath = Employee.query.filter_by(email='shivnath@apc.com').first()
            if not shivnath:
                shivnath = Employee(
                    id='SH-GO-98-0001',
                    first_name='Shivnath',
                    last_name='Gosavi',
                    phone='+91 9876543211',
                    email='shivnath@apc.com',
                    dob='1998-08-20',
                    date_of_joining='2023-03-10',
                    designation='Product Specialist',
                    department='Client Servicing',
                    employment_type='Full-time',
                    reporting_manager_id=karan.id if karan else 'KA-MU-95-0001',
                    role='employee',
                    status='active',
                    password_hash=generate_password_hash('Password@123'),
                    must_change_password=False,
                    created_by='Auto Init'
                )
                db.session.add(shivnath)
                db.session.commit()

            if not AttendanceRule.query.first():
                rule = AttendanceRule(
                    ideal_punch_in_time='09:30',
                    ideal_punch_out_time='18:30',
                    buffer_minutes_in=15,
                    buffer_minutes_out=15,
                    weekly_offs='Saturday,Sunday',
                    half_day_threshold_in='12:00'
                )
                db.session.add(rule)
                db.session.commit()
        except Exception as e:
            db.session.rollback()
            print(f"Auto-init warning: {e}")

    # Static upload serving & root health check

    # Serve static uploaded files
    @app.route('/uploads/<path:filename>')
    def uploaded_file(filename):
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

    @app.route('/', methods=['GET'])
    def root_info():
        return jsonify({
            'message': 'APC Attendance Platform Flask Backend API is running.',
            'health_check': '/api/health',
            'frontend_url': 'https://pack-n-d.github.io/attendance-management-system/'
        }), 200

    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({'status': 'online', 'service': 'APC Attendance API', 'version': '1.0'}), 200

    return app

app = create_app()

if __name__ == '__main__':
    print("APC Attendance Backend running on http://127.0.0.1:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
