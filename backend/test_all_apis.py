import json
import unittest
from app import create_app
from models import db
from seed import seed_database

class APCTestSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.app.config['TESTING'] = True
        cls.client = cls.app.test_client()
        with cls.app.app_context():
            seed_database()

    def setUp(self):
        # Login as Super Admin
        res = self.client.post('/api/auth/login', json={
            'identifier': 'admin@apc.com',
            'password': 'Admin@123'
        })
        data = res.get_json()
        self.admin_token = data['token']
        self.admin_headers = {'Authorization': f"Bearer {self.admin_token}"}

        # Login as Employee
        res_emp = self.client.post('/api/auth/login', json={
            'identifier': 'JO-DO-99-0001',
            'password': 'Employee@123'
        })
        data_emp = res_emp.get_json()
        self.emp_token = data_emp['token']
        self.emp_headers = {'Authorization': f"Bearer {self.emp_token}"}

    def test_01_health_and_root(self):
        res = self.client.get('/api/health')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()['status'], 'online')

        res_root = self.client.get('/')
        self.assertEqual(res_root.status_code, 200)

    def test_02_auth_me(self):
        res = self.client.get('/api/auth/me', headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()['user']['role'], 'super_admin')

    def test_03_admin_dashboard(self):
        res = self.client.get('/api/admin/dashboard', headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn('stats', data)
        self.assertIn('lateArrivalsToday', data)
        self.assertIn('trendChart', data)

    def test_04_generate_employee_id(self):
        res = self.client.post('/api/admin/employees/generate-id', json={
            'firstName': 'Michael',
            'lastName': 'Scott',
            'dob': '1985-03-15'
        }, headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        emp_id = res.get_json()['employeeId']
        self.assertTrue(emp_id.startswith('MI-SC-85-'))

    def test_05_create_and_get_employee(self):
        res = self.client.post('/api/admin/employees', json={
            'firstName': 'Michael',
            'lastName': 'Scott',
            'email': 'michael.scott@apc.com',
            'phone': '+1 555-9988',
            'dob': '1985-03-15',
            'dateOfJoining': '2026-01-01',
            'designation': 'Regional Manager',
            'department': 'Management',
            'employmentType': 'Full-time',
            'mustChangePassword': True
        }, headers=self.admin_headers)
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertIn('welcomeCard', data)
        created_id = data['employee']['id']

        # Get employee profile
        res_get = self.client.get(f'/api/admin/employees/{created_id}', headers=self.admin_headers)
        self.assertEqual(res_get.status_code, 200)

        # Edit employee
        res_put = self.client.put(f'/api/admin/employees/{created_id}', json={
            'designation': 'Senior Regional Manager'
        }, headers=self.admin_headers)
        self.assertEqual(res_put.status_code, 200)

        # Reset password
        res_reset = self.client.post(f'/api/admin/employees/{created_id}/reset-password', headers=self.admin_headers)
        self.assertEqual(res_reset.status_code, 200)

    def test_06_attendance_punch_in_and_out(self):
        # Get today status
        res_status = self.client.get('/api/attendance/today-status', headers=self.emp_headers)
        self.assertEqual(res_status.status_code, 200)

        # Punch In
        res_in = self.client.post('/api/attendance/punch-in', json={
            'photo': 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD',
            'lateReason': 'Traffic delay on main bridge'
        }, headers=self.emp_headers)
        self.assertIn(res_in.status_code, [200, 400])  # 400 if already punched in during seed

        # Punch Out
        res_out = self.client.post('/api/attendance/punch-out', json={
            'photo': 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD'
        }, headers=self.emp_headers)
        self.assertIn(res_out.status_code, [200, 400])

    def test_07_attendance_logs_and_csv_export(self):
        res_log = self.client.get('/api/attendance/log', headers=self.admin_headers)
        self.assertEqual(res_log.status_code, 200)
        self.assertIn('records', res_log.get_json())

        # Test CSV export using query string token
        res_csv = self.client.get(f'/api/attendance/export/csv?token={self.admin_token}')
        self.assertEqual(res_csv.status_code, 200)
        self.assertEqual(res_csv.mimetype, 'text/csv')

    def test_08_attendance_rules_and_holidays(self):
        # Get rules
        res_r = self.client.get('/api/settings/attendance-rules', headers=self.admin_headers)
        self.assertEqual(res_r.status_code, 200)

        # Update rules
        res_up = self.client.post('/api/settings/attendance-rules', json={
            'idealPunchInTime': '09:00',
            'idealPunchOutTime': '18:00',
            'bufferMinutesIn': 20,
            'bufferMinutesOut': 20,
            'weeklyOffs': ['Saturday', 'Sunday']
        }, headers=self.admin_headers)
        self.assertEqual(res_up.status_code, 200)

        # Add Holiday
        res_h = self.client.post('/api/settings/holidays', json={
            'date': '2026-11-26',
            'label': 'Thanksgiving Holiday'
        }, headers=self.admin_headers)
        self.assertEqual(res_h.status_code, 201)
        h_id = res_h.get_json()['holiday']['id']

        # Delete Holiday
        res_del = self.client.delete(f'/api/settings/holidays/{h_id}', headers=self.admin_headers)
        self.assertEqual(res_del.status_code, 200)

    def test_09_employee_profile_and_history(self):
        res_p = self.client.get('/api/employee/profile', headers=self.emp_headers)
        self.assertEqual(res_p.status_code, 200)

        res_h = self.client.get('/api/employee/attendance-history', headers=self.emp_headers)
        self.assertEqual(res_h.status_code, 200)

        res_req = self.client.post('/api/employee/request-update', json={
            'field': 'Phone Number',
            'requestedValue': '+1 555-7777',
            'reason': 'Updated mobile line'
        }, headers=self.emp_headers)
        self.assertEqual(res_req.status_code, 200)

    def test_10_audit_log(self):
        res = self.client.get('/api/admin/audit-log', headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        self.assertIn('auditLogs', res.get_json())

    def test_11_leave_workflow_and_manager_approval(self):
        # 1. Login as Shivnath Gosavi
        res_shiv = self.client.post('/api/auth/login', json={
            'identifier': 'shivnath@apc.com',
            'password': 'Password@123'
        })
        self.assertEqual(res_shiv.status_code, 200)
        shiv_token = res_shiv.get_json()['token']
        shiv_headers = {'Authorization': f"Bearer {shiv_token}"}

        # 2. Shivnath applies for 2-day leave
        res_apply = self.client.post('/api/employee/leave-requests', json={
            'startDate': '2026-08-10',
            'endDate': '2026-08-11',
            'leaveType': 'Paid Leave',
            'reason': 'Family Event'
        }, headers=shiv_headers)
        self.assertEqual(res_apply.status_code, 201)
        req_data = res_apply.get_json()['leaveRequest']
        self.assertEqual(req_data['status'], 'pending')
        self.assertEqual(req_data['reportingManagerId'], 'KA-MU-95-0001')
        req_id = req_data['id']

        # 3. Login as Karan Muntode (Reporting Manager)
        res_karan = self.client.post('/api/auth/login', json={
            'identifier': 'karan@apc.com',
            'password': 'Password@123'
        })
        self.assertEqual(res_karan.status_code, 200)
        karan_token = res_karan.get_json()['token']
        karan_headers = {'Authorization': f"Bearer {karan_token}"}

        # 4. Karan fetches managed leave requests
        res_managed = self.client.get('/api/employee/managed-leave-requests', headers=karan_headers)
        self.assertEqual(res_managed.status_code, 200)
        managed_list = res_managed.get_json()['leaveRequests']
        self.assertTrue(any(r['id'] == req_id for r in managed_list))

        # 5. Karan approves Shivnath's leave request
        res_review = self.client.post(f'/api/employee/leave-requests/{req_id}/review', json={
            'action': 'approve',
            'comment': 'Approved by Team Lead'
        }, headers=karan_headers)
        self.assertEqual(res_review.status_code, 200)
        self.assertEqual(res_review.get_json()['leaveRequest']['status'], 'approved')

        # 6. Shivnath requests withdrawal for the approved leave due to emergency
        res_withdraw_req = self.client.post(f'/api/employee/leave-requests/{req_id}/withdraw', json={
            'reason': 'Emergency project requirement'
        }, headers=shiv_headers)
        self.assertEqual(res_withdraw_req.status_code, 200)
        self.assertEqual(res_withdraw_req.get_json()['leaveRequest']['status'], 'withdrawal_requested')

        # 7. Karan approves Shivnath's withdrawal request
        res_withdraw_appr = self.client.post(f'/api/employee/leave-requests/{req_id}/review', json={
            'action': 'approve_withdrawal',
            'comment': 'Withdrawal approved'
        }, headers=karan_headers)
        self.assertEqual(res_withdraw_appr.status_code, 200)
        self.assertEqual(res_withdraw_appr.get_json()['leaveRequest']['status'], 'withdrawn')

if __name__ == '__main__':
    unittest.main()

