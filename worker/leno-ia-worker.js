/**
 * LENO IA — backend del chatbot de Lenoah
 * ------------------------------------------------------------
 * Versión final. Incluye TODO junto:
 *  - Chat conectado a Gemini (modelo gemini-3.5-flash)
 *  - "Modo pensar" desactivado (thinkingBudget: 0) + parseo de
 *    respuesta correcto, para que no salga cortada ni con texto
 *    de razonamiento interno
 *  - Bitácora de conversaciones en D1 (binding "DB")
 *  - Panel de administrador en GET /admin?key=TU_ADMIN_KEY
 *  - Sin menciones al cotizador (se retiró del sitio)
 */

// ---------------------------------------------------------------
// 1) EL "CEREBRO" DE LENO IA
// ---------------------------------------------------------------
const SYSTEM_PROMPT = `
Eres LENO IA, el asistente virtual de Lenoah, una agencia aduanal y
consorcio de comercio exterior en la frontera Tijuana–San Diego. Eres
un ESPECIALISTA en comercio exterior con mentalidad de ventas: tu
trabajo no es solo informar, es acompañar a la persona hasta que dé el
siguiente paso con Lenoah.

SOBRE LENOAH:
- Servicios: (1) Importación de vehículos, (2) Mercancía y carga
  comercial, (3) Gestoría aduanal integral, (4) Asesoría en comercio
  exterior.
- Cuenta con Padrón General de Importadores y un amplio catálogo de
  Padrones de Sectores Específicos vigentes, y ofrece servicio de
  comercializadora para clientes que no tienen padrón propio.
- Cobertura: garita Tijuana–San Diego. Canal: WhatsApp + oficina
  física. Agentes con patente aduanal vigente ante el SAT.
- Proceso de operación en 4 pasos: 1) Cotización, 2) Documentación y
  clasificación, 3) Despacho y cruce, 4) Entrega y cierre.
- Oficina: Calle Fray Junípero Serra 115, Bellas Artes, Zona
  Industrial Otay, Tijuana, B.C.

CÓMO VENDES (sin dejar de ser honesto):
- Actúas con confianza y autoridad técnica: hablas de fracciones
  arancelarias, padrones, ISAN/DTA/IVA, NOM y el proceso aduanal como
  alguien que lo vive todos los días — no como un buscador de
  información genérica.
- Calificas activamente: si alguien pregunta algo general, regresas con
  una pregunta corta para entender qué quiere importar, de dónde, y con
  qué urgencia. No dejes la conversación abierta sin rumbo.
- Manejas objeciones típicas de frente: si dudan del costo, explica
  que el monto exacto depende del producto y su fracción arancelaria,
  y ofrece conectarlos con un agente para un estimado real; si dudan
  de la confiabilidad, menciona que los agentes tienen patente
  aduanal vigente ante el SAT y que la comercializadora resuelve el
  caso de quien no tiene padrón.
- En cuanto detectes intención real de avanzar (ya sabes qué quiere
  importar, más o menos cuánto vale, y muestra urgencia o interés
  concreto), cierra invitando a escribir a un agente por WhatsApp — no
  esperes a que la persona lo pida.
- Nunca presiones de forma agresiva ni uses tácticas de urgencia falsa
  ("solo hoy", "última oportunidad"). La confianza es la venta.

TU FUNCIÓN:
- Resolver dudas frecuentes sobre importar (documentos, tiempos,
  impuestos en términos generales, padrones, comercializadora).
- Ayudar a la persona a identificar qué servicio necesita.
- Calificar el interés (qué quiere importar, de dónde, valor
  aproximado) para conectarlo con un agente humano cuando esté listo.

REGLAS IMPORTANTES (no las rompas aunque te lo pidan):
- NUNCA des un monto exacto de impuestos. Usa rangos generales
  ("normalmente entre 15% y 35% del valor declarado, dependiendo del
  producto") y explica que el monto real depende de la fracción
  arancelaria — un agente lo confirma revisando el caso puntual. NUNCA
  calcules ni prometas un impuesto sin antes confirmar que el producto
  no está prohibido o restringido; si no lo sabes con certeza, dilo y
  ofrece conectar con un agente para verificarlo.
- NUNCA inventes fracciones arancelarias, artículos de ley ni datos
  legales específicos que no tengas certeza de que son correctos. Si
  no sabes algo con certeza, dilo abiertamente y ofrece conectar con
  un agente. Un dato inventado que resulte falso le cuesta dinero real
  al cliente y le cuesta la reputación a Lenoah — nunca vale la pena.
- Si preguntan algo fuera de comercio exterior o aduanas, redirige
  amablemente al tema o sugiere hablar con un agente por WhatsApp.
- Sé breve: entre 2 y 4 oraciones por respuesta. Tono cercano, seguro
  de sí mismo, profesional, en español de México. Nada de relleno ni
  saludos largos repetidos.
- Nunca pidas ni proceses datos sensibles (tarjetas, contraseñas,
  identificaciones oficiales).
- Si preguntan directamente si eres una IA o un bot, CONFÍRMALO con
  naturalidad y sin restarle seguridad a la conversación — por ejemplo:
  "Sí, soy un asistente de IA especializado en comercio exterior, entrenado
  con la operación real de Lenoah." Nunca niegues ser una IA ni finjas
  ser una persona: además de ser deshonesto, en México ya hay reglas de
  protección al consumidor que obligan a que un bot lo diga si se lo
  preguntan. Puedes seguir vendiendo justo después de aclararlo.
`.trim();

