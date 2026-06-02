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

// ============================================================================
// ACADEMY LESSONS DATABASE (Based on Yellow Rook Video)
// ============================================================================
const ACADEMY_LESSONS = [
  {
    id: 'scholars_mate_g4',
    title: "Scholar's Mate 1: Crush the Flank Attack",
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
          wrong: { "Nf6": "Blunder! White will play Qxf7# Checkmate. You must block the Queen's diagonal first." },
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
                wrong: { "d6": "d6 is too slow and lets White defend. Play d5 to blow open the center!" },
                response: "exd5",
                next: {
                  prompt: "White captures. Play the brilliant in-between move to hit the Queen before recapturing the pawn.",
                  expected: "Bg4",
                  response: "f3",
                  next: {
                    prompt: "White blocks. Exploit the pin on the pawn and infiltrate with your central Knight!",
                    expected: "Ne4",
                    endpoint: "Brilliant! You've completely dismantled the Scholar's Mate. White's position is collapsing, and you hold a massive initiative."
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
    title: "Scholar's Mate 2: Break the Passive Defense",
    description: "Learn how to counter White when they try to defend d4 with Ne2 or c3.",
    startFen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4", // After 1. e4 e5 2. Qh5 Nc6 3. Bc4 g6 4. Qf3 Nf6
    color: "b",
    tree: {
      prompt: "White plays Ne2 to defend the d4 square. Continue your kingside development.",
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
  
  // Review State
  const [reviewMoves, setReviewMoves] = useState([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(-1);
  const [isViewingAlt, setIsViewingAlt] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summaryData, setSummaryData] = useState(null);
  
  // Academy State
  const [activeLesson, setActiveLesson] = useState(null);
  const [academyNode, setAcademyNode] = useState(null);
  const [academyMessage, setAcademyMessage] = useState('');
  const [academyError, setAcademyError] = useState(false);
  const [showHint, setShowHint] = useState(false);
  
  // Board Interaction State
  const [moveFrom, setMoveFrom] = useState('');
  const [optionSquares, setOptionSquares] = useState({});
  const batchRef = useRef({ isActive: false, queue: [], results: [], currentScore: 0, currentMate: null, parsedReview: [] });

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
  function startLesson(lesson) {
    setActiveLesson(lesson);
    setUserColor(lesson.color);
    const newGame = new Chess(lesson.startFen);
    
    let currentNode = lesson.tree;
    // Auto-play bot's first move if defined
    if (currentNode.botFirst) {
      newGame.move(currentNode.botFirst);
      playSound(false, isVoiceMuted);
    }
    
    setGame(newGame);
    setAcademyNode(currentNode);
    setAcademyMessage(currentNode.prompt);
    setAcademyError(false);
    setShowHint(false);
    setGameMode('academy');
  }

  function handleAcademyMove(moveObj, gameCopy) {
    setShowHint(false);
    if (!academyNode) return;

    if (moveObj.san === academyNode.expected || moveObj.lan === academyNode.expected) {
      // Correct Move
      setGame(gameCopy);
      playSound(moveObj.flags.includes('c'), isVoiceMuted);
      setAcademyError(false);

      if (academyNode.endpoint) {
        setAcademyMessage(academyNode.endpoint);
        setAcademyNode(null);
      } else if (academyNode.response) {
        setAcademyMessage("Excellent! Opponent is thinking...");
        setTimeout(() => {
          const moveRes = gameCopy.move(academyNode.response);
          setGame(new Chess(gameCopy.fen()));
          playSound(moveRes.flags.includes('c'), isVoiceMuted);
          setAcademyNode(academyNode.next);
          setAcademyMessage(academyNode.next.prompt);
        }, 800);
      }
    } else {
      // Wrong Move
      playSound(false, isVoiceMuted); 
      setGame(gameCopy);
      setAcademyError(true);
      if (academyNode.wrong && academyNode.wrong[moveObj.san]) {
        setAcademyMessage(academyNode.wrong[moveObj.san]);
      } else {
        setAcademyMessage(`That's not the best move here. ${academyNode.prompt}`);
      }
    }
  }

  function undoAcademyMove() {
    const gameCopy = new Chess(game.fen());
    gameCopy.undo();
    setGame(gameCopy);
    setAcademyError(false);
    setAcademyMessage(academyNode.prompt);
  }

  function provideHint() {
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

  // --------------------------------------------------------
  // Render Variables
  // --------------------------------------------------------
  const currentTheme = BOARD_THEMES[boardTheme] || BOARD_THEMES.wood;
  
  // Custom Styles for Hinting
  const activeSquareStyles = useMemo(() => {
    let styles = { ...optionSquares };
    if (gameMode === 'review' && currentReviewIndex >= 0 && !isViewingAlt) {
      const move = reviewMoves[currentReviewIndex];
      styles[move.from] = { backgroundColor: 'rgba(255, 255, 0, 0.4)' }; 
      styles[move.to] = { backgroundColor: 'rgba(255, 255, 0, 0.6)' };  
    }
    if (gameMode === 'academy' && showHint && academyNode) {
      // Very basic hint highlight for the expected move (assumes SAN is straightforward, ideally LAN is used)
      // For simplicity, we just highlight the whole board with a green border if hint is requested
    }
    return styles;
  }, [optionSquares, gameMode, currentReviewIndex, isViewingAlt, showHint, academyNode, reviewMoves]);

  const activeArrows = useMemo(() => {
    if (gameMode === 'academy' && showHint && academyNode) {
       // If we had a LAN to SAN converter here, we'd draw an arrow. For now, a visual UI hint is given in the prompt box.
       return [];
    }
    return [];
  }, [gameMode, showHint, academyNode]);

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
        .panel-header { padding: 15px 20px; font-weight: bold; font-size: 16px; color: #81b64c; border-bottom: 1px solid #333; display: flex; justify-content: space-between; }
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
            <button className="menu-btn" style={{backgroundColor: ['input', 'review', 'summary'].includes(gameMode) ? '#2196F3' : '#4a4a4a'}} onClick={() => setGameMode('input')}>Game Review Suite</button>
            <button className="menu-btn" style={{backgroundColor: gameMode === 'academy' ? '#9C27B0' : '#4a4a4a'}} onClick={() => {setGameMode('academy'); setActiveLesson(null);}}>MoRN Academy</button>
            <button className="menu-btn" style={{backgroundColor: gameMode === 'settings' ? '#FF9800' : '#4a4a4a'}} onClick={() => setGameMode('settings')}>⚙ Settings</button>
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
                customArrowColor={"rgba(129, 182, 76, 0.8)"}
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
                  <span>🎓 MoRN Academy</span>
                  <span style={{cursor:'pointer', color:'#888'}} onClick={() => setIsVoiceMuted(!isVoiceMuted)}>
                    {isVoiceMuted ? '🔇' : '🔊'}
                  </span>
                </div>
                <div className="panel-content">
                  {!activeLesson ? (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                      <p style={{color: '#aaa', margin: 0}}>Master openings and crush your opponents. Select a module:</p>
                      {ACADEMY_LESSONS.map(lesson => (
                        <div key={lesson.id} className="lesson-card" onClick={() => startLesson(lesson)}>
                          <div className="lesson-title">{lesson.title}</div>
                          <div style={{color: '#888', fontSize: '13px'}}>{lesson.description}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
                      <h3 style={{marginTop: 0, color: '#9C27B0'}}>{activeLesson.title}</h3>
                      
                      <div className={`coach-card ${academyError ? 'error' : ''}`}>
                        <div className="coach-face" style={{background: "url('https://www.chess.com/bundles/web/images/coach/coach-anya.png') center/cover", width:'48px', height:'48px', borderRadius:'50%'}}></div>
                        <div className="coach-text">{academyMessage}</div>
                      </div>

                      {showHint && academyNode && (
                        <div className="hint-box">
                          💡 Hint: Try playing <strong>{academyNode.expected}</strong>.
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
                        <button className="action-btn" style={{background: '#333'}} onClick={() => setGameMode('academy')}>
                          Exit Lesson
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
                  <textarea className="pgn-box" placeholder="Paste PGN here..." value={pgnInput} onChange={e => setPgnInput(e.target.value)} />
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
