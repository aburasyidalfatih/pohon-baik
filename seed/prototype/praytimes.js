// Perhitungan perkiraan waktu shalat (parameter mirip Kemenag RI:
// Subuh 20°, Isya 18°, Ashar madzhab Syafi'i, ihtiyat +2 menit).
// Hasil adalah perkiraan; untuk kepastian gunakan jadwal resmi Kemenag.
(function (global) {
  const rad = (d) => (d * Math.PI) / 180;
  const deg = (r) => (r * 180) / Math.PI;
  const fix = (a, b) => { a = a - b * Math.floor(a / b); return a < 0 ? a + b : a; };

  function julian(y, m, d) {
    if (m <= 2) { y -= 1; m += 12; }
    const A = Math.floor(y / 100);
    const B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
  }

  function sunPosition(jd) {
    const D = jd - 2451545.0;
    const g = fix(357.529 + 0.98560028 * D, 360);
    const q = fix(280.459 + 0.98564736 * D, 360);
    const L = fix(q + 1.915 * Math.sin(rad(g)) + 0.020 * Math.sin(rad(2 * g)), 360);
    const e = 23.439 - 0.00000036 * D;
    const RA = deg(Math.atan2(Math.cos(rad(e)) * Math.sin(rad(L)), Math.cos(rad(L)))) / 15;
    const eqt = q / 15 - fix(RA, 24);
    const decl = deg(Math.asin(Math.sin(rad(e)) * Math.sin(rad(L))));
    return { decl, eqt };
  }

  function compute(date, lat, lng, tz) {
    const jd = julian(date.getFullYear(), date.getMonth() + 1, date.getDate()) - lng / (15 * 24);
    const midday = (t) => {
      const { eqt } = sunPosition(jd + t / 24);
      return fix(12 - eqt, 24);
    };
    const angleTime = (angle, t, ccw) => {
      const { decl } = sunPosition(jd + t / 24);
      const noon = midday(t);
      const cosv = (-Math.sin(rad(angle)) - Math.sin(rad(decl)) * Math.sin(rad(lat))) /
        (Math.cos(rad(decl)) * Math.cos(rad(lat)));
      const T = deg(Math.acos(Math.max(-1, Math.min(1, cosv)))) / 15;
      return noon + (ccw ? -T : T);
    };
    const asrTime = (factor, t) => {
      const { decl } = sunPosition(jd + t / 24);
      const angle = -deg(Math.atan(1 / (factor + Math.tan(rad(Math.abs(lat - decl))))));
      return angleTime(angle, t);
    };

    // iterasi sekali dengan perkiraan awal (jam lokal matahari)
    let t = { subuh: 5, terbit: 6, dzuhur: 12, ashar: 13, maghrib: 18, isya: 18 };
    for (let i = 0; i < 2; i++) {
      t = {
        subuh: angleTime(20, t.subuh / 1, true),
        terbit: angleTime(0.833, t.terbit, true),
        dzuhur: midday(t.dzuhur),
        ashar: asrTime(1, t.ashar),
        maghrib: angleTime(0.833, t.maghrib),
        isya: angleTime(18, t.isya),
      };
    }
    const adj = tz - lng / 15;
    const ihtiyat = { subuh: 2, terbit: -2, dzuhur: 3, ashar: 2, maghrib: 2, isya: 2 };
    const out = {};
    for (const k of Object.keys(t)) {
      const h = fix(t[k] + adj + ihtiyat[k] / 60, 24);
      const hh = Math.floor(h);
      const mm = Math.floor((h - hh) * 60);
      out[k] = String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
    }
    return out;
  }

  global.PrayTimes = { compute };
  if (typeof module !== 'undefined') module.exports = { compute };
})(typeof window !== 'undefined' ? window : globalThis);