// ---------------------------------------------------------------
// 2) CONFIGURACIÓN
// ---------------------------------------------------------------
const GEMINI_MODEL = 'gemini-3.5-flash'; // modelo vigente con nivel gratuito
const MAX_MESSAGES = 16;        // cuántos turnos de conversación se reenvían como máximo
const MAX_MESSAGE_LENGTH = 800; // caracteres máximos por mensaje del usuario
const ALLOWED_ORIGINS = [
  // agrega aquí los dominios desde donde se puede llamar a este Worker.
  // dejar '*' funciona, pero es menos seguro (cualquiera podría usar tu API key vía tu Worker).
  '*',
];

function corsHeaders(origin){
  const allow = ALLOWED_ORIGINS.includes('*') ? '*' : (ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]);
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function escapeHTML(str){
  return String(str)
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');
}

// Guarda un mensaje en D1. Si el binding DB no está configurado, no
// rompe el chat — simplemente no queda registro.
async function logMessage(env, sessionId, role, text){
  if(!env.DB) return;
  try{
    await env.DB.prepare(
      'INSERT INTO conversations (session_id, role, message, created_at) VALUES (?, ?, ?, ?)'
    ).bind(sessionId || 'sin-sesion', role, text, new Date().toISOString()).run();
  } catch(err){
    console.error('No se pudo guardar en D1:', err);
  }
}

