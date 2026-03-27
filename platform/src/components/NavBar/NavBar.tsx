import { NavLink, useLocation } from 'react-router-dom';
import styles from './NavBar.module.css';

const tabs = [
  { icon: '🏠', label: 'Home', path: '/' },
  { icon: '👤', label: 'Profile', path: '/profile' },
  { icon: '🏆', label: 'Rewards', path: '/rewards' },
  { icon: '⚙️', label: 'Settings', path: '/settings' },
] as const;

export function NavBar() {
  const location = useLocation();

  // Hide NavBar on game routes
  if (location.pathname.startsWith('/game/')) {
    return null;
  }

  return (
    <nav className={styles.navbar} aria-label="Main navigation">
      {tabs.map((tab) => {
        const isActive = tab.path === '/'
          ? location.pathname === '/'
          : location.pathname.startsWith(tab.path);
        return (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={`${styles.tab} ${isActive ? styles.active : ''}`}
            end={tab.path === '/'}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className={styles.icon} aria-hidden="true">
              {tab.icon}
            </span>
            <span className={styles.label}>{tab.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
