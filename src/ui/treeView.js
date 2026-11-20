// =========================================================================
// 13. VIEW 2: DECISION TREE & WHAT-IF BUILDER RENDERING
// =========================================================================
function switchTreeSide(side) {
  STATE.treeActiveSide = side;
  renderDecisionTreeView();
}

function renderDecisionTreeView() {
  const side = STATE.treeActiveSide;
  const badge = document.getElementById('tree-side-badge');
  const btnBlue = document.getElementById('tree-tab-blue');
  const btnRed  = document.getElementById('tree-tab-red');

  if (badge) {
    badge.className = side === 'BLUE'
      ? 'px-2 py-0.5 rounded text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40'
      : 'px-2 py-0.5 rounded text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40';
    badge.textContent = side === 'BLUE'
      ? 'Plan Blue Side — First Pick (B1) & Priorités'
      : 'Plan Red Side — Counter-Pick (R1-R2) & Last Pick (R5)';
  }

  if (btnBlue && btnRed) {
    btnBlue.className = side === 'BLUE'
      ? 'px-3 py-1.5 rounded-lg text-xs font-bold transition bg-sky-500/25 text-sky-200 border border-sky-500/50'
      : 'px-3 py-1.5 rounded-lg text-xs font-bold transition bg-slate-800 text-slate-300 hover:text-sky-200 border border-slate-700';
    btnRed.className = side === 'RED'
      ? 'px-3 py-1.5 rounded-lg text-xs font-bold transition bg-rose-500/25 text-rose-200 border border-rose-500/50'
      : 'px-3 py-1.5 rounded-lg text-xs font-bold transition bg-slate-800 text-slate-300 hover:text-rose-200 border border-slate-700';
  }

  // Populate Quick Select of 173 champions for What-If
  const quickSelect = document.getElementById('whatif-quick-select');
  if (quickSelect && quickSelect.options.length === 0) {
    quickSelect.innerHTML = CHAMPIONS.map(c => `<option value="${c.name}">${c.name} (${c.subclass} • ${c.dmg})</option>`).join('');
  }

  // Extract key champions mentioned in this tree
  const nodes = STATE.decisionTrees[side] || [];
  const keyChampSet = new Set();
  nodes.forEach(n => {
    if (n.triggerChamp) keyChampSet.add(n.triggerChamp);
    if (n.actionChamp)  keyChampSet.add(n.actionChamp);
    if (n.backupChamp)  keyChampSet.add(n.backupChamp);
  });

  const togglesContainer = document.getElementById('tree-key-champions-toggles');
  if (togglesContainer) {
    togglesContainer.innerHTML = Array.from(keyChampSet).map(chName => {
      const isWhatIf = STATE.whatIfBans.includes(chName);
      const status = getChampionDraftStatus(chName);
      const escaped = chName.replace(/'/g, "\\'");
      return `
        <button
          onclick="toggleChampionWhatIfBan('${escaped}', event)"
          class="px-2.5 py-1 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
            isWhatIf
              ? 'bg-rose-500/30 text-rose-200 border-rose-400 font-bold'
              : status.code !== 'AVAILABLE'
                ? 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                : 'bg-[#080d18] text-slate-200 hover:border-amber-400 border-slate-700'
          }"
        >
          <span>${isWhatIf ? '🚫 Banni (What-If)' : status.code !== 'AVAILABLE' ? `🔒 ${status.label}` : '🟢 Libre'}</span>
          <span class="font-bold">${chName}</span>
        </button>
      `;
    }).join('');
  }

  // Render Resolved Path Summary
  const resolved = resolveDecisionTreePath(side);
  const summaryContainer = document.getElementById('tree-resolved-path-summary');
  if (summaryContainer) {
    const activeSteps = resolved.filter(r => r.isActivated);
    summaryContainer.innerHTML = activeSteps.map(r => {
      const ch = getChampionByName(r.recommendedChamp);
      const subMeta = ch ? RIOT_SUBCLASS_MAP[ch.subclass] : null;
      return `
        <div class="p-2.5 rounded-lg bg-[#080d18] border ${r.node.type === 'WHATIF_BAN' ? 'border-rose-500/40' : 'border-emerald-500/35'} flex items-center justify-between gap-2">
          <div>
            <div class="text-[11px] text-slate-400 font-semibold">${r.node.slot} ${r.node.triggerChamp ? `• Suite au blocage de <span class="text-rose-300">${r.node.triggerChamp}</span>` : ''}</div>
            <div class="text-xs font-bold text-white mt-0.5">
              ${r.recommendedChamp ? `👉 Verrouiller <span class="text-amber-200">${r.recommendedChamp}</span> ${r.usedBackup ? '<span class="text-[10px] text-amber-400">(Backup activé)</span>' : ''}` : '<span class="text-rose-400">⚠️ Cible et Backup tous deux indisponibles !</span>'}
            </div>
          </div>
          ${ch && subMeta ? `<span class="text-[10px] px-2 py-0.5 rounded border ${subMeta.color}">${subMeta.icon} ${ch.subclass} • ${ch.dmg}</span>` : ''}
        </div>
      `;
    }).join('');
  }

  // Render Visual Tree Hierarchy
  const canvas = document.getElementById('decision-tree-canvas');
  if (!canvas) return;

  const rootNodes = nodes.filter(n => !n.parentId);
  const resolvedMap = new Map(resolved.map(r => [r.node.id, r]));

  function renderNodeRecursive(node, depth = 0) {
    const res = resolvedMap.get(node.id);
    const children = nodes.filter(n => n.parentId === node.id);
    const actionChampObj = getChampionByName(node.actionChamp);
    const subMeta = actionChampObj ? RIOT_SUBCLASS_MAP[actionChampObj.subclass] : null;
    const dmgMeta = actionChampObj ? DMG_BADGE_MAP[actionChampObj.dmg] : null;

    const typeBadge = {
      OPENING:      { label: '🎯 Plan Principal / Priorité', cls: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
      WHATIF_BAN:   { label: `🚫 What-If : Si ${node.triggerChamp || 'Cible'} est Banni / Fearless`, cls: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
      WHATIF_PICK:  { label: `⚔️ What-If : Si l'ennemi Pick ${node.triggerChamp || 'Cible'}`, cls: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
      COUNTER_LAST: { label: `👑 Last Pick / Counter (${node.triggerChamp ? 'vs ' + node.triggerChamp : 'Flex'})`, cls: 'bg-purple-500/20 text-purple-300 border-purple-500/40' }
    }[node.type] || { label: node.type, cls: 'bg-slate-800 text-slate-300' };

    return `
      <div class="${depth > 0 ? 'ml-6 pl-4 border-l-2 border-amber-500/30 tree-connector mt-3' : 'mt-3'}">
        <div class="rounded-xl p-3.5 border transition ${
          res && res.isActivated
            ? 'bg-[#101c33] border-emerald-400/60 shadow-lg'
            : 'bg-[#090f1c] border-slate-800 opacity-75'
        }">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-[11px] font-bold px-2 py-0.5 rounded border ${typeBadge.cls}">${typeBadge.label}</span>
              <span class="text-xs font-mono font-bold text-amber-200 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">${node.slot}</span>
              ${res && res.isActivated ? `<span class="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">✓ BRANCHE ACTIVE</span>` : `<span class="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">En veille</span>`}
            </div>

            <div class="flex items-center gap-1.5">
              ${node.actionChamp ? `
                <button
                  onclick="toggleChampionWhatIfBan('${node.actionChamp.replace(/'/g, "\\'")}', event)"
                  class="px-2 py-1 rounded text-[11px] font-semibold bg-rose-500/15 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 transition"
                  title="Tester que se passe-t-il si ${node.actionChamp} est banni"
                >
                  🧪 Tester « Ban ${node.actionChamp} »
                </button>
              ` : ''}
              <button
                onclick="openAddTreeNodeModal('${node.id}', '${(node.actionChamp || '').replace(/'/g, "\\'")}')"
                class="px-2 py-1 rounded text-[11px] font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 transition"
              >
                + Branche « What-If »
              </button>
              <button
                onclick="deleteTreeNode('${node.id}')"
                class="px-2 py-1 rounded text-[11px] text-slate-400 hover:text-rose-400 bg-slate-800/80"
                title="Supprimer ce nœud"
              >
                🗑️
              </button>
            </div>
          </div>

          <!-- Champion Target & Backup Row with Visual Portraits -->
          <div class="mt-2.5 flex flex-wrap items-center gap-3">
            <div class="flex items-center gap-2 bg-[#070b14] px-2.5 py-1.5 rounded-xl border ${res && res.primaryBlocked ? 'border-rose-500/50 line-through opacity-60' : 'border-slate-700'}">
              ${node.actionChamp ? renderChampAvatarHtml(node.actionChamp, 'w-8 h-8', 'rounded-lg') : ''}
              <div>
                <div class="text-[10px] text-slate-400">Choix Principal</div>
                <div class="flex items-center gap-1.5">
                  <span class="text-xs font-bold text-white">${node.actionChamp || '—'}</span>
                  ${subMeta ? `<span class="text-[10px] px-1.5 py-0.2 rounded border ${subMeta.color}">${subMeta.icon} ${actionChampObj.subclass}</span>` : ''}
                  ${dmgMeta ? `<span class="text-[10px] px-1.5 py-0.2 rounded border font-bold ${dmgMeta.color}">${dmgMeta.label}</span>` : ''}
                </div>
              </div>
            </div>

            ${node.backupChamp ? `
              <div class="flex items-center gap-2 bg-[#070b14] px-2.5 py-1.5 rounded-xl border ${res && res.usedBackup ? 'border-amber-400 bg-amber-500/10' : 'border-slate-800'}">
                ${renderChampAvatarHtml(node.backupChamp, 'w-8 h-8', 'rounded-lg')}
                <div>
                  <div class="text-[10px] text-slate-400">Backup / Repli</div>
                  <div class="text-xs font-bold text-amber-200">${node.backupChamp}</div>
                </div>
              </div>
            ` : ''}
          </div>

          ${node.note ? `<p class="mt-2 text-xs text-slate-300 italic">« ${node.note} »</p>` : ''}
        </div>

        ${children.map(child => renderNodeRecursive(child, depth + 1)).join('')}
      </div>
    `;
  }

  canvas.innerHTML = rootNodes.length > 0
    ? rootNodes.map(n => renderNodeRecursive(n, 0)).join('')
    : `<div class="text-xs text-slate-400 py-8 text-center">Aucun nœud dans cet arbre. Cliquez sur « + Ajouter Nœud Racine » pour commencer.</div>`;
}

function addSelectedWhatIfBan() {
  const sel = document.getElementById('whatif-quick-select');
  if (!sel || !sel.value) return;
  const ch = sel.value;
  if (!STATE.whatIfBans.includes(ch)) {
    STATE.whatIfBans.push(ch);
    persistState();
    renderAll();
    showToast(`🧪 What-If Ban ajouté : ${ch}`, 'warn');
  }
}

function clearAllWhatIfBans() {
  STATE.whatIfBans = [];
  persistState();
  renderAll();
  renderWhatIfModalList();
  showToast('Tous les bans hypothétiques « What-If » ont été effacés', 'info');
}

function applyResolvedTreeToCurrentGame() {
  const side = STATE.treeActiveSide;
  const resolved = resolveDecisionTreePath(side).filter(r => r.isActivated && r.recommendedChamp);
  const g = STATE.games[STATE.activeGameIndex];
  const picksArr = side === 'BLUE' ? g.bluePicks : g.redPicks;

  let appliedCount = 0;
  resolved.forEach(r => {
    if (getChampionDraftStatus(r.recommendedChamp).code === 'AVAILABLE') {
      const emptyIdx = picksArr.findIndex(p => !p);
      if (emptyIdx !== -1) {
        picksArr[emptyIdx] = r.recommendedChamp;
        appliedCount++;
      }
    }
  });

  syncNextAvailableSlot();
  persistState();
  switchMainView('draft');
  showToast(`${appliedCount} champion(s) du plan ${side} appliqués au Game ${g.gameNumber}`, 'success');
}

// Tree Node Modal Handlers
function populateTreeModalChampionSelects() {
  const ids = ['tree-node-trigger-champ', 'tree-node-action-champ', 'tree-node-backup-champ'];
  ids.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    const prefix = i === 0 ? '<option value="">(Aucun déclencheur — Ouverture)</option>' : '<option value="">(Aucun)</option>';
    el.innerHTML = prefix + CHAMPIONS.map(c => `<option value="${c.name}">${c.name} (${c.subclass} • ${c.dmg})</option>`).join('');
  });
}

function openAddTreeNodeModal(parentId, defaultTriggerChamp = '') {
  populateTreeModalChampionSelects();
  document.getElementById('tree-node-parent-id').value = parentId || '';
  document.getElementById('tree-node-edit-id').value = '';
  document.getElementById('tree-node-type').value = parentId ? 'WHATIF_BAN' : 'OPENING';
  document.getElementById('tree-node-trigger-champ').value = defaultTriggerChamp || '';
  document.getElementById('tree-node-action-champ').value = 'Ambessa';
  document.getElementById('tree-node-backup-champ').value = 'Ornn';
  document.getElementById('tree-node-note').value = '';
  document.getElementById('tree-node-modal').classList.remove('hidden');
}

function closeTreeNodeModal() {
  document.getElementById('tree-node-modal').classList.add('hidden');
}

function saveTreeNodeFromModal() {
  const parentId = document.getElementById('tree-node-parent-id').value || null;
  const type = document.getElementById('tree-node-type').value;
  const slot = document.getElementById('tree-node-slot').value;
  const triggerChamp = document.getElementById('tree-node-trigger-champ').value;
  const actionChamp = document.getElementById('tree-node-action-champ').value;
  const backupChamp = document.getElementById('tree-node-backup-champ').value;
  const note = document.getElementById('tree-node-note').value.trim();

  const side = STATE.treeActiveSide;
  const newNode = {
    id: 'node-' + Date.now(),
    parentId,
    type,
    slot,
    triggerChamp,
    actionChamp,
    backupChamp,
    note: note || `Si ${triggerChamp || 'ouverture'}, pivoter vers ${actionChamp}.`
  };

  STATE.decisionTrees[side].push(newNode);
  persistState();
  closeTreeNodeModal();
  renderDecisionTreeView();
  showToast('Nouvel embranchement ajouté à l\'arborescence', 'success');
}

function deleteTreeNode(nodeId) {
  const side = STATE.treeActiveSide;
  const toRemove = new Set([nodeId]);
  let changed = true;
  while (changed) {
    changed = false;
    STATE.decisionTrees[side].forEach(n => {
      if (n.parentId && toRemove.has(n.parentId) && !toRemove.has(n.id)) {
        toRemove.add(n.id);
        changed = true;
      }
    });
  }
  STATE.decisionTrees[side] = STATE.decisionTrees[side].filter(n => !toRemove.has(n.id));
  persistState();
  renderDecisionTreeView();
  showToast('Branche supprimée de l\'arborescence', 'info');
}

function resetDecisionTreesToDefault() {
  STATE.decisionTrees = getDefaultDecisionTrees();
  persistState();
  renderDecisionTreeView();
  showToast('Arborescences Pro Blue & Red restaurées', 'success');
}
