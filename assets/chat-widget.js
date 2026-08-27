/**
 * LENO IA — widget de chat flotante
 * ------------------------------------------------------------
 * Se incluye con <script src="assets/chat-widget.js"> antes de
 * </body> en cada página. Construye el botón flotante y el panel
 * de chat, y los inyecta en el DOM (así no hay que repetir el
 * HTML del widget en cada página).
 */
(function(){
  const LENO_IA_ENDPOINT = 'https://leno-ia.agencialenoah.workers.dev/';
  const WHATSAPP_NUMBER = '526645870430';
  const AVATAR = 'assets/leno-ia-avatar.png';
  const AVATAR_VIDEO = 'assets/bot-avatar.mp4';
  const AVATAR_VIDEO_POSTER = 'assets/bot-avatar-poster.jpg';

  const NOT_CONFIGURED = LENO_IA_ENDPOINT.includes('REEMPLAZA-CON-TU-WORKER');

  // id de sesión: agrupa los mensajes de esta visita en la bitácora
  // del panel de administrador (/admin en el Worker). Vive solo en
  // memoria del navegador, no se guarda en ningún lado del cliente.
  const sessionId = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));

  // ---------- construir el DOM del widget ----------
  const btn = document.createElement('button');
  btn.className = 'leno-widget-btn';
  btn.setAttribute('aria-label', 'Abrir chat con LENO IA');
  btn.innerHTML = `<video autoplay muted loop playsinline preload="auto" poster="${AVATAR_VIDEO_POSTER}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;pointer-events:none;"><source src="${AVATAR_VIDEO}" type="video/mp4"></video><span class="dot"></span>`;

  const panel = document.createElement('div');
  panel.className = 'leno-widget-panel';
  panel.innerHTML = `
    <div class="leno-w-header">
      <img src="${AVATAR}" alt="LENO IA">
      <div class="info">
        <strong>LENO IA</strong>
        <span>Asistente de Lenoah · en línea</span>
      </div>
      <button class="close" aria-label="Cerrar chat">&times;</button>
    </div>
    <div class="leno-w-body" id="leno-w-body"></div>
    <div class="leno-w-foot">
      <div class="leno-w-input-row">
        <input type="text" id="leno-w-input" placeholder="Escribe tu pregunta..." autocomplete="off">
        <button id="leno-w-send" aria-label="Enviar">→</button>
      </div>
      <div class="leno-w-wa-link">
        ¿Prefieres hablar con un agente? <a href="https://wa.me/${WHATSAPP_NUMBER}" target="_blank" rel="noopener">WhatsApp</a>
      </div>
    </div>
  `;

  document.body.appendChild(panel);
  document.body.appendChild(btn);

  // ---------- globo de saludo automático (le da "vida" al botón) ----------
  const hint = document.createElement('div');
  hint.className = 'leno-widget-hint';
  hint.innerHTML = `¿Tienes dudas sobre importar? Pregúntame 👋<button aria-label="Cerrar aviso">&times;</button>`;
  document.body.appendChild(hint);

  let hintTimer = setTimeout(() => {
    if(!panel.classList.contains('open')){
      hint.classList.add('show');
      hintAutoHide = setTimeout(() => hint.classList.remove('show'), 9000);
    }
  }, 3500);
  let hintAutoHide = null;

  function hideHint(){
    hint.classList.remove('show');
    clearTimeout(hintTimer);
    clearTimeout(hintAutoHide);
  }

  hint.addEventListener('click', (e) => {
    if(e.target.tagName === 'BUTTON'){ hideHint(); return; }
    hideHint();
    openPanel();
  });

  const body = panel.querySelector('#leno-w-body');
  const input = panel.querySelector('#leno-w-input');
  const sendBtn = panel.querySelector('#leno-w-send');
  const closeBtn = panel.querySelector('.close');

  let history = []; // [{role:'user'|'assistant', text:'...'}]
  let waitingReply = false;
  let opened = false;

  function addMessage(text, who){
    const div = document.createElement('div');
    div.className = 'leno-w-msg ' + who;
    div.textContent = text;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
    return div;
  }

  function showTyping(){
    const div = document.createElement('div');
    div.className = 'leno-w-msg typing';
    div.innerHTML = '<span></span><span></span><span></span>';
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
    return div;
  }

  function openPanel(){
    panel.classList.add('open');
    if(!opened){
      opened = true;
      addMessage('Hola, soy LENO IA 👋 Puedo ayudarte con dudas sobre importar vehículos, mercancía o carga comercial. ¿Qué necesitas?', 'bot');
    }
    input.focus();
  }

  btn.addEventListener('click', () => { hideHint(); openPanel(); });
  closeBtn.addEventListener('click', () => panel.classList.remove('open'));

  async function sendMessage(){
    const text = input.value.trim();
    if(!text || waitingReply) return;

    addMessage(text, 'user');
    history.push({ role: 'user', text });
    input.value = '';

    if(NOT_CONFIGURED){
      addMessage('Todavía no estoy conectado a mi cerebro de IA (falta configurar el servidor). Mientras tanto, escríbele directo a un agente por WhatsApp con el link de abajo 👇', 'bot');
      return;
    }

    waitingReply = true;
    sendBtn.disabled = true;
    const typingEl = showTyping();

    try{
      const res = await fetch(LENO_IA_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, session_id: sessionId }),
      });
      const data = await res.json();
      typingEl.remove();

      if(!res.ok || !data.reply){
        addMessage('Tuve un problema para responder. ¿Quieres escribirle a un agente por WhatsApp?', 'bot');
      } else {
        addMessage(data.reply, 'bot');
        history.push({ role: 'assistant', text: data.reply });
      }
    } catch(err){
      typingEl.remove();
      addMessage('No pude conectarme en este momento. Prueba escribiéndole a un agente por WhatsApp 👇', 'bot');
    } finally {
      waitingReply = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', (e) => {
    if(e.key === 'Enter') sendMessage();
  });
})();
