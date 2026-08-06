import { useState, useEffect, type ReactNode } from 'react';

interface PageLoaderProps {
  children: ReactNode;
  loading: boolean;
  error?: string | null;
  retry?: () => void;
  emptyMessage?: string;
  skeletonLines?: number;
}

export default function PageLoader({
  children,
  loading,
  error,
  retry,
  emptyMessage = 'No content available yet.',
  skeletonLines = 4,
}: PageLoaderProps) {
  if (error) {
    return (
      <div className="page-loader-error" role="alert">
        <div className="page-loader-card">
          <h2 className="page-loader-title">Something went wrong</h2>
          <p className="page-loader-message">{error}</p>
          {retry && (
            <button className="btn btn-primary" onClick={retry}>
              Retry
            </button>
          )}
        </div>
        <style>{`
          .page-loader-error {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 60vh;
            padding: 20px;
          }
          .page-loader-card {
            background: var(--surface, #1a1d27);
            border: 1px solid var(--border, #2e3348);
            border-radius: var(--radius, 12px);
            padding: 32px;
            text-align: center;
            max-width: 480px;
          }
          .page-loader-title {
            margin: 0 0 8px;
            font-size: 18px;
            color: var(--text, #e8eaed);
          }
          .page-loader-message {
            margin: 0 0 20px;
            color: var(--text2, #9aa0b0);
            font-size: 14px;
          }
        `}</style>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-loader-skeleton" role="status" aria-live="polite">
        <div className="page-loader-card">
          {Array.from({ length: skeletonLines }, (_, i) => (
            <div
              key={i}
              className="skeleton-line"
              style={{ width: i === skeletonLines - 1 ? '60%' : '100%' }}
            />
          ))}
        </div>
        <style>{`
          .page-loader-skeleton {
            padding: 20px;
          }
          .page-loader-card {
            background: var(--surface, #1a1d27);
            border: 1px solid var(--border, #2e3348);
            border-radius: var(--radius, 12px);
            padding: 24px;
          }
          .skeleton-line {
            height: 16px;
            background: var(--surface2, #242837);
            border-radius: 6px;
            margin-bottom: 14px;
            animation: skeleton-pulse 1.5s ease-in-out infinite;
          }
          @keyframes skeleton-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}</style>
      </div>
    );
  }

  if (!children) {
    return (
      <div className="page-loader-empty">
        <div className="page-loader-card">
          <p className="page-loader-empty-text">{emptyMessage}</p>
        </div>
        <style>{`
          .page-loader-empty {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 50vh;
            padding: 20px;
          }
          .page-loader-card {
            background: var(--surface, #1a1d27);
            border: 1px solid var(--border, #2e3348);
            border-radius: var(--radius, 12px);
            padding: 32px;
            text-align: center;
          }
          .page-loader-empty-text {
            color: var(--text2, #9aa0b0);
            margin: 0;
          }
        `}</style>
      </div>
    );
  }

  return <>{children}</>;
}