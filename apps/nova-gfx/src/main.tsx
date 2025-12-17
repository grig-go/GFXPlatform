import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// NOTE: StrictMode removed to prevent double-execution of effects
// This was causing issues with realtime subscriptions running twice
// and command handlers being called multiple times
ReactDOM.createRoot(document.getElementById('root')!).render(<App />);

