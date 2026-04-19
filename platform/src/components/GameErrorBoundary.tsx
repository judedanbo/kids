import { Component, type ErrorInfo, type ReactNode } from 'react';

interface GameErrorBoundaryProps {
  children: ReactNode;
  onGoHome?: () => void;
  onRetry?: () => void;
}

interface GameErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class GameErrorBoundary extends Component<GameErrorBoundaryProps, GameErrorBoundaryState> {
  constructor(props: GameErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): GameErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[GameErrorBoundary] Caught error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    this.props.onGoHome?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            textAlign: 'center',
            padding: '2rem',
            gap: '1rem',
          }}
        >
          <div style={{ fontSize: '4rem' }}>😿</div>
          <h2
            style={{
              fontFamily: 'var(--font-family-display)',
              color: 'var(--color-text-primary)',
            }}
          >
            Oops! Something went wrong
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', maxWidth: '400px' }}>
            Don&apos;t worry, it&apos;s not your fault! Let&apos;s try again or go back to the
            games.
          </p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button
              onClick={this.handleRetry}
              style={{
                padding: '12px 24px',
                borderRadius: 'var(--radius-medium)',
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                fontFamily: 'var(--font-family-body)',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
              }}
            >
              Try Again
            </button>
            <button
              onClick={this.handleGoHome}
              style={{
                padding: '12px 24px',
                borderRadius: 'var(--radius-medium)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-family-body)',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid var(--color-border)',
              }}
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
