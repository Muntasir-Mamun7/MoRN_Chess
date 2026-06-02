import React from 'react';
import { ACADEMY_MODULES } from './academyModules';

export default function AcademyPanel({
  activeModule,
  activeLesson,
  academyError,
  academyMessage,
  academyNode,
  showHint,
  isVoiceMuted,
  onToggleMute,
  onOpenModule,
  onStartLesson,
  onRetryMove,
  onProvideHint,
  onBackToModules,
  onBackToLessons
}) {
  return (
    <>
      <div className="panel-header" style={{ color: '#9C27B0' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {activeModule && <span style={{ cursor: 'pointer', color: '#aaa' }} onClick={onBackToModules}>←</span>}
          🎓 MoRN Academy
        </span>
        <span style={{ cursor: 'pointer', color: '#888' }} onClick={onToggleMute}>
          {isVoiceMuted ? '🔇' : '🔊'}
        </span>
      </div>
      <div className="panel-content">
        {!activeModule ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <p style={{ color: '#aaa', margin: 0 }}>Select a training module to begin:</p>
            {ACADEMY_MODULES.map(mod => (
              <div key={mod.id} className="lesson-card" onClick={() => onOpenModule(mod)}>
                <div className="lesson-title">{mod.title}</div>
                <div style={{ color: '#888', fontSize: '13px' }}>{mod.description}</div>
              </div>
            ))}
          </div>
        ) : !activeLesson ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3 style={{ marginTop: 0, color: '#9C27B0' }}>{activeModule.title}</h3>
            <p style={{ color: '#aaa', margin: 0 }}>{activeModule.description}</p>
            {activeModule.lessons.map(lesson => (
              <button key={lesson.id} className="action-btn" style={{ background: '#9C27B0', textAlign: 'left', padding: '15px' }} onClick={() => onStartLesson(lesson)}>
                {lesson.title}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h3 style={{ marginTop: 0, color: '#9C27B0' }}>{activeLesson.title}</h3>

            <div className={`coach-card ${academyError ? 'error' : ''}`}>
              <div className="coach-face" style={{ background: "url('https://www.chess.com/bundles/web/images/coach/coach-anya.png') center/cover", width: '48px', height: '48px', borderRadius: '50%', minWidth: '48px' }}></div>
              <div className="coach-text">{academyMessage}</div>
            </div>

            {showHint && academyNode && (
              <div className="hint-box" style={{ marginTop: '15px' }}>
                💡 Hint: Try playing <strong>{academyNode.expected}</strong>. (Follow the orange arrow on the board).
              </div>
            )}

            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {academyError && (
                <button className="action-btn" style={{ background: '#ca3431' }} onClick={onRetryMove}>
                  ↩ Retry Move
                </button>
              )}
              {!academyError && academyNode && !academyNode.endpoint && (
                <button className="action-btn" style={{ background: '#e58f2a' }} onClick={onProvideHint}>
                  💡 Give me a Hint
                </button>
              )}
              <button className="action-btn" style={{ background: '#333' }} onClick={onBackToLessons}>
                Back to Lessons
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
