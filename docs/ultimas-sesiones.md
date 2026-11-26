# Últimas sesiones

> Para retomar en dos minutos: qué se hizo, dónde quedó, qué quedó abierto y qué no rehacer.
> Una entrada por día de trabajo, la más nueva arriba. Se guardan las últimas 10.
> El porqué de cada cosa está en el `LEEME.md` y en los comentarios del código de `app/`.

## 2026-11-26 — Progreso: Calorías, Entreno y el medidor de saltos en una sola PWA

- **Hecho:** app nueva con cuatro secciones (Hoy, Comida, Entreno, Medir), armada sobre el repo de Calorías. Medir tiene CMJ, drop jump, velocidad de sentadilla, 1RM, peso, HRV y VO2 máx, atados a la semana del plan; el medidor de video vive en una hoja. La rutina se edita (cambiar, agregar, quitar, ordenar ejercicios) y el entreno se anota al terminar, en líneas de series × reps × kg. Comida tiene «Gasto y balance»: se carga la captura de calorías de Zepp (Helio Strap), Claude lee reposo y actividad (pedido `/gasto` del intermediario), y el basal usado es el promedio del de Zepp y el de Mifflin-St Jeor; todos los números quedan a la vista. El drop jump se compara solo desde la misma altura de cajón (gráfico, etapas y cambio por altura); CMJ y DJ piden despegar y aterrizar con los dos pies.
- **Dónde quedó:** rama `main` de `lucas-piegas/progreso`, publicada en GitHub Pages (https://lucas-piegas.github.io/progreso/). El plan arranca el lunes 30/11/2026, de cero. Intermediario `calorias-foto` desplegado en https://calorias-foto.calorias-foto.workers.dev (con `/analizar` y `/gasto`).
- **Abierto:** semana de prueba hasta el 29/11 para ajustar. El ícono todavía es el de Calorías.
- **No rehacer:** no migrar datos de las apps viejas (Lucas arranca de cero). Lucas no entrena con el celular: nada de marcar serie por serie ni temporizador; se anota todo al final. Las series se guardan por el `uid` del ejercicio, no por su posición.
- **Detalle:** `LEEME.md` (cómo está armada), `app/entreno.js` (rutina editable y anotación), `app/medir.js` (métricas y medidor).
