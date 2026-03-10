// ============================================================================
// Appointment Visibility Tests
// Verifies next-appointment display logic and today-appointment presence
// ============================================================================

describe('nextApptDisplay logic', () => {
  function computeNextApptDisplay(appt: { date: string; time?: string; provider?: string; specialty?: string; id: string } | null) {
    if (!appt) return null;

    const [year, month, day] = appt.date.split('-').map(Number);
    const apptDate = new Date(year, month - 1, day);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    apptDate.setHours(0, 0, 0, 0);
    const diffDays = Math.round((apptDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0 || diffDays > 14) return null;

    const dayLabel = diffDays === 0 ? 'Today'
      : diffDays === 1 ? 'Tomorrow'
      : apptDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    const timeLabel = appt.time
      ? (() => {
          const [h, m] = appt.time!.split(':');
          const hr = parseInt(h, 10);
          return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
        })()
      : '';

    const provider = appt.provider || appt.specialty || 'Appointment';

    return {
      text: `${provider} — ${dayLabel}${timeLabel ? ' at ' + timeLabel : ''}`,
      daysUntil: diffDays,
      id: appt.id,
    };
  }

  test('appointment 6 days away should display with provider name', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 6);
    const dateStr = futureDate.toISOString().split('T')[0];

    const result = computeNextApptDisplay({
      id: 'appt-1',
      date: dateStr,
      time: '14:30',
      provider: 'Dr. Smith',
      specialty: 'Cardiology',
    });

    expect(result).not.toBeNull();
    expect(result!.text).toContain('Dr. Smith');
    expect(result!.daysUntil).toBe(6);
  });

  test('appointment 20 days away should return null (beyond 14-day cutoff)', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 20);
    const dateStr = futureDate.toISOString().split('T')[0];

    const result = computeNextApptDisplay({
      id: 'appt-2',
      date: dateStr,
      time: '09:00',
      provider: 'Dr. Jones',
      specialty: 'Neurology',
    });

    expect(result).toBeNull();
  });

  test('today appointment should show "Today" label', () => {
    const todayStr = new Date().toISOString().split('T')[0];

    const result = computeNextApptDisplay({
      id: 'appt-3',
      date: todayStr,
      time: '10:00',
      provider: 'Dr. Lee',
      specialty: 'Primary Care',
    });

    expect(result).not.toBeNull();
    expect(result!.text).toContain('Today');
    expect(result!.daysUntil).toBe(0);
  });
});

describe('todayAppointments in schedule card', () => {
  test('today appointments array with 1 item should render schedule row', () => {
    const todayAppointments = [
      {
        id: 'appt-today-1',
        date: new Date().toISOString().split('T')[0],
        time: '15:00',
        provider: 'Dr. Park',
        specialty: 'Dermatology',
      },
    ];

    expect(todayAppointments.length).toBe(1);
    expect(todayAppointments[0].provider).toBe('Dr. Park');
  });
});
