# Lenoah — Sitio web

Sitio para Lenoah (agencia aduanal y consorcio de comercio exterior, cruce
Tijuana–San Diego). Ahora es **multipágina** (no solo anchors de una sola
página) para sentirse más como un sitio corporativo serio: `index.html` es
la página principal/operaciones, y `nosotros.html` es una página propia con
misión, visión, trayectoria y valores.

El protagonista es Lenoah y sus operaciones: importación de vehículos,
mercancía y carga comercial, gestoría aduanal integral, y asesoría en
comercio exterior — con agentes certificados detrás de cada pedimento.

**LENO IA** (el asistente por WhatsApp) aparece como una herramienta de apoyo a ventas
dentro de un módulo secundario ("Atención 24/7"), no como el tema central de la página.

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

Para agregar una cuarta página, copia el `<head>` y el `<header>`/`<footer>`
de `nosotros.html` o `servicios.html` (ya usan rutas relativas correctas) y
enlázala desde el nav de las tres páginas existentes.

## Estructura de archivos

```
/
├── index.html          # Página principal
├── nosotros.html        # Página "Quiénes somos" (misión, visión, trayectoria)
├── servicios.html        # Página de servicios a detalle
├── assets/
│   ├── styles.css        # CSS compartido entre todas las páginas
│   ├── logo.png / logo-icon.png
│   └── leno-ia-avatar.png / leno-ia-bot.jpg
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

- [ ] Reemplazar número de WhatsApp placeholder (`526640000000`) en `index.html`
- [ ] Agregar correo y dirección real en la sección de contacto y footer
- [ ] Confirmar si "Sectores" refleja los verticales reales que atiende Lenoah
- [ ] Revisar el texto de Misión, Visión y Trayectoria en `nosotros.html` — lo redacté yo con lo que sabía del negocio; ajústalo si algo no encaja con cómo se ven a sí mismos
- [ ] Conectar el botón de WhatsApp al número/bot real de LENO IA (WhatsApp Business)
- [ ] Configurar Google Analytics / Search Console (como en simuladordepedimento.com)

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
