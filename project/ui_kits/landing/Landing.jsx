// GreenLens landing page — faithful recreation of the product's public intro.
// Copy is the real product copy (Thai); structure mirrors Landing.js upstream.
const { useEffect, useRef, useState } = React;

const FEATURES = [
  ['สถิติเชิงพื้นที่',
   'NDVI · อุณหภูมิพื้นผิว (LST) รายปี/รายเดือน และพื้นที่สีเขียวต่อประชากรเทียบเกณฑ์ WHO ระดับจังหวัดลงถึงอำเภอ'],
  ['แนวโน้ม + พยากรณ์',
   'ดูการเปลี่ยนแปลงย้อนหลังหลายปี พร้อมพยากรณ์ล่วงหน้า 3 ปีด้วย OLS regression และช่วงความเชื่อมั่น 95%'],
  ['เทียบภาพดาวเทียม 2 ปี',
   'แบ่งจอซ้าย–ขวาลากเทียบ (swipe) หรือดูแผนที่ผลต่าง (Δ) ว่าจุดไหนเขียวขึ้น จุดไหนหายไป'],
  ['Cooling effect',
   'พิสูจน์ความสัมพันธ์ "ยิ่งเขียว ยิ่งเย็น" ด้วย regression ของ LST ต่อ NDVI ระดับอำเภอ'],
  ['AI แนะนำจุดปลูกต้นไม้',
   'Heatmap จัดลำดับพื้นที่ที่ควรปลูก จากการถ่วงน้ำหนักการขาดพื้นที่สีเขียว ความร้อน และความหนาแน่นประชากร พร้อมพันธุ์ไม้แนะนำรายภาค'],
  ['Time-lapse + รายงาน PDF',
   'เล่นภาพการเปลี่ยนแปลงรายปีทั้งประเทศ และส่งออกรายงานพร้อมแผนที่ กราฟ และพิกัดในคลิกเดียว'],
];

const STEPS = [
  ['เลือกพื้นที่', 'คลิกจังหวัดบนแผนที่ หรือพิมพ์ค้นหา แล้วเจาะลึกต่อถึงระดับอำเภอ'],
  ['วิเคราะห์', 'ดูสถิติ แนวโน้ม เปิดภาพดาวเทียมจริง เทียบรายปี หรือให้ AI แนะนำจุดปลูก'],
  ['นำไปใช้', 'ส่งออกรายงาน PDF / CSV หรือแชร์ลิงก์ที่จำจังหวัด อำเภอ และแท็บที่เปิดอยู่ให้อัตโนมัติ'],
];

const SHOTS = [
  ['../../assets/img/dashboard-stats.jpg',
   'หน้าจอสถิติรายจังหวัด แสดงอุณหภูมิพื้นผิวและกราฟรายเดือน',
   'สถิติรายจังหวัด — LST รายเดือน และความเสี่ยงเกาะความร้อนเมือง'],
  ['../../assets/img/dashboard-recommend.jpg',
   'หน้าจอ AI แนะนำ แสดงแผนที่ 3 มิติพร้อมรายการพันธุ์ไม้',
   'AI แนะนำ — แผนที่ 3D พร้อมพันธุ์ไม้ที่เหมาะกับแต่ละภาค'],
  ['../../assets/img/report-pdf.png',
   'ตัวอย่างรายงาน PDF แผนปลูกต้นไม้เชิงพื้นที่',
   'รายงาน PDF — แผนปลูกต้นไม้พร้อมพิกัด Top 10 ที่ควรเร่งดำเนินการ'],
];

const DATASETS = [
  ['Sentinel-2 (ESA / Copernicus)', 'ภาพถ่ายดาวเทียมรายเดือน คำนวณ NDVI ความละเอียด 10 เมตร'],
  ['Landsat 8/9 (USGS / NASA)', 'อุณหภูมิพื้นผิว (LST) ความละเอียด 30 เมตร'],
  ['WorldPop', 'ความหนาแน่นประชากร สำหรับพื้นที่สีเขียวต่อหัว'],
  ['ESA WorldCover', 'ขอบเขตเขตเมือง (urban mask)'],
  ['GADM 4.1', 'ขอบเขตการปกครอง จังหวัด/อำเภอ'],
];

const METHOD = [
  ['พื้นที่สีเขียว', 'NDVI > 0.3 (รวมพืชเกษตร) · ป่าหนาแน่น: NDVI > 0.5'],
  ['เกณฑ์ WHO', 'พื้นที่สีเขียว ≥ 9 ตร.ม./คน · Urban subset เทียบเฉพาะในเขตเมือง'],
  ['AI Recommend', 'Priority = 0.40·NDVI deficit + 0.30·LST heat + 0.30·population need'],
  ['Cooling', 'Regression ของ LST ต่อ NDVI ระดับอำเภอ (slope < 0 = ยิ่งเขียวยิ่งเย็น)'],
];

