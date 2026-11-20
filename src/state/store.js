// =========================================================================
// 5. APPLICATION STATE
// =========================================================================
function getDefaultTeamRoster() {
  return [
    {
      role: 'Top',
      playerName: 'Top Laner',
      picks: [
        { champ: "K'Sante", tier: 'S' },
        { champ: 'Ambessa', tier: 'S' },
        { champ: 'Ornn',    tier: 'A' },
        { champ: 'Zaahen',  tier: 'A' },
        { champ: 'Aurora',  tier: 'A' },
        { champ: 'Gwen',    tier: 'B' },
        { champ: 'Rumble',  tier: 'B' },
        { champ: 'Camille', tier: 'B' }
      ]
    },
    {
      role: 'Jungle',
      playerName: 'Jungler',
      picks: [
        { champ: 'Sejuani',   tier: 'S' },
        { champ: 'Vi',        tier: 'S' },
        { champ: 'Wukong',    tier: 'A' },
        { champ: 'Skarner',   tier: 'A' },
        { champ: 'Maokai',    tier: 'A' },
        { champ: 'Jarvan IV', tier: 'B' },
        { champ: 'Poppy',     tier: 'B' },
        { champ: 'Lillia',    tier: 'B' }
      ]
    },
    {
      role: 'Mid',
      playerName: 'Mid Laner',
      picks: [
        { champ: 'Aurora',  tier: 'S' },
        { champ: 'Mel',     tier: 'S' },
        { champ: 'Ahri',    tier: 'A' },
        { champ: 'Yone',    tier: 'A' },
        { champ: 'Orianna', tier: 'A' },
        { champ: 'Locke',   tier: 'B' },
        { champ: 'Sylas',   tier: 'B' },
        { champ: 'Taliyah', tier: 'B' }
      ]
    },
    {
      role: 'Bot',
      playerName: 'Bot / ADC',
      picks: [
        { champ: 'Yunara',  tier: 'S' },
        { champ: "Kai'Sa",  tier: 'S' },
        { champ: 'Varus',   tier: 'A' },
        { champ: 'Xayah',   tier: 'A' },
        { champ: 'Jhin',    tier: 'A' },
        { champ: 'Ezreal',  tier: 'B' },
        { champ: 'Kalista', tier: 'B' },
        { champ: 'Zeri',    tier: 'B' }
      ]
    },
    {
      role: 'Support',
      playerName: 'Support',
      picks: [
        { champ: 'Rell',     tier: 'S' },
        { champ: 'Nautilus', tier: 'S' },
        { champ: 'Rakan',    tier: 'A' },
        { champ: 'Braum',    tier: 'A' },
        { champ: 'Leona',    tier: 'A' },
        { champ: 'Lulu',     tier: 'B' },
        { champ: 'Poppy',    tier: 'B' },
        { champ: 'Mel',      tier: 'B' }
      ]
    }
  ];
}

function createEmptyGame(gameNumber, ourSide) {
  return {
    gameNumber,
    ourSide: ourSide || (gameNumber % 2 === 1 ? 'BLUE' : 'RED'),
    blueBans: ['', '', '', '', ''],
    redBans:  ['', '', '', '', ''],
    bluePicks: ['', '', '', '', ''],
    redPicks:  ['', '', '', '', ''],
    history: []
  };
}

