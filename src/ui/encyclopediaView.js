// =========================================================================
// 15. VIEW 4: ENCYCLOPEDIA OF ALL 173 CHAMPIONS & TAG EDITOR
// =========================================================================
function renderEncyclopediaView() {
  const summaryCards = document.getElementById('riot-class-summary-cards');
  if (summaryCards) {
    const mainClasses = ['Tank', 'Fighter', 'Slayer', 'Mage', 'Controller', 'Marksman', 'Specialist'];
    summaryCards.innerHTML = mainClasses.map(mc => {
      const count = CHAMPIONS.filter(c => c.mainClass === mc).length;
      const subs = Object.entries(RIOT_SUBCLASS_MAP).filter(([, v]) => v.mainClass === mc).map(([k]) => k).join(' • ');
      return `
        <div class="p-2.5 rounded-lg bg-[#080d18] border border-slate-800">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-amber-200">${mc}</span>
            <span class="text-xs font-mono font-bold text-white">${count}</span>
          </div>
          <div class="text-[10px] text-slate-400 mt-0.5 truncate">${subs}</div>
        </div>
      `;
    }).join('');
  }
  renderEncyclopediaTable();
}

function renderEncyclopediaTable() {
  const tbody = document.getElementById('encyclopedia-table-body');
  const countBadge = document.getElementById('enc-count-badge');
  if (!tbody) return;

  const q = (document.getElementById('enc-search-input')?.value || '').trim().toLowerCase();
  const clsFilter = document.getElementById('enc-class-select')?.value || 'ALL';
  const dmgFilter = document.getElementById('enc-dmg-select')?.value || 'ALL';
  const laneFilter = document.getElementById('enc-lane-select')?.value || 'ALL';

  const rows = CHAMPIONS.filter(c => {
    if (q && !c.name.toLowerCase().includes(q) && !c.subclass.toLowerCase().includes(q) && !c.mainClass.toLowerCase().includes(q)) return false;
    if (clsFilter !== 'ALL') {
      const sub = clsFilter.replace('SUB:', '');
      if (c.subclass !== sub && c.secondarySubclass !== sub) return false;
    }
    if (dmgFilter !== 'ALL') {
      if (dmgFilter === 'TRUE' && !c.trueDmg) return false;
      if (dmgFilter !== 'TRUE' && c.dmg !== dmgFilter) return false;
    }
    if (laneFilter !== 'ALL' && !c.roles.includes(laneFilter)) return false;
    return true;
  });

  if (countBadge) countBadge.textContent = `${rows.length} / ${CHAMPIONS.length} champions`;

  tbody.innerHTML = rows.map(c => {
    const subMeta = RIOT_SUBCLASS_MAP[c.subclass] || RIOT_SUBCLASS_MAP.Specialist;
    const dmgMeta = DMG_BADGE_MAP[c.dmg] || DMG_BADGE_MAP.AD;
    const status = getChampionDraftStatus(c.name);
    const escaped = c.name.replace(/'/g, "\\'");

    return `
      <tr class="hover:bg-slate-800/40 transition">
        <td class="py-2 px-3 font-bold text-white">${c.name}</td>
        <td class="py-2 px-3 text-slate-300 font-medium">${c.mainClass}</td>
        <td class="py-2 px-3">
          <span class="text-[11px] px-2 py-0.5 rounded border ${subMeta.color}">${subMeta.icon} ${c.subclass}</span>
          ${c.secondarySubclass ? `<span class="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">+ ${c.secondarySubclass}</span>` : ''}
        </td>
        <td class="py-2 px-3">
          <span class="text-[11px] px-2 py-0.5 rounded border font-bold ${dmgMeta.color}">${c.dmg}</span>
          ${c.trueDmg ? `<span class="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-white/15 text-white border border-white/30">💎 Brut</span>` : ''}
        </td>
        <td class="py-2 px-3 text-slate-300">${c.roles.join(', ')}</td>
        <td class="py-2 px-3">
          <span class="text-[11px] px-2 py-0.5 rounded ${status.code === 'AVAILABLE' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}">${status.label}</span>
        </td>
        <td class="py-2 px-3 text-right space-x-1">
          <button onclick="openEditChampionModal('${escaped}')" class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-200 border border-slate-700 text-[11px]">
            ✏️ Tags
          </button>
          <button onclick="toggleChampionWhatIfBan('${escaped}', event)" class="px-2 py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 border border-rose-500/30 text-[11px]">
            🧪 What-If
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function openEditChampionModal(champName) {
  const c = getChampionByName(champName);
  if (!c) return;
  document.getElementById('edit-champ-id').value = c.name;
  document.getElementById('edit-champ-modal-title').textContent = `Modifier les Tags : ${c.name}`;
  document.getElementById('edit-champ-subclass').value = c.subclass;
  document.getElementById('edit-champ-dmg').value = c.dmg;
  document.getElementById('edit-champ-truedmg').checked = Boolean(c.trueDmg);

  document.querySelectorAll('.edit-lane-cb').forEach(cb => {
    cb.checked = c.roles.includes(cb.value);
  });

  document.getElementById('edit-champ-modal').classList.remove('hidden');
}

function closeEditChampionModal() {
  document.getElementById('edit-champ-modal').classList.add('hidden');
}

function saveEditedChampionTags() {
  const name = document.getElementById('edit-champ-id').value;
  const c = getChampionByName(name);
  if (!c) return;

  const newSub = document.getElementById('edit-champ-subclass').value;
  const newDmg = document.getElementById('edit-champ-dmg').value;
  const newTrue = document.getElementById('edit-champ-truedmg').checked;
  const checkedLanes = [];
  document.querySelectorAll('.edit-lane-cb').forEach(cb => {
    if (cb.checked) checkedLanes.push(cb.value);
  });

  c.subclass = newSub;
  c.mainClass = (RIOT_SUBCLASS_MAP[newSub] || RIOT_SUBCLASS_MAP.Specialist).mainClass;
  c.dmg = newDmg;
  c.trueDmg = newTrue;
  if (checkedLanes.length > 0) c.roles = checkedLanes;

  persistState();
  closeEditChampionModal();
  renderAll();
  showToast(`Tags mis à jour pour ${c.name} (${c.subclass} • ${c.dmg})`, 'success');
}

function resetCustomChampionTags() {
  CHAMPIONS = RAW_CHAMPIONS_2026.map((row, idx) => {
    const [name, subclass, secondarySubclass, dmg, trueDmg, lanesCsv] = row;
    const meta = RIOT_SUBCLASS_MAP[subclass] || RIOT_SUBCLASS_MAP.Specialist;
    return {
      id: name.toLowerCase().replace(/[^a-z0-9]/g, ''),
      index: idx + 1,
      name,
      mainClass: meta.mainClass,
      subclass,
      secondarySubclass: secondarySubclass || '',
      dmg,
      trueDmg: Boolean(trueDmg),
      roles: lanesCsv.split(',').map(s => s.trim())
    };
  });
  persistState();
  renderAll();
  showToast('Tags officiels Riot Games 2026 restaurés pour les 173 champions', 'success');
}
