/**
 * LENO IA — backend del chatbot de Lenoah
 * ------------------------------------------------------------
 * Este código NO vive en GitHub Pages (que solo sirve archivos
 * estáticos). Se despliega por separado en Cloudflare Workers,
 * gratis, y es el único lugar donde vive la API key de Gemini.
 *
 * Flujo:
 *   navegador (assets/chat-widget.js)
 *     -> POST aquí con { messages: [...] }
 *     -> este Worker le agrega el system prompt de LENO IA
 *     -> llama a la API de Gemini con la API key (guardada como
 *        secreto, nunca visible en el navegador)
 *     -> regresa { reply: "..." } al navegador
 *
 * Instrucciones de despliegue: ver /worker/README.md
 */

// ---------------------------------------------------------------
// 1) EL "CEREBRO" DE LENO IA — edita este texto para ajustar tono,
//    reglas o información de la empresa. No necesitas tocar nada
//    más abajo para hacer cambios de contenido.
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
- El sitio tiene un cotizador en línea en /cotizador.html que da un
  rango estimado de impuestos.

CÓMO VENDES (sin dejar de ser honesto):
- Actúas con confianza y autoridad técnica: hablas de fracciones
  arancelarias, padrones, ISAN/DTA/IVA, NOM y el proceso aduanal como
  alguien que lo vive todos los días — no como un buscador de
  información genérica.
- Calificas activamente: si alguien pregunta algo general, regresas con
  una pregunta corta para entender qué quiere importar, de dónde, y con
  qué urgencia. No dejes la conversación abierta sin rumbo.
- Manejas objeciones típicas de frente: si dudan del costo, menciona el
  cotizador para un estimado rápido; si dudan de la confiabilidad,
  menciona que los agentes tienen patente aduanal vigente ante el SAT y
  que la comercializadora resuelve el caso de quien no tiene padrón.
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
  producto") y remite al cotizador (/cotizador.html) o a un agente
  para el monto real.
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
const GEMINI_MODEL = 'gemini-2.5-flash'; // modelo vigente con nivel gratuito
const MAX_MESSAGES = 16;       // cuántos turnos de conversación se reenvían como máximo
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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default {
  async fetch(request, env){
    const origin = request.headers.get('Origin') || '';
    const headers = corsHeaders(origin);

    if(request.method === 'OPTIONS'){
      return new Response(null, { status: 204, headers });
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

    if(messages.length === 0){
      return new Response(JSON.stringify({ error: 'Falta el campo messages' }), {
        status: 400, headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // límites básicos para evitar abuso / costos descontrolados
    const trimmed = messages.slice(-MAX_MESSAGES).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.text || '').slice(0, MAX_MESSAGE_LENGTH) }],
    }));

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
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text
        || 'No pude generar una respuesta. ¿Quieres escribirle directo a un agente por WhatsApp?';

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
