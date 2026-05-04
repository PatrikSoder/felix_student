
import { Utensils } from 'lucide-react';

const Menu = () => {
  return (
    <div className="glass-panel" style={{ padding: '2rem', marginTop: '2rem' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0 }}>
        <Utensils /> Meny
      </h2>

      <div style={{ marginTop: '1.5rem', background: 'white', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
        <h3 style={{ color: 'var(--sweden-blue)', borderBottom: '2px solid var(--sweden-yellow)', paddingBottom: '0.5rem', marginTop: 0 }}>
          Buffé
        </h3>
        <ul style={{ listStyleType: 'none', padding: 0, lineHeight: '1.8' }}>
          <li>🍖 Grillat kött - amerikanskt tema</li>
          <li>🥗 majssallad</li>
          <li>🥒 Sallad</li>
          <li>🥖 Nybakat bröd och smör</li>
        </ul>

        <h3 style={{ color: 'var(--sweden-blue)', borderBottom: '2px solid var(--sweden-yellow)', paddingBottom: '0.5rem', marginTop: '2rem' }}>
          Dryck
        </h3>
        <ul style={{ listStyleType: 'none', padding: 0, lineHeight: '1.8' }}>
          <li>🥂 Fördrink & Bubbel</li>
          <li>🍺 Öl och Vin</li>
          <li>🥤 Läsk, Loka och saft</li>
        </ul>

        <h3 style={{ color: 'var(--sweden-blue)', borderBottom: '2px solid var(--sweden-yellow)', paddingBottom: '0.5rem', marginTop: '2rem' }}>
          Efterrätt
        </h3>
        <ul style={{ listStyleType: 'none', padding: 0, lineHeight: '1.8' }}>
          <li>🍰 Studenttårta</li>
          <li>☕ Kaffe och Te</li>
        </ul>
      </div>
    </div>
  );
};

export default Menu;
