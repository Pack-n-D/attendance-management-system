/**
 * Create Employee Screen
 * Recreates frontend/src/pages/Admin/CreateEmployee.jsx
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../../constants/Colors';
import Card from '../../../components/Card';
import Header from '../../../components/Header';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import CameraModal from '../../../components/CameraModal';
import WelcomeCardModal from '../../../components/WelcomeCardModal';
import { adminService } from '../../../services/adminService';
import Config from '../../../constants/Config';
import { Employee } from '../../../types';

export default function CreateEmployeeScreen() {
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [dateOfJoining, setDateOfJoining] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('Client Servicing');
  const [employmentType, setEmploymentType] = useState('Full-time');
  const [baseSalary, setBaseSalary] = useState('25000');
  const [reportingManagerId, setReportingManagerId] = useState<string>('');

  // Balances
  const [casualLeaveBalance, setCasualLeaveBalance] = useState('12');
  const [sickLeaveBalance, setSickLeaveBalance] = useState('12');
  const [paidLeaveBalance, setPaidLeaveBalance] = useState('15');

  // Photo
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  // ID Preview
  const [previewId, setPreviewId] = useState('JO-DO-99-0001');

  // Existing managers list
  const [managers, setManagers] = useState<Employee[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Welcome modal
  const [welcomeCardData, setWelcomeCardData] = useState<any | null>(null);

  useEffect(() => {
    adminService.getEmployees().then((res: { employees: Employee[] }) => {
      setManagers(res.employees);
    });
  }, []);

  // Update preview ID on name/DOB change
  useEffect(() => {
    if (firstName.trim() && lastName.trim()) {
      adminService
        .generateEmployeeId(firstName.trim(), lastName.trim(), dob.trim())
        .then((res: { employeeId: string }) => setPreviewId(res.employeeId))
        .catch(() => {});
    }
  }, [firstName, lastName, dob]);

  const handleSubmit = async () => {
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !phone.trim() ||
      !email.trim() ||
      !dob.trim() ||
      !dateOfJoining.trim() ||
      !designation.trim() ||
      !department.trim()
    ) {
      Alert.alert('Required Fields', 'Please fill in all mandatory employee profile fields.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        dob: dob.trim(),
        dateOfJoining: dateOfJoining.trim(),
        designation: designation.trim(),
        department: department.trim(),
        employmentType,
        baseSalary: parseFloat(baseSalary) || 0,
        reportingManagerId: reportingManagerId || undefined,
        casualLeaveBalance: parseFloat(casualLeaveBalance) || 12,
        sickLeaveBalance: parseFloat(sickLeaveBalance) || 12,
        paidLeaveBalance: parseFloat(paidLeaveBalance) || 15,
        profilePhoto: photoBase64,
      };

      const res = await adminService.createEmployee(payload);
      setWelcomeCardData(res.welcomeCard);
    } catch (err: any) {
      Alert.alert('Creation Failed', err.message || 'Unable to create employee record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDone = () => {
    setWelcomeCardData(null);
    router.replace('/(admin)/employees');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <Header title="New Employee" showBack={true} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Live ID Preview Banner */}
        <Card style={styles.idPreviewCard} elevated>
          <Text style={styles.idPreviewLabel}>AUTOMATICALLY GENERATED EMPLOYEE ID</Text>
          <Text style={styles.idPreviewValue}>{previewId}</Text>
          <Text style={styles.idPreviewSub}>
            Standardized APC Code generated from name and year of birth
          </Text>
        </Card>

        {/* Profile Photo Capture */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>PROFILE PHOTO</Text>
          <View style={styles.photoContainer}>
            {photoBase64 ? (
              <Image source={{ uri: photoBase64 }} style={styles.avatarPreview} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person-outline" size={32} color={Colors.textSecondary} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Button
                title={photoBase64 ? 'Change Photo' : 'Capture Photo'}
                onPress={() => setShowCamera(true)}
                variant="outline"
                size="small"
                icon={<Ionicons name="camera-outline" size={16} color={Colors.primaryDark} />}
                style={{ alignSelf: 'flex-start' }}
              />
              <Text style={styles.photoHint}>Used for attendance facial validation.</Text>
            </View>
          </View>
        </Card>

        {/* Basic Information */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>PERSONAL DETAILS</Text>
          <Input
            label="First Name"
            placeholder="e.g. Rahul"
            value={firstName}
            onChangeText={setFirstName}
            required
          />
          <Input
            label="Last Name"
            placeholder="e.g. Sharma"
            value={lastName}
            onChangeText={setLastName}
            required
          />
          <Input
            label="Email Address"
            placeholder="e.g. rahul@apc.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            required
          />
          <Input
            label="Phone Number"
            placeholder="e.g. +91 9876543210"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            required
          />
          <Input
            label="Date of Birth"
            placeholder="YYYY-MM-DD (e.g. 1998-05-15)"
            value={dob}
            onChangeText={setDob}
            required
          />
        </Card>

        {/* Professional Details */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>JOB & ORGANIZATION</Text>
          <Input
            label="Designation / Role"
            placeholder="e.g. Product Specialist"
            value={designation}
            onChangeText={setDesignation}
            required
          />

          <Text style={styles.label}>Department *</Text>
          <View style={styles.chipsRow}>
            {Config.departments.map((dept: string) => (
              <TouchableOpacity
                key={dept}
                style={[styles.chip, department === dept && styles.chipActive]}
                onPress={() => setDepartment(dept)}
              >
                <Text style={[styles.chipText, department === dept && styles.chipTextActive]}>
                  {dept}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="Date of Joining"
            placeholder="YYYY-MM-DD"
            value={dateOfJoining}
            onChangeText={setDateOfJoining}
            required
          />

          <Text style={styles.label}>Reporting Manager</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            <TouchableOpacity
              style={[styles.chip, reportingManagerId === '' && styles.chipActive]}
              onPress={() => setReportingManagerId('')}
            >
              <Text style={[styles.chipText, reportingManagerId === '' && styles.chipTextActive]}>
                None (Reports to Super Admin)
              </Text>
            </TouchableOpacity>
            {managers.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[styles.chip, reportingManagerId === m.id && styles.chipActive]}
                onPress={() => setReportingManagerId(m.id)}
              >
                <Text style={[styles.chipText, reportingManagerId === m.id && styles.chipTextActive]}>
                  {m.fullName || `${m.firstName} ${m.lastName}`} ({m.designation})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Input
            label="Monthly Base Salary (₹)"
            placeholder="e.g. 35000"
            value={baseSalary}
            onChangeText={setBaseSalary}
            keyboardType="numeric"
          />
        </Card>

        {/* Initial Leave Balances */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>INITIAL LEAVE BALANCES (DAYS)</Text>
          <View style={styles.balanceInputsRow}>
            <View style={{ flex: 1 }}>
              <Input
                label="Casual"
                value={casualLeaveBalance}
                onChangeText={setCasualLeaveBalance}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Sick"
                value={sickLeaveBalance}
                onChangeText={setSickLeaveBalance}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Paid"
                value={paidLeaveBalance}
                onChangeText={setPaidLeaveBalance}
                keyboardType="numeric"
              />
            </View>
          </View>
        </Card>

        <Button
          title="Create Employee & Generate Credentials"
          onPress={handleSubmit}
          loading={submitting}
          variant="primary"
          size="large"
          style={{ marginTop: 8 }}
        />
      </ScrollView>

      {/* Camera Modal */}
      <CameraModal
        visible={showCamera}
        onClose={() => setShowCamera(false)}
        onPhotoCaptured={(b64: string) => setPhotoBase64(b64)}
        title="Capture Employee Photo"
        subtitle="Take a photo for official employee records."
        preferFrontCamera={true}
      />

      {/* Welcome Card Modal */}
      <WelcomeCardModal
        visible={!!welcomeCardData}
        onClose={handleDone}
        employeeData={welcomeCardData}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  idPreviewCard: {
    backgroundColor: Colors.primaryTint,
    borderColor: Colors.primary,
    padding: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  idPreviewLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#3B332B',
    letterSpacing: 0.8,
  },
  idPreviewValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1A1612',
    marginVertical: 4,
    letterSpacing: 1.5,
  },
  idPreviewSub: {
    fontSize: 11,
    color: '#52473D',
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionCard: {
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  photoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarPreview: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoHint: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  chipActive: {
    backgroundColor: Colors.primaryTint,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: '#1A1612',
    fontWeight: '800',
  },
  balanceInputsRow: {
    flexDirection: 'row',
    gap: 10,
  },
});
