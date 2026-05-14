import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp, getDoc, getDocs, query, where } from 'firebase/firestore';

const STORAGE_KEY = 'felix_quizwalk_state';

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

interface Question {
  id: string;
  text: string;
  option1: string;
  optionX: string;
  option2: string;
}

const QuizWalk = () => {
  const [savedState] = useState(loadInitialState);

  const [teamName, setTeamName] = useState(savedState?.teamName || '');
  const [docId, setDocId] = useState<string | null>(savedState?.docId || null);
  const [writeToken, setWriteToken] = useState<string | null>(savedState?.writeToken || null);
  const [hasStarted, setHasStarted] = useState(savedState?.hasStarted || false);
  const [currentQuestion, setCurrentQuestion] = useState(savedState?.currentQuestion || 1);
  const [answers, setAnswers] = useState<Record<number, string>>(savedState?.answers || {});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [teamNameError, setTeamNameError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(savedState?.isDone || false);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const qDoc = await getDoc(doc(db, 'quizwalk_config', 'questions_public'));
        if (qDoc.exists() && qDoc.data().questions) {
          setQuestions(qDoc.data().questions);
        }
      } catch (e) {
        console.error("Error fetching questions", e);
        setFetchError(true);
      } finally {
        setLoadingQuestions(false);
      }
    };
    fetchQuestions();
  }, []);

  const totalQuestions = questions.length > 0 ? questions.length : 10;

  // Auto-save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      teamName,
      docId,
      writeToken,
      hasStarted,
      currentQuestion,
      answers,
      isDone
    }));
  }, [teamName, docId, writeToken, hasStarted, currentQuestion, answers, isDone]);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (teamName.trim().length > 0) {
      setIsSubmitting(true);
      setTeamNameError(null);
      try {
        if (!docId) {
          const existing = await getDocs(query(collection(db, 'quizwalk_answers'), where('teamName', '==', teamName.trim())));
          const activeDocs = existing.docs.filter(d => !d.data().isAbandoned);
          if (activeDocs.length > 0) {
            setTeamNameError('Det finns redan ett lag med det namnet. Välj ett annat!');
            return;
          }

          const token = crypto.randomUUID();
          const docRef = await addDoc(collection(db, 'quizwalk_answers'), {
            teamName,
            answers: {},
            isFinished: false,
            timestamp: serverTimestamp(),
            writeToken: token
          });
          setDocId(docRef.id);
          setWriteToken(token);
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

  const handleReset = async () => {
    if (window.confirm('Är ni säkra på att ni vill börja om? Alla nuvarande svar kommer att raderas!')) {
      if (docId && writeToken) {
        try {
          await updateDoc(doc(db, 'quizwalk_answers', docId), { isAbandoned: true, writeToken });
        } catch (e) {
          console.error("Could not mark doc as abandoned", e);
        }
      }
      localStorage.removeItem(STORAGE_KEY);
      setTeamName('');
      setDocId(null);
      setWriteToken(null);
      setHasStarted(false);
      setCurrentQuestion(1);
      setAnswers({});
      setIsDone(false);
    }
  };

  const handleAnswer = (answer: string) => {
    const newAnswers = { ...answers, [currentQuestion]: answer };
    setAnswers(newAnswers);

    if (docId) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      setIsSaving(true);
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const docRef = doc(db, 'quizwalk_answers', docId);
          await updateDoc(docRef, {
            answers: newAnswers,
            lastUpdated: serverTimestamp(),
            writeToken
          });
        } catch (error) {
          console.error("Background save failed", error);
        } finally {
          setIsSaving(false);
        }
      }, 600);
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
        finishedAt: serverTimestamp(),
        writeToken
      });
      setIsDone(true);
    } catch (error) {
      console.error("Error submitting final document: ", error);
      alert("Något gick fel när svaren skulle sparas. Kontrollera din internetanslutning.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingQuestions) {
    return <div style={{ padding: '2rem', textAlign: 'center', marginTop: '2rem' }}>Laddar tipspromenad...</div>;
  }

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
        <p>Gå runt och svara på frågorna. Skriv in ert lagnamn för att börja!</p>
        {fetchError && (
          <p style={{ color: '#b91c1c', fontSize: '0.9rem', marginBottom: '1rem', background: '#fee2e2', padding: '0.75rem', borderRadius: '0.5rem' }}>
            Kunde inte ladda frågorna. Kontrollera din internetanslutning och ladda om sidan.
          </p>
        )}
        {!fetchError && questions.length === 0 && (
          <p style={{ color: '#d97706', fontSize: '0.9rem', marginBottom: '1rem', background: '#fef3c7', padding: '0.75rem', borderRadius: '0.5rem' }}>
            Observera: Frågor saknas i databasen. Standard-läge med bilder (q1.png - q10.png) används.
          </p>
        )}
        <form onSubmit={handleStart} style={{ marginTop: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Lagnamn</label>
          <input
            type="text"
            value={teamName}
            onChange={(e) => { setTeamName(e.target.value); setTeamNameError(null); }}
            placeholder="T.ex. Team Awesome"
            required
            style={{ marginBottom: '0.5rem' }}
          />
          {teamNameError && (
            <p style={{ color: '#b91c1c', fontSize: '0.9rem', margin: '0 0 1rem', background: '#fee2e2', padding: '0.5rem 0.75rem', borderRadius: '0.5rem' }}>
              {teamNameError}
            </p>
          )}
          <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ marginTop: '0.5rem' }}>
            {isSubmitting ? 'Startar...' : 'Starta Tipspromenaden'}
          </button>
        </form>
      </div>
    );
  }

  const currentQData = questions[currentQuestion - 1];

  return (
    <div className="glass-panel" style={{ padding: '2rem', marginTop: '2rem', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ color: '#6b7280', fontSize: '0.9rem', fontWeight: 600 }}>
          Fråga {currentQuestion} av {totalQuestions}
        </div>
        <div style={{ fontSize: '0.8rem', color: isSaving ? 'var(--sweden-blue)' : '#9ca3af', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isSaving ? 'Sparar...' : 'Sparad'}
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isSaving ? 'var(--sweden-blue)' : '#10b981' }}></div>
        </div>
      </div>

      {currentQData ? (
        <div style={{ margin: '1.5rem 0', padding: '1.5rem', background: 'white', borderRadius: '0.5rem', border: '3px solid var(--sweden-blue)', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textAlign: 'left' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', color: 'var(--text-dark)' }}>
            {currentQData.text}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {currentQData.option1 && <div style={{ fontSize: '1rem', color: '#4b5563' }}><strong style={{ color: 'var(--sweden-blue)' }}>1:</strong> {currentQData.option1}</div>}
            {currentQData.optionX && <div style={{ fontSize: '1rem', color: '#4b5563' }}><strong style={{ color: 'var(--sweden-blue)' }}>X:</strong> {currentQData.optionX}</div>}
            {currentQData.option2 && <div style={{ fontSize: '1rem', color: '#4b5563' }}><strong style={{ color: 'var(--sweden-blue)' }}>2:</strong> {currentQData.option2}</div>}
          </div>
        </div>
      ) : (
        <div style={{ margin: '1.5rem 0', borderRadius: '0.5rem', overflow: 'hidden', border: '3px solid var(--sweden-blue)', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <img 
            src={`/quiz/q${currentQuestion}.png`} 
            alt={`Fråga ${currentQuestion}`} 
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </div>
      )}
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
        <button className="btn-secondary" style={{ fontSize: '1.5rem', padding: '1rem', border: answers[currentQuestion] === '1' ? '4px solid var(--sweden-blue)' : 'none' }} onClick={() => handleAnswer('1')}>1</button>
        <button className="btn-secondary" style={{ fontSize: '1.5rem', padding: '1rem', border: answers[currentQuestion] === 'X' ? '4px solid var(--sweden-blue)' : 'none' }} onClick={() => handleAnswer('X')}>X</button>
        <button className="btn-secondary" style={{ fontSize: '1.5rem', padding: '1rem', border: answers[currentQuestion] === '2' ? '4px solid var(--sweden-blue)' : 'none' }} onClick={() => handleAnswer('2')}>2</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
        <button 
          onClick={() => setCurrentQuestion((prev: number) => Math.max(1, prev - 1))}
          disabled={currentQuestion === 1 || isSubmitting}
          style={{ background: 'transparent', border: 'none', color: currentQuestion === 1 ? '#ccc' : 'var(--sweden-blue)', cursor: currentQuestion === 1 ? 'not-allowed' : 'pointer', fontWeight: 500 }}
        >
          &larr; Föregående
        </button>

        {currentQuestion < totalQuestions ? (
          <button 
            onClick={() => setCurrentQuestion((prev: number) => Math.min(totalQuestions, prev + 1))}
            disabled={!answers[currentQuestion] || isSubmitting}
            style={{ background: 'transparent', border: 'none', color: !answers[currentQuestion] ? '#ccc' : 'var(--sweden-blue)', cursor: !answers[currentQuestion] ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
          >
            Nästa &rarr;
          </button>
        ) : (
          <button
            onClick={submitAnswers}
            disabled={Object.keys(answers).length < totalQuestions || isSubmitting}
            style={{ background: 'transparent', border: 'none', color: Object.keys(answers).length < totalQuestions ? '#ccc' : 'var(--sweden-blue)', cursor: Object.keys(answers).length < totalQuestions ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
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
