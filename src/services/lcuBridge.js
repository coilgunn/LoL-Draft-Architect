// =========================================================================
// LEAGUE CLIENT (LCU API) LIVE BRIDGE CLIENT
// Connects to the local Node.js companion (bridge/lcu-companion.mjs) to mirror
// live Champ Select bans and picks directly onto the active BO5 game.
// =========================================================================
let lcuSocket = null;

// Prototype de mapping Riot numeric championId -> Nom dans CHAMPIONS
// À enrichir automatiquement depuis Data Dragon champion.json dans Antigravity
const LCU_CHAMPION_ID_MAP = {
  266: "Aatrox",
  103: "Ahri",
  897: "K'Sante",
  516: "Ornn",
  113: "Sejuani",
  254: "Vi",
  893: "Aurora",
  799: "Ambessa",
  800: "Mel"
};

function connectLcuBridge() {
  const url = window.APP_SERVICES_CONFIG?.lcuBridgeUrl || 'ws://localhost:4242/lcu';
  try {
    lcuSocket = new WebSocket(url);
    lcuSocket.onopen = () => {
      if (typeof showToast === 'function') showToast('🟢 Pont Client LoL (LCU) connecté', 'success');
    };
    lcuSocket.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        if (data && data.type === 'CHAMP_SELECT_SESSION') {
          applyLcuChampSelectSnapshot(data.session);
        }
      } catch (e) {
        // Ignore malformed messages
      }
    };
    lcuSocket.onclose = () => {
      lcuSocket = null;
    };
  } catch (e) {
    if (typeof showToast === 'function') showToast('Pont LCU indisponible en local', 'warn');
  }
}

function applyLcuChampSelectSnapshot(session) {
  if (!session || !Array.isArray(session.actions)) return;
  const g = STATE.games[STATE.activeGameIndex];
  if (!g) return;

  const blueBans = [];
  const redBans = [];
  const bluePicks = [];
  const redPicks = [];

  session.actions.flat().forEach((act) => {
    if (!act || !act.completed || !act.championId) return;
    const champName = LCU_CHAMPION_ID_MAP[act.championId];
    if (!champName) return;
    const isBlue = act.isAllyAction ? STATE.ourPerspective === 'BLUE' : STATE.ourPerspective !== 'BLUE';
    if (act.type === 'ban') {
      (isBlue ? blueBans : redBans).push(champName);
    } else if (act.type === 'pick') {
      (isBlue ? bluePicks : redPicks).push(champName);
    }
  });

  for (let i = 0; i < 5; i++) {
    if (blueBans[i]) g.blueBans[i] = blueBans[i];
    if (redBans[i]) g.redBans[i] = redBans[i];
    if (bluePicks[i]) g.bluePicks[i] = bluePicks[i];
    if (redPicks[i]) g.redPicks[i] = redPicks[i];
  }

  if (typeof syncNextAvailableSlot === 'function') syncNextAvailableSlot();
  if (typeof persistState === 'function') persistState();
  if (typeof renderAll === 'function') renderAll();
}

window.addEventListener('DOMContentLoaded', () => {
  if (window.APP_SERVICES_CONFIG?.lcuAutoConnect) {
    connectLcuBridge();
  }
});
