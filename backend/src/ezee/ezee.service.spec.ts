/**
 * Rate serialisation for eZee's `baserate` field.
 *
 * eZee accepts fractional rates — verified live 2026-08-05 (hotel 60765
 * reservation 127: baserate "1.23" → folio beforeTax 1.23 / after-tax 1.29).
 * The previous Math.round() dropped the paise, which is what left coupon
 * bookings with a negative folio balance (55402 res 1647, 61766 res 187).
 */
import { EzeeService } from './ezee.service';

describe('EzeeService.formatRate', () => {
  const fmt = (n: number) => (EzeeService as any).formatRate(n);

  it('keeps paise', () => {
    expect(fmt(1.23)).toBe('1.23');
    expect(fmt(1.29)).toBe('1.29');
    expect(fmt(458.99)).toBe('458.99');
  });

  it('serialises whole rupees exactly as before — no trailing zeros', () => {
    // The non-coupon path was already reconciling to the paisa; it must not move.
    expect(fmt(459)).toBe('459');
    expect(fmt(3499)).toBe('3499');
    expect(fmt(0)).toBe('0');
  });

  it('rounds beyond two decimals rather than truncating', () => {
    expect(fmt(1.2286)).toBe('1.23');
    expect(fmt(1.0395)).toBe('1.04');
  });
});
