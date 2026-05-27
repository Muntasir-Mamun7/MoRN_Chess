import { useState, useEffect, useMemo, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

// ==========================================
// CONSTANTS & HELPERS
// ==========================================
const PIECE_NAMES = { p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King' };
const CLASSIFICATION_COLORS = {
  "Brilliant": "#1baca1", "Great": "#5c8bb0", "Best": "#81b64c", "Excellent": "#96bc4b",
  "Good": "#96bc4b", "Book": "#a5a5a5", "Inaccuracy": "#f0c15c", "Mistake": "#e58f2a",
  "Blunder": "#ca3431", "Miss": "#ff7769"
};
const CLASSIFICATION_ICONS = {
  "Brilliant": "!!", "Great": "!", "Best": "★", "Excellent": "👍",
  "Good": "✓", "Book": "📖", "Inaccuracy": "?!", "Mistake": "?",
  "Blunder": "??", "Miss": "✖"
};

// Accuracy Calculation (Win Probability Model)
function cpToWinProb(cp) {
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}
function calculateAccuracy(winProbBefore, winProbAfter) {
  const diff = winProbBefore - winProbAfter;
  const accuracy = 103.1668 * Math.exp(-0.04354 * (diff * 100)) - 3.1669;
  return Math.max(0, Math.min(100, accuracy));
}

export default function App() {
  const [game, setGame] = useState(new Chess());
  const [engine, setEngine] = useState(null);
  
  const [gameMode, setGameMode] = useState('computer'); // 'computer', 'review', 'summary'
  const [history, setHistory] = useState([]);
  
  // Review State
  const [pgnInput, setPgnInput] = useState('');
  const [reviewMoves, setReviewMoves] = useState([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(-1);
  const [isViewingAlt, setIsViewingAlt] = useState(false);
  const [isFullGameAnalyzing, setIsFullGameAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  
  // Summary Data
  const [summaryData, setSummaryData] = useState(null);

  const batchRef = useRef({ isActive: false, queue: [], results: [], currentScore: 0, currentMate: null, parsedReview: [] });

  // ==========================================
  // ENGINE INITIALIZATION
  // ==========================================
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
                bestMove: moveLAN && moveLAN !== '(none)' ? moveLAN : ''
              });

              const completed = batchRef.current.results.length;
              const total = batchRef.current.queue.length;
              setAnalysisProgress((completed / total) * 100);

              if (completed < total) {
                worker.postMessage(`position fen ${batchRef.current.queue[completed]}`);
                worker.postMessage('go movetime 100'); // Ultra-fast single pass
              } else {
                finishBatchAnalysis();
              }
            } else if (gameMode === 'computer' && moveLAN && moveLAN !== '(none)') {
              // Standard AI play
              const from = moveLAN.substring(0, 2);
              const to = moveLAN.substring(2, 4);
              if (game.turn() === 'b' && !game.isGameOver()) {
                setGame(curr => {
                  const c = new Chess(curr.fen());
                  try { c.move({ from, to, promotion: 'q' }); setHistory(c.history({ verbose: true })); return c; } 
                  catch(err) { return curr; }
                });
              }
            }
          }
        };
        worker.postMessage('uci');
        setEngine(worker);
      });
    return () => engine?.terminate();
  }, [gameMode, game]);

  // ==========================================
  // ANALYSIS & SUMMARY GENERATION
  // ==========================================
  function importPgn() {
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
        return { ...m, fenBefore, fenAfter, classification: null };
      });

      const fenList = ["rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", ...parsedReview.map(m => m.fenAfter)];
      
      batchRef.current = { isActive: true, queue: fenList, results: [], currentScore: 0, currentMate: null, parsedReview };
      setIsFullGameAnalyzing(true);
      setAnalysisProgress(0);
      setGameMode('review');
      
      engine.postMessage(`position fen ${fenList[0]}`);
      engine.postMessage('go movetime 100');
    } catch(err) { alert("Invalid PGN format."); }
  }

  function finishBatchAnalysis() {
    const { parsedReview, results } = batchRef.current;
    const finalResults = results.length >= parsedReview.length + 1 ? results : [...results, ...Array(parsedReview.length + 1 - results.length).fill({score: 0, mate: null, bestMove: ''})];

    let wAccSum = 0, bAccSum = 0, wMoves = 0, bMoves = 0;
    const counts = { w: { Best:0, Great:0, Good:0, Inaccuracy:0, Mistake:0, Blunder:0, Book:0 }, b: { Best:0, Great:0, Good:0, Inaccuracy:0, Mistake:0, Blunder:0, Book:0 } };

    const finalizedMoves = parsedReview.map((m, idx) => {
      const beforeData = finalResults[idx];
      const afterData = finalResults[idx + 1];

      let scoreBefore = beforeData.score;
      let scoreAfter = -afterData.score; 

      const winProbBefore = cpToWinProb(scoreBefore);
      const winProbAfter = cpToWinProb(scoreAfter);
      let accuracy = calculateAccuracy(winProbBefore, winProbAfter);
      
      let classification = "Good";
      const delta = scoreAfter - scoreBefore;

      if (idx < 6 && delta > -100) classification = "Book";
      else if (delta <= -300) classification = "Blunder";
      else if (delta <= -100) classification = "Mistake";
      else if (delta <= -40) classification = "Inaccuracy";
      else if (m.lan === beforeData.bestMove || delta > -10) classification = "Best Move";
      else if (delta >= 50) classification = "Great";

      // Update Tally
      if (counts[m.color][classification] !== undefined) counts[m.color][classification]++;
      
      if (m.color === 'w') { wAccSum += accuracy; wMoves++; } 
      else { bAccSum += accuracy; bMoves++; }

      // Generate Smart Text
      const text = generateSmartText(m, classification, beforeData.bestMove, afterData.mate);

      return { 
        ...m, 
        classification, 
        bestMoveLAN: beforeData.bestMove, 
        evalScore: scoreAfter, 
        evalMate: afterData.mate,
        accuracy: accuracy.toFixed(1),
        coachText: text
      };
    });

    setSummaryData({
      wAcc: wMoves ? (wAccSum / wMoves).toFixed(1) : 0,
      bAcc: bMoves ? (bAccSum / bMoves).toFixed(1) : 0,
      counts
    });

    setReviewMoves(finalizedMoves);
    setIsFullGameAnalyzing(false);
    batchRef.current.isActive = false;
    setGameMode('summary'); // Show report card first
  }

  function generateSmartText(move, classification, bestMoveLAN, mateIn) {
    const isCapture = move.flags.includes('c');
    const isCheck = move.san.includes('+');
    
    if (classification === "Book") return "Standard opening theory. Developing pieces and fighting for the center.";
    if (classification === "Best Move" || classification === "Great") {
      if (isCapture) return `Capturing a hanging piece. This maximizes your advantage.`;
      if (isCheck) return `Putting the king under pressure and forcing the opponent's hand.`;
      return `This is the best move. It improves your position and keeps the tension high.`;
    }
    if (classification === "Good") return "A solid, playable move that maintains the balance.";
    
    // Negative evaluations
    let text = `You permitted the opponent an advantage.`;
    if (isCapture) text = `Capturing here was not the best idea.`;
    if (!isCapture && bestMoveLAN) {
      // Simulate "Missed capture" heuristic
      text = `You missed an opportunity to play a stronger tactical sequence.`;
    }
    
    if (classification === "Blunder") text += ` You gave away the game here.`;
    if (classification === "Mistake") text += ` This surrenders central control.`;
    
    return text;
  }

  // ==========================================
  // NAVIGATION & UI HANDLERS
  // ==========================================
  function navigateReview(direction) {
    setIsViewingAlt(false);
    const newIdx = currentReviewIndex + direction;
    if (newIdx >= 0 && newIdx < reviewMoves.length) {
      setCurrentReviewIndex(newIdx);
      setGame(new Chess(reviewMoves[newIdx].fenAfter));
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
    if (move) {
      setGame(new Chess(move.fenAfter));
      setIsViewingAlt(false);
    }
  }

  // ==========================================
  // RENDER HELPERS
  // ==========================================
  const activeSquareStyles = useMemo(() => {
    let styles = {};
    if (gameMode === 'review' && currentReviewIndex >= 0) {
      const move = reviewMoves[currentReviewIndex];
      const clr = CLASSIFICATION_COLORS[move?.classification] || "#96bc4b";
      if (!isViewingAlt) {
        styles[move.from] = { backgroundColor: 'rgba(255, 255, 0, 0.4)' }; 
        styles[move.to] = { backgroundColor: 'rgba(255, 255, 0, 0.6)' };  
      }
    }
    return styles;
  }, [gameMode, currentReviewIndex, reviewMoves, isViewingAlt]);

  const activeArrows = useMemo(() => {
    if (gameMode === 'review') {
       if (isViewingAlt) return []; 
       const currentMove = reviewMoves[currentReviewIndex];
       if (currentMove && currentMove.bestMoveLAN && ["Blunder", "Mistake", "Inaccuracy", "Miss"].includes(currentMove.classification)) {
         return [
           // Red arrow for the bad move played
           [currentMove.from, currentMove.to, "rgba(202, 52, 49, 0.8)"],
           // Green arrow for the recommended move
           [currentMove.bestMoveLAN.substring(0, 2), currentMove.bestMoveLAN.substring(2, 4), "rgba(129, 182, 76, 0.8)"]
         ];
       }
       return [];
    }
    return [];
  }, [gameMode, isViewingAlt, reviewMoves, currentReviewIndex]);

  const currentMoveData = reviewMoves[currentReviewIndex];
  const evalString = currentMoveData ? (currentMoveData.evalMate ? `M${Math.abs(currentMoveData.evalMate)}` : `${currentMoveData.evalScore > 0 ? '+' : ''}${(currentMoveData.evalScore / 100).toFixed(2)}`) : '0.00';
  const evalColor = currentMoveData && currentMoveData.evalScore < 0 ? '#000' : '#fff';
  const evalBg = currentMoveData && currentMoveData.evalScore < 0 ? '#fff' : '#333';

  return (
    <>
      <style>{`
        body { margin: 0; padding: 0; background-color: #312e2b; color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; flex-direction: column; min-height: 100vh; }
        .app-container { flex: 1; display: flex; flex-direction: column; align-items: center; max-width: 500px; margin: 0 auto; width: 100%; position: relative; }
        
        .top-eval-bar { width: 100%; height: 24px; background: #fff; display: flex; align-items: center; padding: 0 10px; box-sizing: border-box; font-weight: bold; font-size: 13px; color: #333; margin-bottom: 10px; }
        
        .coach-bubble-container { display: flex; gap: 10px; padding: 10px; background: #312e2b; width: 100%; box-sizing: border-box; align-items: flex-start; }
        .avatar { width: 50px; height: 50px; background: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; overflow: hidden; }
        .bubble { flex: 1; background: #fff; color: #333; padding: 12px 15px; border-radius: 12px; border-top-left-radius: 2px; position: relative; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        .bubble-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
        .classification-icon { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 4px; color: #fff; font-weight: bold; font-size: 12px; margin-right: 8px; }
        .eval-tag { background: #e5e5e5; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; color: #555; }
        
        .board-wrapper { width: 100%; max-width: 500px; }
        
        .bottom-nav { display: flex; width: 100%; background: #262421; padding: 15px; box-sizing: border-box; gap: 10px; align-items: center; justify-content: space-between; border-top: 1px solid #403d39; margin-top: auto; }
        .nav-btn { flex: 1; padding: 15px; background: #81b64c; color: #fff; font-weight: bold; font-size: 16px; border: none; border-radius: 8px; cursor: pointer; text-align: center; }
        .nav-btn:hover { background: #96bc4b; }
        .nav-icon { background: none; border: none; color: #a59f97; font-size: 24px; cursor: pointer; padding: 10px; }
        .nav-icon:hover { color: #fff; }

        .summary-card { background: #262421; width: 100%; max-width: 500px; border-radius: 8px; padding: 20px; box-sizing: border-box; margin-top: 20px; }
        .summary-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #403d39; padding-bottom: 15px; margin-bottom: 15px; }
        .player-col { text-align: center; flex: 1; }
        .acc-box { background: #fff; color: #333; font-size: 24px; font-weight: bold; padding: 10px; border-radius: 8px; margin-top: 10px; display: inline-block; min-width: 60px; }
        .stat-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #333; font-size: 14px; }
        .stat-icon { width: 16px; height: 16px; border-radius: 3px; display: inline-block; text-align: center; color: white; font-size: 10px; line-height: 16px; margin: 0 10px; }

        .loading-screen { text-align: center; padding: 50px 20px; }
        .progress-bar { width: 100%; height: 10px; background: #403d39; border-radius: 5px; margin-top: 20px; overflow: hidden; }
        .progress-fill { height: 100%; background: #81b64c; transition: width 0.2s; }
      `}</style>

      {/* TOP MENU */}
      <div style={{ display: 'flex', gap: '10px', padding: '15px', background: '#262421', width: '100%', boxSizing: 'border-box', justifyContent: 'center' }}>
        <button style={{padding:'8px 12px', borderRadius:'4px', background:'#4a4a4a', color:'white', border:'none'}} onClick={() => { setGameMode('computer'); setGame(new Chess()); setHistory([]); }}>Play AI</button>
        <button style={{padding:'8px 12px', borderRadius:'4px', background:'#81b64c', color:'white', border:'none'}} onClick={() => { setGameMode('input'); setReviewMoves([]); }}>Analyze PGN</button>
      </div>

      <div className="app-container">
        
        {/* MODE: PGN INPUT */}
        {gameMode === 'input' && (
          <div style={{ width: '100%', padding: '20px', boxSizing: 'border-box' }}>
            <h2>Game Review</h2>
            <textarea 
              style={{width: '100%', height: '200px', background: '#262421', color: '#fff', border: '1px solid #403d39', padding: '10px', borderRadius: '8px', marginBottom: '15px'}} 
              placeholder="Paste PGN here..." 
              value={pgnInput} 
              onChange={(e) => setPgnInput(e.target.value)} 
            />
            <button className="nav-btn" style={{width: '100%'}} onClick={importPgn}>Start Review</button>
          </div>
        )}

        {/* MODE: LOADING */}
        {isFullGameAnalyzing && (
          <div className="loading-screen">
            <h2>Analyzing Game...</h2>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${analysisProgress}%` }}></div>
            </div>
            <p style={{ color: '#a59f97', marginTop: '10px' }}>{Math.round(analysisProgress)}% Complete</p>
          </div>
        )}

        {/* MODE: SUMMARY REPORT CARD */}
        {gameMode === 'summary' && summaryData && (
          <div className="summary-card">
            <h2 style={{textAlign: 'center', margin: '0 0 20px 0'}}>Game Review</h2>
            <div className="summary-header">
              <div className="player-col">
                <div style={{color: '#a59f97', fontSize: '12px'}}>White</div>
                <div className="acc-box">{summaryData.wAcc}</div>
              </div>
              <div className="player-col">
                <div style={{color: '#a59f97', fontSize: '12px'}}>Black</div>
                <div className="acc-box" style={{background: '#333', color: '#fff'}}>{summaryData.bAcc}</div>
              </div>
            </div>

            {["Brilliant", "Great", "Best", "Excellent", "Good", "Inaccuracy", "Mistake", "Blunder", "Miss"].map(type => {
              if (summaryData.counts.w[type] === undefined && summaryData.counts.b[type] === undefined) return null;
              return (
                <div className="stat-row" key={type}>
                  <span style={{flex: 1, textAlign: 'right', fontWeight: 'bold', color: CLASSIFICATION_COLORS[type]}}>{summaryData.counts.w[type] || 0}</span>
                  <div style={{display: 'flex', alignItems: 'center', width: '100px', justifyContent: 'center'}}>
                    <span className="stat-icon" style={{backgroundColor: CLASSIFICATION_COLORS[type]}}>{CLASSIFICATION_ICONS[type]}</span>
                    <span style={{color: '#a59f97'}}>{type}</span>
                  </div>
                  <span style={{flex: 1, textAlign: 'left', fontWeight: 'bold', color: CLASSIFICATION_COLORS[type]}}>{summaryData.counts.b[type] || 0}</span>
                </div>
              );
            })}
            
            <button className="nav-btn" style={{width: '100%', marginTop: '20px'}} onClick={() => { setGameMode('review'); setCurrentReviewIndex(0); setGame(new Chess(reviewMoves[0].fenAfter)); }}>Start Review</button>
          </div>
        )}

        {/* MODE: ACTIVE REVIEW */}
        {gameMode === 'review' && currentReviewIndex >= 0 && (
          <>
            {/* Top Eval Bar */}
            <div className="top-eval-bar" style={{ background: evalBg, color: evalColor }}>
              {evalString}
            </div>

            {/* Coach Bubble */}
            <div className="coach-bubble-container">
              <div className="avatar">👩🏻</div>
              <div className="bubble">
                <div className="bubble-header">
                  <div style={{display: 'flex', alignItems: 'center'}}>
                    <span className="classification-icon" style={{backgroundColor: CLASSIFICATION_COLORS[currentMoveData?.classification] || '#96bc4b'}}>
                      {CLASSIFICATION_ICONS[currentMoveData?.classification] || '✓'}
                    </span>
                    <strong>{isViewingAlt ? "Engine Alternative" : `${currentMoveData?.san} is ${currentMoveData?.classification?.toLowerCase() || 'good'}`}</strong>
                  </div>
                  <div className="eval-tag">{evalString}</div>
                </div>
                <div style={{color: '#555'}}>{currentMoveData?.coachText}</div>
                
                {/* Alternative Toggle Button inside bubble */}
                {!isViewingAlt && ["Blunder", "Mistake", "Inaccuracy", "Miss"].includes(currentMoveData?.classification) && currentMoveData?.bestMoveLAN && (
                  <button style={{marginTop: '10px', background: '#f0f0f0', border: '1px solid #ccc', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold'}} onClick={showAlternativeLine}>
                    Show Best Move
                  </button>
                )}
                {isViewingAlt && (
                  <button style={{marginTop: '10px', background: '#f0f0f0', border: '1px solid #ccc', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold'}} onClick={resetToCurrentReviewMove}>
                    Back to Game
                  </button>
                )}
              </div>
            </div>

            {/* Board */}
            <div className="board-wrapper">
              <Chessboard
                position={game.fen()}
                customSquareStyles={activeSquareStyles}
                showBoardNotation={true}
                customDarkSquareStyle={{ backgroundColor: BOARD_THEMES[boardTheme].dark }}
                customLightSquareStyle={{ backgroundColor: BOARD_THEMES[boardTheme].light }}
                customArrows={activeArrows.map(arr => [arr[0], arr[1]])}
                customArrowColor={activeArrows.length > 0 ? activeArrows[0][2] : "rgba(129, 182, 76, 0.8)"}
                animationDuration={isViewingAlt ? 0 : 250}
              />
            </div>

            {/* Bottom Controls */}
            <div className="bottom-nav">
              <button className="nav-icon" disabled={currentReviewIndex <= 0} onClick={() => navigateReview(-1)}>❮</button>
              <button className="nav-btn" disabled={currentReviewIndex === reviewMoves.length - 1} onClick={() => navigateReview(1)}>Next</button>
              <button className="nav-icon" disabled={currentReviewIndex === reviewMoves.length - 1} onClick={() => navigateReview(1)}>❯</button>
            </div>
          </>
        )}

      </div>
    </>
  );
}
