import { fmtArea } from './formatArea';

describe('fmtArea', () => {
  it('คืน — เมื่อ null/undefined/NaN', () => {
    expect(fmtArea(null)).toBe('—');
    expect(fmtArea(undefined)).toBe('—');
    expect(fmtArea('abc')).toBe('—');
  });

  it('< 1 km² → ทศนิยม 2 ตำแหน่ง', () => {
    expect(fmtArea(0.5)).toBe('0.50');
    expect(fmtArea(0.123)).toBe('0.12');
  });

  it('1–99 km² → ทศนิยม 1 ตำแหน่ง', () => {
    expect(fmtArea(12.34)).toBe('12.3');
    expect(fmtArea(1)).toBe('1');
  });

  it('>= 100 km² → จำนวนเต็ม + คั่นหลักพัน', () => {
    expect(fmtArea(1234.6)).toBe('1,235');
    expect(fmtArea(100)).toBe('100');
  });

  it('รับ string ตัวเลขได้', () => {
    expect(fmtArea('42.7')).toBe('42.7');
  });
});
