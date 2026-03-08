import { getSampleVitals, getSampleMoodLogs } from '../../utils/sampleDataGenerator';

describe('Sample data matches current generator output', () => {
  describe('Vitals ranges', () => {
    const vitals = getSampleVitals();

    it('should generate 3 days of vitals (7 types × 3 days = 21 entries)', () => {
      expect(vitals.length).toBe(21);
    });

    it('systolic BP values should be present and numeric', () => {
      const systolic = vitals.filter((v: any) => v.type === 'systolic');
      expect(systolic.length).toBe(3);
      for (const v of systolic) {
        expect((v as any).value).toBeGreaterThanOrEqual(120);
        expect((v as any).value).toBeLessThanOrEqual(160);
      }
    });

    it('diastolic BP values should be present and numeric', () => {
      const diastolic = vitals.filter((v: any) => v.type === 'diastolic');
      expect(diastolic.length).toBe(3);
      for (const v of diastolic) {
        expect((v as any).value).toBeGreaterThanOrEqual(80);
        expect((v as any).value).toBeLessThanOrEqual(100);
      }
    });

    it('heart rate values should be present and numeric', () => {
      const hr = vitals.filter((v: any) => v.type === 'heartRate');
      expect(hr.length).toBe(3);
      for (const v of hr) {
        expect((v as any).value).toBeGreaterThanOrEqual(70);
        expect((v as any).value).toBeLessThanOrEqual(110);
      }
    });

    it('weight values should be present', () => {
      const weight = vitals.filter((v: any) => v.type === 'weight');
      expect(weight.length).toBe(3);
      for (const v of weight) {
        expect((v as any).value).toBeGreaterThanOrEqual(190);
        expect((v as any).value).toBeLessThanOrEqual(200);
      }
    });

    it('glucose values should be present', () => {
      const glucose = vitals.filter((v: any) => v.type === 'glucose');
      expect(glucose.length).toBe(3);
      for (const v of glucose) {
        expect((v as any).value).toBeGreaterThanOrEqual(100);
        expect((v as any).value).toBeLessThanOrEqual(300);
      }
    });
  });

  describe('Mood logs', () => {
    const moods = getSampleMoodLogs();

    it('should generate mood entries', () => {
      expect(moods.length).toBe(5);
    });

    it('each mood log should have mood and timestamp', () => {
      for (const m of moods) {
        expect((m as any).mood).toBeDefined();
        expect(typeof (m as any).mood).toBe('string');
        expect((m as any).timestamp).toBeDefined();
      }
    });

    it('each mood log should have a note', () => {
      for (const m of moods) {
        expect((m as any).note).toBeDefined();
        expect(typeof (m as any).note).toBe('string');
      }
    });
  });
});
