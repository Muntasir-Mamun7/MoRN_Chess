export const ACADEMY_MODULES = [
  {
    id: 'scholars_mate_module',
    title: "How to Play Against Scholar's Mate",
    description: "Learn Yellow Rook's masterclass to crush the early Queen attack. Defend perfectly, navigate the deep traps, and seize the initiative.",
    lessons: [
      {
        id: 'scholars_mate_g4',
        title: "Lesson 1: Crush the Flank Attack (Deep Line)",
        description: "Defend against the early Queen attack, punish the aggressive g4 push, and execute a stunning checkmate.",
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
                        prompt: "White blocks the attack with f3. Now, ignore your Bishop! Exploit the pin on the f3 pawn and infiltrate the center with your other Knight!",
                        expected: "Ne4",
                        response: "fxg4",
                        next: {
                          prompt: "White greedily captures your Bishop. Big mistake! Because f3 moved, the e1-h4 diagonal is wide open. Bring your Queen out for a devastating check!",
                          expected: "Qh4+",
                          response: "Kf1",
                          next: {
                            prompt: "The King is trapped on f1. Deliver the final blow with your Queen, perfectly protected by your Knight!",
                            expected: "Qf2#",
                            endpoint: "Absolutely brilliant! You turned White's early aggression into a spectacular, forced checkmate. Excellent calculation."
                          }
                        }
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
        description: "Counter White when they play passively with Ne2, leading to a massive center break and an unstoppable attack.",
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
                  response: "exd5",
                  next: {
                    prompt: "White captures. Again, do not recapture blindly! Use the in-between move to attack the Queen.",
                    expected: "Bg4",
                    response: "Qe3",
                    next: {
                      prompt: "The Queen moves to e3. Now, jump your central Knight to d4! You are threatening a massive fork on c2.",
                      expected: "Nd4",
                      response: "Nxd4",
                      next: {
                        prompt: "White trades Knights. Recapture with your e-pawn, kicking the Queen again!",
                        expected: "exd4",
                        response: "Qxd4",
                        next: {
                          prompt: "White grabs the pawn, but their King is stuck in the center. Skewer the King and Queen with your Rook!",
                          expected: "Re8+",
                          endpoint: "Phenomenal! White's King is caught in the center, and their Queen is completely misplaced. You have total domination."
                        }
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
                response: "exd5",
                next: {
                  prompt: "White takes. Push your e-pawn forward to kick the Queen!",
                  expected: "e4",
                  response: "Qe2",
                  next: {
                    prompt: "The Queen slides to e2 to pin your pawn. Use your Knight to attack the Queen and defend your pawn simultaneously!",
                    expected: "Ne5",
                    endpoint: "Perfect! Your Knight on e5 is a powerhouse, your e4 pawn restricts White, and their opening trick has backfired entirely."
                  }
                }
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
    description: "Master the universal, aggressive King's Indian system for both White and Black, deep into the middlegame.",
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
                      response: "O-O",
                      next: {
                        prompt: "Black castles. To prepare a massive kingside attack, slide your Rook to e1 to support the e5 push.",
                        expected: "Re1",
                        response: "b6",
                        next: {
                          prompt: "Black expands on the queenside. Advance your e-pawn to kick the Knight and lock the center!",
                          expected: "e5",
                          response: "Nd7",
                          next: {
                            prompt: "Now the real magic: re-route your f3 Knight to f1! This prepares to swing it to h2 or g5, and clears the path for your f-pawn to attack.",
                            expected: "Nf1",
                            endpoint: "Masterful! The center is closed, and you are perfectly positioned to launch a vicious f4-f5 pawn storm against the Black King."
                          }
                        }
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
        id: 'kings_indian_defense_black',
        title: "Lesson 2: King's Indian Defense vs d4",
        description: "Learn the classic King's Indian Defense structure against a d4 opening, preparing the f5 pawn break.",
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
                    response: "d5",
                    next: {
                      prompt: "White pushes d5, closing the center. Now you must switch to a flank attack! Re-route your Knight to d7 or e8.",
                      expected: "Ne8",
                      response: "O-O",
                      next: {
                        prompt: "White castles. Unleash your attacking plan: push your f-pawn to f5 to break open the kingside!",
                        expected: "f5",
                        endpoint: "Excellent! You've achieved the classic King's Indian Defense attack. You will follow up with f4, g5, and launch a pawn storm at the White King!"
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
        id: 'kings_indian_pirc_black',
        title: "Lesson 3: The Pirc Defense vs e4",
        description: "How to adapt the King's Indian setup against 1. e4 and counter the aggressive 150 Attack with a Queenside storm.",
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
                response: "Qd2",
                next: {
                  prompt: "White is dead-set on the kingside attack. Ignore them and launch your queenside counter-attack immediately. Play b5!",
                  expected: "b5",
                  response: "f3",
                  next: {
                    prompt: "White solidifies the center. Develop your Knight to d7 to support c5 pushes and defend.",
                    expected: "Nbd7",
                    response: "O-O-O",
                    next: {
                      prompt: "White castles queenside. Develop your light-squared Bishop to b7, pointing directly at White's King!",
                      expected: "Bb7",
                      endpoint: "Great job! You navigated the dangerous 150 Attack perfectly. It is now a race: White attacks the kingside, but your queenside attack is extremely fast and potent."
                    }
                  }
                }
              }
            }
          }
        }
      }
    ]
  },
  {
    id: 'london_system_module',
    title: "Aggressive London System",
    description: "Learn GM Igor Smirnov's aggressive approach to the London System, abandoning passive retreats for crushing attacks.",
    lessons: [
      {
        id: 'london_ne5_main',
        title: "Lesson 1: The Aggressive Ne5 Anchor",
        description: "Instead of retreating your Bishop passively, learn how to anchor your Knight on e5 and launch a crushing attack.",
        startFen: "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1", 
        color: "w",
        tree: {
          prompt: "We open with 1. d4. Black responds with d5. Bring out the London Bishop to f4.",
          botFirst: "d5",
          expected: "Bf4",
          response: "Nf6",
          next: {
            prompt: "Black develops. Play e3 to solidify the center and open lines for your light-squared Bishop.",
            expected: "e3",
            response: "c5",
            next: {
              prompt: "Black strikes at the center with c5. Support your d4 pawn by playing c3. This builds the famous London pyramid.",
              expected: "c3",
              response: "Nc6",
              next: {
                prompt: "Continue standard development. Bring out your King's Knight.",
                expected: "Nf3",
                response: "e6",
                next: {
                  prompt: "Develop your remaining Knight to d2.",
                  expected: "Nbd2",
                  response: "Bd6",
                  next: {
                    prompt: "CRITICAL MOMENT! Black offers a trade. Do NOT retreat to g3. Do NOT capture on d6. Instead, anchor your Knight aggressively in the center!",
                    expected: "Ne5",
                    wrong: [
                      { move: "Bg3", response: "O-O", msg: "Inaccuracy. Retreating to g3 is too passive and allows Black easy equality. Jump into the center with Ne5!" },
                      { move: "Bxd6", response: "Qxd6", msg: "Inaccuracy. Trading helps Black develop their Queen for free. Jump to e5 instead!" }
                    ],
                    response: "O-O",
                    next: {
                      prompt: "Black ignores the Knight and castles. Continue your development by bringing out your light-squared Bishop.",
                      expected: "Bd3",
                      response: "Qc7",
                      next: {
                        prompt: "Black attacks the e5 Knight. Defend it solidly by bringing your other Knight behind it!",
                        expected: "Ndf3",
                        endpoint: "Excellent! Your Knight is a monster on e5. You are perfectly placed to launch a kingside attack while keeping the center fully locked."
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
        id: 'london_drunk_pawn',
        title: "Lesson 2: The Drunk Pawn Attack",
        description: "See what happens when Black trades the dark-squared bishops and learn the devastating 'Drunk Pawn' variation.",
        startFen: "r1bqk2r/pp3ppp/2nbpn2/2ppN3/3P1B2/2P1P3/PP1N1PPP/R2QKB1R b KQkq - 4 7", 
        color: "w",
        tree: {
          prompt: "We have the Ne5 anchor. Black decides to trade bishops to relieve the pressure.",
          botFirst: "Bxe5",
          expected: "dxe5",
          wrong: [
            { move: "fxe5", msg: "Wait, you don't have a pawn on f4! Recapture with the d-pawn." }
          ],
          response: "Nd7",
          next: {
            prompt: "Black's Knight retreats. Now, execute the 'Drunk Pawn' maneuver! Push your f-pawn to secure the e5 pawn and build a massive wall.",
            expected: "f4",
            response: "O-O",
            next: {
              prompt: "Black castles. Your pawn structure acts like an arrow pointing at their King. Bring your light-squared Bishop out.",
              expected: "Bd3",
              response: "Re8",
              next: {
                prompt: "Now the real attack begins! Bring your Queen aggressively to the kingside, eyeing h7.",
                expected: "Qh5",
                response: "Nf8",
                next: {
                  prompt: "Black defends h7. Castle kingside so you can bring your Rook into the attack.",
                  expected: "O-O",
                  response: "b6",
                  next: {
                    prompt: "Execute the Rook Lift! Bring your Rook to f3, preparing to swing it to h3 to obliterate the Black King.",
                    expected: "Rf3",
                    endpoint: "Brilliant! From here, Black is suffocating. The Rook swing to h3 is nearly impossible to stop, leading to a crushing checkmate."
                  }
                }
              }
            }
          }
        }
      },
      {
        id: 'london_delayed_nf3',
        title: "Lesson 3: The Delayed Nf3 Trap",
        description: "Delaying your Nf3 development allows you to punish early Queen attacks on b6.",
        startFen: "r1bqkbnr/pp3ppp/2n1p3/2pp4/3P1B2/2P1P3/PP1N1PPP/R2QKBNR b KQkq - 0 5", 
        color: "w",
        tree: {
          prompt: "We delayed Nf3 and developed Nbd2 instead. Black tries the tricky Qb6, attacking b2.",
          botFirst: "Qb6",
          expected: "Qb3",
          response: "c4",
          next: {
            prompt: "Black pushes c4, attacking your Queen. Slide it back safely to c2.",
            expected: "Qc2",
            response: "Bf5",
            next: {
              prompt: "Black plays Bf5, a famous theoretical sacrifice. If you had a Knight on f3, capturing would trap your Rook. But you don't! Call their bluff and capture the Bishop!",
              expected: "Qxf5",
              wrong: [
                { move: "Qd1", response: "Nf6", msg: "Too passive! The whole point of delaying Nf3 is so you can safely grab this Bishop!" }
              ],
              response: "Qxb2",
              next: {
                prompt: "Black grabs the pawn and attacks your Rook on a1. Simply slide it over to b1. Your Rook is safe!",
                expected: "Rb1",
                endpoint: "Incredible! Because you delayed Nf3, the traditional trap failed entirely. You are up a full piece and completely winning."
              }
            }
          }
        }
      },
      {
        id: 'london_jobava_trap',
        title: "Lesson 4: The Jobava Trap vs. King's Indian",
        description: "When Black plays the King's Indian Defense, switch to the Jobava London to set a deadly trap.",
        startFen: "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1", 
        color: "w",
        tree: {
          prompt: "We open with 1. d4. Black plays Nf6, indicating a King's Indian. Play the London Bishop.",
          botFirst: "Nf6",
          expected: "Bf4",
          response: "g6",
          next: {
            prompt: "Black prepares the fianchetto. Because the standard London is passive here, switch to the Jobava London! Develop your Queenside Knight aggressively.",
            expected: "Nc3",
            response: "c5",
            next: {
              prompt: "Black strikes at the center immediately. Do NOT play c3. Instead, push your d-pawn to grab space!",
              expected: "d5",
              wrong: [
                { move: "c3", response: "Bg7", msg: "Inaccuracy. c3 is too passive in the Jobava setup. Push d5 to seize space!" }
              ],
              response: "Bg7",
              next: {
                prompt: "Now lock the center down by advancing your e-pawn.",
                expected: "e4",
                response: "O-O",
                next: {
                  prompt: "Black castles. Here is where many club players blunder. Prepare the trap by playing the Queen up to d2.",
                  expected: "Qd2",
                  response: "Nc6",
                  next: {
                    prompt: "Black plays Nc6, a huge blunder in this specific line! Spring the trap—jump your Knight forward to threaten a devastating fork on c7!",
                    expected: "Nb5",
                    response: "d6",
                    next: {
                      prompt: "Black plays d6 to stop e5, but it doesn't save them. Execute the fork!",
                      expected: "Nxc7",
                      endpoint: "Crushing! You have successfully forked the Rook and the King/Queen position. Black is completely lost!"
                    }
                  }
                }
              }
            }
          }
        }
      }
    ]
  }
];
