// =========================================================================
// 7. DRAFT BOARD MUTATIONS & INTERACTIONS
// =========================================================================
function selectDraftSlot(side, type, index) {
  const matchedStep = DRAFT_SEQUENCE.find(s => s.side === side && s.type === type && s.index === index);
  STATE.selectedSlot = { side, type, index, stepObj: matchedStep || null };
  renderAll();
}

function clearDraftSlot(side, type, index, event) {
  if (event) event.stopPropagation();
  const g = STATE.games[STATE.activeGameIndex];
  const arr = getSlotArray(g, side, type);
  const removed = arr[index];
  arr[index] = '';
  STATE.selectedSlot = {
    side,
    type,
    index,
    stepObj: DRAFT_SEQUENCE.find(s => s.side === side && s.type === type && s.index === index) || null
  };
  persistState();
  renderAll();
  if (removed) showToast(`${removed} retiré du slot ${side} ${type} ${index + 1}`, 'info');
}

function assignChampionToActiveSlot(champName) {
  const status = getChampionDraftStatus(champName);
  if (status.code !== 'AVAILABLE') {
    if (status.code === 'WHATIF_BAN') {
      showToast(`${champName} est verrouillé par votre simulation « What-If Ban ». Cliquez sur 🧪 pour le libérer.`, 'warn');
    } else if (status.code === 'FEARLESS_LOCK') {
      showToast(`${champName} est verrouillé en Fearless Draft (${status.label}).`, 'warn');
    } else {
      showToast(`${champName} est déjà utilisé (${status.label}).`, 'warn');
    }
    return;
  }

  const g = STATE.games[STATE.activeGameIndex];
  const { side, type, index } = STATE.selectedSlot;
  const arr = getSlotArray(g, side, type);
  arr[index] = champName;
  g.history.push({ side, type, index, champName });

  syncNextAvailableSlot();
  persistState();
  renderAll();
}

function toggleChampionWhatIfBan(champName, event) {
  if (event) event.stopPropagation();
  const idx = STATE.whatIfBans.indexOf(champName);
  if (idx >= 0) {
    STATE.whatIfBans.splice(idx, 1);
    showToast(`Simulation What-If retirée pour ${champName}`, 'info');
  } else {
    STATE.whatIfBans.push(champName);
    showToast(`🧪 What-If actif : « Et si ${champName} est banni ? » — Arborescence mise à jour`, 'warn');
  }
  persistState();
  renderAll();
}

function stepDraftUndo() {
  const g = STATE.games[STATE.activeGameIndex];
  if (g.history && g.history.length > 0) {
    const last = g.history.pop();
    const arr = getSlotArray(g, last.side, last.type);
    arr[last.index] = '';
    STATE.selectedSlot = {
      side: last.side,
      type: last.type,
      index: last.index,
      stepObj: DRAFT_SEQUENCE.find(s => s.side === last.side && s.type === last.type && s.index === last.index) || null
    };
    persistState();
    renderAll();
    showToast(`Annulé : ${last.champName}`, 'info');
    return;
  }
  // Fallback: clear last filled slot in reverse sequence order
  for (let i = DRAFT_SEQUENCE.length - 1; i >= 0; i--) {
    const s = DRAFT_SEQUENCE[i];
    const arr = getSlotArray(g, s.side, s.type);
    if (arr[s.index]) {
      const removed = arr[s.index];
      arr[s.index] = '';
      STATE.selectedSlot = { side: s.side, type: s.type, index: s.index, stepObj: s };
      persistState();
      renderAll();
      showToast(`Annulé : ${removed}`, 'info');
      return;
    }
  }
}

