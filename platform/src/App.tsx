import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { NavBar } from './components/NavBar/NavBar';
import { LoadingSpinner } from './components/LoadingSpinner/LoadingSpinner';
import { Rewards } from './pages/Rewards';
import { Settings } from './pages/Settings';

const Hub = lazy(() => import('./pages/Hub'));
const ProfileSelect = lazy(() => import('./pages/ProfileSelect'));
const GameWrapper = lazy(() => import('./pages/GameWrapper'));

function App() {
  return (
    <>
      <div className="page-content">
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<Hub />} />
            <Route path="/profile" element={<ProfileSelect />} />
            <Route path="/game/:gameId" element={<GameWrapper />} />
            <Route path="/rewards" element={<Rewards />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/parental" element={<Settings />} />
          </Routes>
        </Suspense>
      </div>
      <NavBar />
    </>
  );
}

export default App;
