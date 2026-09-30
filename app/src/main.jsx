import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { S } from './css.js';
import { rawLocal } from './storage.js';

// Si algo falla al dibujar, los datos siguen intactos: se ofrece descargarlos tal cual.
class SafeBoundary extends React.Component {
  constructor(p) { super(p); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  download() {
    const raw = rawLocal() || '{}';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
    a.download = `mi-planner-emergencia-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
  }
  render() {
    if (!this.state.error) return this.props.children;
    const btn = 'min-height:44px;padding:0 18px;border-radius:22px;border:none;background:#3A2F2D;color:#FFFDFB;cursor:pointer;font-size:14px';
    return (
      <div style={S("min-height:100vh;background:#F7F2EC;font-family:'Jost',sans-serif;display:flex;align-items:center;justify-content:center;padding:24px")}>
        <div style={S('max-width:460px;display:flex;flex-direction:column;gap:14px')}>
          <div style={S("font-family:'Cormorant Garamond',serif;font-style:italic;font-weight:600;font-size:30px")}>Algo salió mal</div>
          <div style={S('font-size:15px;line-height:1.5')}>Tus datos siguen guardados en este dispositivo. Descarga una copia por si acaso y vuelve a abrir la app.</div>
          <div style={S('display:flex;gap:8px;flex-wrap:wrap')}>
            <button onClick={() => this.download()} style={S(btn)}>Descargar mis datos</button>
            <button onClick={() => location.reload()} style={S(btn.replace('background:#3A2F2D;color:#FFFDFB', 'background:#FFFDFB;color:#3A2F2D;border:1px solid #E0D2C8'))}>Volver a abrir</button>
          </div>
          <div style={S('font-size:12px;color:#9C8D88')}>{String(this.state.error && this.state.error.message)}</div>
        </div>
      </div>
    );
  }
}

createRoot(document.getElementById('root')).render(<SafeBoundary><App /></SafeBoundary>);

// Service worker: la app funciona sin conexión y se puede instalar.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => {}); });
}
