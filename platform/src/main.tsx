import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { PlatformProvider } from './context/PlatformContext';
import { IndexedDBStorageManager } from './services/storage';
import { StubAudioManager } from './services/audio-stub';
import { gameRegistry } from './config/gameRegistry';
import './styles/global.css';

const storageManager = new IndexedDBStorageManager();
storageManager.init().catch((err) => {
  console.warn('IndexedDB initialization failed. Running in-memory only:', err);
});

const audioManager = new StubAudioManager();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <PlatformProvider
        storageManager={storageManager}
        audioManager={audioManager}
        gameRegistry={gameRegistry}
      >
        <App />
      </PlatformProvider>
    </BrowserRouter>
  </StrictMode>,
);
