window.Avatar = (function () {
  const SKINS = ['#F5D7BD', '#EBBE98', '#D9A074', '#B9794F', '#8D5A3B', '#5E3A26'];
  const HAIR_COLORS = ['#1F1F1C', '#4A3326', '#7A5230', '#B8862F', '#D96868', '#7C9473', '#ECDFCC', '#3C5A8A'];
  const CLOTH_COLORS = ['#455C36', '#7C9473', '#D96868', '#F8A41E', '#ECDFCC', '#3C3D37', '#3C5A8A', '#F7F7F3'];
  const PANTS = ['#3C3D37', '#3C5A8A', '#8D7B5E', '#697565'];
  const INK = '#3C3D37';

  const OPTIONS = {
    hairStyle: ['Botak', 'Pendek', 'Poni', 'Spike', 'Panjang', 'Kuncir', 'Keriting', 'Hijab'],
    face: ['Senyum', 'Datar', 'Nyengir', 'Kaget'],
    outfit: ['Kaos', 'Hoodie', 'Almamater', 'Kemeja'],
    acc: ['Polos', 'Kacamata', 'Topi', 'Headphone'],
  };

  const DEFAULT = { skin: 1, hairStyle: 1, hairColor: 0, face: 0, outfit: 0, outfitColor: 0, pants: 0, acc: 0 };

  function clampCfg(c) {
    const o = Object.assign({}, DEFAULT, c || {});
    const lim = {
      skin: SKINS.length, hairStyle: OPTIONS.hairStyle.length, hairColor: HAIR_COLORS.length, face: OPTIONS.face.length,
      outfit: OPTIONS.outfit.length, outfitColor: CLOTH_COLORS.length, pants: PANTS.length, acc: OPTIONS.acc.length,
    };
    for (const k in lim) {
      const v = parseInt(o[k], 10);
      o[k] = v >= 0 && v < lim[k] ? v : 0;
    }
    return o;
  }

  function random() {
    const r = n => Math.floor(Math.random() * n);
    return clampCfg({
      skin: r(SKINS.length), hairStyle: r(OPTIONS.hairStyle.length), hairColor: r(HAIR_COLORS.length),
      face: r(OPTIONS.face.length), outfit: r(OPTIONS.outfit.length), outfitColor: r(CLOTH_COLORS.length),
      pants: r(PANTS.length), acc: r(OPTIONS.acc.length),
    });
  }

  const st = `stroke="${INK}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"`;

  function hairBack(style, col) {
    const f = `fill="${col}" ${st}`;
    switch (style) {
      case 4: return `<rect x="33" y="14" width="54" height="52" rx="12" ${f}/>`;
      case 5: return `<rect x="80" y="18" width="15" height="26" rx="7" ${f}/>`;
      case 7: return `<rect x="29" y="4" width="62" height="70" rx="26" ${f}/>`;
      default: return '';
    }
  }

  function hairFront(style, col) {
    const f = `fill="${col}" ${st}`;
    const cap = `<path d="M37 28 V20 Q37 7 60 7 Q83 7 83 20 V28 H78 V21 H42 V28 Z" ${f}/>`;
    switch (style) {
      case 1: return cap;
      case 2: return cap + `<rect x="42" y="14" width="36" height="12" rx="3" ${f}/>`;
      case 3: return `<path d="M37 26 L39 8 L47 17 L53 2 L60 16 L67 2 L73 17 L81 8 L83 26 H78 V21 H42 V26 Z" ${f}/>`;
      case 4: return cap + `<rect x="42" y="14" width="36" height="9" rx="3" ${f}/>`;
      case 5: return cap;
      case 6: return `<g ${f}><circle cx="44" cy="17" r="10"/><circle cx="60" cy="11" r="11"/><circle cx="76" cy="17" r="10"/><circle cx="38" cy="29" r="6"/><circle cx="82" cy="29" r="6"/></g>`;
      case 7: return `<rect x="37" y="10" width="46" height="11" rx="3" ${f}/>`;
      default: return '';
    }
  }

  function face(kind) {
    const eye = `fill="${INK}"`;
    const eyes = `<circle cx="50" cy="35" r="2.8" ${eye}/><circle cx="70" cy="35" r="2.8" ${eye}/>`;
    const line = `fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"`;
    switch (kind) {
      case 1: return eyes + `<path d="M53 47 H67" ${line}/>`;
      case 2: return eyes + `<path d="M50 44 Q60 55 70 44 Z" fill="#fff" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`;
      case 3: return `<circle cx="50" cy="35" r="3.6" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cx="70" cy="35" r="3.6" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cx="50" cy="35" r="1.4" ${eye}/><circle cx="70" cy="35" r="1.4" ${eye}/><ellipse cx="60" cy="48" rx="3" ry="4" fill="${INK}"/>`;
      default: return eyes + `<path d="M52 44 Q60 51 68 44" ${line}/>`;
    }
  }

  function acc(kind, hairCol) {
    switch (kind) {
      case 1: return `<g fill="none" stroke="${INK}" stroke-width="2.5"><rect x="42" y="29" width="15" height="12" rx="4"/><rect x="63" y="29" width="15" height="12" rx="4"/><path d="M57 34 H63"/></g>`;
      case 2: return `<path d="M37 24 Q37 6 60 6 Q83 6 83 24 Z" fill="${INK}" ${st}/><rect x="37" y="21" width="58" height="6" rx="3" fill="${INK}" ${st}/><path d="M58 8 H62" stroke="#D96868" stroke-width="4" stroke-linecap="round"/>`;
      case 3: return `<path d="M36 32 Q36 3 60 3 Q84 3 84 32" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><rect x="30" y="28" width="10" height="18" rx="4" fill="#D96868" ${st}/><rect x="80" y="28" width="10" height="18" rx="4" fill="#D96868" ${st}/>`;
      default: return '';
    }
  }

  function body(cfg) {
    const skin = SKINS[cfg.skin];
    const cloth = CLOTH_COLORS[cfg.outfitColor];
    const pants = PANTS[cfg.pants];
    const f = c => `fill="${c}" ${st}`;
    const light = cfg.outfitColor === 4 || cfg.outfitColor === 7 || cfg.outfitColor === 3;
    const sleeveLong = cfg.outfit !== 0;
    let s = '';
    s += `<rect x="36" y="108" width="24" height="38" rx="5" ${f(pants)}/><rect x="60" y="108" width="24" height="38" rx="5" ${f(pants)}/>`;
    s += `<rect x="35" y="140" width="25" height="10" rx="4" ${f('#F7F7F3')}/><rect x="60" y="140" width="25" height="10" rx="4" ${f('#F7F7F3')}/>`;
    s += `<rect x="17" y="60" width="16" height="46" rx="6" ${f(skin)}/><rect x="87" y="60" width="16" height="46" rx="6" ${f(skin)}/>`;
    const sh = sleeveLong ? 40 : 20;
    s += `<rect x="17" y="60" width="16" height="${sh}" rx="6" ${f(cloth)}/><rect x="87" y="60" width="16" height="${sh}" rx="6" ${f(cloth)}/>`;
    s += `<rect x="34" y="58" width="52" height="52" rx="6" ${f(cloth)}/>`;
    const trim = light ? INK : '#F7F7F3';
    if (cfg.outfit === 1) {
      s += `<path d="M44 58 Q60 76 76 58" fill="${cloth}" ${st}/><path d="M54 70 V84 M66 70 V84" stroke="${trim}" stroke-width="2.5" stroke-linecap="round"/><rect x="46" y="92" width="28" height="12" rx="5" fill="none" stroke="${INK}" stroke-width="2"/>`;
    } else if (cfg.outfit === 2) {
      s += `<path d="M50 58 L60 80 L70 58 Z" fill="#F7F7F3" ${st}/><path d="M50 58 L44 82 L60 80 Z M70 58 L76 82 L60 80 Z" fill="${cloth}" ${st}/><path d="M60 80 V110" stroke="${INK}" stroke-width="2.5"/><rect x="68" y="88" width="12" height="9" rx="2" fill="#D96868" stroke="${INK}" stroke-width="2"/>`;
    } else if (cfg.outfit === 3) {
      s += `<path d="M48 58 L60 72 L72 58" fill="#F7F7F3" ${st}/><path d="M60 72 V110" stroke="${INK}" stroke-width="2"/><circle cx="60" cy="84" r="1.6" fill="${INK}"/><circle cx="60" cy="96" r="1.6" fill="${INK}"/>`;
    } else {
      s += `<path d="M50 58 Q60 66 70 58" fill="${skin}" ${st}/>`;
    }
    return s;
  }

  function svg(input, opts) {
    const cfg = clampCfg(input);
    const hair = HAIR_COLORS[cfg.hairColor];
    const skin = SKINS[cfg.skin];
    const hijab = cfg.hairStyle === 7;
    const headOnly = opts && opts.head;
    const vb = headOnly ? '24 0 72 72' : '0 0 120 156';
    let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" aria-hidden="true">`;
    out += hairBack(cfg.hairStyle, hair);
    out += body(cfg);
    if (hijab) out += `<path d="M31 56 Q60 86 89 56 V70 Q60 92 31 70 Z" fill="${hair}" ${st}/>`;
    out += `<rect x="38" y="10" width="44" height="44" rx="11" fill="${skin}" ${st}/>`;
    out += hairFront(cfg.hairStyle, hair);
    out += face(cfg.face);
    out += acc(cfg.acc, hair);
    return out + '</svg>';
  }

  return { SKINS, HAIR_COLORS, CLOTH_COLORS, PANTS, OPTIONS, DEFAULT, clampCfg, random, svg };
})();
