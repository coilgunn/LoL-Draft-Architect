// =========================================================================
// 16B. TEAM ROSTER & PLAYER CHAMPION POOLS ENGINE + BULK IMPORTER
// =========================================================================
function getChampionRosterOwners(champName) {
  if (!STATE.teamRoster) return [];
  const owners = [];
  STATE.teamRoster.forEach(player => {
    const found = player.picks.find(pk => pk.champ === champName);
    if (found) {
      owners.push({
        role: player.role,
        playerName: player.playerName,
        tier: found.tier
      });
    }
  });
  return owners;
}

function renderChampionRosterBadgeHtml(champName) {
  const owners = getChampionRosterOwners(champName);
  if (owners.length === 0) return '';
  const isFlex = owners.length >= 2;
  const bestTier = owners.some(o => o.tier === 'S') ? 'S' : owners.some(o => o.tier === 'A') ? 'A' : 'B';
  const tierCls = bestTier === 'S'
    ? 'bg-amber-500/20 text-amber-200 border-amber-400/50'
    : bestTier === 'A'
      ? 'bg-sky-500/20 text-sky-200 border-sky-400/40'
      : 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30';

  const namesText = owners.map(o => `${o.playerName} (${o.tier})`).join(', ');
  return `
    <div class="text-[9px] px-1.5 py-0.5 rounded border truncate font-semibold ${tierCls}" title="Maîtrisé par : ${namesText}">
      ${isFlex ? '🔀 FLEX • ' : '⭐ '}${owners.map(o => `${o.role}:${o.tier}`).join(' / ')}
    </div>
  `;
}

