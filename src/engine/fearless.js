// =========================================================================
// 6. FEARLESS DRAFT & AVAILABILITY CALCULATIONS
// =========================================================================
function getChampionByName(name) {
  if (!name) return null;
  return CHAMPIONS.find(c => c.name === name) || null;
}

// Returns Map<champName, { gameNumber, side }> of champions locked by previous games in the BO5
function getFearlessLockedMap(targetGameIndex = STATE.activeGameIndex) {
  const locked = new Map();
  if (STATE.fearlessMode === 'STANDARD') return locked;

  for (let gIdx = 0; gIdx < targetGameIndex; gIdx++) {
    const g = STATE.games[gIdx];
    if (!g) continue;
    if (STATE.fearlessMode === 'HARD') {
      g.bluePicks.forEach(ch => { if (ch) locked.set(ch, { gameNumber: g.gameNumber, side: 'BLUE' }); });
      g.redPicks.forEach(ch =>  { if (ch) locked.set(ch, { gameNumber: g.gameNumber, side: 'RED' }); });
    } else if (STATE.fearlessMode === 'SOFT') {
      const ourPicks = g.ourSide === 'BLUE' ? g.bluePicks : g.redPicks;
      ourPicks.forEach(ch => { if (ch) locked.set(ch, { gameNumber: g.gameNumber, side: g.ourSide }); });
    }
  }
  return locked;
}

// Returns current game status of a champion: AVAILABLE, BAN_BLUE, BAN_RED, PICK_BLUE, PICK_RED, FEARLESS_LOCK, WHATIF_BAN
function getChampionDraftStatus(champName, gameIndex = STATE.activeGameIndex) {
  const g = STATE.games[gameIndex];
  if (g.blueBans.includes(champName))  return { code: 'BAN_BLUE',  label: 'Ban Blue' };
  if (g.redBans.includes(champName))   return { code: 'BAN_RED',   label: 'Ban Red' };
  if (g.bluePicks.includes(champName)) return { code: 'PICK_BLUE', label: `Pick B${g.bluePicks.indexOf(champName) + 1}` };
  if (g.redPicks.includes(champName))  return { code: 'PICK_RED',  label: `Pick R${g.redPicks.indexOf(champName) + 1}` };

  const fearlessMap = getFearlessLockedMap(gameIndex);
  if (fearlessMap.has(champName)) {
    const info = fearlessMap.get(champName);
    return { code: 'FEARLESS_LOCK', label: `Fearless G${info.gameNumber}` };
  }

  if (STATE.whatIfBans.includes(champName)) {
    return { code: 'WHATIF_BAN', label: 'What-If Ban' };
  }

  return { code: 'AVAILABLE', label: 'Disponible' };
}

// Determines the next unfilled slot in standard 20-step tournament order
function syncNextAvailableSlot() {
  const g = STATE.games[STATE.activeGameIndex];
  for (const stepObj of DRAFT_SEQUENCE) {
    const arr = getSlotArray(g, stepObj.side, stepObj.type);
    if (!arr[stepObj.index]) {
      STATE.selectedSlot = { side: stepObj.side, type: stepObj.type, index: stepObj.index, stepObj };
      return;
    }
  }
  STATE.selectedSlot = { side: 'RED', type: 'PICK', index: 4, stepObj: DRAFT_SEQUENCE[19] };
}

function getSlotArray(gameObj, side, type) {
  if (side === 'BLUE' && type === 'BAN')  return gameObj.blueBans;
  if (side === 'RED'  && type === 'BAN')  return gameObj.redBans;
  if (side === 'BLUE' && type === 'PICK') return gameObj.bluePicks;
  return gameObj.redPicks;
}
