export const ACADEMY_MODULES = [
  {
    id: 'scholars_mate_module',
    title: "How to Play Against Scholar's Mate",
    description: "Learn Yellow Rook's masterclass to crush the early Queen attack and seize the initiative.",
    lessons: [
      {
        id: 'scholars_mate_g4',
        title: "Lesson 1: Crush the Flank Attack (g4)",
        description: "Defend against the early Queen attack and punish the aggressive g4 push.",
        startFen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
        color: "b",
        tree: {
          prompt: "White opens with 1. e4. Respond by controlling the center with your e-pawn.",
          expected: "e5",
          response: "Qh5",
          next: {
            prompt: "Qh5! The e5 pawn is hanging. Defend it calmly by developing your Queenside Knight.",
            expected: "Nc6",
            response: "Bc4",
            next: {
              prompt: "Bc4 targets f7. Checkmate is threatened! Do NOT play Nf6 (it falls for the trap). Block the Queen's path with your pawn.",
              expected: "g6",
              wrong: [
                { move: "Nf6", response: "Qxf7#", msg: "Blunder! White plays Qxf7# Checkmate. You must block the Queen's diagonal first!" }
              ],
              response: "Qf3",
              next: {
                prompt: "The Queen retreats to f3, renewing the mate threat. Now that g6 blocks the diagonal, safely develop your Knight.",
                expected: "Nf6",
                response: "g4",
                next: {
                  prompt: "White pushes g4 to kick your Knight. Punish this flank attack by striking in the center! Attack the Queen and aim at c2.",
                  expected: "Nd4",
                  response: "Qd1",
                  next: {
                    prompt: "The Queen retreats. Don't play the slow d6. Strike immediately with the aggressive central pawn break!",
                    expected: "d5",
                    wrong: [
                      { move: "d6", response: "c3", msg: "d6 is too slow. It lets White defend with c3. Play d5 to blow open the center!" }
                    ],
                    response: "exd5",
                    next: {
                      prompt: "White captures. Play the brilliant in-between move to hit the Queen before recapturing the pawn.",
                      expected: "Bg4",
                      response: "f3",
                      next: {
                        prompt: "White blocks. Exploit the pin on the pawn and infiltrate with your central Knight!",
                        expected: "Ne4",
                        endpoint: "Brilliant! You've completely dismantled the Scholar's Mate. White's position collapses, and you hold a massive initiative."
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
        description: "Counter White when they try to defend d4 with Ne2.",
        startFen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
        color: "b",
        tree: {
          prompt: "White plays Ne2 to defend the d4 square. Continue your kingside development by fianchettoing your Bishop.",
          botFirst: "Ne2",
          expected: "Bg7",
          response: "d3",
          next: {
            prompt: "White opens the dark-squared bishop. Get your King to safety.",
            expected: "O-O",
            response: "Bg5",
            next: {
              prompt: "White tries to pin your Knight. Immediately ask the Bishop a question with your h-pawn.",
              expected: "h6",
              response: "Bh4",
              next: {
                prompt: "The Bishop retreats. Trap it and break the pin!",
                expected: "g5",
                response: "Bg3",
                next: {
                  prompt: "Now that the pin is broken, strike in the center with full force!",
                  expected: "d5",
                  endpoint: "Excellent! The center is blown open, and White's king is stranded. You have a completely winning position."
                }
              }
            }
          }
        }
      },
      {
        id: 'scholars_mate_sneaky',
        title: "Lesson 3: The Sneaky Qf3 Line",
        description: "What to do when White delays the Queen attack and brings it to f3 directly.",
        startFen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 2 3",
        color: "b",
        tree: {
          prompt: "White brings the Queen to f3 directly to eye f7 without playing Qh5 first. Defend f7 by developing your Knight.",
          botFirst: "Qf3",
          expected: "Nf6",
          wrong: [
            { move: "Bc5", response: "Qxf7#", msg: "Blunder! White plays Qxf7# Checkmate. Develop the Knight to f6 to block the Queen." }
          ],
          response: "c3",
          next: {
            prompt: "White plays c3 to prepare a center push. Immediately seize the initiative with a central pawn break!",
            expected: "d5",
            endpoint: "Perfect! You stop White's plans, challenge the center, and gain a clear positional edge."
          }
        }
      }
    ]
  }
];

{
    id: 'kings_indian_module',
    title: "The King's Indian Setup",
    description: "Learn the universal, aggressive King's Indian system for both White and Black, as taught by GothamChess.",
    lessons: [
      {
        id: 'kings_indian_attack_white',
        title: "Lesson 1: King's Indian Attack (White)",
        description: "Learn the universal setup for White. Develop safely and prepare a powerful center strike.",
        startFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        color: "w",
        tree: {
          prompt: "Let's build the King's Indian Attack. Start by developing your Kingside Knight.",
          expected: "Nf3",
          response: "d5",
          next: {
            prompt: "Black grabs the center. Prepare to fianchetto your Bishop on the kingside.",
            expected: "g3",
            response: "c5",
            next: {
              prompt: "Put your Bishop on the long diagonal.",
              expected: "Bg2",
              response: "Nc6",
              next: {
                prompt: "Get your King to safety.",
                expected: "O-O",
                response: "e6",
                next: {
                  prompt: "Now play the key anti-attack move. Play d3 to control the center and support future pawn pushes.",
                  expected: "d3",
                  response: "Nf6",
                  next: {
                    prompt: "Develop your Queenside Knight to d2. This supports your e-pawn without blocking the c-pawn.",
                    expected: "Nbd2",
                    response: "Be7",
                    next: {
                      prompt: "The setup is complete! Strike in the center with your e-pawn.",
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
        startFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1",
        color: "b",
        tree: {
          prompt: "White opens with 1. d4. Begin the King's Indian Defense by developing your Knight.",
          botFirst: "d4",
          expected: "Nf6",
          response: "c4",
          next: {
            prompt: "White builds a strong center. Prepare your fianchetto.",
            expected: "g6",
            response: "Nc3",
            next: {
              prompt: "Put your Bishop on the long diagonal.",
              expected: "Bg7",
              response: "e4",
              next: {
                prompt: "White takes the full center! Prevent them from pushing e5 and attacking your knight by playing your d-pawn.",
                expected: "d6",
                wrong: [
                  { move: "O-O", response: "e5", msg: "Inaccuracy. White will push e5 and crush your position. Play d6 first to stop the e-pawn!" }
                ],
                response: "Nf3",
                next: {
                  prompt: "Tuck your King safely away.",
                  expected: "O-O",
                  response: "Be2",
                  next: {
                    prompt: "The core setup is complete. Now strike back at the center!",
                    expected: "e5",
                    endpoint: "Excellent! You've achieved the classic King's Indian Defense. Once the center locks, plan to move your Knight to e8 or h5 and launch the f5 attack!"
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
        startFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1",
        color: "b",
        tree: {
          prompt: "White plays 1. e4. If you play Nf6 immediately, they will push e5. Prevent this by playing your d-pawn first (The Pirc Defense).",
          botFirst: "e4",
          expected: "d6",
          wrong: [
            { move: "Nf6", response: "e5", msg: "Mistake! Against e4, playing Nf6 immediately allows the annoying e5 push (Alekhine's Defense). Play d6 first!" }
          ],
          response: "d4",
          next: {
            prompt: "White grabs the center. Now it's safe to develop your Knight.",
            expected: "Nf6",
            response: "Nc3",
            next: {
              prompt: "Prepare your fianchetto.",
              expected: "g6",
              response: "Be3",
              next: {
                prompt: "Watch out! White is preparing Qd2 to trade off your dark-squared bishop and attack your King. Delay castling and start queenside expansion with your a-pawn!",
                expected: "a6",
                wrong: [
                  { move: "O-O", response: "Qd2", msg: "Inaccuracy. Castling into White's aggressive Be3/Qd2 setup is dangerous. Play a6 to start a counter-attack first!" }
                ],
                endpoint: "Great job! By playing a6 (and later b5), you create massive queenside counterplay against aggressive setups, keeping your King safe for now."
              }
            }
          }
        }
      }
    ]
  }
