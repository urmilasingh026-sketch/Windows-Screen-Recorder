import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';

if (
  window.location.hash === '#annotation-canvas' ||
  window.location.hash === '#annotation-toolbar'
) {
  document.documentElement.classList.add('annotation-window');
  document.body.classList.add('annotation-window');
}

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
