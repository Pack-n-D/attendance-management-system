import React from 'react';

const STATUS_LABELS = {
  on_time: 'On Time',
  in_buffer: 'In Buffer',
  late: 'Late',
  absent: 'Absent',
  on_leave: 'On Leave',
  half_day: 'Half Day',
  active: 'Active',
  inactive: 'Inactive',
  not_punched: 'Not Punched'
};

export default function StatusBadge({ status }) {
  const normalized = status ? String(status).toLowerCase() : 'absent';
  const label = STATUS_LABELS[normalized] || String(normalized).replace('_', ' ');

  return (
    <span className={`apc-badge apc-badge-${normalized}`}>
      <span className="apc-badge-dot"></span>
      {label}
    </span>
  );
}
