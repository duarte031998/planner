import React, { useEffect, useRef, useState } from 'react';
import { S } from './css.js';
import {
  MIN_M, MAX_M, pad, iso, parse, addDays, DOW, DOWS, MES, cap, uid, num, clampM, HCOL, MOOD, THEMES, AREAS, HORIZ,
  CATS, EX, LVL, EN, FLOW, SYM, AM, PM, TIPS, CARE_TIPS, it, seed, normalize, validMood
} from './model.js';
import * as store from './storage.js';
import Settings from './Settings.jsx';

const TITLE = "font-family:'Cormorant Garamond',serif;font-style:italic;font-weight:600;font-size:27px";
const CARD = 'background:#FFFDFB;border:1px solid #EDE3DA;border-radius:22px;padding:22px;display:flex;flex-direction:column';
const LABEL = 'font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#7A6A65';
const ROUND_BTN = 'width:44px;height:44px;border-radius:50%;border:1px solid #E0D2C8;background:#FFFDFB;cursor:pointer;font-size:18px';
// Enter sin contar el Enter que confirma un texto con teclado predictivo/IME.
const isEnter = e => e.key === 'Enter' && !(e.nativeEvent && e.nativeEvent.isComposing);
const DASH_BTN = 'align-self:flex-start;margin-top:6px;min-height:40px;padding:0 14px;border-radius:20px;border:1px dashed #D9C9BE;background:transparent;cursor:pointer;font-size:14px';

function Box({ c, size = 22, radius = 7 }) {
  return <span style={S(`width:${size}px;height:${size}px;border-radius:${radius === 'round' ? '50%' : radius + 'px'};border:1.5px solid ${c.boxBorder};background:${c.boxBg};color:#FFFDFB;font-size:${size - 9}px;display:flex;align-items:center;justify-content:center`)}>{c.mark}</span>;
}

function Chips({ list, h = 40, fs = 14 }) {
  return (
    <div style={S('display:flex;flex-wrap:wrap;gap:6px')}>
      {list.map((c, i) => (
        <button key={i} onClick={c.onClick} style={S(`min-height:${h}px;padding:0 ${h >= 44 ? 14 : 12}px;border-radius:${h / 2}px;border:1px solid ${c.border};background:${c.bg};cursor:pointer;font-size:${fs}px`)}>{c.label}</button>
      ))}
    </div>
  );
}

