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
    CORS(app, resources={r"/api/*": {"origins": "*"}, r"/uploads/*": {"origins": "*"}})

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
        db.create_all()
        from models import Employee, AttendanceRule
        from werkzeug.security import generate_password_hash
        try:
            if not Employee.query.filter_by(role='super_admin').first():
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

    @app.before_request
    def ensure_db():
        if not getattr(app, '_db_tables_created', False):
            try:
                db.create_all()
                app._db_tables_created = True
            except Exception as e:
                print(f"before_request db init error: {e}")

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