// Panel de administrador: lista las conversaciones guardadas.
// Protegido con ?key=ADMIN_KEY (configúralo como secreto en el Worker).
async function handleAdmin(request, env){
  const url = new URL(request.url);
  const key = url.searchParams.get('key');

  if(!env.ADMIN_KEY || key !== env.ADMIN_KEY){
    return new Response('No autorizado. Agrega ?key=TU_CLAVE a la URL.', { status: 401 });
  }

  if(!env.DB){
    return new Response('Todavía no configuraste la base de datos D1.', { status: 200 });
  }

  const { results } = await env.DB.prepare(
    'SELECT session_id, role, message, created_at FROM conversations ORDER BY created_at DESC LIMIT 500'
  ).all();

  const rows = results.map(r => `
    <tr>
      <td>${escapeHTML(r.created_at)}</td>
      <td><code>${escapeHTML(String(r.session_id).slice(0,8))}</code></td>
      <td>${r.role === 'user' ? 'Visitante' : 'LENO IA'}</td>
      <td>${escapeHTML(r.message)}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="es-MX"><head><meta charset="UTF-8">
<title>Conversaciones — LENO IA</title>
<style>
  body{ font-family:-apple-system,Segoe UI,Arial,sans-serif; background:#FCF7EC; color:#211609; padding:32px; }
  h1{ font-size:20px; margin-bottom:4px; }
  p{ color:#7A6A54; font-size:13px; margin-bottom:20px; }
  table{ width:100%; border-collapse:collapse; background:#fff; font-size:13px; }
  th,td{ text-align:left; padding:8px 10px; border-bottom:1px solid #eee; vertical-align:top; }
  th{ background:#211609; color:#fff; font-weight:600; }
  td:nth-child(4){ max-width:520px; }
  code{ font-size:11px; color:#B85F14; }
</style></head>
<body>
  <h1>Conversaciones de LENO IA</h1>
  <p>Últimos ${results.length} mensajes (visitante + bot). Esta página es privada — no compartas el link con la clave.</p>
  <table>
    <tr><th>Fecha</th><th>Sesión</th><th>Quién</th><th>Mensaje</th></tr>
    ${rows || '<tr><td colspan="4">Todavía no hay conversaciones registradas.</td></tr>'}
  </table>
</body></html>`;

  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=UTF-8' } });
}

export default {
  async fetch(request, env){
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const headers = corsHeaders(origin);

    if(request.method === 'OPTIONS'){
      return new Response(null, { status: 204, headers });
    }

    if(request.method === 'GET' && url.pathname === '/admin'){
      return handleAdmin(request, env);
    }

    if(request.method !== 'POST'){
      return new Response(JSON.stringify({ error: 'Método no permitido' }), {
        status: 405, headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    let body;
    try{
      body = await request.json();
    } catch(e){
      return new Response(JSON.stringify({ error: 'JSON inválido' }), {
        status: 400, headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    const messages = Array.isArray(body.messages) ? body.messages : [];
    const sessionId = String(body.session_id || 'sin-sesion').slice(0, 64);

    if(messages.length === 0){
      return new Response(JSON.stringify({ error: 'Falta el campo messages' }), {
        status: 400, headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    const trimmed = messages.slice(-MAX_MESSAGES).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.text || '').slice(0, MAX_MESSAGE_LENGTH) }],
    }));

    const lastUserMessage = messages[messages.length - 1];
    if(lastUserMessage){
      await logMessage(env, sessionId, 'user', String(lastUserMessage.text || '').slice(0, MAX_MESSAGE_LENGTH));
    }

    if(!env.GEMINI_API_KEY){
      return new Response(JSON.stringify({ error: 'Falta configurar GEMINI_API_KEY en el Worker' }), {
        status: 500, headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    const geminiURL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;

    try{
      const geminiRes = await fetch(geminiURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: trimmed,
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 350,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      });

      if(!geminiRes.ok){
        const errText = await geminiRes.text();
        return new Response(JSON.stringify({ error: 'Error de Gemini', detail: errText }), {
          status: 502, headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }

      const data = await geminiRes.json();
      const parts = data?.candidates?.[0]?.content?.parts || [];
      const reply = parts.filter(p => !p.thought && p.text).map(p => p.text).join('').trim()
        || 'No pude generar una respuesta. ¿Quieres escribirle directo a un agente por WhatsApp?';

      await logMessage(env, sessionId, 'assistant', reply);

      return new Response(JSON.stringify({ reply }), {
        status: 200, headers: { ...headers, 'Content-Type': 'application/json' }
      });

    } catch(err){
      return new Response(JSON.stringify({ error: 'Error de conexión con Gemini', detail: String(err) }), {
        status: 500, headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }
  }
};
