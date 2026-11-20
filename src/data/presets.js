// =========================================================================
// 3. OFFICIAL 20-STEP TOURNAMENT DRAFT SEQUENCE
// =========================================================================
const DRAFT_SEQUENCE = [
  // Phase 1 Bans (1-6)
  { step: 1,  side: 'BLUE', type: 'BAN',  index: 0, code: 'BB1', label: 'Blue Ban 1 (Phase 1)' },
  { step: 2,  side: 'RED',  type: 'BAN',  index: 0, code: 'RB1', label: 'Red Ban 1 (Phase 1)' },
  { step: 3,  side: 'BLUE', type: 'BAN',  index: 1, code: 'BB2', label: 'Blue Ban 2 (Phase 1)' },
  { step: 4,  side: 'RED',  type: 'BAN',  index: 1, code: 'RB2', label: 'Red Ban 2 (Phase 1)' },
  { step: 5,  side: 'BLUE', type: 'BAN',  index: 2, code: 'BB3', label: 'Blue Ban 3 (Phase 1)' },
  { step: 6,  side: 'RED',  type: 'BAN',  index: 2, code: 'RB3', label: 'Red Ban 3 (Phase 1)' },
  // Phase 1 Picks (7-12): B1 -> R1,R2 -> B2,B3 -> R3
  { step: 7,  side: 'BLUE', type: 'PICK', index: 0, code: 'B1',  label: 'B1 — Blue First Pick (Priorité Absolue)' },
  { step: 8,  side: 'RED',  type: 'PICK', index: 0, code: 'R1',  label: 'R1 — Red Rotation 1' },
  { step: 9,  side: 'RED',  type: 'PICK', index: 1, code: 'R2',  label: 'R2 — Red Rotation 2' },
  { step: 10, side: 'BLUE', type: 'PICK', index: 1, code: 'B2',  label: 'B2 — Blue Rotation 1' },
  { step: 11, side: 'BLUE', type: 'PICK', index: 2, code: 'B3',  label: 'B3 — Blue Rotation 2' },
  { step: 12, side: 'RED',  type: 'PICK', index: 2, code: 'R3',  label: 'R3 — Red Clôture Phase 1' },
  // Phase 2 Bans (13-16): Red bans first in Phase 2
  { step: 13, side: 'RED',  type: 'BAN',  index: 3, code: 'RB4', label: 'Red Ban 4 (Phase 2 Pinch)' },
  { step: 14, side: 'BLUE', type: 'BAN',  index: 3, code: 'BB4', label: 'Blue Ban 4 (Phase 2 Pinch)' },
  { step: 15, side: 'RED',  type: 'BAN',  index: 4, code: 'RB5', label: 'Red Ban 5 (Phase 2 Pinch)' },
  { step: 16, side: 'BLUE', type: 'BAN',  index: 4, code: 'BB5', label: 'Blue Ban 5 (Phase 2 Pinch)' },
  // Phase 2 Picks (17-20): R4 -> B4,B5 -> R5
  { step: 17, side: 'RED',  type: 'PICK', index: 3, code: 'R4',  label: 'R4 — Red Ouverture Phase 2' },
  { step: 18, side: 'BLUE', type: 'PICK', index: 3, code: 'B4',  label: 'B4 — Blue Avant-Dernier Pick' },
  { step: 19, side: 'BLUE', type: 'PICK', index: 4, code: 'B5',  label: 'B5 — Blue Dernier Pick' },
  { step: 20, side: 'RED',  type: 'PICK', index: 4, code: 'R5',  label: 'R5 — Red Last Pick Counter' }
];

