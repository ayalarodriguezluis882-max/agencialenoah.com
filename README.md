# Lenoah — Sitio web

Sitio para Lenoah (agencia aduanal y consorcio de comercio exterior, cruce
Tijuana–San Diego). Ahora es **multipágina** (no solo anchors de una sola
página) para sentirse más como un sitio corporativo serio: `index.html` es
la página principal/operaciones, y `nosotros.html` es una página propia con
misión, visión, trayectoria y valores.

El protagonista es Lenoah y sus operaciones: importación de vehículos,
mercancía y carga comercial, gestoría aduanal integral, y asesoría en
comercio exterior — con agentes certificados detrás de cada pedimento.

**LENO IA** ahora es un **chatbot real** (conectado a Gemini vía un backend
en Cloudflare Workers), no solo un link a WhatsApp — ver la sección
"Chatbot LENO IA" más abajo. En el sitio aparece como un botón flotante
en las 4 páginas, además del módulo de "Atención 24/7" en `index.html`.

El fondo del hero (solo en `index.html`) es un canvas animado estilo fotografía
de larga exposición: estelas de luz cruzando en ambos sentidos (México ⇄ EE. UU.),
reflejo tenue en el piso y siluetas de caseta/postes de garita. Respeta
`prefers-reduced-motion` mostrando un frame estático.

## Páginas

**`index.html`** — página principal
1. Hero — quiénes somos + fondo animado de cruce nocturno (estelas de luz)
2. Servicios (4 líneas, con ícono cada una)
3. Cómo operamos (los 4 "carriles" del proceso)
4. Sectores que atendemos
5. Respaldo / credenciales
6. Padrones sectoriales y servicio de comercializadora
7. Tips para tu primera importación (6 tarjetas)
8. Preguntas frecuentes (acordeón, `<details>`/`<summary>` nativo, sin JS extra)
9. Módulo LENO IA (compacto, secundario)
10. CTA final + footer

**`nosotros.html`** — página "Quiénes somos"
1. Banner de página (sin canvas, más liviano)
2. Trayectoria / experiencia operativa + credenciales
3. Misión y visión (2 tarjetas)
4. Valores (chips)
5. CTA final + footer

**`servicios.html`** — página de servicios a detalle
1. Banner de página
2. Las 4 líneas de servicio, cada una con descripción larga + checklist de "qué incluye"
3. Resumen de padrones sectoriales/comercializadora con link a `index.html#padrones`
4. CTA final + footer

**Cotizador virtual — retirado del sitio (Agosto 2026).** Existió como
`cotizador.html`, un formulario multi-paso que daba un rango estimado de
impuestos según un % fijo sobre el valor declarado. Se quitó porque no
validaba si la mercancía tenía alguna regulación o estaba prohibida antes
de calcular — daba un número aunque el producto no se pudiera importar.
El archivo original queda respaldado fuera del repo por si se retoma más
adelante con una lógica que sí revise restricciones antes de estimar.
LENO IA (el chatbot) es ahora el único punto de cotización del sitio, y
su system prompt (`worker/leno-ia-worker.js`) ya incluye la regla de
nunca calcular ni prometer un impuesto sin antes confirmar que el
producto no está prohibido o restringido.

Para agregar una quinta página, copia el `<head>` y el `<header>`/`<footer>`
de cualquiera de las páginas existentes (ya usan rutas relativas correctas)
y enlázala desde el nav de todas.

## Chatbot LENO IA

El widget de chat flotante (`assets/chat-widget.js`) aparece en las 4
páginas. Habla con un backend separado en Cloudflare Workers
(`worker/leno-ia-worker.js`) que a su vez llama a la API de Gemini —
la API key nunca queda expuesta en el sitio estático.

**Este backend no se despliega solo con subir archivos a GitHub** —
necesita configurarse una vez en una cuenta de Cloudflare (gratis).
Sigue **`worker/README.md`** paso a paso (~15 minutos, sin instalar nada).

Hasta que se configure, el widget sigue siendo útil: se muestra igual,
pero en vez de fallar le avisa al visitante que escriba a un agente por
WhatsApp.

