import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const TOTAL_QUESTIONS = 10;

const QuizWalk = () => {
  const [teamName, setTeamName] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (teamName.trim().length > 0) {
      setHasStarted(true);
    }
  };

  const handleAnswer = (answer: string) => {
    setAnswers(prev => ({ ...prev, [currentQuestion]: answer }));
    if (currentQuestion < TOTAL_QUESTIONS) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      submitAnswers({ ...answers, [currentQuestion]: answer });
    }
  };

  const submitAnswers = async (finalAnswers: Record<number, string>) => {
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'quizwalk_answers'), {
        teamName,
        answers: finalAnswers,
        timestamp: serverTimestamp()
      });
      setIsDone(true);
    } catch (error) {
      console.error("Error adding document: ", error);
      alert("Något gick fel när svaren skulle sparas. Kontrollera din internetanslutning.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isDone) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', marginTop: '2rem' }}>
        <h2>Tack för att ni deltog!</h2>
        <p>Era svar är sparade. Resultatet presenteras senare under kvällen.</p>
        <button className="btn-secondary" onClick={() => window.location.reload()} style={{ marginTop: '1rem' }}>
          Skapa nytt lag
        </button>
      </div>
    );
  }

  if (!hasStarted) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', marginTop: '2rem' }}>
        <h2>Tipspromenad</h2>
        <p>Gå runt och hitta frågorna. Skriv in ert lagnamn för att börja svara!</p>
        <form onSubmit={handleStart} style={{ marginTop: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Lagnamn</label>
          <input 
            type="text" 
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="T.ex. Team Awesome"
            required
            style={{ marginBottom: '1rem' }}
          />
          <button type="submit" className="btn-primary">Starta Tipspromenaden</button>
        </form>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ padding: '2rem', marginTop: '2rem', textAlign: 'center' }}>
      <div style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1rem', fontWeight: 600 }}>
        Fråga {currentQuestion} av {TOTAL_QUESTIONS}
      </div>
      <h2 style={{ fontSize: '3rem', margin: '1rem 0' }}>{currentQuestion}</h2>
      
      {isSubmitting ? (
        <p>Sparar era svar...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
          <button className="btn-secondary" style={{ fontSize: '1.5rem', padding: '1rem' }} onClick={() => handleAnswer('1')}>1</button>
          <button className="btn-secondary" style={{ fontSize: '1.5rem', padding: '1rem' }} onClick={() => handleAnswer('X')}>X</button>
          <button className="btn-secondary" style={{ fontSize: '1.5rem', padding: '1rem' }} onClick={() => handleAnswer('2')}>2</button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
        <button 
          onClick={() => setCurrentQuestion(prev => Math.max(1, prev - 1))}
          disabled={currentQuestion === 1 || isSubmitting}
          style={{ background: 'transparent', border: 'none', color: currentQuestion === 1 ? '#ccc' : 'var(--sweden-blue)', cursor: currentQuestion === 1 ? 'not-allowed' : 'pointer' }}
        >
          &larr; Föregående
        </button>
        {Object.keys(answers).length >= TOTAL_QUESTIONS && currentQuestion === TOTAL_QUESTIONS && (
          <button 
            onClick={() => submitAnswers(answers)}
            disabled={isSubmitting}
            style={{ background: 'transparent', border: 'none', color: 'var(--sweden-blue)', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Skicka in svar
          </button>
        )}
      </div>
    </div>
  );
};

export default QuizWalk;
