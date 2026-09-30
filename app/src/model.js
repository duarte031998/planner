export const MIN_M = '2026-10', MAX_M = '2027-12';
export const pad = n => String(n).padStart(2, '0');
export const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d || 1); };
export const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
export const DOW = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const DOWS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
export const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
export const uid = () => Math.random().toString(36).slice(2, 9);
export const num = v => parseFloat(String(v || '').replace(',', '.')) || 0;
export const clampM = m => m < MIN_M ? MIN_M : m > MAX_M ? MAX_M : m;
export const HCOL = ['#C98B86', '#9DB39A', '#B3A3C4', '#D9B77A', '#9AB6C4'];
export const MOOD = [
  { l: 'Muy baja', c: '#8FA3B8' }, { l: 'Baja', c: '#AABACB' }, { l: 'Algo baja', c: '#CAD4DE' },
  { l: 'Estable', c: '#B9C9B2' }, { l: 'Algo alta', c: '#EDD6AA' }, { l: 'Alta', c: '#E5B792' }, { l: 'Muy alta', c: '#D6957E' }
];
export const THEMES = {
  'Rosa empolvado': { accent: '#A8645F', mid: '#C98B86', soft: '#F4E4E0' },
  'Latte': { accent: '#8A6A52', mid: '#B8977E', soft: '#EFE3D6' },
  'Salvia': { accent: '#5F7A5B', mid: '#98AE94', soft: '#E3EADF' }
};
export const AREAS = [['Salud', '#E3EADF'], ['Carrera', '#E7E1EE'], ['Finanzas', '#F5EAD2'], ['Relaciones', '#F4E4E0'], ['Crecimiento', '#E1E7EE'], ['Hogar', '#EFE6DD']];
export const HORIZ = ['Q4 2026', 'Q1 2027', 'Q2 2027', 'Q3 2027', 'Q4 2027', 'Año 2027'];
export const CATS = ['Casa', 'Comida', 'Transporte', 'Salud', 'Personal', 'Ocio', 'Ahorro', 'Otros'];
export const EX = ['Caminar', 'Yoga', 'Fuerza', 'Baile', 'Pilates', 'Otro'];
export const LVL = ['Nada', 'Leve', 'Media', 'Alta'];
export const EN = ['Muy baja', 'Baja', 'Normal', 'Alta', 'Muy alta'];
export const FLOW = ['Ligero', 'Medio', 'Abundante'];
export const SYM = ['Cólicos', 'Hinchazón', 'Dolor de cabeza', 'Sensibilidad', 'Antojos'];
export const AM = ['Limpieza', 'Sérum', 'Hidratante', 'Protector solar'];
export const PM = ['Desmaquillar', 'Limpieza', 'Tratamiento', 'Hidratante'];
export const TIPS = [
  'Despertar a la misma hora cada día es una de las anclas más fuertes para el ánimo.',
  'Si hoy te sientes baja, una sola prioridad es suficiente.',
  'Antes de un gasto grande, espera 48 horas.',
  'Tu registro de hoy ayuda a tu yo de dentro de un mes.',
  'Menos pantallas en la última hora antes de dormir.',
  'Comer a horas regulares también es parte de la rutina.',
  'Escribe una cosa que salió bien hoy, aunque sea pequeña.'
];
export const CARE_TIPS = [
  'Mantén horarios regulares para despertar, comer y dormir, también el fin de semana. La regularidad protege el ánimo.',
  'Dormir menos de lo habitual puede ser una señal temprana y también un detonante. Si pasa dos noches seguidas, avisa a tu equipo.',
  'Registra tu ánimo cada día. El patrón de varias semanas dice más que un día suelto.',
  'No cambies ni dejes la medicación sin hablarlo con tu psiquiatra, aunque te sientas bien.',
  'Reduce el alcohol y la cafeína, sobre todo por la tarde.',
  'Antes de una decisión grande, como un gasto o un compromiso nuevo, espera 48 horas y coméntalo con alguien de confianza.',
  'En días bajos, planifica menos. Una sola prioridad también cuenta.',
  'Lleva la gráfica de ánimo a tus citas. Ayuda a ajustar el tratamiento.'
];
export const SETTINGS = { estilo: 'Rosa empolvado', moneda: '$', weekStart: 'Lunes', dayStartHour: 6, hydrationGoal: 8 };