## Estructura de archivos

```
/
├── index.html            # Página principal
├── nosotros.html          # Página "Quiénes somos" (misión, visión, trayectoria)
├── servicios.html          # Página de servicios a detalle
├── assets/
│   ├── styles.css          # CSS compartido entre todas las páginas
│   ├── chat-widget.js      # Widget de chat flotante (LENO IA)
│   ├── logo.png / logo-icon.png
│   └── leno-ia-avatar.png / leno-ia-bot.jpg
├── worker/
│   ├── leno-ia-worker.js   # Backend del chatbot (se despliega en Cloudflare)
│   └── README.md           # Cómo desplegarlo, paso a paso
└── README.md
```

El CSS vive en un solo archivo compartido (`assets/styles.css`) para que
cualquier ajuste de marca (color, tipografía, espaciados) se aplique a
todas las páginas a la vez, sin duplicar estilos.

## Padrones sectoriales

Lenoah cuenta con Padrón General de Importadores y un amplio catálogo de
Padrones de Sectores Específicos vigentes (sin listar sectores puntuales en
el copy, para no acotar de más ni quedar desactualizado). Esto está reflejado
en la sección "Padrones y comercializadora" y en los tips de primera importación.

## Branding

Paleta tomada del logo real de Lenoah (`assets/logo.png`):
- Naranja de marca: `#E67E22` (botones, acentos, íconos de servicio)
- Amarillo de marca: `#F7C331` (detalles, etiquetas sobre fondo oscuro, luces de postes)
- Fondo oscuro cálido: `#211609` / `#150D05` (en vez del navy genérico anterior)

Las estelas de luz del fondo usan blanco cálido (saliendo) y ámbar-rojizo (entrando)
para diferenciar los dos sentidos del cruce, no son un color de marca literal.

`assets/logo-icon.png` es un recorte del ícono (sin el wordmark) con fondo
transparente, generado a partir del logo original para usarse en el nav/footer/favicon.

## Personaje LENO IA

`assets/leno-ia-avatar.png` es un recorte circular del rostro del mascota,
usado como avatar en el módulo de "Atención 24/7". `assets/leno-ia-bot.jpg`
(la imagen de cuerpo completo) se quedó en el repo por si se usa en otro lugar
(redes sociales, sección "nosotros" ampliada), pero ya no aparece como elemento
protagónico de la página.

## Pendientes antes de publicar

- [x] Reemplazar número de WhatsApp placeholder por el real (`526645870430`)
- [x] Agregar dirección real de la oficina en el footer
- [x] Conectar redes sociales (Instagram, Facebook, YouTube, TikTok) en el footer
- [x] Desplegar el backend del chatbot — ya está en producción (`leno-ia.agencialenoah.workers.dev`)
- [ ] Agregar correo real si `hola@lenoah.mx` no es la cuenta definitiva
- [ ] Confirmar si "Sectores" refleja los verticales reales que atiende Lenoah
- [ ] Revisar el texto de Misión, Visión y Trayectoria en `nosotros.html` — lo redacté yo con lo que sabía del negocio; ajústalo si algo no encaja con cómo se ven a sí mismos
- [ ] Conectar WhatsApp Business (número real ya definido: 664 587 0430) al mismo chatbot — pendiente de que llegue el chip/verificación
- [ ] Configurar Google Analytics / Cloudflare Web Analytics para medir tráfico
- [ ] Comprar y conectar el dominio .com — planeado como el último paso

## Desarrollo local

Es un solo archivo estático, no necesita build. Para verlo localmente:

```bash
python3 -m http.server 8080
# abrir http://localhost:8080
```

## Publicar con GitHub Pages

1. Push a la rama `main`.
2. En GitHub → Settings → Pages → Source: rama `main`, carpeta `/ (root)`.
3. Una vez activo, apuntar el dominio (ej. `lenoah.mx`) desde el proveedor del dominio con un registro CNAME hacia `usuario.github.io`, igual que se hizo con `simuladordepedimento.com`.
