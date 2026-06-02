import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

// ============================================================================
// CONSTANTS, THEMES & ICONS
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
  portugal: { light: '#f4f4f4', dark: '#d32f2f' },
  green: { light: '#eeeed2', dark: '#769656' },
  wood: { light: '#f0d9b5', dark: '#b58863' },
  ocean: { light: '#dee3e6', dark: '#8ca2ad' },
  dark: { light: '#aaaaaa', dark: '#555555' }
};

// ============================================================================
// ACADEMY LESSONS DATABASE (Based on YouTube Video)
// ============================================================================
const ACADEMY_LESSONS = {
  scholars_mate: {
    id: 'scholars_mate',
    title: "Crush the Scholar's Mate",
    description: "Yellow Rook's Guide: Punish the early Queen attack with a fierce central strike.",
    startFen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1", // After 1. e4
    color: "b",
    tree: {
      prompt: "White opens with 1. e4. Respond by controlling the center with your e-pawn.",
      expected: "e5",
      response: "Qh5",
      next: {
        prompt: "Qh5! The e5 pawn is hanging. Defend it calmly without rushing your Knights.",
        expected: "Nc6",
        response: "Bc4",
        next: {
          prompt: "Bc4 targets f7. Checkmate is threatened! Do NOT play Nf6 (it falls for the trap). Block the Queen's path.",
          expected: "g6",
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
                prompt: "The Queen retreats. Don't play the slow d6. Strike immediately with the aggressive upgraded pawn break!",
                expected: "d5",
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
  }
};

// ============================================================================
// CAPS2 WIN PROBABILITY ALGORITHM & RATING MATH
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

function classifyMove(wpBefore, wpAfter, isBook, isMate, san, bestMoveLAN, isMissOp) {
  if (isMate && wpAfter > 90) return "Best";
  if (isBook) return "Book";
  const loss = Math.max(0, wpBefore - wpAfter);
  if (loss <= 1.5) return "Best";
  if (loss <= 3.5) return "Excellent";
  if (loss <= 7) return "Good";
  if (loss <= 15) return "Inaccuracy";
  if (loss <= 25) return "Mistake";
  if (isMissOp) return "Miss"; 
  return "Blunder"; 
}

function estimateRating(acc) {
  if(acc < 10) return 100;
  if(acc < 50) return Math.round(200 + (acc * 8));
  if(acc < 70) return Math.round(600 + ((acc-50)*10));
  if(acc < 75) return Math.round(800 + ((acc-70)*35)); 
  if(acc < 85) return Math.round(975 + ((acc-75)*40)); 
  if(acc < 95) return Math.round(1375 + ((acc-85)*75)); 
  return Math.round(2125 + ((acc-95)*150));             
}

function getPhaseIcon(accuracy) {
  if (accuracy >= 95) return { icon: "★", color: COLORS.Best };
  if (accuracy >= 80) return { icon: "👍", color: COLORS.Excellent };
  if (accuracy >= 65) return { icon: "✓", color: COLORS.Good };
  if (accuracy >= 40) return { icon: "!", color: COLORS.Great };
  return { icon: "?!", color: COLORS.Inaccuracy };
}

// ============================================================================
// DYNAMIC MORN COACH
// ============================================================================
const getCoachText = (classification, piece, san, isYou, alt) => {
  const actor = isYou ? "You" : "Your opponent";
  const pos = isYou ? "your" : "their";
  
  const templates = {
    Blunder: [
      `MoRN here. Did ${actor.toLowerCase()} play ${san} with eyes closed? That's a catastrophic blunder. ${alt ? `The engine screams for ${alt}.` : ''}`,
      `I'm actually impressed. It takes effort to blunder that badly with ${san}.`,
      `Ouch. ${san} just handed over the advantage on a silver platter. Spatial awareness is key!`
    ],
    Mistake: [
      `I'm not mad, just disappointed. ${san} is a clear mistake.`,
      `Suboptimal geometry. ${actor} made a strategic misstep that bites on granite.`,
      `Not the right idea. ${san} surrenders positional control entirely.`
    ],
    Inaccuracy: [
      `${san} is an inaccuracy. ${alt ? `Why not ${alt}?` : 'There was a much sharper continuation.'}`,
      `A slightly passive choice. ${actor} let the tension slip.`,
      `Playable, but ${actor} let the advantage slip slightly.`
    ],
    Miss: [
      `A tragic miss! ${actor} had a chance to punish a blunder but played ${san} instead.`,
      `${actor} completely missed a tactical sequence that would have won material.`
    ],
    Good: [
      `${san} is good. A solid, playable move. Nothing flashy, but it works.`,
      `${actor} played a sensible, safe move.`
    ],
    Excellent: [
      `${san} is excellent. ${actor} found a highly active square.`,
      `Very strong play by ${actor}. Keeping the pressure on.`
    ],
    Best: [
      `${san} is the absolute best move. Flawless tactical execution.`,
      `Spot on! ${actor} found the exact continuation I was calculating.`
    ],
    Great: [
      `${san} is a great move. ${actor} found a powerful, game-changing tactic!`,
      `A brilliant resource found by ${actor}. Masterful.`
    ],
    Book: [
      `${san} is established opening theory. Deep preparation!`,
      `Standard book move. Controlling the center and developing harmoniously.`
    ]
  };
  const pool = templates[classification] || [`${san} was played.`];
  return pool[Math.floor(Math.random() * pool.length)];
};

// ============================================================================
// MAIN APPLICATION COMPONENT
// ============================================================================
export default function App() {
  const [game, setGame] = useState(new Chess());
  const [engine, setEngine] = useState(null);
  
  // App State
  const [gameMode, setGameMode] = useState('input'); // input, review, summary, computer, academy
  const [pgnInput, setPgnInput] = useState('');
  const [userColor, setUserColor] = useState('w'); 
  const [history, setHistory] = useState([]);
  const [rawScore, setRawScore] = useState(0);
  const [engineThinking, setEngineThinking] = useState(false);
  
  // Customization State
  const [aiLevel, setAiLevel] = useState(5);
  const [boardTheme, setBoardTheme] = useState('portugal');
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [coachGender, setCoachGender] = useState('female');
  const [systemVoices, setSystemVoices] = useState([]);
  const [activeVoice, setActiveVoice] = useState(null);
  
  // Academy & Review State
  const [activeLesson, setActiveLesson] = useState(null);
  const [academyNode, setAcademyNode] = useState(null);
  const [academyMessage, setAcademyMessage] = useState('');
  
  const [reviewMoves, setReviewMoves] = useState([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(-1);
  const [isViewingAlt, setIsViewingAlt] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summaryData, setSummaryData] = useState(null);
  
  const [moveFrom, setMoveFrom] = useState('');
  const [optionSquares, setOptionSquares] = useState({});
  const batchRef = useRef({ isActive: false, queue: [], results: [], currentScore: 0, currentMate: null, parsedReview: [] });

  // --------------------------------------------------------
  // Voice Synthesis Setup
  // --------------------------------------------------------
  useEffect(() => {
    if (!window.speechSynthesis) return;
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
    if (isVoiceMuted || !window.speechSynthesis) return;
    window.speechSynthesis.cancel(); 
    const utterance = new SpeechSynthesisUtterance(text);
    if (activeVoice) utterance.voice = activeVoice;
    utterance.rate = 1.05;
    utterance.pitch = coachGender === 'female' ? 1.1 : 0.9;
    window.speechSynthesis.speak(utterance);
  };

  // --------------------------------------------------------
  // Engine Initialization
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
              const score = parseInt(match[1]);
              if (batchRef.current.isActive) batchRef.current.currentScore = score;
              else setRawScore(score);
              if (batchRef.current.isActive) batchRef.current.currentMate = null;
            }
          }
          if (line.includes('info') && line.includes('score mate')) {
            const match = line.match(/score mate (-?\d+)/);
            if (match) {
              const mate = parseInt(match[1]);
              if (batchRef.current.isActive) {
                batchRef.current.currentMate = mate;
                batchRef.current.currentScore = mate > 0 ? 30000 : -30000;
              } else setRawScore(mate > 0 ? 30000 : -30000);
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
              } else finishBatchAnalysis();
            } else if (gameMode === 'computer' && moveLAN && moveLAN !== '(none)') {
              const from = moveLAN.substring(0, 2);
              const to = moveLAN.substring(2, 4);
              if (game.turn() === 'b' && !game.isGameOver()) {
                setGame(curr => {
                  const c = new Chess(curr.fen());
                  try { c.move({ from, to, promotion: 'q' }); setHistory(c.history({ verbose: true })); return c; } 
                  catch(err) { return curr; }
                });
              }
              setEngineThinking(false);
            }
          }
        };
        worker.postMessage('uci');
        setEngine(worker);
      });
    return () => engine?.terminate();
  }, [gameMode, game]);

  useEffect(() => {
    if (engine && !isAnalyzing) engine.postMessage(`setoption name Skill Level value ${Math.max(0, (aiLevel - 1) * 2)}`);
  }, [aiLevel, engine, isAnalyzing]);

  useEffect(() => {
    if (!engine || game.isGameOver() || gameMode !== 'computer' || isAnalyzing) return;
    setEngineThinking(true);
    engine.postMessage(`position fen ${game.fen()}`);
    engine.postMessage(`go depth ${Math.max(2, aiLevel + 2)}`); 
  }, [game, engine, gameMode, aiLevel, isAnalyzing]);

  // --------------------------------------------------------
  // Board Interaction Logic
  // --------------------------------------------------------
  function handleSquareClick(square) {
    if (gameMode === 'review' || gameMode === 'summary' || engineThinking || isAnalyzing) return;
    if (!moveFrom) {
      const piece = game.get(square);
      if (piece && piece.color === game.turn()) { setMoveFrom(square); updateOptionSquares(square); }
      return;
    }
    const gameCopy = new Chess(game.fen());
    try {
      const move = gameCopy.move({ from: moveFrom, to: square, promotion: 'q' });
      if (move) processUserMove(move, gameCopy);
    } catch (e) {
      const piece = game.get(square);
      if (piece && piece.color === game.turn()) { setMoveFrom(square); updateOptionSquares(square); return; }
    }
    setMoveFrom(''); setOptionSquares({});
  }

  function handlePieceDrop(source, target) {
    if (gameMode === 'review' || gameMode === 'summary' || engineThinking || isAnalyzing) return false;
    const gameCopy = new Chess(game.fen());
    try {
      const move = gameCopy.move({ from: source, to: target, promotion: 'q' });
      if (move) { processUserMove(move, gameCopy); return true; }
    } catch (e) { return false; }
    return false;
  }

  function processUserMove(move, gameCopy) {
    if (gameMode === 'academy' && academyNode) {
      if (move.san === academyNode.expected) {
        setGame(gameCopy);
        if (academyNode.endpoint) {
          setAcademyMessage(academyNode.endpoint);
          speakMoRN(academyNode.endpoint);
          setAcademyNode(null);
        } else if (academyNode.response) {
          setAcademyMessage("Excellent! Opponent is responding...");
          setTimeout(() => {
            gameCopy.move(academyNode.response);
            setGame(new Chess(gameCopy.fen()));
            setAcademyNode(academyNode.next);
            setAcademyMessage(academyNode.next.prompt);
            speakMoRN(academyNode.next.prompt);
          }, 800);
        }
      } else {
        setAcademyMessage(`Incorrect move. ${academyNode.prompt}`);
        speakMoRN("Try again.");
      }
    } else {
      setGame(gameCopy);
      setHistory(gameCopy.history({ verbose: true }));
    }
  }

  function updateOptionSquares(square) {
    const moves = game.moves({ square, verbose: true });
    if (moves.length === 0) { setOptionSquares({}); return; }
    const squares = {};
    moves.forEach(m => {
      squares[m.to] = { background: game.get(m.to) ? 'radial-gradient(circle, rgba(255,0,0,0.6) 85%, transparent 85%)' : 'radial-gradient(circle, rgba(0,255,0,0.4) 25%, transparent 25%)', borderRadius: '50%' };
    });
    squares[square] = { background: 'rgba(255, 255, 0, 0.4)' };
    setOptionSquares(squares);
  }

  // --------------------------------------------------------
  // Academy Mode
  // --------------------------------------------------------
  function startLesson(lessonKey) {
    const lesson = ACADEMY_LESSONS[lessonKey];
    setActiveLesson(lesson);
    setAcademyNode(lesson.tree);
    setAcademyMessage(lesson.tree.prompt);
    speakMoRN(lesson.tree.prompt);
    setGame(new Chess(lesson.startFen));
    setGameMode('academy');
    setUserColor(lesson.color);
  }

  // --------------------------------------------------------
  // Analysis Pipeline
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
    let wOpenSum = 0, wOpenCount = 0, bOpenSum = 0, bOpenCount = 0;
    let wMidSum = 0, wMidCount = 0, bMidSum = 0, bMidCount = 0;
    let wEndSum = 0, wEndCount = 0, bEndSum = 0, bEndCount = 0;

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
      
      const isBook = idx < 14 && Math.abs(scoreAfterW) <= 120; // Book heuristics
      const isMate = m.san.includes('#');
      const isAbsoluteBest = (m.lan === beforeData.bestMove);

      let isMissOp = false;
      if (idx > 0) {
        const prevWpBefore = m.color === 'w' ? cpToWinProb(results[idx-1].score) : (100 - cpToWinProb(results[idx-1].score));
        const prevWpAfter = m.color === 'w' ? cpToWinProb(results[idx].score) : (100 - cpToWinProb(results[idx].score));
        if (Math.max(0, prevWpBefore - prevWpAfter) > 20) isMissOp = true;
      }

      let classification = classifyMove(playerWpBefore, playerWpAfter, isBook, isMate, m.san, beforeData.bestMove, isMissOp);

      counts[m.color][classification]++;
      if (!isBook) {
        if (m.color === 'w') { wAccSum += accuracy; wMoves++; }
        if (m.color === 'b') { bAccSum += accuracy; bMoves++; }
        if (idx < 20) { if(m.color === 'w'){ wOpenSum += accuracy; wOpenCount++; } else { bOpenSum += accuracy; bOpenCount++; } }
        else if (idx < 60) { if(m.color === 'w'){ wMidSum += accuracy; wMidCount++; } else { bMidSum += accuracy; bMidCount++; } }
        else { if(m.color === 'w'){ wEndSum += accuracy; wEndCount++; } else { bEndSum += accuracy; bEndCount++; } }
      }

      const isYou = m.color === userColor;
      const coachText = getCoachText(classification, PIECE_NAMES[m.piece], m.san, isYou, beforeData.bestMove);

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
      counts,
      phases: {
        w: { open: wOpenCount ? (wOpenSum/wOpenCount) : 100, mid: wMidCount ? (wMidSum/wMidCount) : 100, end: wEndCount ? (wEndSum/wEndCount) : 100 },
        b: { open: bOpenCount ? (bOpenSum/bOpenCount) : 100, mid: bMidCount ? (bMidSum/bMidCount) : 100, end: bEndCount ? (bEndSum/bEndCount) : 100 }
      }
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
      if (newIdx >= 0) speakMoRN(reviewMoves[newIdx].coachText);
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
    setHistory([]);
    setReviewMoves([]);
    setCurrentReviewIndex(-1);
    setIsViewingAlt(false);
    setIsAnalyzing(false);
    setActiveLesson(null);
    setAcademyNode(null);
    window.speechSynthesis?.cancel();
  }

  // --------------------------------------------------------
  // Render Variables
  // --------------------------------------------------------
  const currentMove = currentReviewIndex >= 0 ? reviewMoves[currentReviewIndex] : null;
  let evalRaw = rawScore; 
  let evalString = `${evalRaw > 0 ? '+' : ''}${(evalRaw / 100).toFixed(2)}`;

  if (gameMode === 'review' && currentMove) {
    if (currentMove.evalMate) {
      evalString = `M${Math.abs(currentMove.evalMate)}`;
      evalRaw = currentMove.evalMate > 0 ? 1000 : -1000;
    } else {
      evalRaw = currentMove.evalScore || 0;
      evalString = `${evalRaw > 0 ? '+' : ''}${(evalRaw / 100).toFixed(2)}`;
    }
  } else if (gameMode === 'review' && reviewMoves.length > 0) {
    evalRaw = reviewMoves[0].evalScore || 0;
    evalString = `${evalRaw > 0 ? '+' : ''}${(evalRaw / 100).toFixed(2)}`;
  }

  const evalHeight = useMemo(() => {
    const clamped = Math.max(-500, Math.min(500, evalRaw));
    return `${((clamped + 500) / 1000) * 100}%`;
  }, [evalRaw]);

  const activeSquareStyles = useMemo(() => {
    let styles = { ...optionSquares };
    if (gameMode === 'review' && currentMove && !isViewingAlt) {
      styles[currentMove.from] = { backgroundColor: 'rgba(255, 255, 0, 0.4)' }; 
      styles[currentMove.to] = { backgroundColor: 'rgba(255, 255, 0, 0.6)' };  
    }
    return styles;
  }, [optionSquares, gameMode, currentMove, isViewingAlt]);

  const activeArrows = useMemo(() => {
    if (gameMode === 'review' && currentMove && !isViewingAlt && ["Blunder", "Mistake", "Inaccuracy", "Miss"].includes(currentMove.classification) && currentMove.bestMoveLAN) {
      return [
        [currentMove.bestMoveLAN.substring(0, 2), currentMove.bestMoveLAN.substring(2, 4), "rgba(129, 182, 76, 0.8)"]
      ];
    }
    return [];
  }, [gameMode, currentMove, isViewingAlt]);

  const currentTheme = BOARD_THEMES[boardTheme] || BOARD_THEMES.wood;

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
        
        /* LEFT: BOARD & EVAL */
        .board-section { display: flex; gap: 15px; flex: 1; min-width: 320px; max-width: 550px; }
        .eval-bar { width: 25px; background: #333; border-radius: 6px; position: relative; overflow: hidden; border: 1px solid #444; display: flex; flex-direction: column; }
        .eval-fill { background: #fff; width: 100%; position: absolute; bottom: 0; transition: height 0.3s; }
        .eval-txt { position: absolute; width: 100%; text-align: center; font-size: 11px; font-weight: bold; z-index: 10; bottom: 5px; color: #000; text-shadow: 0px 0px 3px rgba(255,255,255,0.8); }
        .board-container { flex: 1; border-radius: 6px; overflow: hidden; box-shadow: 0 12px 24px rgba(0,0,0,0.6); }

        /* RIGHT: PANELS */
        .side-panel { flex: 1; min-width: 320px; max-width: 450px; background: #1e1e1e; border-radius: 8px; border: 1px solid #333; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 8px 16px rgba(0,0,0,0.4); }
        .panel-header { padding: 15px 20px; font-weight: bold; font-size: 16px; color: #81b64c; border-bottom: 1px solid #333; }
        .panel-content { padding: 20px; flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 15px; }

        /* Generic Inputs */
        .log-text { color: #888; font-style: italic; font-size: 14px; }
        .setting-row { display: flex; flex-direction: column; gap: 8px; margin-bottom: 15px; }
        .setting-row label { font-weight: bold; color: #ccc; font-size: 14px; }
        .setting-row select, .setting-row input[type="range"] { padding: 10px; background: #333; border: 1px solid #555; color: #fff; border-radius: 6px; outline: none; }
        .action-btn { width: 100%; padding: 14px; background: #d32f2f; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; }
        .action-btn:hover { filter: brightness(1.1); }

        /* Review / Academy UI */
        .pgn-box { width: 100%; height: 150px; background: #121212; color: #fff; border: 1px solid #444; padding: 15px; border-radius: 6px; resize: none; font-family: monospace; box-sizing: border-box; }
        .coach-card { background: #312e2b; padding: 15px; border-radius: 8px; display: flex; gap: 15px; align-items: center; margin-bottom: 20px; }
        .coach-face { width: 48px; height: 48px; background: url('https://www.chess.com/bundles/web/images/coach/coach-anya.png') center/cover; border-radius: 50%; min-width: 48px; }
        .coach-text { background: #fff; color: #333; padding: 10px 15px; border-radius: 8px; font-size: 14px; flex: 1; font-weight: 500; }
        
        /* Summary Grid */
        .acc-grid { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px solid #403d39; padding-bottom: 20px; }
        .acc-col { text-align: center; flex: 1; }
        .acc-box { font-size: 28px; font-weight: bold; background: #fff; color: #333; padding: 8px; border-radius: 6px; margin-top: 8px; display: inline-block; min-width: 80px; }
        .acc-box.dark { background: #333; color: #fff; }
        .stat-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #312e2b; font-size: 14px; }
        .stat-badge { display: flex; align-items: center; gap: 6px; width: 100px; justify-content: center; }
        .stat-icon { width: 18px; height: 18px; border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; }

        .review-nav { display: flex; gap: 10px; margin-top: auto; }
        .nav-arrow { flex: 1; padding: 12px; background: #333; border: 1px solid #444; color: #fff; border-radius: 6px; cursor: pointer; font-weight: bold; }
        .nav-arrow:hover:not(:disabled) { background: #444; }
        .nav-arrow:disabled { opacity: 0.5; cursor: not-allowed; }

        @media (max-width: 768px) {
          .main-layout { flex-direction: column; align-items: center; }
          .board-section, .side-panel { width: 100%; max-width: 100%; }
        }
      `}</style>

      <div className="app-container">
        
        <div className="header">
          <h1>MoRN Chess | The Ultimate Arena</h1>
          <div className="nav-menu">
            <button className="menu-btn" style={{backgroundColor: gameMode === 'computer' ? '#4CAF50' : '#4a4a4a'}} onClick={() => resetToBase('computer')}>Play vs AI</button>
            <button className="menu-btn" style={{backgroundColor: gameMode === 'input' || gameMode === 'review' || gameMode === 'summary' ? '#2196F3' : '#4a4a4a'}} onClick={() => resetToBase('input')}>Game Review Suite</button>
            <button className="menu-btn" style={{backgroundColor: gameMode === 'academy' ? '#9C27B0' : '#4a4a4a'}} onClick={() => resetToBase('academy')}>MoRN Academy</button>
            <button className="menu-btn" style={{backgroundColor: gameMode === 'settings' ? '#FF9800' : '#4a4a4a'}} onClick={() => resetToBase('settings')}>⚙ Settings</button>
          </div>
        </div>

        <div className="main-layout">
          
          {/* LEFT: BOARD */}
          <div className="board-section">
            <div className="eval-bar">
              <div className="eval-fill" style={{ height: evalHeight }} />
              <div className="eval-txt">{(evalRaw/100).toFixed(1)}</div>
            </div>
            <div className="board-container">
              <Chessboard
                position={gameMode === 'review' && currentMove ? currentMove.fenAfter : game.fen()}
                onPieceDrop={handlePieceDrop}
                onSquareClick={handleSquareClick}
                customSquareStyles={activeSquareStyles}
                showBoardNotation={true}
                customDarkSquareStyle={{ backgroundColor: currentTheme.dark }}
                customLightSquareStyle={{ backgroundColor: currentTheme.light }}
                customArrows={activeArrows.map(arr => [arr[0], arr[1]])}
                customArrowColor={activeArrows.length > 0 ? activeArrows[0][2] : "rgba(129, 182, 76, 0.8)"}
                animationDuration={isViewingAlt ? 0 : 250}
                boardOrientation={(gameMode === 'review' || gameMode === 'academy') && userColor === 'b' ? 'black' : 'white'}
              />
            </div>
          </div>

          {/* RIGHT: DYNAMIC PANEL */}
          <div className="side-panel">
            
            {/* Play Mode */}
            {gameMode === 'computer' && (
              <>
                <div className="panel-header">Match Arena Logs</div>
                <div className="panel-content">
                  {history.length === 0 ? (
                    <div className="log-text">The board is set. Make a legal move to engage the engine...</div>
                  ) : (
                    <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '14px', alignContent: 'flex-start'}}>
                      {history.map((m, i) => (
                        <span key={i} style={{background: '#333', padding: '6px 10px', borderRadius: '4px'}}>
                          {i % 2 === 0 ? <strong style={{color: '#888'}}>{(i/2)+1}. </strong> : ''}{m.san}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Academy Mode */}
            {gameMode === 'academy' && (
              <>
                <div className="panel-header" style={{color: '#9C27B0'}}>MoRN Academy</div>
                <div className="panel-content">
                  {!activeLesson ? (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                      <p className="log-text">Master openings and crush your opponents.</p>
                      {Object.values(ACADEMY_LESSONS).map(lesson => (
                        <button key={lesson.id} className="action-btn" style={{background: '#9C27B0'}} onClick={() => startLesson(lesson.id)}>
                          {lesson.title}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
                      <div className="coach-card">
                        <div className="coach-face"></div>
                        <div className="coach-text">{academyMessage}</div>
                      </div>
                      <button className="action-btn" style={{marginTop: 'auto', background: '#333'}} onClick={() => resetToBase('academy')}>Exit Lesson</button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Settings Mode */}
            {gameMode === 'settings' && (
              <>
                <div className="panel-header" style={{color: '#FF9800'}}>Arena Preferences</div>
                <div className="panel-content">
                  <div className="setting-row">
                    <label>AI Playing Strength (Level {aiLevel})</label>
                    <input type="range" min="1" max="10" value={aiLevel} onChange={(e) => setAiLevel(parseInt(e.target.value))} />
                  </div>
                  <div className="setting-row">
                    <label>Board Theme</label>
                    <select value={boardTheme} onChange={(e) => setBoardTheme(e.target.value)}>
                      <option value="portugal">MoRN Red (Portugal)</option>
                      <option value="wood">Tournament Wood</option>
                      <option value="green">Classic Green</option>
                      <option value="ocean">Ocean Blue</option>
                      <option value="dark">Midnight Dark</option>
                    </select>
                  </div>
                  <div className="setting-row">
                    <label>MoRN Coach Voice Persona</label>
                    <select value={coachGender} onChange={(e) => setCoachGender(e.target.value)}>
                      <option value="female">MoRN (Female)</option>
                      <option value="male">MoRN (Male)</option>
                    </select>
                  </div>
                  <button className="action-btn" style={{background: isVoiceMuted ? '#444' : '#4CAF50', marginTop: 'auto'}} onClick={() => setIsVoiceMuted(!isVoiceMuted)}>
                    {isVoiceMuted ? '🔇 Voice Muted' : '🔊 Voice Active'}
                  </button>
                </div>
              </>
            )}

            {/* Review Setup & Execution Mode */}
            {['input', 'summary', 'review'].includes(gameMode) && (
              <>
                <div className="panel-header" style={{color: '#2196F3'}}>★ Game Review Suite</div>
                <div className="panel-content" style={{padding: gameMode === 'summary' ? '10px 20px' : '20px'}}>
                  
                  {gameMode === 'input' && (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '15px', height: '100%'}}>
                      <textarea className="pgn-box" placeholder="Paste PGN here..." value={pgnInput} onChange={e => setPgnInput(e.target.value)} />
                      <div style={{display: 'flex', gap: '10px'}}>
                        <button className="action-btn" style={{background: userColor === 'w' ? '#2196F3' : '#333'}} onClick={() => setUserColor('w')}>I played White</button>
                        <button className="action-btn" style={{background: userColor === 'b' ? '#2196F3' : '#333'}} onClick={() => setUserColor('b')}>I played Black</button>
                      </div>
                      <button className="action-btn" style={{background: '#4CAF50', marginTop: 'auto'}} onClick={startAnalysis}>Analyze Match</button>
                    </div>
                  )}

                  {gameMode === 'summary' && isAnalyzing && (
                    <div style={{textAlign: 'center', margin: 'auto'}}>
                      <h3 style={{color: '#2196F3'}}>Deep Analysis Running</h3>
                      <p className="log-text">Stockfish is crunching the geometry...</p>
                      <div style={{width: '100%', height: '10px', background: '#333', borderRadius: '5px', marginTop: '20px', overflow: 'hidden'}}>
                        <div style={{width: `${progress}%`, height: '100%', background: '#2196F3', transition: 'width 0.2s'}} />
                      </div>
                    </div>
                  )}

                  {gameMode === 'summary' && summaryData && !isAnalyzing && (
                    <div style={{display: 'flex', flexDirection: 'column'}}>
                      <div className="coach-card">
                        <div className="coach-face"></div>
                        <div className="coach-text">Here is your full game report. Let's review the key moments!</div>
                      </div>
                      
                      <div className="acc-grid">
                        <div className="acc-col">
                          <div style={{color: '#a59f97', fontSize: '13px'}}>{userColor === 'w' ? 'You' : 'Opponent'} (White)</div>
                          <div className="acc-box">{summaryData.wAcc}</div>
                        </div>
                        <div className="acc-col">
                          <div style={{color: '#a59f97', fontSize: '13px'}}>{userColor === 'b' ? 'You' : 'Opponent'} (Black)</div>
                          <div className="acc-box dark">{summaryData.bAcc}</div>
                        </div>
                      </div>

                      {STAT_ORDER.map(type => {
                        const wCount = summaryData.counts.w[type];
                        const bCount = summaryData.counts.b[type];
                        if (!wCount && !bCount) return null;
                        const color = COLORS[type];
                        return (
                          <div className="stat-row" key={type}>
                            <span style={{flex: 1, textAlign: 'right', fontWeight: 'bold', color}}>{wCount || 0}</span>
                            <div className="stat-badge">
                              <span className="stat-icon" style={{backgroundColor: color}}>{ICONS[type]}</span>
                              <span style={{color: '#a59f97'}}>{type}</span>
                            </div>
                            <span style={{flex: 1, textAlign: 'left', fontWeight: 'bold', color}}>{bCount || 0}</span>
                          </div>
                        );
                      })}

                      <div className="stat-row" style={{marginTop: '20px', borderTop: '1px solid #403d39', paddingTop: '20px'}}>
                        <span style={{flex: 1, textAlign: 'right', fontWeight: 'bold', fontSize: '18px'}}>{summaryData.wElo}</span>
                        <div className="stat-badge" style={{color: '#fff', fontWeight: 'bold'}}>Game Rating</div>
                        <span style={{flex: 1, textAlign: 'left', fontWeight: 'bold', fontSize: '18px'}}>{summaryData.bElo}</span>
                      </div>

                      <div className="stat-row" style={{marginTop: '20px', borderTop: '1px solid #403d39', paddingTop: '20px'}}>
                        <span style={{flex: 1, textAlign: 'right'}}><span className="stat-icon" style={{backgroundColor: getPhaseIcon(summaryData.phases.w.open).color, display: 'inline-flex'}}>{getPhaseIcon(summaryData.phases.w.open).icon}</span></span>
                        <div className="stat-badge" style={{color: '#fff', fontWeight: 'bold'}}>Opening</div>
                        <span style={{flex: 1, textAlign: 'left'}}><span className="stat-icon" style={{backgroundColor: getPhaseIcon(summaryData.phases.b.open).color, display: 'inline-flex'}}>{getPhaseIcon(summaryData.phases.b.open).icon}</span></span>
                      </div>
                      <div className="stat-row">
                        <span style={{flex: 1, textAlign: 'right'}}><span className="stat-icon" style={{backgroundColor: getPhaseIcon(summaryData.phases.w.mid).color, display: 'inline-flex'}}>{getPhaseIcon(summaryData.phases.w.mid).icon}</span></span>
                        <div className="stat-badge" style={{color: '#fff', fontWeight: 'bold'}}>Middlegame</div>
                        <span style={{flex: 1, textAlign: 'left'}}><span className="stat-icon" style={{backgroundColor: getPhaseIcon(summaryData.phases.b.mid).color, display: 'inline-flex'}}>{getPhaseIcon(summaryData.phases.b.mid).icon}</span></span>
                      </div>
                      <div className="stat-row">
                        <span style={{flex: 1, textAlign: 'right'}}><span className="stat-icon" style={{backgroundColor: getPhaseIcon(summaryData.phases.w.end).color, display: 'inline-flex'}}>{getPhaseIcon(summaryData.phases.w.end).icon}</span></span>
                        <div className="stat-badge" style={{color: '#fff', fontWeight: 'bold'}}>Endgame</div>
                        <span style={{flex: 1, textAlign: 'left'}}><span className="stat-icon" style={{backgroundColor: getPhaseIcon(summaryData.phases.b.end).color, display: 'inline-flex'}}>{getPhaseIcon(summaryData.phases.b.end).icon}</span></span>
                      </div>
                      
                      <button className="action-btn" style={{width: '100%', marginTop: '30px', background: '#81b64c'}} onClick={() => { setGameMode('review'); setCurrentReviewIndex(0); setGame(new Chess(reviewMoves[0].fenAfter)); }}>
                        Start Review
                      </button>
                    </div>
                  )}

                  {gameMode === 'review' && reviewMoves.length > 0 && currentMove && (
                    <>
                      <div className="coach-card" style={{background: '#2a2a2a', borderLeft: `4px solid ${COLORS[currentMove.classification] || '#81b64c'}`}}>
                        <div className="coach-face" style={{minWidth: '48px'}}></div>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '5px', flex: 1}}>
                          <div style={{fontWeight: 'bold', color: COLORS[currentMove.classification] || '#81b64c', display: 'flex', alignItems: 'center', gap: '8px'}}>
                            <span className="class-icon" style={{background: COLORS[currentMove.classification] || '#81b64c'}}>
                              {ICONS[currentMove.classification]}
                            </span>
                            {currentMove.san} is {currentMove.classification}
                          </div>
                          <p style={{margin: 0, fontSize: '13px', lineHeight: '1.5', color: '#ddd'}}>{currentMove.coachText}</p>
                        </div>
                      </div>

                      <div style={{display: 'flex', gap: '10px', marginBottom: '15px'}}>
                        {(!isViewingAlt && ["Blunder", "Mistake", "Inaccuracy", "Miss"].includes(currentMove?.classification) && currentMove?.bestMoveLAN) ? (
                          <>
                            <button className="action-btn" style={{background: '#1baca1', padding: '10px'}} onClick={showAlternativeLine}>🔍 Best Move</button>
                            <button className="action-btn" style={{background: '#81b64c', padding: '10px'}} onClick={() => navigateReview(1)}>Next ➔</button>
                          </>
                        ) : isViewingAlt ? (
                          <button className="action-btn" style={{background: '#666', padding: '10px'}} onClick={resetToCurrentReviewMove}>↩ Resume</button>
                        ) : (
                          <button className="action-btn" style={{background: '#81b64c', padding: '10px'}} onClick={() => navigateReview(1)}>Next ➔</button>
                        )}
                      </div>

                      <div className="review-nav">
                        <button className="nav-arrow" onClick={() => navigateReview('start')}>|❮</button>
                        <button className="nav-arrow" disabled={currentReviewIndex <= -1} onClick={() => navigateReview(-1)}>❮</button>
                        <button className="nav-arrow" disabled={currentReviewIndex >= reviewMoves.length - 1} onClick={() => navigateReview(1)}>❯</button>
                        <button className="nav-arrow" onClick={() => navigateReview('end')}>❯|</button>
                      </div>
                    </>
                  )}

                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
