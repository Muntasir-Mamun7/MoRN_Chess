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