// Computes role-by-role AI recommendations strictly prioritized from the imported Team Roster Pools
function getSmartRosterPoolSuggestions(side) {
  const g = STATE.games[STATE.activeGameIndex];
  const currentPickNames = (side === 'BLUE' ? g.bluePicks : g.redPicks).filter(Boolean);
  const currentChamps = currentPickNames.map(getChampionByName).filter(Boolean);

  // Determine which of the 5 players/roles in STATE.teamRoster already have a champion picked
  const filledRoles = new Set();
  const remainingChamps = [...currentPickNames];

  // Pass 1: Match picked champions to players who explicitly have them in their imported pool
  if (STATE.teamRoster && STATE.teamRoster.length === 5) {
    STATE.teamRoster.forEach(player => {
      const matchIdx = remainingChamps.findIndex(chName => player.picks.some(pk => pk.champ === chName));
      if (matchIdx !== -1) {
        filledRoles.add(player.role);
        remainingChamps.splice(matchIdx, 1);
      }
    });
    // Pass 2: Match any remaining picked champions by standard lane role
    remainingChamps.forEach(chName => {
      const cObj = getChampionByName(chName);
      if (!cObj) return;
      const matchingRole = cObj.roles.find(r => !filledRoles.has(r));
      if (matchingRole) filledRoles.add(matchingRole);
    });
  }

  // Compute current damage balance & frontline status
  let adCount = 0;
  let apCount = 0;
  let hasFrontline = false;
  currentChamps.forEach(c => {
    if (c.dmg === 'AD') adCount += 1;
    else if (c.dmg === 'AP') apCount += 1;
    else { adCount += 0.5; apCount += 0.5; }
    if (c.mainClass === 'Tank' || c.subclass === 'Juggernaut' || c.subclass === 'Diver') hasFrontline = true;
  });

  const suggestions = [];
  if (!STATE.teamRoster) return suggestions;

  const unfilledPlayers = STATE.teamRoster.filter(p => !filledRoles.has(p.role));
  const targetPlayers = unfilledPlayers.length > 0 ? unfilledPlayers : STATE.teamRoster;

  targetPlayers.forEach(player => {
    // Score each available champion in this player's imported pool
    const availablePool = player.picks
      .filter(pk => getChampionDraftStatus(pk.champ).code === 'AVAILABLE')
      .map(pk => {
        const cObj = getChampionByName(pk.champ);
        const owners = getChampionRosterOwners(pk.champ);
        const isFlex = owners.length >= 2;
        let score = pk.tier === 'S' ? 100 : pk.tier === 'A' ? 70 : 45;

        // Bonus for Flex picks early in draft (0-2 picks made)
        if (currentPickNames.length <= 2 && isFlex) score += 25;

        // Bonus for balancing AD/AP damage
        if (cObj) {
          if (adCount > apCount + 0.5 && (cObj.dmg === 'AP' || cObj.dmg === 'Hybride')) score += 18;
          if (apCount > adCount + 0.5 && (cObj.dmg === 'AD' || cObj.dmg === 'Hybride')) score += 18;
          if (!hasFrontline && currentPickNames.length >= 2 && (cObj.mainClass === 'Tank' || cObj.subclass === 'Juggernaut' || cObj.subclass === 'Diver')) {
            score += 20;
          }
        }

        return {
          champName: pk.champ,
          tier: pk.tier,
          role: player.role,
          playerName: player.playerName,
          isFlex,
          score,
          cObj
        };
      })
      .sort((a, b) => b.score - a.score);

    if (availablePool.length > 0) {
      suggestions.push(availablePool[0]);
    }
  });

  return suggestions.sort((a, b) => b.score - a.score);
}

function autoFillRecommendedAction() {
  const { side, type } = STATE.selectedSlot;
  const g = STATE.games[STATE.activeGameIndex];
  const availableChamps = CHAMPIONS.filter(c => getChampionDraftStatus(c.name).code === 'AVAILABLE');
  if (availableChamps.length === 0) return;

  // 1. PRIORITY #1 FOR OUR TEAM'S PICKS: Use the Imported Player Champion Pools (Tier S / A / B & Flex)!
  if (type === 'PICK' && side === STATE.ourPerspective) {
    const poolSuggestions = getSmartRosterPoolSuggestions(side);
    if (poolSuggestions.length > 0) {
      const best = poolSuggestions[0];
      assignChampionToActiveSlot(best.champName);
      showToast(`✨ IA Pool Joueur (${best.playerName} • ${best.role} Tier ${best.tier}${best.isFlex ? ' 🔀 Flex' : ''}) : ${best.champName}`, 'success');
      return;
    }
  }

  // 2. PRIORITY #2: Check Decision Tree resolved path (for enemy simulation or fallback)
  if (type === 'PICK') {
    const resolved = resolveDecisionTreePath(side);
    for (const item of resolved) {
      if (item.recommendedChamp && getChampionDraftStatus(item.recommendedChamp).code === 'AVAILABLE') {
        assignChampionToActiveSlot(item.recommendedChamp);
        showToast(`✨ Choix Arbre appliqué : ${item.recommendedChamp} (${item.node.slot})`, 'success');
        return;
      }
    }
  }

  // 3. PRIORITY #3: For Bans or Enemy Picks, balance damage & avoid banning our own Tier S B1 priority
  const ourTierS = new Set();
  if (STATE.teamRoster) {
    STATE.teamRoster.forEach(p => p.picks.forEach(pk => { if (pk.tier === 'S') ourTierS.add(pk.champ); }));
  }

  const teamPicks = (side === 'BLUE' ? g.bluePicks : g.redPicks).filter(Boolean).map(getChampionByName).filter(Boolean);
  const adCount = teamPicks.filter(c => c.dmg === 'AD').length;
  const apCount = teamPicks.filter(c => c.dmg === 'AP').length;
  const hasTank = teamPicks.some(c => c.mainClass === 'Tank');
  const hasMarksman = teamPicks.some(c => c.mainClass === 'Marksman');

  let candidate = availableChamps[0];
  if (type === 'PICK') {
    if (!hasTank) {
      candidate = availableChamps.find(c => c.subclass === 'Vanguard' || c.subclass === 'Warden') || candidate;
    } else if (!hasMarksman) {
      candidate = availableChamps.find(c => c.mainClass === 'Marksman') || candidate;
    } else if (adCount > apCount) {
      candidate = availableChamps.find(c => c.dmg === 'AP') || candidate;
    } else {
      candidate = availableChamps.find(c => c.dmg === 'AD') || candidate;
    }
  } else {
    // Smart ban: if our team is banning, don't ban our own Tier S picks! If enemy is banning, target meta/Tier S.
    const metaTargets = ["K'Sante", "Aurora", "Yunara", "Ambessa", "Mel", "Zaahen", "Locke", "Skarner", "Vi", "Ornn", "Kalista", "Ashe", "Rumble"];
    if (side === STATE.ourPerspective) {
      const safeBan = metaTargets.find(m => !ourTierS.has(m) && getChampionDraftStatus(m).code === 'AVAILABLE');
      candidate = (safeBan && getChampionByName(safeBan)) || availableChamps.find(c => !ourTierS.has(c.name)) || candidate;
    } else {
      // Enemy ban targets our Tier S or high meta
      const targetOurS = Array.from(ourTierS).find(m => getChampionDraftStatus(m).code === 'AVAILABLE');
      const foundMeta = targetOurS || metaTargets.find(m => getChampionDraftStatus(m).code === 'AVAILABLE');
      if (foundMeta) candidate = getChampionByName(foundMeta) || candidate;
    }
  }

  assignChampionToActiveSlot(candidate.name);
  showToast(`✨ Suggestion IA appliquée : ${candidate.name} (${candidate.subclass} • ${candidate.dmg})`, 'success');
}

