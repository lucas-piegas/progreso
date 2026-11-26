/* El plan de entrenamiento. Es la ÚNICA fuente de la app: si cambia el plan, se cambia este archivo
   (y se sube VERSION en sw.js). Origen: doc «Plan de 8 semanas – Llegar a la pretemporada 2027»
   (https://claude.ai/artifact/5q7jkrhWAbvt5j4SAnnVfg, revisión 42 del 2026-11-18).

   Convenciones:
   - pres: lo que se hace, una entrada por semana (índice 0 = semana 1). b(x, y) = x en sem 1-4, y en sem 5-8.
   - carga: clave de PLAN.cargas (kg por lado, sin la barra), una entrada por semana.
   - descanso: segundos de pausa después del ejercicio (o de la superserie).
*/
(function () {
  const b = (b1, b2) => [b1, b1, b1, b1, b2, b2, b2, b2];
  const igual = (x) => b(x, x);

  const ADUCTOR = [
    'Apretón con pelota entre las rodillas 3 x 30"',
    'Apretón con pelota entre las rodillas 3 x 30"',
    'Copenhagen corto (rodilla en el banco) 3 x 6-8 por lado',
    'Copenhagen corto (rodilla en el banco) 3 x 6-8 por lado',
    'Copenhagen corto 3 x 8 por lado',
    'Copenhagen largo (pierna estirada) 3 x 5-8 por lado',
    'Copenhagen largo (pierna estirada) 3 x 5-8 por lado',
    'Copenhagen largo (pierna estirada) 3 x 5-8 por lado',
  ];
  const ADUCTOR_EJ = ['apreton', 'apreton', 'copenhagenCorto', 'copenhagenCorto', 'copenhagenCorto', 'copenhagenLargo', 'copenhagenLargo', 'copenhagenLargo'];

  window.PLAN = {
    version: 'rev42 · 18/11/2026',
    titulo: 'Plan de 8 semanas – Llegar a la pretemporada 2027',
    inicio: '2026-11-30', // lunes de la semana 1. Las fechas de cada semana salen de acá (ver el final del archivo).
    semanas: [
      { n: 1, bloque: 'Base', tests: true },
      { n: 2, bloque: 'Base' },
      { n: 3, bloque: 'Base' },
      { n: 4, bloque: 'Descarga + tests', tests: true,
        nota: 'Semana de descarga: hacé alrededor de 40% menos de series (3 → 2). Los pesos y series de la fuerza están en la tabla de cargas.' },
      { n: 5, bloque: 'Desarrollo' },
      { n: 6, bloque: 'Desarrollo' },
      { n: 7, bloque: 'Desarrollo' },
      { n: 8, bloque: 'Afinación + tests', tests: true,
        nota: 'Menos volumen, misma intensidad: llegá fresco a la pretemporada.' },
    ],
    objetivosBloque: {
      'Base': 'Fuerza con técnica, tendones, aceleraciones submaximales, intervalos 3-4 x 4\'.',
      'Descarga + tests': '40% menos de series y retest de mitad de plan.',
      'Desarrollo': 'Fuerza pesada y contrastes, sprints a más del 90%, 15"/15", sprints repetidos.',
      'Afinación + tests': 'Menos volumen, misma intensidad; llegar fresco a la pretemporada.',
    },

    calentamientos: {
      corto: {
        titulo: 'Calentamiento corto', min: 8,
        pasos: [
          { paso: 'Trote', min: "3'", que: 'Trote suave.' },
          { paso: 'Movilidad de cadera', min: "2'", que: 'Balanceos de pierna y aperturas de cadera.', ej: 'balanceoPierna' },
          { paso: 'Skipping', min: "1'", que: 'Skipping bajo.', ej: 'askip' },
          { paso: 'Pogos', min: "1'", que: '2 x 15.', ej: 'pogos' },
        ],
      },
      explosivo: {
        titulo: 'Calentamiento explosivo', min: 12,
        intro: 'De menos a más: que el primer sprint o salto de verdad no sea el primero del día.',
        pasos: [
          { paso: '1. Subir temperatura', min: "3'",
            cancha: 'Trote suave, carrera hacia atrás y desplazamientos laterales suaves.',
            patio: 'Trote en el lugar, saltar a la cuerda suave o skipping en el lugar.' },
          { paso: '2. Movilidad dinámica', min: "3'",
            cancha: 'Balanceo de pierna adelante-atrás 10 por lado, balanceo lateral suave 8 por lado, estocada larga con giro 5 por lado, sentadilla profunda abriendo las rodillas 5.',
            ej: ['balanceoPierna', 'estocadaGiro', 'sentadillaProfunda'] },
          { paso: '3. Activación', min: "2'",
            cancha: 'Apretón con pelota 2 x 10" fuerte (hasta 3/10), puente de glúteo 10, plancha lateral 15" por lado.',
            ej: ['apreton', 'puenteGluteo', 'planchaLateral'], control: true },
          { paso: '4. Técnica y tendones', min: "2-3'",
            cancha: 'Skipping bajo (A-skip) 2 x 15 m, pogos 2 x 15, saltitos adelante-atrás 2 x 10, bounding suave 2 x 15 m.',
            patio: 'Pogos 2 x 15, saltitos adelante-atrás 2 x 10, saltitos laterales a dos piernas 2 x 10 (si el aductor está bien).',
            ej: ['askip', 'pogos', 'saltitos', 'bounding'] },
          { paso: '5. Esfuerzos crecientes', min: "2'",
            cancha: '3 progresivas de 20 m al 60%, 75% y 90%, volviendo caminando, y 1 arranque cayendo hacia adelante.',
            patio: '3 saltos verticales al 60%, 75% y 90%, y 2 series de 5 pogos rápidos.' },
        ],
        pautas: [
          'En los pogos y saltitos, el tobillo va flexionado hacia arriba en el aire; el contacto con el piso es corto y silencioso.',
          'No hagas estiramientos largos sin movimiento antes de lo explosivo. Dejalos para el final o para la noche.',
          'El apretón con pelota sirve de control: si pasa de 3/10, la sesión se vuelve suave (aceleraciones al 70% y nada de saltos intensivos).',
          'Antes de la fuerza: 2 series de aproximación del primer ejercicio, barra sola x 8 y 50% del peso del día x 5.',
        ],
      },
    },

    // Día de la semana (0 = domingo) → sesión
    sesiones: {
      1: {
        dia: 'Lunes', tipo: 'Alto', donde: 'Cancha y casa', dur: "60'", titulo: 'Velocidad + fuerza A',
        calentamiento: 'explosivo', lugar: 'cancha', controlAductor: true,
        partes: [
          { nombre: "En la cancha (25')", ejercicios: [
            { id: 'aceleraciones', pres: b('6 x 15 m al 85-90%, pausa 90" caminando', '5 x 10-15 m al 100%, pausa 2\''), test: 'sprint' },
            { id: 'sprintLanzado', pres: b('No', '3 x 20 m a más del 90%, pausa 3\''), aductorMin: 3 },
          ] },
          { nombre: "En casa (35')", ejercicios: [
            { id: 'sentadilla', etiqueta: 'A', pres: b('4 x 6-8', '4 x 4-5'), carga: 'sentadilla', descanso: 120, test: 'fuerza' },
            { id: 'pesoMuertoRumano', etiqueta: 'B1', pres: b('3 x 8', '3 x 6'), carga: 'pesoMuertoRumano' },
            { id: 'planchaLateralDisco', etiqueta: 'B2', pres: b('3 x 20" por lado, disco de 5 a 10 kg', '3 x 20" por lado, disco de 10 a 20 kg'), descanso: 90 },
            { id: 'nordicos', etiqueta: 'C1', pres: b('2 x 4-5', '3 x 5-6') },
            { id: 'aductor', etiqueta: 'C2', pres: ADUCTOR, ejPorSemana: ADUCTOR_EJ, descanso: 60 },
          ] },
        ],
        notas: ['Si se pasa de 60\', sacá una serie de los nórdicos.'],
      },
      2: {
        dia: 'Martes', tipo: 'Medio', donde: 'Cancha', dur: "45'", titulo: 'Resistencia aeróbica',
        calentamiento: 'corto',
        partes: [
          { nombre: 'En la cancha', ejercicios: [
            { id: 'intervalos4', pres: ['3 x 4\'', '4 x 4\'', '4 x 4\'', '3 x 4\'', '4 x 4\'', '4 x 4\'', '4 x 4\'', '3 x 4\''], descanso: 180 },
            { id: 'pallof', pres: igual('3 x 10 por lado (con banda)') },
            { id: 'paseoUnaMano', pres: igual('3 x 20-30 m por lado') },
          ] },
        ],
        notas: ['Sin reloj, «al 90-95%» significa que solo podés decir palabras sueltas. Intervalos en línea recta, ida y vuelta a lo largo de la cancha, con giros suaves. 3\' de trote entre intervalos.'],
      },
      3: {
        dia: 'Miércoles', tipo: 'Bajo', donde: 'Casa', dur: "45'", titulo: 'Tren superior + core + aductor',
        calentamiento: 'corto',
        partes: [
          { nombre: 'En casa', ejercicios: [
            { id: 'pressBanca', etiqueta: 'A1', pres: b('3 x 8', '4 x 5'), carga: 'pressBanca' },
            { id: 'remoBarra', etiqueta: 'A2', pres: b('3 x 8', '4 x 6'), carga: 'remoBarra', descanso: 90 },
            { id: 'dominadas', etiqueta: 'B1', pres: b('3 x máx. (dejando 1-2 en reserva)', '4 x 5 (con lastre si sobran)') },
            { id: 'pressMilitar', etiqueta: 'B2', pres: b('3 x 8', '3 x 6'), carga: 'pressMilitar', descanso: 90 },
            { id: 'aductor', etiqueta: 'C1', pres: ADUCTOR, ejPorSemana: ADUCTOR_EJ },
            { id: 'rollout', etiqueta: 'C2', pres: b('3 x 6, recorrido corto (si el pubis pasa de 3/10, achicá el recorrido)', '3 x 8, recorrido largo'), descanso: 60 },
            { id: 'movilidad', pres: igual("5'") },
          ] },
        ],
      },
      4: {
        dia: 'Jueves', tipo: 'Alto', donde: 'Patio y casa', dur: "55'", titulo: 'Saltos + fuerza B',
        calentamiento: 'explosivo', lugar: 'patio',
        partes: [
          { nombre: "En el patio (15')", ejercicios: [
            { id: 'saltoVertical', pres: b('3 x 4', '3 x 3'), descanso: 75, test: 'salto' },
            { id: 'saltosRebote', pres: ['Vallas bajas 3 x 5 continuos', 'Vallas bajas 3 x 5 continuos', 'Drop jump desde 30 cm 3 x 4', 'Drop jump desde 30 cm 3 x 4',
              'Drop jump desde 40 cm 3 x 4 + a una pierna 2 x 5 por pierna', 'Drop jump desde 40 cm 3 x 4 + a una pierna 2 x 5 por pierna',
              'Drop jump desde 40 cm 3 x 4 + a una pierna 2 x 5 por pierna', 'Drop jump desde 40 cm 3 x 4 + a una pierna 2 x 5 por pierna'],
              ejPorSemana: ['saltosVallas', 'saltosVallas', 'dropJump', 'dropJump', 'dropJump', 'dropJump', 'dropJump', 'dropJump'], descanso: 75 },
          ] },
          { nombre: "En casa (40')", ejercicios: [
            { id: 'pesoMuerto', etiqueta: 'A', pres: b('3 x 5', '4 x 3 pesado'), carga: 'pesoMuerto', descanso: 150 },
            { id: 'bulgara', etiqueta: 'B1', pres: b('3 x 6-8 por pierna', '3 x 5-6 por pierna') },
            { id: 'pallof', etiqueta: 'B2', pres: igual('3 x 10 por lado'), descanso: 90 },
            { id: 'hipThrust', etiqueta: 'C1', pres: b('3 x 8', '3 x 6'), carga: 'hipThrust' },
            { id: 'gemelos', etiqueta: 'C2', pres: b('3 x 10', '3 x 8 con más peso'), descanso: 60 },
          ] },
        ],
        notas: ['Pausa de 60-90" entre series de saltos. Cada salto es máximo y con aterrizaje silencioso. Si un salto sale más bajo que los anteriores, cortás.'],
      },
      6: {
        dia: 'Sábado', tipo: 'Medio-alto', donde: 'Cancha', dur: "50'", titulo: 'Resistencia de partido',
        calentamiento: 'explosivo', lugar: 'cancha',
        partes: [
          { nombre: 'En la cancha', ejercicios: [
            { id: 'aceleracionesSuaves', pres: igual('3 aceleraciones suaves después del calentamiento') },
            { id: 'quince', pres: b('2 series de 8 repeticiones, 3\' entre series', '3 series de 8-10 repeticiones'), descanso: 180, test: 'yoyo' },
            { id: 'sprintsRepetidos', pres: ['No', 'No', 'No', 'No', '2 series de 6, 4\' entre series', '2 series de 6, 4\' entre series', '2 series de 6, 4\' entre series', '1 serie de 6'], descanso: 240 },
            { id: 'cambiosDireccion', pres: b('No', '45° y 90° al 70-80%, solo si el aductor lo permite'), aductorMin: 4 },
            { id: 'vueltaCalma', pres: igual("10'") },
          ] },
        ],
        notas: ['Si un sábado jugás un partido o un fútbol intenso, ese partido reemplaza la sesión.'],
      },
    },

    // kg por lado, sin contar la barra. Entre paréntesis, series x repeticiones cuando cambian.
    cargas: {
      sentadilla: ['22,5', '25', '27,5', '22,5 (2 x 6)', '30', '32,5', '35 (4 x 4)', '27,5 (2 x 3)'],
      pesoMuertoRumano: ['12,5', '15', '17,5', '12,5 (2 x 8)', '20', '22,5', '25', '17,5 (2 x 5)'],
      pesoMuerto: ['22,5', '25', '27,5', '22,5 (2 x 5)', '32,5', '35', '37,5', '27,5 (2 x 3)'],
      hipThrust: ['15', '20', '25', '15 (2 x 8)', '27,5', '30', '32,5', '20 (2 x 6)'],
      pressBanca: ['15', '15', '17,5', '15 (2 x 8)', '17,5', '20', '20', '17,5 (2 x 5)'],
      remoBarra: ['10', '10', '12,5', '10 (2 x 8)', '12,5', '15', '15', '12,5 (2 x 6)'],
      pressMilitar: ['5', '5', '7,5', '5 (2 x 8)', '7,5', '7,5', '10', '7,5 (2 x 5)'],
    },
    reglasCargas: [
      'Bloque 1: cada serie termina con 2-3 repeticiones de reserva. Bloque 2: con 1-2.',
      'Si una semana no completás las repeticiones, repetí ese peso la semana siguiente.',
      'Si te sobra mucho (5 o más en reserva), subí 2,5 por lado aunque la tabla no lo indique.',
      'Mancuernas (búlgara, gemelos): un peso que deje 2-3 en reserva; subí cuando sobren más.',
      'Bloque 2: sentadilla y peso muerto pesados pero rápidos. Si la barra sube lenta, cortás la serie.',
    ],

    aductor: {
      intro: 'El nivel actual va 2 veces por semana (lunes y miércoles). Pasás al siguiente por cómo responde el cuerpo, no por calendario.',
      niveles: [
        { n: 1, ej: 'Apretón con pelota entre las rodillas, acostado', dosis: '3-5 x 30", fuerza moderada que sube semana a semana', pasar: 'Apretar fuerte no pasa de 2/10 dos semanas seguidas' },
        { n: 2, ej: 'Copenhagen con la rodilla en el banco + apretón con las piernas estiradas', dosis: '3 x 6-8 por lado, lento', pasar: 'Sin molestia al día siguiente' },
        { n: 3, ej: 'Copenhagen con la pierna estirada', dosis: '3 x 5-8 por lado', pasar: 'Aceleraciones al 100% sin molestia' },
        { n: 4, ej: 'Copenhagen dinámico + cambios de dirección de 90° a 180°', dosis: '2-3 x 6 por lado', pasar: 'Mantenimiento 2 veces por semana' },
      ],
      esperado: 'Si todo va bien: nivel 2 hacia la semana 3, nivel 3 hacia la 5-6 y nivel 4 al entrar en la pretemporada. Si va más lento, solo se postergan los cambios de dirección, los saltos laterales y el sprint lanzado.',
      control: 'Cada lunes antes de entrenar: de 0 a 10, cuánto molesta al apretar la pelota fuerte, al toser y en los primeros pasos de la mañana.',
    },

    tests: [
      { id: 'sprint10', nombre: 'Sprint 10 m', unidad: 's', dia: 1, como: '2 intentos, con alguien que cronometre o una app de video. Reemplaza las aceleraciones (hasta 20 m en la semana 1 si el aductor molesta).' },
      { id: 'sprint30', nombre: 'Sprint 30 m', unidad: 's', dia: 1, como: 'Igual que el de 10 m.' },
      { id: 'fuerza', nombre: 'Sentadilla con 25 por lado', unidad: 'reps', dia: 1, como: 'Cuántas repeticiones hacés con 25 por lado, parando con 1 en reserva.' },
      { id: 'salto', nombre: 'Salto vertical', unidad: 'cm', dia: 4, como: 'Mejor de 3, con una app como My Jump o marcando en una pared. Reemplaza los saltos.' },
      { id: 'yoyo', nombre: 'Yo-Yo nivel 1', unidad: 'nivel', dia: 6, como: 'Con una app de audio. Reemplaza el 15"/15".' },
    ],

    reglas: [
      'Si llegaste cansado o dormiste mal: hacé la sesión con una serie menos por ejercicio. No te la saltees entera.',
      'Si se te pasa del tiempo: sacá primero el bloque C, nunca la velocidad ni el ejercicio A.',
      'Si una semana solo podés 4 días: sacá el miércoles y pasá el aductor y el core al martes.',
      'Si perdés una sesión, no la recuperes al día siguiente: seguí con la que corresponde.',
      'Lo intenso para las piernas va lunes y jueves, con 72 horas entre los dos.',
      'Dormí 7-9 horas y comé 1,6-2 g de proteína por kilo por día. Si querés bajar grasa, déficit leve solo en las semanas 1-4.',
    ],
  };

  // Fechas de cada semana a partir del inicio. La nota de las fiestas va en las semanas que tocan el 25/12 o el 1/1.
  const FIESTAS = 'Fiestas: si perdés una sesión, no la recuperes al día siguiente. Seguí con la que corresponde.';
  const dm = (d) => `${d.getDate()}/${d.getMonth() + 1}`;
  const inicio = new Date(window.PLAN.inicio + 'T00:00:00');
  window.PLAN.semanas.forEach((w) => {
    const a = new Date(inicio.getTime() + (w.n - 1) * 7 * 864e5 + 2 * 36e5);
    const b = new Date(a.getTime() + 6 * 864e5);
    w.desde = dm(a); w.hasta = dm(b);
    const tocaFiestas = [[11, 25], [0, 1]].some(([m, d]) => { for (let t = a.getTime(); t <= b.getTime(); t += 864e5) { const x = new Date(t); if (x.getMonth() === m && x.getDate() === d) return true; } return false; });
    if (tocaFiestas) w.nota = w.nota ? w.nota + ' ' + FIESTAS : FIESTAS;
  });
})();
