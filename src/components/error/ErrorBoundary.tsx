import { Component, type ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary" role="alert">
          <div className="error-boundary-card">
            <h1 className="error-boundary-title">Something went wrong</h1>
            <p className="error-boundary-message">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <details className="error-boundary-details">
              <summary>Error details</summary>
              <pre className="error-boundary-stack">
                {this.state.error?.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
            <button
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              Refresh page
            </button>
          </div>
          <style>{`
            .error-boundary {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 20px;
              background: var(--bg, #0f1117);
            }
            .error-boundary-card {
              background: var(--surface, #1a1d27);
              border: 1px solid var(--border, #2e3348);
              border-radius: var(--radius, 12px);
              padding: 32px;
              text-align: center;
              max-width: 560px;
            }
            .error-boundary-title {
              margin: 0 0 12px;
              font-size: 20px;
              color: var(--text, #e8eaed);
            }
            .error-boundary-message {
              margin: 0 0 20px;
              color: var(--text2, #9aa0b0);
              font-size: 14px;
            }
            .error-boundary-details {
              text-align: left;
              margin-bottom: 20px;
              font-size: 12px;
              color: var(--text2, #9aa0b0);
            }
            .error-boundary-stack {
              white-space: pre-wrap;
              word-break: break-all;
              max-height: 200px;
              overflow-y: auto;
              background: var(--surface2, #242837);
              padding: 12px;
              border-radius: 8px;
              font-size: 11px;
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}