import React, { useState, useEffect } from 'react';
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

  return (
    <div className="glass-panel" style={{ padding: '2rem', marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Inkomna Svar ({answers.length})</h2>
        <button onClick={handleLogout} className="btn-secondary" style={{ padding: '0.5rem 1rem' }}>
          Logga ut
        </button>
      </div>

      {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--sweden-blue)' }}>
              <th style={{ padding: '1rem' }}>Lagnamn</th>
              <th style={{ padding: '1rem' }}>Svar (1-10)</th>
            </tr>
          </thead>
          <tbody>
            {answers.map((team) => {
              const answerString = Array.from({ length: 10 }, (_, i) => team.answers[i + 1] || '-').join(' | ');
              return (
                <tr key={team.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>{team.teamName}</td>
                  <td style={{ padding: '1rem', letterSpacing: '2px' }}>{answerString}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {answers.length === 0 && !error && (
          <p style={{ textAlign: 'center', marginTop: '2rem', color: '#666' }}>Inga svar har kommit in ännu.</p>
        )}
      </div>
    </div>
  );
};

export default Admin;
