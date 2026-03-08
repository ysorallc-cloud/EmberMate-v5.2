/**
 * Verifies that the sample data generator produces expected data shapes.
 */
import { getSampleMedications, getSampleVitals, getSampleAppointments, getSampleMoodLogs } from '../../utils/sampleDataGenerator';

describe('sampleDataGenerator produces complete profile', () => {
  it('should generate 6 medications', () => {
    const meds = getSampleMedications();
    expect(meds).toHaveLength(6);

    const names = meds.map((m: any) => m.name);
    expect(names).toContain('Warfarin');
    expect(names).toContain('Aspirin');
    expect(names).toContain('Metformin');
    expect(names).toContain('Lisinopril');
    expect(names).toContain('Gabapentin');
    expect(names).toContain('Lorazepam');
  });

  it('should generate 3 days of vitals (21 entries)', () => {
    const vitals = getSampleVitals();
    expect(vitals).toHaveLength(21);
    const systolic = vitals.filter((v: any) => v.type === 'systolic');
    expect(systolic).toHaveLength(3);
  });

  it('should generate 4 appointments', () => {
    const appts = getSampleAppointments();
    expect(appts).toHaveLength(4);
    expect((appts[0] as any).provider).toBe('Dr. Patel');
    expect((appts[0] as any).specialty).toBe('Cardiology');
  });

  it('should generate 5 mood logs', () => {
    const moods = getSampleMoodLogs();
    expect(moods).toHaveLength(5);
  });
});
