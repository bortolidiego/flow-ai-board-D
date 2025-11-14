import React, { errorCodes } from 'react';

type ErrorEntry = {
  componentStack: string[];
  error: Error;
  componentDidCatch: (error: Error, info: any) => void;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, { hasError: boolean }> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false
    };
  }

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="o-hidden p-4 w-full border-b border-b-gray-400 backdrop-blur-md bg-white border border-gray-300 rounded-lg mb-2">
          <div className="flex-none">
            <img 
              src="/error-icon.png" 
              alt="Error" 
              className="h-20 w-20 mb-3" />
          </div>
          <h1 className="text-2xl font-bold text-red-600">Component Error</h1>
          <p className="text-sm text-gray-600 mt-2">An unexpected error occurred in our application.</p>
          <p className="mt-2 text-right">
            {this.props.children}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default React.memo(ErrorBoundary);