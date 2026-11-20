// =========================================================================
// 16. WHAT-IF MODAL & EXPORT/IMPORT MODAL HANDLERS
// =========================================================================
function openWhatIfSimulatorModal() {
  const sel = document.getElementById('modal-whatif-select');
  if (sel && sel.options.length === 0) {
    sel.innerHTML = CHAMPIONS.map(c => `<option value="${c.name}">${c.name} (${c.subclass} • ${c.dmg})</option>`).join('');
  }
  renderWhatIfModalList();
  document.getElementById('whatif-modal').classList.remove('hidden');
}

function closeWhatIfSimulatorModal() {
  document.getElementById('whatif-modal').classList.add('hidden');
}

function addWhatIfFromModalSelect() {
  const sel = document.getElementById('modal-whatif-select');
  if (!sel || !sel.value) return;
  if (!STATE.whatIfBans.includes(sel.value)) {
    STATE.whatIfBans.push(sel.value);
    persistState();
    renderWhatIfModalList();
    renderAll();
  }
}

function renderWhatIfModalList() {
  const list = document.getElementById('modal-whatif-active-list');
  if (!list) return;
  if (STATE.whatIfBans.length === 0) {
    list.innerHTML = `<span class="text-xs text-slate-500">Aucun champion banni en simulation What-If.</span>`;
    return;
  }
  list.innerHTML = STATE.whatIfBans.map(ch => `
    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-200 border border-rose-500/40 text-xs font-bold">
      <span>🚫 ${ch}</span>
      <button onclick="toggleChampionWhatIfBan('${ch.replace(/'/g, "\\'")}', event); renderWhatIfModalList();" class="hover:text-white">✕</button>
    </span>
  `).join('');
}

function buildExportStateJson() {
  const payload = {
    version: '2026.22',
    fearlessMode: STATE.fearlessMode,
    ourPerspective: STATE.ourPerspective,
    whatIfBans: STATE.whatIfBans,
    decisionTrees: STATE.decisionTrees,
    teamRoster: STATE.teamRoster,
    games: STATE.games
  };
  return JSON.stringify(payload, null, 2);
}

function openExportImportModal() {
  const ta = document.getElementById('export-import-textarea');
  if (ta) ta.value = buildExportStateJson();
  document.getElementById('export-import-modal').classList.remove('hidden');
}

function closeExportImportModal() {
  document.getElementById('export-import-modal').classList.add('hidden');
}

function copyStateJsonToClipboard() {
  const ta = document.getElementById('export-import-textarea');
  if (!ta) return;
  ta.select();
  try {
    document.execCommand('copy');
    showToast('JSON copié dans le presse-papiers !', 'success');
  } catch (e) {
    showToast('Sélectionnez le texte pour le copier.', 'info');
  }
}

function downloadStandaloneJsonFile() {
  const modal = document.getElementById('export-import-modal');
  const ta = document.getElementById('export-import-textarea');
  const isModalVisible = modal && !modal.classList.contains('hidden');
  const jsonContent = (isModalVisible && ta && ta.value.trim()) ? ta.value : buildExportStateJson();
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'lol_fearless_bo5_scenario.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Fichier JSON téléchargé', 'success');
}

function downloadStandaloneExecutableHtml() {
  const htmlContent = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'LoL_Fearless_Draft_Architect_2026.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Logiciel autonome (.html) téléchargé !', 'success');
}

function importStateFromJsonTextarea() {
  const ta = document.getElementById('export-import-textarea');
  if (!ta) return;
  try {
    const parsed = JSON.parse(ta.value);
    if (parsed.games && Array.isArray(parsed.games) && parsed.games.length === 5) {
      STATE.games = parsed.games;
      STATE.fearlessMode = parsed.fearlessMode || 'HARD';
      STATE.ourPerspective = parsed.ourPerspective || 'BLUE';
      STATE.whatIfBans = Array.isArray(parsed.whatIfBans) ? parsed.whatIfBans : [];
      if (parsed.decisionTrees) STATE.decisionTrees = parsed.decisionTrees;
      if (Array.isArray(parsed.teamRoster) && parsed.teamRoster.length === 5) STATE.teamRoster = parsed.teamRoster;
      syncNextAvailableSlot();
      persistState();
      closeExportImportModal();
      renderAll();
      showToast('Scénario JSON importé avec succès !', 'success');
    } else {
      showToast('Format JSON invalide : tableau de 5 manches requis.', 'warn');
    }
  } catch (e) {
    showToast('Erreur de syntaxe JSON lors de l\'import.', 'warn');
  }
}
