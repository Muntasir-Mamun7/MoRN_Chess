import { useState, useEffect, useMemo, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

// ==========================================
// CONSTANTS & CHESS.COM THEME
// ==========================================
const PIECE_NAMES = { p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King' };

const COLORS = {
  Brilliant: "#1baca1", Great: "#5c8bb0", Best: "#81b64c", Excellent: "#96bc4b",
  Good: "#96bc4b", Book: "#a5a5a5", Inaccuracy: "#f0c15c", Mistake: "#e58f2a",
  Blunder: "#ca3431", Miss: "#ff7769", Default: "#312e2b", Panel: "#262421"
};

const ICONS = {
  Brilliant: "!!", Great: "!", Best: "★", Excellent: "👍",
  Good: "✓", Book: "📖", Inaccuracy: "?!", Mistake: "?",
  Blunder: "??", Miss: "✖"
};

// ==========================================
// ACCURACY MATH (Win Probability Algorithm)
// ==========================================
// Converts Centipawns to Expected Win Percentage (Caps v2 formula approx)
function cpToWinProb(cp) {
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

// Calculates 0-100 Accuracy based on Win Prob difference
function calculateAccuracy(cpBefore, cpAfter) {
  const wpBefore = cpToWinProb(cpBefore);
  const wpAfter = cpToWinProb(cpAfter);
  const diff = Math.max(0, wpBefore - wpAfter); // Cannot gain accuracy above perfect
  let accuracy = 103.1668 * Math.exp(-0.04354 * diff) - 3.1669;
  return Math.max(0, Math.min(100, accuracy));
}

// ==========================================
// COACH TEMPLATES
// ==========================================
const COACH_TEMPLATES = {
  Blunder: ["{san} is a blunder.", "You permitted the opponent to win material.", "You overlooked a major tactical threat."],
  Mistake: ["{san} is a mistake.", "This surrenders the positional advantage.", "A strategic misstep that loses tempo."],
  Inaccuracy: ["{san} is an inaccuracy.", "Their best option was to attack the center.", "You missed a chance to seize the initiative."],
  Good: ["{san} is good.", "A solid, playable move.", "Maintains the balance of the position."],
  Excellent: ["{san} is excellent.", "You are finding great squares for your pieces."],
  "Best Move": ["{san} is best.", "This keeps an eye on the position while staying active.", "Flawless tactical execution."],
  Great: ["{san} is a great move.", "You found a powerful tactical continuation.", "This shifts the momentum in your favor."],
  Book: ["{san} is a book move.", "A fundamental move that develops your position.", "Standard opening theory."]
};

export default function App() {
  const [game, setGame] = useState(new Chess());
  const [engine, setEngine] = useState(null);
  
  const [gameMode, setGameMode] = useState('input'); // input, review, summary
  const [pgnInput, setPgnInput] = useState('');
  const [reviewMoves, setReviewMoves] = useState([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(-1);
  const [isViewingAlt, setIsViewingAlt] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  
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
                bestMove: moveLAN !== '(none)' ? moveLAN : ''
              });

              const completed = batchRef.current.results.length;
              const total = batchRef.current.queue.length;
              setProgress((completed / total) * 100);

              if (completed < total) {
                worker.postMessage(`position fen ${batchRef.current.queue[completed]}`);
                worker.postMessage('go movetime 100'); // Fast evaluation
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

  // ==========================================
  // ANALYSIS LOGIC
  // ==========================================
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
      engine.postMessage('go movetime 100');
    } catch(err) { alert("Invalid PGN."); }
  }

  function finishBatchAnalysis() {
    const { parsedReview, results } = batchRef.current;
    
    let wAccSum = 0, bAccSum = 0, wMoves = 0, bMoves = 0;
    const counts = { w: { Best:0, Excellent:0, Good:0, Inaccuracy:0, Mistake:0, Blunder:0, Book:0 }, b: { Best:0, Excellent:0, Good:0, Inaccuracy:0, Mistake:0, Blunder:0, Book:0 } };

    const finalizedMoves = parsedReview.map((m, idx) => {
      const beforeData = results[idx] || {score: 0, mate: null, bestMove: ''};
      const afterData = results[idx + 1] || {score: 0, mate: null, bestMove: ''};

      const scoreBefore = beforeData.score;
      const scoreAfter = -afterData.score; // Invert for player's perspective

      let classification = "Good";
      const delta = scoreAfter - scoreBefore;
      const accuracy = calculateAccuracy(scoreBefore, scoreAfter);

      if (idx < 8 && delta > -100) classification = "Book";
      else if (delta <= -250) classification = "Blunder";
      else if (delta <= -100) classification = "Mistake";
      else if (delta <= -40) classification = "Inaccuracy";
      else if (m.lan === beforeData.bestMove || delta >= -5) classification = "Best Move";
      else if (delta >= -15) classification = "Excellent";
      else classification = "Good";

      if (m.san.includes('#')) classification = "Best Move";

      if (counts[m.color][classification] !== undefined) counts[m.color][classification]++;
      if (m.color === 'w' && classification !== "Book") { wAccSum += accuracy; wMoves++; }
      if (m.color === 'b' && classification !== "Book") { bAccSum += accuracy; bMoves++; }

      const tpl = COACH_TEMPLATES[classification][Math.floor(Math.random() * COACH_TEMPLATES[classification].length)];
      let coachText = tpl.replace('{san}', m.san);

      return { 
        ...m, 
        classification, 
        bestMoveLAN: beforeData.bestMove, 
        evalScore: scoreAfter,
        evalMate: afterData.mate,
        accuracy,
        coachText
      };
    });

    setSummaryData({
      wAcc: wMoves ? (wAccSum / wMoves).toFixed(1) : 100,
      bAcc: bMoves ? (bAccSum / bMoves).toFixed(1) : 100,
      counts
    });

    setReviewMoves(finalizedMoves);
    setIsAnalyzing(false);
    batchRef.current.isActive = false;
    setGameMode('summary');
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

  // ==========================================
  // RENDER HELPERS
  // ==========================================
  const currentMove = currentReviewIndex >= 0 ? reviewMoves[currentReviewIndex] : null;
  const currentFen = currentMove ? currentMove.fenAfter : "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  
  // Format Eval Score (e.g., +4.61 or M11)
  let evalString = "0.00";
  let evalRaw = 0;
  if (currentMove) {
    if (currentMove.evalMate) {
      evalString = `M${Math.abs(currentMove.evalMate)}`;
      evalRaw = currentMove.evalMate > 0 ? 1000 : -1000;
    } else {
      evalRaw = currentMove.color === 'w' ? currentMove.evalScore : -currentMove.evalScore;
      evalString = `${evalRaw > 0 ? '+' : ''}${(evalRaw / 100).toFixed(2)}`;
    }
  }

  // Vertical Bar Calculation
  const evalHeight = useMemo(() => {
    const clamped = Math.max(-500, Math.min(500, evalRaw));
    return `${((clamped + 500) / 1000) * 100}%`;
  }, [evalRaw]);

  // Visual Highlighting
  const activeSquareStyles = useMemo(() => {
    let styles = {};
    if (currentMove && !isViewingAlt) {
      styles[currentMove.from] = { backgroundColor: 'rgba(255, 255, 0, 0.4)' }; 
      styles[currentMove.to] = { backgroundColor: 'rgba(255, 255, 0, 0.6)' };  
    }
    return styles;
  }, [currentMove, isViewingAlt]);

  // Alternative Line Arrows
  const activeArrows = useMemo(() => {
    if (isViewingAlt) return []; 
    if (currentMove && currentMove.bestMoveLAN && ["Blunder", "Mistake", "Inaccuracy"].includes(currentMove.classification)) {
      return [
        [currentMove.from, currentMove.to, "rgba(202, 52, 49, 0.8)"], // Played move (Red)
        [currentMove.bestMoveLAN.substring(0, 2), currentMove.bestMoveLAN.substring(2, 4), "rgba(129, 182, 76, 0.8)"] // Best move (Green)
      ];
    }
    return [];
  }, [currentMove, isViewingAlt]);

  // ==========================================
  // CUSTOM CSS
  // ==========================================
  return (
    <>
      <style>{`
        body { margin: 0; padding: 0; background-color: #312e2b; color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        .desktop-container { display: flex; height: 100vh; width: 100%; overflow: hidden; justify-content: center; background: #312e2b; }
        
        /* LEFT SIDE: BOARD */
        .left-col { display: flex; align-items: center; justify-content: center; padding: 20px; flex: 1; max-width: 700px; gap: 15px; }
        .eval-bar-wrapper { width: 30px; height: 600px; background: #403d39; border-radius: 4px; display: flex; flex-direction: column; overflow: hidden; position: relative; border: 2px solid #262421; }
        .eval-bar-fill { background: #fff; width: 100%; position: absolute; bottom: 0; transition: height 0.3s ease; }
        .eval-bar-text { position: absolute; width: 100%; text-align: center; font-size: 11px; font-weight: bold; z-index: 10; padding: 4px 0; }
        .board-wrapper { width: 100%; max-width: 600px; display: flex; flex-direction: column; gap: 10px; }
        .player-info { display: flex; align-items: center; gap: 10px; font-weight: bold; font-size: 14px; }
        .player-avatar { width: 32px; height: 32px; background: #403d39; border-radius: 4px; }

        /* RIGHT SIDE: PANEL */
        .right-col { width: 400px; background: #262421; display: flex; flex-direction: column; height: 100%; border-left: 1px solid #403d39; }
        
        /* Tabs */
        .tabs { display: flex; border-bottom: 1px solid #403d39; background: #1e1e1e; }
        .tab { flex: 1; text-align: center; padding: 15px; font-weight: bold; color: #81b64c; background: #262421; border-top: 3px solid #81b64c; font-size: 14px; }

        /* Coach Bubble */
        .coach-area { padding: 15px; background: #262421; display: flex; gap: 15px; align-items: flex-start; border-bottom: 1px solid #403d39; }
        .coach-avatar { font-size: 40px; }
        .coach-bubble { background: #fff; color: #333; padding: 15px; border-radius: 12px; border-top-left-radius: 0; flex: 1; position: relative; font-size: 14px; line-height: 1.4; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
        .bubble-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .bubble-eval { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 12px; font-weight: bold; color: #666; }

        /* Move List */
        .move-list { flex: 1; overflow-y: auto; padding: 0; margin: 0; background: #2b2826; }
        .move-row { display: flex; background: #262421; border-bottom: 1px solid #312e2b; }
        .move-num { width: 40px; text-align: center; padding: 8px; color: #888; font-size: 13px; background: #312e2b; }
        .move-ply { flex: 1; padding: 8px 12px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; font-weight: bold; font-size: 14px; }
        .move-ply:hover { background: #312e2b; }
        .move-ply.active { background: #403d39; }
        
        .class-icon { width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; color: #fff; }

        /* Graph */
        .eval-graph { height: 60px; background: #1e1e1e; border-top: 1px solid #403d39; border-bottom: 1px solid #403d39; position: relative; }

        /* Controls */
        .controls { display: flex; padding: 15px; gap: 10px; background: #262421; align-items: center; }
        .ctrl-btn { background: none; border: none; color: #a59f97; font-size: 20px; cursor: pointer; padding: 10px; transition: color 0.2s; }
        .ctrl-btn:hover:not(:disabled) { color: #fff; }
        .ctrl-btn:disabled { color: #555; cursor: not-allowed; }
        .next-btn { flex: 1; background: #81b64c; color: #fff; font-weight: bold; font-size: 18px; padding: 15px; border: none; border-radius: 8px; cursor: pointer; text-shadow: 0 1px 2px rgba(0,0,0,0.2); }
        .next-btn:hover { background: #96bc4b; }

        /* Summary Screen */
        .summary-screen { padding: 20px; overflow-y: auto; flex: 1; }
        .summary-header { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .player-card { text-align: center; flex: 1; }
        .acc-box { font-size: 28px; font-weight: bold; background: #fff; color: #333; padding: 10px; border-radius: 8px; margin-top: 10px; display: inline-block; min-width: 80px; }
        .stat-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #312e2b; font-size: 14px; }
        
        .pgn-input-area { padding: 20px; display: flex; flex-direction: column; height: 100%; justify-content: center; }
        textarea { width: 100%; height: 200px; background: #1e1e1e; color: #fff; border: 1px solid #403d39; padding: 15px; border-radius: 8px; font-family: monospace; resize: none; margin-bottom: 15px; }
      `}</style>

      <div className="desktop-container">
        
        {/* LEFT COLUMN: EVAL BAR & BOARD */}
        <div className="left-col">
          <div className="eval-bar-wrapper">
            <div className="eval-bar-text" style={{ top: 0, color: evalRaw < 0 ? '#fff' : '#333' }}>
              {evalRaw < 0 ? evalString : ''}
            </div>
            <div className="eval-bar-fill" style={{ height: evalHeight }} />
            <div className="eval-bar-text" style={{ bottom: 0, color: evalRaw > 0 ? '#333' : '#fff' }}>
              {evalRaw > 0 ? evalString : ''}
            </div>
          </div>

          <div className="board-wrapper">
            <div className="player-info">
              <div className="player-avatar"></div>
              <span>Opponent (Black)</span>
            </div>
            
            <Chessboard
              position={currentFen}
              customSquareStyles={activeSquareStyles}
              showBoardNotation={true}
              customDarkSquareStyle={{ backgroundColor: "#769656" }}
              customLightSquareStyle={{ backgroundColor: "#eeeed2" }}
              customArrows={activeArrows.map(arr => [arr[0], arr[1]])}
              customArrowColor={activeArrows.length > 0 ? activeArrows[0][2] : "rgba(129, 182, 76, 0.8)"}
              animationDuration={200}
            />

            <div className="player-info">
              <div className="player-avatar"></div>
              <span>You (White)</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: REVIEW UI */}
        <div className="right-col">
          <div className="tabs">
            <div className="tab">★ Game Review</div>
          </div>

          {gameMode === 'input' && (
            <div className="pgn-input-area">
              <h2 style={{textAlign: 'center', marginBottom: '20px'}}>Analyze Your Game</h2>
              <textarea placeholder="Paste PGN here..." value={pgnInput} onChange={e => setPgnInput(e.target.value)} />
              <button className="next-btn" onClick={startAnalysis}>Run Game Review</button>
            </div>
          )}

          {isAnalyzing && (
            <div className="pgn-input-area" style={{textAlign: 'center'}}>
              <h2>Deep Analysis Running</h2>
              <p style={{color: '#a59f97'}}>Evaluating the game sequentially...</p>
              <div style={{width: '100%', height: '8px', background: '#403d39', borderRadius: '4px', marginTop: '20px', overflow: 'hidden'}}>
                <div style={{width: `${progress}%`, height: '100%', background: '#81b64c', transition: 'width 0.2s'}} />
              </div>
            </div>
          )}

          {gameMode === 'summary' && summaryData && (
            <div className="summary-screen">
              <div className="coach-area" style={{borderRadius: '8px', marginBottom: '20px'}}>
                <div className="coach-avatar">👩🏻</div>
                <div className="coach-bubble">You had a nice tactical find in this game. Let's review!</div>
              </div>
              
              <div className="summary-header">
                <div className="player-card">
                  <div className="player-avatar" style={{margin: '0 auto'}}></div>
                  <div className="acc-box">{summaryData.wAcc}</div>
                </div>
                <div className="player-card">
                  <div className="player-avatar" style={{margin: '0 auto'}}></div>
                  <div className="acc-box" style={{background: '#333', color: '#fff'}}>{summaryData.bAcc}</div>
                </div>
              </div>

              {["Brilliant", "Great", "Best", "Excellent", "Good", "Inaccuracy", "Mistake", "Blunder", "Miss"].map(type => {
                const wCount = summaryData.counts.w[type];
                const bCount = summaryData.counts.b[type];
                if (!wCount && !bCount) return null;
                const color = COLORS[type];
                return (
                  <div className="stat-row" key={type}>
                    <span style={{flex: 1, textAlign: 'right', fontWeight: 'bold', color}}>{wCount || 0}</span>
                    <div style={{width: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
                      <span className="class-icon" style={{backgroundColor: color}}>{ICONS[type]}</span>
                      <span style={{color: '#a59f97'}}>{type}</span>
                    </div>
                    <span style={{flex: 1, textAlign: 'left', fontWeight: 'bold', color}}>{bCount || 0}</span>
                  </div>
                );
              })}
              
              <button className="next-btn" style={{width: '100%', marginTop: '30px'}} onClick={() => { setGameMode('review'); setCurrentReviewIndex(0); }}>
                Start Review
              </button>
            </div>
          )}

          {gameMode === 'review' && (
            <>
              {/* Coach Area */}
              <div className="coach-area">
                <div className="coach-avatar">👩🏻</div>
                <div className="coach-bubble">
                  <div className="bubble-head">
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                      <span className="class-icon" style={{backgroundColor: COLORS[currentMove?.classification] || COLORS.Good}}>
                        {ICONS[currentMove?.classification] || '✓'}
                      </span>
                      <strong>{currentMove?.san} is {currentMove?.classification?.toLowerCase()}</strong>
                    </div>
                    <div className="bubble-eval">{evalString}</div>
                  </div>
                  <div>{currentMove?.coachText}</div>
                </div>
              </div>

              {/* Move List */}
              <div className="move-list">
                {Array.from({ length: Math.ceil(reviewMoves.length / 2) }).map((_, i) => {
                  const wMove = reviewMoves[i * 2];
                  const bMove = reviewMoves[i * 2 + 1];
                  return (
                    <div className="move-row" key={i}>
                      <div className="move-num">{i + 1}.</div>
                      
                      <div className={`move-ply ${currentReviewIndex === i * 2 ? 'active' : ''}`} onClick={() => { setIsViewingAlt(false); setCurrentReviewIndex(i * 2); }}>
                        <span style={{display:'flex', gap:'5px', alignItems:'center'}}>
                          {wMove.classification && <span className="class-icon" style={{backgroundColor: COLORS[wMove.classification]}}>{ICONS[wMove.classification]}</span>}
                          {wMove.san}
                        </span>
                      </div>

                      {bMove ? (
                        <div className={`move-ply ${currentReviewIndex === i * 2 + 1 ? 'active' : ''}`} onClick={() => { setIsViewingAlt(false); setCurrentReviewIndex(i * 2 + 1); }}>
                          <span style={{display:'flex', gap:'5px', alignItems:'center'}}>
                            {bMove.classification && <span className="class-icon" style={{backgroundColor: COLORS[bMove.classification]}}>{ICONS[bMove.classification]}</span>}
                            {bMove.san}
                          </span>
                        </div>
                      ) : <div className="move-ply"></div>}
                    </div>
                  );
                })}
              </div>

              {/* Graph */}
              <div className="eval-graph">
                <svg width="100%" height="100%" preserveAspectRatio="none">
                  {/* Zero Line */}
                  <line x1="0" y1="30" x2="100%" y2="30" stroke="#555" strokeWidth="1" />
                  
                  {/* Eval Path */}
                  <path 
                    d={`M 0,30 ${reviewMoves.map((m, i) => {
                      const x = ((i + 1) / reviewMoves.length) * 100;
                      // Convert cp to Y coordinate (0 to 60). Clamp between -500 and +500 cp.
                      // Positive score (White advantage) means higher up (lower Y value)
                      const cp = m.color === 'w' ? m.evalScore : -m.evalScore; 
                      const clamped = Math.max(-500, Math.min(500, cp));
                      const y = 30 - (clamped / 500) * 30;
                      return `L ${x}%,${y}`;
                    }).join(' ')}`}
                    fill="none" stroke="#fff" strokeWidth="2"
                  />

                  {/* Move Nodes */}
                  {reviewMoves.map((m, i) => {
                    const x = ((i + 1) / reviewMoves.length) * 100;
                    const cp = m.color === 'w' ? m.evalScore : -m.evalScore;
                    const clamped = Math.max(-500, Math.min(500, cp));
                    const y = 30 - (clamped / 500) * 30;
                    const color = COLORS[m.classification] || '#fff';
                    return <circle key={i} cx={`${x}%`} cy={y} r="3" fill={color} />;
                  })}
                </svg>
              </div>

              {/* Controls */}
              <div className="controls">
                <button className="ctrl-btn" onClick={() => navigateReview('start')}>|❮</button>
                <button className="ctrl-btn" disabled={currentReviewIndex <= -1} onClick={() => navigateReview(-1)}>❮</button>
                <button className="ctrl-btn" disabled={currentReviewIndex >= reviewMoves.length - 1} onClick={() => navigateReview(1)}>❯</button>
                <button className="ctrl-btn" onClick={() => navigateReview('end')}>❯|</button>
                <button className="next-btn" onClick={() => navigateReview(1)} disabled={currentReviewIndex >= reviewMoves.length - 1}>
                  Next
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
}