export default function App() {
  const [data, setDataRaw] = useState(null);
  const [ui, setUi] = useState(() => { const t = iso(new Date()); return { tab: 'hoy', sel: t, month: clampM(t.slice(0, 7)), newArea: 'Crecimiento', newHz: 'Q4 2026', txType: 'gasto', txCat: 'Comida' }; });
  const [drafts, setDrafts] = useState({});
  const [status, setStatus] = useState({ ok: true });
  const [persisted, setPersisted] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState('');
  const fileRef = useRef(null);
  const skipSave = useRef(true);

  // Carga inicial desde el almacenamiento.
  useEffect(() => {
    let alive = true;
    store.load().then(env => {
      if (!alive) return;
      skipSave.current = !!(env && env.inSync);
      setDataRaw(normalize(env ? env.data : seed()));
    });
    // Si la app queda abierta en segundo plano y se vuelve a ella otro día, «Hoy» pasa al día nuevo.
    let lastToday = iso(new Date());
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const t = iso(new Date());
      const prev = lastToday;
      if (t === prev) return;
      lastToday = t;
      setUi(s => ({ ...s, sel: s.sel === prev ? t : s.sel, month: s.month === prev.slice(0, 7) ? clampM(t.slice(0, 7)) : s.month }));
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    store.installFlushHooks();
    store.requestPersistence().then(setPersisted);
    const offS = store.onStatus(setStatus);
    const offX = store.onExternalChange(env => { skipSave.current = true; setDataRaw(normalize(env.data)); });
    return () => { alive = false; offS(); offX(); document.removeEventListener('visibilitychange', onVisible); window.removeEventListener('focus', onVisible); };
  }, []);

  // Cada cambio se guarda automáticamente.
  useEffect(() => {
    if (!data) return;
    if (skipSave.current) { skipSave.current = false; return; }
    store.save(data);
  }, [data]);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 3200); return () => clearTimeout(t); }, [toast]);

  if (!data) return <div style={S('min-height:100vh;background:#F7F2EC')} />;

  const setData = fn => setDataRaw(prev => { const d = JSON.parse(JSON.stringify(prev)); fn(d); return d; });
  const setDraft = (k, v) => setDrafts(s => ({ ...s, [k]: v }));
  const setU = patch => setUi(s => ({ ...s, ...patch }));
  const { tab, sel, month, newArea, newHz, txType, txCat } = ui;
  const cfg = data.settings;
  const T = THEMES[cfg.estilo] || THEMES['Rosa empolvado'];
  const cur = cfg.moneda;
  const money = n => { const s = Math.abs(n).toLocaleString('es', { maximumFractionDigits: 2 }); return (n < 0 ? '−' : '') + (cur === '€' ? s + ' €' : '$' + s); };
  const todayIso = iso(new Date());
  const hydration = cfg.hydrationGoal;
  const startH = cfg.dayStartHour;
  const weekStart = cfg.weekStart;

  const dayOf = (d, k) => { if (!d.days[k]) d.days[k] = {}; const x = d.days[k]; x.top3 = x.top3 || [{ text: '', done: false }, { text: '', done: false }, { text: '', done: false }]; x.tasks = x.tasks || []; x.sched = x.sched || {}; return x; };
  const monOf = (d, m) => { if (!d.months[m]) d.months[m] = {}; const x = d.months[m]; x.focus = x.focus || []; x.tx = x.tx || []; x.paid = x.paid || {}; return x; };
  const chk = done => ({ boxBg: done ? T.accent : 'transparent', boxBorder: done ? T.accent : '#CDB9B1', mark: done ? '✓' : '', textColor: done ? '#A99B96' : '#3A2F2D', deco: done ? 'line-through' : 'none' });
  const chip = (label, on, onClick) => ({ label, onClick, bg: on ? T.soft : '#FFFDFB', border: on ? T.mid : '#E6DAD0' });
  const list = (key, get, withToday) => {
    const arr = get(data, false) || [];
    const items = arr.map((x, i) => ({
      key: x.id || i, text: x.text, ...chk(x.done),
      onToggle: () => setData(d => { const a = get(d, true); a[i].done = !a[i].done; }),
      onDel: () => setData(d => { get(d, true).splice(i, 1); }),
      onText: e => { const v = e.target.value; setData(d => { get(d, true)[i].text = v; }); },
      onToday: withToday ? () => setData(d => { const [m] = get(d, true).splice(i, 1); dayOf(d, todayIso).tasks.push(m); }) : null
    }));
    const add = () => { const v = (drafts[key] || '').trim(); if (!v) return; setData(d => { get(d, true).push(it(v)); }); setDraft(key, ''); };
    return { items, draft: drafts[key] || '', onDraft: e => setDraft(key, e.target.value), onKey: e => { if (isEnter(e)) add(); }, onAdd: add };
  };
  const rows = (get, fields, extra) => (get(data) || []).map((x, i) => {
    const o = { key: x.id || i, onDel: () => setData(d => { get(d).splice(i, 1); }) };
    fields.forEach(f => { o[f] = x[f] ?? ''; o['on' + cap(f)] = e => { const v = e.target.value; setData(d => { get(d)[i][f] = v; }); }; });
    return extra ? Object.assign(o, extra(x, i)) : o;
  });
  const addRow = (get, blank) => () => setData(d => { get(d).push({ id: uid(), ...blank }); });

  const TABS = [['hoy', 'Hoy'], ['semana', 'Semana'], ['mes', 'Mes'], ['habitos', 'Hábitos'], ['bienestar', 'Bienestar'], ['prioridades', 'Prioridades'], ['metas', 'Metas'], ['finanzas', 'Finanzas'], ['cuidado', 'Mi plan']];
  const dv = k => data.days[k] || {};
  const sd = parse(sel), day = dv(sel);
  const upd = fn => setData(d => fn(dayOf(d, sel)));
  const pick = (f, i) => () => upd(x => { x[f] = x[f] === i ? null : i; });
  const tog = (f, i) => () => upd(x => { x[f] = x[f] || {}; x[f][i] = !x[f][i]; });
  const moodC = k => { const m = dv(k).mood; return validMood(m) ? MOOD[m + 3].c : '#F1E9E2'; };

  // Hoy
  const t3 = day.top3 || [{ text: '', done: false }, { text: '', done: false }, { text: '', done: false }];
  const top3 = t3.map((t, i) => ({ num: i + 1, text: t.text, ...chk(t.done), onText: e => { const v = e.target.value; upd(x => { x.top3[i].text = v; }); }, onToggle: () => upd(x => { x.top3[i].done = !x.top3[i].done; }) }));
  const tasks = list('t-' + sel, (d, c) => c ? dayOf(d, sel).tasks : dv(sel).tasks);
  const hs = day.hs || {};
  const actArr = [].concat(...Object.values(hs));
  const actsLabel = actArr.length ? `${actArr.filter(a => a.done).length} de ${actArr.length} hechas` : '';
  const all = t3.filter(t => (t.text || '').trim()).concat(day.tasks || [], actArr);
  const dayPct = all.length ? Math.round(all.filter(t => t.done).length / all.length * 100) + '%' : '0%';
  const schedule = Array.from({ length: 17 }, (_, i) => { const h = pad((startH + i) % 24) + ':00'; return { label: h, list: list('h-' + sel + h, (d, c) => { if (!c) return (dv(sel).hs || {})[h]; const x = dayOf(d, sel); x.hs = x.hs || {}; x.hs[h] = x.hs[h] || []; return x.hs[h]; }) }; });
  const habitsToday = data.habits.map(h => { const done = !!(data.log[h.id] || {})[sel]; return { id: h.id, name: h.name, color: HCOL[h.color % 5], bg: done ? T.soft : '#FFFDFB', border: done ? T.mid : '#E6DAD0', onToggle: () => setData(d => { d.log[h.id] = d.log[h.id] || {}; d.log[h.id][sel] = !d.log[h.id][sel]; }) }; });
  const moodScale = MOOD.map((m, i) => { const v = i - 3, on = day.mood === v; return { num: v > 0 ? '+' + v : String(v), bg: m.c, border: on ? '#3A2F2D' : 'transparent', onClick: () => upd(x => { x.mood = x.mood === v ? null : v; }) }; });
  const sl = day.sleep;
  const sleep = { label: sl == null ? '—' : sl + ' h', onMinus: () => upd(x => { x.sleep = Math.max(0, (x.sleep ?? 8) - 0.5); }), onPlus: () => upd(x => { x.sleep = Math.min(16, (x.sleep ?? 7) + 0.5); }) };
  const meds = data.care.meds;
  const medsToday = meds.map(m => chip((m.time ? m.time + ' · ' : '') + (m.name || 'Medicamento'), !!(day.meds || {})[m.id], tog('meds', m.id)));
  const anchorsToday = data.care.anchors.map(a => chip((a.time ? a.time + ' · ' : '') + a.label, !!(day.anchors || {})[a.id], tog('anchors', a.id)));
  const alerts = [];
  const last3 = [0, 1, 2].map(i => dv(addDays(sel, -i)));
  if (last3.filter(x => x.sleep != null && x.sleep < 6).length >= 2) alerts.push('Has dormido menos de 6 h en 2 de las últimas 3 noches.');
  if (last3.every(x => x.mood != null && x.mood >= 2)) alerts.push('Tu ánimo lleva 3 días alto.');
  if (last3.every(x => x.mood != null && x.mood <= -2)) alerts.push('Tu ánimo lleva 3 días bajo.');
  const diff = Math.round((parse(sel) - parse(todayIso)) / 864e5);
  const doy = Math.floor((sd - new Date(sd.getFullYear(), 0, 0)) / 864e5);

  // Recordatorio de copia: más de 7 días sin guardar copia.
  const since = data.meta.lastBackup || data.meta.created || todayIso;
  const backupDue = Math.round((parse(todayIso) - parse(since)) / 864e5) >= 7 && Object.keys(data.days).length > 0;
  const showInstall = store.isIOS() && !store.isStandalone() && !data.meta.installTipHidden;

  // Semana
  const dow = sd.getDay();
  const ws = addDays(sel, -(weekStart === 'Lunes' ? (dow + 6) % 7 : dow));
  const wsd = parse(ws), wed = parse(addDays(ws, 6));
  const weekTitle = wsd.getMonth() === wed.getMonth() ? `${wsd.getDate()} – ${wed.getDate()} ${MES[wed.getMonth()]}` : `${wsd.getDate()} ${MES[wsd.getMonth()].slice(0, 3)} – ${wed.getDate()} ${MES[wed.getMonth()].slice(0, 3)}`;
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const k = addDays(ws, i), dd = parse(k), isT = k === todayIso;
    return { k, num: dd.getDate(), name: DOW[dd.getDay()], border: isT ? T.mid : '#EDE3DA', numColor: isT ? T.accent : '#3A2F2D', moodColor: moodC(k), onOpen: () => setU({ sel: k, tab: 'hoy' }), list: list('t-' + k, (d, c) => c ? dayOf(d, k).tasks : dv(k).tasks) };
  });

  // Mes
  const [my, mm] = month.split('-').map(Number);
  const dim = new Date(my, mm, 0).getDate();
  const mKeys = Array.from({ length: dim }, (_, i) => `${month}-${pad(i + 1)}`);
  const first = parse(mKeys[0]).getDay();
  const lead = weekStart === 'Lunes' ? (first + 6) % 7 : first;
  const heads = weekStart === 'Lunes' ? ['L', 'M', 'X', 'J', 'V', 'S', 'D'] : ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  const calCells = [];
  for (let i = 0; i < lead; i++) calCells.push({ key: 'e' + i, real: false, bg: 'transparent', border: 'transparent' });
  mKeys.forEach(k => {
    const x = dv(k), isT = k === todayIso, n = (x.tasks || []).length;
    calCells.push({ key: k, real: true, num: parse(k).getDate(), bg: isT ? T.soft : '#FBF8F5', border: isT ? T.mid : '#F1E9E2', numColor: isT ? T.accent : '#3A2F2D', moodColor: validMood(x.mood) ? MOOD[x.mood + 3].c : 'transparent', event: x.event || '', taskLabel: n ? n + (n === 1 ? ' tarea' : ' tareas') : '', onEvent: e => { const v = e.target.value; setData(d => { dayOf(d, k).event = v; }); }, onOpen: () => setU({ sel: k, tab: 'hoy' }) });
  });
  const monthFocus = list('mf-' + month, (d, c) => c ? monOf(d, month).focus : (d.months[month] || {}).focus);
  const shiftMonth = n => () => { const d = new Date(my, mm - 1 + n, 1); setU({ month: clampM(iso(d).slice(0, 7)) }); };

  // Hábitos
  const monthDays = mKeys.map(k => ({ k, num: parse(k).getDate(), dow: DOWS[parse(k).getDay()], color: k === todayIso ? T.accent : '#7A6A65' }));
  const elapsed = mKeys.filter(k => k <= todayIso).length;
  const habitRows = data.habits.map((h, hi) => {
    const lg = data.log[h.id] || {}, col = HCOL[h.color % 5];
    let s = 0, k = lg[todayIso] ? todayIso : addDays(todayIso, -1);
    while (lg[k]) { s++; k = addDays(k, -1); }
    const cnt = mKeys.filter(k => lg[k]).length, den = month === todayIso.slice(0, 7) ? elapsed : dim;
    return {
      id: h.id, name: h.name, color: col, streak: s ? s + ' d' : '—', pct: Math.round(cnt / (den || 1) * 100) + '%',
      onName: e => { const v = e.target.value; setData(d => { d.habits[hi].name = v; }); },
      onDel: () => { if (window.confirm(`¿Borrar el hábito «${h.name}» y su registro?`)) setData(d => { d.habits.splice(hi, 1); delete d.log[h.id]; }); },
      cells: mKeys.map(k => ({ k, bg: lg[k] ? col : '#F4EDE7', border: k === todayIso ? '#3A2F2D' : (lg[k] ? col : '#F4EDE7'), onClick: () => setData(d => { d.log[h.id] = d.log[h.id] || {}; d.log[h.id][k] = !d.log[h.id][k]; }) }))
    };
  });
  const addHabit = () => { const v = (drafts.habit || '').trim(); if (!v) return; setData(d => { d.habits.push({ id: uid(), name: v, color: d.habits.length % 5 }); }); setDraft('habit', ''); };

  // Bienestar
  const water = Array.from({ length: hydration }, (_, i) => ({ bg: i < (day.water || 0) ? '#C4D6E0' : 'transparent', onClick: () => upd(x => { x.water = x.water === i + 1 ? i : i + 1; }) }));
  const exMin = day.exMin || 0;
  const exercise = { label: exMin + ' min', onMinus: () => upd(x => { x.exMin = Math.max(0, (x.exMin || 0) - 10); }), onPlus: () => upd(x => { x.exMin = (x.exMin || 0) + 10; }) };
  const smonth = sel.slice(0, 7), sdim = new Date(sd.getFullYear(), sd.getMonth() + 1, 0).getDate();
  const chart = Array.from({ length: sdim }, (_, i) => {
    const k = `${smonth}-${pad(i + 1)}`, x = dv(k);
    const allMeds = meds.length && meds.every(m => (x.meds || {})[m.id]);
    return {
      num: i + 1,
      cells: [3, 2, 1, 0, -1, -2, -3].map(v => x.mood === v ? MOOD[v + 3].c : (v === 0 ? '#EFE6DD' : '#F7F2EC')),
      sleep: x.sleep == null ? '' : x.sleep, sleepColor: x.sleep != null && x.sleep < 6 ? '#A8645F' : '#3A2F2D',
      medColor: allMeds ? '#9DB39A' : 'transparent', periodColor: x.period ? '#C98B86' : 'transparent'
    };
  });
  let lastStart = null;
  for (let i = 0; i < 60; i++) { const k = addDays(sel, -i); if (dv(k).period && !dv(addDays(k, -1)).period) { lastStart = k; break; } }
  const cycleInfo = lastStart ? `Día ${Math.round((sd - parse(lastStart)) / 864e5) + 1} desde el inicio de tu última regla.` : 'Marca los días de regla para ver en qué día del ciclo estás.';
  const periodChip = { label: day.period ? 'Tengo la regla ✓' : 'Marcar regla', bg: day.period ? '#FFFDFB' : 'transparent', border: day.period ? T.mid : 'rgba(58,47,45,.2)', onClick: () => upd(x => { x.period = !x.period; }) };

  // Prioridades
  const Q = [['q1', 'Hacer ya', 'Urgente · Importante', 'Fechas límite y lo que no puede esperar.', '#F4E4E0'], ['q2', 'Planificar', 'Importante · No urgente', 'Metas, salud, relaciones. Aquí crece tu vida.', '#E3EADF'], ['q3', 'Delegar', 'Urgente · No importante', 'Interrupciones y favores. ¿Quién más puede hacerlo?', '#F5EAD2'], ['q4', 'Soltar', 'Ni urgente ni importante', 'Distracciones. Suéltalas sin culpa.', '#E7E1EE']];
  const quadrants = Q.map(([k, title, sub, hint, bg]) => ({ k, title, sub, hint, bg, list: list('m-' + k, d => d.matrix[k], true) }));

  // Metas
  const goals = data.goals.map((g, gi) => {
    const done = g.steps.filter(s => s.done).length, area = AREAS.find(a => a[0] === g.area) || AREAS[5];
    return {
      id: g.id, title: g.title, why: g.why || '', area: g.area, areaBg: area[1], horizon: g.horizon || 'Año 2027',
      pct: (g.steps.length ? Math.round(done / g.steps.length * 100) : 0) + '%',
      onTitle: e => { const v = e.target.value; setData(d => { d.goals[gi].title = v; }); },
      onWhy: e => { const v = e.target.value; setData(d => { d.goals[gi].why = v; }); },
      onDel: () => { if (window.confirm(`¿Borrar la meta «${g.title}»?`)) setData(d => { d.goals.splice(gi, 1); }); },
      steps: list('g-' + g.id, d => (d.goals.find(x => x.id === g.id) || {}).steps)
    };
  });
  const addGoal = () => { const v = (drafts.goal || '').trim(); if (!v) return; setData(d => { d.goals.unshift({ id: uid(), title: v, why: '', area: newArea, horizon: newHz, steps: [] }); }); setDraft('goal', ''); };

  // Finanzas
  const vm = data.months[month] || {}, tx = vm.tx || [], paid = vm.paid || {};
  const inc = tx.filter(t => t.type === 'ingreso').reduce((a, t) => a + t.amount, 0);
  const exp = tx.filter(t => t.type === 'gasto').reduce((a, t) => a + t.amount, 0);
  const addTx = () => {
    const a = num(drafts.txa); if (!a) return;
    const c = (drafts.txc || '').trim() || (txType === 'gasto' ? txCat : 'Ingreso');
    setData(d => { monOf(d, month).tx.unshift({ id: uid(), type: txType, concept: c, amount: a, cat: txType === 'gasto' ? txCat : '', date: todayIso.slice(0, 7) === month ? todayIso : `${month}-01` }); });
    setDrafts(s => ({ ...s, txa: '', txc: '' }));
  };
  const txs = tx.map((t, i) => { const dd = parse(t.date || `${month}-01`); return { key: t.id || i, date: `${dd.getDate()} ${MES[dd.getMonth()].slice(0, 3)}`, concept: t.concept, cat: t.cat, amount: (t.type === 'gasto' ? '−' : '+') + money(t.amount), color: t.type === 'gasto' ? '#3A2F2D' : '#5F7A5B', onDel: () => setData(d => { monOf(d, month).tx.splice(i, 1); }) }; });
  const budgets = CATS.map(c => {
    const spent = tx.filter(t => t.type === 'gasto' && t.cat === c).reduce((a, t) => a + t.amount, 0), b = num(data.budgets[c]);
    return { cat: c, spent: money(spent), budget: data.budgets[c] || '', width: b ? Math.min(100, spent / b * 100) + '%' : (spent ? '100%' : '0%'), barColor: b && spent > b ? '#C98B86' : '#A9BDA5', onBudget: e => { const v = e.target.value; setData(d => { d.budgets[c] = v; }); } };
  });
  const savings = rows(d => d.savings, ['name', 'saved', 'target'], x => ({ pct: (num(x.target) ? Math.min(100, Math.round(num(x.saved) / num(x.target) * 100)) : 0) + '%' }));
  const payments = rows(d => d.payments, ['name', 'amount', 'day'], x => ({ ...chk(!!paid[x.id]), onPaid: () => setData(d => { const m = monOf(d, month); m.paid[x.id] = !m.paid[x.id]; }) }));
  const pend = data.payments.filter(p => !paid[p.id]).reduce((a, p) => a + num(p.amount), 0);

  // Mi plan
  const contacts = rows(d => d.care.contacts, ['name', 'role', 'phone'], x => ({ tel: 'tel:' + String(x.phone || '').replace(/[^\d+]/g, '') }));
  const up = list('c-up', d => d.care.up), down = list('c-down', d => d.care.down), helps = list('c-help', d => d.care.helps);

  // Copias de seguridad
  const markBackup = () => setData(d => { d.meta.lastBackup = todayIso; });
  const onExport = async () => {
    const json = JSON.stringify({ v: 2, exportedAt: new Date().toISOString(), data: { ...data, meta: { ...data.meta, lastBackup: todayIso } } });
    const name = `mi-planner-${todayIso}.json`;
    try {
      const file = new File([json], name, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Copia de Mi Planner' });
        markBackup(); setToast('Copia guardada'); return;
      }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    markBackup(); setToast('Copia descargada');
  };
  const replaceAll = async (next, msg) => {
    await store.saveSafetyCopy(data);
    setDataRaw(normalize(next));
    setToast(msg);
  };
  const onImport = e => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    f.text().then(t => {
      let env = null; try { env = store.unwrap(JSON.parse(t)); } catch (err) {}
      if (!env) { window.alert('Ese archivo no es una copia de Mi Planner.'); return; }
      if (window.confirm('¿Restaurar esta copia? Reemplaza lo que tienes ahora (se guarda una copia de seguridad de tus datos actuales).')) replaceAll(env.data, 'Copia restaurada');
    });
  };

  const isDay = tab === 'hoy' || tab === 'bienestar';
  const isMon = tab === 'mes' || tab === 'habitos' || tab === 'finanzas';
  const saveLabel = status.ok === false ? 'No se pudo guardar' : status.saving ? 'Guardando…' : 'Guardado ✓';

  return (
    <div style={S("min-height:100vh;font-family:'Jost',sans-serif;background:#F7F2EC;padding:max(24px,env(safe-area-inset-top)) max(28px,env(safe-area-inset-right)) 72px max(28px,env(safe-area-inset-left))")}>
      <div style={S('max-width:880px;margin:0 auto;display:flex;flex-direction:column;gap:26px')}>

        <header style={S('display:flex;flex-direction:column;gap:16px')}>
          <div style={S('display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap')}>
            <div style={S('display:flex;flex-direction:column;gap:2px')}>
              <div style={S("font-family:'Cormorant Garamond',serif;font-style:italic;font-weight:600;font-size:34px;line-height:1")}>Mi Planner</div>
              <div style={S('font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#7A6A65')}>Octubre 2026 — Diciembre 2027</div>
            </div>
            <div style={S('display:flex;gap:4px;align-items:center;flex-wrap:wrap')}>
              <span role="status" style={S(`font-size:12px;color:${status.ok === false ? '#A8645F' : '#9C8D88'};padding:0 8px`)}>{saveLabel}</span>
              <button onClick={onExport} style={S('min-height:40px;padding:0 12px;border:none;background:transparent;font-size:13px;color:#7A6A65;cursor:pointer')}>Guardar copia</button>
              <button onClick={() => fileRef.current && fileRef.current.click()} style={S('min-height:40px;padding:0 12px;border:none;background:transparent;font-size:13px;color:#7A6A65;cursor:pointer')}>Restaurar</button>
              <button onClick={() => setShowSettings(true)} style={S('min-height:40px;padding:0 14px;border-radius:20px;border:1px solid #E0D2C8;background:#FFFDFB;font-size:13px;color:#3A2F2D;cursor:pointer')}>Ajustes</button>
              <input type="file" accept="application/json,.json" ref={fileRef} onChange={onImport} style={S('display:none')} />
            </div>
          </div>
          <nav style={S('display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;margin:0 -4px')}>
            {TABS.map(([k, l]) => (
              <button key={k} onClick={() => setU({ tab: k })} style={S(`flex-shrink:0;min-height:44px;padding:0 18px;border-radius:22px;border:1px solid ${tab === k ? '#3A2F2D' : '#E0D2C8'};background:${tab === k ? '#3A2F2D' : 'transparent'};color:${tab === k ? '#FFFDFB' : '#3A2F2D'};cursor:pointer;font-size:15px`)}>{l}</button>
            ))}
          </nav>
        </header>

        {isDay && (
          <div style={S('display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap')}>
            <div style={S('display:flex;flex-direction:column;gap:2px')}>
              <div style={S(`font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:${T.accent}`)}>{diff === 0 ? 'Hoy' : diff === 1 ? 'Mañana' : diff === -1 ? 'Ayer' : DOW[sd.getDay()]}</div>
              <div style={S("font-family:'Cormorant Garamond',serif;font-weight:500;font-size:56px;line-height:1")}>{cap(DOW[sd.getDay()]) + ' ' + sd.getDate()}</div>
              <div style={S("font-family:'Cormorant Garamond',serif;font-style:italic;font-size:22px;color:#7A6A65")}>{MES[sd.getMonth()] + ' ' + sd.getFullYear()}</div>
            </div>
            <div style={S('display:flex;gap:6px')}>
              <button onClick={() => setU({ sel: addDays(sel, -1) })} style={S(ROUND_BTN)}>‹</button>
              <button onClick={() => setU({ sel: todayIso })} style={S('height:44px;padding:0 18px;border-radius:22px;border:1px solid #E0D2C8;background:#FFFDFB;cursor:pointer;font-size:14px')}>Hoy</button>
              <button onClick={() => setU({ sel: addDays(sel, 1) })} style={S(ROUND_BTN)}>›</button>
            </div>
          </div>
        )}

        {isMon && (
          <div style={S('display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap')}>
            <div style={S('display:flex;flex-direction:column;gap:2px')}>
              <div style={S(`font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:${T.accent}`)}>{tab === 'mes' ? 'Vista mensual' : tab === 'habitos' ? 'Tracker de hábitos' : 'Finanzas'}</div>
              <div style={S("font-family:'Cormorant Garamond',serif;font-weight:500;font-size:56px;line-height:1")}>{cap(MES[mm - 1]) + ' ' + my}</div>
            </div>
            <div style={S('display:flex;gap:6px')}>
              <button onClick={shiftMonth(-1)} style={S(`${ROUND_BTN};opacity:${month <= MIN_M ? 0.35 : 1}`)}>‹</button>
              <button onClick={shiftMonth(1)} style={S(`${ROUND_BTN};opacity:${month >= MAX_M ? 0.35 : 1}`)}>›</button>
            </div>
          </div>
        )}

        {/* HOY */}
        {tab === 'hoy' && (
          <div style={S('display:flex;flex-direction:column;gap:18px')}>
            {showInstall && (
              <section style={S(`background:${T.soft};border-radius:20px;padding:16px 20px;display:flex;align-items:center;gap:16px;flex-wrap:wrap`)}>
                <div style={S('flex:1;min-width:240px;font-size:15px;line-height:1.45')}>Para que Safari nunca borre tus datos, añade Mi Planner a tu pantalla de inicio: toca <b>Compartir</b> y luego <b>«Añadir a pantalla de inicio»</b>. Ábrelo siempre desde ese icono.</div>
                <button onClick={() => setData(d => { d.meta.installTipHidden = true; })} style={S('min-height:44px;padding:0 18px;border-radius:22px;border:1px solid rgba(58,47,45,.2);background:#FFFDFB;cursor:pointer;font-size:14px')}>Entendido</button>
              </section>
            )}
            {backupDue && (
              <section style={S('background:#EFE6DD;border-radius:20px;padding:16px 20px;display:flex;align-items:center;gap:16px;flex-wrap:wrap')}>
                <div style={S('flex:1;min-width:240px;font-size:15px')}>{data.meta.lastBackup ? 'Llevas más de 7 días sin guardar una copia de tus datos.' : 'Aún no has guardado ninguna copia de tus datos.'} Guárdala en Archivos o iCloud Drive.</div>
                <button onClick={onExport} style={S('min-height:44px;padding:0 18px;border-radius:22px;border:none;background:#3A2F2D;color:#FFFDFB;cursor:pointer;font-size:14px')}>Guardar copia</button>
              </section>
            )}
            {alerts.length > 0 && (
              <section style={S('background:#F5EAD2;border-radius:20px;padding:16px 20px;display:flex;align-items:center;gap:16px;flex-wrap:wrap')}>
                <div style={S('flex:1;min-width:240px;display:flex;flex-direction:column;gap:4px')}>
                  {alerts.map(a => <div key={a} style={S('font-size:15px')}>{a}</div>)}
                </div>
                <button onClick={() => setU({ tab: 'cuidado' })} style={S('min-height:44px;padding:0 18px;border-radius:22px;border:none;background:#3A2F2D;color:#FFFDFB;cursor:pointer;font-size:14px')}>Ver mi plan</button>
              </section>
            )}

            <div style={S('display:flex;align-items:center;gap:14px')}>
              <span style={S('font-size:13px;color:#7A6A65;white-space:nowrap')}>Progreso del día</span>
              <div style={S('flex:1;height:6px;border-radius:3px;background:#EADFD6;overflow:hidden')}><div style={S(`height:100%;width:${dayPct};background:${T.mid};border-radius:3px`)} /></div>
              <span style={S('font-size:13px;color:#7A6A65;font-variant-numeric:tabular-nums')}>{dayPct}</span>
            </div>

            <div style={S('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr));gap:18px;align-items:start')}>
              <div style={S('display:flex;flex-direction:column;gap:18px')}>
                <section style={S(`background:${T.soft};border-radius:22px;padding:22px 22px 12px;display:flex;flex-direction:column;gap:4px`)}>
                  <div style={S(TITLE)}>Mis 3 prioridades</div>
                  <div style={S('font-size:13px;color:#6E5F5A;margin-bottom:6px')}>{day.mood != null && day.mood <= -2 ? 'Hoy basta con una. Sé amable contigo.' : 'Si solo hago esto hoy, el día cuenta.'}</div>
                  {top3.map(t => (
                    <div key={t.num} style={S('display:flex;align-items:center;gap:10px;min-height:48px;border-bottom:1px solid rgba(58,47,45,.08)')}>
                      <span style={S(`font-family:'Cormorant Garamond',serif;font-size:24px;color:${T.accent};width:16px`)}>{t.num}</span>
                      <input value={t.text} onChange={t.onText} placeholder="Prioridad…" style={S(`flex:1;min-width:0;border:none;background:transparent;font-size:16px;color:${t.textColor};text-decoration:${t.deco}`)} />
                      <button onClick={t.onToggle} style={S('width:44px;height:44px;display:flex;align-items:center;justify-content:center;border:none;background:transparent;cursor:pointer;padding:0')}><Box c={t} size={24} radius="round" /></button>
                    </div>
                  ))}
                </section>

                <section style={S(`${CARD};gap:2px`)}>
                  <div style={S(`${TITLE};margin-bottom:4px`)}>Pendientes</div>
                  {tasks.items.map(t => (
                    <div key={t.key} style={S('display:flex;align-items:center;gap:6px;min-height:44px;border-bottom:1px dashed #EDE3DA')}>
                      <button onClick={t.onToggle} style={S('width:38px;height:44px;display:flex;align-items:center;border:none;background:transparent;cursor:pointer;padding:0')}><Box c={t} /></button>
                      <input value={t.text} onChange={t.onText} style={S(`flex:1;min-width:0;border:none;background:transparent;font-size:16px;color:${t.textColor};text-decoration:${t.deco}`)} />
                      <button onClick={t.onDel} style={S('width:36px;height:44px;border:none;background:transparent;color:#B8A9A3;cursor:pointer;font-size:18px')}>×</button>
                    </div>
                  ))}
                  <div style={S('display:flex;align-items:center;gap:8px;min-height:48px')}>
                    <input value={tasks.draft} onChange={tasks.onDraft} onKeyDown={tasks.onKey} placeholder="Añadir tarea…" style={S('flex:1;min-width:0;border:none;background:transparent;font-size:16px')} />
                    <button onClick={tasks.onAdd} style={S('width:38px;height:38px;border-radius:50%;border:none;background:#EFE6DD;cursor:pointer;font-size:18px')}>+</button>
                  </div>
                </section>

                <section style={S(`${CARD};gap:12px`)}>
                  <div style={S(TITLE)}>Hábitos de hoy</div>
                  <div style={S('display:flex;flex-wrap:wrap;gap:8px')}>
                    {habitsToday.map(h => (
                      <button key={h.id} onClick={h.onToggle} style={S(`display:flex;align-items:center;gap:8px;min-height:44px;padding:0 16px 0 12px;border-radius:22px;border:1px solid ${h.border};background:${h.bg};cursor:pointer;font-size:14px`)}>
                        <span style={S(`width:12px;height:12px;border-radius:50%;background:${h.color}`)} />{h.name}
                      </button>
                    ))}
                  </div>
                </section>
              </div>

              <section style={S(`${CARD};gap:20px`)}>
                <div style={S('display:flex;flex-direction:column;gap:2px')}>
                  <div style={S(TITLE)}>Check-in</div>
                  <div style={S('font-size:13px;color:#7A6A65')}>Mejor cada día a la misma hora.</div>
                </div>
                <div style={S('display:flex;flex-direction:column;gap:8px')}>
                  <div style={S(`display:flex;justify-content:space-between;${LABEL}`)}><span>Ánimo</span><span style={S('letter-spacing:0;text-transform:none;font-size:14px;color:#3A2F2D')}>{validMood(day.mood) ? MOOD[day.mood + 3].l : 'Sin registrar'}</span></div>
                  <div style={S('display:flex;gap:4px')}>
                    {moodScale.map(m => <button key={m.num} onClick={m.onClick} style={S(`flex:1;height:48px;border-radius:12px;border:2px solid ${m.border};background:${m.bg};cursor:pointer;font-size:14px;padding:0;font-variant-numeric:tabular-nums`)}>{m.num}</button>)}
                  </div>
                  <div style={S('display:flex;justify-content:space-between;font-size:12px;color:#7A6A65')}><span>Muy baja</span><span>Estable</span><span>Muy alta</span></div>
                </div>
                <div style={S('display:flex;justify-content:space-between;align-items:center;gap:10px')}>
                  <div style={S(LABEL)}>Horas de sueño</div>
                  <div style={S('display:flex;align-items:center;gap:6px')}>
                    <button onClick={sleep.onMinus} style={S(ROUND_BTN)}>−</button>
                    <span style={S("min-width:64px;text-align:center;font-family:'Cormorant Garamond',serif;font-size:28px")}>{sleep.label}</span>
                    <button onClick={sleep.onPlus} style={S(ROUND_BTN)}>+</button>
                  </div>
                </div>
                <div style={S('display:flex;flex-direction:column;gap:8px')}>
                  <div style={S(LABEL)}>Medicación tomada</div>
                  {meds.length > 0
                    ? <Chips list={medsToday} h={44} />
                    : <button onClick={() => setU({ tab: 'cuidado' })} style={S('align-self:flex-start;min-height:40px;padding:0 14px;border-radius:20px;border:1px dashed #D9C9BE;background:transparent;cursor:pointer;font-size:14px;color:#7A6A65')}>Añade tus medicamentos en «Mi plan»</button>}
                </div>
                <div style={S('display:flex;flex-direction:column;gap:8px')}>
                  <div style={S(LABEL)}>Rutina ancla cumplida</div>
                  <Chips list={anchorsToday} h={44} />
                </div>
              </section>
            </div>

            <section style={S(`${CARD};gap:8px`)}>
              <div style={S('display:flex;justify-content:space-between;align-items:baseline;gap:10px')}>
                <div style={S(TITLE)}>Horario</div>
                <div style={S('font-size:13px;color:#7A6A65')}>{actsLabel}</div>
              </div>
              <div style={S('display:flex;flex-direction:column')}>
                {schedule.map(h => (
                  <div key={h.label} style={S('display:flex;gap:14px;border-bottom:1px solid #F1E9E2;padding:4px 0')}>
                    <span style={S('width:48px;flex-shrink:0;padding-top:13px;font-size:13px;color:#7A6A65;font-variant-numeric:tabular-nums')}>{h.label}</span>
                    <div style={S('flex:1;min-width:0;display:flex;flex-direction:column')}>
                      {h.list.items.map(t => (
                        <div key={t.key} style={S('display:flex;align-items:center;gap:6px;min-height:44px;border-bottom:1px dashed #F1E9E2')}>
                          <button onClick={t.onToggle} style={S('width:34px;height:44px;display:flex;align-items:center;border:none;background:transparent;cursor:pointer;padding:0;flex-shrink:0')}><Box c={t} /></button>
                          <input value={t.text} onChange={t.onText} style={S(`flex:1;min-width:0;border:none;background:transparent;font-size:15px;color:${t.textColor};text-decoration:${t.deco}`)} />
                          <button onClick={t.onDel} style={S('width:34px;height:44px;border:none;background:transparent;color:#B8A9A3;cursor:pointer;font-size:18px')}>×</button>
                        </div>
                      ))}
                      <div style={S('display:flex;align-items:center;gap:6px;min-height:44px')}>
                        <input value={h.list.draft} onChange={h.list.onDraft} onKeyDown={h.list.onKey} placeholder="+ añadir actividad" style={S('flex:1;min-width:0;border:none;background:transparent;font-size:15px')} />
                        <button onClick={h.list.onAdd} style={S('width:32px;height:32px;border-radius:50%;border:none;background:#F4EDE7;cursor:pointer;font-size:16px;flex-shrink:0')}>+</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div style={S('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr));gap:18px;align-items:start')}>
              <section style={S(`${CARD};gap:8px`)}>
                <div style={S(TITLE)}>Notas y gratitud</div>
                <textarea value={day.note || ''} onChange={e => { const v = e.target.value; upd(x => { x.note = v; }); }} placeholder="Hoy agradezco…" rows={5} style={S('width:100%;border:none;resize:vertical;font-size:16px;line-height:32px;background-image:repeating-linear-gradient(transparent 0 31px,#EDE3DA 31px 32px);background-color:transparent')} />
              </section>
              <section style={S('background:#EFE6DD;border-radius:22px;padding:22px;display:flex;flex-direction:column;gap:8px')}>
                <div style={S('font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#7A6A65')}>Recordatorio</div>
                <div style={S("font-family:'Cormorant Garamond',serif;font-style:italic;font-size:24px;line-height:1.3;text-wrap:pretty")}>{TIPS[doy % TIPS.length]}</div>
              </section>
            </div>
          </div>
        )}

        {/* SEMANA */}
        {tab === 'semana' && (
          <div style={S('display:flex;flex-direction:column;gap:18px')}>
            <div style={S('display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap')}>
              <div style={S('display:flex;flex-direction:column;gap:2px')}>
                <div style={S(`font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:${T.accent}`)}>Semana</div>
                <div style={S("font-family:'Cormorant Garamond',serif;font-weight:500;font-size:50px;line-height:1.05")}>{weekTitle}</div>
              </div>
              <div style={S('display:flex;gap:6px')}>
                <button onClick={() => setU({ sel: addDays(sel, -7) })} style={S(ROUND_BTN)}>‹</button>
                <button onClick={() => setU({ sel: todayIso })} style={S('height:44px;padding:0 18px;border-radius:22px;border:1px solid #E0D2C8;background:#FFFDFB;cursor:pointer;font-size:14px')}>Esta semana</button>
                <button onClick={() => setU({ sel: addDays(sel, 7) })} style={S(ROUND_BTN)}>›</button>
              </div>
            </div>
            <div style={S(`display:flex;align-items:center;gap:16px;background:${T.soft};border-radius:22px;padding:14px 22px;flex-wrap:wrap`)}>
              <span style={S("font-family:'Cormorant Garamond',serif;font-style:italic;font-weight:600;font-size:22px")}>Intención de la semana</span>
              <input value={data.weeks[ws] || ''} onChange={e => { const v = e.target.value; setData(d => { d.weeks[ws] = v; }); }} placeholder="Esta semana quiero sentirme…" style={S('flex:1;min-width:200px;min-height:44px;border:none;background:transparent;font-size:16px')} />
            </div>
            <div style={S('display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px')}>
              {weekDays.map(d => (
                <section key={d.k} style={S(`background:#FFFDFB;border:1px solid ${d.border};border-radius:20px;padding:16px 16px 8px;display:flex;flex-direction:column;gap:2px;min-height:200px`)}>
                  <button onClick={d.onOpen} style={S('display:flex;align-items:center;gap:10px;border:none;background:transparent;padding:0 0 8px;cursor:pointer;text-align:left')}>
                    <span style={S(`font-family:'Cormorant Garamond',serif;font-size:34px;line-height:1;color:${d.numColor}`)}>{d.num}</span>
                    <span style={S('font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#7A6A65;flex:1')}>{d.name}</span>
                    <span style={S(`width:14px;height:14px;border-radius:50%;background:${d.moodColor}`)} />
                  </button>
                  {d.list.items.map(t => (
                    <div key={t.key} style={S('display:flex;align-items:center;gap:4px;min-height:42px;border-bottom:1px dashed #EDE3DA')}>
                      <button onClick={t.onToggle} style={S('width:34px;height:42px;display:flex;align-items:center;border:none;background:transparent;cursor:pointer;padding:0')}><Box c={t} size={20} radius={6} /></button>
                      <input value={t.text} onChange={t.onText} style={S(`flex:1;min-width:0;border:none;background:transparent;font-size:15px;color:${t.textColor};text-decoration:${t.deco}`)} />
                      <button onClick={t.onDel} style={S('width:30px;height:42px;border:none;background:transparent;color:#B8A9A3;cursor:pointer')}>×</button>
                    </div>
                  ))}
                  <input value={d.list.draft} onChange={d.list.onDraft} onKeyDown={d.list.onKey} onBlur={d.list.onAdd} placeholder="+ añadir" style={S('min-height:44px;border:none;background:transparent;font-size:15px')} />
                </section>
              ))}
            </div>
          </div>
        )}

        {/* MES */}
        {tab === 'mes' && (
          <div style={S('display:flex;flex-direction:column;gap:18px')}>
            <section style={S('background:#FFFDFB;border:1px solid #EDE3DA;border-radius:22px;padding:18px;display:flex;flex-direction:column;gap:6px')}>
              <div style={S('display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px')}>
                {heads.map(l => <div key={l} style={S('text-align:center;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#7A6A65;padding:4px 0')}>{l}</div>)}
                {calCells.map(c => (
                  <div key={c.key} style={S(`min-height:104px;border-radius:14px;background:${c.bg};border:1px solid ${c.border};padding:6px;display:flex;flex-direction:column;gap:2px;min-width:0`)}>
                    {c.real && <>
                      <button onClick={c.onOpen} style={S('display:flex;justify-content:space-between;align-items:center;border:none;background:transparent;padding:0;cursor:pointer;min-height:28px')}>
                        <span style={S(`font-family:'Cormorant Garamond',serif;font-size:22px;color:${c.numColor}`)}>{c.num}</span>
                        <span style={S(`width:10px;height:10px;border-radius:50%;background:${c.moodColor}`)} />
                      </button>
                      <textarea value={c.event} onChange={c.onEvent} rows={2} style={S('flex:1;width:100%;border:none;resize:none;background:transparent;font-size:13px;line-height:1.3;padding:0')} />
                      <span style={S('font-size:11px;color:#7A6A65')}>{c.taskLabel}</span>
                    </>}
                  </div>
                ))}
              </div>
            </section>
            <section style={S(`background:${T.soft};border-radius:22px;padding:22px;display:flex;flex-direction:column;gap:2px`)}>
              <div style={S(`${TITLE};margin-bottom:4px`)}>Enfoque del mes</div>
              {monthFocus.items.map(t => (
                <div key={t.key} style={S('display:flex;align-items:center;gap:6px;min-height:44px;border-bottom:1px solid rgba(58,47,45,.08)')}>
                  <button onClick={t.onToggle} style={S('width:38px;height:44px;display:flex;align-items:center;border:none;background:transparent;cursor:pointer;padding:0')}><Box c={t} radius="round" /></button>
                  <input value={t.text} onChange={t.onText} style={S(`flex:1;min-width:0;border:none;background:transparent;font-size:16px;color:${t.textColor};text-decoration:${t.deco}`)} />
                  <button onClick={t.onDel} style={S('width:36px;height:44px;border:none;background:transparent;color:#9C8D88;cursor:pointer;font-size:18px')}>×</button>
                </div>
              ))}
              <input value={monthFocus.draft} onChange={monthFocus.onDraft} onKeyDown={monthFocus.onKey} onBlur={monthFocus.onAdd} placeholder="+ ¿En qué me enfoco este mes?" style={S('min-height:48px;border:none;background:transparent;font-size:16px')} />
            </section>
          </div>
        )}

        {/* HÁBITOS */}
        {tab === 'habitos' && (
          <div style={S('display:flex;flex-direction:column;gap:14px')}>
            <section style={S('background:#FFFDFB;border:1px solid #EDE3DA;border-radius:22px;padding:20px;overflow-x:auto')}>
              <div style={S('min-width:760px;display:flex;flex-direction:column;gap:4px')}>
                <div style={S('display:flex;align-items:flex-end;gap:8px')}>
                  <div style={S('width:150px;flex-shrink:0')} />
                  <div style={S('flex:1;display:flex;gap:2px')}>
                    {monthDays.map(md => <div key={md.k} style={S(`flex:1 1 0;min-width:16px;display:flex;flex-direction:column;align-items:center;font-size:10px;color:${md.color};line-height:1.3`)}><span>{md.dow}</span><span style={S('font-weight:500')}>{md.num}</span></div>)}
                  </div>
                  <div style={S('width:78px;flex-shrink:0;display:flex;justify-content:space-between;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#7A6A65')}><span>Mes</span><span>Racha</span></div>
                </div>
                {habitRows.map(r => (
                  <div key={r.id} style={S('display:flex;align-items:center;gap:8px;min-height:46px;border-top:1px solid #F1E9E2')}>
                    <div style={S('width:150px;flex-shrink:0;display:flex;align-items:center;gap:6px')}>
                      <span style={S(`width:10px;height:10px;border-radius:50%;background:${r.color};flex-shrink:0`)} />
                      <input value={r.name} onChange={r.onName} style={S('flex:1;min-width:0;border:none;background:transparent;font-size:14px')} />
                      <button onClick={r.onDel} style={S('width:24px;height:36px;border:none;background:transparent;color:#C9BBB5;cursor:pointer')}>×</button>
                    </div>
                    <div style={S('flex:1;display:flex;gap:2px')}>
                      {r.cells.map(c => <button key={c.k} onClick={c.onClick} aria-label={c.k} style={S(`flex:1 1 0;min-width:16px;height:34px;border-radius:7px;border:1.5px solid ${c.border};background:${c.bg};cursor:pointer;padding:0`)} />)}
                    </div>
                    <div style={S('width:78px;flex-shrink:0;display:flex;justify-content:space-between;font-size:14px;font-variant-numeric:tabular-nums')}><span>{r.pct}</span><span style={S(`color:${T.accent}`)}>{r.streak}</span></div>
                  </div>
                ))}
                <div style={S('display:flex;align-items:center;gap:10px;min-height:52px;border-top:1px solid #F1E9E2')}>
                  <input value={drafts.habit || ''} onChange={e => setDraft('habit', e.target.value)} onKeyDown={e => { if (isEnter(e)) addHabit(); }} placeholder="Nuevo hábito…" style={S('width:240px;min-height:44px;border:none;background:transparent;font-size:15px')} />
                  <button onClick={addHabit} style={S('min-height:40px;padding:0 16px;border-radius:20px;border:none;background:#EFE6DD;cursor:pointer;font-size:14px')}>Añadir hábito</button>
                </div>
              </div>
            </section>
            <div style={S('font-size:14px;color:#7A6A65')}>Toca una casilla para marcar el día. La racha cuenta días seguidos hasta hoy.</div>
          </div>
        )}

        {/* BIENESTAR */}
        {tab === 'bienestar' && (
          <div style={S('display:flex;flex-direction:column;gap:18px')}>
            <div style={S('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr));gap:18px;align-items:start')}>
              <section style={S(`${CARD};gap:12px`)}>
                <div style={S('display:flex;justify-content:space-between;align-items:baseline')}>
                  <div style={S(TITLE)}>Agua</div>
                  <div style={S('font-size:13px;color:#7A6A65')}>{`${day.water || 0} / ${hydration} vasos`}</div>
                </div>
                <div style={S('display:flex;flex-wrap:wrap;gap:6px')}>
                  {water.map((w, i) => <button key={i} onClick={w.onClick} aria-label={`Vaso ${i + 1}`} style={S(`width:34px;height:46px;border-radius:9px 9px 14px 14px;border:1.5px solid #A9BFCB;background:${w.bg};cursor:pointer;padding:0`)} />)}
                </div>
              </section>

              <section style={S(`${CARD};gap:12px`)}>
                <div style={S('display:flex;justify-content:space-between;align-items:center')}>
                  <div style={S(TITLE)}>Ejercicio</div>
                  <div style={S('display:flex;align-items:center;gap:6px')}>
                    <button onClick={exercise.onMinus} style={S('width:40px;height:40px;border-radius:50%;border:1px solid #E0D2C8;background:#FFFDFB;cursor:pointer;font-size:18px')}>−</button>
                    <span style={S('min-width:70px;text-align:center;font-size:16px')}>{exercise.label}</span>
                    <button onClick={exercise.onPlus} style={S('width:40px;height:40px;border-radius:50%;border:1px solid #E0D2C8;background:#FFFDFB;cursor:pointer;font-size:18px')}>+</button>
                  </div>
                </div>
                <Chips list={EX.map((l, i) => chip(l, day.exType === i, pick('exType', i)))} />
              </section>

              <section style={S(`${CARD};gap:14px`)}>
                <div style={S(TITLE)}>Cómo está mi cuerpo y mente</div>
                <div style={S('display:flex;flex-direction:column;gap:6px')}>
                  <div style={S(LABEL)}>Energía</div>
                  <Chips list={EN.map((l, i) => chip(l, day.energy === i, pick('energy', i)))} />
                </div>
                <div style={S('display:flex;flex-direction:column;gap:6px')}>
                  <div style={S(LABEL)}>Ansiedad</div>
                  <Chips list={LVL.map((l, i) => chip(l, day.anx === i, pick('anx', i)))} />
                </div>
                <div style={S('display:flex;flex-direction:column;gap:6px')}>
                  <div style={S(LABEL)}>Irritabilidad</div>
                  <Chips list={LVL.map((l, i) => chip(l, day.irr === i, pick('irr', i)))} />
                </div>
              </section>

              <section style={S(`background:${T.soft};border-radius:22px;padding:22px;display:flex;flex-direction:column;gap:14px`)}>
                <div style={S('display:flex;justify-content:space-between;align-items:center;gap:10px')}>
                  <div style={S(TITLE)}>Ciclo</div>
                  <button onClick={periodChip.onClick} style={S(`min-height:44px;padding:0 16px;border-radius:22px;border:1px solid ${periodChip.border};background:${periodChip.bg};cursor:pointer;font-size:14px`)}>{periodChip.label}</button>
                </div>
                <div style={S('display:flex;flex-direction:column;gap:6px')}>
                  <div style={S('font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#6E5F5A')}>Flujo</div>
                  <Chips list={FLOW.map((l, i) => chip(l, day.flow === i, pick('flow', i)))} />
                </div>
                <div style={S('display:flex;flex-direction:column;gap:6px')}>
                  <div style={S('font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#6E5F5A')}>Síntomas</div>
                  <Chips list={SYM.map((l, i) => chip(l, !!(day.sym || {})[i], tog('sym', i)))} />
                </div>
                <div style={S('font-size:13px;color:#6E5F5A')}>{cycleInfo}</div>
              </section>

              <section style={S(`${CARD};gap:14px`)}>
                <div style={S(TITLE)}>Skincare</div>
                <div style={S('display:flex;flex-direction:column;gap:6px')}>
                  <div style={S(LABEL)}>Mañana</div>
                  <Chips list={AM.map((l, i) => chip(l, !!(day.skinAm || {})[i], tog('skinAm', i)))} />
                </div>
                <div style={S('display:flex;flex-direction:column;gap:6px')}>
                  <div style={S(LABEL)}>Noche</div>
                  <Chips list={PM.map((l, i) => chip(l, !!(day.skinPm || {})[i], tog('skinPm', i)))} />
                </div>
              </section>
            </div>

            <section style={S(`${CARD};gap:14px;overflow-x:auto`)}>
              <div style={S('display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap')}>
                <div style={S(TITLE)}>Gráfica de ánimo · {MES[sd.getMonth()] + ' ' + sd.getFullYear()}</div>
                <div style={S('font-size:13px;color:#7A6A65')}>Llévala a tu consulta</div>
              </div>
              <div style={S('min-width:700px;display:flex;gap:8px')}>
                <div style={S('width:62px;flex-shrink:0;display:flex;flex-direction:column;gap:2px')}>
                  {[...MOOD].reverse().map(m => <div key={m.l} style={S('height:16px;font-size:10px;color:#7A6A65;display:flex;align-items:center')}>{m.l}</div>)}
                  <div style={S('height:20px;font-size:10px;color:#7A6A65;display:flex;align-items:center;margin-top:4px')}>Sueño</div>
                  <div style={S('height:14px;font-size:10px;color:#7A6A65;display:flex;align-items:center')}>Medic.</div>
                  <div style={S('height:14px;font-size:10px;color:#7A6A65;display:flex;align-items:center')}>Regla</div>
                  <div style={S('height:16px;font-size:10px;color:#7A6A65;display:flex;align-items:center')}>Día</div>
                </div>
                <div style={S('flex:1;display:flex;gap:2px')}>
                  {chart.map(d => (
                    <div key={d.num} style={S('flex:1 1 0;min-width:14px;display:flex;flex-direction:column;gap:2px;align-items:stretch')}>
                      {d.cells.map((bg, i) => <div key={i} style={S(`height:16px;border-radius:4px;background:${bg}`)} />)}
                      <div style={S(`height:20px;margin-top:4px;font-size:10px;text-align:center;display:flex;align-items:center;justify-content:center;color:${d.sleepColor}`)}>{d.sleep}</div>
                      <div style={S('height:14px;display:flex;align-items:center;justify-content:center')}><span style={S(`width:7px;height:7px;border-radius:50%;background:${d.medColor}`)} /></div>
                      <div style={S('height:14px;display:flex;align-items:center;justify-content:center')}><span style={S(`width:7px;height:7px;border-radius:50%;background:${d.periodColor}`)} /></div>
                      <div style={S('height:16px;font-size:10px;text-align:center;color:#7A6A65')}>{d.num}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* PRIORIDADES */}
        {tab === 'prioridades' && (
          <div style={S('display:flex;flex-direction:column;gap:18px')}>
            <div style={S('display:flex;flex-direction:column;gap:2px')}>
              <div style={S(`font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:${T.accent}`)}>Matriz de prioridades</div>
              <div style={S("font-family:'Cormorant Garamond',serif;font-weight:500;font-size:52px;line-height:1")}>¿Qué importa de verdad?</div>
              <div style={S('font-size:14px;color:#7A6A65;margin-top:6px')}>Vacía tu mente aquí y envía a «Hoy» lo que toca hacer.</div>
            </div>
            <div style={S('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr));gap:14px')}>
              {quadrants.map(q => (
                <section key={q.k} style={S(`background:${q.bg};border-radius:22px;padding:22px;display:flex;flex-direction:column;gap:2px;min-height:250px`)}>
                  <div style={S('display:flex;justify-content:space-between;align-items:baseline;gap:10px')}>
                    <div style={S("font-family:'Cormorant Garamond',serif;font-style:italic;font-weight:600;font-size:28px")}>{q.title}</div>
                    <div style={S('font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#6E5F5A')}>{q.sub}</div>
                  </div>
                  <div style={S('font-size:13px;color:#6E5F5A;margin-bottom:8px')}>{q.hint}</div>
                  {q.list.items.map(t => (
                    <div key={t.key} style={S('display:flex;align-items:center;gap:6px;min-height:44px;border-bottom:1px solid rgba(58,47,45,.08)')}>
                      <button onClick={t.onToggle} style={S('width:36px;height:44px;display:flex;align-items:center;border:none;background:transparent;cursor:pointer;padding:0')}><Box c={t} radius="round" /></button>
                      <input value={t.text} onChange={t.onText} style={S(`flex:1;min-width:0;border:none;background:transparent;font-size:16px;color:${t.textColor};text-decoration:${t.deco}`)} />
                      <button onClick={t.onToday} style={S('min-height:34px;padding:0 10px;border-radius:17px;border:1px solid rgba(58,47,45,.15);background:rgba(255,253,251,.6);cursor:pointer;font-size:12px')}>→ Hoy</button>
                      <button onClick={t.onDel} style={S('width:30px;height:44px;border:none;background:transparent;color:#9C8D88;cursor:pointer')}>×</button>
                    </div>
                  ))}
                  <div style={S('display:flex;align-items:center;gap:8px;min-height:48px')}>
                    <input value={q.list.draft} onChange={q.list.onDraft} onKeyDown={q.list.onKey} placeholder="Añadir…" style={S('flex:1;min-width:0;border:none;background:transparent;font-size:16px')} />
                    <button onClick={q.list.onAdd} style={S('width:38px;height:38px;border-radius:50%;border:none;background:rgba(255,253,251,.7);cursor:pointer;font-size:18px')}>+</button>
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}

        {/* METAS */}
        {tab === 'metas' && (
          <div style={S('display:flex;flex-direction:column;gap:18px')}>
            <div style={S('display:flex;flex-direction:column;gap:2px')}>
              <div style={S(`font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:${T.accent}`)}>Metas</div>
              <div style={S("font-family:'Cormorant Garamond',serif;font-weight:500;font-size:52px;line-height:1")}>Lo que estoy construyendo</div>
            </div>
            <section style={S('background:#FFFDFB;border:1px solid #EDE3DA;border-radius:22px;padding:18px 22px;display:flex;flex-direction:column;gap:12px')}>
              <div style={S('display:flex;align-items:center;gap:10px;flex-wrap:wrap')}>
                <input value={drafts.goal || ''} onChange={e => setDraft('goal', e.target.value)} onKeyDown={e => { if (isEnter(e)) addGoal(); }} placeholder="Nueva meta… (ej. Correr 5 km)" style={S('flex:1;min-width:220px;min-height:44px;border:none;border-bottom:1px solid #EDE3DA;background:transparent;font-size:17px')} />
                <button onClick={addGoal} style={S('min-height:44px;padding:0 20px;border-radius:22px;border:none;background:#3A2F2D;color:#FFFDFB;cursor:pointer;font-size:14px')}>Crear meta</button>
              </div>
              <Chips list={HORIZ.map(l => chip(l, newHz === l, () => setU({ newHz: l })))} h={36} fs={13} />
              <Chips list={AREAS.map(([l]) => chip(l, newArea === l, () => setU({ newArea: l })))} h={36} fs={13} />
            </section>
            <div style={S('display:grid;grid-template-columns:repeat(auto-fill,minmax(min(320px,100%),1fr));gap:14px;align-items:start')}>
              {goals.map(g => (
                <section key={g.id} style={S(`${CARD};gap:10px`)}>
                  <div style={S('display:flex;justify-content:space-between;align-items:center;gap:8px')}>
                    <div style={S('display:flex;gap:6px;flex-wrap:wrap')}>
                      <span style={S('font-size:11px;letter-spacing:.12em;text-transform:uppercase;padding:5px 10px;border-radius:12px;background:#3A2F2D;color:#FFFDFB')}>{g.horizon}</span>
                      <span style={S(`font-size:11px;letter-spacing:.12em;text-transform:uppercase;padding:5px 10px;border-radius:12px;background:${g.areaBg}`)}>{g.area}</span>
                    </div>
                    <button onClick={g.onDel} style={S('width:32px;height:32px;border:none;background:transparent;color:#B8A9A3;cursor:pointer;font-size:18px')}>×</button>
                  </div>
                  <input value={g.title} onChange={g.onTitle} style={S("border:none;background:transparent;font-family:'Cormorant Garamond',serif;font-weight:600;font-size:28px;line-height:1.1;padding:0")} />
                  <input value={g.why} onChange={g.onWhy} placeholder="¿Por qué me importa?" style={S('border:none;background:transparent;font-size:14px;color:#7A6A65;padding:0;min-height:32px')} />
                  <div style={S('display:flex;align-items:center;gap:12px')}>
                    <div style={S('flex:1;height:8px;border-radius:4px;background:#F1E9E2;overflow:hidden')}><div style={S(`height:100%;width:${g.pct};background:${T.mid};border-radius:4px`)} /></div>
                    <span style={S('font-size:14px;font-variant-numeric:tabular-nums')}>{g.pct}</span>
                  </div>
                  <div style={S('font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#7A6A65;margin-top:6px')}>Pasos</div>
                  <div style={S('display:flex;flex-direction:column')}>
                    {g.steps.items.map(t => (
                      <div key={t.key} style={S('display:flex;align-items:center;gap:6px;min-height:42px;border-bottom:1px dashed #EDE3DA')}>
                        <button onClick={t.onToggle} style={S('width:34px;height:42px;display:flex;align-items:center;border:none;background:transparent;cursor:pointer;padding:0')}><Box c={t} size={20} radius="round" /></button>
                        <input value={t.text} onChange={t.onText} style={S(`flex:1;min-width:0;border:none;background:transparent;font-size:15px;color:${t.textColor};text-decoration:${t.deco}`)} />
                        <button onClick={t.onDel} style={S('width:28px;height:42px;border:none;background:transparent;color:#B8A9A3;cursor:pointer')}>×</button>
                      </div>
                    ))}
                    <input value={g.steps.draft} onChange={g.steps.onDraft} onKeyDown={g.steps.onKey} onBlur={g.steps.onAdd} placeholder="+ añadir paso" style={S('min-height:44px;border:none;background:transparent;font-size:15px')} />
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}

        {/* FINANZAS */}
        {tab === 'finanzas' && (
          <div style={S('display:flex;flex-direction:column;gap:18px')}>
            <div style={S('display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px')}>
              <div style={S('background:#E3EADF;border-radius:20px;padding:18px;display:flex;flex-direction:column;gap:4px')}>
                <div style={S('font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#5E6B5B')}>Ingresos</div>
                <div style={S("font-family:'Cormorant Garamond',serif;font-size:32px")}>{money(inc)}</div>
              </div>
              <div style={S('background:#F4E4E0;border-radius:20px;padding:18px;display:flex;flex-direction:column;gap:4px')}>
                <div style={S('font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#7A5A57')}>Gastos</div>
                <div style={S("font-family:'Cormorant Garamond',serif;font-size:32px")}>{money(exp)}</div>
              </div>
              <div style={S('background:#FFFDFB;border:1px solid #EDE3DA;border-radius:20px;padding:18px;display:flex;flex-direction:column;gap:4px')}>
                <div style={S('font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#7A6A65')}>Balance</div>
                <div style={S(`font-family:'Cormorant Garamond',serif;font-size:32px;color:${inc - exp < 0 ? '#A8645F' : '#3A2F2D'}`)}>{money(inc - exp)}</div>
              </div>
            </div>

            <section style={S(`${CARD};gap:12px`)}>
              <div style={S(TITLE)}>Movimientos</div>
              <div style={S('display:flex;gap:8px;flex-wrap:wrap;align-items:center')}>
                {[['gasto', 'Gasto'], ['ingreso', 'Ingreso']].map(([k, l]) => (
                  <button key={k} onClick={() => setU({ txType: k })} style={S(`min-height:44px;padding:0 16px;border-radius:22px;border:1px solid ${txType === k ? T.mid : '#E6DAD0'};background:${txType === k ? T.soft : '#FFFDFB'};cursor:pointer;font-size:14px`)}>{l}</button>
                ))}
                <input value={drafts.txc || ''} onChange={e => setDraft('txc', e.target.value)} placeholder="Concepto" style={S('flex:2;min-width:140px;min-height:44px;border:none;border-bottom:1px solid #EDE3DA;background:transparent;font-size:16px')} />
                <input value={drafts.txa || ''} onChange={e => setDraft('txa', e.target.value)} onKeyDown={e => { if (isEnter(e)) addTx(); }} inputMode="decimal" placeholder="Monto" style={S('flex:1;min-width:90px;min-height:44px;border:none;border-bottom:1px solid #EDE3DA;background:transparent;font-size:16px')} />
                <button onClick={addTx} style={S('min-height:44px;padding:0 18px;border-radius:22px;border:none;background:#3A2F2D;color:#FFFDFB;cursor:pointer;font-size:14px')}>Añadir</button>
              </div>
              {txType === 'gasto' && <Chips list={CATS.map(c => chip(c, txCat === c, () => setU({ txCat: c })))} h={36} fs={13} />}
              <div style={S('display:flex;flex-direction:column')}>
                {txs.map(t => (
                  <div key={t.key} style={S('display:flex;align-items:center;gap:10px;min-height:46px;border-bottom:1px dashed #EDE3DA')}>
                    <span style={S('font-size:12px;color:#7A6A65;width:44px;font-variant-numeric:tabular-nums')}>{t.date}</span>
                    <span style={S('flex:1;min-width:0;font-size:15px')}>{t.concept}</span>
                    <span style={S('font-size:12px;color:#7A6A65')}>{t.cat}</span>
                    <span style={S(`min-width:90px;text-align:right;font-size:15px;font-variant-numeric:tabular-nums;color:${t.color}`)}>{t.amount}</span>
                    <button onClick={t.onDel} style={S('width:30px;height:44px;border:none;background:transparent;color:#B8A9A3;cursor:pointer')}>×</button>
                  </div>
                ))}
              </div>
            </section>

            <div style={S('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr));gap:18px;align-items:start')}>
              <section style={S(`${CARD};gap:10px`)}>
                <div style={S(TITLE)}>Presupuesto del mes</div>
                {budgets.map(b => (
                  <div key={b.cat} style={S('display:flex;flex-direction:column;gap:5px;padding:6px 0')}>
                    <div style={S('display:flex;align-items:center;gap:8px')}>
                      <span style={S('flex:1;font-size:15px')}>{b.cat}</span>
                      <span style={S('font-size:13px;color:#7A6A65;font-variant-numeric:tabular-nums')}>{b.spent} de</span>
                      <input value={b.budget} onChange={b.onBudget} inputMode="decimal" placeholder="0" style={S('width:72px;min-height:36px;border:none;border-bottom:1px solid #EDE3DA;background:transparent;font-size:15px;text-align:right')} />
                    </div>
                    <div style={S('height:6px;border-radius:3px;background:#F1E9E2;overflow:hidden')}><div style={S(`height:100%;width:${b.width};background:${b.barColor};border-radius:3px`)} /></div>
                  </div>
                ))}
              </section>

              <div style={S('display:flex;flex-direction:column;gap:18px')}>
                <section style={S('background:#F5EAD2;border-radius:22px;padding:22px;display:flex;flex-direction:column;gap:10px')}>
                  <div style={S(TITLE)}>Metas de ahorro</div>
                  {savings.map(s => (
                    <div key={s.key} style={S('display:flex;flex-direction:column;gap:6px;padding:8px 0;border-bottom:1px solid rgba(58,47,45,.08)')}>
                      <div style={S('display:flex;align-items:center;gap:6px')}>
                        <input value={s.name} onChange={s.onName} placeholder="Nombre" style={S('flex:1;min-width:0;min-height:36px;border:none;background:transparent;font-size:16px')} />
                        <button onClick={s.onDel} style={S('width:30px;height:36px;border:none;background:transparent;color:#9C8D88;cursor:pointer')}>×</button>
                      </div>
                      <div style={S('display:flex;align-items:center;gap:8px;font-size:13px;color:#6E5F5A')}>
                        <span>Llevo</span>
                        <input value={s.saved} onChange={s.onSaved} inputMode="decimal" style={S('width:80px;min-height:34px;border:none;border-bottom:1px solid rgba(58,47,45,.15);background:transparent;font-size:15px')} />
                        <span>de</span>
                        <input value={s.target} onChange={s.onTarget} inputMode="decimal" style={S('width:80px;min-height:34px;border:none;border-bottom:1px solid rgba(58,47,45,.15);background:transparent;font-size:15px')} />
                        <span style={S('margin-left:auto;font-variant-numeric:tabular-nums')}>{s.pct}</span>
                      </div>
                      <div style={S('height:6px;border-radius:3px;background:rgba(255,253,251,.7);overflow:hidden')}><div style={S(`height:100%;width:${s.pct};background:#C9A66B;border-radius:3px`)} /></div>
                    </div>
                  ))}
                  <button onClick={addRow(d => d.savings, { name: '', saved: '', target: '' })} style={S('align-self:flex-start;min-height:40px;padding:0 14px;border-radius:20px;border:1px dashed rgba(58,47,45,.25);background:transparent;cursor:pointer;font-size:14px')}>+ Nueva meta de ahorro</button>
                </section>

                <section style={S(`${CARD};gap:6px`)}>
                  <div style={S('display:flex;justify-content:space-between;align-items:baseline')}>
                    <div style={S(TITLE)}>Pagos y suscripciones</div>
                    <div style={S('font-size:13px;color:#7A6A65')}>{'Pendiente: ' + money(pend)}</div>
                  </div>
                  {payments.map(p => (
                    <div key={p.key} style={S('display:flex;align-items:center;gap:6px;min-height:46px;border-bottom:1px dashed #EDE3DA')}>
                      <button onClick={p.onPaid} style={S('width:36px;height:44px;display:flex;align-items:center;border:none;background:transparent;cursor:pointer;padding:0')}><Box c={p} radius="round" /></button>
                      <input value={p.name} onChange={p.onName} placeholder="Pago" style={S(`flex:1;min-width:0;border:none;background:transparent;font-size:15px;color:${p.textColor}`)} />
                      <span style={S('font-size:12px;color:#7A6A65')}>día</span>
                      <input value={p.day} onChange={p.onDay} inputMode="numeric" style={S('width:34px;min-height:34px;border:none;border-bottom:1px solid #EDE3DA;background:transparent;font-size:14px;text-align:center')} />
                      <input value={p.amount} onChange={p.onAmount} inputMode="decimal" placeholder="0" style={S('width:70px;min-height:34px;border:none;border-bottom:1px solid #EDE3DA;background:transparent;font-size:14px;text-align:right')} />
                      <button onClick={p.onDel} style={S('width:28px;height:44px;border:none;background:transparent;color:#B8A9A3;cursor:pointer')}>×</button>
                    </div>
                  ))}
                  <button onClick={addRow(d => d.payments, { name: '', amount: '', day: '' })} style={S(DASH_BTN)}>+ Añadir pago</button>
                </section>
              </div>
            </div>
          </div>
        )}

        {/* MI PLAN */}
        {tab === 'cuidado' && (
          <div style={S('display:flex;flex-direction:column;gap:18px')}>
            <div style={S('display:flex;flex-direction:column;gap:6px')}>
              <div style={S(`font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:${T.accent}`)}>Mi plan de estabilidad</div>
              <div style={S("font-family:'Cormorant Garamond',serif;font-weight:500;font-size:52px;line-height:1")}>Cuidarme con estructura</div>
              <div style={S('font-size:14px;color:#7A6A65;max-width:620px;text-wrap:pretty')}>Este planner te ayuda a organizarte y a ver tus patrones. No sustituye a tu psiquiatra ni a tu terapeuta. Si estás en crisis, llama a tu contacto de emergencia o al número de emergencias de tu país.</div>
            </div>

            <div style={S('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr));gap:18px;align-items:start')}>
              <section style={S(`${CARD};gap:6px`)}>
                <div style={S(TITLE)}>Medicación</div>
                {rows(d => d.care.meds, ['name', 'dose', 'time']).map(m => (
                  <div key={m.key} style={S('display:flex;align-items:center;gap:8px;min-height:46px;border-bottom:1px dashed #EDE3DA')}>
                    <input value={m.name} onChange={m.onName} placeholder="Nombre" style={S('flex:2;min-width:0;border:none;background:transparent;font-size:15px')} />
                    <input value={m.dose} onChange={m.onDose} placeholder="Dosis" style={S('flex:1;min-width:0;border:none;background:transparent;font-size:14px;color:#7A6A65')} />
                    <input type="time" value={m.time} onChange={m.onTime} style={S('width:96px;border:none;background:#F7F2EC;border-radius:10px;padding:6px 8px;font-size:14px')} />
                    <button onClick={m.onDel} style={S('width:28px;height:44px;border:none;background:transparent;color:#B8A9A3;cursor:pointer')}>×</button>
                  </div>
                ))}
                <button onClick={addRow(d => d.care.meds, { name: '', dose: '', time: '' })} style={S(DASH_BTN)}>+ Añadir medicamento</button>
              </section>

              <section style={S(`${CARD};gap:6px`)}>
                <div style={S(TITLE)}>Rutina ancla</div>
                <div style={S('font-size:13px;color:#7A6A65;margin-bottom:4px')}>Las mismas horas cada día, también el fin de semana.</div>
                {rows(d => d.care.anchors, ['time', 'label']).map(a => (
                  <div key={a.key} style={S('display:flex;align-items:center;gap:8px;min-height:46px;border-bottom:1px dashed #EDE3DA')}>
                    <input type="time" value={a.time} onChange={a.onTime} style={S('width:96px;border:none;background:#F7F2EC;border-radius:10px;padding:6px 8px;font-size:14px')} />
                    <input value={a.label} onChange={a.onLabel} style={S('flex:1;min-width:0;border:none;background:transparent;font-size:15px')} />
                    <button onClick={a.onDel} style={S('width:28px;height:44px;border:none;background:transparent;color:#B8A9A3;cursor:pointer')}>×</button>
                  </div>
                ))}
                <button onClick={addRow(d => d.care.anchors, { time: '', label: '' })} style={S(DASH_BTN)}>+ Añadir ancla</button>
              </section>

              {[['Señales de subida', 'Lo que noto cuando voy hacia arriba.', '#F5EAD2', '#6E5F5A', up, '+ añadir señal'],
                ['Señales de bajada', 'Lo que noto cuando voy hacia abajo.', '#E1E7EE', '#5E6570', down, '+ añadir señal'],
                ['Lo que me ayuda', 'Acciones concretas cuando noto una señal.', '#E3EADF', '#5E6B5B', helps, '+ añadir']].map(([title, sub, bg, subC, l, ph]) => (
                <section key={title} style={S(`background:${bg};border-radius:22px;padding:22px;display:flex;flex-direction:column;gap:2px`)}>
                  <div style={S(TITLE)}>{title}</div>
                  <div style={S(`font-size:13px;color:${subC};margin-bottom:6px`)}>{sub}</div>
                  {l.items.map(t => (
                    <div key={t.key} style={S('display:flex;align-items:center;gap:6px;min-height:44px;border-bottom:1px solid rgba(58,47,45,.08)')}>
                      <input value={t.text} onChange={t.onText} style={S('flex:1;min-width:0;border:none;background:transparent;font-size:15px')} />
                      <button onClick={t.onDel} style={S('width:30px;height:44px;border:none;background:transparent;color:#9C8D88;cursor:pointer')}>×</button>
                    </div>
                  ))}
                  <input value={l.draft} onChange={l.onDraft} onKeyDown={l.onKey} onBlur={l.onAdd} placeholder={ph} style={S('min-height:44px;border:none;background:transparent;font-size:15px')} />
                </section>
              ))}

              <section style={S(`${CARD};gap:6px`)}>
                <div style={S(TITLE)}>Mi red de apoyo</div>
                {contacts.map(c => (
                  <div key={c.key} style={S('display:flex;align-items:center;gap:8px;min-height:48px;border-bottom:1px dashed #EDE3DA;flex-wrap:wrap')}>
                    <input value={c.name} onChange={c.onName} placeholder="Nombre" style={S('flex:1;min-width:90px;border:none;background:transparent;font-size:15px')} />
                    <input value={c.role} onChange={c.onRole} placeholder="Psiquiatra, amiga…" style={S('flex:1;min-width:90px;border:none;background:transparent;font-size:13px;color:#7A6A65')} />
                    <input value={c.phone} onChange={c.onPhone} inputMode="tel" placeholder="Teléfono" style={S('width:110px;border:none;background:transparent;font-size:14px')} />
                    <a href={c.tel} style={S('min-height:36px;padding:0 12px;border-radius:18px;background:#3A2F2D;color:#FFFDFB;font-size:13px;text-decoration:none;display:flex;align-items:center')}>Llamar</a>
                    <button onClick={c.onDel} style={S('width:28px;height:44px;border:none;background:transparent;color:#B8A9A3;cursor:pointer')}>×</button>
                  </div>
                ))}
                <button onClick={addRow(d => d.care.contacts, { name: '', role: '', phone: '' })} style={S(DASH_BTN)}>+ Añadir contacto</button>
              </section>
            </div>

            <section style={S('background:#EFE6DD;border-radius:22px;padding:26px;display:flex;flex-direction:column;gap:14px')}>
              <div style={S("font-family:'Cormorant Garamond',serif;font-style:italic;font-weight:600;font-size:30px")}>Tips para mantener el equilibrio</div>
              <div style={S('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:14px 28px')}>
                {CARE_TIPS.map((t, i) => (
                  <div key={i} style={S('display:flex;gap:12px')}><span style={S("font-family:'Cormorant Garamond',serif;font-size:24px;color:#7A6A65;line-height:1")}>{pad(i + 1)}</span><span style={S('font-size:15px;line-height:1.5;text-wrap:pretty')}>{t}</span></div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>

      {showSettings && (
        <Settings
          data={data} T={T} persisted={persisted}
          onClose={() => setShowSettings(false)}
          setSetting={(k, v) => setData(d => { d.settings[k] = v; })}
          onExport={onExport}
          onImportClick={() => fileRef.current && fileRef.current.click()}
          onRestoreSnapshot={async key => {
            const env = await store.readSnapshot(key);
            if (!env) { window.alert('No se pudo leer esa copia.'); return; }
            if (window.confirm('¿Volver a esta copia automática? Reemplaza lo que tienes ahora (se guarda una copia de seguridad de tus datos actuales).')) { await replaceAll(env.data, 'Copia automática restaurada'); setShowSettings(false); }
          }}
          onPersist={() => store.requestPersistence().then(setPersisted)}
        />
      )}

      {toast && <div role="status" style={S('position:fixed;left:50%;bottom:max(24px,env(safe-area-inset-bottom));transform:translateX(-50%);background:#3A2F2D;color:#FFFDFB;padding:12px 20px;border-radius:22px;font-size:14px;box-shadow:0 8px 24px rgba(58,47,45,.18);z-index:30')}>{toast}</div>}
    </div>
  );
}
