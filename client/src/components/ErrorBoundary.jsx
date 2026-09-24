import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF9F6] text-[#1F2937] font-sans flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-lg p-6 sm:p-10 max-w-lg w-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto mb-5 text-3xl font-bold shadow-xs">
              ⚠️
            </div>

            <h1 className="text-2xl font-bold text-[#1F2937] mb-2">
              Something went wrong
            </h1>

            <p className="text-sm text-stone-600 mb-6 leading-relaxed">
              We encountered an unexpected problem while rendering this page. Our team has been notified.
            </p>

            {this.state.error && (
              <div className="mb-6 p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-left text-xs font-mono text-stone-700 overflow-x-auto max-h-32">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#1F7A4D] hover:bg-[#18643e] text-white text-xs font-semibold shadow-sm transition-all"
              >
                Reload Page
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-semibold transition-colors"
              >
                Return Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
