/**
 * Employee Attendance Calendar & History Screen
 * Recreates frontend/src/pages/Employee/AttendanceHistory.jsx
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Colors from '../../constants/Colors';
import Header from '../../components/Header';
import AttendanceCalendar from '../../components/AttendanceCalendar';

export default function AttendanceScreen() {
  return (
    <View style={styles.container}>
      <Header title="Attendance Calendar" subtitle="Monthly records & attendance matrix" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AttendanceCalendar />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 12,
    paddingBottom: 40,
  },
});
