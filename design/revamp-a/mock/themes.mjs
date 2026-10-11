// Shared bones: only sizes / structure. Each theme gives the look.
export const BASE = `
*{box-sizing:border-box;margin:0;padding:0}

body{-webkit-font-smoothing:antialiased}
button{font:inherit;color:inherit;background:none;border:0;cursor:pointer}
.ic{display:inline-flex;width:15px;height:15px;flex-shrink:0}
.ic svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.top{display:flex;align-items:center;gap:12px}
.mods{display:flex;gap:14px;flex:1}
.title{display:flex;align-items:flex-end;justify-content:space-between;gap:10px}
.acts{display:flex;align-items:center;gap:8px}
.b{display:inline-flex;align-items:center;gap:6px}
.saved{display:inline-flex;align-items:center;gap:4px}
.search{display:flex;align-items:center;gap:8px}
.create{display:flex;align-items:center;justify-content:center;gap:8px;width:100%}
.card{position:relative}
.c-head{display:flex;justify-content:space-between;align-items:center}
.houses{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.houses>div{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.houses .k{display:block}
.note{overflow:hidden;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical}
.info .note{-webkit-line-clamp:unset;display:block}
.ver{display:flex;gap:6px;align-items:baseline;white-space:nowrap;overflow:hidden}
.ver span{overflow:hidden;text-overflow:ellipsis;min-width:0}
.ver em{font-style:normal;flex-shrink:0}
.gear div{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.foot{display:flex;justify-content:space-between;align-items:center}
.more .ic{width:18px;height:18px}
.verrow{display:flex;gap:8px;align-items:stretch}
.v{display:inline-flex;align-items:center;gap:4px}
.lnote{flex:1}
.info-acts{display:flex;justify-content:flex-end;gap:8px}
.dhead{display:flex;justify-content:space-between;align-items:center}
.dn{display:inline-flex;align-items:center;gap:8px}
.grid{display:grid;grid-template-columns:1fr 32px repeat(5,38px);align-items:center}
.grid>span,.grid>b{text-align:center}
.grid .it{text-align:left;min-width:0}
.it small{display:block}
.d{display:flex;flex-direction:column;align-items:center;line-height:1.15}
.crumb{display:flex;align-items:center;gap:8px}
.frame{display:none}
`;

