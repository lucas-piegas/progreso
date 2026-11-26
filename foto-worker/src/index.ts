/**
 * Intermediario de la app Calorías (Cloudflare Worker).
 *
 * POST /analizar  (cabecera Authorization: Bearer <CLAVE_APP>)
 *   cuerpo: { imagen: "<jpeg en base64>", gramos: 450, modelo: "opus" | "sonnet", nota?: "con aceite" }
 *   respuesta: { plato, alimentos: [{ nombre, busqueda, gramos, confianza }], advertencias, modelo, uso }
 *
 * POST /gasto  (misma cabecera)
 *   cuerpo: { imagen: "<jpeg en base64>", hoy: "AAAA-MM-DD", modelo?: "opus" | "sonnet" }
 *   respuesta: { fecha, actividad, reposo, total, dia_completo, notas, modelo, uso }
 *   Lee la pantalla de calorías de la app Zepp (banda Helio Strap): consumo de actividad y en reposo.
 *
 * La clave de la API de Anthropic vive solo acá (secreto ANTHROPIC_API_KEY). La app nunca la ve.
 * Las calorías NO las calcula Claude: la app busca cada alimento en su base local.
 */
import Anthropic from "@anthropic-ai/sdk";

interface Env {
  ANTHROPIC_API_KEY: string;
  CLAVE_APP: string;
  ORIGENES: string;
}

const MODELOS: Record<string, string> = {
  opus: "claude-opus-5-5",
  sonnet: "claude-sonnet-5-5",
};

const MAX_IMAGEN_B64 = 4_000_000; // ~3 MB de JPEG; la app manda ~150 KB

const SISTEMA = `Sos un nutricionista de Uruguay y Argentina que mira fotos de comidas.
Te dan una foto de un plato y su peso total en gramos (comida sola, sin el plato).
Tu trabajo: identificar cada alimento visible y repartir el peso total entre ellos según lo que ves.

Reglas:
- Nombrá cada alimento como se dice en el Río de la Plata (milanesa, zapallo, boniato, frankfurter, morrón).
- "busqueda" son 1 a 3 palabras para buscarlo en una base de alimentos en español: el alimento básico y, si importa, la cocción ("arroz blanco", "pechuga pollo plancha", "papas fritas", "milanesa carne").
- Si es un plato que se come como unidad y tiene nombre propio (chivito, pascualina, empanada, pizza, guiso de lentejas), devolvelo como un solo alimento en vez de separar sus ingredientes.
- Los gramos de todos los alimentos tienen que sumar el peso total que te dan.
- Incluí grasas y salsas visibles (aceite brillando, manteca, mayonesa, salsa) como alimentos aparte si se ven, con una estimación de sus gramos.
- "confianza" es qué tan seguro estás de la identificación y de los gramos: alta, media o baja.
- En "advertencias", en una o dos frases cortas, decí lo que no se puede ver y cambia las calorías (aceite de la fritura, azúcar, relleno). Si no hay nada, dejalo vacío.`;

const ESQUEMA = {
  type: "object",
  properties: {
    plato: { type: "string", description: "Nombre corto del plato completo" },
    alimentos: {
      type: "array",
      items: {
        type: "object",
        properties: {
          nombre: { type: "string" },
          busqueda: { type: "string" },
          gramos: { type: "integer" },
          confianza: { type: "string", enum: ["alta", "media", "baja"] },
        },
        required: ["nombre", "busqueda", "gramos", "confianza"],
        additionalProperties: false,
      },
    },
    advertencias: { type: "string" },
  },
  required: ["plato", "alimentos", "advertencias"],
  additionalProperties: false,
} as const;

