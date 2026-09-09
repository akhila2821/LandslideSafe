import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class RootErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('LandslideSafe mount error:', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: 'system-ui', color: '#fff', background: '#7f1d1d', minHeight: '100vh' }}>
          <h2>Dashboard failed to start</h2>
          <p>{String(this.state.error?.message || this.state.error)}</p>
          <p style={{ opacity: 0.8 }}>Open DevTools Console for the full stack trace, or check /api/health.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

window.addEventListener('error', (e) => console.error('Window error:', e.message));
window.addEventListener('unhandledrejection', (e) => console.error('Unhandled rejection:', e.reason));

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>
);
