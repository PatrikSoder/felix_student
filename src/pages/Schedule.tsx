import React from 'react';
import { Clock } from 'lucide-react';

const Schedule = () => {
  const events = [
    { time: '14:00', title: 'Mottagningen börjar', desc: 'Välkomstdrink och mingel' },
    { time: '15:30', title: 'Mat serveras', desc: 'Buffé' },
    { time: '17:00', title: 'Tipspromenad', desc: 'Dags att testa kunskaperna om Felix!' },
    { time: '19:00', title: 'Tårta & Kaffe', desc: 'Studenttårta' },
    { time: '21:00', title: 'Festen fortsätter', desc: 'Musik och bar' }
  ];

  return (
    <div className="glass-panel" style={{ padding: '2rem', marginTop: '2rem' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0 }}>
        <Clock /> Hålltider
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
        {events.map((evt, idx) => (
          <div key={idx} style={{ 
            display: 'flex', 
            gap: '1rem', 
            background: 'white', 
            padding: '1rem', 
            borderRadius: '0.5rem',
            borderLeft: '4px solid var(--sweden-blue)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}>
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
    </div>
  );
};

export default Schedule;
