'use strict';
/* Hoy: lo del día de las tres partes en una pantalla. También los ajustes y la copia de seguridad. */
window.Hoy = (() => {

function pintar() {
  const ahora = new Date();
  const f = ahora.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  $('#hoyFecha').textContent = f.charAt(0).toUpperCase() + f.slice(1);
  $('#hoyEtapa').textContent = ETAPA.texto(ahora);
  pintarFranja($('#hoyFranja'), { alTocar: (s) => { Entreno.abrirSemana(s); irSeccion('entreno'); } });

  let h = '';

  // Entreno
  const en = Entreno.resumenHoy();
  if (en.ses) {
    const estado = en.hecho ? '<span class="estado ok">Hecha</span>' : `<span class="estado">${en.hechas} de ${en.total} ejercicios anotados</span>`;
    h += `<button class="tarjeta bloque" data-ir="entreno">
      <span class="bloque-cabeza"><span class="rotulo-bloque">Entreno · ${esc(en.ses.tipo)}</span>${estado}</span>
      <b class="bloque-titulo">${esc(en.ses.titulo)}</b>
      <span class="progreso"><i style="width:${en.total ? Math.round(en.hechas / en.total * 100) : 0}%"></i></span>
      ${en.testsHoy.length ? `<span class="nota test-texto">Hoy hay tests: ${en.testsHoy.map((t) => esc(t.nombre)).join(', ')} (${en.testsCargados} de ${en.testsHoy.length} cargados)</span>` : ''}
      <span class="nota">${esc(en.ses.donde)} · ${esc(en.ses.dur)}</span></button>`;
  } else {
    const fuera = en.semana < 1 || en.semana > ETAPA.total;
    h += `<button class="tarjeta bloque" data-ir="entreno"><span class="bloque-cabeza"><span class="rotulo-bloque">Entreno</span></span>
      <b class="bloque-titulo">${fuera ? (en.semana < 1 ? 'El plan todavía no arrancó' : 'Plan terminado') : 'Descanso'}</b>
      <span class="nota">${fuera ? 'Mirá el plan en Entreno.' : 'Día sin entrenamiento. Dormí bien y comé proteína.'}</span></button>`;
  }

  // Comida
  const co = Comida.resumenHoy();
  const pasado = co.resto < 0;
  h += `<div class="tarjeta bloque">
    <span class="bloque-cabeza"><span class="rotulo-bloque">Comida</span><span class="estado">${redondo(co.comido)} de ${redondo(co.objetivo)} kcal</span></span>
    <b class="bloque-titulo">${fmt(Math.abs(co.resto), 0)} kcal ${pasado ? 'de más' : 'restantes'}</b>
    <span class="progreso ${pasado ? 'pasado' : ''}"><i style="width:${Math.min(100, co.comido / (co.objetivo || 1) * 100)}%"></i></span>
    <span class="nota">Proteína ${redondo(co.p)} de ${redondo(co.pObj)} g</span>
    ${co.ayer ? `<span class="nota">Ayer: gastaste ${fmt(co.ayer.gasto, 0)} kcal y comiste ${fmt(co.ayer.comido, 0)}. Balance ${co.ayer.balance > 0 ? '+' : co.ayer.balance < 0 ? '−' : ''}${fmt(Math.abs(co.ayer.balance), 0)} kcal.</span>` : ''}
    <div class="dos"><button class="boton" data-accion="comer">Agregar comida</button><button class="boton secundario" data-ir="comida">Ver el diario</button></div></div>`;

  // Medir: en semana de tests, lo que falta; siempre, el peso y el HRV del día.
  const sem = ETAPA.semanaDeFecha(ahora);
  const M = Medir.METRICAS;
  const hoyK = claveFecha(ahora);
  const deHoy = (t) => Medir.de(t).filter((r) => r.fecha === hoyK).pop();
  let medir = '';
  if (ETAPA.semanasConTests.includes(sem)) {
    const faltan = Object.keys(M).filter((t) => M[t].grupo === 'rend' && Medir.valorDeSemana(t, sem) == null);
    medir += faltan.length
      ? `<p class="test-texto">Semana de tests. Falta medir: ${faltan.map((t) => esc(M[t].nombre)).join(', ')}.</p>`
      : '<p class="test-texto">Semana de tests: ya mediste todo el rendimiento.</p>';
  }
  const pesoHoy = deHoy('peso'), hrvHoy = deHoy('hrv');
  medir += `<div class="rapido">
    <label>Peso (kg)<input id="rapPeso" type="number" inputmode="decimal" step="0.1" placeholder="${esc(Medir.ultimo('peso') ? fmt(Medir.ultimo('peso').valor, 1) : '78,0')}" value="${pesoHoy ? pesoHoy.valor : ''}"></label>
    <label>HRV (ms)<input id="rapHrv" type="number" inputmode="numeric" placeholder="${esc(Medir.ultimo('hrv') ? fmt(Medir.ultimo('hrv').valor, 0) : '60')}" value="${hrvHoy ? hrvHoy.valor : ''}"></label>
    <button class="boton" data-accion="rapido">Guardar</button></div>`;
  h += `<div class="tarjeta bloque"><span class="bloque-cabeza"><span class="rotulo-bloque">Medir</span><button class="chip" data-ir="medir">Ver mediciones</button></span>${medir}</div>`;

  $('#hoyTarjetas').innerHTML = h;
}

$('#hoyTarjetas').addEventListener('click', (e) => {
  const b = e.target.closest('[data-ir], [data-accion]'); if (!b) return;
  if (b.dataset.accion === 'comer') { irSeccion('comida'); Comida.agregar(); return; }
  if (b.dataset.accion === 'rapido') { guardarRapido(); return; }
  if (b.dataset.ir === 'entreno') Entreno.abrirSesionDeHoy();
  if (b.dataset.ir) irSeccion(b.dataset.ir);
});
// Peso y HRV del día: si ya había uno de hoy, se reemplaza.
function guardarRapido() {
  const hoyK = claveFecha(new Date());
  const cambios = [];
  [['peso', '#rapPeso', 1], ['hrv', '#rapHrv', 0]].forEach(([tipo, sel, dec]) => {
    const v = aNumero($(sel).value);
    if (!(v > 0)) return;
    const viejo = Medir.de(tipo).filter((r) => r.fecha === hoyK).pop();
    const valor = dec ? uno(v) : Math.round(v);
    if (viejo && viejo.valor === valor) return;
    const d = Medir.datos();
    const registros = d.registros.filter((r) => !(viejo && r.id === viejo.id));
    registros.push({ id: 'r' + Date.now() + tipo, tipo, valor, fecha: hoyK, semana: ETAPA.semanaDeFecha(new Date()), det: {}, nota: '', at: Date.now() });
    Medir.restaurar({ registros });
    cambios.push(`${Medir.METRICAS[tipo].nombre} ${fmt(valor, dec)} ${Medir.METRICAS[tipo].unidad}`);
  });
  avisar(cambios.length ? `Guardado: ${cambios.join(' y ')}` : 'Poné el peso o el HRV de hoy');
  pintar();
}

/* ---------- ajustes y copia de seguridad ---------- */
$('#abrirAjustes').onclick = () => { irSeccion('ajustes'); $$('#pestanas [data-seccion]').forEach((b) => b.classList.remove('activa')); };
$('#irAjustesComida').onclick = () => { irSeccion('comida'); Comida.abrirAjustes(); };

$('#exportar').onclick = () => {
  const copia = { app: 'progreso', version: 1, fecha: new Date().toISOString(), comida: Comida.datos(), entreno: Entreno.datos(), medir: Medir.datos() };
  entregarArchivo(`progreso-${claveFecha(new Date())}.json`, JSON.stringify(copia));
};
$('#importar').onchange = async (ev) => {
  const f = ev.target.files[0]; if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    if (d.app === 'progreso') {
      if (!confirm('Esto reemplaza comida, entreno y mediciones por los de la copia. ¿Seguir?')) return;
      if (d.comida) Comida.restaurar(d.comida);
      if (d.entreno) Entreno.restaurar(d.entreno);
      if (d.medir) Medir.restaurar(d.medir);
      avisar('Copia importada');
    } else if (d.app === 'calorias') {
      if (!confirm('Copia de la app Calorías: reemplaza la comida. El peso se suma a Medir. ¿Seguir?')) return;
      Comida.restaurar(d);
      const n = Medir.migrarPesos(d.pesos);
      avisar(`Comida importada${n ? ` y ${n} pesos sumados a Medir` : ''}`);
    } else if (d.app === 'entreno') {
      if (!confirm('Copia de la app Entreno: reemplaza lo anotado del plan. ¿Seguir?')) return;
      Entreno.restaurar(d);
      avisar('Entreno importado');
    } else throw new Error('no es una copia de Progreso, Calorías ni Entreno');
  } catch (e) { avisar('No se pudo importar: ' + e.message); }
  ev.target.value = '';
};

alEntrarSeccion.hoy = pintar;
pintar();
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
return { pintar };
})();
