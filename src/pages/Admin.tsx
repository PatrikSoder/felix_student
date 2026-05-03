import { useState, useEffect } from 'react';
import { signInWithPopup, onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';

// Ändra dessa till era faktiska e-postadresser!
const ALLOWED_EMAILS = ['patrik.soder@gmail.com', 'hellekk@gmail.com'];

interface TeamAnswer {
  id: string;
  teamName: string;
  answers: Record<number, string>;
  timestamp: any;
  isFinished?: boolean;
}

const Admin = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<TeamAnswer[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser && currentUser.email && ALLOWED_EMAILS.includes(currentUser.email)) {
        fetchAnswers();
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchAnswers = async () => {
    try {
      const q = query(collection(db, 'quizwalk_answers'), orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      const data: TeamAnswer[] = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as TeamAnswer);
      });
      setAnswers(data);
    } catch (err) {
      console.error(err);
      setError('Kunde inte hämta svar. Kontrollera att dina Firestore-regler tillåter läsning för inloggade admins.');
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
    signOut(auth);
    setAnswers([]);
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

import { Users, LogOut } from 'lucide-react';

  return (
    <div className="glass-panel" style={{ padding: '2rem', marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '2px solid rgba(0,0,0,0.05)', paddingBottom: '1rem' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'var(--sweden-yellow)', borderRadius: '50%', padding: '0.5rem', display: 'flex', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <Users size={24} color="var(--sweden-blue)" />
          </div>
          Svarsresultat ({answers.length})
        </h2>
        <button onClick={handleLogout} className="btn-secondary" style={{ padding: '0.5rem 1rem', width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
          <LogOut size={18} /> Logga ut
        </button>
      </div>

      {error && <div style={{ color: '#b91c1c', marginBottom: '1.5rem', padding: '1rem', background: '#fee2e2', borderRadius: '0.5rem', border: '1px solid #f87171' }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {answers.map((team, index) => (
          <div key={team.id} className="admin-card" style={{ animationDelay: `${index * 0.05}s` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-dark)', fontWeight: 700 }}>{team.teamName}</h3>
              {team.isFinished && (
                <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#166534', padding: '0.25rem 0.75rem', borderRadius: '2rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Inlämnad
                </span>
              )}
            </div>
            
            <div className="answer-grid">
              {Array.from({ length: 10 }, (_, i) => {
                const qNum = i + 1;
                const ans = team.answers[qNum];
                let badgeClass = 'badge-empty';
                if (ans === '1') badgeClass = 'badge-1';
                else if (ans === 'X') badgeClass = 'badge-X';
                else if (ans === '2') badgeClass = 'badge-2';
                
                return (
                  <div key={qNum} className={`answer-badge ${badgeClass}`}>
                    <span className="question-number">Q{qNum}</span>
                    <span>{ans || '-'}</span>
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
    </div>
  );
};

export default Admin;
