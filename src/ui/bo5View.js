// =========================================================================
// 14. VIEW 3: FEARLESS BO5 SERIES MATRIX & POOL DEPLETION ANALYTICS
// =========================================================================
function renderBO5SeriesView() {
  const matrix = document.getElementById('bo5-games-matrix');
  if (matrix) {
    matrix.innerHTML = STATE.games.map((g, idx) => {
      const isCurrent = idx === STATE.activeGameIndex;
      const lockedBefore = getFearlessLockedMap(idx).size;
      const blueStats = analyzeTeamComposition(g.bluePicks);
      const redStats  = analyzeTeamComposition(g.redPicks);

      const renderMiniList = (picks, sideColor) => picks.map((p, i) => {
        const c = getChampionByName(p);
        return `
          <div class="flex items-center justify-between text-[11px] py-1 px-1.5 rounded-lg bg-[#070b14] border border-slate-800/80">
            <div class="flex items-center gap-1.5 min-w-0">
              ${c ? renderChampAvatarHtml(c.name, 'w-5 h-5', 'rounded') : `<span class="w-5 h-5 rounded bg-slate-900 inline-block"></span>`}
              <span class="font-semibold truncate ${c ? 'text-white' : 'text-slate-600 italic'}">${sideColor}${i + 1}: ${c ? c.name : 'Vide'}</span>
            </div>
            ${c ? `<span class="text-[10px] text-slate-400 shrink-0">${c.subclass} • ${c.dmg}</span>` : ''}
          </div>
        `;
      }).join('');

      return `
        <div class="rounded-xl p-3 border flex flex-col justify-between space-y-3 ${
          isCurrent ? 'bg-[#121d33] border-amber-400 gold-glow' : 'bg-[#0e1626] border-slate-800'
        }">
          <div class="space-y-2">
            <div class="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <h4 class="font-display font-bold text-sm text-amber-200">GAME ${g.gameNumber}</h4>
                <span class="text-[10px] text-slate-400">Notre Side : <strong class="${g.ourSide === 'BLUE' ? 'text-sky-300' : 'text-rose-300'}">${g.ourSide}</strong></span>
              </div>
              <span class="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold">
                🔒 ${lockedBefore} Fearless
              </span>
            </div>

            <!-- Blue Picks -->
            <div class="space-y-1">
              <div class="flex items-center justify-between text-[11px] font-bold text-sky-300">
                <span>🔵 Blue (B1 First Pick)</span>
                <span>${blueStats.adPct}% AD / ${blueStats.apPct}% AP</span>
              </div>
              ${renderMiniList(g.bluePicks, 'B')}
            </div>

            <!-- Red Picks -->
            <div class="space-y-1 pt-1">
              <div class="flex items-center justify-between text-[11px] font-bold text-rose-300">
                <span>🔴 Red (R5 Last Pick)</span>
                <span>${redStats.adPct}% AD / ${redStats.apPct}% AP</span>
              </div>
              ${renderMiniList(g.redPicks, 'R')}
            </div>
          </div>

          <button
            onclick="selectActiveGame(${idx}); switchMainView('draft');"
            class="w-full py-1.5 rounded-lg text-xs font-bold transition ${
              isCurrent
                ? 'bg-amber-500/30 text-amber-200 border border-amber-400'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }"
          >
            ${isCurrent ? '⚔️ Éditer ce Game (Actif)' : `Ouvrir Game ${g.gameNumber} →`}
          </button>
        </div>
      `;
    }).join('');
  }

  // Cumulative Graveyard up to active game
  const lockedMap = getFearlessLockedMap(STATE.activeGameIndex);
  const countBadge = document.getElementById('bo5-graveyard-count');
  const graveyardList = document.getElementById('bo5-graveyard-list');
  if (countBadge) {
    countBadge.textContent = `${lockedMap.size} champion(s) verrouillé(s) avant Game ${STATE.activeGameIndex + 1}`;
  }
  if (graveyardList) {
    if (lockedMap.size === 0) {
      graveyardList.innerHTML = `<div class="text-xs text-slate-500 py-4">Aucun champion verrouillé avant cette manche (Game 1 ou mode Standard). Sélectionnez Game 2 à 5 ou chargez la Démo BO5.</div>`;
    } else {
      graveyardList.innerHTML = Array.from(lockedMap.entries()).map(([chName, info]) => {
        const c = getChampionByName(chName);
        const subMeta = c ? RIOT_SUBCLASS_MAP[c.subclass] : null;
        return `
          <div class="p-2 rounded-xl bg-[#080d18] border border-rose-500/35 text-xs flex items-center gap-2">
            ${renderChampAvatarHtml(chName, 'w-9 h-9', 'rounded-lg grayscale')}
            <div class="min-w-0">
              <div class="flex items-center gap-1">
                <span class="text-[9px] font-bold px-1 rounded bg-rose-500/25 text-rose-300">G${info.gameNumber}</span>
                <span class="font-bold text-white truncate line-through">${chName}</span>
              </div>
              ${c && subMeta ? `<div class="text-[10px] text-slate-400 truncate">${subMeta.icon} ${c.subclass} • ${c.dmg}</div>` : ''}
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Riot Subclass Pool Depletion Analytics
  const depContainer = document.getElementById('bo5-depletion-analytics');
  if (depContainer) {
    depContainer.innerHTML = Object.entries(RIOT_SUBCLASS_MAP).map(([subKey, meta]) => {
      const allInSub = CHAMPIONS.filter(c => c.subclass === subKey || c.secondarySubclass === subKey);
      const availInSub = allInSub.filter(c => getChampionDraftStatus(c.name, STATE.activeGameIndex).code === 'AVAILABLE');
      const pctAvail = allInSub.length > 0 ? Math.round((availInSub.length / allInSub.length) * 100) : 100;
      return `
        <div class="p-2.5 rounded-lg bg-[#080d18] border border-slate-800 space-y-1.5">
          <div class="flex items-center justify-between text-xs">
            <span class="font-bold text-slate-200">${meta.icon} ${subKey}</span>
            <span class="text-[11px] font-mono ${pctAvail <= 60 ? 'text-rose-300 font-bold' : 'text-emerald-300'}">${availInSub.length}/${allInSub.length} libres</span>
          </div>
          <div class="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div style="width: ${pctAvail}%" class="${pctAvail <= 60 ? 'bg-rose-500' : 'bg-emerald-500'} h-full"></div>
          </div>
          <div class="text-[10px] text-slate-400 truncate">
            Restants : ${availInSub.slice(0, 5).map(c => c.name).join(', ')}${availInSub.length > 5 ? '...' : ''}
          </div>
        </div>
      `;
    }).join('');
  }
}

// Pre-loads a full 4-game Fearless series and puts the user right into Game 5 Decider (40 champions locked!)
function loadProBO5ScenarioPreset() {
  STATE.fearlessMode = 'HARD';
  STATE.games = [
    {
      gameNumber: 1,
      ourSide: 'BLUE',
      blueBans: ['Kalista', 'Skarner', 'LeBlanc', 'Braum', 'Poppy'],
      redBans:  ['Ashe', 'Rumble', 'Vi', 'Rakan', 'Alister'],
      bluePicks: ["K'Sante", 'Sejuani', 'Aurora', 'Varus', 'Nautilus'],
      redPicks:  ['Renekton', 'Wukong', 'Ahri', 'Kai\'Sa', 'Rell'],
      history: []
    },
    {
      gameNumber: 2,
      ourSide: 'RED',
      blueBans: ['Ambessa', 'Nidalee', 'Draven', 'Sylas', 'Pyke'],
      redBans:  ['Smolder', 'Maokai', 'Orianna', 'Tahm Kench', 'Leona'],
      bluePicks: ['Ornn', 'Xin Zhao', 'Syndra', 'Jhin', 'Braum'],
      redPicks:  ['Jax', 'Viego', 'Taliyah', 'Xayah', 'Rakan'],
      history: []
    },
    {
      gameNumber: 3,
      ourSide: 'BLUE',
      blueBans: ['Yone', 'Gwen', 'Caitlyn', 'Lulu', 'Janna'],
      redBans:  ['Azir', 'Lee Sin', 'Ezreal', 'Thresh', 'Bard'],
      bluePicks: ['Ambessa', 'Jarvan IV', 'Mel', 'Yunara', 'Leona'],
      redPicks:  ['Gnar', 'Nocturne', 'Hwei', 'Miss Fortune', 'Alistar'],
      history: []
    },
    {
      gameNumber: 4,
      ourSide: 'RED',
      blueBans: ['Corki', 'Camille', 'Ziggs', 'Nami', 'Karma'],
      redBans:  ['Tristana', 'Elise', 'Viktor', 'Milio', 'Renata Glasc'],
      bluePicks: ['Sion', 'Lillia', 'Yasuo', 'Zeri', 'Lulu'],
      redPicks:  ['Zaahen', 'Poppy', 'Locke', 'Lucian', 'Nami'],
      history: []
    },
    {
      gameNumber: 5,
      ourSide: 'BLUE',
      blueBans: ['Skarner', 'Kalista', 'Rumble', '', ''],
      redBans:  ['Ashe', 'Vi', 'Caitlyn', '', ''],
      bluePicks: ['Galio', '', '', '', ''],
      redPicks:  ['', '', '', '', ''],
      history: []
    }
  ];
  STATE.activeGameIndex = 4; // Game 5 Decider!
  STATE.ourPerspective = 'BLUE';
  syncNextAvailableSlot();
  persistState();
  renderAll();
  showToast('🏆 Scénario Pro BO5 chargé : Game 5 Décisif (40 champions verrouillés par les Games 1 à 4 !)', 'success');
}

function clearEntireBO5Series() {
  STATE.games = [
    createEmptyGame(1, 'BLUE'),
    createEmptyGame(2, 'RED'),
    createEmptyGame(3, 'BLUE'),
    createEmptyGame(4, 'RED'),
    createEmptyGame(5, 'BLUE')
  ];
  STATE.activeGameIndex = 0;
  STATE.ourPerspective = 'BLUE';
  syncNextAvailableSlot();
  persistState();
  renderAll();
  showToast('Série BO5 entièrement remise à zéro', 'info');
}
