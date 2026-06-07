import { fmt, fmtInt, esc, formatEnName, arrow } from './helpers';

describe('fmt', () => {
  test('null → dash', () => expect(fmt(null)).toBe('—'));
  test('NaN → dash', () => expect(fmt(NaN)).toBe('—'));
  test('rounds to given digits', () => expect(fmt(3.14159, 2)).toBe('3.14'));
  test('defaults to 2 digits', () => expect(fmt(5)).toBe('5.00'));
});

describe('fmtInt', () => {
  test('null → dash', () => expect(fmtInt(null)).toBe('—'));
  test('groups thousands', () => expect(fmtInt(1234567)).toBe('1,234,567'));
});

describe('esc (HTML escaping — XSS defense in the PDF report)', () => {
  test('escapes angle brackets', () => expect(esc('<script>')).toBe('&lt;script&gt;'));
  test('escapes ampersand and quote', () => expect(esc('a & "b"')).toBe('a &amp; &quot;b&quot;'));
  test('null → empty string', () => expect(esc(null)).toBe(''));
  test('plain Thai text unchanged', () => expect(esc('เชียงใหม่')).toBe('เชียงใหม่'));
});

describe('formatEnName', () => {
  test('splits camelCase district names', () => expect(formatEnName('MaeChaem')).toBe('Mae Chaem'));
  test('leaves single word alone', () => expect(formatEnName('Bangkok')).toBe('Bangkok'));
  test('passes through null', () => expect(formatEnName(null)).toBe(null));
});

describe('arrow', () => {
  test('null inputs → empty', () => expect(arrow(null, 1)).toBe(''));
  test('within epsilon → equal', () => expect(arrow(1.000, 1.001)).toBe('— เท่ากัน'));
  test('increase', () => expect(arrow(0.5, 0.3)).toBe('↑ 0.200'));
  test('decrease', () => expect(arrow(0.3, 0.5)).toBe('↓ 0.200'));
});
