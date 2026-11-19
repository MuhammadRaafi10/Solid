window.API = (function () {
  function fail(message, code) {
    const e = new Error(message);
    e.code = code || 'ERR';
    return e;
  }

  async function call(action, payload) {
    let res;
    try {
      res = await fetch('api/index.php?action=' + encodeURIComponent(action), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'solid' },
        body: JSON.stringify(payload || {}),
      });
    } catch (e) {
      throw fail('Koneksi putus. Coba lagi sebentar.', 'NET');
    }
    let j;
    try {
      j = await res.json();
    } catch (e) {
      throw fail('Server balas dengan format yang salah. Cek config.php dan error log PHP.', 'SERVER');
    }
    if (!j.ok) throw fail(j.error || 'Terjadi kesalahan.', j.code || 'ERR');
    return j.data;
  }

  return { call };
})();
