# Últimas sesiones

> Para retomar en dos minutos: qué se hizo, dónde quedó, qué quedó abierto y qué no rehacer.
> Una entrada por día de trabajo, la más nueva arriba. Se guardan las últimas 10.
> El porqué de cada cosa está en el `LEEME.md` y en los comentarios del código de `app/`.

## 2026-11-27 — La captura de Zepp se lee sin IA

- **Hecho:** «Gasto del día» lee la captura con Tesseract.js (OCR) en el teléfono, gratis: gris, invertida si es oscura, y busca «Activity consumption», «Resting Consumption» y la fecha («Nov 26»). Arranca sola al elegir la captura. Sin respaldo con IA (decisión de Lucas): lo que no encuentra se escribe a mano. El pedido `/gasto` del intermediario quedó sin uso.
- **Además:** «Guardar y probar la clave» (Foto del plato) prueba dirección y clave con un pedido sin foto: el intermediario contesta 401 si la clave está mal y 400 si está bien, sin llamar a Claude.
- **Saltos:** el CMJ y el DJ guardan los datos de la app de saltos de Lucas: vuelo, velocidades de despegue y media, impulso (peso de Medir), fuerza y potencia por Samozino (con la distancia de empuje), y en el DJ contacto y rigidez (Dalleau). El RSI pasó a ser vuelo ÷ contacto (decisión de Lucas, para comparar con esa app); los DJ viejos se recalculan una vez (`me.rsiVuelo`) y guardan el anterior en `det.rsiAltura`.
- **Dónde quedó:** `main` (`progreso-v9`). Probado con la captura real del 26/11: 46 y 1.420 kcal en 2,5 s.
- **Abierto:** el DRI de la app de saltos (1,72) no se sabe cómo se calcula: falta preguntar. Probar en el iPhone; la primera vez baja unos MB del lector (jsdelivr y tessdata).
- **No rehacer:** la etiqueta del regex va entre `(?:…)`: sin eso el `|` deja el número fuera del grupo. El `<script>` de jsdelivr llega como respuesta opaca: el service worker la guarda igual (caché `progreso-externo`).
- **Detalle:** `app/comida.js` (`interpretarZepp`, `leerCaptura`), `app/sw.js`.

## 2026-11-26 — Progreso: Calorías, Entreno y el medidor de saltos en una sola PWA

- **Hecho:** app nueva con cuatro secciones (Hoy, Comida, Entreno, Medir), armada sobre el repo de Calorías. Medir tiene CMJ, drop jump, velocidad de sentadilla, 1RM, peso, HRV y VO2 máx, atados a la semana del plan; el medidor de video vive en una hoja. La rutina se edita (cambiar, agregar, quitar, ordenar ejercicios) y el entreno se anota al terminar, en líneas de series × reps × kg. Comida tiene «Gasto y balance»: se carga la captura de calorías de Zepp (Helio Strap), Claude lee reposo y actividad (pedido `/gasto` del intermediario), y el basal usado es el promedio del de Zepp y el de Mifflin-St Jeor; todos los números quedan a la vista. El drop jump se compara solo desde la misma altura de cajón (gráfico, etapas y cambio por altura); CMJ y DJ piden despegar y aterrizar con los dos pies.
- **Dónde quedó:** rama `main` de `lucas-piegas/progreso`, publicada en GitHub Pages (https://lucas-piegas.github.io/progreso/). El plan arranca el lunes 30/11/2026, de cero. Intermediario `calorias-foto` desplegado en https://calorias-foto.calorias-foto.workers.dev (con `/analizar` y `/gasto`).
- **Abierto:** semana de prueba hasta el 29/11 para ajustar. El ícono todavía es el de Calorías.
- **No rehacer:** no migrar datos de las apps viejas (Lucas arranca de cero). Lucas no entrena con el celular: nada de marcar serie por serie ni temporizador; se anota todo al final. Las series se guardan por el `uid` del ejercicio, no por su posición.
- **Detalle:** `LEEME.md` (cómo está armada), `app/entreno.js` (rutina editable y anotación), `app/medir.js` (métricas y medidor).