function renderRosterPoolsView() {
  const flexBanner = document.getElementById('roster-flex-synergy-banner');
  const grid = document.getElementById('roster-players-grid');
  if (!grid || !STATE.teamRoster) return;

  const champMap = new Map();
  STATE.teamRoster.forEach(player => {
    player.picks.forEach(pk => {
      if (!champMap.has(pk.champ)) champMap.set(pk.champ, []);
      champMap.get(pk.champ).push({ role: player.role, playerName: player.playerName, tier: pk.tier });
    });
  });

  const flexChamps = Array.from(champMap.entries()).filter(([, list]) => list.length >= 2);

  if (flexBanner) {
    flexBanner.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div class="flex items-center gap-2">
          <span class="text-xs font-display font-bold text-amber-200 uppercase tracking-wider">🔀 Flex Picks Détectés dans votre Équipe (${flexChamps.length})</span>
          <span class="text-[11px] text-slate-400">— Idéal pour le First Pick Blue (B1) et les rotations B2-B3 / R1-R2</span>
        </div>
        <span class="text-xs text-slate-400">Manche de référence : <strong class="text-amber-300">Game ${STATE.activeGameIndex + 1}</strong></span>
      </div>
      <div class="flex flex-wrap gap-2">
        ${flexChamps.length > 0 ? flexChamps.map(([chName, owners]) => {
          const st = getChampionDraftStatus(chName);
          const c = getChampionByName(chName);
          const isAvail = st.code === 'AVAILABLE';
          return `
            <div class="px-2.5 py-1.5 rounded-lg border text-xs flex items-center gap-2 ${
              isAvail ? 'bg-[#080d18] border-amber-500/40 text-white' : 'bg-[#070b12] border-rose-500/30 text-slate-400 line-through'
            }">
              <span class="font-bold text-amber-200">${chName}</span>
              ${c ? `<span class="text-[10px] text-slate-400">(${c.subclass} • ${c.dmg})</span>` : ''}
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 font-semibold">
                ${owners.map(o => `${o.playerName} [${o.role}-${o.tier}]`).join(' ↔ ')}
              </span>
            </div>
          `;
        }).join('') : `<span class="text-xs text-slate-400 italic">Ajoutez un même champion (ex. Aurora, Ambessa, Maokai, Poppy) à 2 joueurs différents pour identifier vos Flex Picks.</span>`}
      </div>
    `;
  }

  const roleIcons = { Top: '🛡️', Jungle: '🌲', Mid: '⚡', Bot: '🏹', Support: '✨' };

  grid.className = STATE.rosterRoleVolet === 'ALL'
    ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3'
    : 'grid grid-cols-1 max-w-xl mx-auto gap-3';

  grid.innerHTML = STATE.teamRoster.map((player, pIdx) => {
    if (STATE.rosterRoleVolet !== 'ALL' && player.role !== STATE.rosterRoleVolet) return '';
    const availCount = player.picks.filter(pk => getChampionDraftStatus(pk.champ).code === 'AVAILABLE').length;
    const lockedCount = player.picks.length - availCount;

    const tierGroups = ['S', 'A', 'B'].map(tierKey => {
      const tierLabel = tierKey === 'S' ? '👑 Tier S (Signature / Main)' : tierKey === 'A' ? '🔥 Tier A (Confort / Maîtrisé)' : '🛡️ Tier B (Pocket / Counter)';
      const tierColor = tierKey === 'S' ? 'text-amber-300 border-amber-500/30 bg-amber-500/10' : tierKey === 'A' ? 'text-sky-300 border-sky-500/30 bg-sky-500/10' : 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10';
      const items = player.picks.filter(pk => pk.tier === tierKey);

      return `
        <div class="space-y-1">
          <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>${tierLabel}</span>
            <span>${items.length}</span>
          </div>
          <div class="flex flex-wrap gap-1 min-h-[26px]">
            ${items.length > 0 ? items.map(pk => {
              const st = getChampionDraftStatus(pk.champ);
              const isAvail = st.code === 'AVAILABLE';
              const c = getChampionByName(pk.champ);
              const escaped = pk.champ.replace(/'/g, "\\'");
              return `
                <div class="inline-flex items-center gap-1.5 px-1.5 py-1 rounded-lg border text-[11px] ${
                  isAvail ? tierColor : 'bg-rose-950/30 border-rose-500/40 text-slate-400 line-through'
                }" title="${c ? `${c.subclass} • ${c.dmg} • ${st.label}` : st.label}">
                  ${renderChampAvatarHtml(pk.champ, 'w-5 h-5', 'rounded')}
                  <button onclick="cyclePlayerChampionTier(${pIdx}, '${escaped}')" class="font-bold hover:underline" title="Cliquer pour changer le Tier (S → A → B)">${pk.champ}</button>
                  ${c ? `<span class="text-[9px] opacity-75">(${c.dmg})</span>` : ''}
                  <button onclick="removeChampionFromPlayerPool(${pIdx}, '${escaped}')" class="text-slate-400 hover:text-rose-400 ml-0.5" title="Retirer">✕</button>
                </div>
              `;
            }).join('') : `<span class="text-[10px] text-slate-600 italic">Aucun pick Tier ${tierKey}</span>`}
          </div>
        </div>
      `;
    }).join('');

    const roleChamps = CHAMPIONS.filter(c => c.roles.includes(player.role));
    const otherChamps = CHAMPIONS.filter(c => !c.roles.includes(player.role));

    return `
      <div class="bg-[#0e1626] hex-border rounded-xl p-3.5 flex flex-col justify-between space-y-3">
        <div class="space-y-3">
          <div class="border-b border-slate-800 pb-2.5 space-y-1.5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-display font-bold text-amber-200 uppercase tracking-wider">
                ${roleIcons[player.role] || '⚔️'} ${player.role}
              </span>
              <span class="text-[10px] px-2 py-0.5 rounded font-semibold ${
                availCount <= 2 ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40' : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
              }">
                ${availCount}/${player.picks.length} Dispo (G${STATE.activeGameIndex + 1})
              </span>
            </div>
            <input
              type="text"
              value="${player.playerName}"
              onchange="updateRosterPlayerName(${pIdx}, this.value)"
              placeholder="Pseudo du joueur..."
              class="w-full bg-[#080d18] text-xs font-bold text-white px-2.5 py-1.5 rounded border border-slate-700/80 focus:outline-none focus:border-amber-400"
            />
            ${lockedCount > 0 ? `<div class="text-[10px] text-rose-300">🔒 ${lockedCount} pick(s) consommé(s) ou banni(s) en BO5</div>` : ''}
          </div>

          <div class="space-y-2.5">
            ${tierGroups}
          </div>
        </div>

        <div class="pt-2.5 border-t border-slate-800 space-y-1.5">
          <div class="text-[10px] font-semibold text-slate-400">Ajouter un champion maîtrisé :</div>
          <div class="flex gap-1">
            <select id="roster-add-champ-${pIdx}" class="flex-1 min-w-0 bg-[#080d18] text-[11px] text-slate-200 border border-slate-700 rounded px-1.5 py-1.5">
              <optgroup label="Poste ${player.role} (${roleChamps.length})">
                ${roleChamps.map(c => `<option value="${c.name}">${c.name} (${c.subclass} • ${c.dmg})</option>`).join('')}
              </optgroup>
              <optgroup label="Autres Champions / Flex (${otherChamps.length})">
                ${otherChamps.map(c => `<option value="${c.name}">${c.name} (${c.subclass} • ${c.dmg})</option>`).join('')}
              </optgroup>
            </select>
            <select id="roster-add-tier-${pIdx}" class="bg-[#080d18] text-[11px] font-bold text-amber-200 border border-slate-700 rounded px-1.5 py-1.5">
              <option value="S">S</option>
              <option value="A">A</option>
              <option value="B">B</option>
            </select>
            <button
              onclick="addChampionToPlayerPool(${pIdx})"
              class="px-2.5 py-1.5 rounded text-xs font-bold bg-amber-500/25 hover:bg-amber-500/35 text-amber-200 border border-amber-500/50 transition"
            >
              +
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function updateRosterPlayerName(playerIdx, newName) {
  if (!STATE.teamRoster[playerIdx]) return;
  STATE.teamRoster[playerIdx].playerName = newName.trim() || STATE.teamRoster[playerIdx].role;
  persistState();
  renderAll();
  showToast(`Pseudo mis à jour : ${STATE.teamRoster[playerIdx].playerName}`, 'info');
}

function addChampionToPlayerPool(playerIdx) {
  const player = STATE.teamRoster[playerIdx];
  if (!player) return;
  const champSel = document.getElementById(`roster-add-champ-${playerIdx}`);
  const tierSel  = document.getElementById(`roster-add-tier-${playerIdx}`);
  if (!champSel || !champSel.value) return;
  const champName = champSel.value;
  const tier = tierSel ? tierSel.value : 'A';

  const existing = player.picks.find(p => p.champ === champName);
  if (existing) {
    existing.tier = tier;
  } else {
    player.picks.push({ champ: champName, tier });
  }
  persistState();
  renderAll();
  showToast(`${champName} (Tier ${tier}) ajouté au pool de ${player.playerName}`, 'success');
}

function removeChampionFromPlayerPool(playerIdx, champName) {
  const player = STATE.teamRoster[playerIdx];
  if (!player) return;
  player.picks = player.picks.filter(p => p.champ !== champName);
  persistState();
  renderAll();
}

function cyclePlayerChampionTier(playerIdx, champName) {
  const player = STATE.teamRoster[playerIdx];
  if (!player) return;
  const item = player.picks.find(p => p.champ === champName);
  if (!item) return;
  item.tier = item.tier === 'S' ? 'A' : item.tier === 'A' ? 'B' : 'S';
  persistState();
  renderAll();
}

function resetDefaultTeamRoster() {
  STATE.teamRoster = getDefaultTeamRoster();
  persistState();
  renderAll();
  showToast('Roster et Champion Pools par défaut restaurés', 'success');
}

function matchChampionByFuzzyName(rawToken) {
  if (!rawToken) return null;
  const clean = rawToken.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!clean) return null;
  return CHAMPIONS.find(c => c.id === clean || c.name.toLowerCase() === rawToken.trim().toLowerCase()) || null;
}

function serializeRosterToReadableText() {
  return STATE.teamRoster.map(p => {
    const picksStr = p.picks.map(pk => `${pk.champ} (${pk.tier})`).join(', ');
    return `${p.role} | ${p.playerName} | ${picksStr}`;
  }).join('\n');
}

function openBulkPoolImportModal() {
  const ta = document.getElementById('pool-import-textarea');
  if (ta) ta.value = serializeRosterToReadableText();
  document.getElementById('pool-import-modal').classList.remove('hidden');
}

function closeBulkPoolImportModal() {
  document.getElementById('pool-import-modal').classList.add('hidden');
}

function fillSamplePoolImportText() {
  const ta = document.getElementById('pool-import-textarea');
  if (!ta) return;
  ta.value = [
    "Top | Zeus | K'Sante (S), Ambessa (S), Zaahen (S), Ornn (A), Gwen (A), Jax (B), Camille (B), Rumble (B)",
    "Jungle | Oner | Vi (S), Sejuani (S), Skarner (A), Wukong (A), Lee Sin (A), Nocturne (B), Poppy (B)",
    "Mid | Faker | Aurora (S), Mel (S), Azir (S), Ahri (A), Orianna (A), Locke (B), Sylas (B), Galio (B)",
    "Bot | Gumayusi | Yunara (S), Varus (S), Xayah (A), Jhin (A), Kai'Sa (A), Caitlyn (B), Kalista (B)",
    "Support | Keria | Rell (S), Rakan (S), Braum (A), Renata Glasc (A), Tahm Kench (A), Pyke (B), Bard (B)"
  ].join('\n');
  showToast('Exemple de Champion Pool Pro inséré ! Cliquez sur « Importer les Champion Pools ».', 'info');
}

function handlePoolFileUpload(inputEl) {
  if (!inputEl || !inputEl.files || inputEl.files.length === 0) return;
  const file = inputEl.files[0];
  const reader = new FileReader();
  reader.onload = function(evt) {
    const ta = document.getElementById('pool-import-textarea');
    if (ta && typeof evt.target.result === 'string') {
      ta.value = evt.target.result;
      showToast(`Fichier « ${file.name} » chargé. Cliquez sur « Importer les Champion Pools » pour valider.`, 'info');
    }
  };
  reader.readAsText(file);
}

function applyBulkPoolImport() {
  const ta = document.getElementById('pool-import-textarea');
  const mergeCb = document.getElementById('pool-import-merge-cb');
  if (!ta || !ta.value.trim()) return;
  const rawText = ta.value.trim();
  const shouldMerge = mergeCb ? mergeCb.checked : false;

  if (rawText.startsWith('[') || rawText.startsWith('{')) {
    try {
      const parsed = JSON.parse(rawText);
      const arr = Array.isArray(parsed) ? parsed : parsed.teamRoster;
      if (Array.isArray(arr) && arr.length > 0) {
        STATE.teamRoster = arr;
        syncDecisionTreesFromImportedRoster(true);
        persistState();
        closeBulkPoolImportModal();
        renderAll();
        showToast('Champion Pools JSON importés et synchronisés avec le Simulateur IA !', 'success');
        return;
      }
    } catch (e) {
      // Fall through to text/CSV parser
    }
  }

  const roleAliases = {
    top: 'Top', toplane: 'Top', toplaner: 'Top',
    jungle: 'Jungle', jgl: 'Jungle', jg: 'Jungle', jungler: 'Jungle',
    mid: 'Mid', midlane: 'Mid', midlaner: 'Mid', middle: 'Mid',
    bot: 'Bot', adc: 'Bot', bottom: 'Bot', carry: 'Bot',
    support: 'Support', sup: 'Support', supp: 'Support'
  };

  if (!shouldMerge) {
    STATE.teamRoster.forEach(p => { p.picks = []; });
  }

  let importedCount = 0;
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  lines.forEach((line, lineIdx) => {
    let targetRole = null;
    let playerName = null;
    let champsSegment = line;

    if (line.includes('|')) {
      const parts = line.split('|').map(s => s.trim());
      const rKey = parts[0].toLowerCase().replace(/[^a-z]/g, '');
      if (roleAliases[rKey]) {
        targetRole = roleAliases[rKey];
        if (parts.length >= 3) {
          playerName = parts[1];
          champsSegment = parts.slice(2).join(',');
        } else {
          champsSegment = parts[1];
        }
      }
    } else if (line.includes(':')) {
      const idxColon = line.indexOf(':');
      const prefix = line.slice(0, idxColon).trim();
      const rest   = line.slice(idxColon + 1).trim();
      const rKey = prefix.toLowerCase().replace(/[^a-z]/g, '');
      if (roleAliases[rKey]) {
        targetRole = roleAliases[rKey];
        champsSegment = rest;
      }
    }

    const playerObj = targetRole
      ? STATE.teamRoster.find(p => p.role === targetRole)
      : STATE.teamRoster[lineIdx % 5];

    if (!playerObj) return;
    if (playerName) playerObj.playerName = playerName;

    const tokens = champsSegment.split(/[,;/]+/).map(t => t.trim()).filter(Boolean);
    tokens.forEach(tok => {
      let tier = 'A';
      const tierMatch = tok.match(/\(([SABsab])\)|\[([SABsab])\]|-([SABsab])$/);
      if (tierMatch) {
        tier = (tierMatch[1] || tierMatch[2] || tierMatch[3]).toUpperCase();
      }
      const cleanName = tok.replace(/\([SABsab]\)|\[[SABsab]\]|-[SABsab]$/g, '').trim();
      const matchedChamp = matchChampionByFuzzyName(cleanName);
      if (matchedChamp) {
        const existing = playerObj.picks.find(pk => pk.champ === matchedChamp.name);
        if (existing) {
          existing.tier = tier;
        } else {
          playerObj.picks.push({ champ: matchedChamp.name, tier });
        }
        importedCount++;
      }
    });
  });

  syncDecisionTreesFromImportedRoster(true);
  persistState();
  closeBulkPoolImportModal();
  renderAll();
  showToast(`✅ ${importedCount} champion(s) importés ! Le Simulateur IA et l'Arborescence utilisent désormais vos picks.`, 'success');
}

// Synchronizes Blue (B1 First Pick) and Red (R1-R2 / R5 Last Pick) decision trees with the imported player pools
function syncDecisionTreesFromImportedRoster(silent = false) {
  if (!STATE.teamRoster || STATE.teamRoster.length < 5) return;

  const getRoleChamps = (role) => {
    const pl = STATE.teamRoster.find(p => p.role === role);
    if (!pl || pl.picks.length === 0) return ['Ornn', 'Sejuani', 'Aurora'];
    const sorted = [...pl.picks].sort((a, b) => (a.tier === 'S' ? -1 : b.tier === 'S' ? 1 : a.tier === 'A' ? -1 : 1));
    return sorted.map(pk => pk.champ);
  };

  const topList = getRoleChamps('Top');
  const jglList = getRoleChamps('Jungle');
  const midList = getRoleChamps('Mid');
  const botList = getRoleChamps('Bot');
  const supList = getRoleChamps('Support');

  // Find Flex picks if any
  const allMap = new Map();
  STATE.teamRoster.forEach(p => p.picks.forEach(pk => {
    allMap.set(pk.champ, (allMap.get(pk.champ) || 0) + 1);
  }));
  const flexList = Array.from(allMap.entries()).filter(([, c]) => c >= 2).map(([k]) => k);

  const b1Primary = flexList[0] || topList[0] || midList[0] || "K'Sante";
  const b1Backup  = midList[0] !== b1Primary ? midList[0] : (topList[1] || 'Aurora');
  const b1Third   = botList[0] || 'Yunara';

  STATE.decisionTrees = {
    BLUE: [
      {
        id: 'b-node-1',
        parentId: null,
        type: 'OPENING',
        slot: 'B1 (First Pick)',
        triggerChamp: '',
        actionChamp: b1Primary,
        backupChamp: b1Backup,
        note: `Priorité B1 issue de votre Pool Équipe (${b1Primary}) — sécurise un pick Signature/Flex dès l'ouverture.`
      },
      {
        id: 'b-node-2',
        parentId: 'b-node-1',
        type: 'WHATIF_BAN',
        slot: 'B1 (First Pick)',
        triggerChamp: b1Primary,
        actionChamp: b1Backup,
        backupChamp: b1Third,
        note: `What-If ${b1Primary} est banni : pivot immédiat sur votre 2e pick Signature (${b1Backup}).`
      },
      {
        id: 'b-node-3',
        parentId: 'b-node-2',
        type: 'WHATIF_BAN',
        slot: 'B1 (First Pick)',
        triggerChamp: b1Backup,
        actionChamp: b1Third,
        backupChamp: jglList[0] || 'Sejuani',
        note: `Double What-If (${b1Primary} + ${b1Backup} bannis) : sécuriser le carry Bot (${b1Third}) en B1.`
      },
      {
        id: 'b-node-4',
        parentId: 'b-node-1',
        type: 'OPENING',
        slot: 'B2-B3 (Rotation Phase 1)',
        triggerChamp: '',
        actionChamp: jglList[0] || 'Sejuani',
        backupChamp: jglList[1] || 'Vi',
        note: `Rotation B2-B3 Jungle/Support depuis vos pools : ${jglList[0] || 'Sejuani'} (Backup: ${jglList[1] || 'Vi'}).`
      },
      {
        id: 'b-node-5',
        parentId: 'b-node-4',
        type: 'WHATIF_BAN',
        slot: 'B2-B3 (Rotation Phase 1)',
        triggerChamp: jglList[0] || 'Sejuani',
        actionChamp: jglList[1] || 'Vi',
        backupChamp: jglList[2] || 'Maokai',
        note: `What-If ${jglList[0] || 'Sejuani'} banni : pivoter sur ${jglList[1] || 'Vi'} du pool Jungle.`
      },
      {
        id: 'b-node-6',
        parentId: 'b-node-4',
        type: 'COUNTER_LAST',
        slot: 'B4-B5 (Last Rotation Blue)',
        triggerChamp: '',
        actionChamp: supList[0] || 'Rell',
        backupChamp: supList[1] || 'Braum',
        note: `Clôture B4-B5 Support/Solo depuis votre pool : ${supList[0] || 'Rell'} ou ${supList[1] || 'Braum'}.`
      }
    ],
    RED: [
      {
        id: 'r-node-1',
        parentId: null,
        type: 'OPENING',
        slot: 'R1-R2 (Double Rotation)',
        triggerChamp: '',
        actionChamp: botList[0] || 'Yunara',
        backupChamp: botList[1] || "Kai'Sa",
        note: `Réponse Red R1-R2 avec le pick Signature Bot (${botList[0] || 'Yunara'}) + Jungle (${jglList[0] || 'Vi'}).`
      },
      {
        id: 'r-node-2',
        parentId: 'r-node-1',
        type: 'WHATIF_BAN',
        slot: 'R1-R2 (Double Rotation)',
        triggerChamp: botList[0] || 'Yunara',
        actionChamp: midList[0] || 'Mel',
        backupChamp: botList[1] || 'Varus',
        note: `What-If ${botList[0] || 'Yunara'} est banni ou pris en B1 : pivoter sur ${midList[0] || 'Mel'} (Mid Tier S).`
      },
      {
        id: 'r-node-3',
        parentId: 'r-node-1',
        type: 'OPENING',
        slot: 'R3 (Fin Phase 1)',
        triggerChamp: '',
        actionChamp: supList[0] || 'Rell',
        backupChamp: supList[1] || 'Rakan',
        note: `Verrouiller le Support maîtrisé (${supList[0] || 'Rell'}) en R3 pour garder le R5 Counter-Pick à un solo laner.`
      },
      {
        id: 'r-node-4',
        parentId: 'r-node-1',
        type: 'COUNTER_LAST',
        slot: 'R5 (Last Pick Counter)',
        triggerChamp: '',
        actionChamp: topList[0] || 'Zaahen',
        backupChamp: topList[1] || 'Ambessa',
        note: `Last Pick R5 réservé au Top/Mid de votre équipe : ${topList[0] || 'Zaahen'} ou ${topList[1] || 'Ambessa'}.`
      },
      {
        id: 'r-node-5',
        parentId: 'r-node-4',
        type: 'WHATIF_BAN',
        slot: 'R5 (Last Pick Counter)',
        triggerChamp: topList[0] || 'Zaahen',
        actionChamp: topList[1] || midList[1] || 'Locke',
        backupChamp: topList[2] || 'Gwen',
        note: `What-If ${topList[0] || 'Zaahen'} est banni en Phase 2 : dégainer le Pocket Pick ${topList[1] || 'Locke'} en R5.`
      }
    ]
  };

  persistState();
  if (!silent) {
    renderAll();
    showToast('🌿 Arborescences Blue & Red synchronisées avec les Champion Pools de vos 5 joueurs !', 'success');
  }
}

function setMobileDraftSubView(subView) {
  STATE.mobileDraftSubView = subView;
  renderMobileDraftHelpers();
}

function renderMobileDraftHelpers() {
  const g = STATE.games[STATE.activeGameIndex];
  const stepObj = STATE.selectedSlot.stepObj;
  const pill = document.getElementById('mobile-active-slot-pill');
  if (pill && stepObj) {
    pill.textContent = `${stepObj.code} • ${stepObj.label}`;
  }

  const bCountEl = document.getElementById('mob-blue-count');
  const rCountEl = document.getElementById('mob-red-count');
  if (bCountEl) bCountEl.textContent = `(${g.bluePicks.filter(Boolean).length}/5)`;
  if (rCountEl) rCountEl.textContent = `(${g.redPicks.filter(Boolean).length}/5)`;

  // Mini interactive slots strip so mobile users see both teams' 5 picks while browsing the champion grid
  const strip = document.getElementById('mobile-mini-slots-strip');
  if (strip) {
    const renderMiniTeamRow = (side, picks) => `
      <div class="p-1.5 rounded-lg border ${side === 'BLUE' ? 'bg-[#091326] border-sky-500/35' : 'bg-[#1c0d18] border-rose-500/35'}">
        <div class="text-[10px] font-bold mb-1 ${side === 'BLUE' ? 'text-sky-300' : 'text-rose-300'}">${side === 'BLUE' ? '🔵 Blue Picks' : '🔴 Red Picks'}</div>
        <div class="grid grid-cols-5 gap-1">
          ${picks.map((ch, idx) => {
            const isSel = STATE.selectedSlot.side === side && STATE.selectedSlot.type === 'PICK' && STATE.selectedSlot.index === idx;
            return `
              <button
                onclick="selectDraftSlot('${side}', 'PICK', ${idx})"
                class="py-1 px-0.5 rounded text-[9px] font-bold truncate border ${
                  isSel
                    ? 'bg-amber-500/30 text-amber-200 border-amber-400'
                    : ch
                      ? 'bg-black/40 text-white border-slate-700'
                      : 'bg-black/20 text-slate-500 border-slate-800'
                }"
              >
                ${ch ? ch.slice(0, 5) : `${side[0]}${idx + 1}`}
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
    strip.innerHTML = renderMiniTeamRow('BLUE', g.bluePicks) + renderMiniTeamRow('RED', g.redPicks);
  }

  // Update mobile sub-tab button styles
  const tabs = [
    { id: 'mob-draft-tab-pool', key: 'POOL' },
    { id: 'mob-draft-tab-blue', key: 'BLUE' },
    { id: 'mob-draft-tab-red',  key: 'RED'  },
    { id: 'mob-draft-tab-all',  key: 'ALL'  }
  ];
  tabs.forEach(t => {
    const el = document.getElementById(t.id);
    if (!el) return;
    const active = STATE.mobileDraftSubView === t.key;
    el.className = `py-2 px-1.5 rounded-lg text-[11px] font-bold text-center border transition ${
      active
        ? 'bg-amber-500/25 text-amber-200 border-amber-400'
        : 'bg-[#080d18] text-slate-400 border-slate-800'
    }`;
  });

  // Responsive visibility on < 1024px (lg:block always overrides hidden on desktop!)
  const colBlue = document.getElementById('draft-col-blue');
  const colPool = document.getElementById('draft-col-pool');
  const colRed  = document.getElementById('draft-col-red');
  const mode = STATE.mobileDraftSubView || 'POOL';

  if (colBlue) {
    colBlue.className = `${mode === 'BLUE' || mode === 'ALL' ? 'block' : 'hidden'} lg:block lg:col-span-3 bg-[#0c1424] border border-sky-500/35 rounded-xl p-3 blue-glow space-y-3`;
  }
  if (colPool) {
    colPool.className = `${mode === 'POOL' || mode === 'ALL' ? 'block' : 'hidden'} lg:block lg:col-span-6 bg-[#0e1626] hex-border rounded-xl p-3 space-y-3`;
  }
  if (colRed) {
    colRed.className = `${mode === 'RED' || mode === 'ALL' ? 'block' : 'hidden'} lg:block lg:col-span-3 bg-[#190d16] border border-rose-500/35 rounded-xl p-3 red-glow space-y-3`;
  }
}

function exportRosterPoolsToFile() {
  const data = JSON.stringify({ teamRoster: STATE.teamRoster }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'lol_team_champion_pools.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Champion Pools exportés (.json)', 'success');
}
