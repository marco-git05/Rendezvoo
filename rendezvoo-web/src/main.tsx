import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';

import App from './App';
import { AppDataProvider } from './data/AppData';
import { ThemeProvider } from './theme';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AppDataProvider>
        <HashRouter>
          <App />
        </HashRouter>
      </AppDataProvider>
    </ThemeProvider>
  </StrictMode>,
);
