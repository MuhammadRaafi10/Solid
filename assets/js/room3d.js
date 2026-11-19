// Renderer 3D tanpa library: kotak-kotak diproyeksikan ke canvas 2D dan diurutkan dari yang terjauh.
window.Room3D = (function () {
  const A = window.Avatar;
  const HALF = 7.5;
  const EMOTE_DUR = { wave: 2.6, dance: 3.2, jump: 0.8 };
  const LIGHT = norm([0.35, 0.85, 0.4]);

  function norm(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const c = k => Math.max(0, Math.min(255, Math.round(((n >> k) & 255) * f)));
    return 'rgb(' + c(16) + ',' + c(8) + ',' + c(0) + ')';
  }

  // Sisi kotak: indeks sudut dan normal lokal.
  const FACES = [
    [[0, 1, 2, 3], [0, 0, 1]], [[5, 4, 7, 6], [0, 0, -1]], [[4, 0, 3, 7], [-1, 0, 0]],
    [[1, 5, 6, 2], [1, 0, 0]], [[4, 5, 1, 0], [0, 1, 0]], [[3, 2, 6, 7], [0, -1, 0]],
  ];

  function create(canvas, hooks) {
    const ctx = canvas.getContext('2d');
    const S = {
      actors: new Map(), bubbles: {}, yaw: 0.7, pitch: 0.62, dist: 15, W: 0, H: 0, dpr: 1,
      cx: 0, cz: 0, theme: 'lobi', target: null, keys: {}, raf: 0, last: 0, time: 0, selfId: null,
    };

    function resize() {
      const r = canvas.getBoundingClientRect();
      S.dpr = Math.min(window.devicePixelRatio || 1, 2);
      S.W = Math.max(1, r.width); S.H = Math.max(1, r.height);
      canvas.width = S.W * S.dpr; canvas.height = S.H * S.dpr;
      ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
      S.dist = S.W < S.H ? 19 : 15;
    }

    function camera() {
      const c = [S.cx, 1, S.cz];
      const pos = [c[0] + S.dist * Math.sin(S.yaw) * Math.cos(S.pitch), c[1] + S.dist * Math.sin(S.pitch), c[2] + S.dist * Math.cos(S.yaw) * Math.cos(S.pitch)];
      const f = norm(sub(c, pos));
      const right = norm(cross(f, [0, 1, 0]));
      const up = cross(right, f);
      return { pos, f, right, up, focal: Math.min(S.W * 1.15, S.H * 1.25) };
    }

    function proj(cam, p) {
      const d = sub(p, cam.pos);
      const z = dot(d, cam.f);
      const k = cam.focal / Math.max(z, 0.1);
      return [S.W / 2 + dot(d, cam.right) * k, S.H / 2 - dot(d, cam.up) * k, z];
    }

    // Titik di lantai (y = 0) tempat sinar dari layar menyentuh.
    function unproject(cam, sx, sy) {
      const dir = [
        cam.f[0] + cam.right[0] * ((sx - S.W / 2) / cam.focal) - cam.up[0] * ((sy - S.H / 2) / cam.focal),
        cam.f[1] + cam.right[1] * ((sx - S.W / 2) / cam.focal) - cam.up[1] * ((sy - S.H / 2) / cam.focal),
        cam.f[2] + cam.right[2] * ((sx - S.W / 2) / cam.focal) - cam.up[2] * ((sy - S.H / 2) / cam.focal),
      ];
      if (dir[1] >= -0.001) return null;
      const t = -cam.pos[1] / dir[1];
      return [cam.pos[0] + dir[0] * t, cam.pos[2] + dir[2] * t];
    }

    /* pembangun bentuk */
    function boxCorners(cx, cy, cz, w, h, d) {
      const x = w / 2, y = h / 2, z = d / 2;
      return [[-x, y, z], [x, y, z], [x, -y, z], [-x, -y, z], [-x, y, -z], [x, y, -z], [x, -y, -z], [-x, -y, -z]].map(p => [p[0] + cx, p[1] + cy, p[2] + cz]);
    }

    function makeXform(a, ox, oy, oz) {
      const s = Math.sin(a.ry), c = Math.cos(a.ry);
      return (p) => [p[0] * c + p[2] * s + ox, p[1] + oy, -p[0] * s + p[2] * c + oz];
    }

    function rotX(p, pivot, ang) {
      const s = Math.sin(ang), c = Math.cos(ang);
      const y = p[1] - pivot[1], z = p[2] - pivot[2];
      return [p[0], pivot[1] + y * c - z * s, pivot[2] + y * s + z * c];
    }

    function pushBox(list, xf, color, cx, cy, cz, w, h, d, swing) {
      let pts = boxCorners(cx, cy, cz, w, h, d);
      if (swing) pts = pts.map(p => rotX(p, swing.pivot, swing.ang));
      const world = pts.map(xf);
      FACES.forEach(f => {
        const q = f[0].map(i => world[i]);
        list.push({ q: q, color: color, kind: 'box' });
      });
    }

    // Kotak datar di permukaan depan (z+) badan atau kepala, untuk detail wajah dan baju.
    function pushFlat(list, xf, color, cx, cy, cz, w, h, bias) {
      const x = w / 2, y = h / 2;
      const q = [[-x, y], [x, y], [x, -y], [-x, -y]].map(p => xf([p[0] + cx, p[1] + cy, cz]));
      list.push({ q: q, color: color, kind: 'flat', bias: bias || 0.02 });
    }

    function buildActor(a, list) {
      const cfg = A.clampCfg(a.cfg);
      const skin = A.SKINS[cfg.skin], hair = A.HAIR_COLORS[cfg.hairColor], cloth = A.CLOTH_COLORS[cfg.outfitColor], pants = A.PANTS[cfg.pants];
      const em = a.emote && S.time - a.emote.start < a.emote.dur ? a.emote : null;
      const et = em ? S.time - em.start : 0;
      let lift = 0, wig = 0, armL = null, armR = null;
      if (em && em.type === 'wave') { armR = -2.7 + Math.sin(et * 10) * 0.4; }
      if (em && em.type === 'dance') { lift = Math.abs(Math.sin(et * 8)) * 0.14; wig = Math.sin(et * 8) * 0.4; armL = -2.4 + Math.sin(et * 8) * 0.6; armR = -2.4 - Math.sin(et * 8) * 0.6; }
      if (em && em.type === 'jump') { lift = 1.1 * Math.max(0, Math.sin(Math.PI * et / em.dur)); armL = armR = -2.6; }
      const xf = makeXform({ ry: a.ry + wig }, a.x, lift, a.z);
      const sw = a.moving ? Math.sin(S.time * 9 + a.phase) * 0.7 : 0;
      const longSleeve = cfg.outfit !== 0;
      const trim = '#F7F7F3';

      [[-0.2, sw], [0.2, -sw]].forEach(l => {
        const piv = [l[0], 0.85, 0];
        pushBox(list, xf, pants, l[0], 0.42, 0, 0.38, 0.85, 0.4, { pivot: piv, ang: l[1] });
        pushBox(list, xf, '#F7F7F3', l[0], 0.08, 0.04, 0.4, 0.16, 0.46, { pivot: piv, ang: l[1] });
      });
      pushBox(list, xf, cloth, 0, 1.3, 0, 0.8, 0.9, 0.42);
      [[-0.55, armL == null ? -sw : armL], [0.55, armR == null ? sw : armR]].forEach(l => {
        const piv = [l[0], 1.7, 0];
        pushBox(list, xf, skin, l[0], 1.3, 0, 0.28, 0.8, 0.3, { pivot: piv, ang: l[1] });
        pushBox(list, xf, cloth, l[0], longSleeve ? 1.3 : 1.55, 0, 0.3, longSleeve ? 0.8 : 0.32, 0.32, { pivot: piv, ang: l[1] });
      });
      if (cfg.outfit === 1) pushBox(list, xf, cloth, 0, 1.75, -0.2, 0.6, 0.22, 0.22);
      if (cfg.outfit === 2) {
        pushFlat(list, xf, trim, 0, 1.5, 0.215, 0.2, 0.4, 0.03);
        pushFlat(list, xf, '#D96868', 0.22, 1.25, 0.215, 0.16, 0.12, 0.03);
      }
      if (cfg.outfit === 3) pushFlat(list, xf, trim, 0, 1.62, 0.215, 0.3, 0.14, 0.03);
      if (cfg.outfit === 1) { pushFlat(list, xf, trim, -0.08, 1.45, 0.215, 0.03, 0.22, 0.03); pushFlat(list, xf, trim, 0.08, 1.45, 0.215, 0.03, 0.22, 0.03); }

      const hy = 2.15;
      pushBox(list, xf, skin, 0, hy, 0, 0.7, 0.7, 0.7);
      const hs = cfg.hairStyle;
      if (hs >= 1 && hs !== 6 && hs !== 7) {
        pushBox(list, xf, hair, 0, hy + 0.34, 0, 0.74, 0.16, 0.74);
        pushBox(list, xf, hair, 0, hy + 0.05, -0.33, 0.74, 0.62, 0.1);
        pushBox(list, xf, hair, -0.34, hy + 0.2, 0, 0.08, 0.3, 0.72);
        pushBox(list, xf, hair, 0.34, hy + 0.2, 0, 0.08, 0.3, 0.72);
      }
      if (hs === 2) pushBox(list, xf, hair, 0, hy + 0.24, 0.33, 0.74, 0.2, 0.1);
      if (hs === 3) [-0.22, 0, 0.22].forEach((x, i) => pushBox(list, xf, hair, x, hy + 0.55 + (i === 1 ? 0.08 : 0), 0, 0.16, 0.26, 0.16));
      if (hs === 4) { pushBox(list, xf, hair, 0, hy - 0.3, -0.33, 0.8, 0.95, 0.12); pushBox(list, xf, hair, -0.38, hy - 0.1, -0.1, 0.1, 0.55, 0.5); pushBox(list, xf, hair, 0.38, hy - 0.1, -0.1, 0.1, 0.55, 0.5); }
      if (hs === 5) pushBox(list, xf, hair, 0, hy - 0.05, -0.5, 0.2, 0.5, 0.2);
      if (hs === 6) { pushBox(list, xf, hair, 0, hy + 0.4, 0, 0.9, 0.3, 0.9); pushBox(list, xf, hair, 0, hy + 0.05, -0.36, 0.86, 0.6, 0.16); pushBox(list, xf, hair, -0.4, hy + 0.2, 0, 0.14, 0.4, 0.74); pushBox(list, xf, hair, 0.4, hy + 0.2, 0, 0.14, 0.4, 0.74); }
      if (hs === 7) {
        pushBox(list, xf, hair, 0, hy + 0.36, 0, 0.8, 0.2, 0.8);
        pushBox(list, xf, hair, 0, hy + 0.2, 0.37, 0.8, 0.22, 0.08);
        pushBox(list, xf, hair, 0, hy - 0.05, -0.37, 0.8, 0.8, 0.12);
        pushBox(list, xf, hair, -0.38, hy - 0.05, 0, 0.12, 0.8, 0.72);
        pushBox(list, xf, hair, 0.38, hy - 0.05, 0, 0.12, 0.8, 0.72);
        pushBox(list, xf, hair, 0, 1.78, 0.02, 0.9, 0.28, 0.62);
      }

      const f = cfg.face, ink = '#3C3D37';
      if (f === 3) { pushFlat(list, xf, '#fff', -0.15, hy + 0.06, 0.355, 0.13, 0.13, 0.03); pushFlat(list, xf, '#fff', 0.15, hy + 0.06, 0.355, 0.13, 0.13, 0.03); pushFlat(list, xf, ink, -0.15, hy + 0.06, 0.355, 0.06, 0.06, 0.04); pushFlat(list, xf, ink, 0.15, hy + 0.06, 0.355, 0.06, 0.06, 0.04); pushFlat(list, xf, ink, 0, hy - 0.17, 0.355, 0.1, 0.14, 0.03); }
      else {
        pushFlat(list, xf, ink, -0.15, hy + 0.06, 0.355, 0.09, 0.1, 0.03); pushFlat(list, xf, ink, 0.15, hy + 0.06, 0.355, 0.09, 0.1, 0.03);
        if (f === 1) pushFlat(list, xf, ink, 0, hy - 0.16, 0.355, 0.26, 0.04, 0.03);
        else if (f === 2) pushFlat(list, xf, '#fff', 0, hy - 0.15, 0.355, 0.3, 0.12, 0.03);
        else { pushFlat(list, xf, ink, 0, hy - 0.17, 0.355, 0.24, 0.04, 0.03); pushFlat(list, xf, ink, -0.14, hy - 0.14, 0.355, 0.05, 0.05, 0.03); pushFlat(list, xf, ink, 0.14, hy - 0.14, 0.355, 0.05, 0.05, 0.03); }
      }
      const ac = cfg.acc;
      if (ac === 1) { pushFlat(list, xf, ink, -0.15, hy + 0.06, 0.36, 0.22, 0.04, 0.05); pushFlat(list, xf, ink, 0.15, hy + 0.06, 0.36, 0.22, 0.04, 0.05); pushFlat(list, xf, 'rgba(60,61,55,.35)', -0.15, hy + 0.06, 0.36, 0.2, 0.18, 0.045); pushFlat(list, xf, 'rgba(60,61,55,.35)', 0.15, hy + 0.06, 0.36, 0.2, 0.18, 0.045); }
      if (ac === 2) { pushBox(list, xf, ink, 0, hy + 0.4, 0, 0.78, 0.2, 0.78); pushBox(list, xf, ink, 0, hy + 0.32, 0.5, 0.78, 0.05, 0.36); }
      if (ac === 3) { pushBox(list, xf, '#D96868', -0.42, hy, 0, 0.12, 0.34, 0.34); pushBox(list, xf, '#D96868', 0.42, hy, 0, 0.12, 0.34, 0.34); pushBox(list, xf, ink, 0, hy + 0.4, 0, 0.9, 0.07, 0.12); }
    }

    const THEMES = {
      lobi: {
        label: 'Lobi', floorA: '#E8EAE6', floorB: '#DDE0D8', bg: '#C9CEC4',
        colliders: [[-6, -6, .5, .5], [6, -6, .5, .5], [-6, 6, .5, .5], [6, 6, .5, .5], [0, -6.4, 2.2, .6], [-6.4, 0, .45, 1.6], [6.4, 0, .45, 1.6]],
        build(L, X) {
          [[-6, -6], [6, -6], [-6, 6], [6, 6]].forEach(p => {
            pushBox(L, X(p[0], p[1]), '#8A6E55', 0, 0.3, 0, 0.7, 0.6, 0.7);
            pushBox(L, X(p[0], p[1]), '#455C36', 0, 1.0, 0, 1.0, 0.9, 1.0);
            pushBox(L, X(p[0], p[1]), '#7C9473', 0, 1.65, 0, 0.6, 0.5, 0.6);
          });
          pushBox(L, X(0, -6.4), '#ECDFCC', 0, 0.45, 0, 4.4, 0.18, 1.2);
          [-1.9, 1.9].forEach(x => pushBox(L, X(x, -6.4), '#3C3D37', 0, 0.2, 0, 0.2, 0.4, 0.9));
          pushBox(L, X(-6.4, 0), '#D49837', 0, 0.3, 0, 0.9, 0.6, 3.2);
          pushBox(L, X(6.4, 0), '#D49837', 0, 0.3, 0, 0.9, 0.6, 3.2);
        },
      },
      taman: {
        label: 'Taman', floorA: '#A9C49A', floorB: '#9CB88D', bg: '#CFE3EA',
        colliders: [[-6, -5, .5, .5], [6, -5, .5, .5], [-6.3, 3, .5, .5], [6.3, 4, .5, .5], [-2, -6.4, .5, .5], [3, -6.2, .5, .5], [4, -1, 1, .4]],
        build(L, X) {
          [[-6, -5], [6, -5], [-6.3, 3], [6.3, 4], [-2, -6.4], [3, -6.2]].forEach(p => {
            pushBox(L, X(p[0], p[1]), '#8A6E55', 0, 0.6, 0, 0.5, 1.2, 0.5);
            pushBox(L, X(p[0], p[1]), '#455C36', 0, 1.7, 0, 1.6, 1.0, 1.6);
            pushBox(L, X(p[0], p[1]), '#5E8049', 0, 2.5, 0, 1.0, 0.8, 1.0);
          });
          pushBox(L, X(-3, -2), '#D96868', 0, 0.02, 0, 2.6, 0.04, 2.0);
          pushBox(L, X(-3, -2), '#ECDFCC', 0, 0.045, 0, 1.2, 0.02, 0.9);
          pushBox(L, X(4, -1), '#ECDFCC', 0, 0.5, 0, 2, 0.14, 0.7);
          [-0.8, 0.8].forEach(x => pushBox(L, X(4 + x, -1), '#8A6E55', 0, 0.22, 0, 0.14, 0.44, 0.5));
        },
      },
      kantin: {
        label: 'Kantin', floorA: '#EAD9B8', floorB: '#E0CBA3', bg: '#E8D8BE',
        colliders: [[-3, -2, .9, .9], [3, -2, .9, .9], [-3, 2.5, .9, .9], [3, 2.5, .9, .9], [0, -6.6, 4, .6]],
        build(L, X) {
          [[-3, -2], [3, -2], [-3, 2.5], [3, 2.5]].forEach(p => {
            pushBox(L, X(p[0], p[1]), '#3C3D37', 0, 0.35, 0, 0.3, 0.7, 0.3);
            pushBox(L, X(p[0], p[1]), '#ECDFCC', 0, 0.75, 0, 1.7, 0.1, 1.7);
            [-1.4, 1.4].forEach(o => pushBox(L, X(p[0] + o, p[1]), '#D49837', 0, 0.25, 0, 0.5, 0.5, 0.5));
          });
          pushBox(L, X(0, -6.6), '#D96868', 0, 0.5, 0, 8, 1.0, 1.0);
          pushBox(L, X(0, -6.6), '#D49837', 0, 1.05, 0, 8.2, 0.1, 1.2);
          [-2.5, 0, 2.5].forEach(x => pushBox(L, X(x, -6.6), '#455C36', 0, 1.35, 0.1, 0.5, 0.5, 0.5));
        },
      },
    };

    function blocked(x, z) {
      return THEMES[S.theme].colliders.some(c => Math.abs(x - c[0]) < c[2] + 0.35 && Math.abs(z - c[1]) < c[3] + 0.35);
    }

    function buildProps(list) {
      THEMES[S.theme].build(list, (x, z) => makeXform({ ry: 0 }, x, 0, z));
    }

    /* gambar */
    function drawFloor(cam) {
      for (let i = -8; i < 8; i++) {
        for (let j = -8; j < 8; j++) {
          const a = proj(cam, [i, 0, j]), b = proj(cam, [i + 1, 0, j]), c = proj(cam, [i + 1, 0, j + 1]), d = proj(cam, [i, 0, j + 1]);
          if (a[2] < 0.2 || b[2] < 0.2 || c[2] < 0.2 || d[2] < 0.2) continue;
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath();
          ctx.fillStyle = (i + j) & 1 ? THEMES[S.theme].floorB : THEMES[S.theme].floorA;
          ctx.fill();
        }
      }
      const e = [[-8, -8], [8, -8], [8, 8], [-8, 8]].map(p => proj(cam, [p[0], 0, p[1]]));
      ctx.lineWidth = 3; ctx.strokeStyle = '#3C3D37'; ctx.beginPath();
      e.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.stroke();
    }

    function drawFaces(cam, faces) {
      faces.forEach(f => {
        const c = [0, 0, 0];
        f.q.forEach(p => { c[0] += p[0] / 4; c[1] += p[1] / 4; c[2] += p[2] / 4; });
        const n = norm(cross(sub(f.q[1], f.q[0]), sub(f.q[2], f.q[1]))).map(v => -v);
        f.n = n;
        const toCam = sub(cam.pos, c);
        f.visible = dot(n, toCam) > 0;
        f.depth = Math.hypot(toCam[0], toCam[1], toCam[2]) - (f.kind === 'flat' ? f.bias * 10 : 0);
      });
      faces.filter(f => f.visible).sort((a, b) => b.depth - a.depth).forEach(f => {
        const pts = f.q.map(p => proj(cam, p));
        if (pts.some(p => p[2] < 0.2)) return;
        const lit = 0.62 + 0.45 * Math.max(0, dot(f.n, LIGHT));
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < 4; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.closePath();
        ctx.fillStyle = f.color.charAt(0) === '#' ? shade(f.color, lit) : f.color;
        ctx.fill();
        if (f.kind === 'box') { ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(60,61,55,.85)'; ctx.lineJoin = 'round'; ctx.stroke(); }
      });
    }

    function wrap(text, max) {
      const words = String(text).split(/\s+/), lines = []; let cur = '';
      words.forEach(w => { if ((cur + ' ' + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); });
      if (cur) lines.push(cur);
      return lines.slice(0, 3);
    }

    function rrect(x, y, w, h, r) {
      ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }

    function drawLabels(cam) {
      const list = Array.from(S.actors.values()).map(a => ({ a: a, p: proj(cam, [a.x, 2.95, a.z]) })).sort((x, y) => y.p[2] - x.p[2]);
      list.forEach(it => {
        const a = it.a, p = it.p;
        if (p[2] < 0.5) return;
        const fs = Math.max(11, Math.min(15, 190 / p[2] + 5));
        ctx.font = '700 ' + fs + 'px "DM Sans", system-ui, sans-serif';
        const w = ctx.measureText(a.name).width + 14, h = fs + 8;
        rrect(p[0] - w / 2, p[1] - h, w, h, 8);
        ctx.fillStyle = a.self ? '#D96868' : '#3C3D37'; ctx.fill();
        ctx.fillStyle = a.self ? '#3C3D37' : '#ECDFCC'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(a.name, p[0], p[1] - h / 2 + 1);
        const b = S.bubbles[a.id];
        if (b && b.until > S.time) {
          const lines = wrap(b.text, 22), bw = Math.max(...lines.map(l => ctx.measureText(l).width)) + 18, bh = lines.length * (fs + 3) + 12;
          const by = p[1] - h - 8 - bh;
          rrect(p[0] - bw / 2, by, bw, bh, 10); ctx.fillStyle = '#F7F7F3'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#3C3D37'; ctx.stroke();
          ctx.fillStyle = '#3C3D37';
          lines.forEach((l, i) => ctx.fillText(l, p[0], by + 6 + (i + 0.5) * (fs + 3)));
        }
      });
    }

    function frame(ts) {
      const dt = Math.min(0.05, (ts - (S.last || ts)) / 1000);
      S.last = ts; S.time += dt;
      const me = S.actors.get(S.selfId);
      if (me) update(me, dt);
      S.actors.forEach(a => { if (!a.self) peerStep(a, dt); });
      if (me) { S.cx += (me.x - S.cx) * Math.min(1, dt * 4); S.cz += (me.z - S.cz) * Math.min(1, dt * 4); }

      ctx.clearRect(0, 0, S.W, S.H);
      ctx.fillStyle = THEMES[S.theme].bg; ctx.fillRect(0, 0, S.W, S.H);
      const cam = camera();
      drawFloor(cam);
      if (S.target) {
        const ring = []; for (let i = 0; i < 16; i++) { const t = i / 16 * Math.PI * 2; ring.push(proj(cam, [S.target[0] + Math.cos(t) * 0.4, 0, S.target[1] + Math.sin(t) * 0.4])); }
        ctx.beginPath(); ring.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
        ctx.lineWidth = 3; ctx.strokeStyle = '#D96868'; ctx.stroke();
      }
      const faces = [];
      buildProps(faces);
      S.actors.forEach(a => buildActor(a, faces));
      drawFaces(cam, faces);
      drawLabels(cam);
      S.raf = requestAnimationFrame(frame);
    }

    function update(a, dt) {
      let dx = 0, dz = 0;
      const k = S.keys;
      const fx = -Math.sin(S.yaw), fz = -Math.cos(S.yaw);
      const rx = Math.cos(S.yaw), rz = -Math.sin(S.yaw);
      if (k.ArrowUp || k.w) { dx += fx; dz += fz; }
      if (k.ArrowDown || k.s) { dx -= fx; dz -= fz; }
      if (k.ArrowRight || k.d) { dx += rx; dz += rz; }
      if (k.ArrowLeft || k.a) { dx -= rx; dz -= rz; }
      if (dx || dz) S.target = null;
      else if (S.target) {
        dx = S.target[0] - a.x; dz = S.target[1] - a.z;
        if (Math.hypot(dx, dz) < 0.12) { S.target = null; dx = dz = 0; }
      }
      const l = Math.hypot(dx, dz);
      a.moving = l > 0;
      if (l > 0) {
        if (a.emote && a.emote.type !== 'jump') a.emote = null;
        const step = Math.min(3.4 * dt, S.target ? l : 99);
        const lim = v => Math.max(-HALF + 0.5, Math.min(HALF - 0.5, v));
        const nx = lim(a.x + dx / l * step), nz = lim(a.z + dz / l * step);
        let moved = false;
        if (!blocked(nx, a.z)) { a.x = nx; moved = true; }
        if (!blocked(a.x, nz)) { a.z = nz; moved = true; }
        if (!moved) S.target = null;
        a.ry = Math.atan2(dx, dz);
      }
      S.actors.forEach(o => {
        if (o === a) return;
        const ox = a.x - o.x, oz = a.z - o.z, d = Math.hypot(ox, oz);
        if (d > 0 && d < 0.7) { a.x += ox / d * (0.7 - d) * 0.5; a.z += oz / d * (0.7 - d) * 0.5; }
      });
    }

    function peerStep(a, dt) {
      const dx = a.tx - a.x, dz = a.tz - a.z, l = Math.hypot(dx, dz);
      a.moving = l > 0.05;
      if (a.moving) {
        const step = Math.min(l, 3.6 * dt);
        a.x += dx / l * step; a.z += dz / l * step;
        a.ry = Math.atan2(dx, dz);
      } else if (a.fry != null) a.ry = a.fry;
    }

    /* input */
    let down = null;
    const onDown = e => { down = { x: e.clientX, y: e.clientY, yaw: S.yaw, moved: false }; try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ } };
    const onMove = e => {
      if (!down) return;
      const dx = e.clientX - down.x;
      if (Math.abs(dx) > 6 || Math.abs(e.clientY - down.y) > 6) down.moved = true;
      if (down.moved) S.yaw = down.yaw - dx * 0.008;
    };
    const onUp = e => {
      if (down && !down.moved) {
        const r = canvas.getBoundingClientRect();
        const cam = camera();
        const sx = e.clientX - r.left, sy = e.clientY - r.top;
        let hit = null;
        S.actors.forEach(a => {
          const q = proj(cam, [a.x, 1.3, a.z]);
          if (q[2] > 0.5 && Math.hypot(q[0] - sx, q[1] - sy) < cam.focal / q[2] * 1.0 && (!hit || q[2] < hit.z)) hit = { id: a.id, z: q[2] };
        });
        const p = hit ? null : unproject(cam, sx, sy);
        if (hit && !S.actors.get(hit.id).self && hooks && hooks.onPick) hooks.onPick(hit.id);
        else if (p) S.target = [Math.max(-HALF + 0.5, Math.min(HALF - 0.5, p[0])), Math.max(-HALF + 0.5, Math.min(HALF - 0.5, p[1]))];
      }
      down = null;
    };
    const onWheel = e => { e.preventDefault(); S.dist = Math.max(9, Math.min(24, S.dist + e.deltaY * 0.01)); };
    const typing = () => { const t = document.activeElement; return t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT'); };
    const onKey = e => {
      if (typing()) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(k) >= 0) e.preventDefault();
      if (e.type === 'keydown' && !e.repeat && hooks && hooks.onKey && hooks.onKey(k)) return;
      S.keys[k] = e.type === 'keydown';
    };
    canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', () => { down = null; });
    canvas.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey);
    window.addEventListener('resize', resize);
    resize();
    S.raf = requestAnimationFrame(frame);

    return {
      resize,
      setSelf(u) {
        S.selfId = u.id;
        S.actors.set(u.id, { id: u.id, name: u.name, cfg: u.cfg, x: u.x, z: u.z, tx: u.x, tz: u.z, ry: 0, phase: 0, moving: false, self: true });
        S.cx = u.x; S.cz = u.z;
      },
      syncPeers(list) {
        const ids = {};
        list.forEach(p => {
          ids[p.id] = true;
          let a = S.actors.get(p.id);
          if (!a) { a = { id: p.id, x: p.x, z: p.z, ry: p.ry, phase: Math.random() * 6, moving: false, self: false }; S.actors.set(p.id, a); }
          a.name = p.name; a.cfg = p.avatar; a.tx = p.x; a.tz = p.z; a.fry = p.ry;
          if (p.emote && p.emote_at !== a.emoteId) { a.emoteId = p.emote_at; a.emote = { type: p.emote, start: S.time, dur: EMOTE_DUR[p.emote] || 2.5 }; }
        });
        S.actors.forEach((a, id) => { if (!a.self && !ids[id]) S.actors.delete(id); });
      },
      emote(type) { const a = S.actors.get(S.selfId); if (a && EMOTE_DUR[type]) { a.emote = { type: type, start: S.time, dur: EMOTE_DUR[type] }; } },
      setTheme(name) { if (THEMES[name]) S.theme = name; },
      themes() { return Object.keys(THEMES).map(k => ({ key: k, label: THEMES[k].label })); },
      say(id, text) { S.bubbles[id] = { text: text, until: S.time + 7 }; },
      self() { const a = S.actors.get(S.selfId); return a ? { x: a.x, z: a.z, ry: a.ry } : { x: 0, z: 0, ry: 0 }; },
      count() { return S.actors.size; },
      destroy() {
        cancelAnimationFrame(S.raf);
        window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); window.removeEventListener('resize', resize);
      },
    };
  }

  return { create };
})();
