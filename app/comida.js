'use strict';
/* Comida: el contador de calorías y macros (antes la app Calorías). Todo vive en el teléfono.
   Usa las mismas claves «cc.» que la app Calorías, así una copia vieja se importa tal cual. */
window.Comida = (() => {

const COMIDAS = ['Desayuno', 'Almuerzo', 'Merienda', 'Cena', 'Snacks'];
const guardado = almacen('cc.');
let diario = guardado.leer('diario', {});
let ajustes = guardado.leer('ajustes', { kcal: 2000, p: 120, c: 220, g: 65 });
let mios = guardado.leer('mios', []);
let recientes = guardado.leer('recientes', []);
let favoritos = guardado.leer('favoritos', []);
let gastos = guardado.leer('gastos', {}); // 'AAAA-MM-DD' → { reposo, actividad, origen: 'captura' | 'mano', diaCompleto }

/* ---------- fechas ---------- */
let fecha = new Date();
function textoFecha(d) {
  const hoy = claveFecha(new Date());
  const ayer = claveFecha(new Date(Date.now() - 864e5));
  const k = claveFecha(d);
  if (k === hoy) return 'Hoy';
  if (k === ayer) return 'Ayer';
  return d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
}
function comidaPorHora() {
  const h = new Date().getHours();
  if (h < 11) return 'Desayuno';
  if (h < 15) return 'Almuerzo';
  if (h < 19) return 'Merienda';
  if (h < 23) return 'Cena';
  return 'Snacks';
}

/* ---------- utilidades ---------- */
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function valoresPara(ali, gramos) {
  const f = gramos / 100;
  return { k: (ali.k || 0) * f, p: (ali.p || 0) * f, c: (ali.c || 0) * f, g: (ali.g || 0) * f };
}

/* ---------- base de alimentos ---------- */
// Todo está en el teléfono: alimentos.json (platos y alimentos) y productos.json (envasados).
let base = [];
let productos = [];
const porCodigo = new Map();
const indexar = (a) => ' ' + norm(a.n + ' ' + (a.en || '') + ' ' + (a.marca || '')).replace(/[^a-z0-9ñ]+/g, ' ');
const cargaBase = fetch('alimentos.json').then((r) => r.json()).then((d) => {
  base = d.alimentos;
  base.forEach((a) => { a.t = indexar(a); });
}).catch(() => avisar('No se pudo cargar la base de alimentos'));
const cargaProductos = fetch('productos.json').then((r) => r.json()).then((d) => {
  // Cada producto viene compacto: [código, nombre, marca, k, p, c, g, porciones, país, escaneos]
  productos = d.productos.map(([code, n, marca, k, p, c, g, por, pais, esc]) => ({
    id: 'off' + code, codigo: code, n: n + (marca ? ' — ' + marca : ''), marca, en: '', k, p, c, g,
    por, pais, esc, env: 1, f: 'Open Food Facts · código ' + code,
  }));
  productos.forEach((a) => { a.t = indexar(a); porCodigo.set(a.codigo, a); });
}).catch(() => {});

function buscarLocal(q, filtro) {
  const toks = norm(q).split(/[^a-z0-9ñ]+/).filter(Boolean);
  if (!toks.length) return [];
  const res = [];
  mios.forEach((a) => { a.t = a.t || indexar(a); });
  const fuentes = filtro === 'env' ? productos : filtro === 'ali' ? mios.concat(base) : mios.concat(base, productos);
  for (const a of fuentes) {
    if (!toks.every((tk) => a.t.includes(' ' + tk))) continue;
    const nombre = norm(a.n);
    let puntos = 0;
    if (a.mio) puntos += 300;
    if (a.tipico) puntos += 200;
    if (a.pais === 'uy') puntos += 40;
    if (favoritos.includes(a.id)) puntos += 150;
    if (a.env) puntos += Math.log2(1 + (a.esc || 0)) * 6 - 20;
    if (nombre.startsWith(toks[0])) puntos += 60;
    if (norm(a.en).startsWith(toks[0])) puntos += 20;
    if (/sin especificar/.test(nombre)) puntos += 10;
    puntos -= Math.min(nombre.length, 80) * 0.4;
    res.push({ a, puntos });
  }
  res.sort((x, y) => y.puntos - x.puntos);
  return res.slice(0, 80).map((r) => r.a);
}

/* ---------- Open Food Facts en línea: solo si un código de barras no está en la base local ---------- */
function deOFF(p) {
  const n = p.nutriments || {};
  let k = n['energy-kcal_100g'];
  if (k == null && n.energy_100g != null) k = n.energy_100g / 4.184;
  if (k == null) return null;
  const marca = Array.isArray(p.brands) ? p.brands.join(', ') : (p.brands || '');
  const por = [];
  const sq = parseFloat(p.serving_quantity);
  if (sq > 0) por.push([`1 porción (${p.serving_size || sq + ' g'})`, sq]);
  return {
    id: 'off' + p.code, n: (p.product_name || 'Producto ' + p.code) + (marca ? ' — ' + marca : ''), en: '',
    k: uno(k), p: uno(n.proteins_100g || 0), c: uno(n.carbohydrates_100g || 0), g: uno(n.fat_100g || 0),
    fi: uno(n.fiber_100g || 0), az: uno(n.sugars_100g || 0), na: uno((n.sodium_100g || 0) * 1000),
    por, f: 'Open Food Facts (en línea) · código ' + p.code, env: 1, codigo: p.code,
  };
}
const CAMPOS_OFF = 'code,product_name,brands,nutriments,serving_size,serving_quantity';
async function productoEnLinea(codigo) {
  const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(codigo)}.json?fields=${CAMPOS_OFF}`);
  const d = await r.json();
  return d.status === 1 ? deOFF(d.product) : null;
}

/* ---------- vista Diario ---------- */
function entradasDe(k) { return diario[k] || []; }
function totales(lista) {
  return lista.reduce((t, e) => ({ k: t.k + e.k, p: t.p + e.p, c: t.c + e.c, g: t.g + e.g }), { k: 0, p: 0, c: 0, g: 0 });
}
function pintarHoy() {
  $('#fechaTexto').textContent = textoFecha(fecha);
  const lista = entradasDe(claveFecha(fecha));
  const t = totales(lista);
  const resto = ajustes.kcal - t.k;
  $('#kcalRestantes').textContent = Math.abs(redondo(resto));
  $('#kcalEtiqueta').textContent = resto >= 0 ? 'restantes' : 'de más';
  $('#kcalObjetivo').textContent = redondo(ajustes.kcal);
  $('#kcalComido').textContent = redondo(t.k);
  const frac = Math.min(t.k / (ajustes.kcal || 1), 1);
  $('#anilloValor').style.strokeDashoffset = 326.7 * (1 - frac);
  $('#anillo').classList.toggle('pasado', resto < 0);
  $('#macros').innerHTML = [['Proteína', t.p, ajustes.p, 'var(--prot)'], ['Carbos', t.c, ajustes.c, 'var(--carb)'], ['Grasa', t.g, ajustes.g, 'var(--grasa)']]
    .map(([n, v, obj, col]) => `<div class="macro">${n}<b>${redondo(v)} / ${redondo(obj)} g</b><div class="barrita"><i style="width:${Math.min(100, v / (obj || 1) * 100)}%;background:${col}"></i></div></div>`).join('');

  $('#comidas').innerHTML = COMIDAS.map((c) => {
    const items = lista.map((e, i) => ({ e, i })).filter(({ e }) => e.comida === c);
    const sub = totales(items.map((x) => x.e));
    return `<div class="tarjeta comida"><div class="comida-cabeza"><strong>${c}</strong><span><b>${redondo(sub.k)} kcal</b><button data-agregar="${c}">+ Agregar</button></span></div>` +
      items.map(({ e, i }) => `<button class="item" data-entrada="${i}"><span class="nombre">${esc(e.n)}<small>${esc(textoCantidad(e))}</small></span><span class="kcal">${redondo(e.k)}</span></button>`).join('') + '</div>';
  }).join('') + (lista.length ? '' : `<button class="boton secundario" id="copiarAyer">Copiar lo del día anterior</button>`);
  pintarGasto();
}
function textoCantidad(e) {
  return e.porNombre === 'g' ? `${uno(e.cant)} g` : `${uno(e.cant)} × ${e.porNombre} · ${redondo(e.gramos)} g`;
}

$('#comidas').addEventListener('click', (ev) => {
  const ag = ev.target.closest('[data-agregar]');
  if (ag) return abrirBuscar(ag.dataset.agregar);
  const it = ev.target.closest('[data-entrada]');
  if (it) {
    const e = entradasDe(claveFecha(fecha))[+it.dataset.entrada];
    abrirDetalle(e.ali, { indice: +it.dataset.entrada, entrada: e });
  }
  if (ev.target.id === 'copiarAyer') {
    const ant = entradasDe(claveFecha(new Date(fecha.getTime() - 864e5)));
    if (!ant.length) return avisar('El día anterior está vacío');
    diario[claveFecha(fecha)] = ant.map((e) => ({ ...e }));
    guardado.escribir('diario', diario); pintarHoy(); avisar('Copiado');
  }
});
$('#diaAnterior').onclick = () => { fecha = new Date(fecha.getTime() - 864e5); pintarHoy(); };
$('#diaSiguiente').onclick = () => { fecha = new Date(fecha.getTime() + 864e5); pintarHoy(); };
$('#fechaTexto').onclick = () => { fecha = new Date(); pintarHoy(); };

/* ---------- sub-pestañas y hojas ---------- */
let vista = 'coDiario';
const elegirVista = subnav('#comidaSubnav', (v) => {
  vista = v;
  $('#comida .barra').style.display = v === 'coDiario' ? '' : 'none';
  if (v === 'coDiario') pintarHoy();
  if (v === 'coHistorial') pintarHistorial();
  if (v === 'coAjustes') pintarAjustes();
});
alCerrarHoja['#hojaEscaner'] = () => pararEscaner();

/* ---------- hoja Buscar ---------- */
let fuente = 'todo';
$('#comidaElegida').innerHTML = COMIDAS.map((c) => `<option>${c}</option>`).join('');
// Lo que se agregó desde que se abrió la búsqueda (para ver el avance sin salir de la comida).
let agregadosAhora = [];
function pintarAgregados() {
  const caja = $('#agregadosAhora');
  if (!agregadosAhora.length) { caja.hidden = true; return; }
  const total = agregadosAhora.reduce((t, e) => t + e.k, 0);
  caja.hidden = false;
  caja.innerHTML = `<div class="agregados-cabeza"><span>Agregado a ${esc($('#comidaElegida').value)}: <b>${redondo(total)} kcal</b></span>` +
    `<button class="chip activa" id="listo">Listo</button></div>` +
    agregadosAhora.map((e) => `<div class="agregado"><span>${esc(e.n)} · ${esc(textoCantidad(e))}</span><b>${redondo(e.k)}</b></div>`).join('');
  $('#listo').onclick = () => { while (pilaHojas.length) cerrarHoja(); };
}
function abrirBuscar(comida) {
  agregadosAhora = [];
  pintarAgregados();
  $('#comidaElegida').value = comida;
  $('#busqueda').value = '';
  abrirHoja('#hojaBuscar');
  pintarResultados();
  setTimeout(() => $('#busqueda').focus(), 50);
}
$$('#filtrosFuente .chip').forEach((b) => b.addEventListener('click', () => {
  fuente = b.dataset.fuente;
  $$('#filtrosFuente .chip').forEach((x) => x.classList.toggle('activa', x === b));
  pintarResultados();
}));
let esperaBusqueda;
$('#busqueda').addEventListener('input', () => {
  clearTimeout(esperaBusqueda);
  esperaBusqueda = setTimeout(pintarResultados, 120);
});
$('#busqueda').addEventListener('keydown', (e) => { if (e.key === 'Enter') { clearTimeout(esperaBusqueda); pintarResultados(); e.target.blur(); } });

let resultadosActuales = [];
function filaAlimento(a, i) {
  const etiquetas = [];
  if (a.mio) etiquetas.push('mío');
  if (a.pais === 'uy') etiquetas.push('UY');
  if (a.tipico && a.pais === 'ar') etiquetas.push('AR');
  if (a.env) etiquetas.push('envasado');
  if (/aproximado/.test(a.f)) etiquetas.push('aprox.');
  const marca = etiquetas.map((e) => `<span class="etiqueta">${e}</span>`).join('');
  const aprox = '';
  const sub = a.en ? a.en : (a.por[0] ? `${a.por[0][0]} = ${redondo(valoresPara(a, a.por[0][1]).k)} kcal` : '');
  return `<button class="item" data-res="${i}"><span class="nombre">${esc(a.n)}${marca}${aprox}<small>${esc(sub)}</small></span><span class="kcal">${redondo(a.k)}<small class="nota"> /100g</small></span></button>`;
}
async function pintarResultados() {
  const q = $('#busqueda').value.trim();
  const caja = $('#resultados');
  if (!q) {
    const favs = favoritos.map((id) => recientes.find((a) => a.id === id) || mios.find((a) => a.id === id) || base.find((a) => a.id === id)).filter(Boolean);
    const rec = recientes.filter((a) => !favoritos.includes(a.id)).slice(0, 25);
    resultadosActuales = favs.concat(rec);
    caja.innerHTML = (favs.length ? '<h4>Favoritos</h4>' + favs.map(filaAlimento).join('') : '') +
      (rec.length ? '<h4>Recientes</h4>' + rec.map((a, i) => filaAlimento(a, i + favs.length)).join('') : '') ||
      '<p class="nota" style="padding:12px">Escribí para buscar. Los alimentos que uses van a aparecer acá.</p>';
    return;
  }
  await cargaBase;
  if (fuente !== 'ali') await cargaProductos;
  resultadosActuales = buscarLocal(q, fuente);
  caja.innerHTML = resultadosActuales.length ? resultadosActuales.map(filaAlimento).join('') :
    '<p class="nota" style="padding:12px">Sin resultados. Probá con otra palabra o creá el alimento en Comida → Objetivo y alimentos.</p>';
}
$('#resultados').addEventListener('click', (ev) => {
  const it = ev.target.closest('[data-res]');
  if (it) abrirDetalle(resultadosActuales[+it.dataset.res]);
});

/* ---------- hoja Detalle ---------- */
let detalle = null; // { ali, edicion }
function abrirDetalle(ali, edicion = null) {
  detalle = { ali, edicion };
  $('#detNombre').textContent = ali.n;
  $('#detFuente').textContent = (ali.en ? ali.en + ' · ' : '') + (ali.f || '');
  const opciones = ali.por.map((p, i) => `<option value="${i}">${esc(p[0])} (${uno(p[1])} g)</option>`);
  opciones.push('<option value="g">gramos</option>');
  $('#detPorcion').innerHTML = opciones.join('');
  if (edicion) {
    const e = edicion.entrada;
    const idx = ali.por.findIndex((p) => p[0] === e.porNombre);
    $('#detPorcion').value = idx >= 0 ? idx : 'g';
    $('#detCantidad').value = e.porNombre === 'g' || idx < 0 ? uno(e.gramos) : e.cant;
    $('#comidaElegida').value = e.comida;
  } else {
    $('#detPorcion').value = ali.por.length ? 0 : 'g';
    $('#detCantidad').value = ali.por.length ? 1 : 100;
  }
  $('#detAgregar').textContent = edicion ? 'Guardar cambios' : `Agregar a ${$('#comidaElegida').value}`;
  $('#detBorrar').hidden = !edicion;
  $('#favorito').textContent = favoritos.includes(ali.id) ? '★' : '☆';
  pintarDetalle();
  abrirHoja('#hojaDetalle');
}
function gramosDetalle() {
  const cant = parseFloat(String($('#detCantidad').value).replace(',', '.')) || 0;
  const sel = $('#detPorcion').value;
  return sel === 'g' ? { cant, gramos: cant, porNombre: 'g' } : { cant, gramos: cant * detalle.ali.por[+sel][1], porNombre: detalle.ali.por[+sel][0] };
}
function pintarDetalle() {
  const { gramos } = gramosDetalle();
  const v = valoresPara(detalle.ali, gramos);
  $('#detResultado').innerHTML = `<div class="grande">${redondo(v.k)} kcal</div><div class="nota">${redondo(gramos)} g</div>
    <div class="macros" style="margin-top:8px">
      <div class="macro">Proteína<b>${uno(v.p)} g</b></div><div class="macro">Carbos<b>${uno(v.c)} g</b></div><div class="macro">Grasa<b>${uno(v.g)} g</b></div>
    </div>`;
}
$('#detCantidad').addEventListener('input', pintarDetalle);
$('#detPorcion').addEventListener('change', () => {
  if ($('#detPorcion').value === 'g' && parseFloat($('#detCantidad').value) < 10) $('#detCantidad').value = 100;
  else if ($('#detPorcion').value !== 'g' && parseFloat($('#detCantidad').value) >= 10) $('#detCantidad').value = 1;
  pintarDetalle();
});
$('#detAgregar').onclick = () => {
  const { cant, gramos, porNombre } = gramosDetalle();
  if (!(gramos > 0)) return avisar('Poné una cantidad');
  const ali = detalle.ali;
  const v = valoresPara(ali, gramos);
  const entrada = { n: ali.n, cant, gramos, porNombre, comida: $('#comidaElegida').value, ...v, ali };
  const k = claveFecha(fecha);
  diario[k] = diario[k] || [];
  if (detalle.edicion) diario[k][detalle.edicion.indice] = entrada; else diario[k].push(entrada);
  guardado.escribir('diario', diario);
  recientes = [ali].concat(recientes.filter((a) => a.id !== ali.id)).slice(0, 60);
  guardado.escribir('recientes', recientes);
  pintarHoy();
  avisar(`${redondo(v.k)} kcal en ${entrada.comida}`);
  if (!detalle.edicion && pilaHojas.includes('#hojaBuscar')) {
    // Se queda en la misma comida para seguir agregando: vuelve a la búsqueda vacía.
    while (pilaHojas[pilaHojas.length - 1] !== '#hojaBuscar') cerrarHoja();
    agregadosAhora.push(entrada);
    pintarAgregados();
    $('#busqueda').value = '';
    pintarResultados();
    setTimeout(() => $('#busqueda').focus(), 50);
  } else {
    while (pilaHojas.length) cerrarHoja();
  }
};
$('#detBorrar').onclick = () => {
  const k = claveFecha(fecha);
  diario[k].splice(detalle.edicion.indice, 1);
  guardado.escribir('diario', diario);
  cerrarHoja(); pintarHoy(); avisar('Borrado');
};
$('#favorito').onclick = () => {
  const id = detalle.ali.id;
  if (favoritos.includes(id)) favoritos = favoritos.filter((x) => x !== id);
  else {
    favoritos.unshift(id);
    if (!recientes.some((a) => a.id === id)) { recientes.push(detalle.ali); guardado.escribir('recientes', recientes); }
  }
  guardado.escribir('favoritos', favoritos);
  $('#favorito').textContent = favoritos.includes(id) ? '★' : '☆';
};

/* ---------- escáner de código de barras ---------- */
let lector = null;
function cargarScript(src) {
  return new Promise((ok, mal) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = mal; document.head.appendChild(s); });
}
$('#escanear').onclick = async () => {
  abrirHoja('#hojaEscaner');
  $('#codigoManual').value = '';
  $('#escanerEstado').textContent = 'Abriendo la cámara…';
  try {
    if (!window.Html5Qrcode) await cargarScript('vendor/html5-qrcode.min.js');
    const F = window.Html5QrcodeSupportedFormats;
    lector = new window.Html5Qrcode('lector', { formatsToSupport: [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.CODE_128], verbose: false });
    await lector.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 260, height: 130 } }, (codigo) => { pararEscaner(); buscarPorCodigo(codigo); });
    $('#escanerEstado').textContent = 'Apuntá al código de barras del envase.';
  } catch (e) {
    lector = null;
    $('#escanerEstado').textContent = 'No se pudo usar la cámara (' + (e.message || e) + '). Escribí el código a mano.';
  }
};
function pararEscaner() {
  // stop() lanza un error si la cámara nunca arrancó (sin permiso o sin cámara): se ignora.
  if (lector) {
    const l = lector; lector = null;
    try { Promise.resolve(l.stop()).then(() => l.clear()).catch(() => {}); } catch (e) { /* no estaba corriendo */ }
  }
}
$('#buscarCodigo').onclick = () => { const c = $('#codigoManual').value.trim(); if (c) buscarPorCodigo(c); };
async function buscarPorCodigo(codigo) {
  $('#escanerEstado').textContent = `Buscando ${codigo}…`;
  // 1) base local; 2) solo si no está, Open Food Facts en línea (producto nuevo o importado).
  await cargaProductos;
  const local = mios.find((a) => a.codigo === codigo) || porCodigo.get(codigo) || recientes.find((a) => a.codigo === codigo);
  if (local) { cerrarHoja(); abrirDetalle(local); return; }
  $('#escanerEstado').textContent = `${codigo} no está en la base del teléfono. Consultando Open Food Facts en línea…`;
  try {
    const p = await productoEnLinea(codigo);
    if (!p) { $('#escanerEstado').textContent = `El código ${codigo} no está en Open Food Facts. Crealo en Comida → Objetivo y alimentos.`; return; }
    cerrarHoja();
    abrirDetalle(p);
  } catch (e) {
    $('#escanerEstado').textContent = `El código ${codigo} no está en la base del teléfono y no hay conexión. Crealo en Comida → Objetivo y alimentos.`;
  }
}

/* ---------- foto del plato (Claude, a través del intermediario) ---------- */
// Claude identifica los alimentos y reparte el peso; las calorías salen de la base local.
let confFoto = guardado.leer('foto', { url: '', clave: '', modelo: 'opus' });
let fotoDatos = null;   // JPEG achicado en base64
let fotoFilas = [];     // [{ nombre, gramos, confianza, opciones: [alimento], elegido: índice | -1 }]
$('#ajFotoUrl').value = confFoto.url; $('#ajFotoClave').value = confFoto.clave;
// Se guarda solo al escribir: no depende de tocar «Guardar».
function guardarConfFoto() {
  confFoto = { ...confFoto, url: $('#ajFotoUrl').value.trim().replace(/\/+$/, ''), clave: $('#ajFotoClave').value.trim() };
  guardado.escribir('foto', confFoto);
  $('#fotoConfigurada').textContent = confFoto.url && confFoto.clave ? '✓ Configurado' : 'Faltan datos';
}
['#ajFotoUrl', '#ajFotoClave'].forEach((s) => { $(s).addEventListener('input', guardarConfFoto); $(s).addEventListener('change', guardarConfFoto); });
$('#guardarFoto').onclick = () => { guardarConfFoto(); avisar(confFoto.url && confFoto.clave ? 'Guardado' : 'Faltan la dirección o la clave'); };
$('#fotoConfigurada').textContent = confFoto.url && confFoto.clave ? '✓ Configurado' : '';
function elegirModelo(m) {
  confFoto.modelo = m; guardado.escribir('foto', confFoto);
  $$('#fotoModelos .chip').forEach((x) => x.classList.toggle('activa', x.dataset.modelo === m));
}
$$('#fotoModelos .chip').forEach((b) => b.addEventListener('click', () => elegirModelo(b.dataset.modelo)));
$('#abrirFoto').onclick = () => {
  if (!confFoto.url || !confFoto.clave) guardarConfFoto(); // por si se escribió y no se guardó
  if (!confFoto.url || !confFoto.clave) { avisar('Primero cargá la dirección y la clave en Comida → Objetivo y alimentos'); return; }
  fotoDatos = null; $('#fotoVista').hidden = true; $('#fotoGramos').value = ''; $('#fotoNota').value = '';
  $('#fotoEstado').textContent = ''; $('#fotoPaso1').hidden = false; $('#fotoPaso2').hidden = true;
  elegirModelo(confFoto.modelo || 'opus');
  abrirHoja('#hojaFoto');
};
// Achica la foto a 1024 px de lado: alcanza para reconocer y viaja en ~150 KB.
async function achicarFoto(archivo) {
  const url = URL.createObjectURL(archivo);
  try {
    const img = await new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = url; });
    const escala = Math.min(1, 1024 / Math.max(img.naturalWidth, img.naturalHeight));
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.round(img.naturalWidth * escala); lienzo.height = Math.round(img.naturalHeight * escala);
    lienzo.getContext('2d').drawImage(img, 0, 0, lienzo.width, lienzo.height);
    return lienzo.toDataURL('image/jpeg', 0.82);
  } finally { URL.revokeObjectURL(url); }
}
// Dos entradas: «Sacar foto» abre la cámara (capture) y «Galería» deja elegir una foto guardada.
$$('.foto-entrada').forEach((entrada) => { entrada.onchange = elegirFoto; });
async function elegirFoto(ev) {
  const f = ev.target.files[0]; if (!f) return;
  try {
    fotoDatos = await achicarFoto(f);
    $('#fotoVista').src = fotoDatos; $('#fotoVista').hidden = false;
    setTimeout(() => $('#fotoGramos').focus(), 50);
  } catch (e) { avisar('No se pudo leer la foto'); }
  ev.target.value = '';
};
$('#fotoAnalizar').onclick = async () => {
  const gramos = num('#fotoGramos');
  if (!fotoDatos) return avisar('Falta la foto');
  if (!(gramos > 0)) return avisar('Falta el peso');
  const boton = $('#fotoAnalizar');
  boton.disabled = true; boton.textContent = 'Analizando…';
  $('#fotoEstado').textContent = `Consultando a ${confFoto.modelo === 'sonnet' ? 'Sonnet 5.5' : 'Opus 5.5'}. Tarda unos segundos.`;
  try {
    const r = await fetch(confFoto.url + '/analizar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + confFoto.clave },
      body: JSON.stringify({ imagen: fotoDatos.split(',')[1], gramos, modelo: confFoto.modelo, nota: $('#fotoNota').value.trim() }),
    });
    const d = await r.json().catch(() => ({ error: 'Respuesta inválida (' + r.status + ')' }));
    if (!r.ok) throw new Error(d.error || 'Error ' + r.status);
    await cargaBase; await cargaProductos;
    mostrarAnalisis(d);
  } catch (e) {
    $('#fotoEstado').textContent = 'No se pudo analizar: ' + e.message;
  } finally { boton.disabled = false; boton.textContent = 'Analizar'; }
};
function mostrarAnalisis(d) {
  fotoFilas = d.alimentos.map((a) => {
    let opciones = buscarLocal(a.busqueda, 'ali').slice(0, 6);
    if (!opciones.length) opciones = buscarLocal(a.nombre, 'todo').slice(0, 6);
    if (!opciones.length) opciones = buscarLocal(a.busqueda.split(/\s+/)[0], 'ali').slice(0, 6);
    return { ...a, opciones, elegido: opciones.length ? 0 : -1 };
  });
  $('#fotoPlato').textContent = d.plato;
  $('#fotoAdvertencias').textContent = d.advertencias || '';
  const costo = d.uso ? `${d.uso.entrada} + ${d.uso.salida} tokens` : '';
  $('#fotoInfo').textContent = `${d.modelo} · ${costo}. Revisá cada alimento y sus gramos antes de agregar.`;
  $('#fotoPaso1').hidden = true; $('#fotoPaso2').hidden = false;
  pintarFotoItems();
}
function pintarFotoItems() {
  $('#fotoItems').innerHTML = fotoFilas.map((f, i) => {
    const ali = f.elegido >= 0 ? f.opciones[f.elegido] : null;
    const k = ali ? redondo(valoresPara(ali, f.gramos).k) : 0;
    const opciones = f.opciones.map((o, j) => `<option value="${j}" ${j === f.elegido ? 'selected' : ''}>${esc(o.n)} (${redondo(o.k)}/100 g)</option>`).join('');
    return `<div class="foto-item ${ali ? '' : 'fuera'}"><b>${esc(f.nombre)}</b> <span class="etiqueta">${esc(f.confianza)}</span>
      <div class="fila"><select data-foto-ali="${i}">${opciones}<option value="-1" ${f.elegido < 0 ? 'selected' : ''}>— no agregar —</option></select></div>
      <div class="fila"><input type="number" inputmode="decimal" data-foto-g="${i}" value="${f.gramos}"><span class="nota">g</span><span class="kcal" style="flex:1">${k} kcal</span></div></div>`;
  }).join('');
  const total = fotoFilas.reduce((t, f) => t + (f.elegido >= 0 ? valoresPara(f.opciones[f.elegido], f.gramos).k : 0), 0);
  $('#fotoTotal').textContent = `${redondo(total)} kcal`;
  $('#fotoAgregar').textContent = `Agregar a ${$('#comidaElegida').value}`;
}
$('#fotoItems').addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.fotoAli) fotoFilas[+t.dataset.fotoAli].elegido = +t.value;
  if (t.dataset.fotoG) fotoFilas[+t.dataset.fotoG].gramos = parseFloat(String(t.value).replace(',', '.')) || 0;
  pintarFotoItems();
});
$('#fotoOtra').onclick = () => { $('#fotoPaso1').hidden = false; $('#fotoPaso2').hidden = true; $('#fotoEstado').textContent = ''; };
$('#fotoAgregar').onclick = () => {
  const comida = $('#comidaElegida').value;
  const k = claveFecha(fecha);
  diario[k] = diario[k] || [];
  let n = 0;
  for (const f of fotoFilas) {
    if (f.elegido < 0 || !(f.gramos > 0)) continue;
    const ali = f.opciones[f.elegido];
    const entrada = { n: ali.n, cant: f.gramos, gramos: f.gramos, porNombre: 'g', comida, ...valoresPara(ali, f.gramos), ali };
    diario[k].push(entrada); agregadosAhora.push(entrada); n++;
    recientes = [ali].concat(recientes.filter((a) => a.id !== ali.id)).slice(0, 60);
  }
  if (!n) return avisar('No hay alimentos para agregar');
  guardado.escribir('diario', diario); guardado.escribir('recientes', recientes);
  cerrarHoja(); pintarAgregados(); pintarHoy();
  avisar(`${n} alimento(s) agregados a ${comida}`);
};

/* ---------- historial y peso ---------- */
function pintarHistorial() {
  const dias = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(Date.now() - i * 864e5);
    const l = entradasDe(claveFecha(d));
    dias.push({ d, t: totales(l), n: l.length });
  }
  const con = dias.slice(0, 7).filter((x) => x.n);
  const prom = con.length ? totales(con.map((x) => x.t)) : null;
  $('#promedio').innerHTML = prom ? `<div class="grande" style="font-size:26px;font-weight:700">${redondo(prom.k / con.length)} kcal/día</div>
    <p class="nota">Promedio de ${con.length} día(s) con registro. Proteína ${redondo(prom.p / con.length)} g · Carbos ${redondo(prom.c / con.length)} g · Grasa ${redondo(prom.g / con.length)} g</p>` :
    '<p class="nota">Todavía no hay registros esta semana.</p>';
  const max = Math.max(ajustes.kcal * 1.3, ...dias.map((x) => x.t.k));
  $('#listaDias').innerHTML = dias.filter((x) => x.n).map((x) => `<div class="dia"><span>${textoFecha(x.d)}</span>
    <div class="barra-dia"><i class="${x.t.k > ajustes.kcal ? 'pasado' : ''}" style="width:${x.t.k / max * 100}%"></i></div><b>${redondo(x.t.k)}</b></div>`).join('') ||
    '<p class="nota">Sin días registrados.</p>';
}

/* ---------- ajustes ---------- */
function pintarAjustes() {
  $('#ajKcal').value = ajustes.kcal; $('#ajP').value = ajustes.p; $('#ajC').value = ajustes.c; $('#ajG').value = ajustes.g;
  const pf = ajustes.perfil || {};
  if (pf.sexo) { $('#calSexo').value = pf.sexo; $('#calEdad').value = pf.edad; $('#calPeso').value = pf.peso; $('#calAltura').value = pf.altura; $('#calAct').value = pf.act; $('#calMeta').value = pf.meta; }
  // El último peso anotado en Medir sirve para recalcular el objetivo.
  const ultimoPeso = window.Medir && window.Medir.ultimo('peso');
  if (ultimoPeso) $('#calPeso').value = ultimoPeso.valor;
  $('#listaMios').innerHTML = mios.map((a, i) => `<button class="item" data-mio="${i}"><span class="nombre">${esc(a.n)}</span><span class="kcal">${redondo(a.k)}<small class="nota"> /100g</small></span></button>`).join('') ||
    '<p class="nota">Acá aparecen los alimentos que cargues a mano.</p>';
}
$('#guardarAjustes').onclick = () => {
  ajustes = { ...ajustes, kcal: +$('#ajKcal').value || 2000, p: +$('#ajP').value || 0, c: +$('#ajC').value || 0, g: +$('#ajG').value || 0 };
  guardado.escribir('ajustes', ajustes); pintarHoy(); avisar('Objetivo guardado');
};
$('#calcular').onclick = () => {
  const sexo = $('#calSexo').value, edad = +$('#calEdad').value, peso = +$('#calPeso').value, altura = +$('#calAltura').value;
  const act = +$('#calAct').value, meta = +$('#calMeta').value;
  if (!edad || !peso || !altura) return avisar('Completá edad, peso y altura');
  const tmb = 10 * peso + 6.25 * altura - 5 * edad + (sexo === 'h' ? 5 : -161);
  const kcal = Math.round((tmb * act + meta) / 10) * 10;
  const p = Math.round(peso * 1.8), g = Math.round(kcal * 0.28 / 9), c = Math.max(0, Math.round((kcal - p * 4 - g * 9) / 4));
  ajustes = { kcal, p, c, g, perfil: { sexo, edad, peso, altura, act, meta } };
  guardado.escribir('ajustes', ajustes);
  $('#calResultado').textContent = `Metabolismo basal ≈ ${Math.round(tmb)} kcal · gasto diario ≈ ${Math.round(tmb * act)} kcal · objetivo ${kcal} kcal (proteína 1,8 g/kg).`;
  pintarAjustes(); pintarHoy();
};

/* ---------- mis alimentos ---------- */
let mioEditando = -1;
function abrirMio(i = -1) {
  mioEditando = i;
  const a = i >= 0 ? mios[i] : { n: '', k: '', p: '', c: '', g: '', por: [] };
  $('#mioNombre').value = a.n; $('#mioK').value = a.k; $('#mioP').value = a.p; $('#mioC').value = a.c; $('#mioG').value = a.g;
  $('#mioPorNombre').value = a.por[0] ? a.por[0][0] : ''; $('#mioPorG').value = a.por[0] ? a.por[0][1] : '';
  $('#mioBorrar').hidden = i < 0;
  abrirHoja('#hojaMio');
}
$('#nuevoMio').onclick = () => abrirMio();
$('#listaMios').addEventListener('click', (ev) => { const b = ev.target.closest('[data-mio]'); if (b) abrirMio(+b.dataset.mio); });
const num = (sel) => parseFloat(String($(sel).value).replace(',', '.')) || 0;
$('#mioGuardar').onclick = () => {
  const n = $('#mioNombre').value.trim();
  if (!n || !$('#mioK').value) return avisar('Poné al menos nombre y kcal');
  const por = num('#mioPorG') > 0 ? [[$('#mioPorNombre').value.trim() || '1 porción', num('#mioPorG')]] : [];
  const a = { id: mioEditando >= 0 ? mios[mioEditando].id : 'mio' + Date.now(), n, en: '', k: num('#mioK'), p: num('#mioP'), c: num('#mioC'), g: num('#mioG'), fi: 0, az: 0, na: 0, por, f: 'Cargado por mí', mio: 1 };
  if (mioEditando >= 0) mios[mioEditando] = a; else mios.unshift(a);
  guardado.escribir('mios', mios); cerrarHoja(); pintarAjustes(); avisar('Guardado');
};
$('#mioBorrar').onclick = () => { mios.splice(mioEditando, 1); guardado.escribir('mios', mios); cerrarHoja(); pintarAjustes(); };

/* ---------- gasto del día y balance ---------- */
// El basal sale de dos fuentes y se usa el promedio: el «reposo» que muestra Zepp (banda Helio Strap)
// y la fórmula de Mifflin-St Jeor con el perfil de «Calcular mi objetivo» y el último peso de Medir.
function pesoAl(k) {
  const l = window.Medir ? window.Medir.de('peso').filter((r) => r.fecha <= k) : [];
  if (l.length) return { kg: l[l.length - 1].valor, de: 'Medir' };
  const pf = ajustes.perfil || {};
  return pf.peso ? { kg: +pf.peso, de: 'perfil' } : null;
}
function basalFormula(k) {
  const pf = ajustes.perfil || {};
  const peso = pesoAl(k);
  if (!pf.sexo || !pf.edad || !pf.altura || !peso) return null;
  return { kcal: Math.round(10 * peso.kg + 6.25 * pf.altura - 5 * pf.edad + (pf.sexo === 'h' ? 5 : -161)), peso };
}
// Todos los números del día: los dos basales, el usado, la actividad, el gasto, lo comido y el balance.
function balanceDe(k) {
  const g = gastos[k];
  if (!g) return null;
  const f = basalFormula(k);
  const basal = g.reposo > 0 && f ? Math.round((g.reposo + f.kcal) / 2) : g.reposo > 0 ? g.reposo : f ? f.kcal : 0;
  const gasto = basal + (g.actividad || 0);
  const comido = totales(entradasDe(k)).k;
  return { ...g, formula: f, basal, gasto, comido, balance: comido - gasto };
}
function pintarGasto() {
  const k = claveFecha(fecha);
  const b = balanceDe(k);
  const caja = $('#gastoDia');
  if (!b) {
    caja.innerHTML = `<div class="gasto-cabeza"><h2>Gasto y balance</h2></div>
      <p class="nota">Cargá la captura de calorías de Zepp para ver cuánto gastaste y el balance del día.</p>
      <button class="boton secundario" id="abrirGasto">Cargar el gasto del día</button>`;
    return;
  }
  const n = (x) => fmt(x, 0);
  const f = b.formula;
  const fila = (nombre, valor, detalle = '', cls = '') => `<div class="gasto-fila ${cls}"><span>${nombre}${detalle ? `<small>${detalle}</small>` : ''}</span><b>${valor}</b></div>`;
  caja.innerHTML = `<div class="gasto-cabeza"><h2>Gasto y balance</h2><button class="chip" id="abrirGasto">Editar</button></div>
    ${fila('Basal de Zepp', b.reposo > 0 ? n(b.reposo) : '—', 'reposo, de la banda')}
    ${fila('Basal por fórmula', f ? n(f.kcal) : '—', f ? `Mifflin-St Jeor, ${fmt(f.peso.kg, 1)} kg (${f.peso.de})` : 'completá el perfil en Objetivo y alimentos')}
    ${fila('Basal usado', n(b.basal), b.reposo > 0 && f ? 'promedio de los dos' : 'el único que hay', 'usado')}
    ${fila('Actividad', n(b.actividad || 0), 'de la banda')}
    ${fila('Gasto del día', n(b.gasto), '', 'total')}
    ${fila('Comido', n(b.comido))}
    ${fila('Balance', (b.balance > 0 ? '+' : b.balance < 0 ? '−' : '') + n(Math.abs(b.balance)), b.balance < 0 ? 'déficit' : b.balance > 0 ? 'superávit' : 'justo', 'balance ' + (b.balance < 0 ? 'deficit' : 'superavit'))}
    ${b.diaCompleto === false ? '<p class="nota">La captura es de un día sin terminar: el gasto real va a ser mayor.</p>' : ''}`;
}
$('#gastoDia').addEventListener('click', (e) => { if (e.target.id === 'abrirGasto') abrirGasto(claveFecha(fecha)); });

let gastoFoto = null, gastoArchivo = null;
function abrirGasto(k) {
  gastoFoto = null; gastoArchivo = null;
  const g = gastos[k] || {};
  $('#gaVista').hidden = true; $('#gaLeer').hidden = true; $('#gaEstado').textContent = ''; $('#gaAviso').textContent = '';
  $('#gaFecha').value = k;
  $('#gaReposo').value = g.reposo || ''; $('#gaActividad').value = g.actividad ?? '';
  $('#gaBorrar').hidden = !gastos[k];
  abrirHoja('#hojaGasto');
}
$('#gaArchivo').onchange = async (ev) => {
  const f = ev.target.files[0]; if (!f) return;
  try {
    gastoArchivo = f;
    gastoFoto = await achicarFoto(f);
    $('#gaVista').src = gastoFoto; $('#gaVista').hidden = false; $('#gaLeer').hidden = false;
    $('#gaEstado').textContent = '';
    leerCaptura(); // leer en el teléfono no cuesta nada: arranca solo
  } catch (e) { avisar('No se pudo leer la imagen'); }
  ev.target.value = '';
};

/* Lectura sin IA: Tesseract.js lee el texto de la captura dentro del teléfono (gratis, sin servidor).
   La primera vez baja el lector (unos MB) y después queda guardado. Claude queda de respaldo. */
const TESSERACT = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
let lectorOcr = null;
function cargarOcr() {
  if (!lectorOcr) {
    lectorOcr = new Promise((ok, mal) => {
      if (window.Tesseract) return ok();
      const sc = document.createElement('script');
      sc.src = TESSERACT; sc.onload = ok; sc.onerror = () => mal(new Error('no se pudo bajar el lector de texto'));
      document.head.appendChild(sc);
    }).then(() => window.Tesseract.createWorker('eng'));
    lectorOcr.catch(() => { lectorOcr = null; });
  }
  return lectorOcr;
}
// Gris y, si la captura es oscura (Zepp en modo oscuro), invertida: el OCR lee mejor letra oscura sobre fondo claro.
async function prepararParaOcr(archivo) {
  const url = URL.createObjectURL(archivo);
  try {
    const img = await new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = url; });
    const escala = Math.min(1, 1600 / img.naturalWidth);
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * escala); c.height = Math.round(img.naturalHeight * escala);
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const datos = ctx.getImageData(0, 0, c.width, c.height), px = datos.data;
    let suma = 0;
    for (let i = 0; i < px.length; i += 4) { const g = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]; px[i] = px[i + 1] = px[i + 2] = g; suma += g; }
    if (suma / (px.length / 4) < 128) for (let i = 0; i < px.length; i += 4) px[i] = px[i + 1] = px[i + 2] = 255 - px[i];
    ctx.putImageData(datos, 0, 0);
    return c;
  } finally { URL.revokeObjectURL(url); }
}
// Saca del texto de la pantalla Calorías de Zepp: actividad, reposo y la fecha («Nov 26»).
const MESES = { jan: 1, ene: 1, feb: 2, mar: 3, apr: 4, abr: 4, may: 5, jun: 6, jul: 7, aug: 8, ago: 8, sep: 9, set: 9, oct: 10, nov: 11, dec: 12, dic: 12 };
function interpretarZepp(texto) {
  const t = texto.replace(/\s+/g, ' ');
  const numero = (etiqueta, min, max) => {
    const m = t.match(new RegExp('(?:' + etiqueta + ')[^0-9]{0,40}?(\\d{1,3}(?:[.,]\\d{3})+|\\d+)', 'i'));
    if (!m) return null;
    const v = +m[1].replace(/[.,]/g, '');
    return v >= min && v <= max ? v : null;
  };
  const actividad = numero('activ\\w*\\s*consum\\w*|consumo\\s+(?:de\\s+)?activ\\w*', 0, 6000);
  const reposo = numero('rest\\w*\\s*consum\\w*|consumo\\s+(?:en\\s+|de\\s+)?(?:reposo|descanso)', 400, 5000);
  let fecha = null;
  const m1 = t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})\b/i);
  const m2 = t.match(/\b(\d{1,2})\s+(?:de\s+)?(ene|feb|mar|abr|may|jun|jul|ago|sep|set|oct|nov|dic)[a-z]*\b/i);
  const mes = m1 ? MESES[m1[1].toLowerCase()] : m2 ? MESES[m2[2].toLowerCase()] : null;
  const dia = m1 ? +m1[2] : m2 ? +m2[1] : null;
  if (mes && dia >= 1 && dia <= 31) {
    const hoy = new Date();
    let d = new Date(hoy.getFullYear(), mes - 1, dia);
    if (d > hoy) d = new Date(hoy.getFullYear() - 1, mes - 1, dia); // una captura de diciembre leída en enero
    fecha = claveFecha(d);
  }
  return { actividad, reposo, fecha };
}
async function leerConOcr(archivo) {
  const lector = await cargarOcr();
  const { data } = await lector.recognize(await prepararParaOcr(archivo));
  return interpretarZepp(data.text);
}
function ponerFecha(k, diaCompleto) {
  $('#gaFecha').value = k;
  $('#gaFecha').dataset.diaCompleto = String(diaCompleto);
  $('#gaAviso').textContent = diaCompleto ? '' : 'Es la captura de hoy: el día no terminó.';
}

async function leerCaptura() {
  if (!gastoArchivo) return;
  const boton = $('#gaLeer'), estado = $('#gaEstado');
  boton.disabled = true; boton.textContent = 'Leyendo…';
  estado.textContent = lectorOcr ? 'Leyendo la captura en el teléfono…' : 'Leyendo la captura en el teléfono. La primera vez baja el lector de texto y tarda un poco más.';
  let ocr = null, falla = '';
  try { ocr = await leerConOcr(gastoArchivo); } catch (e) { falla = e.message; }
  if (ocr) {
    if (ocr.reposo != null) $('#gaReposo').value = ocr.reposo;
    if (ocr.actividad != null) $('#gaActividad').value = ocr.actividad;
    if (ocr.fecha) ponerFecha(ocr.fecha, ocr.fecha < claveFecha(new Date()));
  }
  if (ocr && ocr.reposo != null && ocr.actividad != null) {
    estado.textContent = `Leído en el teléfono, sin IA.${ocr.fecha ? '' : ' No encontré la fecha: revisala.'} Revisá los números antes de guardar.`;
    boton.disabled = false; boton.textContent = 'Leer de nuevo';
    return;
  }
  // Respaldo: Claude, solo si el lector no encontró los dos números.
  if (!confFoto.url || !confFoto.clave) guardarConfFoto();
  if (!confFoto.url || !confFoto.clave) {
    estado.textContent = `No encontré ${ocr && ocr.reposo == null ? 'el reposo' : 'todos los números'} en la captura${falla ? ' (' + falla + ')' : ''}. Escribilos a mano.`;
    boton.disabled = false; boton.textContent = 'Leer de nuevo';
    return;
  }
  estado.textContent = 'No encontré todos los números. Claude está leyendo la captura. Tarda unos segundos.';
  try {
    const r = await fetch(confFoto.url + '/gasto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + confFoto.clave },
      body: JSON.stringify({ imagen: gastoFoto.split(',')[1], hoy: claveFecha(new Date()), modelo: confFoto.modelo }),
    });
    const d = await r.json().catch(() => ({ error: 'Respuesta inválida (' + r.status + ')' }));
    if (!r.ok) throw new Error(d.error || 'Error ' + r.status);
    $('#gaReposo').value = d.reposo || ''; $('#gaActividad').value = d.actividad ?? '';
    ponerFecha(d.fecha, d.dia_completo);
    if (d.notas) $('#gaAviso').textContent = [$('#gaAviso').textContent, d.notas].filter(Boolean).join(' ');
    estado.textContent = 'La leyó Claude. Revisá los números y la fecha antes de guardar.';
  } catch (e) {
    estado.textContent = 'No se pudo leer: ' + e.message + '. Podés escribir los números a mano.';
  } finally { boton.disabled = false; boton.textContent = 'Leer de nuevo'; }
}
$('#gaLeer').onclick = leerCaptura;
$('#gaGuardar').onclick = () => {
  const k = $('#gaFecha').value;
  const reposo = Math.round(aNumero($('#gaReposo').value)) || 0;
  const actividad = Math.round(aNumero($('#gaActividad').value)) || 0;
  if (!k) return avisar('Poné la fecha');
  if (!(reposo > 0) && !(actividad > 0)) return avisar('Poné el reposo o la actividad');
  const dc = $('#gaFecha').dataset.diaCompleto;
  gastos[k] = { reposo, actividad, origen: gastoFoto ? 'captura' : 'mano', diaCompleto: dc ? dc === 'true' : k < claveFecha(new Date()) };
  delete $('#gaFecha').dataset.diaCompleto;
  guardado.escribir('gastos', gastos);
  cerrarHoja(); fecha = fechaDeClave(k); pintarHoy();
  avisar(`Gasto del ${textoFecha(fecha).toLowerCase()} guardado`);
};
$('#gaBorrar').onclick = () => {
  delete gastos[$('#gaFecha').value]; guardado.escribir('gastos', gastos);
  cerrarHoja(); pintarHoy(); avisar('Gasto borrado');
};

/* ---------- copia de seguridad (la arma hoy.js con las tres partes) ---------- */
function datos() { return { diario, ajustes, mios, recientes, favoritos, gastos }; }
function restaurar(d) {
  ({ diario, ajustes, mios, recientes, favoritos, gastos } = { diario: {}, ajustes, mios: [], recientes: [], favoritos: [], gastos: {}, ...d });
  Object.entries({ diario, ajustes, mios, recientes, favoritos, gastos }).forEach(([k, v]) => guardado.escribir(k, v));
  pintarHoy();
}

/* ---------- lo que usa la pantalla Hoy ---------- */
function resumenHoy() {
  const t = totales(entradasDe(claveFecha(new Date())));
  return { comido: t.k, objetivo: ajustes.kcal, resto: ajustes.kcal - t.k, p: t.p, pObj: ajustes.p, ayer: balanceDe(claveFecha(new Date(Date.now() - 864e5))) };
}
function agregar() {
  fecha = new Date();
  elegirVista('coDiario');
  abrirBuscar(comidaPorHora());
}

alEntrarSeccion.comida = () => elegirVista(vista);
pintarHoy();

return { resumenHoy, agregar, datos, restaurar, abrirAjustes: () => elegirVista('coAjustes') };
})();
