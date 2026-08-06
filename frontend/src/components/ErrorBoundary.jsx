import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '2rem',
          maxWidth: '600px',
          margin: '3rem auto',
          background: '#fff3f3',
          border: '1px solid #e74c3c',
          borderRadius: '8px',
          fontFamily: 'Inter, sans-serif'
        }}>
          <h2 style={{ color: '#c0392b', marginBottom: '0.75rem' }}>Something went wrong</h2>
          <p style={{ fontSize: '0.9rem', color: '#555', marginBottom: '1rem' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.hash = '#/login';
              window.location.reload();
            }}
            style={{
              padding: '0.5rem 1.25rem',
              background: '#e74c3c',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Go to Login
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
