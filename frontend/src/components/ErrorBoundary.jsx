import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { error: null, errorInfo: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
  }

  render() {
    const { error, errorInfo } = this.state;
    const { fallback, children } = this.props;

    if (error) {
      return (
        <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center p-6">
          <div className="rounded-2xl bg-red-50 border border-red-200 p-8 max-w-lg text-center shadow-sm">
            <h2 className="text-lg font-bold text-red-900 mb-2">Page error</h2>
            <p className="text-red-700 text-sm mb-4">{error.message}</p>
            {errorInfo && errorInfo.componentStack && (
              <pre className="text-xs text-gray-400 text-left overflow-hidden">{errorInfo.componentStack}</pre>
            )}
            {fallback && <p className="text-gray-500 text-xs mt-3">{fallback}</p>}
          </div>
        </div>
      );
    }

    return children;
  }
}
