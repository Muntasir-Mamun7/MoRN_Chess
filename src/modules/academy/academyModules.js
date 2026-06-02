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
    id: 'london_system_module',
    title: "Aggressive London System",
    description: "Abandon passive retreats for crushing attacks. Learn GM Igor Smirnov's brutal London System traps.",
    lessons: [
      {
        id: 'london_ne5_main',
        title: "Lesson 1: The Ne5 Anchor",
        description: "Instead of retreating your Bishop passively, learn how to anchor your Knight on e5 and launch a crushing attack.",
        startFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", 
        color: "w",
        tree: {
          prompt: "We open with 1. d4.",
          expected: "d4",
          response: "d5",
          next: {
            prompt: "Bring out the London Bishop to f4.",
            expected: "Bf4",
            response: "Nf6",
            next: {
              prompt: "Play e3 to solidify the center and open lines for your light-squared Bishop.",
              expected: "e3",
              response: "c5",
              next: {
                prompt: "Black strikes at the center. Support your d4 pawn by playing c3. This builds the famous London pyramid.",
                expected: "c3",
                response: "Nc6",
                next: {
                  prompt: "Bring out your King's Knight.",
                  expected: "Nf3",
                  response: "e6",
                  next: {
                    prompt: "Develop your remaining Knight to d2.",
                    expected: "Nbd2",
                    response: "Bd6",
                    next: {
                      prompt: "CRITICAL MOMENT! Black offers a trade. Do NOT retreat to g3. Do NOT capture on d6. Instead, anchor your Knight aggressively in the center to e5!",
                      expected: "Ne5",
                      wrong: [
                        { move: "Bg3", response: "O-O", msg: "Inaccuracy. Retreating to g3 is too passive and allows Black easy equality. Jump into the center with Ne5!" },
                        { move: "Bxd6", response: "Qxd6", msg: "Inaccuracy. Trading helps Black develop their Queen for free. Jump to e5 instead!" }
                      ],
                      response: "O-O",
                      next: {
                        prompt: "Black ignores the Knight and castles. Continue your development by bringing out your light-squared Bishop to d3.",
                        expected: "Bd3",
                        response: "Qc7",
                        next: {
                          prompt: "Black attacks the e5 Knight. Defend it solidly by bringing your other Knight behind it!",
                          expected: "Ndf3",
                          response: "b6",
                          next: {
                            prompt: "Black prepares a queenside fianchetto. Castle your King to safety.",
                            expected: "O-O",
                            response: "Bb7",
                            next: {
                              prompt: "Black finishes development. Slide your Queen's Rook to c1, preparing for action on the c-file.",
                              expected: "Rc1",
                              response: "Ne7",
                              next: {
                                prompt: "Black routes their Knight. Push your h-pawn to h4 to start generating kingside attacking ideas!",
                                expected: "h4",
                                response: "Ne4",
                                next: {
                                  prompt: "Black jumps into the center. Undermine their position by challenging the f6 square. Play Ng5!",
                                  expected: "Ng5",
                                  response: "f6",
                                  next: {
                                    prompt: "Black attacks the Knight. Ignore it! Sacrifice the Knight by capturing on e6 to fork the Queen and Rook!",
                                    expected: "Nxe6",
                                    response: "Qc8",
                                    next: {
                                      prompt: "The Queen moves. Capture the Rook on f8!",
                                      expected: "Nxf8",
                                      endpoint: "Excellent! Your Knight was a monster on e5. You successfully navigated the complications and won an exchange!"
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
        id: 'london_drunk_pawn',
        title: "Lesson 2: The Drunk Pawn Attack",
        description: "See what happens when Black trades the dark-squared bishops and learn the devastating 'Drunk Pawn' variation.",
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
              response: "c5",
              next: {
                prompt: "Build the pyramid. Play c3.",
                expected: "c3",
                response: "Nc6",
                next: {
                  prompt: "Develop your King's Knight.",
                  expected: "Nf3",
                  response: "e6",
                  next: {
                    prompt: "Develop your Queenside Knight.",
                    expected: "Nbd2",
                    response: "Bd6",
                    next: {
                      prompt: "Anchor your Knight aggressively on e5!",
                      expected: "Ne5",
                      response: "Bxe5",
                      next: {
                        prompt: "Black decides to trade bishops to relieve the pressure. Recapture with the d-pawn!",
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
                            response: "f6",
                            next: {
                              prompt: "Black tries to break your wall. Ignore it and bring your Queen aggressively to the kingside, eyeing h7.",
                              expected: "Qh5",
                              response: "g6",
                              next: {
                                prompt: "Black blocks the diagonal. Slide your Queen back to h3, keeping the pressure.",
                                expected: "Qh3",
                                response: "f5",
                                next: {
                                  prompt: "Black locks the center. It's time to rip it open again. Push g4!",
                                  expected: "g4",
                                  response: "Qe7",
                                  next: {
                                    prompt: "Black brings the Queen over to defend. Break the pawn structure! Play gxf5.",
                                    expected: "gxf5",
                                    response: "exf5",
                                    next: {
                                      prompt: "Black recaptures. Now jump your other Knight to f3! It is headed for g5.",
                                      expected: "Nf3",
                                      response: "c4",
                                      next: {
                                        prompt: "Black attacks the Bishop. Retreat it safely to c2.",
                                        expected: "Bc2",
                                        response: "Nc5",
                                        next: {
                                          prompt: "Black centralizes. Castle queenside to bring your final Rook into the game!",
                                          expected: "O-O-O",
                                          endpoint: "Brilliant! From here, Black is suffocating. The Knight jumps to g5, and your attack down the g and h files is completely unstoppable."
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
        id: 'london_delayed_nf3',
        title: "Lesson 3: The Delayed Nf3 Trap",
        description: "Delaying your Nf3 development allows you to punish early Queen attacks on b6.",
        startFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", 
        color: "w",
        tree: {
          prompt: "Play 1. d4.",
          expected: "d4",
          response: "d5",
          next: {
            prompt: "Develop your Bishop to f4.",
            expected: "Bf4",
            response: "Nf6",
            next: {
              prompt: "Play e3.",
              expected: "e3",
              response: "c5",
              next: {
                prompt: "Play c3.",
                expected: "c3",
                response: "Nc6",
                next: {
                  prompt: "Here is the trick! Do NOT play Nf3 yet. Play your Queenside Knight to d2 first.",
                  expected: "Nd2",
                  response: "Qb6",
                  next: {
                    prompt: "Black tries the tricky Qb6, attacking b2. Defend it and counter-attack with Qb3.",
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
                          response: "Qxa2",
                          next: {
                            prompt: "Black grabs the a-pawn, hoping to escape. Trap the Queen by taking on b7!",
                            expected: "Rxb7",
                            response: "Qa1+",
                            next: {
                              prompt: "Black delivers a spite check. Block with your Queen on b1.",
                              expected: "Qb1",
                              response: "Qxc3",
                              next: {
                                prompt: "Black grabs another pawn. Defend your d-pawn by developing the Knight to e2.",
                                expected: "Ne2",
                                response: "Qa5",
                                next: {
                                  prompt: "The Queen retreats. Chase it out completely with your dark-squared Bishop to c7!",
                                  expected: "Bc7",
                                  endpoint: "Incredible! Because you delayed Nf3, the traditional trap failed entirely. You are up a full piece and completely winning."
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
        id: 'london_jobava_trap',
        title: "Lesson 4: The Jobava Trap vs. King's Indian",
        description: "When Black plays the King's Indian Defense, switch to the Jobava London to set a deadly trap.",
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
              prompt: "Black prepares the fianchetto. Because the standard London is passive here, switch to the Jobava London! Develop your Queenside Knight to c3 aggressively.",
              expected: "Nc3",
              response: "d5",
              next: {
                prompt: "Black plays d5 to stop your e4 push. Play e3 to solidify.",
                expected: "e3",
                response: "c5",
                next: {
                  prompt: "Black strikes with c5. Since they delayed their bishop, push your d-pawn to grab space! Play dxc5.",
                  expected: "dxc5",
                  wrong: [
                    { move: "c3", response: "Bg7", msg: "Inaccuracy. c3 is too passive in the Jobava setup. Capture on c5 or play something active!" }
                  ],
                  response: "Bg7",
                  next: {
                    prompt: "Black develops. Now push your e-pawn to e4, opening lines and grabbing center space.",
                    expected: "e4",
                    response: "O-O",
                    next: {
                      prompt: "Black castles. Here is where many club players blunder. Prepare the trap by playing the Queen up to d2.",
                      expected: "Qd2",
                      response: "Nc6",
                      next: {
                        prompt: "Black plays Nc6, a huge blunder in this specific line! Spring the trap—jump your Knight forward to b5 to threaten a devastating fork on c7!",
                        expected: "Nb5",
                        response: "e5",
                        next: {
                          prompt: "Black plays e5 to block the Bishop. Capture the pawn with your d-pawn.",
                          expected: "dxe5",
                          response: "Ne4",
                          next: {
                            prompt: "Black's Knight jumps to e4. This is a massive blunder! Trade Queens to remove their defense of the c7 square.",
                            expected: "Qxd8",
                            wrong: [
                              { move: "Nf3", response: "Qa5+", msg: "Too slow! Black plays Qa5+ and you lose the initiative. Capture the Queen on d8!" },
                              { move: "Qe3", response: "Qa5+", msg: "You must trade Queens to remove the defense of c7!" }
                            ],
                            response: "Rxd8",
                            next: {
                              prompt: "Now execute the brutal royal fork on c7 with your Knight!",
                              expected: "Nc7",
                              response: "Rb8",
                              next: {
                                prompt: "The Rook runs away. Now play f3! This kicks the Knight on e4, winning a full piece because the Black King cannot defend it.",
                                expected: "f3",
                                wrong: [
                                  { move: "fxe4", msg: "You don't have a pawn on f3 to capture on e4! Play f3 to attack the knight." }
                                ],
                                response: "Nc5",
                                next: {
                                  prompt: "The Knight runs away. Now develop your Kingside Knight to h3, securing your material advantage.",
                                  expected: "Nh3",
                                  endpoint: "Crushing! You have successfully executed the legendary Jobava trap. You are up an entire piece and will win the endgame effortlessly!"
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
