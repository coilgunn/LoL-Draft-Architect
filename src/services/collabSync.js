// =========================================================================
// REALTIME COLLABORATION SERVICE (COACH + 5 PLAYERS)
// Supports zero-config local multi-tab sync (BroadcastChannel) out of the box
// and is ready to plug into Supabase Realtime / Firebase on Vercel.
// =========================================================================
const COLLAB_CLIENT_ID = 'client-' + Math.random().toString(36).slice(2, 10);
let collabChannel = null;
let collabRoomCode = '';
let isApplyingRemotePatch = false;

function initCollabSync() {
  const roomFromUrl = typeof getActiveRoomCodeFromUrl === 'function' ? getActiveRoomCodeFromUrl() : '';
  collabRoomCode = roomFromUrl || 'DEFAULT-ROOM';

  // Driver 1: BroadcastChannel (fonctionne immédiatement sans backend entre 2 onglets)
  if (typeof BroadcastChannel !== 'undefined' && window.APP_SERVICES_CONFIG.collabDriver === 'broadcast') {
    collabChannel = new BroadcastChannel('lol-draft-room-' + collabRoomCode);
    collabChannel.onmessage = (event) => {
      const msg = event.data;
      if (!msg || msg.senderId === COLLAB_CLIENT_ID || msg.type !== 'STATE_SYNC') return;
      applyRemoteDraftPayload(msg.payload);
    };
  }

  // Hook appelé automatiquement par persistState() dans src/state/store.js
  window.onDraftStatePersisted = function (payload) {
    if (isApplyingRemotePatch) return;
    broadcastDraftPayload(payload);
  };
}

function broadcastDraftPayload(payload) {
  if (!payload) return;
  if (collabChannel && typeof collabChannel.postMessage === 'function') {
    try {
      collabChannel.postMessage({
        type: 'STATE_SYNC',
        senderId: COLLAB_CLIENT_ID,
        room: collabRoomCode,
        ts: Date.now(),
        payload
      });
    } catch (e) {
      // Ignore channel serialization errors
    }
  }
  // Point d'extension Antigravity : ajouter ici l'envoi Supabase Realtime
  // ex: supabaseChannel.send({ type: 'broadcast', event: 'draft_patch', payload })
}

function applyRemoteDraftPayload(payload) {
  if (!payload || !Array.isArray(payload.games) || payload.games.length !== 5) return;
  isApplyingRemotePatch = true;
  try {
    STATE.games = payload.games;
    STATE.fearlessMode = payload.fearlessMode || STATE.fearlessMode;
    STATE.ourPerspective = payload.ourPerspective || STATE.ourPerspective;
    STATE.whatIfBans = Array.isArray(payload.whatIfBans) ? payload.whatIfBans : STATE.whatIfBans;
    if (payload.decisionTrees) STATE.decisionTrees = payload.decisionTrees;
    if (Array.isArray(payload.teamRoster) && payload.teamRoster.length === 5) {
      STATE.teamRoster = payload.teamRoster;
    }
    if (typeof syncNextAvailableSlot === 'function') syncNextAvailableSlot();
    if (typeof renderAll === 'function') renderAll();
  } finally {
    isApplyingRemotePatch = false;
  }
}

window.addEventListener('DOMContentLoaded', initCollabSync);
