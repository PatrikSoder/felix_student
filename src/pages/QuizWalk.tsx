import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

const TOTAL_QUESTIONS = 10;
const STORAGE_KEY = 'felix_quizwalk_state';

const QuizWalk = () => {
  const loadInitialState = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Could not parse saved state", e);
    }
    return null;
  };

  const savedState = loadInitialState();

  const [teamName, setTeamName] = useState(savedState?.teamName || '');
  const [docId, setDocId] = useState<string | null>(savedState?.docId || null);
  const [hasStarted, setHasStarted] = useState(savedState?.hasStarted || false);
  const [currentQuestion, setCurrentQuestion] = useState(savedState?.currentQuestion || 1);
  const [answers, setAnswers] = useState<Record<number, string>>(savedState?.answers || {});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDone, setIsDone] = useState(savedState?.isDone || false);

  // Auto-save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      teamName,
      docId,
      hasStarted,
      currentQuestion,
      answers,
      isDone
    }));
  }, [teamName, docId, hasStarted, currentQuestion, answers, isDone]);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (teamName.trim().length > 0) {
      setIsSubmitting(true);
      try {
        if (!docId) {
          const docRef = await addDoc(collection(db, 'quizwalk_answers'), {
            teamName,
            answers: {},
            isFinished: false,
            timestamp: serverTimestamp()
          });
          setDocId(docRef.id);
        }
        setHasStarted(true);
      } catch (error) {
        console.error("Error creating team in DB: ", error);
        alert("Kunde inte starta tipspromenaden. Kontrollera er internetanslutning.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleReset = () => {
    if (window.confirm('Är ni säkra på att ni vill börja om? Alla nuvarande svar kommer att raderas!')) {
      localStorage.removeItem(STORAGE_KEY);
      setTeamName('');
      setDocId(null);
      setHasStarted(false);
      setCurrentQuestion(1);
      setAnswers({});
      setIsDone(false);
    }
  };

  const handleAnswer = async (answer: string) => {
    const newAnswers = { ...answers, [currentQuestion]: answer };
    setAnswers(newAnswers);
    
    if (docId) {
      setIsSaving(true);
      try {
        const docRef = doc(db, 'quizwalk_answers', docId);
        await updateDoc(docRef, {
          answers: newAnswers,
          lastUpdated: serverTimestamp()
        });
      } catch (error) {
        console.error("Background save failed", error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const submitAnswers = async () => {
    if (!docId) return;
    setIsSubmitting(true);
    try {
      const docRef = doc(db, 'quizwalk_answers', docId);
      await updateDoc(docRef, {
        answers: answers,
        isFinished: true,
        finishedAt: serverTimestamp()
      });
      setIsDone(true);
    } catch (error) {
      console.error("Error submitting final document: ", error);
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
        <button className="btn-secondary" onClick={() => { localStorage.removeItem(STORAGE_KEY); window.location.reload(); }} style={{ marginTop: '1rem' }}>
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
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Startar...' : 'Starta Tipspromenaden'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ padding: '2rem', marginTop: '2rem', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ color: '#6b7280', fontSize: '0.9rem', fontWeight: 600 }}>
          Fråga {currentQuestion} av {TOTAL_QUESTIONS}
        </div>
        <div style={{ fontSize: '0.8rem', color: isSaving ? 'var(--sweden-blue)' : '#9ca3af', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isSaving ? 'Sparar...' : 'Sparad'}
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isSaving ? 'var(--sweden-blue)' : '#10b981' }}></div>
        </div>
      </div>

      <div style={{ margin: '1.5rem 0', borderRadius: '0.5rem', overflow: 'hidden', border: '3px solid var(--sweden-blue)', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <img 
          src={`https://placehold.co/600x400/005293/fecb00?text=Plats+for+Bild+till+Fraga+${currentQuestion}`} 
          alt={`Fråga ${currentQuestion}`} 
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
        <button className="btn-secondary" style={{ fontSize: '1.5rem', padding: '1rem', border: answers[currentQuestion] === '1' ? '4px solid var(--sweden-blue)' : 'none' }} onClick={() => handleAnswer('1')}>1</button>
        <button className="btn-secondary" style={{ fontSize: '1.5rem', padding: '1rem', border: answers[currentQuestion] === 'X' ? '4px solid var(--sweden-blue)' : 'none' }} onClick={() => handleAnswer('X')}>X</button>
        <button className="btn-secondary" style={{ fontSize: '1.5rem', padding: '1rem', border: answers[currentQuestion] === '2' ? '4px solid var(--sweden-blue)' : 'none' }} onClick={() => handleAnswer('2')}>2</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
        <button 
          onClick={() => setCurrentQuestion(prev => Math.max(1, prev - 1))}
          disabled={currentQuestion === 1 || isSubmitting}
          style={{ background: 'transparent', border: 'none', color: currentQuestion === 1 ? '#ccc' : 'var(--sweden-blue)', cursor: currentQuestion === 1 ? 'not-allowed' : 'pointer', fontWeight: 500 }}
        >
          &larr; Föregående
        </button>

        {currentQuestion < TOTAL_QUESTIONS ? (
          <button 
            onClick={() => setCurrentQuestion(prev => Math.min(TOTAL_QUESTIONS, prev + 1))}
            disabled={!answers[currentQuestion] || isSubmitting}
            style={{ background: 'transparent', border: 'none', color: !answers[currentQuestion] ? '#ccc' : 'var(--sweden-blue)', cursor: !answers[currentQuestion] ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
          >
            Nästa &rarr;
          </button>
        ) : (
          <button 
            onClick={submitAnswers}
            disabled={!answers[currentQuestion] || isSubmitting}
            style={{ background: 'transparent', border: 'none', color: !answers[currentQuestion] ? '#ccc' : 'var(--sweden-blue)', cursor: !answers[currentQuestion] ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
          >
            {isSubmitting ? 'Skickar...' : 'Skicka in svar'}
          </button>
        )}
      </div>

      <div style={{ marginTop: '3rem', paddingTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
        <button onClick={handleReset} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}>
          Avbryt och börja om
        </button>
      </div>
    </div>
  );
};

export default QuizWalk;
