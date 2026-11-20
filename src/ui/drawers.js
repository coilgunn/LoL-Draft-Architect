// =========================================================================
// 16C. VOLETS (TABS & SLIDE-OVER DRAWERS) CONTROLLERS
// =========================================================================
function setTeamColumnVolet(side, voletName) {
  if (side === 'BLUE') {
    STATE.blueColumnVolet = voletName;
    const pEl = document.getElementById('blue-volet-picks');
    const rEl = document.getElementById('blue-volet-radar');
    const bP  = document.getElementById('blue-volet-btn-picks');
    const bR  = document.getElementById('blue-volet-btn-radar');
    if (pEl) pEl.classList.toggle('hidden', voletName !== 'PICKS');
    if (rEl) rEl.classList.toggle('hidden', voletName !== 'RADAR');
    if (bP) bP.className = voletName === 'PICKS' ? 'py-1 px-2 rounded text-[11px] font-bold bg-sky-500/25 text-sky-200 border border-sky-500/40 transition' : 'py-1 px-2 rounded text-[11px] font-semibold text-slate-400 hover:text-sky-200 transition';
    if (bR) bR.className = voletName === 'RADAR' ? 'py-1 px-2 rounded text-[11px] font-bold bg-sky-500/25 text-sky-200 border border-sky-500/40 transition' : 'py-1 px-2 rounded text-[11px] font-semibold text-slate-400 hover:text-sky-200 transition';
  } else {
    STATE.redColumnVolet = voletName;
    const pEl = document.getElementById('red-volet-picks');
    const rEl = document.getElementById('red-volet-radar');
    const bP  = document.getElementById('red-volet-btn-picks');
    const bR  = document.getElementById('red-volet-btn-radar');
    if (pEl) pEl.classList.toggle('hidden', voletName !== 'PICKS');
    if (rEl) rEl.classList.toggle('hidden', voletName !== 'RADAR');
    if (bP) bP.className = voletName === 'PICKS' ? 'py-1 px-2 rounded text-[11px] font-bold bg-rose-500/25 text-rose-200 border border-rose-500/40 transition' : 'py-1 px-2 rounded text-[11px] font-semibold text-slate-400 hover:text-rose-200 transition';
    if (bR) bR.className = voletName === 'RADAR' ? 'py-1 px-2 rounded text-[11px] font-bold bg-rose-500/25 text-rose-200 border border-rose-500/40 transition' : 'py-1 px-2 rounded text-[11px] font-semibold text-slate-400 hover:text-rose-200 transition';
  }
}

function switchBO5Volet(voletKey) {
  STATE.bo5ActiveVolet = voletKey;
  const map = {
    GAMES:     { content: 'bo5-volet-games',     btn: 'bo5-volet-btn-games' },
    PINCH:     { content: 'bo5-volet-pinch',     btn: 'bo5-volet-btn-pinch' },
    GRAVEYARD: { content: 'bo5-volet-graveyard', btn: 'bo5-volet-btn-graveyard' }
  };
  Object.entries(map).forEach(([k, ids]) => {
    const cEl = document.getElementById(ids.content);
    const bEl = document.getElementById(ids.btn);
    if (cEl) cEl.classList.toggle('hidden', k !== voletKey);
    if (bEl) {
      if (k === voletKey) {
        bEl.classList.add('volet-tab-active');
      } else {
        bEl.classList.remove('volet-tab-active');
      }
    }
  });
}

function setRosterRoleVolet(roleKey) {
  STATE.rosterRoleVolet = roleKey;
  document.querySelectorAll('.roster-volet-btn').forEach(btn => {
    const isActive = btn.getAttribute('data-rvolet') === roleKey;
    if (isActive) {
      btn.classList.add('volet-tab-active');
    } else {
      btn.classList.remove('volet-tab-active');
    }
  });
  renderRosterPoolsView();
}

function toggleSlideOverVolet(tabKey) {
  STATE.slideOverTab = tabKey || 'AI_TREE';
  const overlay = document.getElementById('slideover-volet-overlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');
  renderSlideOverVoletContent();
}

function closeSlideOverVolet() {
  const overlay = document.getElementById('slideover-volet-overlay');
  if (overlay) overlay.classList.add('hidden');
}

function switchSlideOverTab(tabKey) {
  STATE.slideOverTab = tabKey;
  renderSlideOverVoletContent();
}

