
import { PartyPopper } from 'lucide-react';

const Home = () => {
  return (
    <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', marginTop: '2rem' }}>
      <PartyPopper size={48} color="var(--sweden-yellow)" style={{ margin: '0 auto', display: 'block' }} />
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Välkommen till Felix Student!</h1>
      <p style={{ fontSize: '1.2rem', lineHeight: '1.6', color: '#4b5563' }}>
        Den 29 maj firar vi att Felix har tagit studenten!
        Denna app är till för dig som gäst för att se dagens schema och delta i vår roliga tipspromenad.
      </p>

      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', flex: '1', minWidth: '200px' }}>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>Tid</h3>
          <p style={{ margin: 0, fontSize: '1.1rem' }}>Kl 16:00 - sent</p>
        </div>
        <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', flex: '1', minWidth: '200px' }}>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>Plats</h3>
          <p style={{ margin: 0, fontSize: '1.1rem' }}>
            <a href="https://maps.app.goo.gl/ASKgZ44ELink3urS9" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--sweden-blue)', textDecoration: 'none', fontWeight: 'bold' }}>
              Ekvägen 6, Landvetter
            </a>
          </p>
          <div style={{ marginTop: '1rem', width: '100%', height: '200px', borderRadius: '0.5rem', overflow: 'hidden' }}>
            <iframe
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              marginHeight={0}
              marginWidth={0}
              src="https://maps.google.com/maps?q=Ekv%C3%A4gen%206,%20Landvetter&t=&z=14&ie=UTF8&iwloc=&output=embed"
              title="Google Maps Location"
            ></iframe>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