export const THEMES = {
  // 1 — the screen of a camera / monitor: black, frame lines, timecode,
  // a red record light for "new", a green tally for "saved".
  viewfinder: {
    fonts: "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap",
    check: ["500 15px 'Barlow Condensed'", "600 20px 'Barlow Condensed'", "700 15px 'Barlow Condensed'", "400 13px 'Barlow'", "500 13px 'Barlow'", "600 13px 'Barlow'", "400 12px 'DM Mono'", "500 12px 'DM Mono'"],
    css: `
body{background:#060606;color:#ECEAE4;font:400 13px/1.45 Barlow,sans-serif}
.app{padding:14px 16px 40px}
.top{padding:6px 0 12px;border-bottom:1px solid #1E1E1D;font:500 11px 'DM Mono',monospace;letter-spacing:.08em;text-transform:uppercase;color:#8B8983}
.brand{display:flex;align-items:center;gap:7px;color:#ECEAE4}
.mark{width:9px;height:9px;border-radius:50%;background:#FF3B30;box-shadow:0 0 8px #FF3B30}
.word{font:700 15px 'Barlow Condensed',sans-serif;letter-spacing:.14em}
.mods a.on{color:#ECEAE4;border-bottom:1px solid #ECEAE4;padding-bottom:2px}
.me{width:24px;height:24px;border:1px solid #3A3936;border-radius:50%;display:grid;place-items:center;font-size:9px;color:#ECEAE4}
.title{margin:20px 0 14px}
h1{font:600 30px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.02em}
.ls h1{font-size:28px;line-height:1.05}
.saved{font:500 10px 'DM Mono',monospace;letter-spacing:.08em;text-transform:uppercase;color:#2BD46E}
.saved .ic{width:11px;height:11px}
.b{border:1px solid #33322F;padding:7px 10px;font:500 12px Barlow,sans-serif;color:#ECEAE4}
.b.icon{padding:7px}
.b.primary{background:#ECEAE4;color:#060606;border-color:#ECEAE4}
.search{border-bottom:1px solid #33322F;padding:10px 2px;color:#6F6D67;margin-bottom:12px}
.create{border:1px solid #33322F;padding:12px;font:600 14px 'Barlow Condensed',sans-serif;letter-spacing:.12em;text-transform:uppercase;margin-bottom:22px}
.create .ic{color:#fff;background:#FF3B30;border-radius:50%;width:20px;height:20px;padding:4px}
.cards{display:flex;flex-direction:column;gap:22px}
.card{padding:16px 16px 12px}
.frame{display:block;position:absolute;inset:0;pointer-events:none;
  background:
   linear-gradient(#5A5852,#5A5852) 0 0/14px 1px no-repeat, linear-gradient(#5A5852,#5A5852) 0 0/1px 14px no-repeat,
   linear-gradient(#5A5852,#5A5852) 100% 0/14px 1px no-repeat, linear-gradient(#5A5852,#5A5852) 100% 0/1px 14px no-repeat,
   linear-gradient(#5A5852,#5A5852) 0 100%/14px 1px no-repeat, linear-gradient(#5A5852,#5A5852) 0 100%/1px 14px no-repeat,
   linear-gradient(#5A5852,#5A5852) 100% 100%/14px 1px no-repeat, linear-gradient(#5A5852,#5A5852) 100% 100%/1px 14px no-repeat}
.num{font:400 10px 'DM Mono',monospace;color:#6F6D67;letter-spacing:.1em}
.num::before{content:"LIST ";}
.tag{font:500 10px 'DM Mono',monospace;letter-spacing:.1em;border:1px solid #6F6D67;padding:1px 6px;color:#ECEAE4}
h2{font:600 21px/1.08 'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.01em;margin:6px 0 4px}
.dates{font:400 12px 'DM Mono',monospace;color:#FFB547;letter-spacing:.04em;margin-bottom:10px}
.noproj{font:500 10px 'DM Mono',monospace;letter-spacing:.1em;text-transform:uppercase;color:#6F6D67;margin-bottom:8px}
.houses{font-size:12.5px;color:#B5B3AD;margin-bottom:8px}
.houses b{color:#ECEAE4;font-weight:600}
.houses .k{font:400 9.5px 'DM Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:#6F6D67}
.note{color:#8B8983;font-size:12.5px;margin-bottom:6px}
.ver{font-size:12.5px;color:#B5B3AD;margin-bottom:6px}
.ver b{font:500 11px 'DM Mono',monospace;color:#060606;background:#ECEAE4;padding:0 4px}
.ver em{color:#6F6D67;font-size:11.5px}
.locs{font-size:12.5px;color:#ECEAE4;margin-bottom:6px}
.gear{font:400 11px 'DM Mono',monospace;color:#7E7C76;line-height:1.6;border-top:1px dashed #262624;padding-top:6px}
.foot{margin-top:6px;color:#8B8983}
.warn{font:500 11px 'DM Mono',monospace;color:#FFB547}
.crumb{font:500 10.5px 'DM Mono',monospace;letter-spacing:.1em;text-transform:uppercase;color:#8B8983;margin-top:18px}
.row2{margin:10px 0 16px;justify-content:flex-end}
.row2 .dates{margin:0 auto 0 0}
.info{border:1px solid #262624;padding:14px;margin-bottom:12px;position:relative}
.info .note{font-size:12.5px;line-height:1.5;margin:10px 0 12px;color:#B5B3AD}
.v{border:1px solid #ECEAE4;padding:0 10px;font:500 13px 'DM Mono',monospace}
.lnote{border-bottom:1px solid #33322F;padding:8px 2px;color:#B5B3AD}
.ls .search{margin:12px 0 18px}
.dept{margin-bottom:22px}
.dhead{font:600 15px 'Barlow Condensed',sans-serif;letter-spacing:.12em;text-transform:uppercase;padding:8px 0;border-top:2px solid #ECEAE4}
.cnt{font:400 10px 'DM Mono',monospace;color:#6F6D67;letter-spacing:.08em}
.gh{font:500 9.5px 'DM Mono',monospace;letter-spacing:.08em;text-transform:uppercase;color:#6F6D67;padding:6px 0;border-bottom:1px solid #262624}
.gh small{font-size:8.5px;color:#4D4C48}
.sub{font:500 10px 'DM Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:#FFB547;padding:10px 0 4px}
.row{padding:7px 0;border-bottom:1px solid #161615}
.nm{font-weight:600}
.it small{font-size:11px;color:#6F6D67}
.mx{font:500 13px 'DM Mono',monospace;color:#4D4C48}.mx.on{color:#FF3B30}
.q{font:400 13px 'DM Mono',monospace;color:#3A3936}.q.on{color:#ECEAE4}
`,
  },
  // 2 — a printed magazine index: warm paper, a serif display face, hairline
  // rules, every list numbered in the margin.
  editorial: {
    fonts: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400&family=Instrument+Sans:wght@400;500;600;700&display=swap",
    check: ["400 22px Fraunces", "600 22px Fraunces", "italic 400 13px Fraunces", "400 13px 'Instrument Sans'", "500 13px 'Instrument Sans'", "600 13px 'Instrument Sans'", "700 13px 'Instrument Sans'"],
    css: `
body{background:#F2EDE3;color:#1A1815;font:400 13px/1.45 'Instrument Sans',sans-serif}
.app{padding:12px 18px 40px}
.top{padding:4px 0 10px;border-bottom:2px solid #1A1815}
.mark{display:none}
.word{font:600 20px Fraunces,serif;letter-spacing:.02em}
.mods{justify-content:flex-end;font:500 11px 'Instrument Sans',sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#7A7266}
.mods a.on{color:#1A1815;text-decoration:underline;text-underline-offset:4px}
.me{display:none}
.title{margin:22px 0 14px;align-items:baseline}
h1{font:400 36px/1 Fraunces,serif;letter-spacing:-.01em}
.ls h1{font-size:30px;line-height:1.08}
.saved{font-size:11px;color:#2F6B45}
.saved .ic{width:12px;height:12px}
.b{font:500 12.5px 'Instrument Sans',sans-serif;border-bottom:1px solid #1A1815;padding:2px 0}
.b.icon{border:0}
.b.primary{background:#1A1815;color:#F2EDE3;padding:8px 12px;border:0}
.search{border:1px solid #CFC6B6;background:#FAF7F1;padding:10px 12px;color:#9A9285;margin-bottom:10px}
.create{background:#1A1815;color:#F2EDE3;padding:12px;font:600 13px 'Instrument Sans',sans-serif;letter-spacing:.04em;margin-bottom:12px}
.cards{counter-reset:n;border-top:1px solid #1A1815}
.card{display:grid;grid-template-columns:34px minmax(0,1fr);column-gap:10px;padding:16px 0 12px;border-bottom:1px solid #CFC6B6}
.card>*{grid-column:2}
.c-head{grid-column:1;grid-row:1/span 3;flex-direction:column;align-items:flex-start;gap:8px}
.num{font:400 26px/1 Fraunces,serif;color:#B5AB99}
.tag{font:600 9.5px 'Instrument Sans',sans-serif;letter-spacing:.1em;border:1px solid #1A1815;border-radius:20px;padding:2px 5px}
h2{font:600 21px/1.12 Fraunces,serif;letter-spacing:-.01em}
.dates{font:italic 400 14px Fraunces,serif;color:#7A7266;margin:2px 0 8px}
.noproj{font:italic 400 14px Fraunces,serif;color:#7A7266;margin:2px 0 8px}
.houses{font-size:12.5px;margin-bottom:6px;color:#4A453D}
.houses b{color:#1A1815;font-weight:600}
.houses .k{font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:#9A9285}
.note{font:italic 400 13.5px Fraunces,serif;color:#4A453D;margin-bottom:6px}
.ver{font-size:12.5px;color:#4A453D;margin-bottom:6px}
.ver b{font-weight:700;color:#8A3B1E}
.ver em{color:#9A9285}
.locs{font-size:12.5px;margin-bottom:6px}
.gear{font-size:11.5px;color:#7A7266;line-height:1.6}
.foot{margin-top:4px;color:#7A7266}
.warn{font-size:11.5px;color:#8A3B1E;font-weight:600}
.crumb{font:500 11px 'Instrument Sans',sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#7A7266;margin-top:18px}
.crumb .tag{font-size:9px}
.ls .title{margin:8px 0 8px}
.row2{margin:0 0 16px;gap:12px}
.row2 .dates{margin:0 auto 0 0}
.info{border-top:1px solid #1A1815;border-bottom:1px solid #1A1815;padding:12px 0;margin-bottom:12px}
.info .note{font-size:14px;line-height:1.5;margin:10px 0 12px}
.info-acts{gap:14px;align-items:center}
.v{border:1px solid #1A1815;padding:0 10px;font:600 13px 'Instrument Sans',sans-serif}
.lnote{font:italic 400 14px Fraunces,serif;padding:7px 0;border-bottom:1px solid #CFC6B6;color:#4A453D}
.ls .search{margin:14px 0 20px}
.dept{margin-bottom:24px}
.dhead{border-bottom:2px solid #1A1815;padding-bottom:6px}
.dn{font:400 26px/1 Fraunces,serif}
.dn .ic{width:16px;height:16px}
.cnt{font-size:11px;color:#9A9285}
.gh{font:600 9.5px 'Instrument Sans',sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#9A9285;padding:6px 0;border-bottom:1px solid #CFC6B6}
.gh small{font-weight:400;letter-spacing:0}
.sub{font:italic 400 15px Fraunces,serif;color:#8A3B1E;padding:10px 0 2px}
.row{padding:7px 0;border-bottom:1px solid #E0D8CA}
.nm{font-weight:600}
.it small{font-size:11px;color:#9A9285}
.mx,.q{font:500 13px 'Instrument Sans',sans-serif;font-variant-numeric:tabular-nums}
.mx{color:#C9BFAE}.mx.on{color:#8A3B1E;font-weight:700}
.q{color:#CFC6B6}.q.on{color:#1A1815;font-weight:600}
`,
  },
  // 3 — frosted glass over colour: floating panels, a segmented switch,
  // soft rounded chips; still all the information.
  glass: {
    fonts: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
    check: ["400 13px 'Plus Jakarta Sans'", "500 13px 'Plus Jakarta Sans'", "600 13px 'Plus Jakarta Sans'", "700 13px 'Plus Jakarta Sans'", "800 13px 'Plus Jakarta Sans'"],
    css: `
body{color:#fff;font:500 13px/1.45 'Plus Jakarta Sans',sans-serif;
  background:radial-gradient(60% 40% at 0% 0%,#5B3DF5aa,transparent 70%),radial-gradient(50% 35% at 100% 30%,#00B3A499,transparent 70%),radial-gradient(60% 40% at 30% 85%,#FF4F8B88,transparent 70%),#0A0B1E;background-attachment:fixed;min-height:100vh}
.app{padding:12px 14px 40px}
.top{background:rgba(255,255,255,.10);backdrop-filter:blur(20px) saturate(150%);border:1px solid rgba(255,255,255,.16);border-radius:18px;padding:6px 6px 6px 12px}
.mark{width:14px;height:14px;border-radius:5px;background:linear-gradient(135deg,#FFD25F,#FF4F8B);display:inline-block;margin-right:6px}
.brand{display:flex;align-items:center}
.word{font:800 14px 'Plus Jakarta Sans',sans-serif;letter-spacing:.04em}
.mods{gap:0;background:rgba(0,0,0,.25);border-radius:12px;padding:3px;flex:0 1 auto;margin-left:auto}
.mods a{padding:5px 9px;border-radius:9px;font-size:11.5px;font-weight:600;color:rgba(255,255,255,.7)}
.mods a.on{background:#fff;color:#14152B}
.me{width:28px;height:28px;border-radius:10px;background:rgba(255,255,255,.18);display:grid;place-items:center;font-size:10px;font-weight:700}
.title{margin:20px 2px 12px}
h1{font:800 28px/1.05 'Plus Jakarta Sans',sans-serif;letter-spacing:-.02em}
.ls h1{font-size:24px}
.saved{font-size:11px;color:#7CF5C4;background:rgba(124,245,196,.12);padding:4px 8px;border-radius:20px}
.saved .ic{width:11px;height:11px}
.b{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.18);padding:7px 11px;border-radius:12px;font-weight:600;font-size:12px;backdrop-filter:blur(12px)}
.b.icon{padding:7px}
.b.primary{background:#fff;color:#14152B;border-color:#fff}
.search{background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:11px 14px;color:rgba(255,255,255,.6);margin-bottom:10px;backdrop-filter:blur(16px)}
.create{background:linear-gradient(135deg,#FFD25F,#FF4F8B 55%,#7A5CFF);color:#14152B;border-radius:16px;padding:13px;font-weight:800;font-size:14px;margin-bottom:16px;box-shadow:0 10px 30px rgba(255,79,139,.35)}
.cards{display:flex;flex-direction:column;gap:12px}
.card{background:rgba(255,255,255,.09);backdrop-filter:blur(22px) saturate(140%);border:1px solid rgba(255,255,255,.14);border-radius:22px;padding:14px 16px 10px}
.num{display:none}
.c-head{position:absolute;right:14px;top:14px}
.tag{font-size:10px;font-weight:800;padding:3px 8px;border-radius:20px;background:linear-gradient(135deg,#7A5CFF,#00B3A4)}
h2{font:700 17px/1.2 'Plus Jakarta Sans',sans-serif;letter-spacing:-.01em;padding-right:44px}
.dates{display:inline-block;font-size:11.5px;font-weight:700;color:#14152B;background:#FFD25F;border-radius:20px;padding:1px 8px;margin:6px 0 10px}
.noproj{display:inline-block;font-size:11px;font-weight:700;background:rgba(255,255,255,.18);border-radius:20px;padding:1px 8px;margin:6px 0 10px}
.houses{font-size:12px;color:rgba(255,255,255,.75);margin-bottom:8px}
.houses b{color:#fff}
.houses .k{font-size:9.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.45)}
.note{font-size:12.5px;color:rgba(255,255,255,.7);margin-bottom:6px}
.ver{font-size:12.5px;color:rgba(255,255,255,.8);margin-bottom:6px}
.ver b{background:#fff;color:#14152B;border-radius:6px;padding:0 5px;font-size:11px}
.ver em{color:rgba(255,255,255,.5)}
.locs{font-size:12.5px;margin-bottom:8px}
.gear{font-size:11.5px;color:rgba(255,255,255,.6);background:rgba(0,0,0,.18);border-radius:12px;padding:6px 10px;line-height:1.6}
.foot{margin-top:6px}
.warn{font-size:11.5px;font-weight:700;color:#FFD25F}
.crumb{margin-top:18px;font-size:12px;font-weight:600;color:rgba(255,255,255,.65)}
.row2{margin:10px 0 14px;justify-content:flex-end}
.row2 .dates{margin:0 auto 0 0}
.info{background:rgba(255,255,255,.09);backdrop-filter:blur(22px);border:1px solid rgba(255,255,255,.14);border-radius:22px;padding:14px 16px;margin-bottom:10px}
.info .note{margin:10px 0 12px;font-size:12.5px;line-height:1.5;color:rgba(255,255,255,.8)}
.v{background:#fff;color:#14152B;border-radius:12px;padding:0 12px;font-weight:800}
.lnote{background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:8px 12px;color:rgba(255,255,255,.85)}
.ls .search{margin:10px 0 14px}
.dept{background:rgba(255,255,255,.08);backdrop-filter:blur(22px);border:1px solid rgba(255,255,255,.14);border-radius:22px;padding:10px 12px 8px;margin-bottom:12px}
.dhead{padding:2px 2px 8px}
.dn{font-weight:800;font-size:16px}
.cnt{font-size:11px;color:rgba(255,255,255,.5)}
.gh{font-size:9.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:rgba(255,255,255,.5);padding:4px 0 6px}
.gh small{font-weight:500;letter-spacing:0}
.sub{font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#7CF5C4;padding:8px 2px 4px}
.row{padding:4px 0}
.nm{font-weight:700}
.it small{font-size:11px;color:rgba(255,255,255,.5)}
.mx{font-weight:800;color:rgba(255,255,255,.3)}.mx.on{color:#FFD25F}
.q{margin:0 auto;width:30px;height:28px;line-height:28px;border-radius:9px;background:rgba(255,255,255,.06);color:rgba(255,255,255,.3);font-weight:700}
.q.on{background:rgba(255,255,255,.92);color:#14152B}
`,
  },
};
