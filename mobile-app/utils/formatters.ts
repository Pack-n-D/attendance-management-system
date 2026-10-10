/**
 * Date, Currency, and Status Formatters
 */

export function formatDate(dateString?: string | null): string {
  if (!dateString) return '-';
  try {
    const [year, month, day] = dateString.split('-');
    if (year && month && day) {
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatTime(timeString?: string | null): string {
  if (!timeString) return '--:--';
  try {
    const parts = timeString.split(':');
    if (parts.length >= 2) {
      let hours = parseInt(parts[0], 10);
      const minutes = parts[1];
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${hours}:${minutes} ${ampm}`;
    }
    return timeString;
  } catch {
    return timeString;
  }
}

export function formatCurrency(amount?: number | null): string {
  if (amount == null || isNaN(amount)) return '₹0.00';
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function getStatusLabel(status?: string | null): string {
  if (!status) return 'Unknown';
  const clean = status.toLowerCase();
  const map: Record<string, string> = {
    on_time: 'On Time',
    in_buffer: 'In Buffer',
    late: 'Late',
    half_day: 'Half Day',
    on_leave: 'On Leave',
    absent: 'Absent',
    not_punched: 'Not Punched',
    active: 'Active',
    inactive: 'Inactive',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
    withdrawal_requested: 'Withdraw Requested',
  };
  return map[clean] || clean.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}
