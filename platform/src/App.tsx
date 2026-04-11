import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AgeTierProvider } from '@kids-games-zone/shared';
import { NavBar } from './components/NavBar/NavBar';
import { OfflineBanner } from './components/OfflineBanner/OfflineBanner';
import { LoadingSpinner } from './components/LoadingSpinner/LoadingSpinner';
import { Rewards } from './pages/Rewards';
import { Settings } from './pages/Settings';
import { usePlatform } from './context/PlatformContext';
import { SUPPORTED_LANGUAGES } from './config/languages';
import type { AgeTier } from '@kids-games-zone/shared';

const Hub = lazy(() => import('./pages/Hub'));
const ProfileSelect = lazy(() => import('./pages/ProfileSelect'));
const GameWrapper = lazy(() => import('./pages/GameWrapper'));
const ParentalDashboard = lazy(() => import('./pages/ParentalDashboard'));

function getAgeTier(age: number | undefined): AgeTier {
  if (!age || age <= 5) return 'tiny';
  if (age <= 8) return 'junior';
  return 'explorer';
}

function App() {
  const { state } = usePlatform();
  const { i18n } = useTranslation();
  const tier = getAgeTier(state.currentProfile?.age);

  useEffect(() => {
    const lang = i18n.language;
    const langConfig = SUPPORTED_LANGUAGES.find((l) => l.code === lang);
    const dir = langConfig?.dir ?? 'ltr';
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [i18n.language]);

  return (
    <AgeTierProvider tier={tier}>
      <OfflineBanner />
      <div className="page-content" data-age-tier={tier}>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<Hub />} />
            <Route path="/profile" element={<ProfileSelect />} />
            <Route path="/game/:gameId" element={<GameWrapper />} />
            <Route path="/rewards" element={<Rewards />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/parental" element={<ParentalDashboard />} />
          </Routes>
        </Suspense>
      </div>
      <NavBar />
    </AgeTierProvider>
  );
}

export default App;
