'use strict';
/* Medir: las mediciones de rendimiento (saltos, velocidad, 1RM) y del cuerpo (peso, HRV, VO2 máx).
   Cada medición queda atada a su fecha y a su semana del plan, para comparar etapas.
   El medidor de saltos con video viene de «Medidor de Saltos» (sesión del 24/11/2026). */
window.Medir = (() => {

const guardado = almacen('me.');
// { id, tipo, valor, fecha: 'AAAA-MM-DD', semana, det: {...}, nota, at }
let registros = guardado.leer('registros', []);

const METRICAS = {
  cmj: { nombre: 'CMJ', largo: 'Salto con contramovimiento', unidad: 'cm', dec: 1, grupo: 'rend', video: true },
  dj: { nombre: 'Drop jump', largo: 'Índice de fuerza reactiva (RSI = vuelo ÷ contacto)', unidad: 'RSI', dec: 2, grupo: 'rend', video: true },
  sq: { nombre: 'Velocidad de sentadilla', largo: 'Velocidad media de la subida', unidad: 'm/s', dec: 2, grupo: 'rend', video: true },
  rm_sq: { nombre: '1RM sentadilla', largo: 'Una repetición máxima', unidad: 'kg', dec: 1, grupo: 'rend', rm: true },
  rm_bp: { nombre: '1RM press de banca', largo: 'Una repetición máxima', unidad: 'kg', dec: 1, grupo: 'rend', rm: true },
  peso: { nombre: 'Peso', largo: 'En ayunas, después del baño', unidad: 'kg', dec: 1, grupo: 'cuerpo', neutro: true },
  hrv: { nombre: 'HRV', largo: 'rMSSD al despertar', unidad: 'ms', dec: 0, grupo: 'cuerpo' },
  vo2: { nombre: 'VO2 máx', largo: 'El dato del reloj', unidad: 'ml/kg/min', dec: 1, grupo: 'cuerpo' },
};
const GRUPOS = [['rend', 'Rendimiento'], ['cuerpo', 'Cuerpo']];
const CONSEJO = {
  cmj: 'Manos en la cintura, bajá y saltá sin pausa. Despegá y aterrizá con los dos pies a la vez. Hacé 3 intentos y guardá el mejor.',
  dj: 'Dejate caer del cajón, sin saltar hacia arriba. Tocá el piso con los dos pies a la vez y rebotá lo más rápido posible. Despegá y aterrizá también con los dos pies. Medí siempre desde la misma altura: el RSI desde 50 cm no se compara con el RSI desde 15 cm.',
  sq: 'Medí con la misma carga cada vez para poder comparar.',
  rm_sq: 'Si no probaste un máximo real, usá un peso que puedas levantar entre 2 y 10 veces.',
  rm_bp: 'Si no probaste un máximo real, usá un peso que puedas levantar entre 2 y 10 veces.',
  peso: 'Pesate siempre en las mismas condiciones: al levantarte, después de ir al baño.',
  hrv: 'Medilo al despertar, acostado y con la misma app todos los días. Mirá la tendencia de la semana, no un día suelto.',
  vo2: 'En el iPhone: Salud → Corazón → VO2 máx. Cambia despacio: anotalo cada una o dos semanas.',
};

/* ---------- datos ---------- */
function ordenar() { registros.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.at - b.at); }
function guardar() { ordenar(); guardado.escribir('registros', registros); }
function agregarRegistro({ tipo, valor, fecha = claveFecha(new Date()), det = {}, nota = '' }) {
  const r = { id: 'r' + Date.now() + Math.random().toString(36).slice(2, 6), tipo, valor, fecha, semana: ETAPA.semanaDeFecha(fechaDeClave(fecha)), det, nota, at: Date.now() };
  registros.push(r); guardar();
  return r;
}
// El drop jump se compara solo desde la misma altura de cajón: caer de 50 cm no es lo mismo que de 15 cm.
// «cajon» sin pasar = todas las alturas; null = las mediciones sin altura anotada.
const cajonDe = (r) => (r.det && r.det.cajonCm) || null;
const de = (tipo, cajon) => registros.filter((r) => r.tipo === tipo && Number.isFinite(r.valor) && (cajon === undefined || cajonDe(r) === cajon));
const textoCajon = (c) => (c ? `cajón de ${fmt(c, 0)} cm` : 'sin altura de cajón');
const ultimo = (tipo) => { const l = de(tipo); return l[l.length - 1] || null; };

// El peso que se anotaba en la app Calorías pasa a Medir una sola vez.
function migrarPesos(pesos) {
  let n = 0;
  Object.entries(pesos || {}).forEach(([fecha, v]) => {
    if (!(v > 0) || registros.some((r) => r.tipo === 'peso' && r.fecha === fecha)) return;
    registros.push({ id: 'p' + fecha, tipo: 'peso', valor: v, fecha, semana: ETAPA.semanaDeFecha(fechaDeClave(fecha)), det: {}, nota: '', at: fechaDeClave(fecha).getTime() });
    n++;
  });
  if (n) guardar();
  return n;
}
if (!guardado.leer('migrado', false)) {
  migrarPesos(almacen('cc.').leer('pesos', {}));
  guardado.escribir('migrado', true);
}

// Valor de una métrica en una semana: el mejor en rendimiento, el promedio en el cuerpo.
function valorDeSemana(tipo, sem, cajon) {
  const l = de(tipo, cajon).filter((r) => r.semana === sem).map((r) => r.valor);
  if (!l.length) return null;
  return METRICAS[tipo].grupo === 'rend' ? Math.max(...l) : l.reduce((s, x) => s + x, 0) / l.length;
}
function promedio7(tipo) {
  const desde = claveFecha(new Date(Date.now() - 6 * 864e5));
  const l = de(tipo).filter((r) => r.fecha >= desde).map((r) => r.valor);
  return l.length ? { v: l.reduce((s, x) => s + x, 0) / l.length, n: l.length } : null;
}
const fechaCorta = (k) => fechaDeClave(k).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
function textoCambio(tipo, desde, hasta) {
  const M = METRICAS[tipo];
  const d = hasta - desde;
  if (Math.abs(d) < Math.pow(10, -M.dec) / 2) return { txt: 'igual que al inicio', cls: '' };
  const signo = d > 0 ? '+' : '−';
  return { txt: `${signo}${fmt(Math.abs(d), M.dec)} desde el inicio`, cls: M.neutro ? '' : d > 0 ? 'mejora' : 'baja' };
}

/* ---------- vista principal ---------- */
function pintar() {
  $('#medirEtapa').textContent = ETAPA.texto();
  const marcas = {};
  registros.forEach((r) => { if (METRICAS[r.tipo].grupo === 'rend') marcas[r.semana] = true; });
  pintarFranja($('#medirFranja'), { marcas });
  const semHoy = ETAPA.semanaDeFecha(new Date());
  const esTest = ETAPA.semanasConTests.includes(semHoy);
  let h = esTest ? `<div class="banner test">Semana ${semHoy}: semana de tests. Medí el rendimiento para comparar con las otras etapas.</div>` : '';
  h += GRUPOS.map(([g, titulo]) => `<h2 class="titulo-grupo">${titulo}</h2><div class="lista metricas">` +
    Object.entries(METRICAS).filter(([, M]) => M.grupo === g).map(([tipo, M]) => {
      const l = de(tipo);
      const u = l[l.length - 1];
      const comp = tipo === 'dj' && u ? de(tipo, cajonDe(u)) : l; // el cambio, desde la misma altura
      const cajonTxt = tipo === 'dj' && u ? ` · ${textoCajon(cajonDe(u))}` : '';
      const pendiente = esTest && g === 'rend' && valorDeSemana(tipo, semHoy) == null;
      let detalle;
      if (!u) detalle = `<span class="nota">${esc(M.largo)}</span>`;
      else if (comp.length === 1) detalle = `<span class="nota">${fechaCorta(u.fecha)} · primera medición${cajonTxt}</span>`;
      else { const c = textoCambio(tipo, comp[0].valor, u.valor); detalle = `<span class="cambio ${c.cls}">${c.txt}${cajonTxt}</span>`; }
      return `<button class="item metrica" data-metrica="${tipo}">
        <span class="nombre"><span>${esc(M.nombre)}${pendiente ? '<span class="etiqueta test">falta esta semana</span>' : ''}</span>${detalle}</span>
        <span class="valor">${u ? fmt(u.valor, M.dec) : '—'}<small>${esc(M.unidad)}</small></span></button>`;
    }).join('') + '</div>').join('');
  $('#medirLista').innerHTML = h;
}
$('#medirLista').addEventListener('click', (e) => { const b = e.target.closest('[data-metrica]'); if (b) abrirMetrica(b.dataset.metrica); });

/* ---------- hoja de una métrica: gráfico, etapas e historial ---------- */
let metricaAbierta = null;
let cajonVista; // drop jump: la altura de cajón que se mira en el gráfico y en «Por etapa»
function grafico(tipo, l) {
  if (l.length < 2) return '';
  const M = METRICAS[tipo];
  const W = 320, H = 150, iz = 34, de_ = 8, ar = 12, ab = 22;
  const t0 = Math.min(fechaDeClave(l[0].fecha).getTime(), ETAPA.inicio.getTime());
  const t1 = Math.max(fechaDeClave(l[l.length - 1].fecha).getTime(), Date.now(), ETAPA.inicio.getTime() + ETAPA.total * 7 * 864e5);
  const vs = l.map((r) => r.valor);
  let y0 = Math.min(...vs), y1 = Math.max(...vs);
  const margen = (y1 - y0) * 0.15 || Math.abs(y1) * 0.05 || 1; y0 -= margen; y1 += margen;
  const X = (t) => iz + (t - t0) / (t1 - t0 || 1) * (W - iz - de_);
  const Y = (v) => ar + (1 - (v - y0) / (y1 - y0)) * (H - ar - ab);
  const bandas = ETAPA.plan.semanas.filter((w) => w.tests).map((w) => {
    const a = ETAPA.inicio.getTime() + (w.n - 1) * 7 * 864e5;
    return `<rect x="${X(a)}" y="${ar}" width="${Math.max(2, X(a + 7 * 864e5) - X(a))}" height="${H - ar - ab}" class="banda-test"/>`;
  }).join('');
  const pts = l.map((r) => [X(fechaDeClave(r.fecha).getTime() + 12 * 36e5), Y(r.valor)]);
  return `<svg class="grafico" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(M.nombre)} a lo largo del tiempo">
    ${bandas}
    <line x1="${iz}" y1="${H - ab}" x2="${W - de_}" y2="${H - ab}" class="eje"/>
    <text x="${iz - 6}" y="${Y(Math.max(...vs)) + 4}" text-anchor="end" class="rotulo">${fmt(Math.max(...vs), M.dec)}</text>
    <text x="${iz - 6}" y="${Y(Math.min(...vs)) + 4}" text-anchor="end" class="rotulo">${fmt(Math.min(...vs), M.dec)}</text>
    <polyline points="${pts.map((p) => p.join(',')).join(' ')}" class="trazo"/>
    ${pts.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" class="punto"/>`).join('')}
    <text x="${iz}" y="${H - 6}" class="rotulo">${fechaCorta(claveFecha(new Date(t0)))}</text>
    <text x="${W - de_}" y="${H - 6}" text-anchor="end" class="rotulo">${fechaCorta(claveFecha(new Date(t1)))}</text>
  </svg><p class="nota"><span class="muestra-banda"></span>Semanas de tests</p>`;
}
function pintarMetrica() {
  const tipo = metricaAbierta, M = METRICAS[tipo];
  const l = de(tipo);
  $('#mtTitulo').textContent = M.nombre;
  let h = `<div class="tarjeta"><p class="nota">${esc(M.largo)}</p>`;
  const u = l[l.length - 1];
  h += u ? `<div class="numero-grande">${fmt(u.valor, M.dec)} <small>${esc(M.unidad)}</small></div><p class="nota">Última: ${fechaCorta(u.fecha)}${u.semana >= 1 && u.semana <= ETAPA.total ? ` · semana ${u.semana}` : ''}</p>` :
    '<p>Todavía no hay mediciones. Cargá la primera para tener tu punto de partida.</p>';
  if (u && (tipo === 'cmj' || tipo === 'dj') && u.det) {
    const fs = filasSalto(u.det).filter(([n]) => !(tipo === 'cmj' && n === 'Altura'));
    if (fs.length) h += `<div class="baldosas">${fs.map(([k, v]) => `<div><b>${esc(v)}</b><span>${esc(k)}</span></div>`).join('')}</div>`;
  }
  const p7 = (tipo === 'peso' || tipo === 'hrv') && promedio7(tipo);
  if (p7) h += `<p class="nota">Promedio de los últimos 7 días: <b>${fmt(p7.v, M.dec)} ${esc(M.unidad)}</b> (${p7.n} ${p7.n === 1 ? 'día' : 'días'})</p>`;
  // Drop jump: el gráfico y las etapas usan una sola altura de cajón.
  let lv = l, cajonEtapa;
  if (tipo === 'dj' && l.length) {
    const alturas = [...new Set(l.map(cajonDe))].sort((a, b) => (a ?? -1) - (b ?? -1));
    if (!alturas.includes(cajonVista)) cajonVista = cajonDe(u);
    lv = de(tipo, cajonVista); cajonEtapa = cajonVista;
    h += `<p class="nota">El RSI solo se compara desde la misma altura: de más alto, la caída carga más y el contacto se alarga.</p>`;
    if (alturas.length > 1) h += `<div class="filtros" id="mtCajon">${alturas.map((c) => `<button class="chip ${c === cajonVista ? 'activa' : ''}" data-cajon="${c ?? ''}">${c ? fmt(c, 0) + ' cm' : 'Sin altura'}</button>`).join('')}</div>`;
    else h += `<p class="nota">Todas desde ${textoCajon(cajonVista)}.</p>`;
  }
  h += grafico(tipo, lv) + '</div>';

  h += `<div class="dos">${M.video ? `<button class="boton" data-accion="video">Medir con video</button><button class="boton secundario" data-accion="cargar">Cargar a mano</button>` :
    `<button class="boton" data-accion="cargar">Cargar medición</button>`}</div>`;

  // Por etapa: las semanas de tests una al lado de la otra.
  const filas = ETAPA.plan.semanas.filter((w) => w.tests).map((w) => {
    const v = valorDeSemana(tipo, w.n, cajonEtapa);
    return `<div><span class="nota">Semana ${w.n}</span><b>${v == null ? '—' : fmt(v, M.dec)}</b></div>`;
  }).join('');
  h += `<div class="tarjeta"><h2>Por etapa</h2><div class="etapas">${filas}</div>
    <p class="nota">${M.grupo === 'rend' ? `La mejor medición de cada semana de tests${cajonEtapa !== undefined ? `, desde ${textoCajon(cajonEtapa)}` : ''}.` : 'El promedio de cada semana de tests.'}</p></div>`;

  h += `<div class="tarjeta"><h2>Historial</h2>` + (l.length ? l.slice().reverse().map((r) => `<div class="registro">
      <div><b>${fmt(r.valor, M.dec)} ${esc(M.unidad)}</b><span class="nota"> · ${fechaCorta(r.fecha)}${r.semana >= 1 && r.semana <= ETAPA.total ? ` · sem ${r.semana}` : ''}</span>
      ${r.det && r.det.resumen ? `<p class="nota">${esc(r.det.resumen)}</p>` : ''}${r.nota ? `<p class="nota">${esc(r.nota)}</p>` : ''}</div>
      <button class="icono chico" data-borrar="${r.id}" aria-label="Borrar medición">✕</button></div>`).join('') : '<p class="nota">Sin mediciones.</p>') + '</div>';
  h += `<p class="nota consejo">${esc(CONSEJO[tipo])}</p>`;
  $('#mtCuerpo').innerHTML = h;
}
let borrarPendiente = null;
$('#mtCuerpo').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.cajon !== undefined) { cajonVista = b.dataset.cajon === '' ? null : +b.dataset.cajon; pintarMetrica(); return; }
  if (b.dataset.accion === 'video') medirConVideo(metricaAbierta);
  if (b.dataset.accion === 'cargar') abrirCargar(metricaAbierta);
  if (b.dataset.borrar) {
    if (borrarPendiente !== b.dataset.borrar) { borrarPendiente = b.dataset.borrar; b.textContent = 'Borrar'; b.classList.add('confirmar'); return; }
    registros = registros.filter((r) => r.id !== b.dataset.borrar); borrarPendiente = null;
    guardar(); pintarMetrica(); pintar(); avisar('Medición borrada');
  }
});
function abrirMetrica(tipo) { metricaAbierta = tipo; borrarPendiente = null; cajonVista = undefined; pintarMetrica(); abrirHoja('#hojaMetrica'); }
alCerrarHoja['#hojaMetrica'] = () => { metricaAbierta = null; };
function repintar() { if (metricaAbierta) pintarMetrica(); if (seccionActual === 'medir') pintar(); if (window.Hoy) window.Hoy.pintar(); }

/* ---------- cargar a mano ---------- */
// Distancia de empuje del CMJ (método de Samozino): el largo de la pierna estirada menos la altura de la cadera en la sentadilla.
const campoEmpuje = (id) => `<label>Distancia de empuje (cm, opcional)<input id="${id}" type="number" inputmode="decimal" step="0.5" value="${esc(guardado.leer('empuje', ''))}" placeholder="35"></label>
  <p class="nota">Para la fuerza y la potencia. Medí desde la cadera (el hueso del costado) hasta la punta del pie, con la pierna estirada. Restale la altura de la cadera al piso en la sentadilla del salto.</p>`;
let cargando = null; // { tipo, modo }
function abrirCargar(tipo) {
  cargando = { tipo, modo: 'directo' };
  pintarCargar();
  abrirHoja('#hojaCargar');
  setTimeout(() => { const i = $('#cgCuerpo input'); if (i) i.focus(); }, 60);
}
function pintarCargar() {
  const { tipo, modo } = cargando, M = METRICAS[tipo];
  $('#cgTitulo').textContent = M.nombre;
  let campos;
  if (M.rm) {
    campos = `<div class="filtros" id="cgModo"><button class="chip ${modo === 'directo' ? 'activa' : ''}" data-modo="directo">Máximo probado</button>
      <button class="chip ${modo === 'reps' ? 'activa' : ''}" data-modo="reps">Desde repeticiones</button></div>` +
      (modo === 'directo' ? `<label>Peso levantado una vez (kg, con la barra)<input id="cgValor" type="number" inputmode="decimal" step="0.5"></label>` :
        `<div class="campos dos-col"><label>Peso (kg, con la barra)<input id="cgPeso" type="number" inputmode="decimal" step="0.5"></label>
         <label>Repeticiones<input id="cgReps" type="number" inputmode="numeric" min="2" max="12"></label></div>
         <p class="nota" id="cgEstimado">Fórmula de Epley: peso × (1 + repeticiones ÷ 30).</p>`);
  } else if (tipo === 'dj') {
    campos = `<div class="campos"><label>Vuelo (ms)<input id="cgVuelo" type="number" inputmode="numeric"></label>
      <label>Contacto (ms)<input id="cgContacto" type="number" inputmode="numeric"></label>
      <label>Cajón (cm)<input id="cgCajon" type="number" inputmode="numeric" value="${esc(guardado.leer('cajon', 30))}"></label></div>
      <p class="nota" id="cgEstimado">RSI = vuelo ÷ contacto.</p>`;
  } else if (tipo === 'cmj') {
    campos = `<label>Altura del salto (cm)<input id="cgValor" type="number" inputmode="decimal" step="0.1"></label>
      ${campoEmpuje('cgEmpuje')}<p class="nota" id="cgEstimado">Con la altura salen el vuelo, las velocidades y, con tu peso, el impulso.</p>`;
  } else if (tipo === 'sq') {
    campos = `<div class="campos dos-col"><label>Velocidad (m/s)<input id="cgValor" type="number" inputmode="decimal" step="0.01"></label>
      <label>Carga (kg)<input id="cgCarga" type="number" inputmode="decimal"></label></div>`;
  } else {
    campos = `<label>${esc(M.nombre)} (${esc(M.unidad)})<input id="cgValor" type="number" inputmode="decimal" step="any"></label>`;
  }
  $('#cgCuerpo').innerHTML = `<div class="tarjeta">${campos}
    <label>Fecha<input id="cgFecha" type="date" value="${claveFecha(new Date())}"></label>
    <label>Nota (opcional)<input id="cgNota" type="text" autocomplete="off"></label>
    <button class="boton" id="cgGuardar">Guardar</button></div><p class="nota consejo">${esc(CONSEJO[tipo])}</p>`;
}
function leerCargar() {
  const { tipo, modo } = cargando, M = METRICAS[tipo];
  const v = (id) => aNumero($(id) && $(id).value);
  if (M.rm && modo === 'reps') {
    const peso = v('#cgPeso'), reps = v('#cgReps');
    if (!(peso > 0 && reps >= 1)) return { error: 'Poné el peso y las repeticiones' };
    const est = reps === 1 ? peso : peso * (1 + reps / 30);
    return { valor: uno(est), det: { peso, reps, estimado: true, resumen: `Estimado: ${fmt(peso, 1)} kg × ${reps}` }, aviso: reps > 10 ? 'Con más de 10 repeticiones la estimación pierde precisión.' : '' };
  }
  const fecha = ($('#cgFecha') && $('#cgFecha').value) || claveFecha(new Date());
  if (tipo === 'dj') {
    const tv = v('#cgVuelo'), ct = v('#cgContacto'), caj = v('#cgCajon');
    if (!(tv > 0 && ct > 0)) return { error: 'Poné el vuelo y el contacto' };
    const d = datosSalto(tv / 1000, { tc: ct / 1000, m: pesoCorporal(fecha) });
    d.cajonCm = caj || null;
    return { valor: Math.round(d.rsi * 100) / 100, det: { ...d, resumen: `${fmt(d.alturaCm, 1)} cm · vuelo ${fmt(tv, 0)} ms · contacto ${fmt(ct, 0)} ms${caj ? ` · cajón ${fmt(caj, 0)} cm` : ''}` } };
  }
  if (tipo === 'cmj') {
    const h = v('#cgValor'), emp = v('#cgEmpuje');
    if (!(h > 0)) return { error: 'Poné la altura del salto' };
    const d = datosSalto(Math.sqrt(8 * h / 100 / G), { m: pesoCorporal(fecha), hpo: emp > 0 ? emp / 100 : null });
    d.alturaCm = h;
    return { valor: h, det: { ...d, resumen: `vuelo ${fmt(d.vueloMs, 0)} ms` } };
  }
  const valor = v('#cgValor');
  if (!(valor > 0)) return { error: 'Poné un valor' };
  const det = {};
  if (tipo === 'sq') { const c = v('#cgCarga'); if (c > 0) { det.cargaKg = c; det.resumen = `con ${fmt(c, 1)} kg`; } }
  return { valor, det };
}
$('#cgCuerpo').addEventListener('click', (e) => {
  const m = e.target.closest('[data-modo]');
  if (m) { cargando.modo = m.dataset.modo; pintarCargar(); return; }
  if (e.target.id !== 'cgGuardar') return;
  const r = leerCargar();
  if (r.error) return avisar(r.error);
  const fecha = $('#cgFecha').value || claveFecha(new Date());
  if (cargando.tipo === 'dj' && r.det.cajonCm) guardado.escribir('cajon', r.det.cajonCm);
  if (cargando.tipo === 'cmj' && r.det.empujeCm) guardado.escribir('empuje', r.det.empujeCm);
  const reg = agregarRegistro({ tipo: cargando.tipo, valor: r.valor, fecha, det: r.det, nota: $('#cgNota').value.trim() });
  cerrarHoja();
  avisoGuardado(reg, r.aviso);
  repintar();
});
$('#cgCuerpo').addEventListener('input', () => {
  const est = $('#cgEstimado'); if (!est) return;
  const r = leerCargar();
  if (r.error) return;
  if (cargando.tipo === 'cmj') est.textContent = filasSalto(r.det).filter(([n]) => n !== 'Altura').map(([n, x]) => `${n}: ${x}`).join(' · ');
  else est.textContent = `${cargando.tipo === 'dj' ? 'RSI' : '1RM estimado'}: ${fmt(r.valor, cargando.tipo === 'dj' ? 2 : 1)}${cargando.tipo === 'dj' ? '' : ' kg'}. ${r.aviso || ''}`;
});
function avisoGuardado(reg, extra) {
  const M = METRICAS[reg.tipo];
  let txt = `${M.nombre}: ${fmt(reg.valor, M.dec)} ${M.unidad} guardado`;
  if (reg.tipo === 'cmj' && window.Entreno.anotarSalto(reg.semana, reg.valor)) txt += `. Quedó en el test de la semana ${reg.semana}`;
  avisar(extra ? `${txt}. ${extra}` : txt);
}

/* ======================================================================
   Medidor con video: marcás cuadros del video y salen el vuelo, el contacto o la velocidad.
   ====================================================================== */
const G = 9.81;

/* ---------- datos de un salto ---------- */
// Todo sale del vuelo (tv, s) y, en el drop jump, del contacto (tc, s). m = peso corporal (kg), hpo = distancia de empuje (m).
// Altura = g·tv²/8 · velocidad de despegue = g·tv/2 · velocidad media del empuje = la mitad · impulso = m·v.
// Fuerza y potencia por el método de Samozino (necesita hpo). Rigidez vertical por la fórmula de Dalleau.
function pesoCorporal(fecha = claveFecha(new Date())) {
  const l = de('peso').filter((r) => r.fecha <= fecha);
  return l.length ? l[l.length - 1].valor : null;
}
function datosSalto(tv, { tc, m, hpo } = {}) {
  const h = G * tv * tv / 8, v = G * tv / 2;
  const d = { alturaCm: h * 100, vueloMs: tv * 1000, vDespegue: v, vMedia: v / 2 };
  if (m > 0) { d.pesoKg = m; d.impulso = m * v; }
  if (m > 0 && hpo > 0) {
    d.empujeCm = hpo * 100;
    d.fuerza = m * G * (h / hpo + 1);
    d.potencia = d.fuerza * v / 2;
  }
  if (tc > 0) {
    d.contactoMs = tc * 1000;
    d.rsi = tv / tc;
    d.rsiAltura = h / tc;
    if (m > 0) d.rigidez = m * Math.PI * (tv + tc) / (tc * tc * ((tv + tc) / Math.PI - tc / 4)) / 1000;
  }
  return d;
}
// Las filas para mostrar: [nombre, valor]. Las que no se pueden calcular no aparecen.
function filasSalto(d) {
  const f = [];
  const y = (nombre, v, txt) => { if (Number.isFinite(v)) f.push([nombre, txt(v)]); };
  y('Altura', d.alturaCm, (v) => fmt(v, 1) + ' cm');
  y('Vuelo', d.vueloMs, (v) => fmt(v, 0) + ' ms');
  y('Contacto', d.contactoMs, (v) => fmt(v, 0) + ' ms');
  y('RSI altura ÷ contacto', d.rsiAltura, (v) => fmt(v, 2) + ' m/s');
  if (!(d.contactoMs > 0)) { // el drop jump no las muestra
    y('Velocidad de despegue', d.vDespegue, (v) => fmt(v, 2) + ' m/s');
    y('Velocidad media', d.vMedia, (v) => fmt(v, 2) + ' m/s');
    y('Impulso', d.impulso, (v) => fmt(v, 1) + ' kg·m/s');
  }
  y('Fuerza', d.fuerza, (v) => fmt(v, 0) + ' N');
  y('Fuerza relativa', d.fuerza / d.pesoKg, (v) => fmt(v, 1) + ' N/kg');
  y('Potencia', d.potencia, (v) => fmt(v, 0) + ' W');
  y('Potencia relativa', d.potencia / d.pesoKg, (v) => fmt(v, 1) + ' W/kg');
  y('Rigidez vertical', d.rigidez, (v) => fmt(v, 1) + ' kN/m');
  y('Cajón', d.cajonCm, (v) => fmt(v, 0) + ' cm');
  return f;
}
function notasSalto(d, tipo) {
  const n = [];
  if (!d.pesoKg) n.push(`Cargá tu peso en Medir para calcular ${tipo === 'dj' ? 'la rigidez' : 'el impulso, la fuerza y la potencia'}.`);
  else if (tipo === 'cmj' && !d.empujeCm) n.push('Para la fuerza y la potencia, poné la distancia de empuje.');
  return n;
}

// El RSI del drop jump pasó a ser vuelo ÷ contacto (27/11/2026). Los guardados antes con altura ÷ contacto se recalculan una vez.
if (!guardado.leer('rsiVuelo', false)) {
  let n = 0;
  registros.forEach((r) => {
    if (r.tipo !== 'dj' || !r.det) return;
    const tc = r.det.contactoMs / 1000;
    const tv = r.det.vueloMs ? r.det.vueloMs / 1000 : r.det.alturaCm ? Math.sqrt(8 * r.det.alturaCm / 100 / G) : NaN;
    if (!(tc > 0 && tv > 0)) return;
    r.det.rsiAltura = r.valor;
    r.valor = Math.round(tv / tc * 100) / 100;
    n++;
  });
  if (n) guardar();
  guardado.escribir('rsiVuelo', true);
}
const video = $('#vdVideo');
const escenario = $('#vdEscenario');
const PRUEBAS = {
  cmj: { marcas: ['to', 'ld'] },
  dj: { marcas: ['ct', 'to', 'ld'] },
  sq: { marcas: ['s', 'e'] },
};
const MARCAS = {
  ct: { nombre: 'Contacto', boton: 'Marcar contacto', titulo: 'Buscá el contacto', pista: 'El primer cuadro que toca el piso al caer del cajón.', color: 'var(--m-contacto)', salto: 0.15 },
  to: { nombre: 'Despegue', boton: 'Marcar despegue', titulo: 'Buscá el despegue', pista: 'El primer cuadro con los dos pies en el aire.', color: 'var(--m-despegue)', salto: 0.40 },
  ld: { nombre: 'Aterrizaje', boton: 'Marcar aterrizaje', titulo: 'Buscá el aterrizaje', pista: 'El primer cuadro con un pie tocando el piso.', color: 'var(--m-aterrizaje)' },
  s: { nombre: 'Inicio de la subida', boton: 'Marcar inicio', titulo: 'Buscá el inicio de la subida', pista: 'El primer cuadro en que la barra empieza a subir.', color: 'var(--m-despegue)', salto: 0.5 },
  e: { nombre: 'Fin de la subida', boton: 'Marcar fin', titulo: 'Buscá el fin de la subida', pista: 'El primer cuadro con la barra frenada arriba.', color: 'var(--m-aterrizaje)' },
};
const V = { fps: guardado.leer('fps', 240), v: null, m: null };
$('#vdFps').value = String(V.fps);
$('#vdFps').addEventListener('change', (e) => { V.fps = Number(e.target.value) || 240; guardado.escribir('fps', V.fps); });

function panel(nombre) {
  $('#vdElegir').hidden = nombre !== 'elegir';
  $('#vdTrabajo').hidden = nombre !== 'trabajo';
  $('#vdResultado').hidden = nombre !== 'resultado';
  $('#hojaVideo').scrollTop = 0;
}
function medirConVideo(tipo) {
  V.m = { tipo, marcas: {}, paso: 0, guardado: false };
  $('#vdTitulo').textContent = METRICAS[tipo].nombre;
  $('#vdNota').value = '';
  if (V.v) { $('#vdDeslizar').max = String(V.v.cuadros.length - 1); panel('trabajo'); ir(V.v.cur || 0); } else { panel('elegir'); $('#vdEstado').textContent = ''; }
  pintarPaso();
  abrirHoja('#hojaVideo');
}

/* ---------- lector del índice del video (MOV / MP4): los tiempos reales de cada cuadro ---------- */
const fourcc = (dv, p) => String.fromCharCode(dv.getUint8(p), dv.getUint8(p + 1), dv.getUint8(p + 2), dv.getUint8(p + 3));
async function cajasRaiz(file) {
  const out = []; let pos = 0;
  while (pos + 8 <= file.size && out.length < 64) {
    const dv = new DataView(await file.slice(pos, pos + 16).arrayBuffer());
    let size = dv.getUint32(0); const type = fourcc(dv, 4); let hdr = 8;
    if (size === 1) { size = Number(dv.getBigUint64(8)); hdr = 16; } else if (size === 0) { size = file.size - pos; }
    if (size < 8) break;
    out.push({ type, start: pos, size, hdr }); pos += size;
  }
  return out;
}
function hijas(dv, box) {
  const out = []; if (!box) return out; let p = box.body;
  while (p + 8 <= box.end) {
    let size = dv.getUint32(p); const type = fourcc(dv, p + 4); let hdr = 8;
    if (size === 1) { size = Number(dv.getBigUint64(p + 8)); hdr = 16; } else if (size === 0) { size = box.end - p; }
    if (size < 8 || p + size > box.end) break;
    out.push({ type, body: p + hdr, end: p + size }); p += size;
  }
  return out;
}
const hija = (dv, box, t) => hijas(dv, box).find((b) => b.type === t);
async function leerIndice(file) {
  const tops = await cajasRaiz(file);
  const mb = tops.find((b) => b.type === 'moov'); if (!mb) throw new Error('sin moov');
  const buf = await file.slice(mb.start, mb.start + mb.size).arrayBuffer();
  const dv = new DataView(buf); const moov = { body: mb.hdr, end: buf.byteLength };
  const mvhd = hija(dv, moov, 'mvhd');
  const movieTs = mvhd ? (dv.getUint8(mvhd.body) === 1 ? dv.getUint32(mvhd.body + 20) : dv.getUint32(mvhd.body + 12)) : 600;
  let mejor = null;
  for (const trak of hijas(dv, moov).filter((b) => b.type === 'trak')) {
    const mdia = hija(dv, trak, 'mdia'); if (!mdia) continue;
    const hdlr = hija(dv, mdia, 'hdlr'); if (!hdlr || fourcc(dv, hdlr.body + 8) !== 'vide') continue;
    const mdhd = hija(dv, mdia, 'mdhd'); if (!mdhd) continue;
    const ts = dv.getUint8(mdhd.body) === 1 ? dv.getUint32(mdhd.body + 20) : dv.getUint32(mdhd.body + 12);
    const stbl = hija(dv, hija(dv, mdia, 'minf'), 'stbl'); if (!stbl) continue;
    const stts = hija(dv, stbl, 'stts'); if (!stts) continue;
    const pts = []; let t = 0; const n = dv.getUint32(stts.body + 4);
    for (let i = 0; i < n; i++) { const cnt = dv.getUint32(stts.body + 8 + i * 8), d = dv.getUint32(stts.body + 12 + i * 8); for (let j = 0; j < cnt; j++) { pts.push(t); t += d; } }
    const ctts = hija(dv, stbl, 'ctts');
    if (ctts) { const cn = dv.getUint32(ctts.body + 4); let s = 0; for (let i = 0; i < cn; i++) { const cnt = dv.getUint32(ctts.body + 8 + i * 8), off = dv.getInt32(ctts.body + 12 + i * 8); for (let j = 0; j < cnt && s < pts.length; j++, s++) pts[s] += off; } }
    let mediaStart = 0, emptyOffset = 0;
    const elst = hija(dv, hija(dv, trak, 'edts'), 'elst');
    if (elst) {
      const v1 = dv.getUint8(elst.body) === 1; const cnt = dv.getUint32(elst.body + 4); let p = elst.body + 8, found = false;
      for (let i = 0; i < cnt && !found; i++) {
        const segDur = v1 ? Number(dv.getBigUint64(p)) : dv.getUint32(p);
        const mt = v1 ? Number(dv.getBigInt64(p + 8)) : dv.getInt32(p + 4);
        if (mt === -1) emptyOffset += segDur / movieTs; else { mediaStart = mt; found = true; }
        p += v1 ? 20 : 12;
      }
    }
    const tiempos = pts.map((x) => (x - mediaStart) / ts + emptyOffset).filter((x) => x >= -1e-6).sort((a, b) => a - b);
    if (!mejor || tiempos.length > mejor.tiempos.length) mejor = { tiempos };
  }
  if (!mejor) throw new Error('sin pista de video');
  return mejor;
}
function analizar(tiempos) {
  const iv = []; for (let i = 1; i < tiempos.length; i++) iv.push(tiempos[i] - tiempos[i - 1]);
  const ord = iv.slice().sort((a, b) => a - b);
  const med = ord.length ? ord[Math.floor(ord.length / 2)] : 0;
  return { med, fps: med > 0 ? 1 / med : 0 };
}

$('#vdArchivo').addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  $('#vdEstado').textContent = 'Leyendo el video…';
  if (V.v && V.v.url) URL.revokeObjectURL(V.v.url);
  const url = URL.createObjectURL(file);
  let info = null;
  try { info = await leerIndice(file); } catch (_) { info = null; }
  video.src = url; video.load();
  await new Promise((ok) => { video.onloadedmetadata = ok; video.onerror = ok; });
  if (!info) {
    const n = Math.max(1, Math.floor((video.duration || 0) * V.fps));
    info = { tiempos: Array.from({ length: n }, (_, i) => i / V.fps), adivinado: true };
  }
  info.a = analizar(info.tiempos);
  V.v = { url, nombre: file.name, cuadros: info.tiempos, info, cur: 0 };
  e.target.value = '';
  try { await video.play(); video.pause(); } catch (_) {}
  V.m.marcas = {}; V.m.paso = 0;
  const aviso = $('#vdAvisoVideo');
  if (info.adivinado) { aviso.textContent = `No se pudieron leer los tiempos del video. Se usan ${V.fps} cuadros por segundo parejos.`; aviso.hidden = false; }
  else if (info.a.fps < 50 && V.fps > info.a.fps * 1.5) { aviso.textContent = 'Slo-mo: marcá dentro de la parte lenta. Al principio y al final el video va a velocidad normal.'; aviso.hidden = false; }
  else aviso.hidden = true;
  $('#vdDeslizar').max = String(V.v.cuadros.length - 1);
  panel('trabajo'); ir(0); pintarPaso();
});

function pintarPaso() {
  const m = V.m; if (!m) return;
  const claves = PRUEBAS[m.tipo].marcas;
  const fin = m.paso >= claves.length;
  const mk = MARCAS[claves[Math.min(m.paso, claves.length - 1)]];
  $('#vdPaso').textContent = V.v ? `Paso ${Math.min(m.paso + 1, claves.length)} de ${claves.length}` : '';
  $('#vdInstr').textContent = mk.titulo;
  $('#vdPista').textContent = mk.pista;
  $('#vdPunto').style.background = mk.color;
  $('#vdMarcar').textContent = mk.boton;
  $('#vdMarcar').disabled = fin;
  $('#vdAtras').disabled = m.paso === 0;
  pintarLinea();
}
$('#vdMarcar').addEventListener('click', () => {
  const m = V.m; const claves = PRUEBAS[m.tipo].marcas; const k = claves[m.paso];
  m.marcas[k] = V.v.cur;
  const falta = claves.findIndex((x) => m.marcas[x] === undefined);
  if (falta === -1) { m.paso = claves.length; abrirResultado(); return; }
  m.paso = falta;
  if (MARCAS[k].salto) ir(V.v.cur + Math.round(MARCAS[k].salto * V.fps));
  pintarPaso();
});
$('#vdAtras').addEventListener('click', () => {
  const m = V.m; const claves = PRUEBAS[m.tipo].marcas;
  if (m.paso === 0) return;
  m.paso -= 1; const k = claves[m.paso];
  const antes = m.marcas[k]; delete m.marcas[k];
  if (antes !== undefined) ir(antes);
  pintarPaso();
});

// Navegación cuadro por cuadro
let buscando = false, pendiente = null, ficha = 0;
function tiempoDeCuadro(i) {
  const f = V.v.cuadros; const a = f[i];
  const sig = i + 1 < f.length ? f[i + 1] : a + (V.v.info.a.med || 1 / 240);
  return Math.max(0, (a + sig) / 2);
}
function cuadroCercano(t) {
  const f = V.v.cuadros; let lo = 0, hi = f.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (f[mid] <= t + 1e-4) lo = mid; else hi = mid - 1; }
  return lo;
}
function ir(i) {
  if (!V.v) return;
  i = Math.max(0, Math.min(V.v.cuadros.length - 1, Math.round(i)));
  V.v.cur = i;
  $('#vdDeslizar').value = String(i);
  $('#vdCuadro').textContent = `Cuadro ${i} / ${V.v.cuadros.length - 1}`;
  pintarLinea();
  const t = tiempoDeCuadro(i);
  if (buscando) { pendiente = t; return; }
  buscar(t);
}
function buscar(t) {
  buscando = true; const tok = ++ficha; const quiero = V.v.cur;
  $('#vdMostrado').textContent = '…';
  if ('requestVideoFrameCallback' in video) {
    let intentos = 0;
    const cb = (ahora, meta) => {
      if (tok !== ficha) return;
      const k = cuadroCercano(meta.mediaTime);
      if ((video.seeking || k !== quiero) && ++intentos < 4) { video.requestVideoFrameCallback(cb); return; }
      $('#vdMostrado').textContent = k === quiero ? '✓' : 'muestra ' + k;
    };
    video.requestVideoFrameCallback(cb);
  }
  setTimeout(() => { if (tok === ficha && $('#vdMostrado').textContent === '…') $('#vdMostrado').textContent = ''; }, 900);
  video.currentTime = t;
}
video.addEventListener('seeked', () => {
  buscando = false;
  if (pendiente !== null) { const t = pendiente; pendiente = null; buscar(t); }
});
$('#vdDeslizar').addEventListener('input', (e) => ir(Number(e.target.value)));
$$('.pasos-cuadro button').forEach((b) => b.addEventListener('click', () => ir(V.v.cur + Number(b.dataset.paso))));
document.addEventListener('keydown', (e) => {
  if ($('#hojaVideo').hidden || $('#vdTrabajo').hidden || !V.v || e.target.matches('input, select, textarea')) return;
  if (e.key === 'ArrowRight') { ir(V.v.cur + (e.shiftKey ? 10 : 1)); e.preventDefault(); }
  if (e.key === 'ArrowLeft') { ir(V.v.cur - (e.shiftKey ? 10 : 1)); e.preventDefault(); }
  if (e.key === 'Enter' && !$('#vdMarcar').disabled) { $('#vdMarcar').click(); e.preventDefault(); }
});

// Arrastre = pasar cuadros; toque = punto de zoom
let zoom = 1, origen = [50, 50], arrastre = null;
function aplicarZoom() { video.style.transformOrigin = origen[0] + '% ' + origen[1] + '%'; video.style.transform = 'scale(' + zoom + ')'; $('#vdZoom').textContent = 'Zoom ' + zoom + '×'; }
$('#vdZoom').addEventListener('pointerdown', (e) => e.stopPropagation());
$('#vdZoom').addEventListener('click', (e) => { e.stopPropagation(); zoom = zoom >= 4 ? 1 : zoom + 1; aplicarZoom(); });
escenario.addEventListener('pointerdown', (e) => { if (!V.v) return; arrastre = { x: e.clientX, desde: V.v.cur, movido: false }; try { escenario.setPointerCapture(e.pointerId); } catch (_) {} });
escenario.addEventListener('pointermove', (e) => { if (!arrastre) return; const dx = e.clientX - arrastre.x; if (Math.abs(dx) > 6) arrastre.movido = true; if (arrastre.movido) ir(arrastre.desde + Math.round(dx / 10)); });
escenario.addEventListener('pointerup', (e) => {
  if (arrastre && !arrastre.movido) { const r = escenario.getBoundingClientRect(); origen = [((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100]; if (zoom === 1) zoom = 2; aplicarZoom(); }
  arrastre = null;
});
escenario.addEventListener('pointercancel', () => (arrastre = null));

function pintarLinea() {
  const tl = $('#vdLinea');
  if (!V.v || !V.m) { tl.innerHTML = ''; return; }
  const n = V.v.cuadros.length; if (n < 2) { tl.innerHTML = ''; return; }
  const pct = (i) => (i / (n - 1)) * 100;
  tl.innerHTML = PRUEBAS[V.m.tipo].marcas.filter((k) => V.m.marcas[k] !== undefined)
    .map((k) => `<i style="left:${pct(V.m.marcas[k])}%;background:${MARCAS[k].color}"></i>`).join('') +
    `<i class="cursor" style="left:${pct(V.v.cur)}%"></i>`;
}

/* ---------- resultado del video ---------- */
function calcular() {
  const m = V.m, k = m.marcas, fps = V.fps, r = { baldosas: [], notas: [], det: {} };
  const rampa = (a, b) => { const f = V.v.cuadros; let mn = Infinity, mx = 0; for (let i = a + 1; i <= b; i++) { const d = f[i] - f[i - 1]; mn = Math.min(mn, d); mx = Math.max(mx, d); } return mx / mn > 1.5; };
  const noConfiable = 'Entre las marcas cambia la velocidad del video. Este resultado no es confiable.';
  if (m.tipo === 'sq') {
    const nf = k.e - k.s, dur = nf / fps, rom = aNumero($('#vdRecorrido') ? $('#vdRecorrido').value : guardado.leer('recorrido', 55));
    const carga = aNumero($('#vdCarga') ? $('#vdCarga').value : '');
    const v = rom > 0 ? rom / 100 / dur : NaN;
    r.principal = { v: fmt(v, 2), unidad: 'm/s', etiqueta: 'Velocidad media de la subida' };
    r.baldosas.push(['Duración', fmt(dur * 1000, 0) + ' ms'], ['Cuadros', String(nf)], ['Recorrido', fmt(rom, 1) + ' cm']);
    if (Number.isFinite(carga)) r.baldosas.push(['Carga', fmt(carga, 1) + ' kg']);
    if (!(rom > 0)) r.notas.push('Cargá el recorrido de la barra para calcular la velocidad.');
    if (rampa(k.s, k.e)) r.notas.push(noConfiable);
    r.valor = v;
    r.det = { duracionMs: dur * 1000, recorridoCm: rom, cargaKg: Number.isFinite(carga) ? carga : null, resumen: `${fmt(dur * 1000, 0)} ms${Number.isFinite(carga) ? ` · con ${fmt(carga, 1)} kg` : ''} · video` };
    return r;
  }
  const nf = k.ld - k.to, tv = nf / fps, hcm = (G * tv * tv) / 8 * 100, err = (G * tv / 4) / fps * 100;
  const peso = pesoCorporal();
  if (m.tipo === 'dj') {
    const nc = k.to - k.ct, tc = nc / fps, caj = aNumero($('#vdCajon') ? $('#vdCajon').value : guardado.leer('cajon', 30));
    const d = datosSalto(tv, { tc, m: peso });
    d.cajonCm = Number.isFinite(caj) ? caj : null;
    r.principal = { v: fmt(d.rsi, 2), unidad: 'RSI', etiqueta: 'Índice de fuerza reactiva (vuelo ÷ contacto)' };
    r.baldosas = filasSalto(d);
    r.valor = d.rsi;
    r.det = { ...d, resumen: `${fmt(hcm, 1)} cm · vuelo ${fmt(tv * 1000, 0)} ms · contacto ${fmt(tc * 1000, 0)} ms · cajón ${fmt(caj, 0)} cm · video` };
    r.notas.push(...notasSalto(d, 'dj'));
    if (tc < 0.08 || tc > 0.6) r.notas.push(`El contacto dura ${fmt(tc * 1000, 0)} ms. Lo común está entre 150 y 400 ms. Revisá la marca de contacto.`);
    if (rampa(k.ct, k.ld)) r.notas.push(noConfiable);
  } else {
    const emp = aNumero($('#vdEmpuje') ? $('#vdEmpuje').value : guardado.leer('empuje', ''));
    const d = datosSalto(tv, { m: peso, hpo: emp > 0 ? emp / 100 : null });
    r.principal = { v: fmt(hcm, 1), unidad: 'cm', etiqueta: 'Altura del salto' };
    r.baldosas = filasSalto(d).filter(([n]) => n !== 'Altura').concat([['Margen', '±' + fmt(err, 1) + ' cm']]);
    r.valor = hcm;
    r.det = { ...d, resumen: `vuelo ${fmt(tv * 1000, 0)} ms · video` };
    r.notas.push(...notasSalto(d, 'cmj'));
    if (rampa(k.to, k.ld)) r.notas.push(noConfiable);
  }
  if (tv < 0.25 || tv > 0.9) r.notas.push(`El vuelo dura ${fmt(tv * 1000, 0)} ms. Un salto común vuela entre 400 y 650 ms. ¿Marcaste en la parte lenta del video?`);
  return r;
}
function abrirResultado() {
  const m = V.m;
  const f = $('#vdCampos');
  if (m.tipo === 'dj') f.innerHTML = `<label>Altura del cajón (cm)<input id="vdCajon" type="number" inputmode="decimal" value="${esc(guardado.leer('cajon', 30))}"></label>`;
  else if (m.tipo === 'cmj') f.innerHTML = campoEmpuje('vdEmpuje');
  else if (m.tipo === 'sq') f.innerHTML = `<label>Recorrido de la barra (cm)<input id="vdRecorrido" type="number" inputmode="decimal" step="0.5" value="${esc(guardado.leer('recorrido', 55))}"></label>
    <label>Carga (kg)<input id="vdCarga" type="number" inputmode="decimal" step="0.5" placeholder="100"></label>`;
  else f.innerHTML = '';
  f.parentElement.querySelector('.campos').hidden = !f.innerHTML;
  m.guardado = false;
  pintarResultado();
  panel('resultado');
}
$('#vdCampos').addEventListener('input', (e) => {
  if (e.target.id === 'vdCajon') guardado.escribir('cajon', aNumero(e.target.value) || 30);
  if (e.target.id === 'vdEmpuje') guardado.escribir('empuje', aNumero(e.target.value) || '');
  if (e.target.id === 'vdRecorrido') guardado.escribir('recorrido', aNumero(e.target.value) || 55);
  pintarResultado();
});
function pintarResultado() {
  const m = V.m; const r = calcular();
  $('#vdEtiqueta').textContent = r.principal.etiqueta;
  $('#vdValor').innerHTML = `${esc(r.principal.v)} <small>${esc(r.principal.unidad)}</small>`;
  $('#vdBaldosas').innerHTML = r.baldosas.map(([k, v]) => `<div><b>${esc(v)}</b><span>${esc(k)}</span></div>`).join('');
  $('#vdNotas').innerHTML = r.notas.map((t) => `<p class="banner alerta">${esc(t)}</p>`).join('');
  $('#vdMarcas').innerHTML = PRUEBAS[m.tipo].marcas.map((k, idx) => `<div class="marca"><span class="punto" style="background:${MARCAS[k].color}"></span>
    <span>${esc(MARCAS[k].nombre)} <span class="nota">cuadro ${m.marcas[k]}</span></span><button class="chip" data-corregir="${idx}">Corregir</button></div>`).join('');
  const b = $('#vdGuardar');
  b.disabled = m.guardado || !Number.isFinite(r.valor);
  b.textContent = m.guardado ? 'Guardado ✓' : 'Guardar';
}
// «Corregir» vuelve al cuadro marcado y pide esa marca de nuevo.
$('#vdMarcas').addEventListener('click', (e) => {
  const b = e.target.closest('[data-corregir]'); if (!b) return;
  const m = V.m; const idx = +b.dataset.corregir; const k = PRUEBAS[m.tipo].marcas[idx]; const en = m.marcas[k];
  m.paso = idx; delete m.marcas[k];
  panel('trabajo'); ir(en); pintarPaso();
});
$('#vdGuardar').addEventListener('click', () => {
  const m = V.m; if (m.guardado) return;
  const r = calcular();
  if (!Number.isFinite(r.valor)) return;
  const dec = METRICAS[m.tipo].dec;
  const det = { ...r.det, marcas: { ...m.marcas }, fps: V.fps, video: V.v ? V.v.nombre : '' };
  const reg = agregarRegistro({ tipo: m.tipo, valor: Math.round(r.valor * Math.pow(10, dec)) / Math.pow(10, dec), det, nota: $('#vdNota').value.trim() });
  m.guardado = true; pintarResultado();
  avisoGuardado(reg);
  repintar();
});
$('#vdOtro').addEventListener('click', () => {
  const desde = Math.max(...Object.values(V.m.marcas));
  V.m = { tipo: V.m.tipo, marcas: {}, paso: 0, guardado: false };
  $('#vdNota').value = '';
  panel('trabajo'); ir(desde + Math.round(0.5 * V.fps)); pintarPaso();
});
$('#vdListo').addEventListener('click', () => cerrarHoja());

/* ---------- copia de seguridad ---------- */
function datos() { return { registros }; }
function restaurar(d) { registros = Array.isArray(d.registros) ? d.registros : []; guardar(); pintar(); }

alEntrarSeccion.medir = pintar;
return { pintar, ultimo, de, valorDeSemana, medirConVideo, abrirCargar, abrirMetrica, migrarPesos, datos, restaurar, METRICAS };
})();
