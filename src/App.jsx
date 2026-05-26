import { useState, useEffect, useMemo, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

const PIECE_NAMES = { p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King' };

const BOARD_THEMES = {
  green: { light: '#eeeed2', dark: '#769656' },
  wood: { light: '#f0d9b5', dark: '#b58863' },
  ocean: { light: '#dee3e6', dark: '#8ca2ad' },
  dark: { light: '#aaaaaa', dark: '#555555' },
  portugal: { light: '#f4f4f4', dark: '#d32f2f' }
};

// ==========================================
// EDUCATIONAL & SASSY CHESS MASTER TEMPLATES
// ==========================================
const COACH_TEMPLATES = {
  Blunder: [
    "Wake up! Moving the {piece} to {to} is a complete hallucination. You just hung a massive tactical weakness. {alt_phrase}",
    "Ouch. Did your finger slip? Playing the {piece} to {to} drops the evaluation bar into the abyss. You completely ignored the board's tension. {alt_phrase}",
    "Absolutely not. Are we playing checkers? The {piece} on {to} walks right into a nightmare. Your opponent is definitely thanking you. {alt_phrase}",
    "A tragic blunder! You severed your own piece coordination. Moving the {piece} to {to} neglects your defense completely. {alt_phrase}",
    "My silicon brain hurts looking at this. The {piece} to {to} is an absolute disaster. You're bleeding material. {alt_phrase}"
  ],
  Mistake: [
    "Not the right idea at all. The {piece} on {to} looks active, but it actually surrenders the positional advantage and loses crucial tempo. {alt_phrase}",
    "A strategic misstep. By playing the {piece} to {to}, you allowed your opponent to improve their setup without breaking a sweat. {alt_phrase}",
    "You're drifting. Moving the {piece} to {to} is way too passive and bites on granite. It hands central control back to the enemy. {alt_phrase}",
    "A clear mistake. The {piece} on {to} creates a structural weakness that will haunt you for the rest of the game. {alt_phrase}"
  ],
  Inaccuracy: [
    "A minor inaccuracy. The {piece} to {to} is playable, but you missed a golden chance to seize the initiative by the throat. {alt_phrase}",
    "Slightly passive. You moved the {piece} to {to}, which defends well enough, but there was a much sharper continuation. {alt_phrase}",
    "Not the most precise choice. The {piece} on {to} allows the opponent to equalize the position a bit too easily. {alt_phrase}",
    "It's okay, but just okay. Committing the {piece} to {to} this early releases the tension. The engine wanted more aggression. {alt_phrase}"
  ],
  Good: [
    "Solid, fundamental chess. The {piece} to {to} improves your coordination and fights for central control. No need to complicate things here.",
    "A reliable positional choice. Placing the {piece} on {to} asks a tough question of your opponent while keeping your structure rock solid.",
    "Good development. The {piece} on {to} eyes critical squares and prepares your forces for the transition into the attack.",
    "A very sound prophylactic move. Moving the {piece} to {to} stops their immediate counterplay and keeps you completely safe.",
    "Good, sensible play. You activated the {piece} to {to} safely, keeping the tension high and your options open."
  ],
  "Great Move": [
    "Boom! Brilliant vision. Moving the {piece} to {to} exploits a massive tactical vulnerability in their camp. The pressure is suffocating!",
    "Great move! The {piece} on {to} completely shifts the positional balance in your favor. You are dominating the board geometry.",
    "An incredibly strong tactical decision. Placing the {piece} on {to} creates unanswerable threats. Masterful execution.",
    "Fantastic foresight. The {piece} to {to} paralyzes their defense and perfectly aligns with your attacking vectors."
  ],
  "Best Move": [
    "Magnus Carlsen, is that you? The {piece} to {to} is the absolute best engine move. Flawless tactical execution.",
    "Engine approved! Placing the {piece} on {to} destroys their counterplay and secures a massive, undeniable advantage.",
    "Chess perfection. The {piece} to {to} is the only move that maintains the winning edge. Beautifully calculated.",
    "Absolute precision. Playing the {piece} to {to} demonstrates deep strategic mastery. You saw exactly what the position demanded."
  ],
  Book: [
    "This is deep opening preparation. The {piece} to {to} follows established Grandmaster theory.",
    "Standard theoretical lines. Moving the {piece} to {to} secures your share of the center and develops harmoniously.",
    "A textbook opening response. The {piece} on {to} prepares your king for safety and readies your army for the middlegame."
  ]
};

export default function App() {
  const [game, setGame] = useState(new Chess());
  const [engine, setEngine] = useState(null);
  
  const [gameMode, setGameMode] = useState('computer'); 
  const [engineThinking, setEngineThinking] = useState(false);
  const [rawScore, setRawScore] = useState(0);
  const [bestMoveArrow, setBestMoveArrow] = useState([]);
  const [history, setHistory] = useState([]);
  
  const [aiLevel, setAiLevel] = useState(5); 
  const [boardTheme, setBoardTheme] = useState('portugal');
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [coachPersona, setCoachPersona] = useState('lively'); 
  const [systemVoices, setSystemVoices] = useState([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState('');

  const [moveFrom, setMoveFrom] = useState('');
  const [optionSquares, setOptionSquares] = useState({});

  const [pgnInput, setPgnInput] = useState('');
  const [reviewMoves, setReviewMoves] = useState([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(-1);
  const [coachExplanation, setCoachExplanation] = useState('');
  const [isViewingAlt, setIsViewingAlt] = useState(false);
  
  const [isFullGameAnalyzing, setIsFullGameAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  // Background Worker Refs
  const batchRef = useRef({ isActive: false, queue: [], results: [], currentScore: 0, parsedReview: [] });

  // Load browser voices
  useEffect(() => {
    if (!window.speechSynthesis) return;
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setSystemVoices(voices);
      if (voices.length > 0 && !selectedVoiceName) setSelectedVoiceName(voices[0].name);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, [selectedVoiceName]);

  const speakWithPersona = (text) => {
    if (isVoiceMuted || !window.speechSynthesis) return;
    window.speechSynthesis.cancel(); 
    const utterance = new SpeechSynthesisUtterance(text);
    const customVoice = systemVoices.find(v => v.name === selectedVoiceName);
    if (customVoice) utterance.voice = customVoice;

    switch (coachPersona) {
      case 'angry': utterance.rate = 1.25; utterance.pitch = 0.8; break;
      case 'charming': utterance.rate = 0.95; utterance.pitch = 1.1; break;
      case 'sexy': utterance.rate = 0.8; utterance.pitch = 0.85; break;
      case 'lively': default: utterance.rate = 1.1; utterance.pitch = 1.2; break;
    }
    window.speechSynthesis.speak(utterance);
  };

  // ==========================================
  // FAST SINGLE-PASS ENGINE LOGIC
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
              const score = parseInt(match[1]);
              if (batchRef.current.isActive) batchRef.current.currentScore = score;
              else setRawScore(score); 
            }
          }
          
          if (line.includes('info') && line.includes('score mate')) {
            const match = line.match(/score mate (-?\d+)/);
            if (match) {
              const movesToMate = parseInt(match[1]);
              const score = movesToMate > 0 ? 30000 - movesToMate : -30000 - movesToMate;
              if (batchRef.current.isActive) batchRef.current.currentScore = score;
            }
          }

          if (line.includes('bestmove')) {
            const moveLAN = line.split(' ')[1];
            
            if (batchRef.current.isActive) {
              batchRef.current.results.push({
                score: batchRef.current.currentScore,
                bestMove: moveLAN && moveLAN !== '(none)' ? moveLAN : ''
              });

              const completed = batchRef.current.results.length;
              const total = batchRef.current.queue.length;
              setAnalysisProgress((completed / total) * 100);

              if (completed < total) {
                worker.postMessage(`position fen ${batchRef.current.queue[completed]}`);
                worker.postMessage('go movetime 100'); // Ultra-fast 0.1s analysis per ply
              } else {
                finishBatchAnalysis();
              }
            } 
            else if (moveLAN && moveLAN !== '(none)') {
              const from = moveLAN.substring(0, 2);
              const to = moveLAN.substring(2, 4);
              setBestMoveArrow([[from, to]]);

              if (gameMode === 'computer' && game.turn() === 'b' && !game.isGameOver()) {
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
    if (engine && !isFullGameAnalyzing) engine.postMessage(`setoption name Skill Level value ${Math.max(0, (aiLevel - 1) * 2)}`);
  }, [aiLevel, engine, isFullGameAnalyzing]);

  useEffect(() => {
    if (!engine || game.isGameOver() || gameMode === 'review' || isFullGameAnalyzing) return;
    setEngineThinking(true);
    engine.postMessage(`position fen ${game.fen()}`);
    engine.postMessage(`go depth ${Math.max(2, aiLevel + 2)}`); 
  }, [game, engine, gameMode, aiLevel, isFullGameAnalyzing]);

  function handleSquareClick(square) {
    if (gameMode === 'review' || engineThinking || isFullGameAnalyzing) return;
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

  function handlePieceDrop(source, target) {
    if (gameMode === 'review' || engineThinking || isFullGameAnalyzing) return false;
    const gameCopy = new Chess(game.fen());
    try {
      if (gameCopy.move({ from: source, to: target, promotion: 'q' })) { setGame(gameCopy); setHistory(gameCopy.history({ verbose: true })); return true; }
    } catch (e) { return false; }
    return false;
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

  // ==========================================
  // NON-BLOCKING BACKGROUND GAME REVIEW
  // ==========================================
  function importPgn() {
    if (!pgnInput) return;
    if (!engine) { alert("Engine is loading. Please wait."); return; }
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

      // Prepare queue: Initial position + every position after a move
      const fenList = ["rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", ...parsedReview.map(m => m.fenAfter)];
      
      batchRef.current = { isActive: true, queue: fenList, results: [], currentScore: 0, parsedReview };
      setIsFullGameAnalyzing(true);
      setAnalysisProgress(0);
      setGameMode('review');
      
      // Instantly show the user Move 1 without waiting for full analysis
      setReviewMoves(parsedReview);
      setCurrentReviewIndex(0);
      setGame(new Chess(parsedReview[0].fenAfter));
      setCoachExplanation("The engine is currently calculating the variations for this game in the background. Sit tight for a few seconds!");

      engine.postMessage(`position fen ${fenList[0]}`);
      engine.postMessage('go movetime 100');
    } catch(err) { alert("Invalid PGN block."); }
  }

  function finishBatchAnalysis() {
    const { parsedReview, results } = batchRef.current;
    
    // Safety check map
    const finalResults = results.length >= parsedReview.length + 1 ? results : [...results, ...Array(parsedReview.length + 1 - results.length).fill({score: 0, bestMove: ''})];

    const finalizedMoves = parsedReview.map((m, idx) => {
      const beforeData = finalResults[idx] || {score: 0, bestMove: ''};
      const afterData = finalResults[idx + 1] || {score: 0, bestMove: ''};

      const scoreBefore = beforeData.score;
      const scoreAfter = -afterData.score; // Invert perspective
      const delta = scoreAfter - scoreBefore;

      let classification = "Good";
      if (delta <= -250) classification = "Blunder";
      else if (delta <= -80) classification = "Mistake";
      else if (delta <= -30) classification = "Inaccuracy";
      else if (m.lan === beforeData.bestMove || delta > -10) classification = "Best Move";
      else if (delta >= 50) classification = "Great Move";

      if (idx < 8 && classification !== "Blunder" && classification !== "Mistake") classification = "Book";

      return { ...m, classification, bestMoveLAN: beforeData.bestMove, delta };
    });

    setReviewMoves(finalizedMoves);
    setIsFullGameAnalyzing(false);
    batchRef.current.isActive = false;
    
    // If the user is currently viewing a move, trigger the coach speech now that it's ready
    setCurrentReviewIndex(currIdx => {
      const safeIdx = currIdx >= 0 ? currIdx : 0;
      const currentMove = finalizedMoves[safeIdx];
      if (currentMove) compileDeepCoachReport(currentMove, currentMove.classification, currentMove.bestMoveLAN);
      return safeIdx;
    });
  }

  function navigateReview(direction) {
    setIsViewingAlt(false);
    const newIdx = currentReviewIndex + direction;
    if (newIdx >= 0 && newIdx < reviewMoves.length) {
      setCurrentReviewIndex(newIdx);
      const move = reviewMoves[newIdx];
      setGame(new Chess(move.fenAfter));
      
      if (!isFullGameAnalyzing && move.classification) {
        compileDeepCoachReport(move, move.classification, move.bestMoveLAN);
      } else {
        setCoachExplanation("Analyzing... engine is still crunching numbers in the background.");
      }
    }
  }

  function compileDeepCoachReport(move, classification, bestMoveLAN) {
    const colorText = move.color === 'w' ? 'White' : 'Black';
    const piece = `${colorText} ${PIECE_NAMES[move.piece]}`;
    const toSquare = move.to;
    
    const isCapture = move.flags.includes('c');
    const isCheck = move.san.includes('+');
    
    let contextBonus = "";
    if (isCapture) contextBonus = ` Capturing a crucial piece on ${toSquare} gives you a tangible edge.`;
    else if (isCheck) contextBonus = ` By delivering a sharp check on ${toSquare}, you force the opponent to react entirely on your terms.`;

    const pool = COACH_TEMPLATES[classification] || COACH_TEMPLATES["Good"];
    const rawTemplate = pool[Math.floor(Math.random() * pool.length)];
    
    let dynamicText = rawTemplate.replace(/{piece}/g, piece).replace(/{to}/g, toSquare);
    if (["Good", "Great Move", "Best Move"].includes(classification)) dynamicText += contextBonus;

    if (["Blunder", "Mistake", "Inaccuracy"].includes(classification) && bestMoveLAN) {
      const altFrom = bestMoveLAN.substring(0, 2);
      const altTo = bestMoveLAN.substring(2, 4);
      const altPhrase = `Instead, the engine recommends routing your piece from ${altFrom} to ${altTo}. This completely shifts the momentum and seizes the initiative. Check the alternative line.`;
      dynamicText = dynamicText.replace(/{alt_phrase}/g, altPhrase);
    } else {
      dynamicText = dynamicText.replace(/{alt_phrase}/g, ""); 
    }

    setCoachExplanation(dynamicText.trim());
    speakWithPersona(dynamicText.trim());
  }

  function showAlternativeLine() {
    const currentMove = reviewMoves[currentReviewIndex];
    if (!currentMove || !currentMove.bestMoveLAN) return;
    
    const altGame = new Chess(currentMove.fenBefore); 
    try {
      altGame.move({ from: currentMove.bestMoveLAN.substring(0, 2), to: currentMove.bestMoveLAN.substring(2, 4), promotion: 'q' });
      setGame(altGame);
      setIsViewingAlt(true);
      const text = `Take a look at the board now. By playing to ${currentMove.bestMoveLAN.substring(2,4)}, your pieces coordinate flawlessly. You maintain safety while putting the enemy on their heels.`;
      setCoachExplanation(text);
      speakWithPersona(text);
    } catch(e) {}
  }

  function resetToCurrentReviewMove() {
    const move = reviewMoves[currentReviewIndex];
    if (move) {
      setGame(new Chess(move.fenAfter));
      setIsViewingAlt(false);
      compileDeepCoachReport(move, move.classification, move.bestMoveLAN); 
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
    setIsFullGameAnalyzing(false);
    window.speechSynthesis?.cancel();
  }

  const visualHeight = useMemo(() => {
    const clamped = Math.max(-500, Math.min(500, rawScore));
    return `${((clamped + 500) / 1000) * 100}%`;
  }, [rawScore]);

  const activeSquareStyles = useMemo(() => {
    let styles = { ...optionSquares };
    if (gameMode === 'review' && currentReviewIndex >= 0 && reviewMoves[currentReviewIndex] && !isViewingAlt) {
      const move = reviewMoves[currentReviewIndex];
      styles[move.from] = { backgroundColor: 'rgba(255, 255, 0, 0.4)' }; 
      styles[move.to] = { backgroundColor: 'rgba(255, 255, 0, 0.6)' };  
    }
    return styles;
  }, [optionSquares, gameMode, currentReviewIndex, reviewMoves, isViewingAlt]);

  const activeArrows = useMemo(() => {
    if (gameMode === 'review') {
       if (isViewingAlt) return []; 
       const currentMove = reviewMoves[currentReviewIndex];
       if (currentMove && currentMove.bestMoveLAN && ["Blunder", "Mistake", "Inaccuracy"].includes(currentMove.classification)) {
         return [[currentMove.bestMoveLAN.substring(0, 2), currentMove.bestMoveLAN.substring(2, 4)]];
       }
       return [];
    }
    return bestMoveArrow;
  }, [gameMode, isViewingAlt, reviewMoves, currentReviewIndex, bestMoveArrow]);

  const badgeColorMap = { "Best Move": "#4CAF50", "Great Move": "#1baca1", "Book": "#a5a5a5", "Good": "#96bc4b", "Inaccuracy": "#8c8c8c", "Mistake": "#f7c04a", "Blunder": "#b23333" };
  const currentTheme = BOARD_THEMES[boardTheme];
  const activeClassification = reviewMoves[currentReviewIndex]?.classification;
  const showAlternativeButton = !isViewingAlt && !isFullGameAnalyzing && ["Blunder", "Mistake", "Inaccuracy"].includes(activeClassification);

  return (
    <>
      <style>{`
        body { margin: 0; padding: 0; background-color: #121212; color: #fff; font-family: 'Segoe UI', system-ui, sans-serif; display: flex; flex-direction: column; min-height: 100vh; }
        .app-container { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 20px; }
        .header { text-align: center; margin-bottom: 20px; }
        .header h1 { font-size: 2.5rem; margin: 0 0 10px 0; background: linear-gradient(90deg, #d32f2f, #FF9800); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .menu { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-bottom: 20px; }
        .btn { padding: 10px 18px; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; transition: all 0.2s; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
        .btn:hover { transform: translateY(-2px); filter: brightness(1.1); }
        
        .main-layout { display: flex; gap: 20px; width: 100%; max-width: 1000px; justify-content: center; align-items: flex-start; flex-wrap: wrap; margin-bottom: 40px; }
        .eval-bar { width: 25px; height: 60vh; min-height: 400px; background-color: #333; position: relative; border-radius: 6px; overflow: hidden; border: 1px solid #444; box-shadow: 0 8px 16px rgba(0,0,0,0.5); }
        .eval-fill { background-color: #fff; width: 100%; position: absolute; bottom: 0; left: 0; transition: height 0.4s ease; }
        .eval-text { position: absolute; bottom: 5px; left: 50%; transform: translateX(-50%); color: #000; font-weight: bold; font-size: 11px; z-index: 10; text-shadow: 0px 0px 3px rgba(255,255,255,0.8); }
        .board-container { flex: 1 1 400px; max-width: 550px; width: 100%; position: relative; border-radius: 6px; box-shadow: 0 12px 24px rgba(0,0,0,0.6); }
        .side-panel { flex: 1 1 300px; max-width: 400px; width: 100%; background-color: #1e1e1e; border-radius: 8px; padding: 24px; box-sizing: border-box; min-height: 500px; display: flex; flex-direction: column; box-shadow: 0 8px 16px rgba(0,0,0,0.4); border: 1px solid #2a2a2a; }
        
        @media (max-width: 768px) {
          .eval-bar { display: none; }
          .board-container { max-width: 100%; }
          .side-panel { max-width: 100%; min-height: auto; }
        }

        .action-btn { width: 100%; padding: 14px; background-color: #d32f2f; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; transition: background-color 0.2s; font-size: 15px; }
        .action-btn:hover { filter: brightness(1.1); }
        .action-btn:disabled { background-color: #555; cursor: not-allowed; }
        .badge { display: flex; flex-direction: column; align-items: center; background-color: #262626; padding: 20px; border-radius: 8px; border: 1px solid #333; text-align: center; }
        .badge-tag { font-size: 15px; font-weight: 900; color: #fff; padding: 8px 20px; border-radius: 6px; margin-top: 8px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 6px rgba(0,0,0,0.2); }
        
        .coach-box { background-color: #2a2a2a; border-left: 4px solid #d32f2f; border-radius: 6px; padding: 18px; margin-top: 15px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.2); }
        .setting-row { display: flex; flex-direction: column; gap: 8px; padding: 15px 0; border-bottom: 1px solid #333; }
        select, input[type="range"] { padding: 12px; border-radius: 6px; background: #333; color: white; border: 1px solid #555; width: 100%; box-sizing: border-box; font-size: 14px; outline: none; }
        select:focus { border-color: #d32f2f; }
        
        .footer { text-align: center; padding: 20px; background-color: #161616; border-top: 1px solid #2a2a2a; color: #888; font-size: 13px; width: 100%; box-sizing: border-box; }
        .footer span { color: #d32f2f; font-weight: bold; }
      `}</style>

      <div className="app-container">
        <div className="header">
          <h1>MoRN Chess | The Ultimate Arena</h1>
          <div className="menu">
            <button className="btn" style={{backgroundColor: gameMode === 'computer' ? '#4CAF50' : '#4a4a4a'}} onClick={() => resetToBase('computer')}>Play vs AI</button>
            <button className="btn" style={{backgroundColor: gameMode === 'review' ? '#2196F3' : '#4a4a4a'}} onClick={() => resetToBase('review')}>Game Review Suite</button>
            <button className="btn" style={{backgroundColor: gameMode === 'settings' ? '#FF9800' : '#4a4a4a'}} onClick={() => resetToBase('settings')}>⚙️ Settings</button>
          </div>
        </div>

        <div className="main-layout">
          <div className="eval-bar">
            <div className="eval-fill" style={{ height: visualHeight }} />
            <span className="eval-text">{(rawScore/100).toFixed(1)}</span>
          </div>

          <div className="board-container">
            <Chessboard
              position={game.fen()}
              onPieceDrop={handlePieceDrop}
              onSquareClick={handleSquareClick}
              customSquareStyles={activeSquareStyles}
              showBoardNotation={true}
              customDarkSquareStyle={{ backgroundColor: currentTheme.dark }}
              customLightSquareStyle={{ backgroundColor: currentTheme.light }}
              customArrows={activeArrows}
              customArrowColor={isViewingAlt ? "rgba(33, 150, 243, 0.8)" : "rgba(76, 175, 80, 0.8)"}
              animationDuration={250}
            />
          </div>

          <div className="side-panel">
            {gameMode === 'settings' && (
              <div>
                <h3 style={{color: '#FF9800', margin: '0 0 15px 0'}}>Preferences</h3>
                <div className="setting-row">
                  <label><strong>AI Playing Strength</strong></label>
                  <input type="range" min="1" max="10" value={aiLevel} onChange={(e) => setAiLevel(parseInt(e.target.value))} />
                  <span style={{fontSize:'12px', color:'#aaa', textAlign: 'right'}}>Level {aiLevel}</span>
                </div>
                <div className="setting-row">
                  <label><strong>Board Aesthetic</strong></label>
                  <select value={boardTheme} onChange={(e) => setBoardTheme(e.target.value)}>
                    <option value="portugal">Portugal Red</option>
                    <option value="green">Classic Green</option>
                    <option value="wood">Tournament Wood</option>
                    <option value="ocean">Ocean Blue</option>
                    <option value="dark">Midnight Dark</option>
                  </select>
                </div>
                <div className="setting-row">
                  <label><strong>Virtual Coach Persona</strong></label>
                  <select value={coachPersona} onChange={(e) => setCoachPersona(e.target.value)}>
                    <option value="lively">Lively & Energetic 🔊</option>
                    <option value="angry">Sarcastic & Sharp 💢</option>
                    <option value="charming">Charming & Supportive ✨</option>
                    <option value="sexy">Sultry & Smooth 🎙️</option>
                  </select>
                </div>
                <div className="setting-row">
                  <label><strong>Physical Voice Device Select</strong></label>
                  <select value={selectedVoiceName} onChange={(e) => setSelectedVoiceName(e.target.value)}>
                    {systemVoices.map(v => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
                  </select>
                </div>
                <div className="setting-row" style={{border: 'none', paddingTop: '20px'}}>
                  <button className="btn" style={{backgroundColor: isVoiceMuted ? '#4a4a4a' : '#4CAF50', width: '100%'}} onClick={() => { setIsVoiceMuted(!isVoiceMuted); window.speechSynthesis?.cancel(); }}>
                    {isVoiceMuted ? '🔇 Audio Muted' : '🔊 Audio Active'}
                  </button>
                </div>
              </div>
            )}

            {gameMode === 'review' && (
              <div style={{display: 'flex', flexDirection: 'column', height: '100%', flex: 1}}>
                <h3 style={{color: '#2196F3', margin: '0 0 15px 0'}}>Match Analytics</h3>
                
                {isFullGameAnalyzing && (
                  <div style={{ marginBottom: '15px', padding: '12px', background: '#262626', borderRadius: '6px', border: '1px solid #444' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                         <span style={{ color: '#2196F3', fontWeight: 'bold' }}>Deep Analysis Running...</span>
                         <span style={{ color: '#aaa' }}>{Math.round(analysisProgress)}%</span>
                     </div>
                     <div style={{ width: '100%', height: '8px', background: '#333', borderRadius: '4px', overflow: 'hidden' }}>
                         <div style={{ width: `${analysisProgress}%`, height: '100%', background: 'linear-gradient(90deg, #2196F3, #9C27B0)', transition: 'width 0.2s ease' }} />
                     </div>
                  </div>
                )}

                {reviewMoves.length === 0 && !isFullGameAnalyzing ? (
                  <div>
                    <textarea style={{width: '100%', height: '180px', background: '#161616', color: '#fff', border: '1px solid #444', padding: '12px', marginBottom: '15px', boxSizing:'border-box', borderRadius: '6px', fontFamily: 'monospace'}} placeholder="Paste Chess.com PGN notation blocks here..." value={pgnInput} onChange={(e) => setPgnInput(e.target.value)} />
                    <button className="action-btn" style={{backgroundColor: '#2196F3'}} onClick={importPgn}>Evaluate Game</button>
                  </div>
                ) : (
                  <div style={{display: 'flex', flexDirection: 'column', flex: 1}}>
                    {currentReviewIndex >= 0 && (
                      <>
                        <div className="badge" style={{outline: isViewingAlt ? '2px solid #2196F3' : 'none'}}>
                           <span style={{fontSize: '13px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '1px'}}>Move {currentReviewIndex + 1}</span>
                           <h2 style={{margin: '8px 0', fontSize: '24px'}}>{isViewingAlt ? "Engine Alternative" : `Played: ${reviewMoves[currentReviewIndex]?.san}`}</h2>
                           {!isViewingAlt && (
                             <div className="badge-tag" style={{ backgroundColor: badgeColorMap[activeClassification] || '#444' }}>
                               {isFullGameAnalyzing && !activeClassification ? "Analyzing..." : activeClassification}
                             </div>
                           )}
                        </div>
                        <div className="coach-box" style={{borderColor: badgeColorMap[activeClassification] || '#2196F3'}}>
                           <div style={{fontWeight: 'bold', color: badgeColorMap[activeClassification] || '#2196F3', marginBottom: '8px', fontSize: '15px'}}>♟️ Coach Insights:</div>
                           <p style={{margin: 0, fontSize: '14px', lineHeight: '1.6', color: '#e0e0e0'}}>{coachExplanation}</p>
                        </div>
                        {showAlternativeButton && (
                          <button className="action-btn" style={{backgroundColor: '#1baca1', marginTop: '15px'}} onClick={showAlternativeLine}>🔍 View Recommended Move</button>
                        )}
                        {isViewingAlt && (
                          <button className="action-btn" style={{backgroundColor: '#666', marginTop: '15px'}} onClick={resetToCurrentReviewMove}>↩ Return to My Move</button>
                        )}
                      </>
                    )}
                    <div style={{display:'flex', gap:'10px', marginTop:'auto', paddingTop: '20px'}}>
                       <button className="btn" style={{flex: 1, backgroundColor: '#2a2a2a', border: '1px solid #444'}} disabled={currentReviewIndex <= 0} onClick={() => navigateReview(-1)}>← Prev</button>
                       <button className="btn" style={{flex: 1, backgroundColor: '#2a2a2a', border: '1px solid #444'}} disabled={currentReviewIndex === reviewMoves.length - 1} onClick={() => navigateReview(1)}>Next →</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {gameMode === 'computer' && (
              <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
                <h3 style={{margin: '0 0 15px 0', color: '#4CAF50'}}>Match Arena Logs</h3>
                <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '14px', overflowY: 'auto', flex: 1, alignContent: 'flex-start'}}>
                  {history.map((m, i) => (<span key={i} style={{backgroundColor: '#262626', border: '1px solid #333', padding: '5px 10px', borderRadius: '4px'}}>{i % 2 === 0 ? <strong style={{color: '#888'}}>{(i/2)+1}. </strong> : ''}{m.san}</span>))}
                  {history.length === 0 && <p style={{color: '#888', fontStyle: 'italic'}}>The board is set. Make a legal move to engage the engine...</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="footer">
        © {new Date().getFullYear()} <span>MoRN Chess</span>. Developed by <strong>Muntasir Al Mamun</strong>. All rights reserved.
      </div>
    </>
  );
}
