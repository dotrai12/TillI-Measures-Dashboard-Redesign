/* ============================================================
   Flower band — the signature bottom scenery from image 1.
   Renders flat brand-colour flowers, tulips and sprouts on a
   green ground with a soft wash, each gently swaying.
   Exposes window.renderFlowerBand(el).
   ============================================================ */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const PETALS = ['#E866B0', '#26BDE2', '#FCC30B', '#E91E8C'];
  const GY = 196; // ground y

  /* One fixed size per plant category so every plant of a kind shares the
     same stem height and head size (colours still vary). Heights are kept
     low enough that heads never clip against the top of the band on wide
     screens. Per-spec h/scale below are ignored in favour of these. */
  const PROFILE = {
    flower: { h: 102, scale: 1.0 }, // full-bloom flowers — tallest
    tulip:  { h: 78,  scale: 1.0 }, // buds — medium
    sprout: { h: 42,  scale: 1.0 }, // no flower / bud — shortest
  };

  function el(name, attrs, children) {
    const node = document.createElementNS(NS, name);
    for (const k in attrs) {
      if (k === 'className') node.setAttribute('class', attrs[k]);
      else if (k === 'style') node.setAttribute('style', attrs[k]);
      else node.setAttribute(k, attrs[k]);
    }
    (children || []).forEach((c) => c && node.appendChild(c));
    return node;
  }

  function head(cx, cy, petal, kind, scale) {
    if (kind === 'tulip') {
      const w = 14 * scale, hh = 26 * scale;
      return el('g', {}, [
        el('path', {
          d: `M ${cx - w} ${cy + 4 * scale} C ${cx - w} ${cy - hh * 0.55} ${cx - w * 0.55} ${cy - hh} ${cx} ${cy - hh} C ${cx + w * 0.55} ${cy - hh} ${cx + w} ${cy - hh * 0.55} ${cx + w} ${cy + 4 * scale} C ${cx + w * 0.6} ${cy + 12 * scale} ${cx - w * 0.6} ${cy + 12 * scale} ${cx - w} ${cy + 4 * scale} Z`,
          fill: petal,
        }),
        el('path', {
          d: `M ${cx} ${cy - hh} C ${cx - w * 0.34} ${cy - hh * 0.4} ${cx - w * 0.34} ${cy + 4 * scale} ${cx} ${cy + 9 * scale} C ${cx + w * 0.34} ${cy + 4 * scale} ${cx + w * 0.34} ${cy - hh * 0.4} ${cx} ${cy - hh} Z`,
          fill: '#fff', opacity: 0.22,
        }),
      ]);
    }
    if (kind === 'sprout') {
      return el('g', {}, [
        el('path', { d: `M ${cx} ${cy + 12 * scale} q -${16 * scale} -${6 * scale} -${20 * scale} -${20 * scale} q ${16 * scale} ${2 * scale} ${20 * scale} ${16 * scale} Z`, fill: '#56C02B' }),
        el('path', { d: `M ${cx} ${cy + 12 * scale} q ${16 * scale} -${6 * scale} ${20 * scale} -${20 * scale} q -${16 * scale} ${2 * scale} -${20 * scale} ${16 * scale} Z`, fill: '#8FD96B' }),
      ]);
    }
    // flower
    const rad = 12 * scale, petals = [];
    for (let i = 0; i < 5; i++) {
      const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      petals.push(el('circle', { cx: cx + Math.cos(a) * rad, cy: cy + Math.sin(a) * rad, r: rad * 0.84, fill: petal }));
    }
    petals.push(el('circle', { cx, cy, r: 6.5 * scale, fill: '#FCC30B' }));
    return el('g', {}, petals);
  }

  function plant(x, groundY, o) {
    const { h, petal, sway, delay, dur, scale = 1, kind = 'flower', lean = 0 } = o;
    const topY = groundY - h, cx = x + lean;
    return el('g', {
      className: 'tm-sway',
      style: `animation:${sway} ${dur}s ease-in-out ${delay}s infinite alternate`,
    }, [
      el('path', { d: `M ${x} ${groundY} C ${x - 3} ${groundY - h * 0.45} ${cx + 3} ${topY + h * 0.35} ${cx} ${topY}`, stroke: '#56C02B', 'stroke-width': 3.6 * scale, fill: 'none', 'stroke-linecap': 'round' }),
      el('path', { d: `M ${x - 1} ${groundY - h * 0.4} q -${19 * scale} -${5 * scale} -${25 * scale} ${9 * scale} q ${15 * scale} ${4 * scale} ${25 * scale} -${9 * scale} Z`, fill: '#56C02B' }),
      el('path', { d: `M ${x + 1} ${groundY - h * 0.62} q ${17 * scale} -${6 * scale} ${23 * scale} ${8 * scale} q -${14 * scale} ${4 * scale} -${23 * scale} -${8 * scale} Z`, fill: '#3F9E1D' }),
      el('g', {}, [head(cx, topY, petal, kind, scale)]),
    ]);
  }

  const SPECS = [
    [60, { h: 96, kind: 'flower', scale: 1.05, sway: 'swayA', dur: 4.4, delay: 0, lean: 2 }],
    [136, { h: 54, kind: 'sprout', scale: 1, sway: 'swayC', dur: 3.6, delay: 0.6 }],
    [212, { h: 118, kind: 'tulip', scale: 1.1, sway: 'swayB', dur: 5.1, delay: 0.3, lean: -3 }],
    [288, { h: 68, kind: 'flower', scale: 0.85, sway: 'swayC', dur: 4.0, delay: 1.1 }],
    [372, { h: 104, kind: 'flower', scale: 1.12, sway: 'swayA', dur: 4.8, delay: 0.2, lean: 3 }],
    [446, { h: 48, kind: 'sprout', scale: 0.95, sway: 'swayB', dur: 3.4, delay: 0.9 }],
    [524, { h: 128, kind: 'flower', scale: 1.18, sway: 'swayB', dur: 5.4, delay: 0.5, lean: -2 }],
    [608, { h: 72, kind: 'tulip', scale: 0.95, sway: 'swayC', dur: 4.2, delay: 1.3 }],
    [686, { h: 98, kind: 'flower', scale: 1.05, sway: 'swayA', dur: 4.6, delay: 0.15, lean: 2 }],
    [760, { h: 44, kind: 'sprout', scale: 1, sway: 'swayC', dur: 3.2, delay: 0.7 }],
    [832, { h: 116, kind: 'flower', scale: 1.14, sway: 'swayB', dur: 5.2, delay: 0.4, lean: -3 }],
    [912, { h: 62, kind: 'tulip', scale: 0.9, sway: 'swayA', dur: 3.9, delay: 1.0 }],
    [986, { h: 104, kind: 'flower', scale: 1.08, sway: 'swayC', dur: 4.9, delay: 0.25, lean: 2 }],
    [1062, { h: 50, kind: 'sprout', scale: 1.05, sway: 'swayB', dur: 3.5, delay: 0.8 }],
    [1132, { h: 90, kind: 'flower', scale: 1, sway: 'swayA', dur: 4.5, delay: 0.55 }],
    [1206, { h: 60, kind: 'tulip', scale: 0.92, sway: 'swayC', dur: 4.1, delay: 1.2, lean: 2 }],
    [1280, { h: 110, kind: 'flower', scale: 1.1, sway: 'swayB', dur: 5.0, delay: 0.35, lean: -2 }],
    [1360, { h: 46, kind: 'sprout', scale: 1, sway: 'swayA', dur: 3.3, delay: 0.95 }],
  ];

  window.renderFlowerBand = function (target) {
    const svg = el('svg', {
      viewBox: '0 0 1440 240',
      preserveAspectRatio: 'xMidYMax slice',
      style: 'width:100%;height:100%;display:block',
      'aria-hidden': 'true',
    });
    svg.appendChild(el('rect', { x: 0, y: 150, width: 1440, height: 90, fill: '#F1FFEC' }));
    let c = 0;
    const plants = SPECS.map(([x, o]) => {
      const prof = PROFILE[o.kind] || {};
      const spec = Object.assign({}, o, { h: prof.h, scale: prof.scale });
      const petal = spec.kind === 'sprout' ? null : PETALS[c++ % PETALS.length];
      return plant(x, GY, Object.assign({ petal }, spec));
    });
    svg.appendChild(el('g', {}, plants));
    svg.appendChild(el('rect', { x: 0, y: 194, width: 1440, height: 5, fill: '#56C02B' }));
    target.innerHTML = '';
    target.appendChild(svg);
  };

  /* A small, standalone trio (one of each plant kind) on a transparent
     background — a decorative flourish for other screens. Ground-less.
     cfg lets a caller nudge the trio around (see FLOWER_CFG in landing.js). */
  window.renderMiniFlowers = function (target, cfg) {
    if (!target) return;
    cfg = cfg || {};
    const gy = cfg.groundY != null ? cfg.groundY : 128;
    const baseX = cfg.baseX != null ? cfg.baseX : 46;
    const gap = cfg.spacing != null ? cfg.spacing : 86;
    const xs = [baseX, baseX + gap, baseX + gap * 2];
    const trio = [
      { x: xs[0], h: PROFILE.flower.h, scale: PROFILE.flower.scale, kind: 'flower', petal: '#E91E8C', sway: 'swayA', dur: 4.6, delay: 0.1, lean: 2 },
      { x: xs[1], h: PROFILE.tulip.h,  scale: PROFILE.tulip.scale,  kind: 'tulip',  petal: '#FCC30B', sway: 'swayB', dur: 5.0, delay: 0.5, lean: -2 },
      { x: xs[2], h: PROFILE.sprout.h, scale: PROFILE.sprout.scale, kind: 'sprout', petal: null,      sway: 'swayC', dur: 3.6, delay: 0.3 },
    ];
    const svg = el('svg', {
      viewBox: '0 0 264 140', preserveAspectRatio: 'xMidYMax meet',
      style: 'width:100%;height:100%;display:block;overflow:visible', 'aria-hidden': 'true',
    });
    svg.appendChild(el('g', {}, trio.map((o) => plant(o.x, gy, o))));
    target.innerHTML = '';
    target.appendChild(svg);
    // Whole-trio placement is applied on the host element.
    const tx = cfg.offsetX || 0, ty = cfg.offsetY || 0, sc = cfg.scale != null ? cfg.scale : 1;
    target.style.transform = `translate(${tx}px, ${ty}px) scale(${sc})`;
    target.style.transformOrigin = 'top center';
  };

  document.addEventListener('DOMContentLoaded', function () {
    const band = document.getElementById('flower-band');
    if (band) window.renderFlowerBand(band);
  });
})();
