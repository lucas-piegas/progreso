/* Descripción de cada ejercicio del plan: cómo se hace y qué cuidar.
   video: texto para buscar un video de referencia (se abre en YouTube solo si tocás el enlace). */
window.EJERCICIOS = {
  // ---------- Velocidad y cancha ----------
  aceleraciones: {
    nombre: 'Aceleraciones desde parado', grupo: 'Velocidad',
    como: 'Desde parado, con un pie adelante, arrancá y acelerá hasta la marca. Volvé caminando: la pausa es parte del ejercicio.',
    claves: ['Cuerpo inclinado hacia adelante los primeros pasos, empujando el piso hacia atrás.', 'Brazos fuertes, codos a 90°.', 'Pasos cortos y potentes que se alargan solos.', 'Si el aductor molesta, bajá al 70%.'],
    video: 'acceleration sprint technique standing start',
  },
  sprintLanzado: {
    nombre: 'Sprint lanzado', grupo: 'Velocidad',
    como: 'Tomá velocidad progresivamente durante 8-10 m y corré 20 m a velocidad casi máxima. Pausa completa de 3\'.',
    claves: ['Erguido, cadera alta.', 'El pie apoya debajo del cuerpo, no adelante.', 'Relajado de cara y hombros.', 'Solo cuando el aductor está en nivel 3 o más.'],
    video: 'flying sprint 20m technique',
  },
  intervalos4: {
    nombre: 'Intervalos 4 x 4\'', grupo: 'Resistencia',
    como: '4 minutos a ritmo fuerte y sostenido, con 3 minutos de trote suave entre cada uno. El 90-95% es del pulso, no de la velocidad: no es un sprint.',
    claves: ['Sin reloj: al ritmo justo solo podés decir palabras sueltas.', 'Ritmo parejo de principio a fin; el último tiene que salir igual que el primero.', 'Ida y vuelta a lo largo de la cancha con giros suaves.'],
    video: '4x4 interval training norwegian',
  },
  quince: {
    nombre: '15"/15"', grupo: 'Resistencia',
    como: '15 segundos fuertes de ida y vuelta y 15 segundos de trote, sin parar. Cada repetición cuenta como un fuerte + un trote.',
    claves: ['Fuerte pero no sprint máximo: tiene que alcanzar para toda la serie.', 'Giros controlados, bajando el centro de gravedad.', 'Contá las distancias: intentá repetir la misma en cada repetición.'],
    video: '15 15 intermittent running football',
  },
  sprintsRepetidos: {
    nombre: 'Sprints repetidos', grupo: 'Resistencia',
    como: 'Sprints de 30 m con 20" de pausa caminando hacia la salida. 6 por serie y 4\' entre series.',
    claves: ['Cada sprint al máximo.', 'Si el tiempo cae mucho, cortá la serie.', 'Es la resistencia de partido: correr rápido cansado.'],
    video: 'repeated sprint ability training football',
  },
  cambiosDireccion: {
    nombre: 'Cambios de dirección', grupo: 'Velocidad',
    como: 'Carreras cortas con giros de 45° y 90° al 70-80%. Solo si el aductor lo permite.',
    claves: ['Frená bajando la cadera con pasos cortos.', 'Empujá con la pierna de afuera.', 'Mirá hacia donde vas antes de girar.'],
    video: 'change of direction drill 45 90 degrees',
  },
  aceleracionesSuaves: {
    nombre: 'Aceleraciones suaves', grupo: 'Velocidad',
    como: '3 arranques de 15-20 m que terminan al 70-80%, para dejar el cuerpo listo.',
    claves: ['Progresivas, nada de máximo.'], video: '',
  },
  vueltaCalma: {
    nombre: 'Toque de pelota o vuelta a la calma', grupo: 'Recuperación',
    como: 'Toque de pelota suave o trote y caminata durante 10\'. Al final podés estirar.',
    claves: ['Pulso bajando.', 'Acá sí van los estiramientos largos.'], video: '',
  },

  // ---------- Fuerza tren inferior ----------
  sentadilla: {
    nombre: 'Sentadilla con barra', grupo: 'Fuerza piernas',
    como: 'Barra sobre la parte alta de la espalda, pies al ancho de hombros. Bajá controlado hasta que el muslo quede paralelo o un poco más, y subí empujando el piso.',
    claves: ['Pecho arriba y espalda neutra.', 'Rodillas en la línea de los pies, sin cerrarse.', 'Apoyo en todo el pie, talón incluido.', 'Bloque 2: bajada controlada, subida rápida.'],
    video: 'back squat technique',
  },
  pesoMuertoRumano: {
    nombre: 'Peso muerto rumano', grupo: 'Fuerza piernas',
    como: 'De pie con la barra, rodillas apenas flexionadas. Llevá la cadera hacia atrás y bajá la barra pegada a las piernas hasta sentir los isquios tensos; volvé empujando la cadera adelante.',
    claves: ['Espalda recta todo el recorrido.', 'La barra roza las piernas.', 'Las rodillas casi no cambian de ángulo.', 'El movimiento es de cadera, no de espalda.'],
    video: 'romanian deadlift technique',
  },
  pesoMuerto: {
    nombre: 'Peso muerto convencional', grupo: 'Fuerza piernas',
    como: 'Barra sobre el medio del pie. Agarrá por fuera de las piernas, pecho arriba, y levantá empujando el piso hasta quedar erguido. Bajá con el mismo recorrido.',
    claves: ['Espalda neutra y firme antes de despegar la barra.', 'La barra sube pegada al cuerpo.', 'Cadera y hombros suben juntos.', 'Si la barra sube lenta en el bloque 2, cortás la serie.'],
    video: 'conventional deadlift technique',
  },
  bulgara: {
    nombre: 'Sentadilla búlgara', grupo: 'Fuerza piernas',
    como: 'Pie de atrás apoyado en un banco, mancuernas en las manos. Bajá la rodilla de atrás hacia el piso y subí empujando con la pierna de adelante.',
    claves: ['Torso apenas inclinado adelante.', 'Rodilla de adelante alineada con el pie.', 'Bajada controlada.', 'Peso que deje 2-3 repeticiones de reserva.'],
    video: 'bulgarian split squat dumbbell technique',
  },
  hipThrust: {
    nombre: 'Hip thrust', grupo: 'Fuerza piernas',
    como: 'Espalda alta apoyada en un banco, barra sobre la cadera con protección. Subí la cadera hasta alinear rodillas, cadera y hombros, apretá el glúteo un segundo y bajá.',
    claves: ['Mentón hacia el pecho.', 'Tibias verticales arriba.', 'No arquees la zona lumbar: el movimiento es de cadera.'],
    video: 'barbell hip thrust technique',
  },
  gemelos: {
    nombre: 'Gemelos de pie, lentos', grupo: 'Fuerza piernas',
    como: 'De pie, con peso, en el borde de un escalón. Subí en puntas de pie en 3 segundos y bajá en 3 segundos hasta estirar el talón por debajo del escalón.',
    claves: ['Recorrido completo.', 'Ritmo lento: 3" arriba, 3" abajo.', 'Rodillas estiradas.'],
    video: 'standing calf raise slow eccentric',
  },
  nordicos: {
    nombre: 'Nórdicos', grupo: 'Fuerza piernas',
    como: 'De rodillas, con los tobillos sujetos. Con el cuerpo recto de rodillas a cabeza, dejate caer hacia adelante lo más lento posible y frená con las manos al final. Volvé ayudándote con las manos.',
    claves: ['Cadera estirada: no te quiebres en la cintura.', 'Lo importante es la bajada lenta.', 'Protegen los isquiotibiales de desgarros.'],
    video: 'nordic hamstring curl technique',
  },

  // ---------- Saltos ----------
  saltoVertical: {
    nombre: 'Salto vertical con contramovimiento', grupo: 'Saltos',
    como: 'De pie, bajá rápido a un cuarto de sentadilla y saltá lo más alto posible con ayuda de los brazos. Aterrizá suave y reseteá antes del siguiente.',
    claves: ['Cada salto es máximo.', 'Aterrizaje silencioso, rodillas alineadas.', 'Si un salto sale más bajo que los anteriores, cortás.'],
    video: 'countermovement jump technique',
  },
  saltosVallas: {
    nombre: 'Saltos con rebote sobre vallas bajas', grupo: 'Saltos',
    como: 'Saltos continuos sobre vallas bajas o una línea, rebotando en el piso con contacto corto.',
    claves: ['Tobillo firme y flexionado hacia arriba en el aire.', 'Contacto corto, como si el piso quemara.', 'Brazos coordinados.'],
    video: 'mini hurdle hops plyometrics',
  },
  dropJump: {
    nombre: 'Drop jump', grupo: 'Saltos',
    como: 'Desde un cajón (30 o 40 cm), dejate caer (no saltes hacia abajo) y, apenas tocás el piso, rebotá hacia arriba lo más alto y rápido posible. En el bloque 2 se suman rebotes a una pierna.',
    claves: ['Contacto lo más corto posible.', 'Caé con los dos pies a la vez.', 'Si el contacto se alarga, el cajón es muy alto.'],
    video: 'drop jump technique plyometric',
  },

  // ---------- Core y tren superior ----------
  planchaLateralDisco: {
    nombre: 'Plancha lateral con disco', grupo: 'Core',
    como: 'Plancha lateral sobre el antebrazo con un disco apoyado sobre la cadera. Cuerpo recto de cabeza a pies.',
    claves: ['Cadera alta, sin hundirse.', 'Codo debajo del hombro.', 'Respirá normal.'],
    video: 'weighted side plank',
  },
  pallof: {
    nombre: 'Pallof press', grupo: 'Core',
    como: 'De costado al anclaje de la banda, con la banda tomada contra el pecho. Estirá los brazos hacia adelante sin dejar que el tronco gire, sostené un segundo y volvé.',
    claves: ['Cadera y hombros mirando al frente.', 'Abdomen firme: el ejercicio es no girar.', 'Pies al ancho de cadera.'],
    video: 'pallof press band technique',
  },
  paseoUnaMano: {
    nombre: 'Paseo con peso en una mano', grupo: 'Core',
    como: 'Caminá con una mancuerna o pesa rusa pesada en una sola mano, sin inclinarte hacia ningún lado. Cambiá de mano en cada serie.',
    claves: ['Hombros nivelados.', 'Pasos normales, tronco quieto.', 'Agarre fuerte.'],
    video: 'suitcase carry technique',
  },
  rollout: {
    nombre: 'Rollout con barra y discos', grupo: 'Core',
    como: 'De rodillas, con las manos en la barra cargada con discos. Rodá la barra hacia adelante estirando el cuerpo y volvé tirando con el abdomen.',
    claves: ['Espalda baja sin hundirse.', 'Bloque 1: recorrido corto. Bloque 2: largo.', 'Si el pubis pasa de 3/10, achicá el recorrido.'],
    video: 'barbell rollout kneeling',
  },
  pressBanca: {
    nombre: 'Press de banca', grupo: 'Tren superior',
    como: 'Acostado en el banco, barra a la altura del pecho. Bajala controlada hasta rozar el pecho y empujá hasta estirar los brazos.',
    claves: ['Omóplatos juntos y apoyados.', 'Pies firmes en el piso.', 'Codos a unos 45° del cuerpo.'],
    video: 'bench press technique',
  },
  remoBarra: {
    nombre: 'Remo con barra', grupo: 'Tren superior',
    como: 'Inclinado hacia adelante con la espalda recta, la barra colgando. Tirá la barra hacia el ombligo juntando los omóplatos y bajala controlada.',
    claves: ['Espalda recta y quieta.', 'Tirás con la espalda, no con impulso.', 'Codos cerca del cuerpo.'],
    video: 'barbell row technique',
  },
  dominadas: {
    nombre: 'Dominadas', grupo: 'Tren superior',
    como: 'Colgado de la barra, subí hasta pasar el mentón por arriba y bajá hasta estirar los brazos.',
    claves: ['Sin balanceo.', 'Bloque 1: máximo dejando 1-2 en reserva.', 'Bloque 2: si sobran, con lastre.'],
    video: 'pull up technique',
  },
  pressMilitar: {
    nombre: 'Press militar', grupo: 'Tren superior',
    como: 'De pie, barra a la altura de los hombros. Empujala hacia arriba hasta estirar los brazos y bajala controlada.',
    claves: ['Glúteos y abdomen firmes: no arquees la espalda.', 'La cabeza se corre atrás para dejar pasar la barra.'],
    video: 'overhead press technique standing',
  },
  movilidad: {
    nombre: 'Movilidad de cadera y tobillo', grupo: 'Movilidad',
    como: '5\' de movilidad: rotaciones de cadera en el piso (90/90), estocada con la rodilla hacia adelante para el tobillo y aperturas de cadera.',
    claves: ['Movimientos lentos y amplios.', 'Sin dolor.'],
    video: '90 90 hip mobility ankle mobility',
  },

  // ---------- Aductor ----------
  aductor: { nombre: 'Aductor (según la semana)', grupo: 'Aductor', como: 'El ejercicio cambia por semana: apretón con pelota → Copenhagen corto → Copenhagen largo.', claves: [], video: '' },
  apreton: {
    nombre: 'Apretón con pelota', grupo: 'Aductor',
    como: 'Acostado boca arriba con las rodillas flexionadas y una pelota entre las rodillas. Apretá y sostené el tiempo indicado.',
    claves: ['Fuerza moderada que sube semana a semana.', 'Sirve de control: anotá la molestia de 0 a 10.', 'Antes de lo explosivo, si pasa de 3/10, la sesión va suave.'],
    video: 'adductor squeeze ball isometric',
  },
  copenhagenCorto: {
    nombre: 'Copenhagen corto', grupo: 'Aductor',
    como: 'Plancha lateral con la rodilla de arriba apoyada en el banco. Subí la cadera usando el aductor de esa pierna y bajá lento.',
    claves: ['Lento y controlado.', 'Cuerpo recto.', 'Sin molestia al día siguiente para avanzar.'],
    video: 'copenhagen plank short lever',
  },
  copenhagenLargo: {
    nombre: 'Copenhagen largo', grupo: 'Aductor',
    como: 'Igual que el corto, pero con la pierna de arriba estirada y el tobillo en el banco. Es bastante más exigente.',
    claves: ['Solo cuando el corto no molesta.', 'Cadera alta, cuerpo en línea.'],
    video: 'copenhagen adductor long lever',
  },

  // ---------- Calentamiento ----------
  balanceoPierna: { nombre: 'Balanceo de pierna', grupo: 'Calentamiento', como: 'Apoyado en algo, balanceá la pierna adelante-atrás y después de lado a lado, cada vez más amplio.', claves: ['Tronco quieto.', 'Amplitud creciente.'], video: 'leg swings warm up' },
  estocadaGiro: { nombre: 'Estocada larga con giro', grupo: 'Calentamiento', como: 'Paso largo adelante, bajá la rodilla de atrás y girá el tronco hacia el lado de la pierna adelantada.', claves: ['Rodilla de adelante sobre el pie.'], video: 'lunge with rotation warm up' },
  sentadillaProfunda: { nombre: 'Sentadilla profunda abriendo rodillas', grupo: 'Calentamiento', como: 'Bajá a sentadilla profunda y usá los codos para abrir las rodillas unos segundos.', claves: ['Talones apoyados.'], video: 'deep squat hold mobility' },
  puenteGluteo: { nombre: 'Puente de glúteo', grupo: 'Calentamiento', como: 'Boca arriba, rodillas flexionadas: subí la cadera apretando glúteos y bajá.', claves: ['Sin arquear la espalda.'], video: 'glute bridge' },
  planchaLateral: { nombre: 'Plancha lateral', grupo: 'Calentamiento', como: 'Apoyado en el antebrazo y el costado de los pies, cuerpo recto.', claves: ['Cadera alta.'], video: 'side plank' },
  askip: { nombre: 'Skipping bajo (A-skip)', grupo: 'Calentamiento', como: 'Avanzá con pasos cortos subiendo la rodilla y apoyando la punta del pie debajo del cuerpo, rápido.', claves: ['Tobillo firme.', 'Brazos coordinados.'], video: 'a skip drill' },
  pogos: { nombre: 'Pogos', grupo: 'Calentamiento', como: 'Saltitos seguidos con las rodillas casi estiradas, rebotando con los tobillos.', claves: ['Tobillo flexionado hacia arriba en el aire.', 'Contacto corto y silencioso.'], video: 'pogo jumps' },
  saltitos: { nombre: 'Saltitos adelante-atrás', grupo: 'Calentamiento', como: 'Saltitos a dos piernas por encima de una línea, adelante y atrás, rápidos.', claves: ['Contacto corto.'], video: 'line hops forward backward' },
  bounding: { nombre: 'Bounding suave', grupo: 'Calentamiento', como: 'Carrera con zancadas largas y elásticas, quedando un instante en el aire en cada paso.', claves: ['Suave, sin forzar.'], video: 'bounding drill' },
};
