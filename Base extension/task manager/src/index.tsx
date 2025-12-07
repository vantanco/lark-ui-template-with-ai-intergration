import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  componentDidCatch(error: Error) {
    // Show any render errors on screen
    this.setState({ error });
    console.error(error);
  }

  componentDidMount() {
    window.addEventListener('error', this.handleWindowError);
    window.addEventListener('unhandledrejection', this.handlePromiseRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('error', this.handleWindowError);
    window.removeEventListener('unhandledrejection', this.handlePromiseRejection);
  }

  handleWindowError = (event: ErrorEvent) => {
    const err = event.error || new Error(event.message || 'Unknown error');
    this.setState({ error: err });
    console.error(err);
  };

  handlePromiseRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    this.setState({ error: reason });
    console.error(reason);
  };

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <div style={{ padding: '24px', color: '#b91c1c', background: '#fef2f2', fontFamily: 'monospace' }}>
          <h2 style={{ margin: '0 0 8px' }}>Đã xảy ra lỗi</h2>
          <div>{error.message}</div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
