import React, { useEffect, useState } from 'react';
import { S } from './css.js';
import { THEMES, MES, parse } from './model.js';
import { listSnapshots, isStandalone, isIOS } from './storage.js';

const TITLE = "font-family:'Cormorant Garamond',serif;font-style:italic;font-weight:600;font-size:24px";
const LABEL = 'font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#7A6A65';
const ROUND = 'width:40px;height:40px;border-radius:50%;border:1px solid #E0D2C8;background:#FFFDFB;cursor:pointer;font-size:18px';
const fmt = s => { const d = parse(s); return `${d.getDate()} ${MES[d.getMonth()]} ${d.getFullYear()}`; };

export default function Settings({ data, T, persisted, onClose, setSetting, onExport, onImportClick, onRestoreSnapshot, onPersist }) {
  const [snaps, setSnaps] = useState([]);
  useEffect(() => { listSnapshots().then(setSnaps); }, []);
  useEffect(() => { const h = e => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  const cfg = data.settings;
  const chip = (label, on, onClick) => (
    <button key={label} onClick={onClick} style={S(`min-height:40px;padding:0 14px;border-radius:20px;border:1px solid ${on ? T.mid : '#E6DAD0'};background:${on ? T.soft : '#FFFDFB'};cursor:pointer;font-size:14px`)}>{label}</button>
  );
  const stepper = (k, min, max, unit) => (
    <div style={S('display:flex;align-items:center;gap:6px')}>
      <button onClick={() => setSetting(k, Math.max(min, cfg[k] - 1))} style={S(ROUND)}>−</button>
      <span style={S('min-width:56px;text-align:center;font-size:16px')}>{cfg[k]}{unit}</span>
      <button onClick={() => setSetting(k, Math.min(max, cfg[k] + 1))} style={S(ROUND)}>+</button>
    </div>
  );
  const row = 'display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap';
  const installed = isStandalone();

  return (
    <div onClick={onClose} style={S('position:fixed;inset:0;background:rgba(58,47,45,.28);display:flex;justify-content:center;align-items:flex-start;overflow-y:auto;padding:max(24px,env(safe-area-inset-top)) 16px 40px;z-index:20')}>
      <div role="dialog" aria-modal="true" aria-label="Ajustes" onClick={e => e.stopPropagation()} style={S("width:100%;max-width:560px;background:#F7F2EC;border-radius:24px;padding:24px;display:flex;flex-direction:column;gap:18px;font-family:'Jost',sans-serif;box-shadow:0 20px 60px rgba(58,47,45,.2)")}>
        <div style={S('display:flex;justify-content:space-between;align-items:center')}>
          <div style={S("font-family:'Cormorant Garamond',serif;font-style:italic;font-weight:600;font-size:32px")}>Ajustes</div>
          <button onClick={onClose} style={S('min-height:40px;padding:0 16px;border-radius:20px;border:none;background:#3A2F2D;color:#FFFDFB;cursor:pointer;font-size:14px')}>Listo</button>
        </div>

        <section style={S('background:#FFFDFB;border:1px solid #EDE3DA;border-radius:20px;padding:18px;display:flex;flex-direction:column;gap:14px')}>
          <div style={S(TITLE)}>Planner</div>
          <div style={S('display:flex;flex-direction:column;gap:6px')}>
            <div style={S(LABEL)}>Estilo</div>
            <div style={S('display:flex;flex-wrap:wrap;gap:6px')}>{Object.keys(THEMES).map(k => chip(k, cfg.estilo === k, () => setSetting('estilo', k)))}</div>
          </div>
          <div style={S(row)}>
            <div style={S(LABEL)}>Moneda</div>
            <div style={S('display:flex;gap:6px')}>{['$', '€'].map(k => chip(k, cfg.moneda === k, () => setSetting('moneda', k)))}</div>
          </div>
          <div style={S(row)}>
            <div style={S(LABEL)}>La semana empieza en</div>
            <div style={S('display:flex;gap:6px')}>{['Lunes', 'Domingo'].map(k => chip(k, cfg.weekStart === k, () => setSetting('weekStart', k)))}</div>
          </div>
          <div style={S(row)}>
            <div style={S(LABEL)}>El horario empieza a las</div>
            {stepper('dayStartHour', 4, 10, ':00')}
          </div>
          <div style={S(row)}>
            <div style={S(LABEL)}>Vasos de agua al día</div>
            {stepper('hydrationGoal', 4, 12, '')}
          </div>
        </section>

        <section style={S('background:#FFFDFB;border:1px solid #EDE3DA;border-radius:20px;padding:18px;display:flex;flex-direction:column;gap:12px')}>
          <div style={S(TITLE)}>Tus datos</div>
          <div style={S('font-size:14px;line-height:1.5;color:#3A2F2D')}>
            Todo se guarda solo en este dispositivo, al momento, y también cuando cierras o cambias de app. Cada día se crea una copia automática (se conservan las últimas 30).
          </div>
          <div style={S('display:flex;flex-direction:column;gap:6px;font-size:14px')}>
            <div>{persisted ? '✓ Almacenamiento protegido: el navegador no lo borrará por falta de espacio.' : <>Almacenamiento sin proteger. <button onClick={onPersist} style={S('border:none;background:transparent;color:#A8645F;text-decoration:underline;cursor:pointer;padding:0;font-size:14px')}>Proteger</button></>}</div>
            {isIOS() && <div>{installed ? '✓ Abierta desde la pantalla de inicio: Safari no borra sus datos.' : 'Añádela a la pantalla de inicio (Compartir → «Añadir a pantalla de inicio») para que Safari no borre tus datos.'}</div>}
            <div style={S('color:#7A6A65')}>Última copia guardada por ti: {data.meta.lastBackup ? fmt(data.meta.lastBackup) : 'nunca'}</div>
          </div>
          <div style={S('display:flex;gap:8px;flex-wrap:wrap')}>
            <button onClick={onExport} style={S('min-height:44px;padding:0 18px;border-radius:22px;border:none;background:#3A2F2D;color:#FFFDFB;cursor:pointer;font-size:14px')}>Guardar copia</button>
            <button onClick={onImportClick} style={S('min-height:44px;padding:0 18px;border-radius:22px;border:1px solid #E0D2C8;background:#FFFDFB;cursor:pointer;font-size:14px')}>Restaurar desde archivo</button>
          </div>
        </section>

        <section style={S('background:#FFFDFB;border:1px solid #EDE3DA;border-radius:20px;padding:18px;display:flex;flex-direction:column;gap:4px')}>
          <div style={S(TITLE)}>Copias automáticas</div>
          <div style={S('font-size:13px;color:#7A6A65;margin-bottom:6px')}>Vuelve a cómo estaba tu planner al final de un día.</div>
          {snaps.length === 0 && <div style={S('font-size:14px;color:#7A6A65')}>Todavía no hay copias automáticas.</div>}
          {snaps.map(s => (
            <div key={s.key} style={S('display:flex;justify-content:space-between;align-items:center;min-height:44px;border-bottom:1px dashed #EDE3DA')}>
              <span style={S('font-size:15px')}>{s.date ? fmt(s.date) : `Antes de la última restauración (${new Date(s.at).toLocaleString('es', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })})`}</span>
              <button onClick={() => onRestoreSnapshot(s.key)} style={S('min-height:34px;padding:0 12px;border-radius:17px;border:1px solid #E0D2C8;background:#FFFDFB;cursor:pointer;font-size:13px')}>Restaurar</button>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
