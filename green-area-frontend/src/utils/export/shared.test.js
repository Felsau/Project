import { rowsToCsv, ts } from './shared';

// html2canvas ถูก import ใน shared.js (ใช้ใน captureElement ที่เราไม่ได้เทส) — mock กัน
// side-effect · jest hoist vi.mock ขึ้นเหนือ import ให้อัตโนมัติ
vi.mock('html2canvas', () => ({ __esModule: true, default: vi.fn() }));

describe('rowsToCsv — formula-injection guard', () => {
  it('prefix \' ให้ cell ที่ขึ้นต้นด้วย = + @ (กัน CSV injection)', () => {
    expect(rowsToCsv([['=SUM(A1:A2)']])).toBe("'=SUM(A1:A2)");
    expect(rowsToCsv([['@cmd']])).toBe("'@cmd");
    // ขึ้นต้น + แต่ไม่ใช่ตัวเลขล้วน → escape
    expect(rowsToCsv([['+text']])).toBe("'+text");
  });

  it('ไม่ escape string ที่เป็นตัวเลขจริง (เช่น -1.5) — กันข้อมูลจริงเพี้ยน', () => {
    expect(rowsToCsv([['-1.5']])).toBe('-1.5');
    expect(rowsToCsv([['+0.42']])).toBe('+0.42');
    expect(rowsToCsv([['-1.2e3']])).toBe('-1.2e3');
  });

  it('number type ผ่านตรงๆ ไม่ถือเป็น formula', () => {
    expect(rowsToCsv([[-1.5]])).toBe('-1.5');
    expect(rowsToCsv([[42]])).toBe('42');
  });

  it('null/undefined → cell ว่าง', () => {
    expect(rowsToCsv([[null, undefined, 'x']])).toBe(',,x');
  });
});

describe('rowsToCsv — quoting', () => {
  it('ครอบ quote เมื่อมี comma / newline และ double quote ภายใน', () => {
    expect(rowsToCsv([['a,b']])).toBe('"a,b"');
    expect(rowsToCsv([['line1\nline2']])).toBe('"line1\nline2"');
    expect(rowsToCsv([['say "hi"']])).toBe('"say ""hi"""');
  });

  it('join row ด้วย comma และ join หลายแถวด้วย CRLF', () => {
    expect(rowsToCsv([['a', 'b'], ['c', 'd']])).toBe('a,b\r\nc,d');
  });
});

describe('ts', () => {
  it('คืนรูปแบบ YYYYMMDD_HHMM', () => {
    expect(ts()).toMatch(/^\d{8}_\d{4}$/);
  });
});
