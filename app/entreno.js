'use strict';
/* Entreno: sigue el plan de plan.js (antes la app Entreno). Todo lo que anotás vive en el teléfono.
   Usa las mismas claves «en.» que la app Entreno, así una copia vieja se importa tal cual. */
window.Entreno = (() => {

const P = window.PLAN;
const EJ = window.EJERCICIOS;
const DIAS_SESION = [1, 2, 3, 4, 6];
const NOMBRE_DIA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/* ---------- almacenamiento ---------- */
const guardado = almacen('en.');
let registro = guardado.leer('registro', {}); // "sem-dia" → { series: {clave: [bool]}, pesos: {clave: kg}, cal: [bool], suave, hecho, fecha }
let control = guardado.leer('control', {});   // semana → { apreton, tos, manana }
let tests = guardado.leer('tests', {});       // semana → { sprint10, ... }

/* ---------- la rutina: el plan con los cambios propios ---------- */
// Mientras no edites nada, la rutina es la de plan.js. Al primer cambio se guarda una copia propia («en.rutina»).
// Cada ejercicio tiene un id fijo (uid): las series y los pesos anotados se guardan con ese id,
// así agregar, quitar u ordenar ejercicios no mueve las marcas de lugar.
const copiar = (x) => JSON.parse(JSON.stringify(x));
function rutinaDelPlan() {
  const r = copiar(P.sesiones);
  Object.entries(r).forEach(([d, ses]) => ses.partes.forEach((parte, pi) => parte.ejercicios.forEach((ej, ei) => { ej.uid = `${d}-${pi}-${ei}`; })));
  return r;
}
let rutina = guardado.leer('rutina', null); // { base: versión del plan, sesiones } o null
const delPlan = rutinaDelPlan();
const sesiones = () => (rutina ? rutina.sesiones : delPlan);
let propios = guardado.leer('ejerciciosPropios', {}); // id → { nombre, grupo, como, claves }
Object.assign(EJ, propios);
function guardarRutina() {
  if (!rutina) rutina = { base: P.version, sesiones: copiar(delPlan) };
  guardado.escribir('rutina', rutina);
}
function volverAlPlan() { rutina = null; guardado.escribir('rutina', null); }

/* ---------- fechas y semana ---------- */
const hoy = new Date();
const semanaHoy = ETAPA.semanaDeFecha(hoy);
let semana = Math.min(8, Math.max(1, semanaHoy));
let dia = hoy.getDay();
if (semanaHoy < 1) dia = 1; // antes de arrancar: muestra el primer lunes
const esHoy = (s, d) => s === semanaHoy && d === hoy.getDay();
const clave = (s, d) => `${s}-${d}`;
const reg = (s, d) => (registro[clave(s, d)] = registro[clave(s, d)] || { series: {}, pesos: {}, cal: [] });
const guardarRegistro = () => guardado.escribir('registro', registro);

/* ---------- interpretar el plan ---------- */
function prescripcion(ej, s) { return ej.pres[s - 1]; }
function cargaTexto(ej, s) { return ej.cargaPropia ? (ej.cargaPropia[s - 1] || null) : ej.carga ? P.cargas[ej.carga][s - 1] : null; }
function ejercicioDe(ej, s) { return ej.ejPorSemana ? ej.ejPorSemana[s - 1] : ej.id; }
function nSeries(ej, s) {
  const c = cargaTexto(ej, s);
  const m1 = c && c.match(/\((\d+)\s*x/);
  if (m1) return +m1[1];
  const p = prescripcion(ej, s);
  const m = p.match(/^(\d+)\s*(?:x|series)/i) || p.match(/(\d+)\s*x/);
  return m ? +m[1] : 1;
}
// Lo que dice el plan para anotar de un toque: series, repeticiones y kg.
function lineaDelPlan(ej, s) {
  const c = cargaTexto(ej, s) || '';
  const p = prescripcion(ej, s) || '';
  const m = c.match(/\((\d+)\s*x\s*(\d+)/);
  const mp = p.match(/x\s*(\d+)/i);
  const reps = m ? +m[2] : mp ? +mp[1] : null;
  const kg = aNumero((c.match(/^[\d,.]+/) || [''])[0]);
  return { s: nSeries(ej, s), r: reps, kg: Number.isFinite(kg) ? kg : null };
}
const noVa = (ej, s) => /^No$/.test(prescripcion(ej, s) || 'No');
const semanaInfo = (s) => P.semanas[s - 1];

/* ---------- barra de semana y días ---------- */
function pintarBarra() {
  const w = semanaInfo(semana);
  $('#semTexto').innerHTML = `Semana ${semana} de 8<small>${w.desde} al ${w.hasta} · ${esc(w.bloque)}</small>`;
  $('#dias').innerHTML = [1, 2, 3, 4, 5, 6, 0].map((d) => {
    const ses = sesiones()[d];
    const r = registro[clave(semana, d)];
    const cls = ['dsem', ses ? '' : 'descanso', d === dia ? 'activo' : '', r && r.hecho ? 'hecho' : '', esHoy(semana, d) ? 'hoy' : ''].join(' ');
    return `<button class="${cls}" data-dia="${d}">${NOMBRE_DIA[d]}<small>${esHoy(semana, d) ? 'hoy' : ses ? ses.tipo : 'desc.'}</small></button>`;
  }).join('');
}
$('#dias').addEventListener('click', (e) => { const b = e.target.closest('[data-dia]'); if (b) { dia = +b.dataset.dia; pintarTodo(); window.scrollTo(0, 0); } });
$('#semAnterior').onclick = () => { if (semana > 1) { semana--; pintarTodo(); } };
$('#semSiguiente').onclick = () => { if (semana < 8) { semana++; pintarTodo(); } };
$('#semTexto').onclick = () => { semana = Math.min(8, Math.max(1, semanaHoy)); dia = semanaHoy < 1 ? 1 : hoy.getDay(); pintarTodo(); };

/* ---------- vista Sesión ---------- */
function pintarSesion() {
  const caja = $('#enSesion');
  const ses = sesiones()[dia];
  const w = semanaInfo(semana);
  let h = '';
  if (semanaHoy < 1 && semana === 1) h += `<div class="banner info">El plan arranca el lunes ${w.desde}. Ya podés mirar las sesiones.</div>`;
  if (w.nota) h += `<div class="banner info">${esc(w.nota)}</div>`;
  if (!ses) {
    // El domingo cierra la semana (va al final de la fila): la próxima sesión es el lunes de la semana siguiente.
    const prox = dia === 0 ? 1 : DIAS_SESION.find((d) => d > dia) ?? 1;
    const otraSemana = dia === 0 && semana < 8;
    const hay = dia !== 0 || semana < 8;
    caja.innerHTML = h + `<div class="tarjeta"><h2>Descanso</h2><p class="nota">Día sin entrenamiento. Dormí bien y comé proteína.</p>
      ${hay ? `<button class="boton secundario" data-ir="${prox}" data-ir-semana="${otraSemana ? semana + 1 : semana}">Ver la próxima sesión (${sesiones()[prox].dia})</button>` : '<p>Terminaste el plan. ¡A la pretemporada!</p>'}</div>`;
    return;
  }
  const r = registro[clave(semana, dia)] || { series: {}, pesos: {}, cal: [] };
  h += `<div class="tarjeta cabeza-sesion"><span class="tipo">${esc(ses.tipo)}</span><span class="nota">${esc(ses.donde)} · ${esc(ses.dur)}</span>
    <h2 style="margin-top:6px">${esc(ses.dia)}: ${esc(ses.titulo)}</h2></div>`;

  // Tests de la semana
  const testsHoy = w.tests ? P.tests.filter((t) => t.dia === dia) : [];
  if (testsHoy.length) {
    const tv = tests[semana] || {};
    h += `<div class="tarjeta"><h2>Tests de la semana ${semana}</h2><p class="nota">Reemplazan parte de la sesión de hoy (no suman tiempo).</p>` +
      testsHoy.map((t) => `<label class="campo" style="margin-top:8px"><b style="color:var(--texto)">${esc(t.nombre)}</b> (${esc(t.unidad)}). ${esc(t.como)}
        <input inputmode="decimal" data-test="${t.id}" value="${esc(tv[t.id] ?? '')}" placeholder="${esc(t.unidad)}"></label>` +
        (t.id === 'salto' ? `<button class="boton secundario" data-medir="cmj">Medir el salto con video</button><p class="nota">El mejor CMJ que guardes esta semana se copia acá.</p>` : '')).join('') + '</div>';
  }

  // Control del aductor (lunes)
  if (ses.controlAductor) {
    const c = control[semana] || {};
    h += `<div class="tarjeta"><h2>Control del aductor</h2><p class="nota">${esc(P.aductor.control)}</p>
      <div class="campos">
        <label>Apretón fuerte<input inputmode="numeric" data-control="apreton" value="${esc(c.apreton ?? '')}" placeholder="0-10"></label>
        <label>Al toser<input inputmode="numeric" data-control="tos" value="${esc(c.tos ?? '')}" placeholder="0-10"></label>
        <label>Pasos de la mañana<input inputmode="numeric" data-control="manana" value="${esc(c.manana ?? '')}" placeholder="0-10"></label>
      </div></div>`;
  }

  // Sesión suave
  if (ses.calentamiento === 'explosivo') {
    h += r.suave
      ? `<div class="banner alerta"><b>Sesión suave:</b> el apretón pasó de 3/10. Aceleraciones al 70% y nada de saltos intensivos. <button class="link" data-suave="0">Deshacer</button></div>`
      : `<p class="nota">¿El apretón del calentamiento pasó de 3/10? <button class="link" data-suave="1">Marcar sesión suave</button></p>`;
  }

  // Calentamiento
  const cal = P.calentamientos[ses.calentamiento];
  const lugar = ses.lugar || 'cancha';
  const hechos = r.cal || [];
  h += `<details class="tarjeta cal"><summary>${esc(cal.titulo)} (${cal.min}') ${hechos.filter(Boolean).length}/${cal.pasos.length}</summary>` +
    (cal.intro ? `<p class="nota" style="padding:0 14px 8px">${esc(cal.intro)}</p>` : '') +
    cal.pasos.map((p, i) => {
      const texto = p[lugar] || p.cancha || p.que;
      const ejs = (Array.isArray(p.ej) ? p.ej : p.ej ? [p.ej] : []).map((id) => `<button class="link" data-ej="${id}">${esc(EJ[id].nombre)}</button>`).join(' · ');
      return `<div class="paso"><button class="check ${hechos[i] ? 'on' : ''}" data-cal="${i}" aria-label="Hecho">${hechos[i] ? '✓' : ''}</button>
        <div><b>${esc(p.paso)} · ${esc(p.min)}</b><p>${esc(texto)}</p>${ejs ? `<p class="nota">${ejs}</p>` : ''}</div></div>`;
    }).join('') +
    (cal.pautas ? `<div style="padding:4px 14px 12px"><ul class="pautas">${cal.pautas.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '') + '</details>';

  // Modo editar: la misma sesión, con controles para cambiar, agregar, quitar y ordenar.
  if (modoEditar) {
    h += `<div class="banner info"><b>Editando la rutina de los ${esc(ses.dia.toLowerCase())}.</b> Al guardar elegís si el cambio vale para esta semana, desde esta semana o para las 8.</div>`;
    ses.partes.forEach((parte, pi) => {
      h += `<div class="tarjeta parte"><h2>${esc(parte.nombre)}</h2>` + parte.ejercicios.map((ej, ei) => {
        const id = ejercicioDe(ej, semana);
        const carga = cargaTexto(ej, semana);
        return `<div class="ej editable"><div class="ej-cabeza"><span class="letra">${esc(ej.etiqueta || '')}</span><b>${esc((EJ[id] || { nombre: id }).nombre)}</b></div>
          <p class="pres">${noVa(ej, semana) ? 'No va esta semana.' : esc(prescripcion(ej, semana))}${carga ? ` · ${esc(carga)} kg por lado` : ''}</p>
          <div class="acciones-ej">
            <button class="chip" data-mover="${ej.uid}" data-dir="-1" ${ei === 0 ? 'disabled' : ''} aria-label="Subir">↑</button>
            <button class="chip" data-mover="${ej.uid}" data-dir="1" ${ei === parte.ejercicios.length - 1 ? 'disabled' : ''} aria-label="Bajar">↓</button>
            <button class="chip activa" data-editar-ej="${ej.uid}">Editar</button>
          </div></div>`;
      }).join('') + `<div class="ej"><button class="boton secundario" data-agregar-ej="${pi}">Agregar ejercicio</button></div></div>`;
    });
    h += `<button class="boton" data-editar="0">Listo</button>`;
    caja.innerHTML = h;
    return;
  }

  // Partes y ejercicios: se anota al terminar, por ejercicio, en líneas de series × repeticiones × kg.
  const faltan = ses.partes.flatMap((p) => p.ejercicios).filter((ej) => !noVa(ej, semana) && !(r.anotado && r.anotado[ej.uid])).length;
  h += `<div class="tarjeta anotar-cabeza"><p class="nota">Anotá lo que hiciste en cada ejercicio: series × repeticiones × kg. Si cambiaste el peso en la última serie, agregá otra línea.</p>
    ${faltan ? `<button class="boton secundario" data-todo-plan="1">Anotar todo como el plan (${faltan})</button>` : ''}</div>`;
  ses.partes.forEach((parte, pi) => {
    h += `<div class="tarjeta parte"><h2>${esc(parte.nombre)}</h2>`;
    parte.ejercicios.forEach((ej, ei) => {
      const k = ej.uid;
      const id = ejercicioDe(ej, semana);
      const pres = prescripcion(ej, semana);
      if (noVa(ej, semana)) {
        h += `<div class="ej no"><div class="ej-cabeza"><span class="letra">${esc(ej.etiqueta || '')}</span><button data-ej="${id}">${esc((EJ[id] || { nombre: id }).nombre)}</button></div><p class="pres">No va esta semana.</p></div>`;
        return;
      }
      const carga = cargaTexto(ej, semana);
      const esTest = w.tests && ej.test && P.tests.some((t) => t.dia === dia && (t.id === ej.test || t.id.startsWith(ej.test)));
      const lineas = (r.anotado && r.anotado[k]) || null;
      h += `<div class="ej"><div class="ej-cabeza"><span class="letra">${esc(ej.etiqueta || '')}</span><button data-ej="${id}">${esc((EJ[id] || { nombre: id }).nombre)}</button></div>
        <p class="pres">${esc(pres)}${carga ? ` · <b class="carga-txt">${esc(carga.replace(/^([\d,]+)/, '$1 kg'))}</b>` : ''}${esTest ? (ej.test === 'fuerza' ? ' <b>(hoy también el test de fuerza: 25 por lado)</b>' : ' <b>(esta semana lo reemplaza el test)</b>') : ''}</p>
        ${lineas ? `<div class="lineas">${lineas.map((l, i) => `<div class="linea-anot">
            <input inputmode="numeric" aria-label="Series" data-anot="${k}" data-i="${i}" data-campo="s" value="${l.s ?? ''}"><span>×</span>
            <input inputmode="numeric" aria-label="Repeticiones" data-anot="${k}" data-i="${i}" data-campo="r" value="${l.r ?? ''}"><span>×</span>
            <input inputmode="decimal" aria-label="Kilos" data-anot="${k}" data-i="${i}" data-campo="kg" value="${l.kg != null ? fmt(l.kg, l.kg % 1 ? 1 : 0) : ''}" placeholder="—"><span>kg</span>
            <button class="icono chico" data-quitar-linea="${k}" data-i="${i}" aria-label="Borrar línea">✕</button></div>`).join('')}
            <button class="link" data-linea="${k}">Agregar otra línea</button></div>`
          : `<div class="fila-anotar"><button class="chip activa" data-como-plan="${k}">Como el plan</button><button class="chip" data-linea="${k}">Anotar distinto</button></div>`}
        </div>`;
    });
    h += '</div>';
  });
  if (ses.notas) h += `<div class="tarjeta"><ul class="pautas">${ses.notas.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
  h += r.hecho
    ? `<div class="banner ok">Sesión hecha el ${esc(r.fecha || '')}. <button class="link" data-hecho="0">Desmarcar</button></div>`
    : `<button class="boton ok" data-hecho="1">Terminé la sesión</button>`;
  h += `<button class="boton secundario" data-editar="1">Editar la rutina de los ${esc(ses.dia.toLowerCase())}</button>`;
  caja.innerHTML = h;
}

/* ---------- editar la rutina ---------- */
let modoEditar = false;
let editando = null; // { uid } para cambiar uno, { parte } para agregar uno nuevo
const buscarEj = (uid) => {
  for (const parte of sesiones()[dia].partes) { const i = parte.ejercicios.findIndex((e) => e.uid === uid); if (i >= 0) return { parte, i, ej: parte.ejercicios[i] }; }
  return null;
};
function opcionesEjercicios(elegido) {
  const grupos = {};
  Object.entries(EJ).forEach(([id, e]) => (grupos[e.grupo] = grupos[e.grupo] || []).push([id, e]));
  return Object.entries(grupos).map(([g, l]) => `<optgroup label="${esc(g)}">${l.sort((a, b) => a[1].nombre.localeCompare(b[1].nombre, 'es'))
    .map(([id, e]) => `<option value="${id}" ${id === elegido ? 'selected' : ''}>${esc(e.nombre)}</option>`).join('')}</optgroup>`).join('') +
    '<option value="__nuevo">Otro ejercicio (nuevo)…</option>';
}
function abrirEditar(datos) {
  editando = datos;
  const hit = datos.uid ? buscarEj(datos.uid) : null;
  const ej = hit ? hit.ej : null;
  const id = ej ? ejercicioDe(ej, semana) : '';
  const pres = ej && !noVa(ej, semana) ? prescripcion(ej, semana) : '';
  editando.cargaAntes = ej ? (cargaTexto(ej, semana) || '') : '';
  editando.alcance = 'desde';
  $('#edTitulo').textContent = ej ? 'Editar ejercicio' : 'Agregar ejercicio';
  $('#edCuerpo').innerHTML = `<div class="tarjeta">
    <label>Ejercicio<select id="edEj">${ej ? '' : '<option value="" selected disabled>Elegí uno…</option>'}${opcionesEjercicios(id)}</select></label>
    <div id="edNuevo" hidden>
      <label>Nombre del ejercicio nuevo<input id="edNombre" autocomplete="off" placeholder="Sentadilla goblet"></label>
      <label>Cómo se hace (opcional)<input id="edComo" autocomplete="off"></label>
    </div>
    <label>Dosis<input id="edDosis" value="${esc(pres)}" placeholder="3 x 8" autocomplete="off"></label>
    <p class="nota">Empezá con «series x repeticiones» (por ejemplo «3 x 8 por pierna») para que aparezcan las series para marcar.</p>
    <div class="campos">
      <label>Carga (kg por lado)<input id="edCarga" inputmode="decimal" value="${esc(editando.cargaAntes)}" placeholder="sin carga"></label>
      <label>Descanso (s)<input id="edDescanso" type="number" inputmode="numeric" value="${ej && ej.descanso ? ej.descanso : ''}" placeholder="90"></label>
      <label>Letra<input id="edLetra" value="${esc(ej ? ej.etiqueta || '' : '')}" placeholder="B1" autocomplete="off"></label>
    </div>
    <p class="nota" style="margin-top:12px">El cambio vale para:</p>
    <div class="filtros" id="edAlcance">
      <button class="chip" data-alcance="semana">Solo la semana ${semana}</button>
      <button class="chip activa" data-alcance="desde">${semana === 1 ? 'Las 8 semanas' : `De la semana ${semana} en adelante`}</button>
      ${semana > 1 ? '<button class="chip" data-alcance="todas">Las 8 semanas</button>' : ''}
    </div>
    <button class="boton" id="edGuardar">${ej ? 'Guardar cambios' : 'Agregar a la rutina'}</button>
    ${ej ? `<button class="boton secundario" id="edQuitarSemana">Quitar solo la semana ${semana}</button>
      <button class="boton peligro" id="edQuitar">Quitar de la rutina</button>` : ''}
  </div>`;
  abrirHoja('#hojaEditarEj');
}
$('#edCuerpo').addEventListener('change', (e) => { if (e.target.id === 'edEj') $('#edNuevo').hidden = e.target.value !== '__nuevo'; });
$('#edCuerpo').addEventListener('click', (e) => {
  const a = e.target.closest('[data-alcance]');
  if (a) { editando.alcance = a.dataset.alcance; $$('#edAlcance .chip').forEach((c) => c.classList.toggle('activa', c === a)); return; }
  if (e.target.id === 'edGuardar') guardarEdicion();
  if (e.target.id === 'edQuitarSemana') quitar(false);
  if (e.target.id === 'edQuitar') quitar(true);
});
function semanasDelAlcance() {
  const n = P.semanas.length;
  const desde = editando.alcance === 'todas' ? 0 : semana - 1;
  const hasta = editando.alcance === 'semana' ? semana : n;
  return Array.from({ length: hasta - desde }, (_, i) => desde + i);
}
function guardarEdicion() {
  let id = $('#edEj').value;
  const dosis = $('#edDosis').value.trim();
  if (!id) return avisar('Elegí un ejercicio');
  if (!dosis) return avisar('Escribí la dosis, por ejemplo 3 x 8');
  if (id === '__nuevo') {
    const nombre = $('#edNombre').value.trim();
    if (!nombre) return avisar('Escribí el nombre del ejercicio nuevo');
    id = 'propio' + Date.now();
    propios[id] = { nombre, grupo: 'Mis ejercicios', como: $('#edComo').value.trim() || 'Ejercicio agregado por mí.', claves: [] };
    EJ[id] = propios[id];
    guardado.escribir('ejerciciosPropios', propios);
  }
  guardarRutina();
  const idxs = semanasDelAlcance();
  let ej;
  if (editando.uid) ej = buscarEj(editando.uid).ej;
  else {
    ej = { uid: 'n' + Date.now(), id, pres: P.semanas.map(() => 'No') };
    sesiones()[dia].partes[editando.parte].ejercicios.push(ej);
  }
  idxs.forEach((i) => { ej.pres[i] = dosis; });
  // El ejercicio puede cambiar según la semana (como el aductor): se guarda por semana solo si hace falta.
  if (idxs.length === P.semanas.length && !ej.ejPorSemana) ej.id = id;
  else if (ejercicioDe(ej, semana) !== id || ej.ejPorSemana) {
    ej.ejPorSemana = ej.ejPorSemana || P.semanas.map(() => ej.id);
    idxs.forEach((i) => { ej.ejPorSemana[i] = id; });
  }
  const carga = $('#edCarga').value.trim().replace(/\s*kg.*$/i, '');
  if (carga !== editando.cargaAntes) {
    ej.cargaPropia = ej.cargaPropia || (ej.carga ? P.cargas[ej.carga].slice() : P.semanas.map(() => ''));
    delete ej.carga;
    idxs.forEach((i) => { ej.cargaPropia[i] = carga; });
    if (ej.cargaPropia.every((c) => !c)) delete ej.cargaPropia;
  }
  const descanso = parseInt($('#edDescanso').value, 10);
  if (descanso > 0) ej.descanso = descanso; else delete ej.descanso;
  const letra = $('#edLetra').value.trim();
  if (letra) ej.etiqueta = letra; else delete ej.etiqueta;
  guardado.escribir('rutina', rutina);
  cerrarHoja(); pintarTodo();
  avisar(editando.uid ? 'Ejercicio guardado' : 'Ejercicio agregado');
}
function quitar(deLaRutina) {
  guardarRutina();
  const hit = buscarEj(editando.uid);
  if (deLaRutina) {
    if (!confirm(`¿Quitar ${(EJ[ejercicioDe(hit.ej, semana)] || {}).nombre || 'el ejercicio'} de la rutina de los ${sesiones()[dia].dia.toLowerCase()} en las 8 semanas?`)) return;
    hit.parte.ejercicios.splice(hit.i, 1);
  } else hit.ej.pres[semana - 1] = 'No';
  guardado.escribir('rutina', rutina);
  cerrarHoja(); pintarTodo();
  avisar(deLaRutina ? 'Ejercicio quitado de la rutina' : `Ejercicio quitado de la semana ${semana}`);
}
function mover(uid, dir) {
  guardarRutina();
  const hit = buscarEj(uid);
  const j = hit.i + dir;
  if (j < 0 || j >= hit.parte.ejercicios.length) return;
  const l = hit.parte.ejercicios;
  [l[hit.i], l[j]] = [l[j], l[hit.i]];
  guardado.escribir('rutina', rutina);
  pintarTodo();
}

$('#enSesion').addEventListener('click', (e) => {
  const t = e.target.closest('button');
  if (!t) return;
  if (t.dataset.medir) { window.Medir.medirConVideo(t.dataset.medir); return; }
  if (t.dataset.editar) { modoEditar = t.dataset.editar === '1'; pintarTodo(); window.scrollTo(0, 0); return; }
  if (t.dataset.editarEj) { abrirEditar({ uid: t.dataset.editarEj }); return; }
  if (t.dataset.agregarEj) { abrirEditar({ parte: +t.dataset.agregarEj }); return; }
  if (t.dataset.mover) { mover(t.dataset.mover, +t.dataset.dir); return; }
  if (t.dataset.ir) { dia = +t.dataset.ir; semana = +t.dataset.irSemana || semana; pintarTodo(); window.scrollTo(0, 0); return; }
  if (t.dataset.ej) { abrirEjercicio(t.dataset.ej); return; }
  const r = reg(semana, dia);
  r.anotado = r.anotado || {};
  const ejDe = (uid) => sesiones()[dia].partes.flatMap((p) => p.ejercicios).find((x) => x.uid === uid);
  if (t.dataset.cal != null) { r.cal[+t.dataset.cal] = !r.cal[+t.dataset.cal]; }
  else if (t.dataset.comoPlan) { r.anotado[t.dataset.comoPlan] = [lineaDelPlan(ejDe(t.dataset.comoPlan), semana)]; }
  else if (t.dataset.todoPlan) {
    sesiones()[dia].partes.flatMap((p) => p.ejercicios).forEach((ej) => { if (!noVa(ej, semana) && !r.anotado[ej.uid]) r.anotado[ej.uid] = [lineaDelPlan(ej, semana)]; });
    avisar('Anotado como el plan. Corregí lo que haya cambiado.');
  } else if (t.dataset.linea) {
    const k = t.dataset.linea, l = r.anotado[k];
    // La línea nueva copia la anterior con 1 serie: lo común es cambiar el peso de la última.
    r.anotado[k] = l ? l.concat([{ ...l[l.length - 1], s: 1 }]) : [lineaDelPlan(ejDe(k), semana)];
  } else if (t.dataset.quitarLinea) {
    const k = t.dataset.quitarLinea;
    r.anotado[k].splice(+t.dataset.i, 1);
    if (!r.anotado[k].length) delete r.anotado[k];
  } else if (t.dataset.suave) { r.suave = t.dataset.suave === '1'; }
  else if (t.dataset.hecho) {
    r.hecho = t.dataset.hecho === '1';
    r.fecha = r.hecho ? new Date().toLocaleDateString('es-UY', { day: 'numeric', month: 'numeric' }) : '';
    if (r.hecho) avisar('¡Sesión registrada!');
  } else return;
  guardarRegistro();
  const y = window.scrollY; pintarTodo(); window.scrollTo(0, y);
});
$('#enSesion').addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.anot) {
    const l = reg(semana, dia).anotado[t.dataset.anot][+t.dataset.i];
    const v = aNumero(t.value);
    l[t.dataset.campo] = Number.isFinite(v) ? v : null;
    guardarRegistro();
  }
  if (t.dataset.control) { control[semana] = control[semana] || {}; control[semana][t.dataset.control] = t.value; guardado.escribir('control', control); }
  if (t.dataset.test) { tests[semana] = tests[semana] || {}; tests[semana][t.dataset.test] = t.value; guardado.escribir('tests', tests); avisar('Test guardado'); }
});

/* ---------- temporizador de descanso ---------- */
let finTempo = 0, intervalo = null;
function formatoTiempo(s) { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
function arrancarTemporizador(seg) {
  finTempo = Date.now() + seg * 1000;
  $('#temporizador').hidden = false; $('#temporizador').classList.remove('fin');
  clearInterval(intervalo); intervalo = setInterval(tic, 250); tic();
}
function tic() {
  const resto = (finTempo - Date.now()) / 1000;
  $('#tempoTexto').textContent = formatoTiempo(resto);
  if (resto <= 0) {
    clearInterval(intervalo); $('#temporizador').classList.add('fin'); $('#tempoTexto').textContent = '¡Dale!';
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  }
}
$('#tempoMas').onclick = () => { finTempo = Math.max(finTempo, Date.now()) + 15000; $('#temporizador').classList.remove('fin'); clearInterval(intervalo); intervalo = setInterval(tic, 250); tic(); };
$('#tempoParar').onclick = () => { clearInterval(intervalo); $('#temporizador').hidden = true; };

/* ---------- ficha de ejercicio ---------- */
function abrirEjercicio(id) {
  const e = EJ[id];
  if (!e) return;
  const usos = [];
  Object.entries(sesiones()).forEach(([d, s]) => s.partes.forEach((p) => p.ejercicios.forEach((ej) => {
    if (ej.id === id || (ej.ejPorSemana || []).includes(id)) usos.push(`${s.dia}: ${ej.ejPorSemana ? ej.pres[ej.ejPorSemana.indexOf(id)] : ej.pres[semana - 1]}`);
  })));
  $('#ejDetalle').innerHTML = `<div class="tarjeta"><p class="nota">${esc(e.grupo)}</p><h2>${esc(e.nombre)}</h2><p>${esc(e.como)}</p>
    ${e.claves.length ? `<h3>Qué cuidar</h3><ul class="pautas">${e.claves.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
    ${usos.length ? `<h3>En el plan</h3><ul class="pautas">${usos.map((u) => `<li>${esc(u)}</li>`).join('')}</ul>` : ''}
    ${e.video ? `<p style="margin-top:14px"><a href="https://www.youtube.com/results?search_query=${encodeURIComponent(e.video)}" target="_blank" rel="noopener">Ver videos de referencia (YouTube)</a></p>` : ''}</div>`;
  abrirHoja('#hojaEjercicio');
}

/* ---------- vista Ejercicios ---------- */
function pintarEjercicios() {
  const grupos = {};
  Object.entries(EJ).forEach(([id, e]) => { if (id !== 'aductor') (grupos[e.grupo] = grupos[e.grupo] || []).push([id, e]); });
  $('#enEjercicios').innerHTML = Object.entries(grupos).map(([g, lista]) => `<div class="tarjeta grupo-ej"><h2>${esc(g)}</h2>` +
    lista.map(([id, e]) => `<button class="item" data-ej="${id}"><span>${esc(e.nombre)}</span><span class="nota">›</span></button>`).join('') + '</div>').join('');
}
$('#enEjercicios').addEventListener('click', (e) => { const b = e.target.closest('[data-ej]'); if (b) abrirEjercicio(b.dataset.ej); });

/* ---------- vista Progreso ---------- */
function pintarProgreso() {
  const hechas = Object.values(registro).filter((r) => r.hecho).length;
  let h = `<div class="tarjeta"><h2>Sesiones hechas: ${hechas} de 40</h2>
    <div class="grilla"><span></span>${DIAS_SESION.map((d) => `<b>${NOMBRE_DIA[d]}</b>`).join('')}` +
    P.semanas.map((w) => `<span>Sem ${w.n}</span>` + DIAS_SESION.map((d) => {
      const r = registro[clave(w.n, d)];
      return `<button class="c ${r && r.hecho ? 'ok' : ''} ${esHoy(w.n, d) ? 'actual' : ''}" data-ir-sem="${w.n}" data-ir-dia="${d}" style="border:0">${r && r.hecho ? '✓' : ''}</button>`;
    }).join('')).join('') + '</div></div>';

  h += `<div class="tarjeta"><h2>Tests</h2><div class="scroll"><table class="tabla"><tr><th>Test</th><th class="num">Sem 1</th><th class="num">Sem 4</th><th class="num">Sem 8</th></tr>` +
    P.tests.map((t) => `<tr><td>${esc(t.nombre)} (${esc(t.unidad)})</td>${[1, 4, 8].map((s) => `<td class="num">${esc((tests[s] || {})[t.id] || '–')}</td>`).join('')}</tr>`).join('') +
    '</table></div><p class="nota">Se cargan en la sesión del día del test (semanas 1, 4 y 8). Los saltos, el 1RM, el peso, el HRV y el VO2 máx están en Medir.</p></div>';

  h += `<div class="tarjeta"><h2>Control del aductor (0-10)</h2><div class="scroll"><table class="tabla"><tr><th>Semana</th><th class="num">Apretón</th><th class="num">Tos</th><th class="num">Mañana</th></tr>` +
    P.semanas.map((w) => { const c = control[w.n] || {}; return `<tr><td>${w.n}</td><td class="num">${esc(c.apreton || '–')}</td><td class="num">${esc(c.tos || '–')}</td><td class="num">${esc(c.manana || '–')}</td></tr>`; }).join('') +
    `</table></div><p class="nota">Nivel 1 → 2 cuando apretar fuerte no pasa de 2/10 dos semanas seguidas.</p></div>`;

  // El peso más alto anotado en cada ejercicio, semana por semana.
  const filas = [];
  Object.entries(sesiones()).forEach(([d, ses]) => ses.partes.forEach((p) => p.ejercicios.forEach((ej) => {
    const kgs = P.semanas.map((w) => {
      const r = registro[clave(w.n, +d)];
      const l = (r && r.anotado && r.anotado[ej.uid]) || [];
      const vs = l.map((x) => x.kg).filter((x) => Number.isFinite(x) && x > 0);
      return vs.length ? Math.max(...vs) : null;
    });
    if (!cargaTexto(ej, semana) && kgs.every((x) => x == null)) return;
    const nombre = (EJ[ej.id] || { nombre: ej.id }).nombre;
    filas.push(`<tr><td>${esc(nombre)} <span class="nota">${esc(ses.dia.slice(0, 3).toLowerCase())}</span></td>${kgs.map((v, i) => `<td class="num ${i + 1 === semana ? 'actual' : ''}">${v == null ? '·' : fmt(v, v % 1 ? 1 : 0)}</td>`).join('')}</tr>`);
  })));
  h += `<div class="tarjeta"><h2>Kilos hechos (el más alto de cada semana)</h2><div class="scroll"><table class="tabla"><tr><th>Ejercicio</th>${P.semanas.map((w) => `<th class="num">${w.n}</th>`).join('')}</tr>${filas.join('')}</table></div></div>`;
  $('#enProgreso').innerHTML = h;
}
$('#enProgreso').addEventListener('click', (e) => {
  const b = e.target.closest('[data-ir-sem]');
  if (!b) return;
  semana = +b.dataset.irSem; dia = +b.dataset.irDia;
  irVista('enSesion');
});

/* ---------- vista Plan ---------- */
function pintarPlan() {
  let h = `<div class="tarjeta"><h2>${esc(P.titulo)}</h2><p class="nota">Versión del plan: ${esc(P.version)}</p>
    <div class="scroll"><table class="tabla"><tr><th>Sem</th><th>Fechas</th><th>Bloque</th></tr>` +
    P.semanas.map((w) => `<tr class="${w.n === semana ? 'actual' : ''}"><td>${w.n}</td><td>${w.desde} – ${w.hasta}</td><td>${esc(w.bloque)}<br><span class="nota">${esc(P.objetivosBloque[w.bloque])}</span></td></tr>`).join('') +
    '</table></div></div>';
  h += `<div class="tarjeta"><h2>Semana tipo</h2><table class="tabla">` +
    [1, 2, 3, 4, 5, 6, 0].map((d) => { const s = sesiones()[d]; return `<tr><td>${['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][d]}</td><td>${s ? `${esc(s.tipo)} · ${esc(s.titulo)} · ${esc(s.dur)}` : 'Descanso'}</td></tr>`; }).join('') +
    '</table><p class="nota">Lo intenso para las piernas va lunes y jueves, con 72 horas entre los dos.</p></div>';
  h += `<div class="tarjeta"><h2>Cargas (kg por lado, sin la barra)</h2><div class="scroll"><table class="tabla"><tr><th>Ejercicio</th>${P.semanas.map((w) => `<th class="num">${w.n}</th>`).join('')}</tr>` +
    Object.entries(P.cargas).map(([id, v]) => `<tr><td>${esc(EJ[id].nombre)}</td>${v.map((x, i) => `<td class="num ${i + 1 === semana ? 'actual' : ''}">${esc(x)}</td>`).join('')}</tr>`).join('') +
    `</table></div><ul class="pautas">${P.reglasCargas.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
  h += `<div class="tarjeta"><h2>Aductor y zona pubiana: niveles</h2><p class="nota">${esc(P.aductor.intro)}</p><table class="tabla"><tr><th>Nivel</th><th>Ejercicio y dosis</th><th>Pasás cuando</th></tr>` +
    P.aductor.niveles.map((n) => `<tr><td class="num">${n.n}</td><td>${esc(n.ej)}<br><span class="nota">${esc(n.dosis)}</span></td><td>${esc(n.pasar)}</td></tr>`).join('') +
    `</table><p class="nota">${esc(P.aductor.esperado)}</p></div>`;
  h += `<div class="tarjeta"><h2>Reglas para ajustar</h2><ul class="pautas">${P.reglas.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
  h += `<div class="tarjeta"><h2>Tu rutina</h2>` + (rutina
    ? `<p class="nota">Tiene cambios tuyos. Se editan desde la sesión de cada día, con «Editar la rutina».${rutina.base !== P.version ? ' El plan original cambió después de tus cambios: tu rutina sigue como la dejaste.' : ''}</p>
       <button class="boton peligro" id="volverAlPlan">Volver al plan original</button>`
    : '<p class="nota">Es la del plan original. Para cambiarla, abrí la sesión de un día y tocá «Editar la rutina».</p>') + '</div>';
  $('#enPlan').innerHTML = h;
  const b = $('#volverAlPlan');
  if (b) b.onclick = () => {
    if (!confirm('Esto borra todos tus cambios de la rutina y vuelve al plan original. Las series ya marcadas de ejercicios que no estén en el plan dejan de verse. ¿Seguir?')) return;
    volverAlPlan(); pintarTodo(); avisar('Rutina del plan original');
  };
}

/* ---------- copia de seguridad (la arma hoy.js con las tres partes) ---------- */
function datos() { return { registro, control, tests, rutina, propios }; }
function restaurar(d) {
  registro = d.registro || {}; control = d.control || {}; tests = d.tests || {};
  rutina = d.rutina || null; propios = d.propios || {}; Object.assign(EJ, propios);
  guardado.escribir('registro', registro); guardado.escribir('control', control); guardado.escribir('tests', tests);
  guardado.escribir('rutina', rutina); guardado.escribir('ejerciciosPropios', propios);
  pintarTodo();
}

/* ---------- lo que usan Hoy y Medir ---------- */
// La sesión de hoy: qué toca y cuántas series van marcadas.
function resumenHoy() {
  const d = hoy.getDay();
  const s = semanaHoy;
  if (s < 1 || s > P.semanas.length) return { semana: s, ses: null };
  const ses = sesiones()[d];
  if (!ses) return { semana: s, ses: null };
  const r = registro[clave(s, d)] || {};
  let total = 0, hechas = 0;
  ses.partes.forEach((parte) => parte.ejercicios.forEach((ej) => {
    if (noVa(ej, s)) return;
    total += 1;
    if (r.anotado && r.anotado[ej.uid]) hechas += 1;
  }));
  const testsHoy = semanaInfo(s).tests ? P.tests.filter((t) => t.dia === d) : [];
  const testsCargados = testsHoy.filter((t) => ((tests[s] || {})[t.id] ?? '') !== '').length;
  return { semana: s, ses, total, hechas, hecho: !!r.hecho, testsHoy, testsCargados };
}
// Medir avisa un CMJ: en una semana de tests queda el mejor en el test «Salto vertical».
function anotarSalto(sem, cm) {
  if (!semanaInfo(sem) || !semanaInfo(sem).tests) return false;
  tests[sem] = tests[sem] || {};
  const antes = aNumero(tests[sem].salto);
  if (Number.isFinite(antes) && antes >= cm) return false;
  tests[sem].salto = fmt(cm, 1);
  guardado.escribir('tests', tests);
  return true;
}
function abrirSesionDeHoy() {
  semana = Math.min(P.semanas.length, Math.max(1, semanaHoy)); dia = semanaHoy < 1 ? 1 : hoy.getDay();
  vista = 'enSesion';
}
function abrirSemana(s) { semana = s; dia = 1; vista = 'enSesion'; }

/* ---------- navegación ---------- */
let vista = 'enSesion';
const elegirVista = subnav('#entrenoSubnav', (v) => { vista = v; mostrarBarra(); pintarTodo(); });
function mostrarBarra() {
  const conSemana = vista === 'enSesion';
  $('#entreno .barra').style.display = conSemana ? '' : 'none';
  $('#dias').style.display = conSemana ? '' : 'none';
}
function irVista(v) { elegirVista(v); window.scrollTo(0, 0); }
function pintarTodo() {
  pintarBarra();
  if (vista === 'enSesion') pintarSesion();
  if (vista === 'enEjercicios') pintarEjercicios();
  if (vista === 'enProgreso') pintarProgreso();
  if (vista === 'enPlan') pintarPlan();
}
alEntrarSeccion.entreno = () => elegirVista(vista);
pintarTodo();

return { resumenHoy, anotarSalto, abrirSesionDeHoy, abrirSemana, datos, restaurar };
})();