function Landing() {
  const mainRef = useRef(null);
  const [theme, setTheme] = useState('light');
  const [lightbox, setLightbox] = useState(null);
  const isDark = theme === 'dark';

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const root = mainRef.current;
    if (!root) return undefined;
    const targets = root.querySelectorAll('.reveal');
    if (typeof IntersectionObserver === 'undefined') {
      targets.forEach(el => el.classList.add('is-visible'));
      return undefined;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    targets.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!lightbox) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setLightbox(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lightbox]);

  const onEnter = () => { window.location.href = '../dashboard/index.html'; };

  return (
    <div className="landing">
      <header className="landing__bar">
        <div className="landing__brand">
          <div className="topbar__mark" aria-hidden="true"></div>
          <span>GreenLens<em>Thailand</em></span>
        </div>
        <button className="landing__bar-icon" onClick={() => setTheme(isDark ? 'light' : 'dark')}
          aria-label={isDark ? 'สลับเป็นธีมสว่าง' : 'สลับเป็นธีมมืด'}>
          {isDark ? '☀' : '☾'}
        </button>
        <button className="landing__bar-cta" onClick={onEnter}>เปิดแดชบอร์ด ›</button>
      </header>

      <main ref={mainRef}>
        <section className="landing__hero">
          <p className="landing__kicker">Sentinel-2 · Landsat 8/9 · Google Earth Engine</p>
          <h1>พื้นที่สีเขียวของประเทศไทย<br />วัดได้ เห็นได้ วางแผนได้</h1>
          <p className="landing__sub">
            แดชบอร์ดวิเคราะห์ดัชนีพืชพรรณ (NDVI) อุณหภูมิพื้นผิว (LST)
            และพื้นที่สีเขียวต่อประชากรจากภาพถ่ายดาวเทียม ครบทั้ง 77 จังหวัด
            เจาะลึกถึงระดับอำเภอ พร้อมระบบ AI แนะนำจุดที่ควรปลูกต้นไม้
          </p>
          <div className="landing__cta-row">
            <button className="landing__cta" onClick={onEnter}>
              เข้าสู่แดชบอร์ด <span className="landing__cta-arrow" aria-hidden="true">→</span>
            </button>
            <a className="landing__cta landing__cta--ghost" href="#method">ข้อมูลและระเบียบวิธี</a>
          </div>
          <dl className="landing__stats">
            <div><dt>จังหวัด</dt><dd>77</dd></div>
            <div><dt>อำเภอ / เขต</dt><dd>900+</dd></div>
            <div><dt>ความละเอียด NDVI</dt><dd>10 m</dd></div>
            <div><dt>ข้อมูลรายปี</dt><dd>2560–2569</dd></div>
          </dl>
        </section>

        <section className="landing__section">
          <h2 className="reveal">ทำอะไรได้บ้าง</h2>
          <div className="landing__grid">
            {FEATURES.map(([title, desc], i) => (
              <article className="landing__card reveal" key={title}>
                <h3>
                  <span className="landing__card-no">{String(i + 1).padStart(2, '0')}</span>
                  {title}
                </h3>
                <p>{desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing__section">
          <h2 className="reveal">ตัวอย่างหน้าจอ</h2>
          <div className="landing__shots">
            {SHOTS.map(([src, alt, caption]) => (
              <figure className="reveal" key={src}>
                <button className="landing__shot-btn" onClick={() => setLightbox([src, alt, caption])}
                  aria-label={'ขยายภาพ: ' + caption}>
                  <img src={src} alt={alt} loading="lazy" />
                </button>
                <figcaption>{caption}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="landing__section">
          <h2 className="reveal">เริ่มใช้ใน 3 ขั้น</h2>
          <ol className="landing__steps">
            {STEPS.map(([title, desc]) => (
              <li className="reveal" key={title}>
                <h3>{title}</h3>
                <p>{desc}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="landing__section" id="method">
          <h2 className="reveal">ข้อมูลและระเบียบวิธี</h2>
          <div className="landing__method">
            <div className="reveal">
              <h3>แหล่งข้อมูล</h3>
              <ul>
                {DATASETS.map(([name, use]) => (
                  <li key={name}><strong>{name}</strong> — {use}</li>
                ))}
              </ul>
            </div>
            <div className="reveal">
              <h3>ระเบียบวิธีโดยสรุป</h3>
              <ul>
                {METHOD.map(([name, detail]) => (
                  <li key={name}><strong>{name}</strong> — {detail}</li>
                ))}
              </ul>
              <p className="landing__method-note">
                รายละเอียดการอ้างอิงเชิงวิชาการทั้งหมด ดูได้ที่ปุ่ม ⓘ ในแดชบอร์ด
              </p>
            </div>
          </div>
        </section>

        <section className="landing__final">
          <h2 className="reveal">พร้อมสำรวจพื้นที่สีเขียวแล้วหรือยัง</h2>
          <button className="landing__cta" onClick={onEnter}>
            เริ่มใช้งานแดชบอร์ด <span className="landing__cta-arrow" aria-hidden="true">→</span>
          </button>
        </section>
      </main>

      <footer className="landing__footer">
        GreenLens — แพลตฟอร์มวิเคราะห์พื้นที่สีเขียวและเกาะความร้อนเมืองจากภาพถ่ายดาวเทียม<br />
        ข้อมูลดาวเทียม © Copernicus / USGS / ESA WorldCover / WorldPop ·
        ขอบเขต GADM 4.1 · แผนที่ © CARTO, OpenStreetMap contributors
      </footer>

      {lightbox && (
        <div className="landing__lightbox" role="dialog" aria-modal="true" aria-label={lightbox[2]}>
          <button className="landing__lightbox-backdrop" aria-label="ปิดภาพขยาย" onClick={() => setLightbox(null)}></button>
          <figure>
            <img src={lightbox[0]} alt={lightbox[1]} />
            <figcaption>{lightbox[2]} · กด Esc หรือคลิกเพื่อปิด</figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Landing />);
