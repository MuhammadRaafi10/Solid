(() => {
  'use strict';

  const A = window.Avatar;
  const API = window.API;
  const PLACES = window.PLACES;
  const TZ = 'Asia/Jakarta';

  const FACULTIES = [
    { code: 'FEB', name: 'Ekonomi dan Bisnis', color: '#D49837' },
    { code: 'FH', name: 'Hukum', color: '#697565' },
    { code: 'FIKES', name: 'Ilmu Kesehatan', color: '#D96868' },
    { code: 'FT', name: 'Teknik', color: '#3C3D37' },
    { code: 'FIK', name: 'Ilmu Komputer', color: '#455C36' },
    { code: 'FK', name: 'Kedokteran', color: '#F8A41E' },
    { code: 'FISIP', name: 'Ilmu Sosial dan Ilmu Politik', color: '#7C9473' },
  ];
  const fac = code => FACULTIES.find(f => f.code === code) || { code, name: code, color: '#697565' };

  const ICON = {
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M4 5h16v11H9l-5 4z"/></svg>',
    people: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17.5" cy="9" r="2.6"/><path d="M17 14.2c2.7.1 4.5 2 4.5 4.8"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3.5" width="14" height="10" rx="4"/><path d="M4 21c0-3.8 3.6-6 8-6s8 2.2 8 6"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"><path d="M4 12 20 4l-4 16-4.5-6.5z"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.800 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.4"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8v.01"/></svg>',
    group: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8.5" r="3"/><path d="M3 19c0-3 2.6-5 6-5s6 2 6 5"/><path d="M18 8v6M15 11h6"/></svg>',
    key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/></svg>',
    cube: '<svg viewBox="0 0 64 64" fill="none" stroke="#3C3D37" stroke-width="3" stroke-linejoin="round"><path d="M32 6 56 19v26L32 58 8 45V19z" fill="#ECDFCC"/><path d="M8 19l24 13 24-13M32 32v26" /><path d="M32 6 56 19 32 32 8 19z" fill="#7C9473"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  };

  const S = {
    me: null, tab: 'chat', convs: [], active: null, msgs: {}, users: {}, plans: {},
    friends: { friends: [], incoming: [], outgoing: [] }, incomingCount: 0, planList: [], timers: [],
    search: { q: '', faculty: '', results: [], seq: 0 },
  };

  const root = document.getElementById('app');
  const $ = (sel, el) => (el || document).querySelector(sel);
  const $$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const node = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

  const iso = s => String(s).replace(' ', 'T') + '+07:00';
  const parseWIB = s => new Date(iso(s));
  const fmt = (d, o) => new Intl.DateTimeFormat('id-ID', Object.assign({ timeZone: TZ }, o)).format(d);
  const todayWIB = () => new Intl.DateTimeFormat('sv-SE', { timeZone: TZ }).format(new Date());
  const timeOf = s => fmt(parseWIB(s), { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');
  const dayKey = s => new Intl.DateTimeFormat('sv-SE', { timeZone: TZ }).format(parseWIB(s));
  function dayLabel(s) {
    const k = dayKey(s);
    const t = todayWIB();
    const y = new Intl.DateTimeFormat('sv-SE', { timeZone: TZ }).format(new Date(Date.now() - 864e5));
    if (k === t) return 'Hari ini';
    if (k === y) return 'Kemarin';
    return fmt(parseWIB(s), { weekday: 'short', day: 'numeric', month: 'short' });
  }
  function shortStamp(s) {
    if (!s) return '';
    return dayKey(s) === todayWIB() ? timeOf(s) : fmt(parseWIB(s), { day: 'numeric', month: 'short' });
  }

  function avHtml(cfg, cls, body) {
    return `<div class="av ${cls || ''}">${A.svg(cfg, { head: !body })}</div>`;
  }
  function facChip(code) {
    const f = fac(code);
    return `<span class="chip" title="${esc(f.name)}"><span class="dot" style="background:${f.color}"></span>${esc(f.code)}</span>`;
  }
  const nick = u => (u && (u.nickname || u.name)) || 'Pengguna';

  /* feedback */
  function toast(msg, bad) {
    let box = $('.toast-box');
    if (!box) { box = node('<div class="toast-box"></div>'); document.body.appendChild(box); }
    const t = node(`<output class="toast ${bad ? 'bad' : ''}">${esc(msg)}</output>`);
    box.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }

  // validasi sisi klien: lempar error + tandai field. Server tetap memvalidasi ulang.
  function need(ok, msg, el) {
    if (ok) return;
    if (el) {
      el.setAttribute('aria-invalid', 'true');
      el.addEventListener('input', () => el.removeAttribute('aria-invalid'), { once: true });
      el.focus();
    }
    throw new Error(msg);
  }

  function modal(opts) {
    const dlg = node(`<dialog class="modal ${opts.wide ? 'wide' : ''}" aria-labelledby="modalTitle">
      <header><h2 id="modalTitle">${esc(opts.title)}</h2><button class="icon-btn" data-x aria-label="Tutup">${ICON.x}</button></header>
      <div class="modal-b"></div>${opts.actions ? '<footer></footer>' : ''}</dialog>`);
    const body = $('.modal-b', dlg);
    if (typeof opts.body === 'string') body.innerHTML = opts.body; else if (opts.body) body.appendChild(opts.body);
    const m = { el: dlg, body, close() { dlg.close(); } };
    dlg.addEventListener('close', () => dlg.remove());
    dlg.addEventListener('click', e => { if (e.target === dlg) m.close(); });
    $('[data-x]', dlg).addEventListener('click', () => m.close());
    if (opts.actions) {
      opts.actions.forEach(a => {
        const b = node(`<button class="btn ${a.cls || ''}">${esc(a.label)}</button>`);
        b.addEventListener('click', async () => {
          b.disabled = true;
          try {
            const keep = await a.run(m, b);
            if (keep !== false) m.close();
          } catch (e) {
            if (e.code === 'AUTH') return forceLogin();
            toast(e.message, true);
          }
          b.disabled = false;
        });
        $('footer', dlg).appendChild(b);
      });
    }
    document.body.appendChild(dlg);
    dlg.showModal();
    return m;
  }

  function confirmBox(text, okLabel) {
    return new Promise(res => {
      const m = modal({
        title: 'Yakin?', body: `<p>${esc(text)}</p>`,
        actions: [
          { label: 'Batal', cls: 'paper', run: () => res(false) },
          { label: okLabel || 'Lanjut', cls: 'coral', run: () => res(true) },
        ],
      });
      m.el.addEventListener('close', () => res(false));
    });
  }

  async function call(action, payload) {
    try {
      return await API.call(action, payload);
    } catch (e) {
      if (e.code === 'AUTH') forceLogin();
      throw e;
    }
  }

  /* auth */
  function forceLogin() {
    stopPolling();
    S.me = null;
    renderAuth('login');
  }

  function renderAuth(tab) {
    const crew = [{ skin: 2, hairStyle: 2, hairColor: 1, outfit: 2, outfitColor: 0, face: 2, acc: 1 },
      { skin: 1, hairStyle: 7, hairColor: 5, outfit: 1, outfitColor: 2, face: 0, acc: 0 },
      { skin: 3, hairStyle: 3, hairColor: 0, outfit: 0, outfitColor: 3, face: 0, acc: 3 }];
    const years = []; const y = new Date().getFullYear();
    for (let i = y; i >= y - 6; i--) years.push(i);
    root.innerHTML = `<main class="auth">
      <section class="auth-hero">
        <header>
          <p class="wordmark">SOLID<span>+</span></p>
          <p class="kicker">Social Online Link for Inter-Department</p>
        </header>
        <div>
          <h1>Kenalan sama anak fakultas sebelah, mulai dari sini.</h1>
          <p>Cari temen pakai ID, ngobrol, bikin grup, lalu atur ketemuan di Blok M atau One Bell Park.</p>
        </div>
        <div class="hero-crew" aria-hidden="true">${crew.map(c => avHtml(c, '', false)).join('')}</div>
      </section>
      <section class="auth-card-wrap"><div class="auth-card">
        <div class="tabs" role="tablist"><button role="tab" data-t="login">Masuk</button><button role="tab" data-t="register">Daftar</button></div>
        <form id="authForm" novalidate></form>
      </div></section></main>`;

    const form = $('#authForm');
    function paint(t) {
      $$('.tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.t === t));
      if (t === 'login') {
        form.innerHTML = `
          <label class="field"><span>ID atau email</span><input class="in" name="id" autocomplete="username" autocapitalize="none" required></label>
          <label class="field"><span>Password</span><input class="in" name="password" type="password" autocomplete="current-password" required></label>
          <p class="err" id="authErr" role="alert"></p>
          <button class="btn block coral" type="submit">Masuk</button>`;
      } else {
        form.innerHTML = `
          <label class="field"><span>Nama lengkap</span><input class="in" name="name" autocomplete="name" maxlength="60" required></label>
          <label class="field"><span>ID kamu</span><input class="in" name="username" autocapitalize="none" maxlength="20" placeholder="mis. rina.fik" required><small>Huruf kecil, angka, titik, underscore. Ini yang dicari temen-temenmu.</small></label>
          <label class="field"><span>Email</span><input class="in" name="email" type="email" autocomplete="email" required></label>
          <div class="row">
            <label class="field"><span>Fakultas</span><select class="in" name="faculty" required>${FACULTIES.map(f => `<option value="${f.code}">${esc(f.code)}</option>`).join('')}</select></label>
            <label class="field"><span>Angkatan</span><select class="in" name="angkatan">${years.map(v => `<option>${v}</option>`).join('')}</select></label>
          </div>
          <label class="field"><span>Password</span><input class="in" name="password" type="password" autocomplete="new-password" minlength="8" required><small>Minimal 8 karakter.</small></label>
          <p class="err" id="authErr" role="alert"></p>
          <button class="btn block coral" type="submit">Buat akun</button>`;
      }
      form.dataset.mode = t;
    }
    paint(tab);
    $$('.tabs button').forEach(b => b.addEventListener('click', () => paint(b.dataset.t)));

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const err = $('#authErr');
      const btn = $('button[type=submit]', form);
      const mode = form.dataset.mode;
      const data = Object.fromEntries(new FormData(form).entries());
      err.textContent = '';
      btn.disabled = true;
      try {
        const f = form.elements;
        if (mode === 'register') {
          need(data.name.trim().length >= 2, 'Nama lengkap minimal 2 huruf.', f.name);
          need(/^[a-z0-9_.]{3,20}$/.test(data.username.trim().toLowerCase()), 'ID cuma boleh huruf kecil, angka, titik, underscore (3-20 karakter).', f.username);
          need(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email.trim()), 'Format email belum benar.', f.email);
          need(data.password.length >= 8, 'Password minimal 8 karakter.', f.password);
        } else {
          need(data.id.trim() !== '', 'Isi ID atau emailmu.', f.id);
          need(data.password !== '', 'Isi passwordmu.', f.password);
        }
        const res = await API.call(mode, data);
        S.me = res.user;
        await startApp(mode === 'register');
      } catch (ex) {
        err.textContent = ex.message;
        btn.disabled = false;
      }
    });
  }

  /* shell */
  async function startApp(firstRun) {
    S.tab = 'chat'; S.active = null; S.msgs = {}; S.convs = [];
    root.innerHTML = `<div class="shell" id="shell">
      <nav class="rail" aria-label="Menu utama">
        <span class="logo" aria-hidden="true">S<b>+</b></span>
        <button class="nav-btn" data-tab="chat">${ICON.chat}<span>Chat</span><span class="badge" id="bChat" hidden></span></button>
        <button class="nav-btn" data-tab="friends">${ICON.people}<span>Teman</span><span class="badge" id="bFr" hidden></span></button>
        <button class="nav-btn" data-tab="plans">${ICON.cal}<span>Jadwal</span></button>
        <button class="nav-btn" data-tab="me">${ICON.user}<span>Profil</span></button>
      </nav>
      <main class="content" id="content"></main></div>`;
    $$('.nav-btn').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
    await Promise.all([loadOverview(true), loadFriends(true)]);
    setTab('chat');
    startPolling();
    if (firstRun) { toast('Akun jadi. Pilih avatarmu dulu.'); openAvatarEditor(); }
  }

  function setTab(tab) {
    S.tab = tab;
    $$('.nav-btn').forEach(b => (b.dataset.tab === tab ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')));
    const c = $('#content');
    c.innerHTML = '';
    $('#shell').classList.toggle('in-chat', tab === 'chat' && !!S.active);
    if (tab === 'chat') renderChatTab();
    else if (tab === 'friends') renderFriendsTab();
    else if (tab === 'plans') renderPlansTab();
    else renderProfileTab();
  }

  function updateBadges() {
    const un = S.convs.reduce((n, c) => n + (c.unread || 0), 0);
    const b1 = $('#bChat'), b2 = $('#bFr');
    if (b1) { b1.hidden = !un; b1.textContent = un > 99 ? '99+' : un; }
    if (b2) { b2.hidden = !S.incomingCount; b2.textContent = S.incomingCount; }
  }

  /* data loaders */
  async function loadOverview(quiet) {
    const r = await call('overview');
    const before = JSON.stringify(S.convs);
    S.convs = r.convs;
    S.incomingCount = r.incoming;
    updateBadges();
    if (!quiet && S.tab === 'chat' && before !== JSON.stringify(S.convs)) paintConvList();
  }
  async function loadFriends() {
    S.friends = await call('friends_list');
    S.incomingCount = S.friends.incoming.length;
    updateBadges();
  }

  /* chat tab */
  function renderChatTab() {
    $('#content').innerHTML = `<div class="split ${S.active ? 'has-chat' : ''}" id="split">
      <aside class="list">
        <header class="list-head"><h1>Chat</h1><div class="list-tools">
          <button class="icon-btn" id="btnJoin" title="Gabung pakai kode" aria-label="Gabung pakai kode">${ICON.key}</button>
          <button class="icon-btn" id="btnGroup" title="Grup baru" aria-label="Grup baru">${ICON.group}</button></div></header>
        <div class="list-body" id="convList"></div>
      </aside>
      <section class="chat" id="chatPane"></section></div>`;
    $('#btnGroup').addEventListener('click', openNewGroup);
    $('#btnJoin').addEventListener('click', openJoinGroup);
    paintConvList();
    if (S.active) renderChatPane(); else paintNoChat();
    $('#shell').classList.toggle('in-chat', !!S.active);
  }

  function paintNoChat() {
    const p = $('#chatPane');
    if (!p) return;
    p.innerHTML = `<div class="no-chat"><div>
      <svg class="art" viewBox="0 0 190 120" aria-hidden="true"><rect x="10" y="30" width="70" height="70" rx="18" fill="#7C9473" stroke="#3C3D37" stroke-width="3"/><rect x="60" y="10" width="70" height="70" rx="18" fill="#D96868" stroke="#3C3D37" stroke-width="3"/><rect x="110" y="40" width="70" height="70" rx="18" fill="#ECDFCC" stroke="#3C3D37" stroke-width="3"/></svg>
      <h2>Pilih obrolan</h2><p class="muted">Atau cari teman baru dari fakultas lain.</p>
      <button class="btn coral" id="goFriends">Cari teman</button></div></div>`;
    $('#goFriends').addEventListener('click', () => setTab('friends'));
  }

  function convPreview(c) {
    const l = c.last;
    if (!l) return 'Belum ada pesan';
    if (l.kind === 'plan') return 'Rencana: ' + l.body;
    const mine = l.user_id === S.me.id;
    const pre = mine ? 'Kamu: ' : (c.type === 'group' && l.nick ? l.nick + ': ' : '');
    return pre + l.body;
  }

  function paintConvList() {
    const box = $('#convList');
    if (!box) return;
    if (!S.convs.length) {
      box.innerHTML = `<div class="empty"><h2>Belum ada obrolan</h2><p>Tambah teman dulu, atau bikin grup dan ajak yang lain.</p><button class="btn coral" id="emptyFind">Cari teman</button></div>`;
      $('#emptyFind').addEventListener('click', () => setTab('friends'));
      return;
    }
    box.innerHTML = '<ul>' + S.convs.map(c => {
      const av = c.type === 'group' ? `<div class="av group">${esc((c.name || '?').trim().slice(0, 2).toUpperCase())}</div>` : avHtml(c.avatar);
      return `<li><button class="conv ${c.id === S.active ? 'on' : ''}" data-id="${c.id}">${av}
        <div class="meta"><div class="top"><span class="nm">${esc(c.name)}</span><span class="tm">${esc(shortStamp(c.last ? c.last.created_at : c.created_at))}</span></div>
        <div class="pv"><span>${esc(convPreview(c))}</span>${c.unread ? `<span class="badge">${c.unread}</span>` : ''}</div></div></button></li>`;
    }).join('') + '</ul>';
    $$('.conv', box).forEach(b => b.addEventListener('click', () => openConv(Number(b.dataset.id))));
  }

  const msgState = id => S.msgs[id] || (S.msgs[id] = { list: [], lastId: 0, hasMore: false, loaded: false });

  async function loadMsgs(id, older) {
    const ms = msgState(id);
    const payload = { conv_id: id };
    if (older) payload.before_id = ms.list.length ? ms.list[0].id : 0;
    else payload.after_id = ms.lastId;
    const r = await call('msg_list', payload);
    Object.assign(S.users, r.users || {});
    let plansChanged = false;
    (r.plans || []).forEach(p => {
      const was = JSON.stringify(S.plans[p.id]);
      S.plans[p.id] = p;
      if (was !== JSON.stringify(p)) plansChanged = true;
    });
    let added = 0;
    if (older) {
      ms.list = r.messages.concat(ms.list);
      ms.hasMore = r.has_more;
      added = r.messages.length;
    } else {
      const seen = new Set(ms.list.map(m => m.id));
      r.messages.forEach(m => { if (!seen.has(m.id)) { ms.list.push(m); added++; } });
      if (!ms.loaded) { ms.hasMore = r.has_more; ms.loaded = true; }
    }
    ms.lastId = ms.list.length ? ms.list[ms.list.length - 1].id : 0;
    return { added, plansChanged };
  }

  async function openConv(id) {
    S.active = id;
    const c = S.convs.find(x => x.id === id);
    if (c) { c.unread = 0; updateBadges(); }
    if (S.tab !== 'chat') setTab('chat');
    else {
      $('#split').classList.add('has-chat');
      $('#shell').classList.add('in-chat');
      paintConvList();
      renderChatPane();
    }
    try {
      await loadMsgs(id);
      if (S.active === id) paintMsgs(true);
    } catch (e) { toast(e.message, true); }
  }

  function closeConv() {
    S.active = null;
    $('#split').classList.remove('has-chat');
    $('#shell').classList.remove('in-chat');
    paintConvList();
    paintNoChat();
  }

  function renderChatPane() {
    const c = S.convs.find(x => x.id === S.active);
    const p = $('#chatPane');
    if (!c || !p) return;
    const av = c.type === 'group' ? `<div class="av group sm">${esc((c.name || '?').slice(0, 2).toUpperCase())}</div>` : avHtml(c.avatar, 'sm');
    const sub = c.type === 'group' ? `${c.members_count} anggota` : (c.other ? `${fac(c.other.faculty).name} · ${c.other.angkatan}` : '');
    p.innerHTML = `<header class="chat-head">
        <button class="icon-btn back-btn" id="chBack" aria-label="Kembali">${ICON.back}</button>${av}
        <div class="t"><h2>${esc(c.name)}</h2><p>${esc(sub)}</p></div>
        <button class="icon-btn" id="chRoom" title="Ruang 3D" aria-label="Ruang 3D">${ICON.cube}</button>
        <button class="icon-btn" id="chPlan" title="Ajak pergi" aria-label="Ajak pergi">${ICON.cal}</button>
        <button class="icon-btn" id="chInfo" title="Info" aria-label="Info">${ICON.info}</button>
      </header>
      <ol class="msgs" id="msgs" aria-label="Pesan" aria-live="polite"></ol>
      <form class="composer" id="composer"><textarea id="msgIn" rows="1" maxlength="1000" placeholder="Tulis pesan" aria-label="Tulis pesan"></textarea>
        <button class="btn coral" type="submit" aria-label="Kirim">${ICON.send}</button></form>`;
    $('#chBack').addEventListener('click', closeConv);
    $('#chRoom').addEventListener('click', () => openRoom(c.id));
    $('#chPlan').addEventListener('click', () => openPlanModal({ convId: c.id }));
    $('#chInfo').addEventListener('click', () => (c.type === 'group' ? openGroupInfo(c.id) : c.other && viewUser(c.other.id)));
    const ta = $('#msgIn');
    ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'; });
    ta.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(pointer:fine)').matches) { e.preventDefault(); $('#composer').requestSubmit(); }
    });
    $('#composer').addEventListener('submit', sendMsg);
    $('#msgs').addEventListener('click', onMsgClick);
    paintMsgs(true);
  }

  function planCard(m) {
    const p = S.plans[m.plan_id];
    if (!p) return '<li class="sys">Rencana ini sudah tidak ada.</li>';
    const place = PLACES.find(x => x.key === p.place_key);
    const map = place ? PLACES.mapUrl(place) : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.place_name);
    const names = (p.going_names || []).join(', ');
    return `<li class="plan-wrap"><article class="plan">
      <header><span>Rencana ketemu</span><span>${esc(dayLabel(p.starts_at))}</span></header>
      <div class="pb"><h3>${esc(p.title)}</h3>
        <p class="pl">${ICON.clock}<time datetime="${iso(p.starts_at)}">${esc(fmt(parseWIB(p.starts_at), { weekday: 'long', day: 'numeric', month: 'long' }))}, ${esc(timeOf(p.starts_at))} WIB</time></p>
        <p class="pl">${ICON.pin}<span>${esc(p.place_name)} · <a href="${esc(map)}" target="_blank" rel="noopener">peta</a></span></p>
        ${p.note ? `<p class="muted">${esc(p.note)}</p>` : ''}</div>
      <footer>
        <button class="btn sm rsvp ${p.mine === 'going' ? 'on' : 'paper'}" data-act="rsvp" data-plan="${p.id}" data-status="going">Ikut (${p.going})</button>
        <button class="btn sm rsvp no ${p.mine === 'no' ? 'on' : 'paper'}" data-act="rsvp" data-plan="${p.id}" data-status="no">Ga bisa (${p.no})</button>
        ${names ? `<p class="who-go">Ikut: ${esc(names)}${p.going > (p.going_names || []).length ? ' dan lainnya' : ''}</p>` : ''}</footer></article></li>`;
  }

  function paintMsgs(stick) {
    const box = $('#msgs');
    const c = S.convs.find(x => x.id === S.active);
    if (!box || !c) return;
    const ms = msgState(c.id);
    const near = box.scrollHeight - box.scrollTop - box.clientHeight < 90;
    let html = ms.hasMore ? '<li class="more-btn"><button class="btn sm paper flat" data-act="older">Muat pesan lama</button></li>' : '';
    let day = '', prev = null;
    if (ms.loaded && !ms.list.length) html += '<li class="sys">Belum ada pesan. Sapa duluan.</li>';
    ms.list.forEach(m => {
      const k = dayKey(m.created_at);
      if (k !== day) { html += `<li class="day-sep"><time datetime="${k}">${esc(dayLabel(m.created_at))}</time></li>`; day = k; prev = null; }
      if (m.kind === 'plan') { html += planCard(m); prev = null; return; }
      if (m.kind === 'system') { html += `<li class="sys">${esc(m.body)}</li>`; prev = null; return; }
      const mine = m.user_id === S.me.id;
      const first = !prev || prev.user_id !== m.user_id;
      const u = S.users[m.user_id] || {};
      const who = !mine && first && c.type === 'group' ? `<span class="who">${esc(nick(u))}</span>` : '';
      html += `<li class="m ${mine ? 'me' : ''} ${first ? 'first' : 'cont'}">${mine ? '' : avHtml(u.avatar, 'sm')}<p class="bub">${who}${esc(m.body)}<time class="ts" datetime="${iso(m.created_at)}">${esc(timeOf(m.created_at))}</time></p></li>`;
      prev = m;
    });
    box.innerHTML = html;
    if (stick || near) box.scrollTop = box.scrollHeight;
  }

  async function onMsgClick(e) {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'older') {
      const box = $('#msgs'); const h0 = box.scrollHeight;
      try { await loadMsgs(S.active, true); paintMsgs(false); box.scrollTop = box.scrollHeight - h0; } catch (er) { toast(er.message, true); }
    } else if (b.dataset.act === 'rsvp') {
      await rsvp(Number(b.dataset.plan), b.dataset.status);
    }
  }

  async function rsvp(planId, status) {
    try {
      const p = S.plans[planId];
      const next = p && p.mine === status ? 'none' : status;
      const r = await call('plan_rsvp', { plan_id: planId, status: next });
      S.plans[planId] = Object.assign(S.plans[planId] || {}, r);
      if (S.tab === 'chat') paintMsgs(false);
      if (S.tab === 'plans') { const i = S.planList.findIndex(x => x.id === planId); if (i >= 0) S.planList[i] = Object.assign(S.planList[i], r); paintPlanList(); }
    } catch (er) { toast(er.message, true); }
  }

  async function sendMsg(e) {
    e.preventDefault();
    const ta = $('#msgIn');
    const body = ta.value.trim();
    if (!body || !S.active) return;
    const id = S.active;
    ta.value = ''; ta.style.height = 'auto';
    try {
      await call('msg_send', { conv_id: id, body });
      await loadMsgs(id);
      if (S.active === id) paintMsgs(true);
      loadOverview().catch(() => {});
    } catch (er) {
      ta.value = body;
      toast(er.message, true);
    }
  }

  /* groups */
  function friendPicker(excludeIds) {
    const list = S.friends.friends.filter(f => !(excludeIds || []).includes(f.id));
    if (!list.length) return '<p class="muted">Belum ada teman yang bisa dipilih.</p>';
    return `<ul class="pick" aria-label="Pilih teman">${list.map(f => `<li><label>${avHtml(f.avatar, 'sm')}<span class="grow"><b>${esc(nick(f))}</b> <span class="muted">@${esc(f.username)}</span></span>${facChip(f.faculty)}<input type="checkbox" value="${f.id}"></label></li>`).join('')}</ul>`;
  }

  function openNewGroup() {
    const b = node(`<div><label class="field"><span>Nama grup</span><input class="in" id="gName" maxlength="40" placeholder="mis. Geng Futsal Lintas Fakultas"></label>
      <label class="field"><span>Deskripsi (opsional)</span><input class="in" id="gDesc" maxlength="120"></label>
      <p class="cap">Ajak teman</p>${friendPicker()}</div>`);
    modal({
      title: 'Grup baru', body: b,
      actions: [{ label: 'Batal', cls: 'paper', run: () => {} }, {
        label: 'Buat grup', cls: 'coral', run: async () => {
          const name = $('#gName', b).value.trim();
          need(name.length >= 3, 'Nama grup minimal 3 huruf.', $('#gName', b));
          const ids = $$('input:checked', b).map(i => Number(i.value));
          const c = await call('group_create', { name, description: $('#gDesc', b).value.trim(), member_ids: ids });
          await loadOverview(true);
          setTimeout(() => { setTab('chat'); openConv(c.id); }, 0);
        },
      }],
    });
  }

  function openJoinGroup() {
    const b = node('<div><label class="field"><span>Kode grup</span><input class="in" id="jCode" maxlength="8" autocapitalize="characters" placeholder="6 karakter"></label></div>');
    modal({
      title: 'Gabung grup', body: b,
      actions: [{ label: 'Batal', cls: 'paper', run: () => {} }, {
        label: 'Gabung', cls: 'coral', run: async () => {
          const code = $('#jCode', b).value.trim().toUpperCase();
          need(/^[A-Z0-9]{6}$/.test(code), 'Kode grup terdiri dari 6 huruf atau angka.', $('#jCode', b));
          const c = await call('group_join', { code });
          await loadOverview(true);
          setTimeout(() => { setTab('chat'); openConv(c.id); }, 0);
        },
      }],
    });
  }

  async function openGroupInfo(id) {
    let g;
    try { g = await call('group_info', { conv_id: id }); } catch (e) { return toast(e.message, true); }
    const b = node('<div></div>');
    const paint = () => {
      b.innerHTML = `${g.description ? `<p class="muted">${esc(g.description)}</p>` : ''}
        <div class="code-box"><span class="muted">Kode</span><b>${esc(g.invite_code)}</b><button class="btn sm paper flat" id="cpCode">Salin</button></div>
        <h3>${g.members.length} anggota</h3>
        <ul>${g.members.map(m => `<li class="mem">${avHtml(m.avatar, 'sm')}<span class="grow"><b>${esc(nick(m))}</b> <span class="muted">@${esc(m.username)}</span></span>${facChip(m.faculty)}</li>`).join('')}</ul>
        <h3>Tambah teman</h3><div id="addBox">${friendPicker(g.members.map(m => m.id))}</div>`;
      $('#cpCode', b).addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(g.invite_code); toast('Kode disalin.'); } catch (e) { toast('Salin manual: ' + g.invite_code); }
      });
    };
    paint();
    modal({
      title: g.name, body: b,
      actions: [
        { label: 'Keluar grup', cls: 'paper', run: async () => {
          if (!(await confirmBox('Keluar dari grup ini?', 'Keluar'))) return false;
          await call('group_leave', { conv_id: id });
          S.active = null; await loadOverview(true); setTab('chat');
        } },
        { label: 'Tambahkan', cls: 'coral', run: async () => {
          const ids = $$('#addBox input:checked', b).map(i => Number(i.value));
          if (!ids.length) throw new Error('Pilih teman dulu.');
          await call('group_add', { conv_id: id, user_ids: ids });
          await loadMsgs(id); paintMsgs(true); await loadOverview(true); renderChatPane();
          toast('Anggota ditambahkan.');
        } },
      ],
    });
  }

  /* friends */
  function renderFriendsTab() {
    $('#content').innerHTML = `<section class="page"><div class="page-in">
      <header class="page-head"><div><h1>Teman</h1><p>Cari pakai ID atau nama. Kamu bisa saring per fakultas.</p></div></header>
      <form class="searchbar" role="search"><input class="in" id="q" type="search" aria-label="Cari ID atau nama" placeholder="Cari ID atau nama, mis. rina" value="${esc(S.search.q)}" autocomplete="off">
        <select class="in" id="qf" aria-label="Saring fakultas"><option value="">Semua fakultas</option>${FACULTIES.map(f => `<option value="${f.code}" ${S.search.faculty === f.code ? 'selected' : ''}>${esc(f.code)} · ${esc(f.name)}</option>`).join('')}</select></form>
      <section id="inc"></section>
      <section><h2 class="sec-title" id="resTitle">Kenalan baru</h2><ul class="grid" id="resGrid"></ul></section>
      <section><h2 class="sec-title">Teman kamu <span class="chip" id="frCount">0</span></h2><ul class="grid" id="frGrid"></ul></section>
    </div></section>`;
    $('.searchbar').addEventListener('submit', e => e.preventDefault());
    let t;
    $('#q').addEventListener('input', e => { S.search.q = e.target.value; clearTimeout(t); t = setTimeout(runSearch, 250); });
    $('#qf').addEventListener('change', e => { S.search.faculty = e.target.value; runSearch(); });
    $('#content').addEventListener('click', onUserCardClick);
    paintFriends();
    runSearch();
  }

  function ucard(u, mode) {
    let act = '';
    const id = u.id;
    switch (u.friend_status) {
      case 'friends': act = `<button class="btn sm" data-fa="chat" data-id="${id}">Chat</button>`; break;
      case 'sent': act = `<button class="btn sm paper" data-fa="cancel" data-id="${id}">Batalkan</button>`; break;
      case 'received': act = `<button class="btn sm sage" data-fa="accept" data-id="${id}">Terima</button><button class="btn sm paper" data-fa="decline" data-id="${id}">Tolak</button>`; break;
      case 'self': act = ''; break;
      default: act = `<button class="btn sm coral" data-fa="add" data-id="${id}">Tambah</button>`;
    }
    return `<li><article class="ucard" data-uid="${id}">${avHtml(u.avatar)}<div class="ub"><strong>${esc(nick(u))}</strong><span class="un">@${esc(u.username)} · ${esc(u.angkatan)}</span>${facChip(u.faculty)}</div><div class="ua">${act}</div></article></li>`;
  }

  function paintFriends() {
    const inc = $('#inc');
    if (!inc) return;
    const f = S.friends;
    inc.innerHTML = f.incoming.length ? `<h2 class="sec-title">Permintaan masuk <span class="badge">${f.incoming.length}</span></h2><ul class="grid">${f.incoming.map(u => ucard(Object.assign({}, u, { friend_status: 'received' }))).join('')}</ul>` : '';
    $('#frCount').textContent = f.friends.length;
    $('#frGrid').innerHTML = f.friends.length ? f.friends.map(u => ucard(Object.assign({}, u, { friend_status: 'friends' }))).join('') : '<li class="empty"><p>Belum ada teman. Cari dan tambah dari hasil di atas.</p></li>';
  }

  async function runSearch() {
    const seq = ++S.search.seq;
    const grid = $('#resGrid');
    if (!grid) return;
    try {
      const r = await call('search_users', { q: S.search.q.trim(), faculty: S.search.faculty });
      if (seq !== S.search.seq || !$('#resGrid')) return;
      S.search.results = r.users;
      $('#resTitle').textContent = S.search.q.trim() ? 'Hasil pencarian' : 'Kenalan baru';
      $('#resGrid').innerHTML = r.users.length ? r.users.map(u => ucard(u)).join('') : `<li class="empty"><h3>Ga ketemu</h3><p>${S.search.q.trim() ? 'Coba cek ejaan ID-nya, atau cari pakai nama.' : 'Belum ada yang bisa disarankan. Undang temanmu daftar.'}</p></li>`;
    } catch (e) { toast(e.message, true); }
  }

  async function onUserCardClick(e) {
    const btn = e.target.closest('[data-fa]');
    if (btn) { e.stopPropagation(); return friendAct(btn.dataset.fa, Number(btn.dataset.id)); }
    const card = e.target.closest('.ucard');
    if (card) viewUser(Number(card.dataset.uid));
  }

  async function friendAct(kind, uid) {
    try {
      if (kind === 'chat') return openDM(uid);
      if (kind === 'add') { await call('friend_request', { user_id: uid }); toast('Permintaan terkirim.'); }
      else if (kind === 'cancel' || kind === 'decline') await call('friend_remove', { user_id: uid });
      else if (kind === 'accept') { await call('friend_respond', { user_id: uid, accept: true }); toast('Kalian sekarang berteman.'); }
      else if (kind === 'remove') { if (!(await confirmBox('Hapus dari daftar teman?', 'Hapus'))) return; await call('friend_remove', { user_id: uid }); }
      await loadFriends();
      if (S.tab === 'friends') { paintFriends(); runSearch(); }
    } catch (er) { toast(er.message, true); }
  }

  async function openDM(uid) {
    const c = await call('dm_open', { user_id: uid });
    await loadOverview(true);
    S.active = null;
    setTab('chat');
    openConv(c.id);
  }

  async function viewUser(id) {
    let u;
    try { u = await call('user_get', { user_id: id }); } catch (e) { return toast(e.message, true); }
    const vis = u.friend_status === 'friends' || u.friend_status === 'self';
    const b = node(`<article class="vprof">
      <div class="av lg">${A.svg(u.avatar, { head: true })}</div>
      <div><h3>${esc(nick(u))}</h3>
        <p class="muted">${esc(u.name)} · @${esc(u.username)}</p>
        <p>${facChip(u.faculty)} <span class="chip">Angkatan ${esc(u.angkatan)}</span></p>
        ${u.bio ? `<p>${esc(u.bio)}</p>` : ''}
        ${vis ? `<dl><dt>Roblox</dt><dd>${esc(u.roblox || '-')}</dd><dt>Instagram</dt><dd>${u.instagram ? '@' + esc(u.instagram) : '-'}</dd></dl>` : '<p class="muted">Roblox dan Instagram baru kelihatan setelah berteman.</p>'}
      </div></article>`);
    const actions = [];
    if (u.friend_status === 'none') actions.push({ label: 'Tambah teman', cls: 'coral', run: async () => { await friendAct('add', u.id); } });
    if (u.friend_status === 'sent') actions.push({ label: 'Batalkan permintaan', cls: 'paper', run: async () => { await friendAct('cancel', u.id); } });
    if (u.friend_status === 'received') {
      actions.push({ label: 'Tolak', cls: 'paper', run: async () => { await friendAct('decline', u.id); } });
      actions.push({ label: 'Terima', cls: 'sage', run: async () => { await friendAct('accept', u.id); } });
    }
    if (u.friend_status === 'friends') {
      actions.push({ label: 'Hapus teman', cls: 'paper', run: async () => { await friendAct('remove', u.id); } });
      actions.push({ label: 'Kirim chat', cls: 'coral', run: async () => { await openDM(u.id); } });
    }
    modal({ title: 'Profil', body: b, actions: actions.length ? actions : null });
  }

  /* plans */
  async function renderPlansTab() {
    $('#content').innerHTML = `<section class="page"><div class="page-in">
      <header class="page-head"><div><h1>Jadwal</h1><p>Rencana ketemu dari semua chat dan grupmu.</p></div><button class="btn coral" id="newPlan">${ICON.plus} Buat rencana</button></header>
      <section id="planList"></section>
      <section><h2 class="sec-title">Tempat saran</h2>
      <ul class="places">${PLACES.map(p => `<li><article class="place"><div class="tile" style="background:${p.color};color:${p.color === '#ECDFCC' || p.color === '#F8A41E' || p.color === '#D49837' ? '#3C3D37' : '#F7F7F3'}">${esc(p.name)}</div>
        <div class="pbody"><p class="area">${esc(p.area)}</p><p class="note">${esc(p.note)}</p>
        <ul class="tags">${p.tags.map(t => `<li class="chip">${esc(t)}</li>`).join('')}</ul>
        <div class="pact"><a href="${esc(PLACES.mapUrl(p))}" target="_blank" rel="noopener">Buka peta</a><button class="btn sm" data-place="${p.key}">Pakai tempat ini</button></div></div></article></li>`).join('')}</ul></section>
    </div></section>`;
    $('#newPlan').addEventListener('click', () => openPlanModal({}));
    $$('[data-place]').forEach(b => b.addEventListener('click', () => openPlanModal({ placeKey: b.dataset.place })));
    $('#planList').innerHTML = '<p class="muted">Memuat...</p>';
    try {
      const r = await call('plan_list');
      S.planList = r.plans;
      r.plans.forEach(p => { S.plans[p.id] = p; });
      paintPlanList();
    } catch (e) { toast(e.message, true); }
  }

  function paintPlanList() {
    const box = $('#planList');
    if (!box) return;
    if (!S.planList.length) {
      box.innerHTML = '<div class="empty card"><h2>Belum ada rencana</h2><p>Buat rencana dari sini, atau lewat ikon kalender di dalam chat.</p></div>';
      return;
    }
    box.innerHTML = '<ul>' + S.planList.map(p => {
      const d = parseWIB(p.starts_at);
      const place = PLACES.find(x => x.key === p.place_key);
      const map = place ? PLACES.mapUrl(place) : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.place_name);
      return `<li><article class="pitem"><time class="dateblock" datetime="${iso(p.starts_at)}"><small>${esc(fmt(d, { month: 'short' }))}</small><b>${esc(fmt(d, { day: 'numeric' }))}</b></time>
        <div class="pi"><h3>${esc(p.title)}</h3>
          <p class="muted">${esc(fmt(d, { weekday: 'long' }))}, ${esc(timeOf(p.starts_at))} WIB · <a href="${esc(map)}" target="_blank" rel="noopener">${esc(p.place_name)}</a></p>
          <p><span class="chip">${esc(p.conv_name)}</span> <span class="muted">${p.going} ikut${p.no ? ', ' + p.no + ' ga bisa' : ''}</span></p>
          ${p.note ? `<p class="muted">${esc(p.note)}</p>` : ''}
          <div class="acts"><button class="btn sm rsvp ${p.mine === 'going' ? 'on' : 'paper'}" data-rs="${p.id}" data-st="going">Ikut</button>
            <button class="btn sm rsvp no ${p.mine === 'no' ? 'on' : 'paper'}" data-rs="${p.id}" data-st="no">Ga bisa</button>
            <button class="btn sm paper" data-open="${p.conv_id}">Buka chat</button>
            ${p.creator_id === S.me.id ? `<button class="btn sm paper" data-edit="${p.id}">Ubah</button><button class="btn sm coral" data-del="${p.id}">Hapus</button>` : ''}</div></div></article></li>`;
    }).join('') + '</ul>';
    $$('[data-rs]', box).forEach(b => b.addEventListener('click', () => rsvp(Number(b.dataset.rs), b.dataset.st)));
    $$('[data-edit]', box).forEach(b => b.addEventListener('click', () => openPlanModal({ plan: S.plans[b.dataset.edit] })));
    $$('[data-del]', box).forEach(b => b.addEventListener('click', async () => {
      if (!await confirmBox('Rencana ini dihapus dari jadwal dan dari chat. Lanjut?', 'Hapus')) return;
      try {
        await call('plan_delete', { plan_id: Number(b.dataset.del) });
        toast('Rencana dihapus.');
        renderPlansTab();
      } catch (e) { toast(e.message, true); }
    }));
    $$('[data-open]', box).forEach(b => b.addEventListener('click', () => { S.active = null; setTab('chat'); openConv(Number(b.dataset.open)); }));
  }

  function openPlanModal(pre) {
    if (!S.convs.length) return toast('Bikin grup atau mulai chat dulu, baru bisa ajak pergi.', true);
    const ed = pre.plan;
    const tmr = new Intl.DateTimeFormat('sv-SE', { timeZone: TZ }).format(new Date(Date.now() + 864e5));
    const known = ed && PLACES.some(x => x.key === ed.place_key);
    const placeKey = ed ? (known ? ed.place_key : 'other') : pre.placeKey;
    const b = node(`<div>
      <label class="field" ${ed ? 'hidden' : ''}><span>Kirim ke</span><select class="in" id="pConv">${S.convs.map(c => `<option value="${c.id}" ${c.id === pre.convId ? 'selected' : ''}>${esc(c.name)}${c.type === 'group' ? ' (grup)' : ''}</option>`).join('')}</select></label>
      <label class="field"><span>Mau ngapain</span><input class="in" id="pTitle" maxlength="60" placeholder="mis. Makan siang bareng" value="${ed ? esc(ed.title) : ''}"></label>
      <label class="field"><span>Tempat</span><select class="in" id="pPlace">${PLACES.map(p => `<option value="${p.key}" ${p.key === placeKey ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}<option value="other" ${placeKey === 'other' ? 'selected' : ''}>Tempat lain...</option></select></label>
      <label class="field" id="pOtherW" ${placeKey === 'other' ? '' : 'hidden'}><span>Nama tempat</span><input class="in" id="pOther" maxlength="60" value="${placeKey === 'other' && ed ? esc(ed.place_name) : ''}"></label>
      <div class="row"><label class="field"><span>Tanggal</span><input class="in" id="pDate" type="date" min="${todayWIB()}" value="${ed ? ed.starts_at.slice(0, 10) : tmr}"></label>
      <label class="field"><span>Jam (WIB)</span><input class="in" id="pTime" type="time" value="${ed ? ed.starts_at.slice(11, 16) : '15:00'}"></label></div>
      <label class="field"><span>Catatan (opsional)</span><input class="in" id="pNote" maxlength="120" placeholder="mis. kumpul di lobi jam 14.45" value="${ed ? esc(ed.note) : ''}"></label></div>`);
    const sel = $('#pPlace', b);
    sel.addEventListener('change', () => { $('#pOtherW', b).hidden = sel.value !== 'other'; });
    modal({
      title: ed ? 'Ubah rencana' : 'Ajak pergi', body: b,
      actions: [{ label: 'Batal', cls: 'paper', run: () => {} }, {
        label: ed ? 'Simpan' : 'Kirim rencana', cls: 'coral', run: async () => {
          const key = sel.value;
          const place = PLACES.find(p => p.key === key);
          const name = key === 'other' ? $('#pOther', b).value.trim() : place.name;
          const date = $('#pDate', b).value, time = $('#pTime', b).value;
          need($('#pTitle', b).value.trim().length >= 2, 'Judul rencana minimal 2 huruf.', $('#pTitle', b));
          need(name.length >= 2, 'Isi nama tempatnya.', $('#pOther', b));
          need(date && time, 'Isi tanggal dan jamnya.', $('#pDate', b));
          need(parseWIB(date + ' ' + time + ':00').getTime() > Date.now() - 3e5, 'Waktunya sudah lewat. Pilih waktu yang akan datang.', $('#pDate', b));
          const convId = Number($('#pConv', b).value);
          const data = {
            title: $('#pTitle', b).value.trim(), place_key: key === 'other' ? '' : key,
            place_name: name, starts_at: date + ' ' + time + ':00', note: $('#pNote', b).value.trim(),
          };
          if (ed) {
            await call('plan_update', Object.assign({ plan_id: ed.id }, data));
            toast('Rencana diperbarui.');
            return renderPlansTab();
          }
          await call('plan_create', Object.assign({ conv_id: convId }, data));
          toast('Rencana terkirim ke chat.');
          await loadOverview(true);
          if (S.tab === 'chat' && S.active === convId) { await loadMsgs(convId); paintMsgs(true); paintConvList(); }
          else if (S.tab === 'plans') renderPlansTab();
        },
      }],
    });
  }

  /* profile */
  function renderProfileTab() {
    const u = S.me;
    $('#content').innerHTML = `<section class="page"><div class="page-in">
      <header class="page-head"><div><h1>Profil</h1><p>Begini kamu kelihatan di mata temen-temenmu.</p></div></header>
      <div class="prof">
        <div class="prof-side"><div class="av xl">${A.svg(u.avatar, { head: true })}</div>
          <div><h2 id="profNick">${esc(nick(u))}</h2><p class="muted">@${esc(u.username)}</p></div>
          <button class="btn coral" id="editAv">Ubah avatar</button></div>
        <form class="card" id="profForm" novalidate>
          <div class="row"><label class="field"><span>Nama panggilan</span><input class="in" name="nickname" maxlength="20" value="${esc(u.nickname)}"></label>
            <label class="field"><span>Nama lengkap</span><input class="in" name="name" maxlength="60" value="${esc(u.name)}"></label></div>
          <div class="row"><label class="field"><span>Nickname Roblox</span><input class="in" name="roblox" maxlength="40" value="${esc(u.roblox)}"></label>
            <label class="field"><span>Instagram</span><input class="in" name="instagram" maxlength="30" placeholder="tanpa @" value="${esc(u.instagram)}"></label></div>
          <p class="hint">Roblox dan Instagram cuma kelihatan oleh teman yang sudah kamu terima.</p>
          <div class="row"><label class="field"><span>Fakultas</span><select class="in" name="faculty">${FACULTIES.map(f => `<option value="${f.code}" ${f.code === u.faculty ? 'selected' : ''}>${esc(f.code)} · ${esc(f.name)}</option>`).join('')}</select></label>
            <label class="field"><span>Angkatan</span><input class="in" name="angkatan" type="number" min="2000" max="2100" value="${esc(u.angkatan)}"></label></div>
          <label class="field"><span>Bio singkat</span><textarea class="in" name="bio" maxlength="160" rows="2" placeholder="mis. suka futsal, lagi cari temen belajar statistik">${esc(u.bio)}</textarea></label>
          <p class="err" id="profErr" role="alert"></p>
          <div class="btn-row"><button class="btn coral" type="submit">Simpan</button><button class="btn paper" type="button" id="logout">Keluar</button></div>
        </form></div>
      <aside class="teaser">${ICON.cube}<div><h2>Ruang 3D</h2><p>Ketemu pakai avatarmu di ruang virtual. Buka lewat ikon kubus di dalam chat atau grup mana pun.</p></div></aside>
    </div></section>`;
    $('#editAv').addEventListener('click', openAvatarEditor);
    $('#logout').addEventListener('click', async () => { try { await API.call('logout'); } catch (e) { /* session may be gone already */ } forceLogin(); });
    $('#profForm').addEventListener('submit', async e => {
      e.preventDefault();
      const err = $('#profErr'); err.textContent = '';
      const data = Object.fromEntries(new FormData(e.target).entries());
      try {
        const f = e.target.elements;
        need(data.nickname.trim().length >= 2, 'Nama panggilan minimal 2 huruf.', f.nickname);
        need(data.name.trim().length >= 2, 'Nama lengkap minimal 2 huruf.', f.name);
        need(data.instagram === '' || /^[A-Za-z0-9_.]{1,30}$/.test(data.instagram.trim().replace(/^@/, '')), 'Username Instagram tidak valid.', f.instagram);
        const r = await call('profile_update', data);
        S.me = r.user;
        $('#profNick').textContent = nick(S.me);
        toast('Profil tersimpan.');
      } catch (ex) { err.textContent = ex.message; }
    });
  }

  function openAvatarEditor() {
    const cfg = A.clampCfg(S.me.avatar);
    const b = node('<div class="ed"><div class="ed-prev"><div class="av" id="edPrev"></div><button class="btn sm paper" id="edRand">Acak</button></div><div class="ed-opts" id="edOpts"></div></div>');
    const swatchRow = (key, title, colors) => `<div><h3>${title}</h3><div class="opt-row">${colors.map((c, i) => `<button type="button" class="sw ${cfg[key] === i ? 'on' : ''}" aria-pressed="${cfg[key] === i}" style="background:${c}" data-k="${key}" data-v="${i}" aria-label="${title} ${i + 1}"></button>`).join('')}</div></div>`;
    const optRow = (key, title, names) => `<div><h3>${title}</h3><div class="opt-row">${names.map((n, i) => `<button type="button" class="opt ${cfg[key] === i ? 'on' : ''}" aria-pressed="${cfg[key] === i}" data-k="${key}" data-v="${i}">${n}</button>`).join('')}</div></div>`;
    const paint = () => {
      $('#edPrev', b).innerHTML = A.svg(cfg);
      $('#edOpts', b).innerHTML = swatchRow('skin', 'Warna kulit', A.SKINS) + optRow('hairStyle', 'Rambut', A.OPTIONS.hairStyle) + swatchRow('hairColor', 'Warna rambut', A.HAIR_COLORS)
        + optRow('face', 'Ekspresi', A.OPTIONS.face) + optRow('outfit', 'Baju', A.OPTIONS.outfit) + swatchRow('outfitColor', 'Warna baju', A.CLOTH_COLORS)
        + swatchRow('pants', 'Celana', A.PANTS) + optRow('acc', 'Aksesori', A.OPTIONS.acc);
    };
    paint();
    b.addEventListener('click', e => {
      const t = e.target.closest('[data-k]');
      if (t) { cfg[t.dataset.k] = Number(t.dataset.v); paint(); }
    });
    $('#edRand', b).addEventListener('click', () => { Object.assign(cfg, A.random()); paint(); });
    modal({
      title: 'Avatar', body: b, wide: true,
      actions: [{ label: 'Batal', cls: 'paper', run: () => {} }, {
        label: 'Simpan avatar', cls: 'coral', run: async () => {
          const r = await call('profile_update', { avatar: cfg });
          S.me = r.user;
          if (S.tab === 'me') renderProfileTab();
          toast('Avatar tersimpan.');
        },
      }],
    });
  }


  /* ruang 3D */
  function openRoom(convId) {
    const c = S.convs.find(x => x.id === convId);
    if (!c || S.room) return;
    const ov = node(`<section class="room" aria-label="Ruang 3D">
      <header class="room-head"><button class="icon-btn" data-back aria-label="Keluar ruangan">${ICON.back}</button>
        <div class="t"><h2>Ruang 3D · ${esc(c.name)}</h2><p id="roomCount">1 orang di ruangan</p></div></header>
      <canvas class="room-cv" aria-label="Ruang 3D. Ketuk lantai untuk berjalan."></canvas>
      <div class="room-tools"><div class="emotes" role="group" aria-label="Emote">
        <button type="button" class="chip" data-emote="wave" title="Tombol 1">Lambai</button>
        <button type="button" class="chip" data-emote="dance" title="Tombol 2">Joget</button>
        <button type="button" class="chip" data-emote="jump" title="Tombol 3">Lompat</button></div>
        <select class="theme-sel" aria-label="Tema ruangan"></select></div>
      <p class="room-hint">Ketuk lantai untuk jalan, ketuk avatar untuk profil.</p>
      <form class="composer room-comp"><textarea rows="1" maxlength="200" placeholder="Ketik, muncul di atas kepalamu" aria-label="Pesan"></textarea><button class="btn coral" type="submit" aria-label="Kirim">${ICON.send}</button></form></section>`);
    document.body.appendChild(ov);
    const KEYMAP = { '1': 'wave', '2': 'dance', '3': 'jump', ' ': 'jump' };
    let pendingEmote = '';
    const hooks = {
      onPick: id => { if (S.users[id]) viewUser(id); },
      onKey: k => {
        const t = document.activeElement;
        if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.tagName === 'SELECT')) return false;
        if (!KEYMAP[k]) return false;
        doEmote(KEYMAP[k]);
        return true;
      },
    };
    const R = window.Room3D.create($('canvas', ov), hooks);
    function doEmote(type) {
      R.emote(type);
      pendingEmote = type;
      sync();
    }
    $$('[data-emote]', ov).forEach(b => b.addEventListener('click', () => doEmote(b.dataset.emote)));
    const sel = $('.theme-sel', ov);
    sel.innerHTML = R.themes().map(t => `<option value="${t.key}">${esc(t.label)}</option>`).join('');
    try { const saved = localStorage.getItem('solid_room_theme'); if (saved && R.themes().some(t => t.key === saved)) { sel.value = saved; R.setTheme(saved); } } catch (e) {}
    sel.addEventListener('change', () => {
      R.setTheme(sel.value);
      try { localStorage.setItem('solid_room_theme', sel.value); } catch (e) {}
    });
    R.setSelf({ id: S.me.id, name: nick(S.me), cfg: S.me.avatar, x: Math.round((Math.random() * 6 - 3) * 10) / 10, z: 5 + Math.round(Math.random() * 10) / 10 });
    const room = { id: convId, R, ov, timer: 0, busy: false };
    S.room = room;
    const ms = msgState(convId);

    async function sync() {
      if (room.busy || S.room !== room) return;
      room.busy = true;
      try {
        const st = R.self();
        const em = pendingEmote; pendingEmote = '';
        const r = await API.call('room_sync', { conv_id: convId, x: st.x, z: st.z, ry: st.ry, after_id: ms.lastId, emote: em });
        if (S.room !== room) return;
        Object.assign(S.users, r.users || {});
        (r.plans || []).forEach(p => { S.plans[p.id] = p; });
        R.syncPeers(r.peers);
        const seen = new Set(ms.list.map(m => m.id));
        r.messages.forEach(m => {
          if (seen.has(m.id)) return;
          ms.list.push(m);
          if (m.kind === 'text' && m.user_id !== S.me.id) R.say(m.user_id, m.body);
        });
        ms.lastId = ms.list.length ? ms.list[ms.list.length - 1].id : 0;
        const n = R.count();
        $('#roomCount', ov).textContent = n + ' orang di ruangan';
      } catch (e) {
        if (e.code === 'AUTH') { closeRoom(); forceLogin(); }
      } finally { room.busy = false; }
    }

    function closeRoom() {
      if (S.room !== room) return;
      clearInterval(room.timer);
      document.removeEventListener('keydown', onEsc);
      R.destroy();
      ov.remove();
      S.room = null;
      API.call('room_leave', { conv_id: convId }).catch(() => {});
      if (S.tab === 'chat' && S.active === convId) { paintMsgs(true); loadOverview().catch(() => {}); }
    }
    const onEsc = e => { if (e.key === 'Escape' && !$('dialog[open]')) closeRoom(); };
    document.addEventListener('keydown', onEsc);
    $('[data-back]', ov).addEventListener('click', closeRoom);

    const ta = $('textarea', ov);
    $('form', ov).addEventListener('submit', async e => {
      e.preventDefault();
      const body = ta.value.trim();
      if (!body) return;
      ta.value = '';
      try {
        await call('msg_send', { conv_id: convId, body });
        R.say(S.me.id, body);
        await loadMsgs(convId);
      } catch (er) { ta.value = body; toast(er.message, true); }
    });
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('form', ov).requestSubmit(); } });
    R.resize();
    sync();
    room.timer = setInterval(sync, 1100);
  }

  /* polling */
  function startPolling() {
    stopPolling();
    S.timers.push(setInterval(pollChat, 3500), setInterval(pollOverview, 9000));
    document.addEventListener('visibilitychange', onVisible);
  }
  function stopPolling() {
    S.timers.forEach(clearInterval);
    S.timers = [];
    document.removeEventListener('visibilitychange', onVisible);
  }
  function onVisible() { if (!document.hidden && S.me) { pollChat(); pollOverview(); } }
  async function pollChat() {
    if (document.hidden || !S.me || S.tab !== 'chat' || !S.active || S.room) return;
    const id = S.active;
    try {
      const r = await API.call('msg_list', { conv_id: id, after_id: msgState(id).lastId }).then(res => res, e => { if (e.code === 'AUTH') forceLogin(); throw e; });
      const ms = msgState(id);
      Object.assign(S.users, r.users || {});
      let changed = false;
      (r.plans || []).forEach(p => { if (JSON.stringify(S.plans[p.id]) !== JSON.stringify(p)) changed = true; S.plans[p.id] = p; });
      const seen = new Set(ms.list.map(m => m.id));
      r.messages.forEach(m => { if (!seen.has(m.id)) { ms.list.push(m); changed = true; } });
      ms.lastId = ms.list.length ? ms.list[ms.list.length - 1].id : 0;
      if (changed && S.active === id) { paintMsgs(false); loadOverview().catch(() => {}); }
    } catch (e) { /* next tick retries */ }
  }
  async function pollOverview() {
    if (document.hidden || !S.me) return;
    try {
      await loadOverview();
      if (S.tab === 'chat' && S.active) {
        const c = S.convs.find(x => x.id === S.active);
        if (c && c.unread) { c.unread = 0; updateBadges(); }
      }
    } catch (e) { /* next tick retries */ }
  }

  /* boot */
  async function boot() {
    try {
      const r = await API.call('me');
      S.me = r.user;
      await startApp(false);
    } catch (e) {
      renderAuth('login');
    }
  }

  window.SOLID_APP = { boot };
  boot();
})();