const SISTEMA_GASTO = `Leés capturas de pantalla de la app Zepp (banda Amazfit Helio Strap) para anotar el gasto de energía de un día.
La pantalla de calorías muestra el consumo de actividad ("Activity consumption") en grande con su fecha, y más abajo el consumo en reposo ("Resting Consumption").
Puede estar en inglés o en español ("Consumo por actividad", "Consumo en reposo").

Reglas:
- Copiá los números tal cual se ven, en kcal, sin separadores de miles (1,420 es 1420).
- "fecha" es la fecha del día que muestra la pantalla, en formato AAAA-MM-DD. La pantalla no muestra el año: usá el año de la fecha de hoy que te dan, salvo que eso deje la fecha en el futuro (entonces es el año anterior). Si no se ve ninguna fecha, poné la de hoy.
- Si un número no se ve, poné 0 y decilo en "notas".
- "total" es actividad + reposo, o el total que muestre la pantalla si muestra uno.
- "dia_completo" es false si la fecha es hoy (el día todavía no terminó), true si es un día anterior.
- "notas": una frase corta solo si algo no está claro (otra pantalla, la vista semanal o mensual, números cortados). Si todo está claro, dejalo vacío.`;

const ESQUEMA_GASTO = {
  type: "object",
  properties: {
    fecha: { type: "string", description: "AAAA-MM-DD" },
    actividad: { type: "integer" },
    reposo: { type: "integer" },
    total: { type: "integer" },
    dia_completo: { type: "boolean" },
    notas: { type: "string" },
  },
  required: ["fecha", "actividad", "reposo", "total", "dia_completo", "notas"],
  additionalProperties: false,
} as const;

interface Gasto { fecha: string; actividad: number; reposo: number; total: number; dia_completo: boolean; notas: string }

interface Alimento { nombre: string; busqueda: string; gramos: number; confianza: string }
interface Resultado { plato: string; alimentos: Alimento[]; advertencias: string }

function cabecerasCors(origen: string | null, env: Env): Record<string, string> {
  const permitidos = env.ORIGENES.split(",").map((s) => s.trim());
  const ok = origen && permitidos.includes(origen) ? origen : permitidos[0];
  return {
    "Access-Control-Allow-Origin": ok,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(cuerpo: unknown, estado: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });
}

/** Comparación en tiempo constante para la clave de la app. */
function mismaClave(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return dif === 0;
}

/** Ajusta los gramos para que sumen exactamente el peso total. */
function ajustarGramos(alimentos: Alimento[], total: number): Alimento[] {
  const suma = alimentos.reduce((s, a) => s + Math.max(0, a.gramos), 0);
  if (suma <= 0) return alimentos;
  const salida = alimentos.map((a) => ({ ...a, gramos: Math.round((Math.max(0, a.gramos) * total) / suma) }));
  const diferencia = total - salida.reduce((s, a) => s + a.gramos, 0);
  if (salida.length) {
    const mayor = salida.reduce((m, a) => (a.gramos > m.gramos ? a : m), salida[0]);
    mayor.gramos += diferencia;
  }
  return salida;
}

/** Lee la pantalla de calorías de Zepp: actividad, reposo y la fecha del día. */
async function leerGasto(datos: { imagen?: string; modelo?: string; hoy?: string }, env: Env, cors: Record<string, string>): Promise<Response> {
  const imagen = (datos.imagen || "").replace(/^data:image\/\w+;base64,/, "");
  const modelo = MODELOS[datos.modelo || "opus"];
  const hoy = /^\d{4}-\d{2}-\d{2}$/.test(datos.hoy || "") ? datos.hoy! : new Date().toISOString().slice(0, 10);
  if (!imagen || imagen.length > MAX_IMAGEN_B64) return json({ error: "Falta la captura o es muy grande" }, 400, cors);
  if (!modelo) return json({ error: "Modelo desconocido" }, 400, cors);
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  try {
    const respuesta = await client.beta.messages.create({
      model: modelo,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: ESQUEMA_GASTO } },
      system: SISTEMA_GASTO,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imagen } },
          { type: "text", text: `Fecha de hoy: ${hoy}.` },
        ],
      }],
    });
    if (respuesta.stop_reason === "refusal") return json({ error: "Claude no pudo leer esta captura" }, 422, cors);
    if (respuesta.stop_reason === "max_tokens") return json({ error: "La respuesta quedó cortada; probá de nuevo" }, 502, cors);
    const texto = respuesta.content.find((b) => b.type === "text");
    if (!texto || texto.type !== "text") return json({ error: "Respuesta vacía" }, 502, cors);
    const g = JSON.parse(texto.text) as Gasto;
    return json({ ...g, modelo: respuesta.model, uso: { entrada: respuesta.usage.input_tokens, salida: respuesta.usage.output_tokens } }, 200, cors);
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) return json({ error: "La clave de la API de Anthropic no es válida" }, 502, cors);
    if (error instanceof Anthropic.RateLimitError) return json({ error: "Demasiados pedidos; esperá un momento" }, 429, cors);
    if (error instanceof Anthropic.BadRequestError) return json({ error: "Pedido rechazado: " + error.message }, 400, cors);
    if (error instanceof Anthropic.APIError) return json({ error: `Error de la API (${error.status})` }, 502, cors);
    return json({ error: "Error inesperado: " + String(error) }, 500, cors);
  }
}

