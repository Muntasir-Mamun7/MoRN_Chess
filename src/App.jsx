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
  Miss: "#ff7769", Blunder: "#ca3431"
};

const ICONS = {
  Brilliant: "!!", Great: "!", Book: "📖", Best: "★", 
  Excellent: "👍", Good: "✓", Inaccuracy: "?!", Mistake: "?",
  Miss: "✖", Blunder: "??"
};

const BOARD_THEMES = {
  portugal: { light: '#f4f4f4', dark: '#d32f2f' },
  green: { light: '#eeeed2', dark: '#769656' },
  wood: { light: '#f0d9b5', dark: '#b58863' },
  ocean: { light: '#dee3e6', dark: '#8ca2ad' },
  dark: { light: '#aaaaaa', dark: '#555555' }
};

// ============================================================================
// CAPS2 WIN PROBABILITY ALGORITHM & BOOK HEURISTICS
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

function isLikelyBook(plyCount, cpScore) {
  // If we are in the first 7 full moves and eval is balanced, it's theory.
  return plyCount <= 14 && Math.abs(cpScore) <= 120;
}

function classifyMove(wpBefore, wpAfter, isBook, isMate, isAbsoluteBest, isMissOp) {
  if (isMate && wpAfter > 90) return "Best";
  if (isBook) return "Book";
  
  const loss = Math.max(0, wpBefore - wpAfter);

  // Strict parsing: Only the actual engine best move gets "Best"
  if (loss <= 1.0 && isAbsoluteBest) return "Best";
  if (loss <= 3.0) return "Excellent";
  if (loss <= 6.0) return "Good";
  if (loss <= 12.0) return "Inaccuracy";
  if (loss <= 22.0) return "Mistake";
  
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

// ============================================================================
// MORN AI COACH - SARCASM & LOGIC DATABASE
// ============================================================================
const getCoachText = (classification, piece, san, isYou, alt) => {
  const actor = isYou ? "You" : "Your opponent";
  
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
  const [gameMode, setGameMode] = useState('computer'); // computer, review, settings
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
  
  // Analysis State
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
  // Speech Synthesis Setup (MoRN Voice)
  // --------------------------------------------------------
  useEffect(() => {
    if (!window.speechSynthesis) return;
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setSystemVoices(voices);
      
      // Attempt to auto-select a voice based on gender preference
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
              batchRef.current.currentMate = null;
            }
          }
          if (line.includes('info') && line.includes('score mate')) {
            const match = line.match(/score mate (-?\d+)/);
            if (match) {
              const mate = parseInt(match[1]);
              if (batchRef.current.isActive) {
                batchRef.current.currentMate = mate;
                batchRef.current.currentScore = mate > 0 ? 30000 : -30000;
              } else {
                setRawScore(mate > 0 ? 30000 : -30000);
              }
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
  // Board Interaction
  // --------------------------------------------------------
  function handleSquareClick(square) {
    if (gameMode !== 'computer' || engineThinking || isAnalyzing) return;
    if (!moveFrom) {
      const piece = game.get(square);
      if (piece && piece.color === game.turn()) { setMoveFrom(square); updateOptionSquares(square); }
      return;
    }
    const gameCopy = new Chess(game.fen());
    try {
      if (gameCopy.move({ from: moveFrom, to: square, promotion: 'q' })) { setGame(gameCopy); setHistory(gameCopy.history({ verbose: true })); }
    } catch (e) {
      const piece = game.get(square);
      if (piece && piece.color === game.turn()) { setMoveFrom(square); updateOptionSquares(square); return; }
    }
    setMoveFrom(''); setOptionSquares({});
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
      setGameMode('review'); 
      
      engine.postMessage(`position fen ${fenList[0]}`);
      engine.postMessage('go depth 12');
    } catch(err) { alert("Invalid PGN."); }
  }

  function finishBatchAnalysis() {
    const { parsedReview, results } = batchRef.current;
    let wAccSum = 0, bAccSum = 0, wMoves = 0, bMoves = 0;
    const counts = { 
      w: { Brilliant:0, Great:0, Best:0, Excellent:0, Good:0, Inaccuracy:0, Mistake:0, Miss:0, Blunder:0, Book:0 }, 
      b: { Brilliant:0, Great:0, Best:0, Excellent:0, Good:0, Inaccuracy:0, Mistake:0, Miss:0, Blunder:0, Book:0 } 
    };

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
      
      // Intelligent Book Detection
      const isBook = isLikelyBook(idx, scoreAfterW);
      const isMate = m.san.includes('#');
      const isAbsoluteBest = (m.lan === beforeData.bestMove);

      let isMissOp = false;
      if (idx > 0) {
        const prevWpBefore = m.color === 'w' ? cpToWinProb(results[idx-1].score) : (100 - cpToWinProb(results[idx-1].score));
        const prevWpAfter = m.color === 'w' ? cpToWinProb(results[idx].score) : (100 - cpToWinProb(results[idx].score));
        if (Math.max(0, prevWpBefore - prevWpAfter) > 20) isMissOp = true;
      }

      let classification = classifyMove(playerWpBefore, playerWpAfter, isBook, isMate, isAbsoluteBest, isMissOp);

      counts[m.color][classification]++;
      if (!isBook) {
        if (m.color === 'w') { wAccSum += accuracy; wMoves++; }
        if (m.color === 'b') { bAccSum += accuracy; bMoves++; }
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
      wAcc: finalWAcc.toFixed(1),
      bAcc: finalBAcc.toFixed(1),
      wElo: estimateRating(finalWAcc),
      bElo: estimateRating(finalBAcc),
      counts
    });

    setReviewMoves(finalizedMoves);
    setIsAnalyzing(false);
    batchRef.current.isActive = false;
    setCurrentReviewIndex(0);
    setGame(new Chess(finalizedMoves[0].fenAfter));
    speakMoRN(finalizedMoves[0].coachText);
  }

  function navigateReview(direction) {
    setIsViewingAlt(false);
    const newIdx = currentReviewIndex + direction;
    if (newIdx >= 0 && newIdx < reviewMoves.length) {
      setCurrentReviewIndex(newIdx);
      setGame(new Chess(reviewMoves[newIdx].fenAfter));
      speakMoRN(reviewMoves[newIdx].coachText);
    }
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
    window.speechSynthesis?.cancel();
  }

  // --------------------------------------------------------
  // Render Variables
  // --------------------------------------------------------
  const currentMove = currentReviewIndex >= 0 ? reviewMoves[currentReviewIndex] : null;
  
  let evalRaw = gameMode === 'review' && currentMove 
    ? (currentMove.color === 'w' ? currentMove.evalScore : -currentMove.evalScore)
    : rawScore;

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

  const currentTheme = BOARD_THEMES[boardTheme] || BOARD_THEMES.portugal;

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

        /* Logs / Settings */
        .log-text { color: #888; font-style: italic; font-size: 14px; }
        .setting-row { display: flex; flex-direction: column; gap: 8px; margin-bottom: 15px; }
        .setting-row label { font-weight: bold; color: #ccc; font-size: 14px; }
        .setting-row select, .setting-row input[type="range"] { padding: 10px; background: #333; border: 1px solid #555; color: #fff; border-radius: 6px; outline: none; }
        .action-btn { width: 100%; padding: 14px; background: #d32f2f; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; }
        .action-btn:hover { filter: brightness(1.1); }

        /* Review UI */
        .pgn-box { width: 100%; height: 150px; background: #121212; color: #fff; border: 1px solid #444; padding: 15px; border-radius: 6px; resize: none; font-family: monospace; box-sizing: border-box; }
        .coach-bubble { background: #2a2a2a; border-left: 4px solid #81b64c; border-radius: 6px; padding: 15px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.2); }
        .coach-title { font-weight: bold; color: #81b64c; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
        .class-icon { width: 20px; height: 20px; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; color: #fff; font-size: 11px; font-weight: bold; }
        
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
            <button className="menu-btn" style={{backgroundColor: gameMode === 'review' ? '#2196F3' : '#4a4a4a'}} onClick={() => resetToBase('review')}>Game Review Suite</button>
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
                animationDuration={250}
                boardOrientation={gameMode === 'review' && userColor === 'b' ? 'black' : 'white'}
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
                      <option value="green">Classic Green</option>
                      <option value="wood">Tournament Wood</option>
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

            {/* Review Mode */}
            {gameMode === 'review' && (
              <>
                <div className="panel-header" style={{color: '#2196F3'}}>Game Review Suite</div>
                <div className="panel-content">
                  
                  {reviewMoves.length === 0 && !isAnalyzing && (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '15px', height: '100%'}}>
                      <textarea className="pgn-box" placeholder="Paste PGN here..." value={pgnInput} onChange={e => setPgnInput(e.target.value)} />
                      <div style={{display: 'flex', gap: '10px'}}>
                        <button className="action-btn" style={{background: userColor === 'w' ? '#2196F3' : '#333'}} onClick={() => setUserColor('w')}>I played White</button>
                        <button className="action-btn" style={{background: userColor === 'b' ? '#2196F3' : '#333'}} onClick={() => setUserColor('b')}>I played Black</button>
                      </div>
                      <button className="action-btn" style={{background: '#4CAF50', marginTop: 'auto'}} onClick={startAnalysis}>Analyze Match</button>
                    </div>
                  )}

                  {isAnalyzing && (
                    <div style={{textAlign: 'center', margin: 'auto'}}>
                      <h3 style={{color: '#2196F3'}}>Deep Analysis Running</h3>
                      <p className="log-text">Stockfish is crunching the geometry...</p>
                      <div style={{width: '100%', height: '10px', background: '#333', borderRadius: '5px', marginTop: '20px', overflow: 'hidden'}}>
                        <div style={{width: `${progress}%`, height: '100%', background: '#2196F3', transition: 'width 0.2s'}} />
                      </div>
                    </div>
                  )}

                  {reviewMoves.length > 0 && currentMove && (
                    <>
                      <div className="coach-bubble" style={{borderColor: COLORS[currentMove.classification] || '#81b64c'}}>
                        <div className="coach-title" style={{color: COLORS[currentMove.classification] || '#81b64c'}}>
                          <span className="class-icon" style={{background: COLORS[currentMove.classification] || '#81b64c'}}>
                            {ICONS[currentMove.classification]}
                          </span>
                          {currentMove.san} is {currentMove.classification}
                        </div>
                        <p style={{margin: 0, fontSize: '14px', lineHeight: '1.5', color: '#ddd'}}>{currentMove.coachText}</p>
                      </div>

                      <div className="review-nav">
                        <button className="nav-arrow" disabled={currentReviewIndex <= 0} onClick={() => navigateReview(-1)}>← Prev</button>
                        <button className="nav-arrow" disabled={currentReviewIndex >= reviewMoves.length - 1} onClick={() => navigateReview(1)}>Next →</button>
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
