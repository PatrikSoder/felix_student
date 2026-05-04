
import { Clock } from 'lucide-react';

const Schedule = () => {
  const events = [
    { time: '16:00', title: 'Mottagningen börjar', desc: 'Välkomstdrink och mingel' },
    { time: '17:00 - 19:00', title: 'Mat serveras', desc: 'Buffé' },
    { time: '18:00 - 20:00', title: 'Tårta & Kaffe', desc: 'Studenttårta' },
    { time: '21:00 - ??', title: 'Festen fortsätter', desc: 'Musik och bar' }
  ];

  const ongoing = {
    time: '16:30 - 20:00',
    title: 'Tipspromenad',
    desc: 'Gå rundan när det passar er! Sista inlämning kl 20:00.'
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem', marginTop: '2rem' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0 }}>
        <Clock /> Hålltider
      </h2>

      <div className="schedule-grid" style={{ marginTop: '1.5rem' }}>
        {/* Main Timeline Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 className="schedule-column-title">Schema</h3>
          {events.map((evt, idx) => (
            <div key={idx} className="event-card">
              <div style={{ fontWeight: 'bold', color: 'var(--sweden-blue)', minWidth: '60px' }}>
                {evt.time}
              </div>
              <div>
                <h4 style={{ margin: '0 0 0.25rem 0' }}>{evt.title}</h4>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>{evt.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Ongoing Activity Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 className="schedule-column-title">Pågående</h3>
          <div className="ongoing-card">
            <div className="ongoing-badge">
              ÖPPEN
            </div>
            <div style={{ fontWeight: 'bold', color: 'var(--sweden-blue)' }}>
              {ongoing.time}
            </div>
            <h4 style={{ margin: '0.25rem 0' }}>{ongoing.title}</h4>
            <p style={{ margin: 0, color: '#4b5563', fontSize: '0.95rem', lineHeight: '1.4' }}>{ongoing.desc}</p>
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(0, 82, 147, 0.05)', borderRadius: '0.4rem', fontSize: '0.85rem', color: 'var(--sweden-blue)', fontWeight: 500 }}>
              Svaren lämnas in via appen under fliken "Tipspromenad".
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Schedule;