// Fills all remaining pick slots of our team using the 5 players' imported pools
function autoCompleteOurTeamFromPools() {
  const side = STATE.ourPerspective;
  const g = STATE.games[STATE.activeGameIndex];
  const picksArr = side === 'BLUE' ? g.bluePicks : g.redPicks;
  let count = 0;

  for (let i = 0; i < 5; i++) {
    if (!picksArr[i]) {
      const suggestions = getSmartRosterPoolSuggestions(side);
      if (suggestions.length > 0) {
        picksArr[i] = suggestions[0].champName;
        g.history.push({ side, type: 'PICK', index: i, champName: suggestions[0].champName });
        count++;
      }
    }
  }

  syncNextAvailableSlot();
  persistState();
  renderAll();
  if (count > 0) {
    showToast(`🤖 ${count} pick(s) complétés automatiquement depuis les Champion Pools importés de votre équipe !`, 'success');
  } else {
    showToast(`Les 5 picks de votre équipe (${side}) sont déjà remplis ou aucun pick du pool n'est disponible.`, 'info');
  }
}

function swapSidesCurrentGame() {
  const g = STATE.games[STATE.activeGameIndex];
  const tmpBans = [...g.blueBans];
  const tmpPicks = [...g.bluePicks];
  g.blueBans = [...g.redBans];
  g.redBans = tmpBans;
  g.bluePicks = [...g.redPicks];
  g.redPicks = tmpPicks;
  g.ourSide = g.ourSide === 'BLUE' ? 'RED' : 'BLUE';
  STATE.ourPerspective = g.ourSide;
  syncNextAvailableSlot();
  persistState();
  renderAll();
  showToast(`Sides Blue et Red inversés pour le Game ${g.gameNumber}`, 'info');
}

function resetCurrentGameDraft() {
  const g = STATE.games[STATE.activeGameIndex];
  g.blueBans = ['', '', '', '', ''];
  g.redBans  = ['', '', '', '', ''];
  g.bluePicks = ['', '', '', '', ''];
  g.redPicks  = ['', '', '', '', ''];
  g.history = [];
  syncNextAvailableSlot();
  persistState();
  renderAll();
  showToast(`Manche Game ${g.gameNumber} réinitialisée`, 'info');
}

function advanceToNextGameInSeries() {
  if (STATE.activeGameIndex < 4) {
    STATE.activeGameIndex += 1;
    STATE.ourPerspective = STATE.games[STATE.activeGameIndex].ourSide;
    syncNextAvailableSlot();
    persistState();
    renderAll();
    const lockedCount = getFearlessLockedMap().size;
    showToast(`Passage au Game ${STATE.activeGameIndex + 1} (${lockedCount} champions verrouillés en Fearless)`, 'success');
  } else {
    switchMainView('bo5');
    showToast(`Vous êtes au Game 5 décisif ! Affichage du récapitulatif BO5.`, 'success');
  }
}
