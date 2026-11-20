// =========================================================================
// 10. RENDERING FUNCTIONS
// =========================================================================
function renderAll() {
  renderTopGameTabs();
  renderPerspectiveButtons();
  renderWhatIfHeaderStatus();

  const rosterBadge = document.getElementById('roster-pool-badge');
  if (rosterBadge && STATE.teamRoster) {
    const totalPicks = STATE.teamRoster.reduce((acc, p) => acc + p.picks.length, 0);
    rosterBadge.textContent = `${totalPicks} Picks`;
  }

  if (STATE.currentView === 'draft') {
    renderDraftBoard();
  } else if (STATE.currentView === 'tree') {
    renderDecisionTreeView();
  } else if (STATE.currentView === 'bo5') {
    renderBO5SeriesView();
  } else if (STATE.currentView === 'roster') {
    renderRosterPoolsView();
  } else if (STATE.currentView === 'champions') {
    renderEncyclopediaView();
  }
}

function switchMainView(viewName) {
  STATE.currentView = viewName;
  const views = ['draft', 'tree', 'bo5', 'roster', 'champions'];
  views.forEach(v => {
    const sec = document.getElementById(`view-${v}`);
    const btn = document.getElementById(`nav-btn-${v}`);
    const mobBtn = document.getElementById(`mob-nav-${v}`);
    if (sec) sec.classList.toggle('hidden', v !== viewName);
    if (btn) {
      if (v === viewName) {
        btn.className = 'px-2.5 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 bg-amber-500/20 text-amber-200 border border-amber-500/40';
      } else {
        btn.className = 'px-2.5 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 text-slate-300 hover:text-white hover:bg-slate-800/60';
      }
    }
    if (mobBtn) {
      if (v === viewName) {
        mobBtn.className = 'flex flex-col items-center justify-center py-1 rounded-lg text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/40';
      } else {
        mobBtn.className = 'flex flex-col items-center justify-center py-1 rounded-lg text-[10px] font-medium text-slate-400';
      }
    }
  });
  renderAll();
}

function setTeamPerspective(side) {
  STATE.ourPerspective = side;
  STATE.games[STATE.activeGameIndex].ourSide = side;
  STATE.treeActiveSide = side;
  persistState();
  renderAll();
}

function setFearlessMode(mode) {
  STATE.fearlessMode = mode;
  persistState();
  renderAll();
  showToast(`Mode de série mis à jour : ${mode}`, 'info');
}

function selectActiveGame(gameIdx) {
  STATE.activeGameIndex = gameIdx;
  STATE.ourPerspective = STATE.games[gameIdx].ourSide;
  syncNextAvailableSlot();
  persistState();
  renderAll();
}

function renderTopGameTabs() {
  const container = document.getElementById('game-tabs-container');
  const badge = document.getElementById('bo5-locked-badge');
  const totalLocked = getFearlessLockedMap(STATE.activeGameIndex).size;
  if (badge) badge.textContent = `${totalLocked} Lock`;

  if (!container) return;
  container.innerHTML = STATE.games.map((g, idx) => {
    const isActive = idx === STATE.activeGameIndex;
    const pickCount = g.bluePicks.filter(Boolean).length + g.redPicks.filter(Boolean).length;
    const sideLabel = g.ourSide === 'BLUE' ? '🔵 B1' : '🔴 R5';
    return `
      <button
        onclick="selectActiveGame(${idx})"
        class="px-2.5 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
          isActive
            ? 'bg-amber-500/25 text-amber-200 border border-amber-500/50 gold-glow'
            : 'bg-[#0d1627] text-slate-400 hover:text-white border border-slate-800'
        }"
      >
        <span>Game ${g.gameNumber}</span>
        <span class="text-[10px] opacity-85">${sideLabel}</span>
        <span class="text-[10px] px-1 rounded ${pickCount === 10 ? 'bg-emerald-500/25 text-emerald-300' : 'bg-slate-800 text-slate-400'}">${pickCount}/10</span>
      </button>
    `;
  }).join('');
}

function renderPerspectiveButtons() {
  const blueBtn = document.getElementById('perspective-blue-btn');
  const redBtn  = document.getElementById('perspective-red-btn');
  const fearlessSelect = document.getElementById('fearless-mode-select');
  if (fearlessSelect) fearlessSelect.value = STATE.fearlessMode;

  if (blueBtn && redBtn) {
    if (STATE.ourPerspective === 'BLUE') {
      blueBtn.className = 'px-2 py-1 rounded text-[11px] font-bold transition bg-sky-500/25 text-sky-300 border border-sky-500/50';
      redBtn.className  = 'px-2 py-1 rounded text-[11px] font-bold transition text-slate-400 hover:text-rose-300';
    } else {
      blueBtn.className = 'px-2 py-1 rounded text-[11px] font-bold transition text-slate-400 hover:text-sky-300';
      redBtn.className  = 'px-2 py-1 rounded text-[11px] font-bold transition bg-rose-500/25 text-rose-300 border border-rose-500/50';
    }
  }
}

function renderWhatIfHeaderStatus() {
  const el = document.getElementById('whatif-active-count');
  if (!el) return;
  if (STATE.whatIfBans.length === 0) {
    el.textContent = 'Aucun What-If actif';
    el.className = 'text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700';
  } else {
    el.innerHTML = STATE.whatIfBans.map(ch =>
      `<span class="inline-flex items-center gap-1 mr-1.5 text-rose-200 font-semibold">🚫 ${ch}</span>`
    ).join('');
    el.className = 'text-[11px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-200 border border-rose-500/40';
  }
}
