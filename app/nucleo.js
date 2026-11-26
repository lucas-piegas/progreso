'use strict';
/* Núcleo compartido: utilidades, guardado, hojas, secciones y la etapa del plan.
   Lo cargan todas las secciones (comida.js, entreno.js, medir.js, hoy.js). */

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const redondo = (x) => Math.round(x);
const uno = (x) => Math.round(x * 10) / 10;
const aNumero = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : NaN; };
const claveFecha = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fechaDeClave = (k) => new Date(k + 'T00:00:00');
const fmt = (x, d = 1) => (Number.isFinite(x) ? x.toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—');

let temporizadorAviso;
function avisar(texto) {
  const a = $('#aviso'); a.textContent = texto; a.hidden = false;
  clearTimeout(temporizadorAviso); temporizadorAviso = setTimeout(() => { a.hidden = true; }, 2200);
}

/* ---------- guardado ---------- */
// Cada parte usa su prefijo: «cc.» comida (el mismo de la app Calorías), «en.» entreno, «me.» mediciones.
function almacen(prefijo) {
  return {
    leer(clave, defecto) {
      try { const v = localStorage.getItem(prefijo + clave); return v ? JSON.parse(v) : defecto; } catch (e) { return defecto; }
    },
    escribir(clave, valor) {
      try { localStorage.setItem(prefijo + clave, JSON.stringify(valor)); } catch (e) { avisar('No se pudo guardar: ' + e.message); }
    },
  };
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

/* ---------- hojas (pantallas que se abren encima) ---------- */
const pilaHojas = [];
const alCerrarHoja = {}; // id → función que corre al cerrar esa hoja
function abrirHoja(id) {
  if (!pilaHojas.includes(id)) pilaHojas.push(id);
  $(id).hidden = false; $(id).scrollTop = 0;
  document.body.style.overflow = 'hidden';
}
function cerrarHoja() {
  const id = pilaHojas.pop();
  if (id) { $(id).hidden = true; if (alCerrarHoja[id]) alCerrarHoja[id](); }
  if (!pilaHojas.length) document.body.style.overflow = '';
}
function cerrarTodasLasHojas() { while (pilaHojas.length) cerrarHoja(); }
document.addEventListener('click', (e) => { if (e.target.closest('[data-cerrar]')) cerrarHoja(); });

/* ---------- secciones (pestañas de abajo) ---------- */
const alEntrarSeccion = {}; // nombre → función que repinta la sección
let seccionActual = 'hoy';
function irSeccion(nombre) {
  cerrarTodasLasHojas();
  seccionActual = nombre;
  $$('.seccion').forEach((s) => s.classList.toggle('activa', s.id === nombre));
  $$('#pestanas [data-seccion]').forEach((b) => b.classList.toggle('activa', b.dataset.seccion === nombre));
  if (alEntrarSeccion[nombre]) alEntrarSeccion[nombre]();
  window.scrollTo(0, 0);
}
$$('#pestanas [data-seccion]').forEach((b) => b.addEventListener('click', () => irSeccion(b.dataset.seccion)));

// Sub-pestañas dentro de una sección: muestra la vista elegida y avisa cuál es.
function subnav(selector, alCambiar) {
  const nav = $(selector);
  const elegir = (vista) => {
    nav.querySelectorAll('[data-vista]').forEach((b) => b.classList.toggle('activa', b.dataset.vista === vista));
    nav.parentElement.querySelectorAll('.vista').forEach((v) => v.classList.toggle('activa', v.id === vista));
    alCambiar(vista);
  };
  nav.addEventListener('click', (e) => { const b = e.target.closest('[data-vista]'); if (b) { elegir(b.dataset.vista); window.scrollTo(0, 0); } });
  return elegir;
}

/* ---------- la etapa: en qué semana del plan estamos ---------- */
const ETAPA = (() => {
  const P = window.PLAN;
  const inicio = new Date(P.inicio + 'T00:00:00');
  const total = P.semanas.length;
  const semanaDeFecha = (d) => Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - inicio) / 864e5 / 7) + 1;
  const semanasConTests = P.semanas.filter((w) => w.tests).map((w) => w.n);
  // Texto corto de la etapa para una fecha: «Semana 2 de 8 · Base», «Antes del plan», «Después del plan».
  function texto(d = new Date()) {
    const s = semanaDeFecha(d);
    if (s < 1) return `El plan arranca el lunes ${P.semanas[0].desde}`;
    if (s > total) return 'Plan terminado';
    return `Semana ${s} de ${total} · ${P.semanas[s - 1].bloque}`;
  }
  return { inicio, total, semanaDeFecha, semanasConTests, texto, plan: P };
})();

// La franja de las 8 semanas. «marcas» opcional: semana → true si tiene algo medido.
function pintarFranja(caja, { marcas = {}, alTocar } = {}) {
  const actual = ETAPA.semanaDeFecha(new Date());
  caja.innerHTML = ETAPA.plan.semanas.map((w) => {
    const cls = ['tramo', w.n < actual ? 'pasado' : '', w.n === actual ? 'actual' : '', w.tests ? 'test' : '', marcas[w.n] ? 'medido' : ''].join(' ');
    return `<button class="${cls}" data-semana="${w.n}" aria-label="Semana ${w.n}${w.tests ? ', semana de tests' : ''}"><i></i><span>${w.n}</span></button>`;
  }).join('') + `<p class="leyenda"><span class="muestra-test"></span>Semanas de tests: ${ETAPA.semanasConTests.join(', ')}</p>`;
  caja.onclick = (e) => { const b = e.target.closest('[data-semana]'); if (b && alTocar) alTocar(+b.dataset.semana); };
}

/* ---------- compartir o bajar un archivo ---------- */
async function entregarArchivo(nombre, texto) {
  const archivo = new File([texto], nombre, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
    try { await navigator.share({ files: [archivo], title: nombre }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(archivo); a.download = nombre; a.click();
}
