export const ACADEMY_MODULES = [
  {
    id: 'scholars_mate_module',
    title: "How to Play Against Scholar's Mate",
    description: "Learn Yellow Rook's masterclass to crush the early Queen attack. Defend perfectly, navigate the deep traps, and seize the initiative.",
    lessons: [
      {
        id: 'scholars_mate_g4',
        title: "Lesson 1: Crush the Flank Attack (Deep Line)",
        description: "Defend against the early Queen attack, punish the aggressive g4 push, and execute a stunning checkmate sequence.",
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
            wrong: [
              { move: "d6", response: "Bc4", msg: "While d6 defends the pawn, it blocks your dark-squared bishop. Nc6 is the most active and flexible defense!" }
            ],
            response: "Bc4",
            next: {
              prompt: "Bc4. White is directly targeting f7. Checkmate is threatened! Do NOT play Nf6 to attack the Queen, as it falls for the trap. Block the Queen's path with your g-pawn.",
              expected: "g6",
              wrong: [
                { move: "Nf6", response: "Qxf7#", msg: "Blunder! You ignored the threat, and White plays Qxf7# Checkmate! You must block the Queen's diagonal first." },
                { move: "d6", response: "Qxf7#", msg: "Blunder! Playing d6 ignores the direct mate threat on f7. Block the diagonal with g6!" }
              ],
              response: "Qf3",
              next: {
                prompt: "The Queen retreats to f3, renewing the mate threat on f7. Now that g6 blocks the light-squared diagonal, safely develop your Knight to attack the center.",
                expected: "Nf6",
                response: "g4",
                next: {
                  prompt: "White pushes g4 to kick your Knight away from defending. The best way to punish a flank attack is in the center! Jump your Knight forward to attack the Queen and aim at the c2 fork.",
                  expected: "Nd4",
                  wrong: [
                    { move: "d6", response: "g5", msg: "Too passive! White plays g5, kicking your Knight and renewing the attack. Counter-attack in the center with Nd4!" }
                  ],
                  response: "Qd1",
                  next: {
                    prompt: "The Queen retreats to safety. Now, DO NOT play the slow d6. Strike immediately! Blow open the center with an aggressive d-pawn break.",
                    expected: "d5",
                    wrong: [
                      { move: "d6", response: "c3", msg: "d6 is too slow! It lets White play c3 to comfortably kick your Knight. Play d5 to blow open the center immediately!" }
                    ],
                    response: "exd5",
                    next: {
                      prompt: "White captures the pawn. Don't recapture immediately! Play the brilliant in-between move (Zwischenzug) developing your Bishop to capture the g4 pawn and hit the Queen.",
                      expected: "Bxg4",
                      wrong: [
                        { move: "Nxd5", response: "c3", msg: "Recapturing allows White to stabilize with c3. Keep the initiative! Take the g4 pawn with your Bishop to attack the Queen." }
                      ],
                      response: "f3",
                      next: {
                        prompt: "White blocks the attack with f3. Now, ignore your Bishop! Exploit the pin on the f3 pawn and infiltrate the center with your other Knight to e4!",
                        expected: "Ne4",
                        response: "fxg4",
                        next: {
                          prompt: "White greedily captures your Bishop. Big mistake! Because f3 moved, the e1-h4 diagonal is wide open. Bring your Queen out for a devastating check!",
                          expected: "Qh4+",
                          response: "Kf1",
                          next: {
                            prompt: "The King is trapped on f1. Deliver the final blow with your Queen, perfectly protected by your Knight!",
                            expected: "Qf2#",
                            endpoint: "Absolutely brilliant! You turned White's early aggression into a spectacular, forced checkmate. Excellent calculation!"
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
        startFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", 
        color: "b",
        tree: {
          prompt: "We start from the beginning. White plays 1. e4. Control the center.",
          botFirst: "e4",
          expected: "e5",
          response: "Qh5",
          next: {
            prompt: "The Queen attacks early. Defend the e5 pawn with your Knight.",
            expected: "Nc6",
            response: "Bc4",
            next: {
              prompt: "White threatens mate on f7. Shut it down with your pawn.",
              expected: "g6",
              response: "Qf3",
              next: {
                prompt: "White renews the threat. Develop your Kingside Knight.",
                expected: "Nf6",
                response: "Ne2",
                next: {
                  prompt: "Instead of attacking, White plays passively with Ne2 to defend the d4 square. Continue your kingside development by fianchettoing your Bishop.",
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
                          wrong: [
                            { move: "d6", response: "Nbc3", msg: "Too slow! When your opponent's pieces are misplaced on the flank, you must strike the center with d5!" }
                          ],
                          response: "exd5",
                          next: {
                            prompt: "White captures. Again, do not recapture blindly! Use the in-between move to develop your Bishop and attack the Queen.",
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
                                  wrong: [
                                    { move: "Bxf3", response: "gxf3", msg: "Taking the Knight is okay, but Re8+ immediately exposes the uncastled King and wins the game!" }
                                  ],
                                  response: "Kd2",
                                  next: {
                                    prompt: "The King steps to d2. Keep the initiative flowing! Develop your last minor piece and launch a discovered attack on the Queen with Ne4+.",
                                    expected: "Ne4+",
                                    response: "dxe4",
                                    next: {
                                      prompt: "White captures the Knight. Now capture their hanging Queen with your dark-squared Bishop!",
                                      expected: "Bxd4",
                                      endpoint: "Phenomenal! White's King was caught in a crossfire, and you successfully won their Queen. You have total domination."
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
                { move: "Bc5", response: "Qxf7#", msg: "Blunder! You ignored the threat and White plays Qxf7# Checkmate! Develop the Knight to f6 to block the Queen." },
                { move: "d6", response: "Qxf7#", msg: "Blunder! The diagonal is still open! You must block the Queen." }
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
                    response: "Bb3",
                    next: {
                      prompt: "The Bishop retreats. Your Knight on e5 is a powerhouse. Solidify your center by developing your light-squared Bishop to g4 to attack the Queen.",
                      expected: "Bg4",
                      response: "f3",
                      next: {
                        prompt: "White challenges the Bishop. Retreat it safely to h5, keeping the pressure on the dark squares.",
                        expected: "Bh5",
                        response: "g4",
                        next: {
                          prompt: "White aggressively pushes g4. Sacrifice your Knight for two pawns to expose the White King! Play Nfxg4.",
                          expected: "Nfxg4",
                          response: "fxg4",
                          next: {
                            prompt: "White accepts the sacrifice. Now bring your Queen out with a vicious check!",
                            expected: "Qh4+",
                            response: "Kf1",
                            next: {
                              prompt: "The King is trapped. Now capture the g4 pawn with your Bishop, creating overwhelming pressure.",
                              expected: "Bxg4",
                              endpoint: "Perfect! Your Knight sacrifice completely exposed White's King. Their opening trick has backfired entirely, and you have a crushing attack."
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
        }
      }
    ]
  },
  {
    id: 'kings_indian_module',
    title: "The King's Indian Defense (KID)",
    description: "Learn the deepest lines of the true King's Indian Defense. Master the Mar del Plata pawn storms and crush the Sämisch variation.",
    lessons: [
      {
        id: 'kid_mar_del_plata',
        title: "Lesson 1: The Mar del Plata Pawn Storm",
        description: "The classic KID attack. Lock the center, launch a devastating kingside pawn storm, and execute a brilliant rook lift.",
        startFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        color: "b",
        tree: {
          prompt: "White opens with 1. d4. Begin the King's Indian Defense by developing your Kingside Knight.",
          botFirst: "d4",
          expected: "Nf6",
          response: "c4",
          next: {
            prompt: "White takes space. Prepare your fianchetto.",
            expected: "g6",
            response: "Nc3",
            next: {
              prompt: "Develop your Bishop to the long diagonal.",
              expected: "Bg7",
              response: "e4",
              next: {
                prompt: "White grabs the full center. You MUST play d6 here to prevent them from pushing e5 and destroying your position.",
                expected: "d6",
                wrong: [
                  { move: "O-O", response: "e5", msg: "Inaccuracy. White pushes e5 immediately, dislodging your knight and crushing your position. You must play d6 first!" },
                  { move: "e5", response: "dxe5", msg: "Mistake. You lose a pawn and your structure collapses if you push e5 before d6." }
                ],
                response: "Nf3",
                next: {
                  prompt: "Now that the e5 push is prevented, tuck your King safely away.",
                  expected: "O-O",
                  response: "Be2",
                  next: {
                    prompt: "The core setup is complete. Now it is time to strike back at the center. Challenge d4!",
                    expected: "e5",
                    response: "O-O",
                    next: {
                      prompt: "White castles. Develop your Queenside Knight to c6 to put maximum pressure on d4.",
                      expected: "Nc6",
                      response: "d5",
                      next: {
                        prompt: "White pushes d5, closing the center. This is the Mar del Plata! Now you must attack the flank. Re-route your Knight to e7.",
                        expected: "Ne7",
                        wrong: [
                          { move: "Nb8", response: "Ne1", msg: "Nb8 is too passive. Ne7 prepares to support the kingside pawn storm!" }
                        ],
                        response: "Ne1",
                        next: {
                          prompt: "White prepares queenside expansion with c5. Re-route your other Knight to d7 to defend c5 and prepare the f-pawn push.",
                          expected: "Nd7",
                          response: "Nd3",
                          next: {
                            prompt: "White is readying c5. Launch the thematic King's Indian pawn break: f5!",
                            expected: "f5",
                            response: "f3",
                            next: {
                              prompt: "White defends the e4 pawn. Lock the kingside by pushing f4 to entomb White's Bishop!",
                              expected: "f4",
                              wrong: [
                                { move: "fxe4", response: "fxe4", msg: "Do not open lines for White's pieces! Keep the center locked to build your pawn storm." }
                              ],
                              response: "Bd2",
                              next: {
                                prompt: "White continues their queenside plan. Continue your pawn storm. Push g5!",
                                expected: "g5",
                                response: "c5",
                                next: {
                                  prompt: "White attacks the queenside. Ignore it! Move your Knight to g6 to support the h5 and g4 pushes.",
                                  expected: "Ng6",
                                  response: "Rc1",
                                  next: {
                                    prompt: "White prepares to breach c7. Re-route your d7 Knight to f6 to join the kingside assault.",
                                    expected: "Nf6",
                                    response: "b4",
                                    next: {
                                      prompt: "The race is on! Push h5 to prepare the ultimate g4 break.",
                                      expected: "h5",
                                      response: "h3",
                                      next: {
                                        prompt: "White tries to slow you down. Execute the legendary Mar del Plata Rook lift! Bring your Rook to f7.",
                                        expected: "Rf7",
                                        response: "a4",
                                        next: {
                                          prompt: "Play Bf8 to defend c7 and allow your Rook to swing to g7.",
                                          expected: "Bf8",
                                          endpoint: "Masterpiece! You have constructed the ultimate King's Indian attacking machine. You will swing your Rook to g7, play g4, sacrifice a Knight if needed, and hunt down the White King!"
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
                    }
                  }
                }
              }
            }
          }
        }
      },
      {
        id: 'kid_samisch',
        title: "Lesson 2: Crushing the Sämisch",
        description: "White plays f3 early to stop your kingside storm. Shift gears and blast open the center with the c5 break.",
        startFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        color: "b",
        tree: {
          prompt: "Play 1. d4.",
          botFirst: "d4",
          expected: "Nf6",
          response: "c4",
          next: {
            prompt: "Play g6.",
            expected: "g6",
            response: "Nc3",
            next: {
              prompt: "Play Bg7.",
              expected: "Bg7",
              response: "e4",
              next: {
                prompt: "Play d6 to secure the center.",
                expected: "d6",
                response: "f3",
                next: {
                  prompt: "Aha! The Sämisch Variation. White plays f3 to completely blunt your kingside pawn storm. Castle your King.",
                  expected: "O-O",
                  response: "Be3",
                  next: {
                    prompt: "White develops aggressively. Since a kingside attack won't work well here, we strike differently. Play c5 to blast open the center!",
                    expected: "c5",
                    wrong: [
                      { move: "e5", response: "d5", msg: "While e5 is playable, c5 is the sharpest and most aggressive way to punish the slow Sämisch setup." }
                    ],
                    response: "d5",
                    next: {
                      prompt: "White locks the center. Now play e6 to constantly undermine the d5 pawn.",
                      expected: "e6",
                      response: "Qd2",
                      next: {
                        prompt: "White prepares to castle queenside. Capture on d5!",
                        expected: "exd5",
                        response: "cxd5",
                        next: {
                          prompt: "White recaptures. Now expand on the queenside where the position is open. Play a6!",
                          expected: "a6",
                          response: "Nge2",
                          next: {
                            prompt: "White continues development. Bring your Rook to the semi-open e-file.",
                            expected: "Re8",
                            response: "Ng3",
                            next: {
                              prompt: "Develop your Queenside Knight to d7.",
                              expected: "Nbd7",
                              response: "Be2",
                              next: {
                                prompt: "White prepares to castle. Jump your Knight into the strong e5 outpost!",
                                expected: "Ne5",
                                response: "O-O",
                                next: {
                                  prompt: "White decides to castle kingside instead. Push b5 to launch a massive queenside attack!",
                                  expected: "b5",
                                  endpoint: "Fantastic! In the Sämisch, you correctly switched from a kingside attack to a central/queenside explosion. Your Knight on e5 is dominant, and your b5 push creates massive problems for White."
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
            }
          }
        }
      },
      {
        id: 'kings_indian_attack_white',
        title: "Lesson 3: The King's Indian Attack (White)",
        description: "Learn how to use the KID setup as White. Deep middlegame theory resulting in a brilliant piece sacrifice.",
        startFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        color: "w",
        tree: {
          prompt: "Let's build the King's Indian Attack as White! This can be played against almost anything. Start with Nf3.",
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
                  prompt: "Play the anti-attack move. Play d3 to control the center.",
                  expected: "d3",
                  response: "Nf6",
                  next: {
                    prompt: "Develop your Queenside Knight to d2. This uniquely supports your e-pawn.",
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
                            prompt: "Now the real magic: re-route your f3 Knight to f1! This prepares to swing it to h2 or g5.",
                            expected: "Nf1",
                            response: "Bb7",
                            next: {
                              prompt: "Start expanding your kingside space. Push h4!",
                              expected: "h4",
                              response: "Rc8",
                              next: {
                                prompt: "Develop your dark-squared Bishop to f4 to support the center and eye the kingside.",
                                expected: "Bf4",
                                response: "b5",
                                next: {
                                  prompt: "Black prepares a b4 push. Swing your Knight to h2, preparing to jump to g4.",
                                  expected: "N1h2",
                                  response: "a5",
                                  next: {
                                    prompt: "Jump the Knight into the attack! Play Ng4.",
                                    expected: "Ng4",
                                    response: "a4",
                                    next: {
                                      prompt: "Black pushes a4. Ignore it and bring your Queen up to d2.",
                                      expected: "Qd2",
                                      response: "b4",
                                      next: {
                                        prompt: "Black's queenside attack is crashing through, but your kingside attack is faster! Sacrifice your Bishop on h6 to obliterate the King's cover!",
                                        expected: "Bh6",
                                        response: "gxh6",
                                        next: {
                                          prompt: "Black accepts the sacrifice. Capture the h6 pawn with your Queen!",
                                          expected: "Qxh6",
                                          endpoint: "Masterful! The classic King's Indian Attack sacrifice. Black's King is completely exposed, and you will follow up with Ng5, forcing checkmate!"
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
    id: 'london_system_hikaru_masterclass',
    title: "Hikaru's London Masterclass",
    description: "Learn GM Hikaru Nakamura's principles for the London System. Build the perfect setup, punish early checks, and execute the Stonewall hybrid.",
    lessons: [
      {
        id: 'hikaru_london_basics',
        title: "Lesson 1: Punishing the Early Check",
        description: "Hikaru emphasizes building the core London setup. See why an early Bb4+ from Black is a mistake and how to punish it.",
        startFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", 
        color: "w",
        tree: {
          prompt: "We open with 1. d4.",
          expected: "d4",
          response: "d5",
          next: {
            prompt: "Develop your Bishop to f4 to enter the London System.",
            expected: "Bf4",
            response: "Nf6",
            next: {
              prompt: "Play e3 to solidify the center and open lines for your light-squared Bishop.",
              expected: "e3",
              response: "e6",
              next: {
                prompt: "Develop your King's Knight to f3.",
                expected: "Nf3",
                response: "Bb4+",
                next: {
                  prompt: "Black plays an early Bb4 check. According to Hikaru, this is a mistake! You want to play c3 anyway to build the London pyramid. Play c3, attacking the Bishop and gaining a free tempo!",
                  expected: "c3",
                  wrong: [
                    { move: "Nd2", response: "O-O", msg: "Blocking with the Knight wastes an opportunity. In the London, you want a pawn on c3. Use c3 to block the check and attack the Bishop simultaneously!" },
                    { move: "Nc3", response: "O-O", msg: "Nc3 blocks your c-pawn, which is terrible in the London. Play c3!" }
                  ],
                  response: "Ba5",
                  next: {
                    prompt: "The Bishop retreats awkwardly. Now, develop your Queenside Knight to d2.",
                    expected: "Nbd2",
                    response: "O-O",
                    next: {
                      prompt: "Black castles. Complete the ideal setup by developing your light-squared Bishop to d3.",
                      expected: "Bd3",
                      response: "c5",
                      next: {
                        prompt: "Black finally challenges the center. Since the pyramid is built, anchor your Knight aggressively into the center! Play Ne5.",
                        expected: "Ne5",
                        response: "Nc6",
                        next: {
                          prompt: "Black develops. Now Castle to secure your King.",
                          expected: "O-O",
                          endpoint: "Perfect! As Hikaru notes, Black wasted time with Bb4+, allowing you to easily achieve the absolute perfect London setup: Pawns on c3, d4, e3; Bishops on d3 and f4; and a dominant Knight on e5."
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
        id: 'hikaru_stonewall_hybrid',
        title: "Lesson 2: The Stonewall Hybrid Attack",
        description: "When Black plays passively, Hikaru recommends using the Ne5 anchor to build a Stonewall structure with a devastating attack.",
        startFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", 
        color: "w",
        tree: {
          prompt: "Play 1. d4 to begin.",
          expected: "d4",
          response: "d5",
          next: {
            prompt: "Develop your Bishop to f4.",
            expected: "Bf4",
            response: "Nf6",
            next: {
              prompt: "Solidify the center with e3.",
              expected: "e3",
              response: "e6",
              next: {
                prompt: "Develop the King's Knight.",
                expected: "Nf3",
                response: "c5",
                next: {
                  prompt: "Build the London pyramid. Play c3.",
                  expected: "c3",
                  response: "Nc6",
                  next: {
                    prompt: "Develop your Queenside Knight.",
                    expected: "Nbd2",
                    response: "h6",
                    next: {
                      prompt: "Black plays passively with h6. Continue development with Bd3.",
                      expected: "Bd3",
                      response: "Bd6",
                      next: {
                        prompt: "Black offers a bishop trade. As Hikaru explains, DO NOT retreat to g3 or trade. Anchor your Knight aggressively on e5!",
                        expected: "Ne5",
                        wrong: [
                          { move: "Bg3", response: "O-O", msg: "Retreating allows Black to equalize comfortably. Play Ne5!" },
                          { move: "Bxd6", response: "Qxd6", msg: "Trading helps Black develop. Jump your Knight to e5!" }
                        ],
                        response: "O-O",
                        next: {
                          prompt: "Black ignores the tension. Now, execute the Stonewall Hybrid! Push your f-pawn to f4 to secure the e5 Knight.",
                          expected: "f4",
                          response: "Qc7",
                          next: {
                            prompt: "Black brings the Queen out. Castle your King to safety.",
                            expected: "O-O",
                            response: "b6",
                            next: {
                              prompt: "Black prepares a fianchetto. Now, start the attack! Bring your Queen to f3 to prepare Qh3.",
                              expected: "Qf3",
                              response: "Bb7",
                              next: {
                                prompt: "Black finishes development. Slide your Queen to h3, eyeing the h6 pawn.",
                                expected: "Qh3",
                                response: "Ne7",
                                next: {
                                  prompt: "Black routes the Knight. Now push g4! You are going to rip open the kingside.",
                                  expected: "g4",
                                  response: "Ne4",
                                  next: {
                                    prompt: "Black jumps into the center. Hikaru's crucial tip: When trading an e5 Knight, ALWAYS recapture towards the center with the f-pawn. Play Bxe4.",
                                    expected: "Bxe4",
                                    response: "dxe4",
                                    next: {
                                      prompt: "Black recaptures. Now push g5! The attack is completely overwhelming.",
                                      expected: "g5",
                                      endpoint: "Brilliant! You successfully executed the Stonewall Hybrid in the London System. Black is suffocating, and your attack down the g and h files is completely unstoppable."
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
                }
              }
            }
          }
        }
      },
      {
        id: 'hikaru_london_jobava_trap',
        title: "Lesson 3: Punishing the King's Indian Setup",
        description: "When Black plays the King's Indian Defense, switch to the Jobava London. Force a Queen trade and win with a devastating Royal Fork.",
        startFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", 
        color: "w",
        tree: {
          prompt: "We open with 1. d4.",
          expected: "d4",
          response: "Nf6",
          next: {
            prompt: "Black plays Nf6, indicating a King's Indian. Play the London Bishop to f4.",
            expected: "Bf4",
            response: "g6",
            next: {
              prompt: "Black prepares the fianchetto. The standard London is too slow here. Switch to the Jobava London! Play Nc3.",
              expected: "Nc3",
              response: "d5",
              next: {
                prompt: "Black plays d5 to stop your e4 push. Play e3.",
                expected: "e3",
                response: "c5",
                next: {
                  prompt: "Black strikes with c5. Open the center to exploit their delayed Bishop! Capture the c5 pawn.",
                  expected: "dxc5",
                  wrong: [
                    { move: "c3", response: "Bg7", msg: "Inaccuracy. c3 is too passive in the Jobava setup. Capture on c5 or play something active!" }
                  ],
                  response: "Bg7",
                  next: {
                    prompt: "Black develops the Bishop. Now push e4 to grab immense space and open the position.",
                    expected: "e4",
                    response: "O-O",
                    next: {
                      prompt: "Black castles. Play Qd2 to prepare queenside castling and support your pieces.",
                      expected: "Qd2",
                      response: "Nc6",
                      next: {
                        prompt: "Black plays Nc6. This is a massive theoretical blunder! Punish it instantly. Jump your Knight to b5!",
                        expected: "Nb5",
                        response: "e5",
                        next: {
                          prompt: "Black panics and plays e5 to block the bishop. Capture it with your d-pawn.",
                          expected: "dxe5",
                          response: "Ne4",
                          next: {
                            prompt: "The Knight jumps to e4, hitting your Queen. Trade Queens! This is essential to remove the defender of the c7 square.",
                            expected: "Qxd8",
                            wrong: [
                              { move: "Nf3", response: "Qa5+", msg: "Too slow! Black plays Qa5+ and you lose the initiative. Capture the Queen on d8!" },
                              { move: "Qe3", response: "Qa5+", msg: "You must trade Queens to remove the defense of c7!" }
                            ],
                            response: "Rxd8",
                            next: {
                              prompt: "Black recaptures. Now execute the brutal fork! Play Nc7.",
                              expected: "Nc7",
                              response: "Rb8",
                              next: {
                                prompt: "The Rook runs away. Now play f3! This kicks the Knight on e4, winning a full piece because the Black King cannot defend it.",
                                expected: "f3",
                                wrong: [
                                  { move: "fxe4", msg: "You don't have a pawn on f3 to capture on e4! Play f3 to attack the knight." },
                                  { move: "Bxe5", response: "Nxe5", msg: "Don't trade the Bishop! Trap the Knight with f3." }
                                ],
                                response: "Nc5",
                                next: {
                                  prompt: "The Knight retreats. Now develop your Kingside Knight to h3, securing your massive advantage.",
                                  expected: "Nh3",
                                  endpoint: "Crushing! You have successfully executed the legendary Jobava trap. You are up a full piece, their position is in ruins, and you will win this endgame easily!"
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
            }
          }
        }
      }
    ]
  },
  {
    id: 'coordinate_mastery_module',
    title: "Coordinate Mastery & Board Vision",
    description: "Train your board vision like a Grandmaster. Pilot your pieces to exact coordinates in these 15-move deep obstacle courses. (The Black Knight safely jumps in the corner).",
    lessons: [
      {
        id: 'vision_knight_tour',
        title: "Drill 1: The Knight's Vision",
        description: "Knights move in L-shapes. Jump to the exact coordinates requested to complete the tour.",
        startFen: "k7/8/8/8/8/8/8/n4N1K w - - 0 1",
        color: "w",
        tree: {
          prompt: "Welcome to Coordinate Mastery! Let's begin. Find the d2 square and jump there.",
          expected: "Nd2",
          response: "Nb3",
          next: {
            prompt: "Good! Now jump up to e4.",
            expected: "Ne4",
            response: "Na1",
            next: {
              prompt: "Excellent. Find g5.",
              expected: "Ng5",
              response: "Nb3",
              next: {
                prompt: "Hit f7.",
                expected: "Nf7",
                response: "Na1",
                next: {
                  prompt: "Drop down to d6.",
                  expected: "Nd6",
                  response: "Nb3",
                  next: {
                    prompt: "Jump to b5.",
                    expected: "Nb5",
                    response: "Na1",
                    next: {
                      prompt: "Hit c3.",
                      expected: "Nc3",
                      response: "Nb3",
                      next: {
                        prompt: "Move to e2.",
                        expected: "Ne2",
                        response: "Na1",
                        next: {
                          prompt: "Find f4.",
                          expected: "Nf4",
                          response: "Nb3",
                          next: {
                            prompt: "Jump to h5.",
                            expected: "Nh5",
                            response: "Na1",
                            next: {
                              prompt: "Drop to g3.",
                              expected: "Ng3",
                              response: "Nb3",
                              next: {
                                prompt: "Jump to e2.",
                                expected: "Ne2",
                                response: "Na1",
                                next: {
                                  prompt: "Finish the drill! Land on c1.",
                                  expected: "Nc1",
                                  endpoint: "Fantastic! You navigated the board using only a Knight. Your board vision is improving!"
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
            }
          }
        }
      },
      {
        id: 'vision_queen_crossmap',
        title: "Drill 2: The Queen's Crossmap",
        description: "Master ranks, files, and diagonals by sliding the Queen to precise coordinates.",
        startFen: "k7/8/8/8/8/8/8/n5Q1 w - - 0 1",
        color: "w",
        tree: {
          prompt: "Let's test your long-range vision. Slide your Queen straight up to g4.",
          expected: "Qg4",
          response: "Nb3",
          next: {
            prompt: "Slide diagonally to f5.",
            expected: "Qf5",
            response: "Na1",
            next: {
              prompt: "Slide down to c2.",
              expected: "Qc2",
              response: "Nb3",
              next: {
                prompt: "Move left to b2.",
                expected: "Qb2",
                response: "Na1",
                next: {
                  prompt: "Slide diagonally to d4.",
                  expected: "Qd4",
                  response: "Nb3",
                  next: {
                    prompt: "Snipe across to h4.",
                    expected: "Qh4",
                    response: "Na1",
                    next: {
                      prompt: "Move up to f6.",
                      expected: "Qf6",
                      response: "Nb3",
                      next: {
                        prompt: "Slide straight down file f to f3.",
                        expected: "Qf3",
                        response: "Na1",
                        next: {
                          prompt: "Slice up the diagonal to c6.",
                          expected: "Qc6",
                          response: "Nb3",
                          next: {
                            prompt: "Drop down file c to c3.",
                            expected: "Qc3",
                            response: "Na1",
                            next: {
                              prompt: "Slide horizontally right to f3.",
                              expected: "Qf3",
                              response: "Nb3",
                              next: {
                                prompt: "Drop down diagonally to g2.",
                                expected: "Qg2",
                                response: "Na1",
                                next: {
                                  prompt: "Fire all the way up the diagonal to b7.",
                                  expected: "Qb7",
                                  response: "Nb3",
                                  next: {
                                    prompt: "Slide back down the diagonal to e4.",
                                    expected: "Qe4",
                                    response: "Na1",
                                    next: {
                                      prompt: "Finish the drill! Slide down-left to d3.",
                                      expected: "Qd3",
                                      endpoint: "Brilliant! You executed a perfect coordinate sprint with zero mistakes."
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
                }
              }
            }
          }
        }
      },
      {
        id: 'vision_rook_elevator',
        title: "Drill 3: The Rook's Elevator",
        description: "Focus entirely on straight geometry. Move the Rook to the exact coordinate intersections.",
        startFen: "k7/8/8/8/8/8/8/n6R w - - 0 1",
        color: "w",
        tree: {
          prompt: "Move the Rook straight up to h4.",
          expected: "Rh4",
          response: "Nb3",
          next: {
            prompt: "Slide left to g4.",
            expected: "Rg4",
            response: "Na1",
            next: {
              prompt: "Move up to g5.",
              expected: "Rg5",
              response: "Nb3",
              next: {
                prompt: "Slide left to f5.",
                expected: "Rf5",
                response: "Na1",
                next: {
                  prompt: "Drop down to f2.",
                  expected: "Rf2",
                  response: "Nb3",
                  next: {
                    prompt: "Slide left to e2.",
                    expected: "Re2",
                    response: "Na1",
                    next: {
                      prompt: "Move up to e6.",
                      expected: "Re6",
                      response: "Nb3",
                      next: {
                        prompt: "Slide left to d6.",
                        expected: "Rd6",
                        response: "Na1",
                        next: {
                          prompt: "Drop down to d3.",
                          expected: "Rd3",
                          response: "Nb3",
                          next: {
                            prompt: "Slide left to c3.",
                            expected: "Rc3",
                            response: "Na1",
                            next: {
                              prompt: "Drop down to c1.",
                              expected: "Rc1",
                              response: "Nb3",
                              next: {
                                prompt: "Slide right to e1.",
                                expected: "Re1",
                                response: "Na1",
                                next: {
                                  prompt: "Move all the way up to e7.",
                                  expected: "Re7",
                                  response: "Nb3",
                                  next: {
                                    prompt: "Slide right to h7.",
                                    expected: "Rh7",
                                    response: "Na1",
                                    next: {
                                      prompt: "Finish the drill! Drop to h2.",
                                      expected: "Rh2",
                                      endpoint: "Fantastic geometry! Your linear board vision is locked in."
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
                }
              }
            }
          }
        }
      },
      {
        id: 'vision_dark_sniper',
        title: "Drill 4: The Dark-Square Sniper",
        description: "Navigate exclusively on the dark squares to master complex diagonal vision.",
        startFen: "k7/8/8/8/8/8/8/n1B4K w - - 0 1",
        color: "w",
        tree: {
          prompt: "Your Bishop is on c1, a dark square. Move it to d2.",
          expected: "Bd2",
          response: "Nb3",
          next: {
            prompt: "Slide down to e1.",
            expected: "Be1",
            response: "Na1",
            next: {
              prompt: "Snipe across the board to h4.",
              expected: "Bh4",
              response: "Nb3",
              next: {
                prompt: "Slide up to g5.",
                expected: "Bg5",
                response: "Na1",
                next: {
                  prompt: "Move up to h6.",
                  expected: "Bh6",
                  response: "Nb3",
                  next: {
                    prompt: "Snipe across to f8.",
                    expected: "Bf8",
                    response: "Na1",
                    next: {
                      prompt: "Drop down to e7.",
                      expected: "Be7",
                      response: "Nb3",
                      next: {
                        prompt: "Move up to d8.",
                        expected: "Bd8",
                        response: "Na1",
                        next: {
                          prompt: "Snipe across to a5.",
                          expected: "Ba5",
                          response: "Nb3",
                          next: {
                            prompt: "Drop down to b4.",
                            expected: "Bb4",
                            response: "Na1",
                            next: {
                              prompt: "Drop down again to a3.",
                              expected: "Ba3",
                              response: "Nb3",
                              next: {
                                prompt: "Snipe back to c1.",
                                expected: "Bc1",
                                response: "Na1",
                                next: {
                                  prompt: "Move up to d2.",
                                  expected: "Bd2",
                                  response: "Nb3",
                                  next: {
                                    prompt: "Move up to e3.",
                                    expected: "Be3",
                                    response: "Na1",
                                    next: {
                                      prompt: "Finish the drill! Drop to f2.",
                                      expected: "Bf2",
                                      endpoint: "Outstanding! You successfully identified and navigated the dark-square complex using pure coordinate vision."
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
                }
              }
            }
          }
        }
      },
      {
        id: 'vision_light_sniper',
        title: "Drill 5: The Light-Square Sniper",
        description: "Master the light squares. If you can instantly see diagonal intersections, tactics become easy.",
        startFen: "k7/8/8/8/8/8/8/n4B1K w - - 0 1",
        color: "w",
        tree: {
          prompt: "Your Bishop is on f1, a light square. Move it up to e2.",
          expected: "Be2",
          response: "Nb3",
          next: {
            prompt: "Slide up the diagonal to d3.",
            expected: "Bd3",
            response: "Na1",
            next: {
              prompt: "Move up to c4.",
              expected: "Bc4",
              response: "Nb3",
              next: {
                prompt: "Move up to b5.",
                expected: "Bb5",
                response: "Na1",
                next: {
                  prompt: "Move to the edge: a6.",
                  expected: "Ba6",
                  response: "Nb3",
                  next: {
                    prompt: "Snipe the back rank square c8.",
                    expected: "Bc8",
                    response: "Na1",
                    next: {
                      prompt: "Drop down to d7.",
                      expected: "Bd7",
                      response: "Nb3",
                      next: {
                        prompt: "Drop down to e6.",
                        expected: "Be6",
                        response: "Na1",
                        next: {
                          prompt: "Drop down to f5.",
                          expected: "Bf5",
                          response: "Nb3",
                          next: {
                            prompt: "Move up-right diagonally to g6.",
                            expected: "Bg6",
                            response: "Na1",
                            next: {
                              prompt: "Move to the edge: h7.",
                              expected: "Bh7",
                              response: "Nb3",
                              next: {
                                prompt: "Slide down-left diagonally back to g6.",
                                expected: "Bg6",
                                response: "Na1",
                                next: {
                                  prompt: "Slide up-left diagonally to f7.",
                                  expected: "Bf7",
                                  response: "Nb3",
                                  next: {
                                    prompt: "Jump up to e8.",
                                    expected: "Be8",
                                    response: "Na1",
                                    next: {
                                      prompt: "Finish the drill! Drop down to d7.",
                                      expected: "Bd7",
                                      endpoint: "Flawless execution! You now have a complete geometric map of the light squares in your head."
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
                }
              }
            }
          }
        }
      }
    ]
  }
];