function renderSlideOverVoletContent() {
  const body = document.getElementById('slideover-volet-body');
  const btnAi = document.getElementById('drawer-tab-ai');
  const btnRad = document.getElementById('drawer-tab-radar');
  if (!body) return;

  if (btnAi && btnRad) {
    btnAi.className = STATE.slideOverTab === 'AI_TREE'
      ? 'px-3 py-1.5 rounded-lg text-xs font-bold volet-tab-active border'
      : 'px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white border border-transparent';
    btnRad.className = STATE.slideOverTab === 'RADAR'
      ? 'px-3 py-1.5 rounded-lg text-xs font-bold volet-tab-active border'
      : 'px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white border border-transparent';
  }

  const g = STATE.games[STATE.activeGameIndex];
  const side = STATE.ourPerspective;

  if (STATE.slideOverTab === 'AI_TREE') {
    const poolSuggestions = getSmartRosterPoolSuggestions(side);
    const resolved = resolveDecisionTreePath(side).filter(r => r.isActivated && r.recommendedChamp);

    body.innerHTML = `
      <div class="space-y-4">
        <div class="p-3.5 rounded-xl bg-[#0e1626] border border-amber-500/35 space-y-2.5">
          <div class="flex items-center justify-between">
            <h4 class="font-display text-xs font-bold text-amber-200 uppercase tracking-wider">
              🤖 Recommandations IA par Poste Restant (${side})
            </h4>
            <button onclick="autoCompleteOurTeamFromPools(); renderSlideOverVoletContent();" class="px-2.5 py-1 rounded text-[11px] font-bold bg-sky-500/25 text-sky-200 border border-sky-500/40">
              Compléter Tout →
            </button>
          </div>
          <p class="text-[11px] text-slate-400">
            Classés selon vos Champion Pools importés (Tier S > Tier A > Tier B), les Flex Picks et l'équilibre AD/AP de votre composition :
          </p>
          <div class="space-y-2">
            ${poolSuggestions.length > 0 ? poolSuggestions.map(s => `
              <div
                onclick="assignChampionToActiveSlot('${s.champName.replace(/'/g, "\\'")}'); renderSlideOverVoletContent();"
                class="p-2.5 rounded-xl bg-[#080d18] border border-slate-800 hover:border-amber-400 cursor-pointer transition flex items-center justify-between gap-2"
              >
                <div class="flex items-center gap-2.5">
                  ${renderChampAvatarHtml(s.champName, 'w-10 h-10', 'rounded-lg')}
                  <div>
                    <div class="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>${s.champName}</span>
                      <span class="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">Tier ${s.tier}</span>
                      ${s.isFlex ? `<span class="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">🔀 FLEX</span>` : ''}
                    </div>
                    <div class="text-[11px] text-slate-400">
                      Joueur : <strong class="text-slate-200">${s.playerName}</strong> (${s.role}) • ${s.cObj ? `${s.cObj.subclass} • ${s.cObj.dmg}` : ''}
                    </div>
                  </div>
                </div>
                <span class="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-200 text-[11px] font-bold">Pick +</span>
              </div>
            `).join('') : `<div class="text-xs text-slate-400 italic">Tous les postes sont remplis !</div>`}
          </div>
        </div>

        <div class="p-3.5 rounded-xl bg-[#0e1626] border border-emerald-500/30 space-y-2.5">
          <div class="flex items-center justify-between">
            <h4 class="font-display text-xs font-bold text-emerald-300 uppercase tracking-wider">
              🌿 Branches d'Arborescence Actives &amp; What-Ifs
            </h4>
            <button onclick="closeSlideOverVolet(); switchMainView('tree');" class="text-[11px] text-amber-300 hover:underline">
              Éditeur d'Arbre →
            </button>
          </div>
          <div class="space-y-2">
            ${resolved.map(r => `
              <div
                onclick="assignChampionToActiveSlot('${r.recommendedChamp.replace(/'/g, "\\'")}'); renderSlideOverVoletContent();"
                class="p-2.5 rounded-xl bg-[#080d18] border border-slate-800 hover:border-emerald-400 cursor-pointer transition flex items-center justify-between gap-2"
              >
                <div class="flex items-center gap-2.5">
                  ${renderChampAvatarHtml(r.recommendedChamp, 'w-9 h-9', 'rounded-lg')}
                  <div>
                    <div class="text-xs font-bold text-white">${r.recommendedChamp} <span class="text-[10px] text-amber-300 font-mono">(${r.node.slot})</span></div>
                    <div class="text-[10px] text-slate-400">${r.node.note}</div>
                  </div>
                </div>
                <span class="text-xs text-emerald-300 font-bold">Choisir</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  } else {
    body.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="p-3 rounded-xl bg-[#0c1424] border border-sky-500/40 space-y-2">
          <h4 class="font-display text-xs font-bold text-sky-300 uppercase text-center">🔵 Blue Side (B1)</h4>
          ${renderTeamRadarSvg(g.bluePicks, '#38bdf8')}
        </div>
        <div class="p-3 rounded-xl bg-[#190d16] border border-rose-500/40 space-y-2">
          <h4 class="font-display text-xs font-bold text-rose-300 uppercase text-center">🔴 Red Side (R5)</h4>
          ${renderTeamRadarSvg(g.redPicks, '#fb7185')}
        </div>
      </div>
    `;
  }
}
