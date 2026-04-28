import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Schedule from './pages/Schedule';
import QuizWalk from './pages/QuizWalk';
import Menu from './pages/Menu';
import { GraduationCap, Calendar, Footprints, Utensils } from 'lucide-react';
import './index.css';

const Navigation = () => {
  const location = useLocation();
  
  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">
        <GraduationCap size={24} />
        Felix Student
      </Link>
      <div className="nav-links">
        <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
          Start
        </Link>
        <Link to="/schema" className={`nav-link ${location.pathname === '/schema' ? 'active' : ''}`}>
          <Calendar size={20} className="mobile-icon" style={{display: 'none'}} />
          <span className="nav-text">Schema</span>
        </Link>
        <Link to="/meny" className={`nav-link ${location.pathname === '/meny' ? 'active' : ''}`}>
          <Utensils size={20} className="mobile-icon" style={{display: 'none'}} />
          <span className="nav-text">Meny</span>
        </Link>
        <Link to="/tipspromenad" className={`nav-link ${location.pathname === '/tipspromenad' ? 'active' : ''}`}>
          <Footprints size={20} className="mobile-icon" style={{display: 'none'}} />
          <span className="nav-text">Tipspromenad</span>
        </Link>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <Navigation />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/schema" element={<Schedule />} />
          <Route path="/meny" element={<Menu />} />
          <Route path="/tipspromenad" element={<QuizWalk />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
