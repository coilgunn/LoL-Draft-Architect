// =========================================================================
// 17. TOAST HELPER & INITIALIZATION
// =========================================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const colors = {
    success: 'bg-emerald-950/95 text-emerald-200 border-emerald-500/50',
    warn:    'bg-rose-950/95 text-rose-200 border-rose-500/50',
    info:    'bg-slate-900/95 text-amber-200 border-amber-500/40'
  };
  const el = document.createElement('div');
  el.className = `px-3.5 py-2 rounded-lg border text-xs font-semibold shadow-xl transition-all duration-300 ${colors[type] || colors.info}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, 2800);
}

function updateLcuStatusDot(isConnected) {
  const dot = document.getElementById('lcu-status-dot');
  if (!dot) return;
  dot.classList.toggle('bg-emerald-400', Boolean(isConnected));
  dot.classList.toggle('bg-slate-500', !isConnected);
  dot.title = isConnected ? 'Pont LCU connecté' : 'Pont LCU hors ligne';
}

if (typeof connectLcuBridge === 'function') {
  const _origConnectLcuBridge = connectLcuBridge;
  connectLcuBridge = function connectLcuBridgeWithStatus() {
    updateLcuStatusDot(false);
    const result = _origConnectLcuBridge.apply(this, arguments);
    try {
      if (typeof lcuSocket !== 'undefined' && lcuSocket && typeof lcuSocket.addEventListener === 'function') {
        if (lcuSocket.readyState === WebSocket.OPEN) {
          updateLcuStatusDot(true);
        }
        lcuSocket.addEventListener('open', () => updateLcuStatusDot(true));
        lcuSocket.addEventListener('close', () => updateLcuStatusDot(false));
        lcuSocket.addEventListener('error', () => updateLcuStatusDot(false));
      }
    } catch (e) {
      // Ignore WebSocket inspection errors
    }
    return result;
  };
}

window.addEventListener('DOMContentLoaded', () => {
  loadSavedState();
  renderAll();
});
