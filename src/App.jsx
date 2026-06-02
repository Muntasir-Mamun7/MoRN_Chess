import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

// ============================================================================
// CONSTANTS, THEMES & AUDIO
// ============================================================================
const PIECE_NAMES = { p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King' };
const COLORS = {
  Brilliant: "#1baca1", Great: "#5c8bb0", Book: "#a5a5a5", Best: "#81b64c", 
  Excellent: "#96bc4b", Good: "#96bc4b", Inaccuracy: "#f0c15c", Mistake: "#e58f2a",
  Miss: "#ff7769", Blunder: "#ca3431", Default: "#312e2b"
};
const ICONS = {
  Brilliant: "!!", Great: "!", Book: "📖", Best: "★", 
  Excellent: "👍", Good: "✓", Inaccuracy: "?!", Mistake: "?",
  Miss: "✖", Blunder: "??"
};
const STAT_ORDER = ["Brilliant", "Great", "Book", "Best", "Excellent", "Good", "Inaccuracy", "Mistake", "Miss", "Blunder"];

const BOARD_THEMES = {
  wood: { light: '#f0d9b5', dark: '#b58863' },
  green: { light: '#eeeed2', dark: '#769656' },
  portugal: { light: '#f4f4f4', dark: '#d32f2f' },
  dark: { light: '#aaaaaa', dark: '#555555' }
};

const playSound = (isCapture, isMuted) => {
  if (isMuted) return;
  const url = isCapture 
    ? 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/capture.mp3'
    : 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-self.mp3';
  new Audio(url).play().catch(() => {});
};

// Helper to convert SAN to LAN for Hints
function getMoveCoords(fen, sanMove) {
  const temp = new Chess(fen);
  try {
    const move = temp.move(sanMove);
    return move ? { from: move.from, to: move.to } : null;
  } catch (e) {
    return null;
  }
}

// ============================================================================
// ACADEMY MODULES DATABASE (With Punishments)
// ============================================================================
const ACADEMY_MODULES = [
  {
    id: 'scholars_mate_module',
    title: "How to Play Against Scholar's Mate",
    description: "Learn Yellow Rook's masterclass to crush the early Queen attack and seize the initiative.",
    lessons: [
      {
        id: 'scholars_mate_g4',
        title: "Lesson 1: Crush the Flank Attack (g4)",
        description: "Learn the absolute best defense against the early Queen attack and punish the aggressive g4 push.",
        startFen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1", // After 1. e4
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
                { move: "Nf6", response: "Qxf7#", msg: "Blunder! White plays Qxf7# Checkmate. You must block the Queen's diagonal first." }
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
                      { move: "d6", response: "c3", msg: "d6 is too slow and lets White defend with c3. Play d5 to blow open the center!" }
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
        description: "Learn how to counter White when they try to defend d4 with Ne2 or c3.",
        startFen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4", // After 1. e4 e5 2. Qh5 Nc6 3. Bc4 g6 4. Qf3 Nf6
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
        description: "What to do when White delays the Queen attack and brings it to f3 instead of h5.",
        startFen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 2 3", // After 1. e4 e5 2. Bc4 Nc6
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

// ============================================================================
// CAPS2 WIN PROBABILITY ALGORITHM
// ============================================================================
function cpToWinProb(cp) {
  if (cp > 3000) return 100;
  if (cp < -3000) return 0;
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

function calculateAccuracy(wpBefore, wpAfter) {
  const diff = Math.max(0, wpBefore - wpAfter);
  if (diff === 0) return 100;
  let accuracy = 103.1668 * Math.exp(-0.04354 * diff) - 3.1669;
  return Math.max(0, Math.min(100, accuracy));
}

function classifyMove(wpBefore, wpAfter, isBook, isMate) {
  if (isMate && wpAfter > 90) return "Best";
  if (isBook) return "Book";
  const loss = Math.max(0, wpBefore - wpAfter);
  if (loss <= 1.5) return "Best";
  if (loss <= 3.5) return "Excellent";
  if (loss <= 7) return "Good";
  if (loss <= 15) return "Inaccuracy";
  if (loss <= 25) return "Mistake";
  return "Blunder"; 
}

function estimateRating(acc) {
  if(acc < 10) return 100;
  if(acc < 50) return Math.round(200 + (acc * 8));
  if(acc < 70) return Math.round(600 + ((acc-50)*10));
  if(acc < 85) return Math.round(975 + ((acc-75)*40)); 
  if(acc < 95) return Math.round(1375 + ((acc-85)*75)); 
  return Math.round(2125 + ((acc-95)*150));             
}

// ============================================================================
// MAIN APPLICATION COMPONENT
// ============================================================================
export default function App() {
  const [game, setGame] = useState(new Chess());
  const [engine, setEngine] = useState(null);
  
  // App State
  const [gameMode, setGameMode] = useState('input'); // input, review, summary, academy, settings
  const [pgnInput, setPgnInput] = useState('');
  const [userColor, setUserColor] = useState('w'); 
  
  // Settings
  const [boardTheme, setBoardTheme] = useState('wood');
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [coachGender, setCoachGender] = useState('female');
  const [systemVoices, setSystemVoices] = useState([]);
  const [activeVoice, setActiveVoice] = useState(null);
  
  // Review State
  const [reviewMoves, setReviewMoves] = useState([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(-1);
  const [isViewingAlt, setIsViewingAlt] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summaryData, setSummaryData] = useState(null);
  
  // Academy State
  const [activeModule, setActiveModule] = useState(null);
  const [activeLesson, setActiveLesson] = useState(null);
  const [academyNode, setAcademyNode] = useState(null);
  const [academyMessage, setAcademyMessage] = useState('');
  const [academyError, setAcademyError] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [safeFen, setSafeFen] = useState(''); // Stores the FEN before user's mistake
  
  // Board Interaction State
  const [moveFrom, setMoveFrom] = useState('');
  const [optionSquares, setOptionSquares] = useState({});
  const batchRef = useRef({ isActive: false, queue: [], results: [], currentScore: 0, currentMate: null, parsedReview: [] });

  // --------------------------------------------------------
  // Voice Synthesis Setup
  // --------------------------------------------------------
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setSystemVoices(voices);
      const preferred = voices.find(v => 
        coachGender === 'female' 
          ? (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Google US English'))
          : (v.name.includes('Male') || v.name.includes('Daniel') || v.name.includes('Google UK English Male'))
      );
      setActiveVoice(preferred || voices[0]);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, [coachGender]);

  const speakMoRN = (text) => {
    if (isVoiceMuted || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); 
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      if (activeVoice) utterance.voice = activeVoice;
      utterance.rate = 1.05;
      utterance.pitch = coachGender === 'female' ? 1.1 : 0.9;
      window.speechSynthesis.speak(utterance);
    }, 50);
  };

  // --------------------------------------------------------
  // Initialize Stockfish Engine
  // --------------------------------------------------------
  useEffect(() => {
    fetch('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.1/stockfish.js')
      .then(res => res.text())
      .then(workerCode => {
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const worker = new Worker(URL.createObjectURL(blob));
        
        worker.onmessage = (e) => {
          const line = e.data;
          if (line.includes('info') && line.includes('score cp')) {
            const match = line.match(/score cp (-?\d+)/);
            if (match) {
              batchRef.current.currentScore = parseInt(match[1]);
              batchRef.current.currentMate = null;
            }
          }
          if (line.includes('info') && line.includes('score mate')) {
            const match = line.match(/score mate (-?\d+)/);
            if (match) {
              batchRef.current.currentMate = parseInt(match[1]);
              batchRef.current.currentScore = batchRef.current.currentMate > 0 ? 30000 : -30000;
            }
          }
          if (line.includes('bestmove')) {
            const moveLAN = line.split(' ')[1];
            if (batchRef.current.isActive) {
              batchRef.current.results.push({
                score: batchRef.current.currentScore,
                mate: batchRef.current.currentMate,
                bestMove: moveLAN !== '(none)' ? moveLAN : ''
              });

              const completed = batchRef.current.results.length;
              const total = batchRef.current.queue.length;
              setProgress((completed / total) * 100);

              if (completed < total) {
                worker.postMessage(`position fen ${batchRef.current.queue[completed]}`);
                worker.postMessage('go depth 12'); 
              } else {
                finishBatchAnalysis();
              }
            }
          }
        };
        worker.postMessage('uci');
        setEngine(worker);
      });
    return () => engine?.terminate();
  }, []);

  // --------------------------------------------------------
  // Academy Mode Logic
  // --------------------------------------------------------
  function openModule(mod) {
    setActiveModule(mod);
    setActiveLesson(null);
  }

  function startLesson(lesson) {
    setActiveLesson(lesson);
    setUserColor(lesson.color);
    const newGame = new Chess(lesson.startFen);
    
    let currentNode = lesson.tree;
    if (currentNode.botFirst) {
      newGame.move(currentNode.botFirst);
      playSound(false, isVoiceMuted);
    }
    
    setGame(newGame);
    setSafeFen(newGame.fen());
    setAcademyNode(currentNode);
    setAcademyMessage(currentNode.prompt);
    setAcademyError(false);
    setShowHint(false);
    setGameMode('academy');
    speakMoRN(currentNode.prompt);
  }

  function handleAcademyMove(moveObj, gameCopy) {
    setShowHint(false);
    if (!academyNode) return;

    if (moveObj.san === academyNode.expected || moveObj.lan === academyNode.expected) {
      // Correct Move
      setGame(gameCopy);
      playSound(moveObj.flags.includes('c'), isVoiceMuted);
      setAcademyError(false);
      setSafeFen(gameCopy.fen()); // Save state before bot moves

      if (academyNode.endpoint) {
        setAcademyMessage(academyNode.endpoint);
        speakMoRN(academyNode.endpoint);
        setAcademyNode(null);
      } else if (academyNode.response) {
        setAcademyMessage("Excellent! Opponent is responding...");
        setTimeout(() => {
          const moveRes = gameCopy.move(academyNode.response);
          setGame(new Chess(gameCopy.fen()));
          setSafeFen(gameCopy.fen()); // Save state after bot moves
          playSound(moveRes.flags.includes('c'), isVoiceMuted);
          setAcademyNode(academyNode.next);
          setAcademyMessage(academyNode.next.prompt);
          speakMoRN(academyNode.next.prompt);
        }, 800);
      }
    } else {
      // Wrong Move Execution
      setAcademyError(true);
      playSound(moveObj.flags.includes('c'), isVoiceMuted);
      
      let specificWrong = null;
      if (academyNode.wrong && Array.isArray(academyNode.wrong)) {
         specificWrong = academyNode.wrong.find(w => w.move === moveObj.san);
      }

      if (specificWrong) {
         setGame(gameCopy); // Show user's mistake
         setAcademyMessage("Wait for it...");
         
         // Bot plays the punishing move
         setTimeout(() => {
           try {
             const moveRes = gameCopy.move(specificWrong.response);
             setGame(new Chess(gameCopy.fen()));
             playSound(moveRes.flags.includes('c'), isVoiceMuted);
             setAcademyMessage(specificWrong.msg);
             speakMoRN(specificWrong.msg);
           } catch(e) { console.error("Punishment move failed", e); }
         }, 800);
      } else {
         setGame(gameCopy);
         const msg = `That's not the best move here. ${academyNode.prompt}`;
         setAcademyMessage(msg);
         speakMoRN("Try again. " + academyNode.prompt);
      }
    }
  }

  function undoAcademyMove() {
    if (safeFen) {
      setGame(new Chess(safeFen));
    }
    setAcademyError(false);
    setShowHint(false);
    setAcademyMessage(academyNode.prompt);
    speakMoRN("Let's try that again.");
  }

  function provideHint() {
    if (academyError && safeFen) {
      setGame(new Chess(safeFen)); // Auto-undo if they made a mistake
      setAcademyError(false);
      setAcademyMessage(academyNode.prompt);
    }
    setShowHint(true);
  }

  // --------------------------------------------------------
  // Board Interactions
  // --------------------------------------------------------
  function handleSquareClick(square) {
    if (gameMode !== 'academy' || academyError || !academyNode) return;
    if (!moveFrom) {
      const piece = game.get(square);
      if (piece && piece.color === game.turn()) { setMoveFrom(square); updateOptionSquares(square); }
      return;
    }
    const gameCopy = new Chess(game.fen());
    try {
      const move = gameCopy.move({ from: moveFrom, to: square, promotion: 'q' });
      if (move) handleAcademyMove(move, gameCopy);
    } catch (e) {
      const piece = game.get(square);
      if (piece && piece.color === game.turn()) { setMoveFrom(square); updateOptionSquares(square); return; }
    }
    setMoveFrom(''); setOptionSquares({});
  }

  function handlePieceDrop(source, target) {
    if (gameMode !== 'academy' || academyError || !academyNode) return false;
    const gameCopy = new Chess(game.fen());
    try {
      const move = gameCopy.move({ from: source, to: target, promotion: 'q' });
      if (move) { handleAcademyMove(move, gameCopy); return true; }
    } catch (e) { return false; }
    return false;
  }

  function updateOptionSquares(square) {
    const moves = game.moves({ square, verbose: true });
    if (moves.length === 0) { setOptionSquares({}); return; }
    const squares = {};
    moves.forEach(m => { squares[m.to] = { background: 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)', borderRadius: '50%' }; });
    squares[square] = { background: 'rgba(255, 255, 0, 0.4)' };
    setOptionSquares(squares);
  }

  // --------------------------------------------------------
  // Review Pipeline
  // --------------------------------------------------------
  function startAnalysis() {
    if (!pgnInput || !engine) return;
    try {
      const tempGame = new Chess();
      tempGame.loadPgn(pgnInput);
      const moves = tempGame.history({ verbose: true });
      
      const replayBoard = new Chess();
      const parsedReview = moves.map((m) => {
        const fenBefore = replayBoard.fen();
        replayBoard.move(m.san);
        const fenAfter = replayBoard.fen();
        return { ...m, fenBefore, fenAfter };
      });

      const fenList = ["rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", ...parsedReview.map(m => m.fenAfter)];
      batchRef.current = { isActive: true, queue: fenList, results: [], currentScore: 0, currentMate: null, parsedReview };
      setIsAnalyzing(true);
      setProgress(0);
      setGameMode('summary'); 
      engine.postMessage(`position fen ${fenList[0]}`);
      engine.postMessage('go depth 12');
    } catch(err) { alert("Invalid PGN."); }
  }

  function finishBatchAnalysis() {
    const { parsedReview, results } = batchRef.current;
    let wAccSum = 0, bAccSum = 0, wMoves = 0, bMoves = 0;
    const counts = { w: {}, b: {} };
    STAT_ORDER.forEach(s => { counts.w[s]=0; counts.b[s]=0; });

    const finalizedMoves = parsedReview.map((m, idx) => {
      const beforeData = results[idx] || {score: 0, mate: null, bestMove: ''};
      const afterData = results[idx + 1] || {score: 0, mate: null, bestMove: ''};

      const isWhiteTurnBefore = (idx % 2 === 0);
      let scoreBeforeW = isWhiteTurnBefore ? beforeData.score : -beforeData.score;
      let scoreAfterW = !isWhiteTurnBefore ? afterData.score : -afterData.score;

      const wpBefore = cpToWinProb(scoreBeforeW);
      const wpAfter = cpToWinProb(scoreAfterW);
      const playerWpBefore = m.color === 'w' ? wpBefore : (100 - wpBefore);
      const playerWpAfter = m.color === 'w' ? wpAfter : (100 - wpAfter);
      
      const accuracy = calculateAccuracy(playerWpBefore, playerWpAfter);
      const isBook = idx < 10 && (playerWpBefore - playerWpAfter) < 2;
      const isMate = m.san.includes('#');

      let classification = classifyMove(playerWpBefore, playerWpAfter, isBook, isMate);

      counts[m.color][classification]++;
      if (!isBook) {
        if (m.color === 'w') { wAccSum += accuracy; wMoves++; }
        if (m.color === 'b') { bAccSum += accuracy; bMoves++; }
      }

      let coachText = `${m.san} is ${classification.toLowerCase()}.`;
      if(classification === "Blunder") coachText += " You allowed a massive advantage.";
      else if(classification === "Best Move" || classification === "Best") coachText = "Spot on! Best move.";

      return { 
        ...m, classification, bestMoveLAN: beforeData.bestMove, 
        evalScore: scoreAfterW, evalMate: afterData.mate, accuracy, coachText
      };
    });

    const finalWAcc = wMoves ? (wAccSum / wMoves) : 100;
    const finalBAcc = bMoves ? (bAccSum / bMoves) : 100;

    setSummaryData({
      wAcc: finalWAcc.toFixed(1), bAcc: finalBAcc.toFixed(1),
      wElo: estimateRating(finalWAcc), bElo: estimateRating(finalBAcc),
      counts
    });

    setReviewMoves(finalizedMoves);
    setIsAnalyzing(false);
    batchRef.current.isActive = false;
  }

  function navigateReview(direction) {
    setIsViewingAlt(false);
    let newIdx = currentReviewIndex;
    if (direction === 'start') newIdx = -1;
    else if (direction === 'end') newIdx = reviewMoves.length - 1;
    else newIdx = currentReviewIndex + direction;
    
    if (newIdx >= -1 && newIdx < reviewMoves.length) {
      setCurrentReviewIndex(newIdx);
      setGame(newIdx === -1 ? new Chess() : new Chess(reviewMoves[newIdx].fenAfter));
    }
  }

  function showAlternativeLine() {
    const currentMove = reviewMoves[currentReviewIndex];
    if (!currentMove || !currentMove.bestMoveLAN) return;
    const altGame = new Chess(currentMove.fenBefore); 
    try {
      altGame.move({ from: currentMove.bestMoveLAN.substring(0, 2), to: currentMove.bestMoveLAN.substring(2, 4), promotion: 'q' });
      setGame(altGame);
      setIsViewingAlt(true);
    } catch(e) {}
  }

  function resetToCurrentReviewMove() {
    const move = reviewMoves[currentReviewIndex];
    if (move) { setGame(new Chess(move.fenAfter)); setIsViewingAlt(false); }
  }

  function resetToBase(mode) {
    batchRef.current.isActive = false;
    setGameMode(mode);
    setGame(new Chess());
    setReviewMoves([]);
    setCurrentReviewIndex(-1);
    setIsViewingAlt(false);
    setIsAnalyzing(false);
    setActiveModule(null);
    setActiveLesson(null);
    setAcademyNode(null);
    setAcademyError(false);
    setShowHint(false);
    window.speechSynthesis?.cancel();
  }

  // --------------------------------------------------------
  // Render Variables
  // --------------------------------------------------------
  const currentTheme = BOARD_THEMES[boardTheme] || BOARD_THEMES.wood;
  
  const activeSquareStyles = useMemo(() => {
    let styles = { ...optionSquares };
    if (gameMode === 'review' && currentReviewIndex >= 0 && !isViewingAlt) {
      const move = reviewMoves[currentReviewIndex];
      styles[move.from] = { backgroundColor: 'rgba(255, 255, 0, 0.4)' }; 
      styles[move.to] = { backgroundColor: 'rgba(255, 255, 0, 0.6)' };  
    }
    return styles;
  }, [optionSquares, gameMode, currentReviewIndex, isViewingAlt, reviewMoves]);

  const activeArrows = useMemo(() => {
    if (gameMode === 'review' && currentReviewIndex >= 0 && !isViewingAlt) {
       const move = reviewMoves[currentReviewIndex];
       if (move && move.bestMoveLAN && ["Blunder", "Mistake", "Inaccuracy", "Miss"].includes(move.classification)) {
         return [[move.bestMoveLAN.substring(0, 2), move.bestMoveLAN.substring(2, 4), "rgba(129, 182, 76, 0.8)"]];
       }
    }
    if (gameMode === 'academy' && showHint && academyNode) {
       const coords = getMoveCoords(game.fen(), academyNode.expected);
       if (coords) {
         return [[coords.from, coords.to, "rgba(255, 170, 0, 0.8)"]];
       }
    }
    return [];
  }, [gameMode, currentReviewIndex, isViewingAlt, reviewMoves, showHint, academyNode, game]);

  return (
    <>
      <style>{`
        body { margin: 0; padding: 0; background-color: #121212; color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; overflow-x: hidden; }
        .app-container { display: flex; flex-direction: column; min-height: 100vh; align-items: center; padding: 20px; box-sizing: border-box; }
        
        .header { text-align: center; margin-bottom: 20px; width: 100%; }
        .header h1 { font-size: 2.5rem; margin: 0 0 15px 0; background: linear-gradient(90deg, #d32f2f, #FF9800); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .nav-menu { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
        .menu-btn { padding: 12px 20px; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; transition: 0.2s; font-size: 14px; }
        .menu-btn:hover { filter: brightness(1.1); transform: translateY(-2px); }

        .main-layout { display: flex; gap: 20px; width: 100%; max-width: 1000px; justify-content: center; align-items: stretch; flex-wrap: wrap; }
        
        .board-section { display: flex; gap: 15px; flex: 1; min-width: 320px; max-width: 550px; }
        .board-container { flex: 1; border-radius: 6px; overflow: hidden; box-shadow: 0 12px 24px rgba(0,0,0,0.6); display: flex; flex-direction: column; gap: 10px; }
        .player-bar { display: flex; justify-content: space-between; align-items: center; background: #1e1e1e; padding: 8px 12px; border-radius: 4px; border: 1px solid #333; }
        .player-info { display: flex; align-items: center; gap: 10px; font-weight: bold; font-size: 14px; }
        .avatar { width: 32px; height: 32px; background: #403d39; border-radius: 4px; background-size: cover; }

        .side-panel { flex: 1; min-width: 320px; max-width: 450px; background: #1e1e1e; border-radius: 8px; border: 1px solid #333; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 8px 16px rgba(0,0,0,0.4); }
        .panel-header { padding: 15px 20px; font-weight: bold; font-size: 16px; color: #81b64c; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center; }
        .panel-content { padding: 20px; flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 15px; }

        .action-btn { width: 100%; padding: 14px; background: #d32f2f; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; font-size: 15px; }
        .action-btn:hover { filter: brightness(1.1); }
        .action-btn:disabled { background: #555; cursor: not-allowed; }

        /* Academy UI */
        .coach-card { background: #2a2a2a; border-left: 4px solid #81b64c; padding: 15px; border-radius: 6px; display: flex; gap: 15px; align-items: center; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
        .coach-card.error { border-left-color: #ca3431; }
        .coach-text { font-size: 15px; line-height: 1.5; color: #eee; flex: 1; }
        .hint-box { background: rgba(255, 255, 0, 0.1); border: 1px solid rgba(255, 255, 0, 0.3); color: #ffd700; padding: 10px; border-radius: 6px; font-size: 13px; font-weight: bold; }

        .lesson-card { background: #262421; border: 1px solid #333; border-radius: 8px; padding: 15px; cursor: pointer; transition: 0.2s; }
        .lesson-card:hover { border-color: #81b64c; background: #2b2926; }
        .lesson-title { color: #81b64c; font-weight: bold; font-size: 16px; margin-bottom: 5px; }

        @media (max-width: 768px) {
          .main-layout { flex-direction: column; align-items: center; }
          .board-section, .side-panel { width: 100%; max-width: 100%; }
        }
      `}</style>

      <div className="app-container">
        
        <div className="header">
          <h1>MoRN Chess | The Ultimate Arena</h1>
          <div className="nav-menu">
            <button className="menu-btn" style={{backgroundColor: ['input', 'review', 'summary'].includes(gameMode) ? '#2196F3' : '#4a4a4a'}} onClick={() => resetToBase('input')}>Game Review Suite</button>
            <button className="menu-btn" style={{backgroundColor: gameMode === 'academy' ? '#9C27B0' : '#4a4a4a'}} onClick={() => {resetToBase('academy'); setActiveModule(null); setActiveLesson(null);}}>MoRN Academy</button>
            <button className="menu-btn" style={{backgroundColor: gameMode === 'settings' ? '#FF9800' : '#4a4a4a'}} onClick={() => resetToBase('settings')}>⚙ Settings</button>
          </div>
        </div>

        <div className="main-layout">
          
          {/* LEFT: BOARD */}
          <div className="board-section">
            <div className="board-container">
              <div className="player-bar">
                <div className="player-info">
                  <div className="avatar" style={{backgroundImage: "url('https://www.chess.com/bundles/web/images/user-image.svg')"}}></div>
                  <span>{userColor === 'w' ? 'Opponent' : 'You'}</span>
                </div>
              </div>

              <Chessboard
                position={game.fen()}
                onPieceDrop={handlePieceDrop}
                onSquareClick={handleSquareClick}
                customSquareStyles={activeSquareStyles}
                customArrows={activeArrows.map(arr => [arr[0], arr[1]])}
                customArrowColor={activeArrows.length > 0 ? activeArrows[0][2] : "rgba(129, 182, 76, 0.8)"}
                customDarkSquareStyle={{ backgroundColor: currentTheme.dark }}
                customLightSquareStyle={{ backgroundColor: currentTheme.light }}
                animationDuration={250}
                boardOrientation={userColor === 'b' ? 'black' : 'white'}
              />

              <div className="player-bar">
                <div className="player-info">
                  <div className="avatar" style={{backgroundImage: "url('https://images.chesscomfiles.com/uploads/v1/user/326880000.3fa6db7f.160x160o.22304859846b.png')"}}></div>
                  <span>{userColor === 'w' ? 'You' : 'Opponent'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: DYNAMIC PANEL */}
          <div className="side-panel">
            
            {/* Academy Mode */}
            {gameMode === 'academy' && (
              <>
                <div className="panel-header" style={{color: '#9C27B0'}}>
                  <span style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                    {activeModule && <span style={{cursor:'pointer', color:'#aaa'}} onClick={() => {setActiveLesson(null); setActiveModule(null); setAcademyError(false); setShowHint(false);}}>←</span>}
                    🎓 MoRN Academy
                  </span>
                  <span style={{cursor:'pointer', color:'#888'}} onClick={() => setIsVoiceMuted(!isVoiceMuted)}>
                    {isVoiceMuted ? '🔇' : '🔊'}
                  </span>
                </div>
                <div className="panel-content">
                  {!activeModule ? (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                      <p style={{color: '#aaa', margin: 0}}>Select a training module to begin:</p>
                      {ACADEMY_MODULES.map(mod => (
                        <div key={mod.id} className="lesson-card" onClick={() => openModule(mod)}>
                          <div className="lesson-title">{mod.title}</div>
                          <div style={{color: '#888', fontSize: '13px'}}>{mod.description}</div>
                        </div>
                      ))}
                    </div>
                  ) : !activeLesson ? (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                      <h3 style={{marginTop: 0, color: '#9C27B0'}}>{activeModule.title}</h3>
                      <p style={{color: '#aaa', margin: 0}}>{activeModule.description}</p>
                      {activeModule.lessons.map(lesson => (
                        <button key={lesson.id} className="action-btn" style={{background: '#9C27B0', textAlign: 'left', padding: '15px'}} onClick={() => startLesson(lesson)}>
                          {lesson.title}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
                      <h3 style={{marginTop: 0, color: '#9C27B0'}}>{activeLesson.title}</h3>
                      
                      <div className={`coach-card ${academyError ? 'error' : ''}`}>
                        <div className="coach-face" style={{background: "url('https://www.chess.com/bundles/web/images/coach/coach-anya.png') center/cover", width:'48px', height:'48px', borderRadius:'50%', minWidth: '48px'}}></div>
                        <div className="coach-text">{academyMessage}</div>
                      </div>

                      {showHint && academyNode && (
                        <div className="hint-box" style={{marginTop: '15px'}}>
                          💡 Hint: Try playing <strong>{academyNode.expected}</strong>. (Follow the orange arrow on the board).
                        </div>
                      )}

                      <div style={{marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px'}}>
                        {academyError && (
                          <button className="action-btn" style={{background: '#ca3431'}} onClick={undoAcademyMove}>
                            ↩ Retry Move
                          </button>
                        )}
                        {!academyError && academyNode && !academyNode.endpoint && (
                          <button className="action-btn" style={{background: '#e58f2a'}} onClick={provideHint}>
                            💡 Give me a Hint
                          </button>
                        )}
                        <button className="action-btn" style={{background: '#333'}} onClick={() => { setActiveLesson(null); setAcademyError(false); setShowHint(false); }}>
                          Back to Lessons
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Review Setup */}
            {gameMode === 'input' && (
              <>
                <div className="panel-header" style={{color: '#2196F3'}}>★ Game Review</div>
                <div className="panel-content">
                  <textarea style={{width: '100%', height: '150px', background: '#121212', color: '#fff', border: '1px solid #444', padding: '15px', borderRadius: '6px', resize: 'none', fontFamily: 'monospace', boxSizing: 'border-box'}} placeholder="Paste PGN here..." value={pgnInput} onChange={e => setPgnInput(e.target.value)} />
                  <div style={{display: 'flex', gap: '10px'}}>
                    <button className="action-btn" style={{background: userColor === 'w' ? '#2196F3' : '#333'}} onClick={() => setUserColor('w')}>I played White</button>
                    <button className="action-btn" style={{background: userColor === 'b' ? '#2196F3' : '#333'}} onClick={() => setUserColor('b')}>I played Black</button>
                  </div>
                  <button className="action-btn" style={{background: '#4CAF50', marginTop: 'auto'}} onClick={startAnalysis}>Analyze Match</button>
                </div>
              </>
            )}

            {/* Settings */}
            {gameMode === 'settings' && (
              <>
                <div className="panel-header" style={{color: '#FF9800'}}>⚙ Arena Preferences</div>
                <div className="panel-content">
                  <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                    <label style={{color: '#ccc', fontWeight: 'bold'}}>Board Theme</label>
                    <select style={{padding: '10px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '6px'}} value={boardTheme} onChange={(e) => setBoardTheme(e.target.value)}>
                      <option value="wood">Tournament Wood</option>
                      <option value="portugal">MoRN Red</option>
                      <option value="green">Classic Green</option>
                      <option value="dark">Midnight Dark</option>
                    </select>
                  </div>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px'}}>
                    <label style={{color: '#ccc', fontWeight: 'bold'}}>Coach Voice Persona</label>
                    <select style={{padding: '10px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '6px'}} value={coachGender} onChange={(e) => setCoachGender(e.target.value)}>
                      <option value="female">MoRN (Female)</option>
                      <option value="male">MoRN (Male)</option>
                    </select>
                  </div>
                  <button className="action-btn" style={{background: isVoiceMuted ? '#444' : '#4CAF50', marginTop: 'auto'}} onClick={() => setIsVoiceMuted(!isVoiceMuted)}>
                    {isVoiceMuted ? '🔇 Sound & Voice Muted' : '🔊 Sound & Voice Active'}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
