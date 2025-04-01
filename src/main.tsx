
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Make sure we have a root element to render to
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

const root = createRoot(rootElement);
root.render(<App />);
