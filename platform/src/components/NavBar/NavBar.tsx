import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IconImage } from '@kids-games-zone/shared';
import styles from './NavBar.module.css';

export function NavBar() {
  const location = useLocation();
  const { t } = useTranslation('common');

  const tabs = [
    { icon: '🏠', src: '/images/ui/nav-home.webp', label: t('nav.home'), path: '/' },
    { icon: '👤', src: '/images/ui/nav-profile.webp', label: t('nav.profile'), path: '/profile' },
    { icon: '🏆', src: '/images/ui/nav-rewards.webp', label: t('nav.rewards'), path: '/rewards' },
    {
      icon: '⚙️',
      src: '/images/ui/nav-settings.webp',
      label: t('nav.settings'),
      path: '/settings',
    },
  ];

  // Hide NavBar on game routes
  if (location.pathname.startsWith('/game/')) {
    return null;
  }

  return (
    <nav className={styles.navbar} aria-label="Main navigation">
      {tabs.map((tab) => {
        const isActive =
          tab.path === '/' ? location.pathname === '/' : location.pathname.startsWith(tab.path);
        return (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={`${styles.tab} ${isActive ? styles.active : ''}`}
            end={tab.path === '/'}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className={styles.icon} aria-hidden="true">
              <IconImage src={tab.src} alt="" fallback={tab.icon} size={32} />
            </span>
            <span className={styles.label}>{tab.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
