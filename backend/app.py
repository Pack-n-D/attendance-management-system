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

    # Serve static uploaded files
    @app.route('/uploads/<path:filename>')
    def uploaded_file(filename):
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

    @app.route('/', methods=['GET'])
    def root_info():
        return jsonify({
            'message': 'APC Attendance Platform Flask Backend API is running.',
            'health_check': '/api/health',
            'frontend_url': 'http://localhost:5173'
        }), 200

    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({'status': 'online', 'service': 'APC Attendance API', 'version': '1.0'}), 200

    return app

app = create_app()

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    print("APC Attendance Backend running on http://127.0.0.1:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
