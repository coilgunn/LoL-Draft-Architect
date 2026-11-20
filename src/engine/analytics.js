// =========================================================================
// 8. TEAM COMPOSITION ANALYTICS (RIOT CLASSES & DAMAGE MIX)
// =========================================================================
function analyzeTeamComposition(pickNames) {
  const champs = pickNames.filter(Boolean).map(getChampionByName).filter(Boolean);
  const count = champs.length;
  let adScore = 0;
  let apScore = 0;
  let trueDmgChamps = [];
  const classCounts = {};
  const subclassCounts = {};

  champs.forEach(c => {
    if (c.dmg === 'AD') adScore += 1;
    else if (c.dmg === 'AP') apScore += 1;
    else { adScore += 0.5; apScore += 0.5; }

    if (c.trueDmg) trueDmgChamps.push(c.name);
    classCounts[c.mainClass] = (classCounts[c.mainClass] || 0) + 1;
    subclassCounts[c.subclass] = (subclassCounts[c.subclass] || 0) + 1;
    if (c.secondarySubclass) {
      subclassCounts[c.secondarySubclass] = (subclassCounts[c.secondarySubclass] || 0) + 0.5;
    }
  });

  const totalDmg = adScore + apScore;
  const adPct = totalDmg > 0 ? Math.round((adScore / totalDmg) * 100) : 50;
  const apPct = totalDmg > 0 ? 100 - adPct : 50;

  // Tactical checks based on Riot subclasses
  const hasEngage = (subclassCounts.Vanguard || 0) > 0 || (subclassCounts.Diver || 0) >= 1 || (subclassCounts.Catcher || 0) >= 1;
  const hasFrontline = (classCounts.Tank || 0) > 0 || (subclassCounts.Juggernaut || 0) > 0;
  const hasPeel = (subclassCounts.Warden || 0) > 0 || (subclassCounts.Enchanter || 0) > 0;
  const hasSustainedDps = (classCounts.Marksman || 0) > 0 || (subclassCounts.Battlemage || 0) > 0 || (subclassCounts.Skirmisher || 0) > 0;
  const hasWaveclear = (classCounts.Mage || 0) > 0 || (classCounts.Marksman || 0) > 0;

  const warnings = [];
  if (count >= 3 && adPct >= 80) warnings.push('⚠️ Profil quasi Full AD (Vulnérable à Armure / Malphite / Rammus)');
  if (count >= 3 && apPct >= 80) warnings.push('⚠️ Profil quasi Full AP (Vulnérable à la Résistance Magique)');
  if (count >= 4 && !hasFrontline) warnings.push('⚠️ Aucune Frontline durable (Tank / Juggernaut manquant)');
  if (count >= 4 && !hasEngage) warnings.push('⚠️ Manque d\'Engage primaire (Vanguard / Diver)');
  if (count >= 4 && !hasSustainedDps) warnings.push('⚠️ Manque de DPS continu objectifs (Marksman / Battlemage)');

  return {
    champs,
    count,
    adPct,
    apPct,
    trueDmgChamps,
    hasEngage,
    hasFrontline,
    hasPeel,
    hasSustainedDps,
    hasWaveclear,
    warnings
  };
}

// =========================================================================
// 9. DECISION TREE ENGINE & "WHAT-IF X IS BANNED" RESOLUTION
// =========================================================================
function isChampionBlockedForTree(champName) {
  if (!champName) return false;
  const st = getChampionDraftStatus(champName);
  return st.code !== 'AVAILABLE';
}

// Evaluates the active tree for a side ('BLUE' or 'RED') and resolves which nodes are triggered
function resolveDecisionTreePath(side) {
  const nodes = STATE.decisionTrees[side] || [];
  const results = [];

  nodes.forEach(node => {
    const triggerBlocked = node.triggerChamp ? isChampionBlockedForTree(node.triggerChamp) : false;
    const primaryBlocked = isChampionBlockedForTree(node.actionChamp);
    const backupBlocked  = isChampionBlockedForTree(node.backupChamp);

    let isActivated = false;
    if (node.type === 'OPENING' || node.type === 'COUNTER_LAST') {
      isActivated = !node.triggerChamp || triggerBlocked;
    } else if (node.type === 'WHATIF_BAN' || node.type === 'WHATIF_PICK') {
      isActivated = triggerBlocked;
    }

    let recommendedChamp = node.actionChamp;
    let usedBackup = false;
    if (primaryBlocked && node.backupChamp && !backupBlocked) {
      recommendedChamp = node.backupChamp;
      usedBackup = true;
    } else if (primaryBlocked && (!node.backupChamp || backupBlocked)) {
      recommendedChamp = '';
    }

    results.push({
      node,
      isActivated,
      triggerBlocked,
      primaryBlocked,
      backupBlocked,
      recommendedChamp,
      usedBackup
    });
  });

  return results;
}
