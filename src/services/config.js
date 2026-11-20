// =========================================================================
// SERVICE CONFIGURATION (COLLAB REALTIME & LCU CLIENT BRIDGE)
// =========================================================================
window.APP_SERVICES_CONFIG = {
  // Mode collaboratif :
  // - 'broadcast' : synchronise instantanément plusieurs onglets sur le même navigateur (zéro config)
  // - 'supabase'  : synchronise Coach + 5 joueurs sur Internet via Supabase Realtime
  collabDriver: 'broadcast',
  supabaseUrl: '',
  supabaseAnonKey: '',

  // Pont local vers le client League of Legends (lancé via `npm run lcu-bridge`)
  lcuBridgeUrl: 'ws://localhost:4242/lcu',
  lcuAutoConnect: false
};

function getActiveRoomCodeFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    return room ? room.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '') : '';
  } catch (e) {
    return '';
  }
}
