import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ASSETS from './config/assets';
import './styles/App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="app-header">
          <nav className="navbar">
            <div className="nav-brand">
              <img
                src={ASSETS.brand.logo}
                alt="董小姐 M98 品牌标识"
                width="48"
                height="48"
                style={{ borderRadius: '12px', marginRight: '12px' }}
              />
              <h1>M98 董小姐</h1>
              <span className="tagline">电子 × 东方 × 未来</span>
            </div>
            <div className="nav-links">
              <a href="#music">音乐</a>
              <a href="#about">关于</a>
              <a href="#community">社区</a>
              <a href="#exclusive">独家</a>
            </div>
          </nav>
        </header>
        
        <main className="app-main">
          <Routes>
            <Route path="/" element={<HomePage />} />
            {/* 其他路由将在后续添加 */}
          </Routes>
        </main>
        
        <footer className="app-footer">
          <p>&copy; 2024 M98 董小姐. All rights reserved.</p>
          <div className="footer-links">
            <a href="#privacy">隐私政策</a>
            <a href="#terms">使用条款</a>
            <a href="#contact">联系我们</a>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