// =========================================================================
// 4. DEFAULT PRO DECISION TREES (BLUE B1 PRIORITY & RED R5 COUNTER)
// =========================================================================
function getDefaultDecisionTrees() {
  return {
    BLUE: [
      {
        id: 'b-node-1',
        parentId: null,
        type: 'OPENING',
        slot: 'B1 (First Pick)',
        triggerChamp: '',
        actionChamp: "K'Sante",
        backupChamp: 'Ornn',
        note: "Priorité Blue B1 blind-pickable (Warden/Skirmisher) offrant frontline et flexibilité d'engage."
      },
      {
        id: 'b-node-2',
        parentId: 'b-node-1',
        type: 'WHATIF_BAN',
        slot: 'B1 (First Pick)',
        triggerChamp: "K'Sante",
        actionChamp: 'Aurora',
        backupChamp: 'Ambessa',
        note: "What-If K'Sante est banni (ou Fearless Lock) : sécuriser le flex Mid/Top Aurora (Burst/Assassin AP) ou Ambessa."
      },
      {
        id: 'b-node-3',
        parentId: 'b-node-2',
        type: 'WHATIF_BAN',
        slot: 'B1 (First Pick)',
        triggerChamp: 'Aurora',
        actionChamp: 'Yunara',
        backupChamp: 'Varus',
        note: "Double What-If (K'Sante + Aurora bannis) : sécuriser l'hyper-carry hybride Yunara en B1 et jouer autour du Bot."
      },
      {
        id: 'b-node-4',
        parentId: 'b-node-1',
        type: 'OPENING',
        slot: 'B2-B3 (Rotation Phase 1)',
        triggerChamp: '',
        actionChamp: 'Sejuani',
        backupChamp: 'Vi',
        note: "Pairer la frontline B1 avec un Jungler Vanguard/Diver d'engage (Sejuani ou Vi) + Mid AP Burst."
      },
      {
        id: 'b-node-5',
        parentId: 'b-node-4',
        type: 'WHATIF_BAN',
        slot: 'B2-B3 (Rotation Phase 1)',
        triggerChamp: 'Sejuani',
        actionChamp: 'Maokai',
        backupChamp: 'Jarvan IV',
        note: "What-If Sejuani est bannie : basculer sur Maokai (contrôle d'objectif) ou Jarvan IV Diver."
      },
      {
        id: 'b-node-6',
        parentId: 'b-node-4',
        type: 'COUNTER_LAST',
        slot: 'B4-B5 (Last Rotation Blue)',
        triggerChamp: 'Leona',
        actionChamp: 'Braum',
        backupChamp: 'Rell',
        note: "En B4-B5, si Red engage lourd (Leona/Nautilus), verrouiller Braum Warden pour bloquer l'initiation."
      }
    ],
    RED: [
      {
        id: 'r-node-1',
        parentId: null,
        type: 'OPENING',
        slot: 'R1-R2 (Double Rotation)',
        triggerChamp: '',
        actionChamp: 'Yunara',
        backupChamp: 'Kai\'Sa',
        note: "Punir le B1 adverse en sécurisant le duo Bot/Jungle dominant sur la rotation R1-R2 (Yunara + Vi/Rell)."
      },
      {
        id: 'r-node-2',
        parentId: 'r-node-1',
        type: 'WHATIF_BAN',
        slot: 'R1-R2 (Double Rotation)',
        triggerChamp: 'Yunara',
        actionChamp: 'Mel',
        backupChamp: 'Hwei',
        note: "What-If Yunara est bannie ou prise en B1 : sécuriser Mel (Artillery/Enchanter W-Rebuttal) + Jungle AD."
      },
      {
        id: 'r-node-3',
        parentId: 'r-node-1',
        type: 'WHATIF_PICK',
        slot: 'R3 (Fin Phase 1)',
        triggerChamp: 'Ornn',
        actionChamp: 'Gwen',
        backupChamp: 'Fiora',
        note: "Si Blue verrouille un Tank tôt (Ornn/Sion), préparer Gwen ou Fiora (Skirmisher Dégâts Bruts) ou garder R5."
      },
      {
        id: 'r-node-4',
        parentId: 'r-node-1',
        type: 'COUNTER_LAST',
        slot: 'R5 (Last Pick Counter)',
        triggerChamp: '',
        actionChamp: 'Zaahen',
        backupChamp: 'Camille',
        note: "Avantage Red Side R5 Last Pick : isoler le match-up solo lane avec Zaahen (Skirmisher Darkin) ou Camille."
      },
      {
        id: 'r-node-5',
        parentId: 'r-node-4',
        type: 'WHATIF_BAN',
        slot: 'R5 (Last Pick Counter)',
        triggerChamp: 'Zaahen',
        actionChamp: 'Locke',
        backupChamp: 'Sylas',
        note: "What-If Zaahen est banni en Phase 2 (RB4/BB4) : dégainer Locke (AP Assassin Mid) ou Sylas en R5."
      }
    ]
  };
}
