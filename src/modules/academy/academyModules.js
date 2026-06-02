export const ACADEMY_MODULES = [
  {
    id: 'scholars_mate_module',
    title: "How to Play Against Scholar's Mate",
    description: "Learn Yellow Rook's masterclass to crush the early Queen attack. Defend perfectly and seize the initiative.",
    lessons: [
      {
        id: 'scholars_mate_g4',
        title: "Lesson 1: Crush the Flank Attack (g4)",
        description: "Defend against the early Queen attack and fiercely punish the aggressive g4 pawn push.",
        startFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", 
        color: "b",
        tree: {
          prompt: "White opens with 1. e4. Let's respond by claiming our share of the center. Play e5.",
          botFirst: "e4",
          expected: "e5",
          response: "Qh5",
          next: {
            prompt: "Qh5! The classic Scholar's Mate attempt. The e5 pawn is hanging. Do not panic. Defend it calmly by developing your Queenside Knight.",
            expected: "Nc6",
            response: "Bc4",
            next: {
              prompt: "Bc4. White is directly targeting f7. Checkmate is threatened! Do NOT play Nf6 to attack the Queen, as it falls for the trap. Block the Queen's path with your g-pawn.",
              expected: "g6",
              wrong: [
                { move: "Nf6", response: "Qxf7#", msg: "Blunder! You ignored the threat, and White plays Qxf7# Checkmate! You must block the Queen's diagonal first." }
              ],
              response: "Qf3",
              next: {
                prompt: "The Queen retreats to f3, renewing the mate threat on f7. Now that g6 blocks the light-squared diagonal, safely develop your Knight to attack the center.",
                expected: "Nf6",
                response: "g4",
                next: {
                  prompt: "White pushes g4 to kick your Knight away from defending. The best way to punish a flank attack is in the center! Jump your Knight forward to attack the Queen and aim at the c2 fork.",
                  expected: "Nd4",
                  response: "Qd1",
                  next: {
                    prompt: "The Queen retreats to safety. Now, DO NOT play the slow d6. Strike immediately! Blow open the center with an aggressive pawn break.",
                    expected: "d5",
                    wrong: [
                      { move: "d6", response: "c3", msg: "d6 is too slow! It lets White play c3 to kick your Knight. Play d5 to blow open the center immediately!" }
                    ],
                    response: "exd5",
                    next: {
                      prompt: "White captures the pawn. Don't recapture immediately! Play the brilliant in-between move (Zwischenzug) developing your Bishop to hit the Queen.",
                      expected: "Bg4",
                      response: "f3",
                      next: {
                        prompt: "White blocks the attack. Now, exploit the pin on the f3 pawn and infiltrate the center with your other Knight!",
                        expected: "Ne4",
                        endpoint: "Brilliant! You've completely dismantled the Scholar's Mate. White's position collapses under the pressure, and you hold a massive initiative."
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      {
        id: 'scholars_mate_passive',
        title: "Lesson 2: Break the Passive Defense",
        description: "Counter White when they play passively with Ne2 to defend against your Knight jump.",
        startFen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4", 
        color: "b",
        tree: {
          prompt: "We reach the main position again, but this time White plays Ne2 to defend the d4 square. Continue your kingside development by fianchettoing your Bishop.",
          botFirst: "Ne2",
          expected: "Bg7",
          response: "d3",
          next: {
            prompt: "White opens the dark-squared bishop's diagonal. Your King is still in the center, so get it to safety.",
            expected: "O-O",
            response: "Bg5",
            next: {
              prompt: "White tries to pin your Knight to your Queen. Immediately ask that Bishop a question with your h-pawn.",
              expected: "h6",
              response: "Bh4",
              next: {
                prompt: "The Bishop retreats, maintaining the pin. Trap it and break the pin entirely by pushing your g-pawn!",
                expected: "g5",
                response: "Bg3",
                next: {
                  prompt: "Now that the pin is broken and White's pieces are awkward, strike in the center with full force!",
                  expected: "d5",
                  endpoint: "Excellent! The center is blown open. White's King is stranded, and you have completely neutralized their opening tricks."
                }
              }
            }
          }
        }
      },
      {
        id: 'scholars_mate_sneaky',
        title: "Lesson 3: The Sneaky Qf3 Line",
        description: "Learn what to do when White delays the Queen attack and brings it to f3 directly.",
        startFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", 
        color: "b",
        tree: {
          prompt: "White opens with 1. e4. Take the center.",
          botFirst: "e4",
          expected: "e5",
          response: "Bc4",
          next: {
            prompt: "White develops the Bishop to c4 immediately, eyeing f7. Develop your Queenside Knight.",
            expected: "Nc6",
            response: "Qf3",
            next: {
              prompt: "Aha! White brings the Queen to f3 directly to threaten mate on f7, bypassing Qh5. Defend f7 by developing your Knight.",
              expected: "Nf6",
              wrong: [
                { move: "Bc5", response: "Qxf7#", msg: "Blunder! You ignored the threat and White plays Qxf7# Checkmate! Develop the Knight to f6 to block the Queen." }
              ],
              response: "c3",
              next: {
                prompt: "White plays c3 to prepare a d4 center push. Don't wait for them! Immediately seize the initiative with your own central pawn break!",
                expected: "d5",
                endpoint: "Perfect! By playing d5, you stop White's plans, challenge the center, and gain a clear positional edge."
              }
            }
          }
        }
      }
    ]
  },
  {
    id: 'kings_indian_module',
    title: "The King's Indian Setup",
    description: "Master the universal, aggressive King's Indian system for both White and Black, based on GothamChess.",
    lessons: [
      {
        id: 'kings_indian_attack_white',
        title: "Lesson 1: King's Indian Attack (White)",
        description: "Learn the universal setup for White. Develop safely and prepare a powerful center strike.",
        startFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        color: "w",
        tree: {
          prompt: "Let's build the King's Indian Attack! This setup can be played against almost anything. Start by developing your Kingside Knight.",
          expected: "Nf3",
          response: "d5",
          next: {
            prompt: "Black grabs the center. That's fine. Prepare to fianchetto your Bishop on the kingside.",
            expected: "g3",
            response: "c5",
            next: {
              prompt: "Put your Bishop on the long diagonal to control the center from afar.",
              expected: "Bg2",
              response: "Nc6",
              next: {
                prompt: "Get your King to absolute safety before launching any attacks.",
                expected: "O-O",
                response: "e6",
                next: {
                  prompt: "Crucial step: Play the anti-attack move. Play d3 to control the center and prevent Black from pushing their pawns into your territory.",
                  expected: "d3",
                  response: "Nf6",
                  next: {
                    prompt: "Develop your Queenside Knight to d2. This uniquely supports your e-pawn without blocking your c-pawn.",
                    expected: "Nbd2",
                    response: "Be7",
                    next: {
                      prompt: "The defensive shell is complete! Now, strike in the center with your e-pawn to gain space.",
                      expected: "e4",
                      endpoint: "Perfect! You have reached the core King's Indian Attack setup. From here, you can maneuver your Knight (Nh4 or Ne1) and launch a fierce f4 pawn storm."
                    }
                  }
                }
              }
            }
          }
        }
      },
      {
        id: 'kings_indian_defense_black',
        title: "Lesson 2: King's Indian Defense vs d4",
        description: "Learn the classic King's Indian Defense structure against a d4 opening.",
        startFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        color: "b",
        tree: {
          prompt: "White opens with 1. d4. Begin the King's Indian Defense by developing your Knight.",
          botFirst: "d4",
          expected: "Nf6",
          response: "c4",
          next: {
            prompt: "White builds a massive strong center. Prepare your fianchetto to counter it from a distance.",
            expected: "g6",
            response: "Nc3",
            next: {
              prompt: "Put your Bishop on the long diagonal.",
              expected: "Bg7",
              response: "e4",
              next: {
                prompt: "White takes the full center! You MUST prevent them from pushing e5 and attacking your knight. Play your d-pawn to block it.",
                expected: "d6",
                wrong: [
                  { move: "O-O", response: "e5", msg: "Inaccuracy. White pushes e5 immediately, dislodging your knight and crushing your position. You must play d6 first!" }
                ],
                response: "Nf3",
                next: {
                  prompt: "Now that the e5 push is prevented, tuck your King safely away.",
                  expected: "O-O",
                  response: "Be2",
                  next: {
                    prompt: "The core setup is complete. Now it is time to strike back at the center. Challenge d4!",
                    expected: "e5",
                    endpoint: "Excellent! You've achieved the classic King's Indian Defense. Once the center locks, plan to move your Knight to e8 or h5 and launch the f5 pawn attack!"
                  }
                }
              }
            }
          }
        }
      },
      {
        id: 'kings_indian_pirc_black',
        title: "Lesson 3: The Pirc Defense vs e4",
        description: "How to adapt the King's Indian setup against 1. e4 and counter the aggressive 150 Attack.",
        startFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        color: "b",
        tree: {
          prompt: "White plays 1. e4. If you play Nf6 immediately, they will just push e5. Prevent this by playing your d-pawn first (The Pirc Defense).",
          botFirst: "e4",
          expected: "d6",
          wrong: [
            { move: "Nf6", response: "e5", msg: "Mistake! Against e4, playing Nf6 immediately allows the annoying e5 push. Play d6 first to control that square!" }
          ],
          response: "d4",
          next: {
            prompt: "White grabs the center. Now it's safe to develop your Knight without fear of being kicked.",
            expected: "Nf6",
            response: "Nc3",
            next: {
              prompt: "Prepare your fianchetto as usual.",
              expected: "g6",
              response: "Be3",
              next: {
                prompt: "Watch out! White plays Be3, preparing Qd2 to trade off your dark-squared bishop and attack your King. Delay castling! Start queenside expansion with your a-pawn instead.",
                expected: "a6",
                wrong: [
                  { move: "O-O", response: "Qd2", msg: "Inaccuracy. Castling directly into White's aggressive Be3/Qd2 setup is dangerous. Play a6 to start a counter-attack first!" }
                ],
                endpoint: "Great job! By playing a6 (and later b5), you create massive queenside counterplay against aggressive setups, keeping your King safe for the time being."
              }
            }
          }
        }
      }
    ]
  }
];
