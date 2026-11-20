// =========================================================================
// 10. RENDERING FUNCTIONS & UI POPOVER MANAGER
// =========================================================================
function renderAll() {
  renderTopGameTabs();
  renderPerspectiveButtons();
  renderWhatIfHeaderStatus();
  updateActiveFiltersBadge();

  const rosterBadge = document.getElementById('roster-pool-badge');
  if (rosterBadge && STATE.teamRoster) {
    const totalPicks = STATE.teamRoster.reduce((acc, p) => acc + p.picks.length, 0);
    rosterBadge.textContent = `${totalPicks}`;
    rosterBadge.title = `${totalPicks} picks maîtrisés dans le roster`;
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
  closeAllPopovers();
  const views = ['draft', 'tree', 'bo5', 'roster', 'champions'];
  views.forEach(v => {
    const sec = document.getElementById(`view-${v}`);
    const btn = document.getElementById(`nav-btn-${v}`);
    const mobBtn = document.getElementById(`mob-nav-${v}`);
    if (sec) sec.classList.toggle('hidden', v !== viewName);
    if (btn) {
      if (v === viewName) {
        btn.className = 'px-2.5 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 bg-amber-500/20 text-amber-200 border border-amber-500/40 whitespace-nowrap';
      } else {
        btn.className = 'px-2.5 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 text-slate-400 hover:text-white hover:bg-slate-800/70 border border-transparent whitespace-nowrap';
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
  if (badge) {
    badge.textContent = `${totalLocked}`;
    badge.title = `${totalLocked} champions verrouillés (Fearless)`;
  }

  if (!container) return;
  container.innerHTML = STATE.games.map((g, idx) => {
    const isActive = idx === STATE.activeGameIndex;
    const pickCount = g.bluePicks.filter(Boolean).length + g.redPicks.filter(Boolean).length;
    const isComplete = pickCount === 10;
    const sideDot = g.ourSide === 'BLUE' ? 'bg-sky-400' : 'bg-rose-400';
    const sideText = g.ourSide === 'BLUE' ? 'Blue (B1)' : 'Red (R5)';
    return `
      <button
        onclick="selectActiveGame(${idx})"
        title="Game ${g.gameNumber} • ${sideText} • ${pickCount}/10 picks"
        class="px-2 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1.5 ${
          isActive
            ? 'bg-amber-500/25 text-amber-200 border border-amber-500/55 gold-glow'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent'
        }"
      >
        <span class="w-1.5 h-1.5 rounded-full ${sideDot}"></span>
        <span>G${g.gameNumber}</span>
        ${isComplete ? '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Manche complète (10/10)"></span>' : ''}
      </button>
    `;
  }).join('');
}

function renderPerspectiveButtons() {
  const blueBtn = document.getElementById('perspective-blue-btn');
  const redBtn  = document.getElementById('perspective-red-btn');
  const fearlessSelect = document.getElementById('fearless-mode-select');
  const seriesIndicator = document.getElementById('header-series-side-dot');
  if (fearlessSelect) fearlessSelect.value = STATE.fearlessMode;

  if (seriesIndicator) {
    seriesIndicator.className = STATE.ourPerspective === 'BLUE'
      ? 'w-2 h-2 rounded-full bg-sky-400'
      : 'w-2 h-2 rounded-full bg-rose-400';
  }

  if (blueBtn && redBtn) {
    if (STATE.ourPerspective === 'BLUE') {
      blueBtn.className = 'py-1.5 px-2 rounded-md text-[11px] font-bold transition bg-sky-500/25 text-sky-200 border border-sky-500/50';
      redBtn.className  = 'py-1.5 px-2 rounded-md text-[11px] font-semibold transition bg-slate-800/60 text-slate-400 hover:text-rose-300 border border-transparent';
    } else {
      blueBtn.className = 'py-1.5 px-2 rounded-md text-[11px] font-semibold transition bg-slate-800/60 text-slate-400 hover:text-sky-300 border border-transparent';
      redBtn.className  = 'py-1.5 px-2 rounded-md text-[11px] font-bold transition bg-rose-500/25 text-rose-200 border border-rose-500/50';
    }
  }
}

function renderWhatIfHeaderStatus() {
  const el = document.getElementById('whatif-active-count');
  const menuBadge = document.getElementById('whatif-menu-badge');
  const count = STATE.whatIfBans.length;

  if (menuBadge) {
    menuBadge.textContent = count > 0 ? `${count}` : '';
    menuBadge.classList.toggle('hidden', count === 0);
  }

  if (!el) return;
  if (count === 0) {
    el.textContent = 'Aucun What-If actif';
    el.className = 'block text-[11px] px-2 py-1 rounded bg-slate-800/80 text-slate-400 border border-slate-700/70';
  } else {
    el.innerHTML = STATE.whatIfBans.map(ch =>
      `<span class="inline-flex items-center gap-1 mr-1.5 text-rose-200 font-semibold">🚫 ${ch}</span>`
    ).join('');
    el.className = 'block text-[11px] px-2 py-1 rounded bg-rose-500/15 text-rose-200 border border-rose-500/40';
  }
}

// =========================================================================
// POPOVER / SUBMENU MANAGER & ADVANCED FILTER BADGE
// =========================================================================
function closeAllPopovers() {
  document.querySelectorAll('[data-popover-panel]').forEach(panel => {
    panel.classList.add('hidden');
  });
  document.querySelectorAll('[data-popover-trigger]').forEach(btn => {
    btn.setAttribute('aria-expanded', 'false');
  });
}

function updateActiveFiltersBadge() {
  const badge = document.getElementById('active-filters-badge');
  const triggerBtn = document.getElementById('btn-toggle-grid-filters');
  if (!badge) return;

  let activeCount = 0;
  const teamPool = document.getElementById('filter-team-pool');
  const riotClass = document.getElementById('filter-riot-class');
  const hideUnavail = document.getElementById('hide-unavailable-checkbox');

  if (teamPool && teamPool.value && teamPool.value !== 'ALL') activeCount++;
  if (riotClass && riotClass.value && riotClass.value !== 'ALL') activeCount++;
  if (hideUnavail && hideUnavail.checked) activeCount++;

  // Detect active damage filter from STATE if available, or from active pill styling
  let activeDmg = 'ALL';
  if (typeof STATE !== 'undefined' && STATE.filters && STATE.filters.dmg) {
    activeDmg = STATE.filters.dmg;
  } else if (typeof currentDmgFilter !== 'undefined') {
    activeDmg = currentDmgFilter;
  } else {
    const pills = document.querySelectorAll('#dmg-filter-pills .dmg-pill');
    pills.forEach(p => {
      if (p.dataset.dmg && p.dataset.dmg !== 'ALL' && p.className.includes('bg-amber-500/25')) {
        activeDmg = p.dataset.dmg;
      }
    });
  }
  if (activeDmg && activeDmg !== 'ALL') activeCount++;

  badge.textContent = String(activeCount);
  badge.classList.toggle('hidden', activeCount === 0);

  if (triggerBtn) {
    if (activeCount > 0) {
      triggerBtn.classList.add('border-amber-500/60', 'bg-amber-500/15', 'text-amber-200');
      triggerBtn.classList.remove('border-slate-700/80', 'bg-[#080d18]', 'text-slate-200');
    } else {
      triggerBtn.classList.remove('border-amber-500/60', 'bg-amber-500/15', 'text-amber-200');
      triggerBtn.classList.add('border-slate-700/80', 'bg-[#080d18]', 'text-slate-200');
    }
  }
}

function resetAdvancedGridFilters() {
  const teamPool = document.getElementById('filter-team-pool');
  const riotClass = document.getElementById('filter-riot-class');
  const hideUnavail = document.getElementById('hide-unavailable-checkbox');
  if (teamPool) teamPool.value = 'ALL';
  if (riotClass) riotClass.value = 'ALL';
  if (hideUnavail) hideUnavail.checked = false;
  if (typeof handleChampionFilterChange === 'function') {
    handleChampionFilterChange();
  }
  if (typeof setDmgFilter === 'function') {
    setDmgFilter('ALL');
  }
  updateActiveFiltersBadge();
}

function initPopoverManager() {
  if (window.__lolPopoverManagerInit) return;
  window.__lolPopoverManagerInit = true;

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-popover-trigger]');
    if (trigger) {
      e.stopPropagation();
      const targetId = trigger.getAttribute('data-popover-trigger');
      const panel = document.getElementById(targetId);
      if (!panel) return;

      const isOpen = !panel.classList.contains('hidden');
      closeAllPopovers();
      if (!isOpen) {
        panel.classList.remove('hidden');
        trigger.setAttribute('aria-expanded', 'true');
      }
      return;
    }

    if (e.target.closest('[data-close-popover]')) {
      closeAllPopovers();
      return;
    }

    if (!e.target.closest('[data-popover-panel]')) {
      closeAllPopovers();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllPopovers();
    }
  });

  // Sync filter badge whenever advanced filter inputs change
  ['filter-team-pool', 'filter-riot-class', 'hide-unavailable-checkbox'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', () => setTimeout(updateActiveFiltersBadge, 0));
  });
  const dmgContainer = document.getElementById('dmg-filter-pills');
  if (dmgContainer) {
    dmgContainer.addEventListener('click', () => setTimeout(updateActiveFiltersBadge, 0));
  }

  updateActiveFiltersBadge();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPopoverManager);
} else {
  initPopoverManager();
}
