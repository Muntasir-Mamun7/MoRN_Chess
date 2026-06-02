import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import AcademyPanel from './modules/academy/AcademyPanel.jsx';

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

const AFFIRMATIONS = ["You got it!", "Cool!", "Great!", "Spot on!", "Exactly!", "Nice one!"];

const playSound = (isCapture, isMuted) => {
  if (isMuted) return;
  const url = isCapture 
    ? 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/capture.mp3'
    : 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-self.mp3';
  new Audio(url).play().catch(() => {});
};

// ============================================================================
// CHESS.COM STYLE ARROW GENERATOR (Green & L-Shaped Knights)
// ============================================================================
const CHESS_COM_GREEN = 'rgba(129, 182, 76, 0.8)';

function generateArrows(fen, moveSanOrLan) {
  if (!fen || !moveSanOrLan) return [];
  const game = new Chess(fen);
  try {
    const move = game.move(moveSanOrLan);
    if (!move) return [];

    // If the piece is a Knight, calculate the L-shape (elbow)
    if (move.piece === 'n') {
      const fromFile = move.from.charAt(0);
      const fromRank = move.from.charAt(1);
      const toFile = move.to.charAt(0);
      const toRank = move.to.charAt(1);

      let elbow = '';
      // If moving 2 squares vertically, elbow is on the same file as 'from'
      if (Math.abs(parseInt(fromRank) - parseInt(toRank)) === 2) {
        elbow = fromFile + toRank;
      } else {
        // If moving 2 squares horizontally, elbow is on the same file as 'to'
        elbow = toFile + fromRank;
      }

      return [
        [move.from, elbow, CHESS_COM_GREEN],
        [elbow, move.to, CHESS_COM_GREEN]
      ];
    }

    // Default straight arrow for all other pieces
    return [[move.from, move.to, CHESS_COM_GREEN]];
  } catch (e) {
    return [];
  }
}

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
    Blunder: [`${san} is a blunder. ${actor} permitted a massive advantage.`, `A critical error by ${actor}.`],
    Mistake: [`${san} is a mistake. This surrenders positional control.`, `Not the right idea. ${actor} allowed the position to worsen.`],
    Inaccuracy: [`${san} is an inaccuracy. ${alt ? `Why not ${alt}?` : 'There was a sharper continuation.'}`],
    Miss: [`A tragic miss! ${actor} had a chance to punish a blunder but played ${san} instead.`],
    Good: [`${san} is good. A solid, playable move.`, `${actor} played a sensible, safe move.`],
    Excellent: [`${san} is excellent. ${actor} found a highly active square.`],
    Best: [`${san} is the absolute best move. Flawless tactical execution.`, `The strongest engine continuation.`],
    Great: [`${san} is a great move. ${actor} found a powerful tactic!`],
    Book: [`${san} is established opening theory. Deep preparation!`]
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
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  
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
  const [safeFen, setSafeFen] = useState(''); 
  
  // Board Interaction State
  const [moveFrom, setMoveFrom] = useState('');
  const [optionSquares, setOptionSquares] = useState({});
  const batchRef = useRef({ isActive: false, queue: [], results: [], currentScore: 0, currentMate: null, parsedReview: [] });
  const isMobileViewport = viewportWidth <= 768;

  const mobileBoardWidth = useMemo(() => {
    if (!isMobileViewport) return undefined;
    const horizontalPadding = viewportWidth <= 480 ? 24 : 36;
    const evalBarWidth = gameMode !== 'academy' ? 30 : 0;
    return Math.max(250, viewportWidth - horizontalPadding - evalBarWidth);
  }, [gameMode, isMobileViewport, viewportWidth]);

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

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    setSafeFen(newGame.fen()); // Set safe rewind point
    setAcademyNode(currentNode);
    setAcademyMessage(currentNode.prompt);
    setAcademyError(false);
    setShowHint(false);
    setGameMode('academy');
    speakMoRN(currentNode.prompt);
  }

  function handleAcademyMove(moveObj, fenBeforeMove) {
    setShowHint(false);
    if (!academyNode) return;

    const gameCopy = new Chess(fenBeforeMove);
    gameCopy.move(moveObj); // Execute user's move

    if (moveObj.san === academyNode.expected || moveObj.lan === academyNode.expected) {
      // CORRECT MOVE
      setGame(gameCopy);
      setSafeFen(gameCopy.fen()); // Update safe fallback
      playSound(moveObj.flags.includes('c'), isVoiceMuted);
      setAcademyError(false);

      if (academyNode.endpoint) {
        setAcademyMessage(academyNode.endpoint);
        speakMoRN(academyNode.endpoint);
        setAcademyNode(null);
      } else if (academyNode.response) {
        const affirm = AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)];
        setAcademyMessage(`${affirm} Opponent is responding...`);
        speakMoRN(affirm);
        
        setTimeout(() => {
          const moveRes = gameCopy.move(academyNode.response);
          setGame(new Chess(gameCopy.fen()));
          setSafeFen(gameCopy.fen()); // Secure new baseline after bot move
          playSound(moveRes.flags.includes('c'), isVoiceMuted);
          setAcademyNode(academyNode.next);
          setAcademyMessage(academyNode.next.prompt);
          speakMoRN(academyNode.next.prompt);
        }, 1000);
      }
    } else {
      // WRONG MOVE (Trigger Punishment Engine)
      setSafeFen(fenBeforeMove); // Lock fallback exactly before the mistake
      setAcademyError(true);
      playSound(moveObj.flags.includes('c'), isVoiceMuted);
      setGame(new Chess(gameCopy.fen())); // Show their bad move

      let specificWrong = null;
      if (academyNode.wrong && Array.isArray(academyNode.wrong)) {
         specificWrong = academyNode.wrong.find(w => w.move === moveObj.san);
      }

      if (specificWrong && specificWrong.response) {
         setAcademyMessage("Oh no! Wait for it...");
         speakMoRN("Oh no!");
         
         // Execute the crushing bot response
         setTimeout(() => {
           try {
             const punishRes = gameCopy.move(specificWrong.response);
             setGame(new Chess(gameCopy.fen()));
             playSound(punishRes.flags.includes('c'), isVoiceMuted);
             setAcademyMessage(specificWrong.msg);
             speakMoRN(specificWrong.msg);
           } catch(e) {
             setAcademyMessage(specificWrong.msg);
             speakMoRN(specificWrong.msg);
           }
         }, 1000);
      } else {
         const msg = `That's not the right move. ${academyNode.prompt}`;
         setAcademyMessage(msg);
         speakMoRN("Try again.");
      }
    }
  }

  function undoAcademyMove() {
    if (safeFen) {
      setGame(new Chess(safeFen)); // Instantly rewinds mistake + punishment
    }
    setAcademyError(false);
    setShowHint(false);
    setAcademyMessage(academyNode.prompt);
    speakMoRN("Let's try that again.");
  }

  function provideHint() {
    if (academyError && safeFen) {
      setGame(new Chess(safeFen)); // Clean up board if a mistake was made
      setAcademyError(false);
    }
    setShowHint(true);
    const msg = `Hint: Try playing ${academyNode.expected}. Follow the arrow.`;
    setAcademyMessage(msg);
    speakMoRN(msg);
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
    const fenBeforeMove = game.fen();
    const tempGame = new Chess(fenBeforeMove);
    try {
      const move = tempGame.move({ from: moveFrom, to: square, promotion: 'q' });
      if (move) handleAcademyMove(move, fenBeforeMove);
    } catch (e) {
      const piece = game.get(square);
      if (piece && piece.color === game.turn()) { setMoveFrom(square); updateOptionSquares(square); return; }
    }
    setMoveFrom(''); setOptionSquares({});
  }

  function handlePieceDrop(source, target) {
    if (gameMode !== 'academy' || academyError || !academyNode) return false;
    const fenBeforeMove = game.fen();
    const tempGame = new Chess(fenBeforeMove);
    try {
      const move = tempGame.move({ from: source, to: target, promotion: 'q' });
      if (move) { handleAcademyMove(move, fenBeforeMove); return true; }
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
    
    // Phase Tracking
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
      const isBook = idx < 10 && (playerWpBefore - playerWpAfter) < 2;
      const isMate = m.san.includes('#');

      let classification = classifyMove(playerWpBefore, playerWpAfter, isBook, isMate);

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
    setReviewMoves([]);
    setCurrentReviewIndex(-1);
    setIsViewingAlt(false);
    setIsAnalyzing(false);
    setActiveModule(null);
    setActiveLesson(null);
    setAcademyNode(null);
    setAcademyError(false);
    setShowHint(false);
    setSafeFen('');
    window.speechSynthesis?.cancel();
  }

  // --------------------------------------------------------
  // Render Variables
  // --------------------------------------------------------
  const currentTheme = BOARD_THEMES[boardTheme] || BOARD_THEMES.wood;
  
  const currentMove = currentReviewIndex >= 0 ? reviewMoves[currentReviewIndex] : null;
  let evalRaw = 0; 
  let evalString = `0.00`;

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

  // Calculate dynamic arrows using the CHESS_COM_GREEN logic
  const activeArrows = useMemo(() => {
    if (gameMode === 'review' && currentReviewIndex >= 0 && !isViewingAlt) {
       const move = reviewMoves[currentReviewIndex];
       if (move && move.bestMoveLAN && ["Blunder", "Mistake", "Inaccuracy", "Miss"].includes(move.classification)) {
         return generateArrows(move.fenBefore, move.bestMoveLAN);
       }
    }
    if (gameMode === 'academy' && showHint && academyNode) {
       return generateArrows(safeFen || game.fen(), academyNode.expected);
    }
    return [];
  }, [gameMode, currentReviewIndex, isViewingAlt, reviewMoves, showHint, academyNode, game, safeFen]);

  const activeSquareStyles = useMemo(() => {
    let styles = { ...optionSquares };
    if (gameMode === 'review' && currentReviewIndex >= 0 && !isViewingAlt) {
      const move = reviewMoves[currentReviewIndex];
      styles[move.from] = { backgroundColor: 'rgba(255, 255, 0, 0.4)' }; 
      styles[move.to] = { backgroundColor: 'rgba(255, 255, 0, 0.6)' };  
    }
    return styles;
  }, [optionSquares, gameMode, currentReviewIndex, isViewingAlt, reviewMoves]);

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
        .eval-bar { width: 25px; background: #333; border-radius: 6px; position: relative; overflow: hidden; border: 1px solid #444; display: flex; flex-direction: column; }
        .eval-fill { background: #fff; width: 100%; position: absolute; bottom: 0; transition: height 0.3s; }
        .eval-txt { position: absolute; width: 100%; text-align: center; font-size: 11px; font-weight: bold; z-index: 10; bottom: 5px; color: #000; text-shadow: 0px 0px 3px rgba(255,255,255,0.8); }
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
        
        /* Summary Grid */
        .acc-grid { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px solid #403d39; padding-bottom: 20px; }
        .acc-col { text-align: center; flex: 1; }
        .acc-box { font-size: 28px; font-weight: bold; background: #fff; color: #333; padding: 8px; border-radius: 6px; margin-top: 8px; display: inline-block; min-width: 80px; }
        .acc-box.dark { background: #333; color: #fff; }
        .stat-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #312e2b; font-size: 14px; }
        .stat-badge { display: flex; align-items: center; gap: 6px; width: 100px; justify-content: center; }
        .stat-icon { width: 18px; height: 18px; border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; }

        /* Review UI */
        .move-list { flex: 1; overflow-y: auto; background: #2b2826; }
        .move-row { display: flex; border-bottom: 1px solid #312e2b; background: #262421; }
        .move-num { width: 40px; text-align: center; padding: 10px 0; color: #888; font-size: 13px; background: #312e2b; }
        .move-cell { flex: 1; padding: 10px 15px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-weight: bold; font-size: 14px; color: #a59f97; }
        .move-cell:hover { background: #312e2b; }
        .move-cell.active { background: #403d39; color: #fff; }
        .graph-area { height: 60px; background: #1e1e1e; border-top: 1px solid #403d39; position: relative; }

        .nav-bar { display: flex; background: #262421; padding: 15px; gap: 5px; align-items: center; border-top: 1px solid #403d39; }
        .nav-btn { flex: 1; background: #312e2b; border: none; color: #a59f97; padding: 12px 0; border-radius: 6px; cursor: pointer; font-size: 16px; transition: 0.2s; }
        .nav-btn:hover:not(:disabled) { background: #403d39; color: #fff; }
        .nav-btn:disabled { opacity: 0.5; }
        .nav-play { flex: 2; background: #81b64c; color: #fff; font-weight: bold; }
        .nav-play:hover { background: #96bc4b; }

        @media (max-width: 768px) {
          .app-container { padding: 14px; }
          .header { margin-bottom: 14px; }
          .header h1 { font-size: 1.8rem; margin-bottom: 12px; line-height: 1.2; }
          .nav-menu { width: 100%; gap: 8px; }
          .menu-btn { flex: 1 1 calc(50% - 8px); padding: 11px 10px; font-size: 13px; }
          .main-layout { flex-direction: column; align-items: center; gap: 14px; }
          .board-section, .side-panel { width: 100%; max-width: 100%; min-width: 0; }
          .board-section { gap: 10px; }
          .eval-bar { width: 20px; }
          .panel-header { padding: 12px 14px; font-size: 15px; }
          .panel-content { padding: 14px; }
          .action-btn { padding: 12px; font-size: 14px; }
          .player-bar { padding: 8px 10px; }
          .player-info { font-size: 13px; gap: 8px; min-width: 0; }
          .move-cell { padding: 10px; font-size: 13px; min-width: 0; }
          .move-num { width: 34px; font-size: 12px; }
          .stat-badge { width: auto; min-width: 90px; }
          .acc-box { font-size: 24px; min-width: 70px; }
        }

        @media (max-width: 480px) {
          .app-container { padding: 10px; }
          .header h1 { font-size: 1.45rem; }
          .menu-btn { flex-basis: 100%; }
          .board-section { gap: 8px; }
          .eval-bar { width: 18px; }
          .panel-header { padding: 10px 12px; }
          .panel-content { padding: 12px; }
          .nav-bar { padding: 10px; gap: 4px; }
          .nav-btn { font-size: 14px; padding: 10px 0; }
          .stat-row { font-size: 13px; }
          .stat-badge { min-width: 78px; font-size: 12px; }
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
            {gameMode !== 'academy' && (
              <div className="eval-bar">
                <div className="eval-fill" style={{ height: evalHeight }} />
                <div className="eval-txt">{(evalRaw/100).toFixed(1)}</div>
              </div>
            )}
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
                boardWidth={mobileBoardWidth}
                customSquareStyles={activeSquareStyles}
                customArrows={activeArrows.map(arr => [arr[0], arr[1]])}
                customArrowColor={activeArrows.length > 0 ? activeArrows[0][2] : CHESS_COM_GREEN}
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
              <AcademyPanel
                activeModule={activeModule}
                activeLesson={activeLesson}
                academyError={academyError}
                academyMessage={academyMessage}
                academyNode={academyNode}
                showHint={showHint}
                isVoiceMuted={isVoiceMuted}
                onToggleMute={() => setIsVoiceMuted(!isVoiceMuted)}
                onOpenModule={openModule}
                onStartLesson={startLesson}
                onRetryMove={undoAcademyMove}
                onProvideHint={provideHint}
                onBackToModules={() => { setActiveLesson(null); setActiveModule(null); setAcademyError(false); setShowHint(false); }}
                onBackToLessons={() => { setActiveLesson(null); setAcademyError(false); setShowHint(false); }}
              />
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

            {/* Analysis Screen */}
            {gameMode === 'summary' && isAnalyzing && (
              <>
                <div className="panel-header" style={{color: '#2196F3'}}>★ Game Review</div>
                <div className="panel-content" style={{justifyContent: 'center'}}>
                  <div style={{textAlign: 'center', margin: 'auto'}}>
                    <h3 style={{color: '#2196F3'}}>Deep Analysis Running</h3>
                    <p style={{color: '#888'}}>Stockfish 16 is crunching the geometry...</p>
                    <div style={{width: '100%', height: '10px', background: '#333', borderRadius: '5px', marginTop: '20px', overflow: 'hidden'}}>
                      <div style={{width: `${progress}%`, height: '100%', background: '#2196F3', transition: 'width 0.2s'}} />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Summary Data */}
            {gameMode === 'summary' && summaryData && !isAnalyzing && (
              <>
                <div className="panel-header" style={{color: '#2196F3'}}>★ Game Review</div>
                <div className="panel-content">
                  <div style={{display: 'flex', flexDirection: 'column'}}>
                    <div style={{background: '#2a2a2a', borderLeft: '4px solid #2196F3', padding: '15px', borderRadius: '6px', display: 'flex', gap: '15px', alignItems: 'center'}}>
                      <div style={{background: "url('https://www.chess.com/bundles/web/images/coach/coach-anya.png') center/cover", width: '48px', height: '48px', borderRadius: '50%', minWidth: '48px'}}></div>
                      <div style={{fontSize: '15px', lineHeight: '1.5', color: '#eee', flex: 1}}>Here is your full game report. Let's review the key moments!</div>
                    </div>
                    
                    <div className="acc-grid" style={{marginTop: '20px'}}>
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
                </div>
              </>
            )}

            {/* Active Review Navigation */}
            {gameMode === 'review' && reviewMoves.length > 0 && currentMove && (
              <>
                <div className="panel-header" style={{color: '#2196F3'}}>★ Game Review</div>
                <div style={{padding: '20px', flex: 1, display: 'flex', flexDirection: 'column'}}>
                  <div style={{background: '#2a2a2a', borderLeft: `4px solid ${COLORS[currentMove.classification] || '#81b64c'}`, padding: '15px', borderRadius: '6px', display: 'flex', gap: '15px', alignItems: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', marginBottom: '15px'}}>
                    <div style={{background: "url('https://www.chess.com/bundles/web/images/coach/coach-anya.png') center/cover", width: '48px', height: '48px', borderRadius: '50%', minWidth: '48px'}}></div>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '5px', flex: 1}}>
                      <div style={{fontWeight: 'bold', color: COLORS[currentMove.classification] || '#81b64c', display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <span className="stat-icon" style={{background: COLORS[currentMove.classification] || '#81b64c', display: 'inline-flex'}}>
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

                  <div className="move-list">
                    {Array.from({ length: Math.ceil(reviewMoves.length / 2) }).map((_, i) => {
                      const wMove = reviewMoves[i * 2];
                      const bMove = reviewMoves[i * 2 + 1];
                      return (
                        <div className="move-row" key={i}>
                          <div className="move-num">{i + 1}.</div>
                          
                          <div className={`move-cell ${currentReviewIndex === i * 2 ? 'active' : ''}`} onClick={() => navigateReview((i * 2) - currentReviewIndex)}>
                            {wMove.classification && <div className="stat-icon inline-icon" style={{backgroundColor: COLORS[wMove.classification], display: 'inline-flex', width:'16px', height:'16px', fontSize:'9px', marginRight:'8px'}}>{ICONS[wMove.classification]}</div>}
                            {wMove.san}
                          </div>

                          {bMove ? (
                            <div className={`move-cell ${currentReviewIndex === i * 2 + 1 ? 'active' : ''}`} onClick={() => navigateReview((i * 2 + 1) - currentReviewIndex)}>
                              {bMove.classification && <div className="stat-icon inline-icon" style={{backgroundColor: COLORS[bMove.classification], display: 'inline-flex', width:'16px', height:'16px', fontSize:'9px', marginRight:'8px'}}>{ICONS[bMove.classification]}</div>}
                              {bMove.san}
                            </div>
                          ) : <div className="move-cell"></div>}
                        </div>
                      );
                    })}
                  </div>

                  <div className="graph-area">
                    <svg width="100%" height="100%" preserveAspectRatio="none">
                      <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#555" strokeWidth="1" />
                      {reviewMoves.length > 0 && (
                        <>
                          <path 
                            d={`M 0,30 ${reviewMoves.map((m, i) => {
                              const x = ((i + 1) / reviewMoves.length) * 100;
                              const cp = m.evalScore; // Graph absolute white advantage
                              const clamped = Math.max(-500, Math.min(500, cp));
                              const y = 30 - (clamped / 500) * 30;
                              return `L ${x}%,${y}`;
                            }).join(' ')} L 100%,30 Z`}
                            fill="rgba(255,255,255,0.05)"
                          />
                          <path 
                            d={`M 0,30 ${reviewMoves.map((m, i) => {
                              const x = ((i + 1) / reviewMoves.length) * 100;
                              const cp = m.evalScore;
                              const clamped = Math.max(-500, Math.min(500, cp));
                              const y = 30 - (clamped / 500) * 30;
                              return `L ${x}%,${y}`;
                            }).join(' ')}`}
                            fill="none" stroke="#fff" strokeWidth="2"
                          />
                          {reviewMoves.map((m, i) => {
                            const x = ((i + 1) / reviewMoves.length) * 100;
                            const cp = m.evalScore;
                            const clamped = Math.max(-500, Math.min(500, cp));
                            const y = 30 - (clamped / 500) * 30;
                            return <circle key={i} cx={`${x}%`} cy={y} r="2.5" fill={COLORS[m.classification] || '#fff'} />;
                          })}
                        </>
                      )}
                    </svg>
                  </div>

                  <div style={{display: 'flex', gap: '10px', marginTop: '15px'}}>
                    <button className="action-btn" style={{background: '#333', padding: '10px'}} onClick={() => navigateReview('start')}>|❮</button>
                    <button className="action-btn" style={{background: '#333', padding: '10px'}} disabled={currentReviewIndex <= -1} onClick={() => navigateReview(-1)}>❮</button>
                    <button className="action-btn" style={{background: '#333', padding: '10px'}} disabled={currentReviewIndex >= reviewMoves.length - 1} onClick={() => navigateReview(1)}>❯</button>
                    <button className="action-btn" style={{background: '#333', padding: '10px'}} onClick={() => navigateReview('end')}>❯|</button>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
