import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { FeatureFlagProvider } from '@kids-games-zone/shared';
import type { FeatureFlags } from '@kids-games-zone/shared';
import { PlatformProvider } from './context/PlatformContext';
import { IndexedDBStorageManager } from './services/storage';
import featureFlags from './config/featureFlags.json';
import { RealAudioManager } from './services/audio-manager';
import { HowlerBackend } from './services/audio-howler';
import { WebAudioMusicGenerator } from './services/audio-music-generator';
import { gameRegistry } from './config/gameRegistry';
import './i18n';
import './styles/global.css';

// Accessibility dev overlay — logs a11y violations to browser console
if (import.meta.env.DEV) {
  import('@axe-core/react').then((axe) => {
    import('react-dom').then((ReactDOM) => {
      axe.default(React, ReactDOM, 1000);
    });
  });
}

const storageManager = new IndexedDBStorageManager();
storageManager.init().catch((err) => {
  console.warn('IndexedDB initialization failed. Running in-memory only:', err);
});

const audioManager = new RealAudioManager(
  new HowlerBackend(),
  new WebAudioMusicGenerator(),
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <PlatformProvider
        storageManager={storageManager}
        audioManager={audioManager}
        gameRegistry={gameRegistry}
      >
          <FeatureFlagProvider flags={featureFlags as FeatureFlags} profileId={null}>
            <App />
          </FeatureFlagProvider>
      </PlatformProvider>
    </BrowserRouter>
  </StrictMode>,
);
