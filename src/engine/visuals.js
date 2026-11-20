// =========================================================================
// 2B. VISUAL PORTRAITS (DATA DRAGON + SVG HEXTECH FALLBACK) & SVG RADAR
// =========================================================================
const DDRAGON_SPECIAL_KEYS = {
  "Aurelion Sol": "AurelionSol",
  "Bel'Veth": "Belveth",
  "Cho'Gath": "Chogath",
  "Dr. Mundo": "DrMundo",
  "Jarvan IV": "JarvanIV",
  "K'Sante": "KSante",
  "Kai'Sa": "Kaisa",
  "Kha'Zix": "Khazix",
  "Kog'Maw": "KogMaw",
  "LeBlanc": "Leblanc",
  "Lee Sin": "LeeSin",
  "Master Yi": "MasterYi",
  "Miss Fortune": "MissFortune",
  "Nunu & Willump": "Nunu",
  "Rek'Sai": "RekSai",
  "Renata Glasc": "Renata",
  "Tahm Kench": "TahmKench",
  "Twisted Fate": "TwistedFate",
  "Vel'Koz": "Velkoz",
  "Wukong": "MonkeyKing",
  "Xin Zhao": "XinZhao"
};

function getChampionDDragonUrl(champName) {
  if (!champName) return '';
  const key = DDRAGON_SPECIAL_KEYS[champName] || champName.replace(/[^a-zA-Z0-9]/g, '');
  return `https://ddragon.leagueoflegends.com/cdn/14.23.1/img/champion/${key}.png`;
}

function getChampionFallbackSvgDataUri(champName, subclass) {
  const initials = (champName || 'LoL').slice(0, 2).toUpperCase();
  const palette = {
    Vanguard: ['#065f46', '#34d399'],
    Warden: ['#115e59', '#2dd4bf'],
    Juggernaut: ['#78350f', '#fbbf24'],
    Diver: ['#7c2d12', '#fb923c'],
    Assassin: ['#881337', '#fb7185'],
    Skirmisher: ['#831843', '#f472b6'],
    Burst: ['#0c4a6e', '#38bdf8'],
    Battlemage: ['#312e81', '#818cf8'],
    Artillery: ['#164e63', '#22d3ee'],
    Enchanter: ['#365314', '#a3e635'],
    Catcher: ['#14532d', '#4ade80'],
    Marksman: ['#713f12', '#facc15'],
    Specialist: ['#581c87', '#c084fc']
  }[subclass] || ['#1e293b', '#c8aa6e'];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${palette[0]}"/><stop offset="100%" stop-color="#070b14"/></linearGradient></defs><rect width="64" height="64" rx="12" fill="url(#g)"/><polygon points="32,5 57,19 57,45 32,59 7,45 7,19" fill="none" stroke="${palette[1]}" stroke-width="2" opacity="0.55"/><text x="32" y="38" text-anchor="middle" fill="#f8fafc" font-family="Cinzel,serif" font-weight="bold" font-size="20">${initials}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function renderChampAvatarHtml(champName, sizeCls = 'w-9 h-9', extraCls = 'rounded-lg') {
  const c = getChampionByName(champName);
  if (!c) {
    return `<div class="${sizeCls} ${extraCls} bg-[#0b1324] border border-slate-800 flex items-center justify-center text-slate-600 text-xs font-display">?</div>`;
  }
  const url = getChampionDDragonUrl(c.name);
  const fallback = getChampionFallbackSvgDataUri(c.name, c.subclass);
  return `<img src="${url}" onerror="this.onerror=null;this.src='${fallback}';" alt="${c.name}" class="${sizeCls} ${extraCls} object-cover border border-amber-500/40 shrink-0 bg-[#0b1324]" loading="lazy" />`;
}

// Generates a 5-axis SVG Radar Chart for a team composition (Frontline, Engage, Peel, DPS, Burst/Pick)
function renderTeamRadarSvg(picksArray, sideColor = '#38bdf8') {
  const champs = picksArray.filter(Boolean).map(getChampionByName).filter(Boolean);
  let frontline = 15, engage = 15, peel = 15, dps = 15, burst = 15;
  champs.forEach(c => {
    if (c.subclass === 'Vanguard')   { frontline += 32; engage += 35; peel += 15; }
    if (c.subclass === 'Warden')     { frontline += 32; peel += 35; engage += 10; }
    if (c.subclass === 'Juggernaut') { frontline += 30; dps += 20; }
    if (c.subclass === 'Diver')      { engage += 30; frontline += 18; burst += 18; }
    if (c.subclass === 'Assassin')   { burst += 38; engage += 12; }
    if (c.subclass === 'Skirmisher') { dps += 32; burst += 18; }
    if (c.subclass === 'Burst')      { burst += 35; engage += 12; }
    if (c.subclass === 'Battlemage') { dps += 32; frontline += 12; }
    if (c.subclass === 'Artillery')  { burst += 28; dps += 22; }
    if (c.subclass === 'Enchanter')  { peel += 38; }
    if (c.subclass === 'Catcher')    { engage += 28; peel += 20; burst += 15; }
    if (c.subclass === 'Marksman')   { dps += 38; }
    if (c.subclass === 'Specialist') { dps += 22; peel += 18; burst += 18; }
  });

  const clamp = v => Math.min(100, Math.max(15, v));
  const vals = [clamp(frontline), clamp(engage), clamp(peel), clamp(dps), clamp(burst)];
  const labels = ['Frontline', 'Engage', 'Peel/Soin', 'DPS Obj.', 'Burst/Pick'];
  const cx = 95, cy = 85, rMax = 54;
  const angles = [-90, -18, 54, 126, 198].map(deg => (deg * Math.PI) / 180);

  const pt = (val, i) => {
    const r = (val / 100) * rMax;
    return `${(cx + r * Math.cos(angles[i])).toFixed(1)},${(cy + r * Math.sin(angles[i])).toFixed(1)}`;
  };

  const gridRings = [0.33, 0.66, 1].map(scale => {
    const pts = angles.map(a => `${(cx + rMax * scale * Math.cos(a)).toFixed(1)},${(cy + rMax * scale * Math.sin(a)).toFixed(1)}`).join(' ');
    return `<polygon points="${pts}" fill="none" stroke="rgba(148,163,184,0.2)" stroke-width="1"/>`;
  }).join('');

  const axesLines = angles.map((a, i) => {
    const x2 = (cx + rMax * Math.cos(a)).toFixed(1);
    const y2 = (cy + rMax * Math.sin(a)).toFixed(1);
    const lx = (cx + (rMax + 20) * Math.cos(a)).toFixed(1);
    const ly = (cy + (rMax + 14) * Math.sin(a)).toFixed(1);
    return `
      <line x1="${cx}" y1="${cy}" x2="${x2}" y2="${y2}" stroke="rgba(148,163,184,0.22)" stroke-width="1"/>
      <text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" fill="#cbd5e1" font-size="8.5" font-weight="600">${labels[i]}</text>
    `;
  }).join('');

  const polyPts = vals.map((v, i) => pt(v, i)).join(' ');

  return `
    <svg viewBox="0 0 190 170" class="w-full max-w-[210px] mx-auto select-none">
      ${gridRings}
      ${axesLines}
      <polygon points="${polyPts}" fill="${sideColor}" fill-opacity="0.28" stroke="${sideColor}" stroke-width="2"/>
      ${vals.map((v, i) => {
        const [px, py] = pt(v, i).split(',');
        return `<circle cx="${px}" cy="${py}" r="3" fill="${sideColor}" />`;
      }).join('')}
    </svg>
  `;
}