export default {
  async fetch(pedido: Request, env: Env): Promise<Response> {
    const cors = cabecerasCors(pedido.headers.get("Origin"), env);
    if (pedido.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const url = new URL(pedido.url);
    if (pedido.method !== "POST" || (url.pathname !== "/analizar" && url.pathname !== "/gasto")) return json({ error: "No existe" }, 404, cors);

    const auth = pedido.headers.get("Authorization") || "";
    if (!mismaClave(auth.replace(/^Bearer\s+/i, ""), env.CLAVE_APP)) return json({ error: "Clave de la app incorrecta" }, 401, cors);

    let datos: { imagen?: string; gramos?: number; modelo?: string; nota?: string; hoy?: string };
    try { datos = await pedido.json(); } catch { return json({ error: "Cuerpo inválido" }, 400, cors); }
    if (url.pathname === "/gasto") return leerGasto(datos, env, cors);
    const imagen = (datos.imagen || "").replace(/^data:image\/\w+;base64,/, "");
    const gramos = Math.round(Number(datos.gramos));
    const modelo = MODELOS[datos.modelo || "opus"];
    if (!imagen || imagen.length > MAX_IMAGEN_B64) return json({ error: "Falta la foto o es muy grande" }, 400, cors);
    if (!(gramos > 0 && gramos < 5000)) return json({ error: "El peso tiene que estar entre 1 y 5000 g" }, 400, cors);
    if (!modelo) return json({ error: "Modelo desconocido" }, 400, cors);

    const nota = (datos.nota || "").slice(0, 300);
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    try {
      const respuesta = await client.beta.messages.create({
        model: modelo,
        max_tokens: 8000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "medium", format: { type: "json_schema", schema: ESQUEMA } },
        system: SISTEMA,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imagen } },
            { type: "text", text: `Peso total de la comida: ${gramos} g.${nota ? ` Aclaración: ${nota}` : ""}` },
          ],
        }],
      });

      if (respuesta.stop_reason === "refusal") return json({ error: "Claude no pudo analizar esta foto" }, 422, cors);
      if (respuesta.stop_reason === "max_tokens") return json({ error: "La respuesta quedó cortada; probá de nuevo" }, 502, cors);
      const texto = respuesta.content.find((b) => b.type === "text");
      if (!texto || texto.type !== "text") return json({ error: "Respuesta vacía" }, 502, cors);
      const resultado = JSON.parse(texto.text) as Resultado;

      return json({
        plato: resultado.plato,
        alimentos: ajustarGramos(resultado.alimentos, gramos),
        advertencias: resultado.advertencias,
        modelo: respuesta.model,
        uso: { entrada: respuesta.usage.input_tokens, salida: respuesta.usage.output_tokens },
      }, 200, cors);
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) return json({ error: "La clave de la API de Anthropic no es válida" }, 502, cors);
      if (error instanceof Anthropic.RateLimitError) return json({ error: "Demasiados pedidos; esperá un momento" }, 429, cors);
      if (error instanceof Anthropic.BadRequestError) return json({ error: "Pedido rechazado: " + error.message }, 400, cors);
      if (error instanceof Anthropic.APIError) return json({ error: `Error de la API (${error.status})` }, 502, cors);
      return json({ error: "Error inesperado: " + String(error) }, 500, cors);
    }
  },
} satisfies ExportedHandler<Env>;
