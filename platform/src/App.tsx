import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AgeTierProvider } from '@kids-games-zone/shared';
import { NavBar } from './components/NavBar/NavBar';
import { LoadingSpinner } from './components/LoadingSpinner/LoadingSpinner';
import { Rewards } from './pages/Rewards';
import { Settings } from './pages/Settings';
import { usePlatform } from './context/PlatformContext';
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
  const tier = getAgeTier(state.currentProfile?.age);

  return (
    <AgeTierProvider tier={tier}>
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
