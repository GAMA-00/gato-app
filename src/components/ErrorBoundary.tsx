
import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    console.error('ErrorBoundary - Error caught:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary - Full error details:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      console.log('ErrorBoundary - Rendering error UI');
      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
          <div className="text-center space-y-4 max-w-2xl">
            <h1 className="text-3xl font-bold text-red-600">Error en la aplicación</h1>
            <p className="text-red-700 text-lg">
              Se ha producido un error inesperado. Por favor, recarga la página.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 text-lg"
            >
              Recargar página
            </button>
            {this.state.error && (
              <details className="text-left text-sm bg-red-100 p-4 rounded border">
                <summary className="cursor-pointer font-semibold">Ver detalles del error</summary>
                <pre className="mt-2 text-xs overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
