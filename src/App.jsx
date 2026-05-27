import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

// ==========================================
// CONSTANTS, THEMES & ICONS
// ==========================================
const PIECE_NAMES = { p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King' };

const COLORS = {
  Brilliant: "#1baca1", Great: "#5c8bb0", Best: "#81b64c", Excellent: "#96bc4b",
  Good: "#96bc4b", Book: "#a5a5a5", Inaccuracy: "#f0c15c", Mistake: "#e58f2a",
  Blunder: "#ca3431", Miss: "#ff7769", Default: "#312e2b",
  White: "#ffffff", Black: "#000000"
};

const ICONS = {
  Brilliant: "!!", Great: "!", Best: "★", Excellent: "👍",
  Good: "✓", Book: "📖", Inaccuracy: "?!", Mistake: "?",
  Blunder: "??", Miss: "✖"
};

// ==========================================
// CAPS2 WIN PROBABILITY ALGORITHM
// ==========================================
// Converts Centipawns (from White's perspective) to Expected Win Percentage for White
function cpToWinProb(cp) {
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

// Calculates 0-100 Accuracy based on Win Prob difference
function calculateAccuracy(wpBefore, wpAfter) {
  const diff = Math.max(0, wpBefore - wpAfter);
  let accuracy = 103.1668 * Math.exp(-0.04354 * diff) - 3.1669;
  return Math.max(0, Math.min(100, accuracy));
}

// Classify move based on Win Probability Loss
function classifyMove(wpBefore, wpAfter, isBook, isMate) {
  if (isMate) return "Best"; // Mates are best
  if (isBook) return "Book";
  
  const loss = Math.max(0, wpBefore - wpAfter);

  if (loss <= 2) return "Best";
  if (loss <= 5) return "Excellent";
  if (loss <= 10) return "Good";
  if (loss <= 20) return "Inaccuracy";
  if (loss <= 30) return "Mistake";
  return "Blunder"; // Miss logic is handled in the post-processing
}

// Calculate Estimated Rating based on accuracy
function estimateRating(accuracy) {
  if (accuracy >= 99) return 2800;
  if (accuracy >= 95) return 2400;
  if (accuracy >= 90) return 2000;
  if (accuracy >= 80) return 1500;
  if (accuracy >= 70) return 1100;
  if (accuracy >= 60) return 800;
  if (accuracy >= 50) return 600;
  return 400;
}

// ==========================================
// SASSY COACH TEMPLATES
// ==========================================
const getCoachText = (classification, piece, san, isYou, alt) => {
  const actor = isYou ? "You" : "Your opponent";
  const pos = isYou ? "your" : "their";
  
  if (classification === "Blunder") return `${san} is a blunder. ${actor} permitted a massive advantage. ${alt ? `The best option was ${alt}.` : ''}`;
  if (classification === "Mistake") return `${san} is a mistake. This surrenders positional control. ${alt ? `${actor} had an opportunity to play ${alt}.` : ''}`;
  if (classification === "Inaccuracy") return `${san} is an inaccuracy. ${alt ? `${actor} best option was ${alt}.` : 'There was a sharper continuation.'}`;
  if (classification === "Miss") return `${san} is a miss. ${actor} missed a tactical sequence that would have won material.`;
  if (classification === "Good") return `${san} is good. A solid, playable move that maintains the balance.`;
  if (classification === "Excellent") return `${san} is excellent. ${actor} found a great square for ${pos} piece.`;
  if (classification === "Best") return `${san} is best. This keeps an eye on the position while staying active.`;
  if (classification === "Great") return `${san} is a great move. ${actor} found a powerful tactical continuation.`;
  if (classification === "Book") return `${san} is a book move. A fundamental opening move.`;
  return `${san} was played.`;
};

// ==========================================
// MAIN APP COMPONENT
// ==========================================
export default function App() {
  const [game, setGame] = useState(new Chess());
  const [engine, setEngine] = useState(null);
  
  // States
  const [gameMode, setGameMode] = useState('input'); // input, review, summary
  const [pgnInput, setPgnInput] = useState('');
  const [userColor, setUserColor] = useState('w'); // 'w' or 'b'
  
  const [reviewMoves, setReviewMoves] = useState([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(-1);
  const [isViewingAlt, setIsViewingAlt] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summaryData, setSummaryData] = useState(null);
  
  const batchRef = useRef({ isActive: false, queue: [], results: [], currentScore: 0, currentMate: null, parsedReview: [] });

  // Init Engine
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
                worker.postMessage('go movetime 150'); // Balanced for speed and depth
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
      setGameMode('summary'); // Switch to summary view while analyzing to show progress
      
      engine.postMessage(`position fen ${fenList[0]}`);
      engine.postMessage('go movetime 150');
    } catch(err) { alert("Invalid PGN."); }
  }

  function finishBatchAnalysis() {
    const { parsedReview, results } = batchRef.current;
    
    let wAccSum = 0, bAccSum = 0, wMoves = 0, bMoves = 0;
    const counts = { w: { Brilliant:0, Great:0, Best:0, Excellent:0, Good:0, Inaccuracy:0, Mistake:0, Miss:0, Blunder:0, Book:0 }, b: { Brilliant:0, Great:0, Best:0, Excellent:0, Good:0, Inaccuracy:0, Mistake:0, Miss:0, Blunder:0, Book:0 } };

    const finalizedMoves = parsedReview.map((m, idx) => {
      const beforeData = results[idx] || {score: 0, mate: null, bestMove: ''};
      const afterData = results[idx + 1] || {score: 0, mate: null, bestMove: ''};

      // Normalize scores to White's perspective
      const isWhiteTurnBefore = (idx % 2 === 0);
      let scoreBeforeW = isWhiteTurnBefore ? beforeData.score : -beforeData.score;
      let scoreAfterW = !isWhiteTurnBefore ? afterData.score : -afterData.score;

      const wpBefore = cpToWinProb(scoreBeforeW);
      const wpAfter = cpToWinProb(scoreAfterW);
      
      // Calculate loss from the perspective of the player who just moved
      const playerWpBefore = m.color === 'w' ? wpBefore : (100 - wpBefore);
      const playerWpAfter = m.color === 'w' ? wpAfter : (100 - wpAfter);
      
      const accuracy = calculateAccuracy(playerWpBefore, playerWpAfter);
      const isBook = idx < 10 && (playerWpBefore - playerWpAfter) < 2;
      const isMate = m.san.includes('#');

      let classification = classifyMove(playerWpBefore, playerWpAfter, isBook, isMate);

      // Miss Logic (If opponent blundered previously, and player failed to capitalize)
      if (idx > 0 && classification === "Blunder") {
        const prevMove = parsedReview[idx-1];
        // Simplified Miss heuristic
        if (prevMove && prevMove.san) classification = "Miss";
      }

      counts[m.color][classification]++;
      if (m.color === 'w' && !isBook) { wAccSum += accuracy; wMoves++; }
      if (m.color === 'b' && !isBook) { bAccSum += accuracy; bMoves++; }

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
  }

  function navigateReview(direction) {
    if (direction === 'start') setCurrentReviewIndex(-1);
    else if (direction === 'end') setCurrentReviewIndex(reviewMoves.length - 1);
    else {
      const newIdx = currentReviewIndex + direction;
      if (newIdx >= -1 && newIdx < reviewMoves.length) setCurrentReviewIndex(newIdx);
    }
    setIsViewingAlt(false);
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
    if (move) {
      setGame(new Chess(move.fenAfter));
      setIsViewingAlt(false);
    }
  }

  // ==========================================
  // RENDER HELPERS
  // ==========================================
  const currentMove = currentReviewIndex >= 0 ? reviewMoves[currentReviewIndex] : null;
  const currentFen = isViewingAlt ? game.fen() : (currentMove ? currentMove.fenAfter : "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  
  // Format Eval String (Always from White's perspective on the bar like chess.com)
  let evalString = "0.00";
  let evalRaw = 0; // positive is white advantage
  if (currentMove) {
    if (currentMove.evalMate) {
      evalString = `M${Math.abs(currentMove.evalMate)}`;
      evalRaw = currentMove.evalMate > 0 ? 1000 : -1000;
    } else {
      evalRaw = currentMove.evalScore;
      evalString = `${evalRaw > 0 ? '+' : ''}${(evalRaw / 100).toFixed(2)}`;
    }
  }

  const evalHeight = useMemo(() => {
    const clamped = Math.max(-500, Math.min(500, evalRaw));
    return `${((clamped + 500) / 1000) * 100}%`;
  }, [evalRaw]);

  const activeSquareStyles = useMemo(() => {
    let styles = {};
    if (currentMove && !isViewingAlt) {
      styles[currentMove.from] = { backgroundColor: 'rgba(255, 255, 0, 0.4)' }; 
      styles[currentMove.to] = { backgroundColor: 'rgba(255, 255, 0, 0.6)' };  
    }
    return styles;
  }, [currentMove, isViewingAlt]);

  const activeArrows = useMemo(() => {
    if (isViewingAlt) return []; 
    if (currentMove && currentMove.bestMoveLAN && ["Blunder", "Mistake", "Inaccuracy", "Miss"].includes(currentMove.classification)) {
      return [
        [currentMove.from, currentMove.to, "rgba(202, 52, 49, 0.8)"], 
        [currentMove.bestMoveLAN.substring(0, 2), currentMove.bestMoveLAN.substring(2, 4), "rgba(129, 182, 76, 0.8)"]
      ];
    }
    return [];
  }, [currentMove, isViewingAlt]);

  // View Variables
  const myColor = userColor === 'w' ? 'White' : 'Black';
  const oppColor = userColor === 'w' ? 'Black' : 'White';
  const myName = "MoRN07";
  const oppName = "Opponent";

  return (
    <>
      <style>{`
        body { margin: 0; padding: 0; background-color: #312e2b; color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; overflow: hidden; }
        .layout { display: flex; height: 100vh; width: 100vw; justify-content: center; }
        
        /* LEFT: BOARD AREA */
        .left-col { flex: 1; display: flex; align-items: center; justify-content: center; padding: 20px; gap: 15px; max-width: 800px; }
        .eval-bar { width: 25px; height: clamp(400px, 80vh, 700px); background: #403d39; border-radius: 4px; display: flex; flex-direction: column; overflow: hidden; position: relative; border: 2px solid #262421; }
        .eval-fill { background: #fff; width: 100%; position: absolute; bottom: 0; transition: height 0.4s ease; }
        .eval-txt { position: absolute; width: 100%; text-align: center; font-size: 10px; font-weight: bold; z-index: 10; padding: 4px 0; }
        .board-wrapper { width: 100%; max-width: clamp(400px, 80vh, 700px); display: flex; flex-direction: column; gap: 10px; }
        
        .player-bar { display: flex; justify-content: space-between; align-items: center; background: #262421; padding: 8px 12px; border-radius: 4px; }
        .player-info { display: flex; align-items: center; gap: 10px; font-weight: bold; font-size: 14px; }
        .avatar { width: 32px; height: 32px; background: #403d39; border-radius: 4px; background-size: cover; }
        .rating-badge { font-size: 12px; color: #a59f97; font-weight: normal; }

        /* RIGHT: REVIEW PANEL */
        .right-col { width: 450px; background: #262421; display: flex; flex-direction: column; height: 100%; border-left: 1px solid #403d39; }
        
        .tab-header { display: flex; padding: 15px 20px; border-bottom: 1px solid #403d39; background: #1e1e1e; font-weight: bold; align-items: center; justify-content: space-between; }
        .tab-header span { display: flex; gap: 10px; color: #a59f97; cursor: pointer; }

        /* Input Screen */
        .setup-screen { padding: 30px; display: flex; flex-direction: column; gap: 20px; height: 100%; justify-content: center; }
        .setup-screen textarea { height: 150px; background: #1e1e1e; color: #fff; border: 1px solid #403d39; padding: 15px; border-radius: 8px; font-family: monospace; resize: none; }
        .color-selector { display: flex; gap: 10px; }
        .color-btn { flex: 1; padding: 15px; background: #312e2b; border: 2px solid #403d39; color: #fff; font-weight: bold; border-radius: 8px; cursor: pointer; }
        .color-btn.active { border-color: #81b64c; background: #403d39; }
        .start-btn { padding: 15px; background: #81b64c; color: #fff; border: none; border-radius: 8px; font-weight: bold; font-size: 16px; cursor: pointer; }
        .start-btn:hover { background: #96bc4b; }

        /* Summary Screen */
        .summary-screen { padding: 20px; overflow-y: auto; flex: 1; }
        .coach-card { background: #312e2b; padding: 15px; border-radius: 8px; display: flex; gap: 15px; align-items: center; margin-bottom: 20px; }
        .coach-face { width: 48px; height: 48px; background: url('https://www.chess.com/bundles/web/images/coach/coach-anya.png') center/cover; border-radius: 50%; }
        .coach-text { background: #fff; color: #333; padding: 10px 15px; border-radius: 8px; font-size: 14px; position: relative; flex: 1; font-weight: 500; }
        
        .acc-grid { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px solid #403d39; padding-bottom: 20px; }
        .acc-col { text-align: center; flex: 1; }
        .acc-box { font-size: 24px; font-weight: bold; background: #fff; color: #333; padding: 8px; border-radius: 6px; margin-top: 8px; display: inline-block; min-width: 60px; }
        .stat-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #312e2b; font-size: 14px; }
        .stat-badge { display: flex; align-items: center; gap: 6px; width: 100px; justify-content: center; }
        .stat-icon { width: 18px; height: 18px; border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; }

        /* Review Mode */
        .review-coach { padding: 20px; background: #262421; display: flex; gap: 15px; align-items: flex-start; }
        .review-bubble { background: #fff; color: #333; padding: 15px; border-radius: 12px; border-top-left-radius: 0; flex: 1; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .bubble-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-weight: bold; }
        .eval-pill { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 12px; color: #666; }
        
        .action-bar { padding: 0 20px 15px; display: flex; gap: 10px; }
        .action-btn { flex: 1; padding: 12px; border-radius: 6px; border: none; font-weight: bold; cursor: pointer; }
        .btn-share { background: #e0e0e0; color: #333; }
        .btn-next { background: #81b64c; color: #fff; }

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
      `}</style>

      <div className="layout">
        
        {/* LEFT PANEL */}
        <div className="left-col">
          <div className="eval-bar">
            <div className="eval-txt" style={{ top: 0, color: evalRaw < 0 ? '#fff' : '#888' }}>
              {evalRaw < 0 ? evalString : ''}
            </div>
            <div className="eval-fill" style={{ height: evalHeight }} />
            <div className="eval-txt" style={{ bottom: 0, color: evalRaw > 0 ? '#333' : '#888' }}>
              {evalRaw > 0 ? evalString : ''}
            </div>
          </div>

          <div className="board-wrapper">
            <div className="player-bar">
              <div className="player-info">
                <div className="avatar"></div>
                <span>{oppName} <span className="rating-badge">(?)</span></span>
              </div>
            </div>

            <Chessboard
              position={currentFen}
              customSquareStyles={activeSquareStyles}
              showBoardNotation={true}
              customDarkSquareStyle={{ backgroundColor: "#b58863" }}
              customLightSquareStyle={{ backgroundColor: "#f0d9b5" }}
              customArrows={activeArrows.map(arr => [arr[0], arr[1]])}
              customArrowColor={activeArrows.length > 0 ? activeArrows[0][2] : "rgba(129, 182, 76, 0.8)"}
              animationDuration={isViewingAlt ? 0 : 250}
              boardOrientation={userColor === 'w' ? 'white' : 'black'}
            />

            <div className="player-bar">
              <div className="player-info">
                <div className="avatar" style={{backgroundImage: "url('https://images.chesscomfiles.com/uploads/v1/user/326880000.3fa6db7f.160x160o.22304859846b.png')"}}></div>
                <span>{myName} <span className="rating-badge">(?)</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="right-col">
          <div className="tab-header">
            <span onClick={() => setGameMode('input')}>←</span>
            <span>★ Game Review</span>
            <span>🔊 ⚙</span>
          </div>

          {gameMode === 'input' && (
            <div className="setup-screen">
              <h2 style={{margin: 0, textAlign: 'center'}}>Analyze Game</h2>
              <textarea placeholder="Paste PGN here..." value={pgnInput} onChange={e => setPgnInput(e.target.value)} />
              
              <div className="color-selector">
                <button className={`color-btn ${userColor === 'w' ? 'active' : ''}`} onClick={() => setUserColor('w')}>Play as White</button>
                <button className={`color-btn ${userColor === 'b' ? 'active' : ''}`} onClick={() => setUserColor('b')}>Play as Black</button>
              </div>

              <button className="start-btn" onClick={startAnalysis}>Run Review</button>
            </div>
          )}

          {gameMode === 'summary' && isAnalyzing && (
            <div className="setup-screen" style={{textAlign: 'center'}}>
              <h2>Deep Analysis Running</h2>
              <p style={{color: '#a59f97'}}>Evaluating the entire game sequentially...</p>
              <div style={{width: '100%', height: '8px', background: '#403d39', borderRadius: '4px', overflow: 'hidden'}}>
                <div style={{width: `${progress}%`, height: '100%', background: '#81b64c', transition: 'width 0.2s'}} />
              </div>
              <p style={{fontSize: '12px', color: '#888', marginTop: '10px'}}>{Math.round(progress)}% Complete</p>
            </div>
          )}

          {gameMode === 'summary' && summaryData && !isAnalyzing && (
            <div className="summary-screen">
              <div className="coach-card">
                <div className="coach-face"></div>
                <div className="coach-text">You had a nice tactical find in this game. Let's review!</div>
              </div>
              
              <div className="acc-grid">
                <div className="acc-col">
                  <div style={{color: '#a59f97', fontSize: '13px'}}>{userColor === 'w' ? myName : oppName} (White)</div>
                  <div className="acc-box">{summaryData.wAcc}</div>
                </div>
                <div className="acc-col">
                  <div style={{color: '#a59f97', fontSize: '13px'}}>{userColor === 'b' ? myName : oppName} (Black)</div>
                  <div className="acc-box" style={{background: '#333', color: '#fff'}}>{summaryData.bAcc}</div>
                </div>
              </div>

              {["Brilliant", "Great", "Best", "Excellent", "Good", "Inaccuracy", "Mistake", "Miss", "Blunder", "Book"].map(type => {
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
              
              <button className="start-btn" style={{width: '100%', marginTop: '30px'}} onClick={() => { setGameMode('review'); setCurrentReviewIndex(0); setGame(new Chess(reviewMoves[0].fenAfter)); }}>
                Start Review
              </button>
            </div>
          )}

          {gameMode === 'review' && (
            <>
              {/* Coach Top Section */}
              <div className="review-coach">
                <div className="coach-face"></div>
                <div className="review-bubble">
                  <div className="bubble-header">
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                      <span className="stat-icon" style={{backgroundColor: COLORS[currentMove?.classification] || COLORS.Good}}>
                        {ICONS[currentMove?.classification] || '✓'}
                      </span>
                      {isViewingAlt ? "Engine Alternative" : `${currentMove?.san} is ${currentMove?.classification?.toLowerCase()}`}
                    </div>
                    <div className="eval-pill">{evalString}</div>
                  </div>
                  <div>{currentMove?.coachText}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="action-bar">
                {(!isViewingAlt && ["Blunder", "Mistake", "Inaccuracy", "Miss"].includes(currentMove?.classification) && currentMove?.bestMoveLAN) ? (
                  <>
                    <button className="action-btn btn-share" onClick={showAlternativeLine}>🔍 Best Move</button>
                    <button className="action-btn btn-next" onClick={() => navigateReview(1)}>Next ➔</button>
                  </>
                ) : isViewingAlt ? (
                  <button className="action-btn btn-next" style={{width: '100%'}} onClick={resetToCurrentReviewMove}>↩ Resume</button>
                ) : (
                  <>
                    <button className="action-btn btn-share">Share</button>
                    <button className="action-btn btn-next" onClick={() => navigateReview(1)}>Next ➔</button>
                  </>
                )}
              </div>

              {/* Move List Table */}
              <div className="move-list">
                {Array.from({ length: Math.ceil(reviewMoves.length / 2) }).map((_, i) => {
                  const wMove = reviewMoves[i * 2];
                  const bMove = reviewMoves[i * 2 + 1];
                  return (
                    <div className="move-row" key={i}>
                      <div className="move-num">{i + 1}.</div>
                      
                      <div className={`move-cell ${currentReviewIndex === i * 2 ? 'active' : ''}`} onClick={() => navigateReview((i * 2) - currentReviewIndex)}>
                        {wMove.classification && <div className="stat-icon inline-icon" style={{backgroundColor: COLORS[wMove.classification]}}>{ICONS[wMove.classification]}</div>}
                        {wMove.san}
                      </div>

                      {bMove ? (
                        <div className={`move-cell ${currentReviewIndex === i * 2 + 1 ? 'active' : ''}`} onClick={() => navigateReview((i * 2 + 1) - currentReviewIndex)}>
                          {bMove.classification && <div className="stat-icon inline-icon" style={{backgroundColor: COLORS[bMove.classification]}}>{ICONS[bMove.classification]}</div>}
                          {bMove.san}
                        </div>
                      ) : <div className="move-cell"></div>}
                    </div>
                  );
                })}
              </div>

              {/* Evaluation Graph SVG */}
              <div className="graph-area">
                <svg width="100%" height="100%" preserveAspectRatio="none">
                  <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#555" strokeWidth="1" />
                  {reviewMoves.length > 0 && (
                    <>
                      <path 
                        className="fill"
                        d={`M 0,30 ${reviewMoves.map((m, i) => {
                          const x = ((i + 1) / reviewMoves.length) * 100;
                          const cp = m.evalScore; // Graph absolute white advantage
                          const clamped = Math.max(-500, Math.min(500, cp));
                          const y = 30 - (clamped / 500) * 30;
                          return `L ${x}%,${y}`;
                        }).join(' ')} L 100%,30 Z`}
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

              {/* Bottom Navigation */}
              <div className="nav-bar">
                <button className="nav-btn" onClick={() => navigateReview('start')}>|❮</button>
                <button className="nav-btn" disabled={currentReviewIndex <= -1} onClick={() => navigateReview(-1)}>❮</button>
                <button className="nav-btn nav-play">Start Review</button>
                <button className="nav-btn" disabled={currentReviewIndex >= reviewMoves.length - 1} onClick={() => navigateReview(1)}>❯</button>
                <button className="nav-btn" onClick={() => navigateReview('end')}>❯|</button>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
}
