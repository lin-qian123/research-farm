import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import 'katex/dist/katex.min.css';
import './styles/base.css';
import './styles/theme-paper.css';
import './styles/theme-journal.css';
import './styles/theme-slate.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