let STATE = {
  currentView: 'draft',
  mobileDraftSubView: 'POOL', // 'POOL' | 'BLUE' | 'RED' | 'ALL'
  blueColumnVolet: 'PICKS',   // 'PICKS' | 'RADAR'
  redColumnVolet: 'PICKS',    // 'PICKS' | 'RADAR'
  bo5ActiveVolet: 'GAMES',    // 'GAMES' | 'PINCH' | 'GRAVEYARD'
  rosterRoleVolet: 'ALL',     // 'ALL' | 'Top' | 'Jungle' | 'Mid' | 'Bot' | 'Support'
  slideOverTab: 'AI_TREE',    // 'AI_TREE' | 'RADAR'
  activeGameIndex: 0, // 0 to 4 (Game 1 to Game 5)
  fearlessMode: 'HARD', // 'HARD' | 'SOFT' | 'STANDARD'
  ourPerspective: 'BLUE', // 'BLUE' | 'RED'
  selectedSlot: { side: 'BLUE', type: 'BAN', index: 0 }, // Current targeted slot
  filters: {
    search: '',
    lane: 'ALL',
    riotClass: 'ALL',
    dmg: 'ALL',
    teamPool: 'ALL',
    hideUnavailable: false
  },
  teamRoster: getDefaultTeamRoster(),
  whatIfBans: ['K\'Sante'], // Pre-seeded with 1 active What-If Ban so the user immediately sees the branching work
  treeActiveSide: 'BLUE',
  decisionTrees: getDefaultDecisionTrees(),
  games: [
    // Game 1 pre-populated with a realistic partial draft so the app opens rich & immediately interactive
    {
      gameNumber: 1,
      ourSide: 'BLUE',
      blueBans: ['Skarner', 'Kalista', 'Rumble', '', ''],
      redBans:  ["K'Sante", 'Ashe', 'Vi', '', ''],
      bluePicks: ['Aurora', 'Sejuani', 'Yone', '', ''],
      redPicks:  ['Yunara', 'Wukong', 'Rell', '', ''],
      history: []
    },
    createEmptyGame(2, 'RED'),
    createEmptyGame(3, 'BLUE'),
    createEmptyGame(4, 'RED'),
    createEmptyGame(5, 'BLUE')
  ]
};

// Load saved state if available
function loadSavedState() {
  try {
    const raw = localStorage.getItem('lol_fearless_architect_2026_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.games) && parsed.games.length === 5) {
        STATE.games = parsed.games;
        STATE.fearlessMode = parsed.fearlessMode || 'HARD';
        STATE.ourPerspective = parsed.ourPerspective || 'BLUE';
        STATE.whatIfBans = Array.isArray(parsed.whatIfBans) ? parsed.whatIfBans : [];
        if (parsed.decisionTrees && parsed.decisionTrees.BLUE && parsed.decisionTrees.RED) {
          STATE.decisionTrees = parsed.decisionTrees;
        }
        if (Array.isArray(parsed.teamRoster) && parsed.teamRoster.length === 5) {
          STATE.teamRoster = parsed.teamRoster;
        }
        if (parsed.customChampOverrides) {
          applyCustomChampOverrides(parsed.customChampOverrides);
        }
      }
    }
  } catch (e) {
    // Ignore storage errors in sandboxed iframes
  }
  syncNextAvailableSlot();
}

function persistState() {
  try {
    const payload = {
      fearlessMode: STATE.fearlessMode,
      ourPerspective: STATE.ourPerspective,
      whatIfBans: STATE.whatIfBans,
      decisionTrees: STATE.decisionTrees,
      teamRoster: STATE.teamRoster,
      games: STATE.games,
      customChampOverrides: getCustomChampOverrides()
    };
    localStorage.setItem('lol_fearless_architect_2026_v1', JSON.stringify(payload));
    if (typeof window.onDraftStatePersisted === 'function') window.onDraftStatePersisted(payload);
  } catch (e) {
    // Ignore storage errors
  }
}

function getCustomChampOverrides() {
  const overrides = {};
  CHAMPIONS.forEach((c, idx) => {
    const orig = RAW_CHAMPIONS_2026[idx];
    if (!orig) return;
    if (c.subclass !== orig[1] || c.dmg !== orig[3] || c.trueDmg !== orig[4] || c.roles.join(',') !== orig[5]) {
      overrides[c.name] = {
        subclass: c.subclass,
        mainClass: (RIOT_SUBCLASS_MAP[c.subclass] || RIOT_SUBCLASS_MAP.Specialist).mainClass,
        dmg: c.dmg,
        trueDmg: c.trueDmg,
        roles: c.roles
      };
    }
  });
  return overrides;
}

function applyCustomChampOverrides(overrides) {
  if (!overrides) return;
  CHAMPIONS.forEach(c => {
    if (overrides[c.name]) {
      const o = overrides[c.name];
      c.subclass = o.subclass || c.subclass;
      c.mainClass = (RIOT_SUBCLASS_MAP[c.subclass] || RIOT_SUBCLASS_MAP.Specialist).mainClass;
      c.dmg = o.dmg || c.dmg;
      c.trueDmg = Boolean(o.trueDmg);
      if (Array.isArray(o.roles) && o.roles.length > 0) c.roles = o.roles;
    }
  });
}
