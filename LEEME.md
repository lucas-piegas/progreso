# Progreso: comida, entreno y mediciones

App web instalable (PWA) para el iPhone. Junta en un solo lugar las tres partes del plan:

- **Hoy:** la franja de las 8 semanas, la sesión del día, las calorías restantes y el peso y el HRV del día.
- **Comida:** el contador de calorías y macros (antes la app Calorías, repo `lucas-piegas/calorias`).
- **Entreno:** el plan de 8 semanas (antes la app Entreno, repo `lucas-piegas/entreno`). Se anota al terminar:
  series × repeticiones × kg por ejercicio. La rutina se edita desde la sesión de cada día («Editar la rutina»).
- **Medir:** CMJ, drop jump (RSI), velocidad de sentadilla, 1RM de sentadilla y de press de banca,
  peso, HRV y VO2 máx. Cada medición queda atada a su semana del plan, para comparar las etapas.
  Los saltos y la sentadilla se miden con un video en cámara lenta (el medidor de la sesión del 24/11/2026).

No tiene suscripción ni cuentas. Todo vive solo en el iPhone. Las búsquedas de alimentos son locales.

## Cómo está armada

| Archivo de `app/` | Qué hace |
|---|---|
| `nucleo.js` | Utilidades, guardado, hojas, pestañas y la etapa del plan (en qué semana estamos). |
| `comida.js` | La sección Comida. Guarda con el prefijo `cc.`, el mismo de la app Calorías. |
| `entreno.js` | La sección Entreno. Guarda con el prefijo `en.`, el mismo de la app Entreno. |
| `plan.js`, `ejercicios.js` | El plan de 8 semanas y las fichas de los ejercicios. El inicio (`inicio`) define las fechas de cada semana. |
| `medir.js` | La sección Medir y el medidor con video. Guarda con el prefijo `me.`. |
| `hoy.js` | La pantalla Hoy, los ajustes y la copia de seguridad de las tres partes. |

Los cambios a la rutina se guardan aparte (`en.rutina`), sobre una copia del plan. Plan → «Volver al plan original» los borra.
Un CMJ guardado en una semana de tests (1, 4 y 8) se copia al test «Salto vertical» de Entreno, si es el mejor.
`referencia/medidor-saltos.html` es el medidor original, guardado como referencia.

## Pasar los datos de las apps viejas

Cada app instalada guarda sus datos aparte, aunque estén en el mismo teléfono. Para pasarlos:
1. En la app Calorías: Ajustes → Exportar.
2. En la app Entreno: Plan → Exportar.
3. En Progreso: tocá el engranaje de Hoy → Importar, una vez con cada archivo.
El peso de Calorías pasa a Medir.

## Qué hay

| Carpeta | Contenido |
|---|---|
| `app/` | La app completa. `alimentos.json` (comidas y alimentos) y `productos.json` (envasados) son las bases. |
| `app/vendor/` | El lector de códigos de barras (html5-qrcode 2.3.8), guardado local. |
| `herramientas/construir_base.py` | Arma `alimentos.json` y `productos.json` desde las fuentes de `datos/`. |
| `herramientas/curados.py` | Comidas típicas de Uruguay y Argentina con nombre propio. |
| `herramientas/leer_tabla_uruguay.py` | Lee la tabla uruguaya 2002 desde su PDF. |
| `herramientas/bajar_off.py` | Filtra el volcado de Open Food Facts por país. |
| `herramientas/glosario.py` | Glosario inglés → español para los nombres de USDA. |
| `datos/` | Las descargas originales (no hacen falta para usar la app). |

## Fuentes de datos

| Fuente | Qué aporta | Licencia |
|---|---|---|
| Tabla de composición de alimentos de Uruguay 2002 (MTSS-INDA, UdelaR – Facultad de Química, LATINFOODS/FAO) | 373 alimentos uruguayos: cortes vacunos, milanesas, chorizo, quesos, galletas, panes, platos preparados. | Publicación oficial; el PDF original ya no está en línea y se recuperó de Internet Archive. |
| USDA FoodData Central (FNDDS 2021-2023 y Foundation 2025-12) | 5.600 alimentos y platos con porciones. Nombres traducidos con un glosario. | Dominio público (CC0) |
| Open Food Facts (volcado CSV) | Productos envasados vendidos en Uruguay y Argentina, con código de barras. | ODbL |
| Comidas típicas (`curados.py`) | Chivito, pascualina, tortas fritas, refuerzo, martín fierro, milanesa, choripán, mate… | Salen de las tablas de arriba o son estimaciones marcadas «aprox.» |

## Actualizar las bases

```
python herramientas/leer_tabla_uruguay.py "datos/uruguay/zip/Tabla de Alimentos.pdf" datos/uruguay/uruguay.json
curl -L -o datos/off/off_productos.csv.gz https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz
python herramientas/bajar_off.py datos/off/off_productos.csv.gz datos/off/off.json uruguay argentina
python -I herramientas/construir_base.py datos/usda app/alimentos.json
```

Después subir `VERSION` en `app/sw.js` para que el iPhone baje la versión nueva. Vale para cualquier cambio de `app/`.
Los scripts que usan `pypdf` o `duckdb` corren sin `-I` (están instalados con `pip --user`).

## Probar en la PC

```
python -m http.server 8765 --directory app
```

y abrir http://localhost:8765.

## Instalar en el iPhone

El iPhone necesita **HTTPS** para la cámara (código de barras) y para el modo sin conexión.
1. Publicar la carpeta `app/` en un sitio HTTPS (ver opciones abajo).
2. Abrir la dirección en **Safari**.
3. Tocar Compartir → **Agregar a inicio**.
4. Abrir la app desde el ícono. Desde ahí funciona sin conexión.

Opciones de alojamiento:
- **GitHub Pages o Cloudflare Pages** (gratis): la PC puede estar apagada.
  Solo se publica la app y las bases; el diario nunca sale del teléfono.
- **La PC con Tailscale** (`tailscale serve`): privado, con HTTPS. La PC solo tiene que estar prendida
  para instalar o actualizar; después la app queda guardada en el iPhone.

## Única consulta externa

Si escaneás un código de barras que no está en `productos.json`, la app pregunta a Open Food Facts
en línea. Sin conexión, avisa y ofrece cargarlo a mano.

## Copia de seguridad

Engranaje de Hoy → Exportar genera un `.json` con comida, entreno y mediciones. Importar lo restaura.
