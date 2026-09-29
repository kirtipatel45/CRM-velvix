import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { CandidateAuthProvider } from './context/CandidateAuthContext';
import { NotificationProvider } from './context/NotificationContext';

// Inter — base UI face
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";

// Inter Tight — hero numbers only
import "@fontsource/inter-tight/700.css";
import "@fontsource/inter-tight/800.css";

// Abril Fatface — BenchTrix brand logo
import "@fontsource/abril-fatface/400.css";

import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CandidateAuthProvider>
          <NotificationProvider>
            <App />
          </NotificationProvider>
        </CandidateAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
