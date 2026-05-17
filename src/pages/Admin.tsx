import { useState, useEffect, useRef, useCallback } from 'react';
import { Users, LogOut, FileQuestion, Plus, Trash2, Edit2, Save, GripVertical, ImagePlus, X, Printer } from 'lucide-react';
import { signInWithPopup, onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { collection, onSnapshot, orderBy, query, doc, getDoc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, googleProvider, db, storage } from '../firebase';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';

const ALLOWED_EMAILS = ['patrik.soder@gmail.com', 'hellekk@gmail.com'];

interface TeamAnswer {
  id: string;
  teamName: string;
  answers: Record<number, string>;
  timestamp: Timestamp | null;
  isFinished?: boolean;
  isAbandoned?: boolean;
}

export interface Question {
  id: string;
  text: string;
  option1: string;
  optionX: string;
  option2: string;
  correctAnswer: '1' | 'X' | '2';
  imageUrl?: string;
}

const getCroppedImg = (imageSrc: string, pixelCrop: Area): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => {
      const canvas = document.createElement('canvas');
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas is empty')), 'image/jpeg', 0.88);
    });
    image.addEventListener('error', reject);
    image.src = imageSrc;
  });

const Admin = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<TeamAnswer[]>([]);
  const [correctAnswers, setCorrectAnswers] = useState<Record<number, string> | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Tabs & Views
  const [activeTab, setActiveTab] = useState<'results' | 'questions'>('results');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [revealStep, setRevealStep] = useState<number>(0);

  // Questions State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isSavingQuestions, setIsSavingQuestions] = useState(false);

  // Image crop state
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const answersUnsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser && currentUser.email && ALLOWED_EMAILS.includes(currentUser.email)) {
        fetchData();
      }
    });

    return () => {
      unsubscribeAuth();
      answersUnsubscribeRef.current?.();
    };
  }, []);

  const fetchData = async () => {
    try {
      let currentQuestions: Question[] = [];
      try {
        const qDoc = await getDoc(doc(db, 'quizwalk_config', 'questions'));
        if (qDoc.exists()) {
          currentQuestions = qDoc.data().questions || [];
          setQuestions(currentQuestions);
        }
      } catch (e) {
        console.log("Inga frågor hittades.");
      }

      if (currentQuestions.length > 0) {
        const newCorrectAnswers: Record<number, string> = {};
        currentQuestions.forEach((q: Question, i: number) => {
          newCorrectAnswers[i + 1] = q.correctAnswer;
        });
        setCorrectAnswers(newCorrectAnswers);
      } else {
        try {
          const configDoc = await getDoc(doc(db, 'quizwalk_config', 'correct_answers'));
          if (configDoc.exists()) {
            setCorrectAnswers(configDoc.data().answers || null);
          }
        } catch (e) {
          console.log("Inget facit hittades (eller saknar rättigheter).");
        }
      }

      const q = query(collection(db, 'quizwalk_answers'), orderBy('timestamp', 'desc'));
      answersUnsubscribeRef.current = onSnapshot(q, (snapshot) => {
        const data: TeamAnswer[] = [];
        snapshot.forEach((d) => {
          if (!d.data().isAbandoned) {
            data.push({ id: d.id, ...d.data() } as TeamAnswer);
          }
        });
        setAnswers(data);
      }, (err) => {
        console.error(err);
        setError('Kunde inte hämta data. Kontrollera att dina Firestore-regler tillåter läsning.');
      });
    } catch (err) {
      console.error(err);
      setError('Kunde inte hämta data. Kontrollera att dina Firestore-regler tillåter läsning.');
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const handleLogout = () => {
    answersUnsubscribeRef.current?.();
    answersUnsubscribeRef.current = null;
    signOut(auth);
    setAnswers([]);
  };

  const handleDeleteTeam = async (team: TeamAnswer) => {
    if (!window.confirm(`Ta bort "${team.teamName}"?`)) return;
    if (!window.confirm(`Är du helt säker? "${team.teamName}" raderas permanent.`)) return;
    try {
      await deleteDoc(doc(db, 'quizwalk_answers', team.id));
    } catch (err) {
      console.error(err);
      setError('Kunde inte radera laget.');
    }
  };

  const saveQuestionsToDb = async (newQuestions: Question[]) => {
    setIsSavingQuestions(true);
    try {
      await setDoc(doc(db, 'quizwalk_config', 'questions'), { questions: newQuestions });

      // Strip correctAnswer before writing the public doc so students can't read it
      const publicQuestions = newQuestions.map(({ correctAnswer: _ca, ...rest }) => rest);
      await setDoc(doc(db, 'quizwalk_config', 'questions_public'), { questions: publicQuestions });

      setQuestions(newQuestions);

      const newCorrectAnswers: Record<number, string> = {};
      newQuestions.forEach((q: Question, i: number) => {
        newCorrectAnswers[i + 1] = q.correctAnswer;
      });
      setCorrectAnswers(newCorrectAnswers);
      setEditingQuestion(null);
    } catch (err) {
      console.error(err);
      setError('Kunde inte spara frågorna till databasen.');
    } finally {
      setIsSavingQuestions(false);
    }
  };

  const handleAddQuestion = () => {
    setEditingQuestion({
      id: Date.now().toString(),
      text: '',
      option1: '',
      optionX: '',
      option2: '',
      correctAnswer: '1'
    });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setCropSrc(objectUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleCropConfirm = async () => {
    if (!cropSrc || !croppedAreaPixels || !editingQuestion) return;
    setIsUploadingImage(true);
    try {
      const blob = await getCroppedImg(cropSrc, croppedAreaPixels);
      const storageRef = ref(storage, `quiz-images/${editingQuestion.id}.jpg`);
      const snapshot = await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
      const url = await getDownloadURL(snapshot.ref);
      setEditingQuestion(prev => prev ? { ...prev, imageUrl: url } : prev);
      URL.revokeObjectURL(cropSrc);
      setCropSrc(null);
    } catch (err) {
      console.error(err);
      setError('Kunde inte ladda upp bilden. Kontrollera att Firebase Storage är aktiverat.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleCloseCrop = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  };

  const esc = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const handlePrint = () => {
    if (questions.length === 0) return;
    const pages = questions.map((q, i) => `
      <div class="page">
        <div class="header">
          <span class="title">Tipspromenaden</span>
          <span class="num">Fråga ${i + 1}<span class="total"> / ${questions.length}</span></span>
        </div>
        ${q.imageUrl ? `<div class="img-wrap"><img src="${q.imageUrl}" /></div>` : '<div class="img-placeholder"></div>'}
        <div class="question">${esc(q.text)}</div>
        <div class="options">
          <div class="opt"><div class="letter">1</div>${q.option1 ? `<div class="opt-text">${esc(q.option1)}</div>` : ''}</div>
          <div class="opt"><div class="letter">X</div>${q.optionX ? `<div class="opt-text">${esc(q.optionX)}</div>` : ''}</div>
          <div class="opt"><div class="letter">2</div>${q.option2 ? `<div class="opt-text">${esc(q.option2)}</div>` : ''}</div>
        </div>
      </div>`).join('');

    const win = window.open('', '_blank');
    if (!win) { alert('Tillåt popup-fönster för att skriva ut.'); return; }
    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <title>Tipspromenaden – Frågor</title>
      <style>
        @page { size: A4 portrait; margin: 15mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; background: white; }
        .page {
          width: 180mm; height: 267mm;
          page-break-after: always;
          display: flex; flex-direction: column; gap: 10mm;
        }
        .page:last-child { page-break-after: avoid; }
        .header {
          display: flex; justify-content: space-between; align-items: baseline;
          border-bottom: 3px solid #003f8a; padding-bottom: 4mm;
        }
        .title { font-size: 13pt; font-weight: bold; color: #003f8a; letter-spacing: 1px; text-transform: uppercase; }
        .num { font-size: 26pt; font-weight: bold; color: #003f8a; }
        .total { font-size: 14pt; color: #888; }
        .img-wrap { flex: 1; min-height: 0; overflow: hidden; border-radius: 6px; }
        .img-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .img-placeholder { flex: 1; min-height: 0; border: 2px dashed #ccc; border-radius: 6px; }
        .question { font-size: 20pt; font-weight: bold; line-height: 1.35; color: #111; }
        .options { display: flex; gap: 5mm; }
        .opt {
          flex: 1; border: 2.5px solid #003f8a; border-radius: 8px;
          padding: 5mm; display: flex; flex-direction: column; align-items: center; gap: 3mm;
        }
        .letter { font-size: 30pt; font-weight: bold; color: #003f8a; line-height: 1; }
        .opt-text { font-size: 11pt; text-align: center; color: #333; }
      </style>
    </head><body>${pages}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  const handleDeleteQuestion = (id: string) => {
    if (window.confirm('Är du säker på att du vill ta bort denna fråga?')) {
      const updated = questions.filter(q => q.id !== id);
      saveQuestionsToDb(updated);
    }
  };

  const handleSaveEdit = () => {
    if (!editingQuestion) return;
    if (!editingQuestion.text.trim()) {
      alert("Frågan måste ha en text.");
      return;
    }
    
    const isNew = !questions.find(q => q.id === editingQuestion.id);
    let updated: Question[];
    if (isNew) {
      updated = [...questions, editingQuestion];
    } else {
      updated = questions.map(q => q.id === editingQuestion.id ? editingQuestion : q);
    }
    saveQuestionsToDb(updated);
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const updated = [...questions];
      const temp = updated[index];
      updated[index] = updated[index - 1];
      updated[index - 1] = temp;
      saveQuestionsToDb(updated);
    } else if (direction === 'down' && index < questions.length - 1) {
      const updated = [...questions];
      const temp = updated[index];
      updated[index] = updated[index + 1];
      updated[index + 1] = temp;
      saveQuestionsToDb(updated);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Laddar...</div>;
  }

  if (!user) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', marginTop: '2rem' }}>
        <h2>Admin Login</h2>
        <p style={{ marginBottom: '2rem' }}>Denna sida är endast för arrangörer.</p>
        <button onClick={handleLogin} className="btn-primary">
          Logga in med Google
        </button>
      </div>
    );
  }

  if (user.email && !ALLOWED_EMAILS.includes(user.email)) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', marginTop: '2rem' }}>
        <h2>Åtkomst nekad</h2>
        <p>Inloggad som: {user.email}</p>
        <p>Denna e-postadress saknar adminrättigheter.</p>
        <button onClick={handleLogout} className="btn-secondary" style={{ marginTop: '1rem' }}>
          Logga ut
        </button>
      </div>
    );
  }

  const scoredTeams = answers.map(team => {
    const score = correctAnswers ? Array.from({ length: Object.keys(correctAnswers).length }, (_, i) => team.answers[i + 1] === correctAnswers[i + 1]).filter(Boolean).length : 0;
    return { ...team, score };
  });
  const uniqueScores = Array.from(new Set(scoredTeams.map(t => t.score))).sort((a, b) => b - a);

  const place1Teams = uniqueScores.length > 0 ? scoredTeams.filter(t => t.score === uniqueScores[0]) : [];
  const place2Teams = uniqueScores.length > 1 ? scoredTeams.filter(t => t.score === uniqueScores[1]) : [];
  const place3Teams = uniqueScores.length > 2 ? scoredTeams.filter(t => t.score === uniqueScores[2]) : [];

  const effectiveRevealStep = Math.max(revealStep, 3 - Math.min(3, uniqueScores.length));

  return (
    <div className="glass-panel" style={{ padding: '2rem', marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '2px solid rgba(0,0,0,0.05)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'var(--sweden-yellow)', borderRadius: '50%', padding: '0.5rem', display: 'flex', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <Users size={24} color="var(--sweden-blue)" />
          </div>
          Admin Panel
        </h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.05)', borderRadius: '0.5rem', padding: '0.25rem' }}>
            <button 
              onClick={() => setActiveTab('results')} 
              className={activeTab === 'results' ? 'btn-primary' : 'btn-secondary'} 
              style={{ padding: '0.5rem 1rem', width: 'auto', border: 'none', background: activeTab === 'results' ? 'var(--sweden-blue)' : 'transparent', color: activeTab === 'results' ? 'white' : '#4b5563', boxShadow: activeTab === 'results' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none' }}>
              <Users size={18} style={{ marginRight: '0.5rem', display: 'inline' }} /> Resultat
            </button>
            <button 
              onClick={() => setActiveTab('questions')} 
              className={activeTab === 'questions' ? 'btn-primary' : 'btn-secondary'} 
              style={{ padding: '0.5rem 1rem', width: 'auto', border: 'none', background: activeTab === 'questions' ? 'var(--sweden-blue)' : 'transparent', color: activeTab === 'questions' ? 'white' : '#4b5563', boxShadow: activeTab === 'questions' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none' }}>
              <FileQuestion size={18} style={{ marginRight: '0.5rem', display: 'inline' }} /> Frågor
            </button>
          </div>
          <button onClick={handleLogout} className="btn-secondary" style={{ padding: '0.5rem 1rem', width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
            <LogOut size={18} /> Logga ut
          </button>
        </div>
      </div>

      {error && <div style={{ color: '#b91c1c', marginBottom: '1.5rem', padding: '1rem', background: '#fee2e2', borderRadius: '0.5rem', border: '1px solid #f87171' }}>{error}</div>}

      {/* QUESTIONS TAB */}
      {activeTab === 'questions' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0 }}>Tipspromenad Frågor ({questions.length})</h3>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {questions.length > 0 && (
                <button onClick={handlePrint} className="btn-secondary" style={{ padding: '0.5rem 1rem', width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Printer size={18} /> Skriv ut
                </button>
              )}
              <button onClick={handleAddQuestion} className="btn-primary" style={{ padding: '0.5rem 1rem', width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={18} /> Lägg till fråga
              </button>
            </div>
          </div>

          {editingQuestion && (
            <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '0.5rem', border: '2px solid var(--sweden-blue)', marginBottom: '2rem' }}>
              <h4 style={{ margin: '0 0 1rem 0' }}>{questions.find(q => q.id === editingQuestion.id) ? 'Redigera fråga' : 'Ny fråga'}</h4>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Fråga</label>
                <textarea 
                  value={editingQuestion.text}
                  onChange={e => setEditingQuestion({...editingQuestion, text: e.target.value})}
                  placeholder="Skriv din fråga här..."
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', minHeight: '80px', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Svarsalternativ 1</label>
                  <input 
                    type="text" 
                    value={editingQuestion.option1}
                    onChange={e => setEditingQuestion({...editingQuestion, option1: e.target.value})}
                    placeholder="Svarsalternativ 1..."
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Svarsalternativ X</label>
                  <input 
                    type="text" 
                    value={editingQuestion.optionX}
                    onChange={e => setEditingQuestion({...editingQuestion, optionX: e.target.value})}
                    placeholder="Svarsalternativ X..."
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Svarsalternativ 2</label>
                  <input 
                    type="text" 
                    value={editingQuestion.option2}
                    onChange={e => setEditingQuestion({...editingQuestion, option2: e.target.value})}
                    placeholder="Svarsalternativ 2..."
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Rätt Svar</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  {['1', 'X', '2'].map(opt => (
                    <button 
                      key={opt}
                      onClick={() => setEditingQuestion({...editingQuestion, correctAnswer: opt as '1'|'X'|'2'})}
                      style={{ 
                        flex: 1, padding: '0.75rem', borderRadius: '0.5rem', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer',
                        background: editingQuestion.correctAnswer === opt ? 'var(--sweden-blue)' : 'white',
                        color: editingQuestion.correctAnswer === opt ? 'white' : '#4b5563',
                        border: editingQuestion.correctAnswer === opt ? '2px solid var(--sweden-blue)' : '2px solid #cbd5e1'
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Image upload */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Bild (valfritt)</label>
                {editingQuestion.imageUrl && (
                  <div style={{ position: 'relative', display: 'inline-block', marginBottom: '0.75rem' }}>
                    <img src={editingQuestion.imageUrl} alt="Frågebild" style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', borderRadius: '0.5rem', display: 'block' }} />
                    <button
                      type="button"
                      onClick={() => setEditingQuestion({ ...editingQuestion, imageUrl: undefined })}
                      title="Ta bort bild"
                      style={{ position: 'absolute', top: 6, right: 6, background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary"
                  style={{ padding: '0.5rem 1rem', width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <ImagePlus size={16} /> {editingQuestion.imageUrl ? 'Byt bild' : 'Välj & beskär bild'}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button onClick={() => setEditingQuestion(null)} className="btn-secondary" style={{ padding: '0.5rem 1rem', width: 'auto' }}>Avbryt</button>
                <button onClick={handleSaveEdit} className="btn-primary" disabled={isSavingQuestions} style={{ padding: '0.5rem 1rem', width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Save size={18} /> {isSavingQuestions ? 'Sparar...' : 'Spara Fråga'}
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {questions.map((q, index) => (
              <div key={q.id} style={{ background: 'white', borderRadius: '0.5rem', padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'flex-start', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <button onClick={() => moveQuestion(index, 'up')} disabled={index === 0} style={{ background: 'none', border: 'none', cursor: index === 0 ? 'not-allowed' : 'pointer', opacity: index === 0 ? 0.3 : 1 }}>
                    <GripVertical size={16} />
                  </button>
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--sweden-blue)', textAlign: 'center' }}>{index + 1}</span>
                  <button onClick={() => moveQuestion(index, 'down')} disabled={index === questions.length - 1} style={{ background: 'none', border: 'none', cursor: index === questions.length - 1 ? 'not-allowed' : 'pointer', opacity: index === questions.length - 1 ? 0.3 : 1 }}>
                    <GripVertical size={16} />
                  </button>
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    {q.imageUrl && (
                      <img src={q.imageUrl} alt="" style={{ width: 72, height: 48, objectFit: 'cover', borderRadius: '0.25rem', flexShrink: 0 }} />
                    )}
                    <div>
                      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>{q.text}</h4>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', color: '#4b5563' }}>
                        <span style={{ fontWeight: q.correctAnswer === '1' ? 'bold' : 'normal', color: q.correctAnswer === '1' ? '#10b981' : 'inherit' }}>1: {q.option1 || '-'}</span>
                        <span style={{ fontWeight: q.correctAnswer === 'X' ? 'bold' : 'normal', color: q.correctAnswer === 'X' ? '#10b981' : 'inherit' }}>X: {q.optionX || '-'}</span>
                        <span style={{ fontWeight: q.correctAnswer === '2' ? 'bold' : 'normal', color: q.correctAnswer === '2' ? '#10b981' : 'inherit' }}>2: {q.option2 || '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => setEditingQuestion(q)} style={{ background: '#f1f5f9', border: 'none', padding: '0.5rem', borderRadius: '0.25rem', cursor: 'pointer', color: '#475569' }} title="Redigera">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => handleDeleteQuestion(q.id)} style={{ background: '#fee2e2', border: 'none', padding: '0.5rem', borderRadius: '0.25rem', cursor: 'pointer', color: '#ef4444' }} title="Ta bort">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}

            {questions.length === 0 && !editingQuestion && (
               <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'rgba(255,255,255,0.5)', borderRadius: '1rem', border: '2px dashed #d1d5db' }}>
                <FileQuestion size={48} color="#9ca3af" style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.5 }} />
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#4b5563' }}>Inga frågor upplagda</h3>
                <p style={{ color: '#6b7280', margin: 0 }}>Lägg till din första fråga för att börja bygga tipspromenaden!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RESULTS TAB */}
      {activeTab === 'results' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0 }}>Svarsresultat ({answers.length})</h3>
            <button onClick={() => setShowLeaderboard(!showLeaderboard)} className="btn-secondary" style={{ padding: '0.5rem 1rem', width: 'auto' }}>
              {showLeaderboard ? 'Dölj Prisutdelning' : 'Visa Prisutdelning'}
            </button>
          </div>

          {showLeaderboard && (
            <div className="admin-card" style={{ marginBottom: '2rem', background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', border: 'none', borderLeft: '4px solid var(--sweden-yellow)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>🏆 Prisutdelning</h3>
                <button onClick={() => setRevealStep(0)} className="btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', background: 'white', width: 'auto' }}>Återställ</button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
                {!correctAnswers || Object.keys(correctAnswers).length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', background: 'white', borderRadius: '0.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#b45309', fontSize: '1.2rem' }}>Frågor/Facit saknas</h4>
                    <p style={{ margin: 0, color: '#4b5563' }}>Topplistan kan inte beräknas förrän frågor och svar har lagts in.</p>
                  </div>
                ) : (
                  <>
                    {/* 3rd place */}
                    {uniqueScores.length > 2 && (
                      <div style={{ padding: '1rem', background: 'white', borderRadius: '0.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h4 style={{ margin: 0, color: '#b45309' }}>🥉 Tredje plats</h4>
                          {effectiveRevealStep < 1 ? (
                            <button onClick={() => setRevealStep(1)} className="btn-secondary" style={{ padding: '0.5rem 1rem', width: 'auto' }}>Avslöja</button>
                          ) : (
                            <span style={{ fontWeight: 'bold' }}>{uniqueScores[2]} poäng</span>
                          )}
                        </div>
                        {effectiveRevealStep >= 1 && (
                          <div style={{ marginTop: '0.5rem', fontSize: '1.2rem', fontWeight: 'bold' }}>
                            {place3Teams.map(t => t.teamName).join(', ')}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 2nd place */}
                    {uniqueScores.length > 1 && (
                      <div style={{ padding: '1rem', background: 'white', borderRadius: '0.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', opacity: effectiveRevealStep >= 1 ? 1 : 0.5 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h4 style={{ margin: 0, color: '#94a3b8' }}>🥈 Andra plats</h4>
                          {effectiveRevealStep >= 1 && effectiveRevealStep < 2 ? (
                            <button onClick={() => setRevealStep(2)} className="btn-secondary" style={{ padding: '0.5rem 1rem', width: 'auto' }}>Avslöja</button>
                          ) : effectiveRevealStep >= 2 ? (
                            <span style={{ fontWeight: 'bold' }}>{uniqueScores[1]} poäng</span>
                          ) : null}
                        </div>
                        {effectiveRevealStep >= 2 && (
                          <div style={{ marginTop: '0.5rem', fontSize: '1.2rem', fontWeight: 'bold' }}>
                            {place2Teams.map(t => t.teamName).join(', ')}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 1st place */}
                    {uniqueScores.length > 0 && (
                      <div style={{ padding: '1rem', background: 'white', borderRadius: '0.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', opacity: effectiveRevealStep >= 2 ? 1 : 0.5, border: effectiveRevealStep >= 3 ? '2px solid var(--sweden-yellow)' : 'none' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h4 style={{ margin: 0, color: '#ca8a04' }}>🥇 Vinnare!</h4>
                          {effectiveRevealStep >= 2 && effectiveRevealStep < 3 ? (
                            <button onClick={() => setRevealStep(3)} className="btn-primary" style={{ padding: '0.5rem 1rem', width: 'auto' }}>Avslöja</button>
                          ) : effectiveRevealStep >= 3 ? (
                            <span style={{ fontWeight: 'bold' }}>{uniqueScores[0]} poäng</span>
                          ) : null}
                        </div>
                        {effectiveRevealStep >= 3 && (
                          <div style={{ marginTop: '0.5rem', fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--sweden-blue)' }}>
                            {place1Teams.map(t => t.teamName).join(', ')}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {!showLeaderboard && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {answers.map((team, index) => (
              <div key={team.id} className="admin-card" style={{ animationDelay: `${index * 0.05}s` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-dark)', fontWeight: 700 }}>{team.teamName}</h3>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    {correctAnswers && Object.keys(correctAnswers).length > 0 && (
                      <span style={{ fontSize: '0.9rem', background: 'var(--sweden-blue)', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '2rem', fontWeight: 700, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                        {Array.from({ length: Object.keys(correctAnswers).length }, (_, i) => team.answers[i + 1] === correctAnswers[i + 1]).filter(Boolean).length} / {Object.keys(correctAnswers).length} Rätt
                      </span>
                    )}
                    {team.isFinished && (
                      <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#166534', padding: '0.25rem 0.75rem', borderRadius: '2rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Inlämnad
                      </span>
                    )}
                    <button
                      onClick={() => handleDeleteTeam(team)}
                      style={{ background: '#fee2e2', border: 'none', padding: '0.4rem', borderRadius: '0.25rem', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }}
                      title="Ta bort lag"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="answer-grid">
                  {Array.from({ length: questions.length > 0 ? questions.length : 10 }, (_, i) => {
                    const qNum = i + 1;
                    const ans = team.answers[qNum];
                    let badgeClass = 'badge-empty';
                    if (ans === '1') badgeClass = 'badge-1';
                    else if (ans === 'X') badgeClass = 'badge-X';
                    else if (ans === '2') badgeClass = 'badge-2';

                    let isCorrect = undefined;
                    if (correctAnswers && ans) {
                      isCorrect = ans === correctAnswers[qNum];
                    }

                    return (
                      <div key={qNum} className={`answer-badge ${badgeClass}`} style={{ position: 'relative' }}>
                        <span className="question-number">Q{qNum}</span>
                        <span>{ans || '-'}</span>
                        {isCorrect === true && <div style={{ position: 'absolute', top: -6, right: -6, background: '#10b981', color: 'white', borderRadius: '50%', width: 18, height: 18, fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', border: '2px solid white' }}>✓</div>}
                        {isCorrect === false && <div style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: 'white', borderRadius: '50%', width: 18, height: 18, fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', border: '2px solid white' }}>✕</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {answers.length === 0 && !error && (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'rgba(255,255,255,0.5)', borderRadius: '1rem', border: '2px dashed #d1d5db' }}>
                <Users size={48} color="#9ca3af" style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.5 }} />
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#4b5563' }}>Inga lag ännu</h3>
                <p style={{ color: '#6b7280', margin: 0 }}>Svaren kommer att dyka upp här i realtid när lagen börjar spela tipspromenaden!</p>
              </div>
            )}
          </div>
          )}
        </>
      )}
      {/* Crop modal */}
      {cropSrc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '1rem', width: '100%', maxWidth: 560, padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>Beskär bild</h3>
            <div style={{ position: 'relative', height: 280, borderRadius: '0.5rem', overflow: 'hidden', background: '#111' }}>
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={16 / 9}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div style={{ marginTop: '1rem' }}>
              <label style={{ fontSize: '0.85rem', color: '#6b7280' }}>Zoom</label>
              <input
                type="range" min={1} max={3} step={0.05} value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                style={{ width: '100%', marginTop: '0.25rem' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.25rem' }}>
              <button onClick={handleCloseCrop} className="btn-secondary" style={{ padding: '0.5rem 1rem', width: 'auto' }}>Avbryt</button>
              <button onClick={handleCropConfirm} className="btn-primary" disabled={isUploadingImage} style={{ padding: '0.5rem 1rem', width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {isUploadingImage ? 'Laddar upp...' : 'Spara beskärning'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
