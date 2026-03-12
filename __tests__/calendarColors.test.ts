import { getHeatColor, getHeatBorder, CAT_COLORS } from '../utils/calendarColors';

describe('calendarColors', () => {
  it('getHeatColor(95) returns a green-ish rgba string', () => {
    const color = getHeatColor(95);
    expect(color).toContain('rgba');
    expect(color).toContain('185,129');
  });

  it('getHeatColor(45) returns an amber-ish rgba string', () => {
    const color = getHeatColor(45);
    expect(color).toContain('rgba');
    expect(color).toContain('245,158');
  });

  it('getHeatColor(undefined) returns transparent', () => {
    expect(getHeatColor(undefined)).toBe('transparent');
  });

  it('getHeatBorder returns green border for high pct', () => {
    const border = getHeatBorder(95, '#000');
    expect(border).toContain('185,129');
  });

  it('getHeatBorder returns fallback for undefined pct', () => {
    expect(getHeatBorder(undefined, '#fallback')).toBe('#fallback');
  });

  it('CAT_COLORS has expected keys', () => {
    expect(CAT_COLORS.meds).toBeDefined();
    expect(CAT_COLORS.vitals).toBeDefined();
    expect(CAT_COLORS.meals).toBeDefined();
    expect(CAT_COLORS.wellness).toBeDefined();
    expect(CAT_COLORS.appt).toBeDefined();
  });
});
