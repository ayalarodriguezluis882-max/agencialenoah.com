# LENO IA — cómo poner el chatbot en línea (paso a paso)

El sitio (GitHub Pages) solo puede servir archivos estáticos — no puede
guardar una API key de forma segura. Por eso el chatbot necesita una
pieza extra, gratuita, que corre por separado: un **Cloudflare Worker**.
Ahí vive la API key de Gemini, nunca en el navegador del cliente.

Son ~15 minutos, todo desde el navegador, sin instalar nada.

---

## Parte 1 — Consigue tu API key de Gemini (gratis)

1. Ve a **[aistudio.google.com](https://aistudio.google.com)** y entra con
   una cuenta de Google (no pide tarjeta para el nivel gratuito).
2. Busca **"Get API key"** (usualmente arriba a la izquierda).
3. Créala, y **cópiala** — la vas a necesitar en la Parte 2. Guárdala en
   un lugar seguro, no la compartas ni la subas a GitHub.

> El nivel gratuito de Gemini alcanza perfectamente para un chat de sitio
> web de este tamaño. Si algún día lo superas, Google te avisa antes de
> cobrarte — no hay cobros sorpresa.

---

## Parte 2 — Crea el Worker en Cloudflare (gratis)

1. Ve a **[dash.cloudflare.com](https://dash.cloudflare.com)** y crea una
   cuenta gratis (o entra si ya tienes una).
2. En el menú lateral, busca **"Workers & Pages"**.
3. Clic en **"Create"** → **"Create Worker"**.
4. Ponle un nombre, por ejemplo `leno-ia` (va a quedar parte de tu URL,
   algo como `leno-ia.tu-usuario.workers.dev`).
5. Clic en **"Deploy"** (te va a crear un Worker de ejemplo — está bien,
   lo vamos a reemplazar).
6. Una vez creado, clic en **"Edit code"** (o "Quick edit").
7. **Borra todo** el código de ejemplo que aparece en el editor.
8. Abre el archivo `worker/leno-ia-worker.js` de este repo, copia
   **todo** su contenido, y pégalo en el editor de Cloudflare.
9. Clic en **"Deploy"** (o "Save and deploy").

## Parte 3 — Configura tu API key como secreto

Nunca la pegues directo en el código — Cloudflare tiene un lugar seguro
para esto:

1. En tu Worker, ve a **"Settings"** → **"Variables and Secrets"**
   (el nombre exacto puede variar un poco según la versión del panel).
2. Agrega una nueva variable:
   - **Nombre:** `GEMINI_API_KEY`
   - **Valor:** pega la API key que copiaste en la Parte 1
   - Márcala como **"Encrypt"** / **"Secret"** si te da la opción.
3. Guarda. Puede que te pida volver a desplegar el Worker — hazlo.

## Parte 4 — Copia la URL de tu Worker

En el dashboard de tu Worker vas a ver su URL pública, algo como:

```
https://leno-ia.TU-USUARIO.workers.dev
```

Cópiala completa.

## Parte 5 — Conecta el sitio con tu Worker

1. Abre `assets/chat-widget.js` (en tu computadora, con el Bloc de
   notas o cualquier editor de texto).
2. Busca esta línea, cerca del inicio:
   ```js
   const LENO_IA_ENDPOINT = 'https://REEMPLAZA-CON-TU-WORKER.workers.dev/';
   ```
3. Reemplaza la URL de ejemplo por la tuya (la de la Parte 4), dejando
   las comillas:
   ```js
   const LENO_IA_ENDPOINT = 'https://leno-ia.tu-usuario.workers.dev/';
   ```
4. Guarda el archivo.

## Parte 6 — Sube el cambio a GitHub

Mismo proceso de siempre: sube el `assets/chat-widget.js` actualizado a
tu repositorio (Add file → Upload files, o reemplazando el archivo
directo en GitHub). Espera 1-2 minutos a que se publique.

## Parte 7 — Pruébalo

Abre tu sitio publicado, dale clic al botón redondo naranja abajo a la
derecha (el avatar de LENO IA), y escríbele algo como "¿qué necesito
para importar un carro?". Debería responder en unos segundos.

---

## Si algo no funciona

- **El botón de chat no aparece:** revisa que `assets/chat-widget.js` se
  haya subido correctamente y que el `<script>` esté antes de `</body>`
  en el HTML (ya viene así en las 4 páginas).
- **Dice "Todavía no estoy conectado a mi cerebro de IA":** significa que
  `LENO_IA_ENDPOINT` todavía tiene la URL de ejemplo — revisa la Parte 5.
- **Error de CORS en la consola del navegador (F12):** revisa que el
  Worker esté desplegado y responda. El código ya incluye los headers
  de CORS necesarios.
- **"Error de Gemini" o similar:** casi siempre es que `GEMINI_API_KEY`
  no quedó bien guardada en el Worker — repite la Parte 3.
- **Quieres probar el Worker directo, sin el sitio:** desde una terminal
  o [Postman](https://www.postman.com/), manda un POST a la URL de tu
  Worker con este cuerpo:
  ```json
  { "messages": [{ "role": "user", "text": "hola" }] }
  ```
  Deberías recibir `{ "reply": "..." }`.

## Seguridad y costos

- La API key **nunca** queda visible en el navegador ni en GitHub — solo
  vive dentro de Cloudflare, como secreto.
- El Worker tiene límites básicos integrados (máximo de mensajes por
  conversación y de caracteres por mensaje) para evitar que alguien
  abuse del chat y te genere costos altos.
- Para una capa extra de protección, en Cloudflare puedes crear una
  **Rate Limiting Rule** (Security → WAF → Rate limiting rules) que
  limite cuántas veces puede escribir la misma persona por minuto —
  recomendable si el sitio empieza a tener tráfico real.
- Si algún día quieres apagar el chatbot sin tocar el sitio, basta con
  pausar o eliminar el Worker en Cloudflare.

## Ajustar el "cerebro" de LENO IA

Todo el contenido y las reglas de comportamiento están en
`worker/leno-ia-worker.js`, dentro de la constante `SYSTEM_PROMPT` al
inicio del archivo. Puedes editarlo libremente (agregar más info de la
empresa, cambiar el tono, agregar restricciones) y volver a pegarlo en
el editor de Cloudflare — no necesitas tocar nada del sitio en GitHub
Pages para estos cambios.

**Sobre la personalidad:** LENO IA está configurado como un
especialista en comercio exterior con mentalidad de ventas —
califica al visitante, maneja objeciones y cierra hacia WhatsApp
activamente. La única línea que no crucé: si alguien le pregunta
directo si es una IA, lo confirma. No lo configuré para fingir ser
una persona — además de ser una práctica deshonesta hacia el cliente,
ya hay reglas de protección al consumidor en México que empiezan a
exigir que un bot lo diga si se lo preguntan directamente. Puede
seguir vendiendo con toda confianza justo después de aclararlo.