export const it = t => ({ id: uid(), text: t, done: false });
export const seed = () => ({
  habits: [{ id: 'h1', name: 'Beber 2 L de agua', color: 0 }, { id: 'h2', name: 'Leer 20 min', color: 1 }, { id: 'h3', name: 'Moverme 30 min', color: 2 }, { id: 'h4', name: 'Meditar', color: 3 }, { id: 'h5', name: 'Sin pantallas 22 h', color: 4 }],
  log: {}, days: {}, weeks: {}, months: {}, budgets: {},
  matrix: { q1: [], q2: [], q3: [], q4: [] },
  goals: [{ id: 'g1', title: 'Leer 12 libros', why: 'Quiero tiempo tranquilo para mí', area: 'Crecimiento', horizon: 'Año 2027', steps: [it('Elegir lista de libros'), it('Leer 20 min cada noche'), it('Terminar el primero')] }],
  savings: [{ id: 's1', name: 'Fondo de emergencia', saved: '', target: '' }],
  payments: [{ id: 'p1', name: 'Alquiler', amount: '', day: '1' }, { id: 'p2', name: 'Teléfono', amount: '', day: '15' }],
  care: {
    meds: [], contacts: [{ id: 'c1', name: '', role: 'Psiquiatra', phone: '' }, { id: 'c2', name: '', role: 'Persona de confianza', phone: '' }],
    anchors: [{ id: 'a1', time: '07:30', label: 'Despertar' }, { id: 'a2', time: '08:00', label: 'Desayuno' }, { id: 'a3', time: '14:00', label: 'Comida' }, { id: 'a4', time: '21:00', label: 'Cena' }, { id: 'a5', time: '23:00', label: 'Dormir' }],
    up: [it('Duermo menos y no me siento cansada'), it('Hablo más rápido o salto de idea en idea'), it('Gasto de forma impulsiva')],
    down: [it('Me aíslo y cancelo planes'), it('Duermo mucho más de lo habitual'), it('Me cuesta empezar cosas pequeñas')],
    helps: [it('Llamar a mi persona de confianza'), it('Volver a mi rutina ancla'), it('Adelantar la cita con mi psiquiatra')]
  },
  settings: { ...SETTINGS },
  meta: { created: iso(new Date()), lastBackup: null, installTipHidden: false }
});

// Ánimo válido: entero de −3 a +3; cualquier otro valor cuenta como «sin registrar».
export const validMood = m => Number.isInteger(m) && m >= -3 && m <= 3;
// v1 del prototipo: 0 Radiante, 1 Feliz, 2 Tranquila, 3 Cansada, 4 Triste, −1 sin registrar.
const V1_MOOD = [2, 1, 0, -1, -2];
const arr = v => Array.isArray(v) ? v.filter(x => x && typeof x === 'object') : [];

// Completa campos que falten (copias antiguas, versión v1 del prototipo).
export function normalize(d) {
  const s = seed();
  const src = d && typeof d === 'object' ? d : {};
  const isV1 = !src.care && !src.settings;
  const x = { ...s, ...src };
  x.care = { ...s.care, ...(x.care || {}) };
  for (const k of ['meds', 'contacts', 'anchors', 'up', 'down', 'helps']) x.care[k] = arr(x.care[k]);
  x.matrix = { ...s.matrix, ...(x.matrix || {}) };
  for (const k of ['q1', 'q2', 'q3', 'q4']) x.matrix[k] = arr(x.matrix[k]);
  x.settings = { ...SETTINGS, ...(x.settings || {}) };
  x.meta = { ...s.meta, ...(x.meta || {}) };
  for (const k of ['log', 'days', 'weeks', 'months', 'budgets']) if (!x[k] || typeof x[k] !== 'object' || Array.isArray(x[k])) x[k] = {};
  for (const k of ['habits', 'goals', 'savings', 'payments']) x[k] = arr(x[k]);
  x.goals = x.goals.map(g => ({ ...g, title: String(g.title || ''), steps: arr(g.steps), horizon: g.horizon || 'Año 2027' }));
  x.habits = x.habits.map((h, i) => ({ ...h, id: h.id || 'h' + i + uid(), name: String(h.name || ''), color: Number.isInteger(h.color) ? h.color : i % 5 }));
  for (const k of Object.keys(x.months)) { const m = x.months[k]; if (!m || typeof m !== 'object') { delete x.months[k]; continue; } for (const f of ['focus', 'tx']) if (m[f]) m[f] = arr(m[f]); if (m.tx) m.tx = m.tx.map(t => ({ ...t, amount: Number(t.amount) || 0 })); }

  const days = {};
  for (const [k, v] of Object.entries(x.days)) {
    if (!v || typeof v !== 'object') continue;
    const day = { ...v };
    if (isV1 && typeof day.mood === 'number') day.mood = V1_MOOD[day.mood] ?? null;
    if (day.mood != null && !validMood(day.mood)) day.mood = null;
    if (day.top3) day.top3 = [0, 1, 2].map(i => { const t = Array.isArray(day.top3) ? day.top3[i] : null; return { text: String((t && t.text) || ''), done: !!(t && t.done) }; });
    if (day.tasks) day.tasks = arr(day.tasks);
    if (day.hs && typeof day.hs === 'object') day.hs = Object.fromEntries(Object.entries(day.hs).map(([h, l]) => [h, arr(l)]));
    // Horario de la v1 (texto por hora) → checklist por hora.
    if (day.sched && typeof day.sched === 'object') {
      for (const [h, txt] of Object.entries(day.sched)) {
        const t = typeof txt === 'string' ? txt : (txt && typeof txt.text === 'string' ? txt.text : '');
        if (!t.trim()) continue;
        day.hs = { ...(day.hs || {}) };
        day.hs[h] = [...arr(day.hs[h]), { ...it(t.trim()), done: !!(txt && txt.done) }];
      }
      day.sched = {};
    }
    days[k] = day;
  }
  x.days = days;
  return x;
}
