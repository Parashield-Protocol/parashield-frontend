'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { usePathname } from 'next/navigation';
import { track } from '@/lib/analytics';
import { devError } from '@/lib/devConsole';

interface Props {
  children:  ReactNode;
  fallback?: ReactNode;
  /** Current pathname for route-based error boundary reset (#748) */
  pathname?: string;
}

interface State {
  hasError: boolean;
  error:    Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidUpdate(prevProps: Props) {
    // Reset on children change OR pathname change (#748)
    if ((prevProps.children !== this.props.children || prevProps.pathname !== this.props.pathname) && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Console output only in development (#476, #720): track() below is the
    // production monitoring path; logging the raw error/component stack to
    // the console in any non-dev build risks leaking internal details to
    // anyone with devtools open.
    devError('[ErrorBoundary]', error, info);
    track('app_error', {
      message:    error.message,
      stack:      error.stack?.slice(0, 200),
      component:  info.componentStack?.trim().split('\n')[0]?.trim(),
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) return this.props.fallback;
      return (
        <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
          <span className="text-4xl">⚠️</span>
          <h3 className="mt-4 text-lg font-semibold text-white">Something went wrong</h3>
          <p className="mt-2 text-sm text-gray-400">
            {/* The raw error message may contain technical details (stack
                frames, internal identifiers, API response bodies) that are
                confusing to users and can leak internal information -- the
                error is reported via track() above (and logged to the
                console in development only, #720) for debugging (#465). */}
            An unexpected error occurred. This has been logged so we can look into it.
          </p>
          <button
            onClick={this.handleReset}
            className="mt-6 rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-400 transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
