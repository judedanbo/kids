import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import styles from './Announcer.module.css';

type AnnounceFn = (message: string) => void;

const AnnounceContext = createContext<AnnounceFn>(() => {});

export function useAnnounce(): AnnounceFn {
  return useContext(AnnounceContext);
}

interface AnnouncerProps {
  children?: ReactNode;
}

export function Announcer({ children }: AnnouncerProps) {
  const [message, setMessage] = useState('');

  const announce: AnnounceFn = useCallback((msg: string) => {
    // Clear then set — forces screen readers to re-read even if same text
    setMessage('');
    setTimeout(() => setMessage(msg), 100);
  }, []);

  return (
    <AnnounceContext.Provider value={announce}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={styles.visuallyHidden}
      >
        {message}
      </div>
    </AnnounceContext.Provider>
  );
}
