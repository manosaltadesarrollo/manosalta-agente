# manosalta-agente

Asistente virtual con IA para pacientes de **Cirugía de M.A.No - Salta** (Dr. Fernando Juarez Cesca).
Responde preguntas sobre el consultorio, ubicación, afecciones que se tratan y cómo pedir turno, y deriva a WhatsApp.
No diagnostica ni indica tratamientos, y ante una urgencia indica acudir a la guardia o llamar al 107.

## Cómo funciona

```
cirugiademanosalta.com  ──(chat-widget.js)──▶  Netlify Function /api/chat  ──▶  API de Claude
       (GitHub Pages)                            (guarda la clave de API)
```

| Archivo | Qué hace |
|---|---|
| `netlify/functions/chat.mts` | Endpoint `POST /api/chat`. Valida la conversación, llama a Claude y devuelve la respuesta en streaming (texto plano). |
| `netlify/functions/lib/prompt.ts` | **Instrucciones y datos del consultorio.** Es el archivo a editar para cambiar lo que sabe el asistente. |
| `public/chat-widget.js` | Botón y ventana de chat que se inserta en cualquier sitio con una línea. |
| `public/index.html` | Página de prueba del chat. |

## Desplegar en Netlify

1. Conseguí una clave de API en https://platform.claude.com (Settings → API Keys).
2. En Netlify: **Add new project → Import an existing project → GitHub → `manosalta-agente`**. La configuración de build se toma de `netlify.toml`.
3. En **Project configuration → Environment variables** agregá:
   - `ANTHROPIC_API_KEY` = tu clave (marcala como secreta).
   - `ALLOWED_ORIGINS` = `https://cirugiademanosalta.com,https://www.cirugiademanosalta.com` (opcional; ese es el valor por defecto).
   - `CLAUDE_MODEL` (opcional) = modelo a usar; por defecto `claude-opus-5-5`.
4. Desplegá y abrí `https://TU-PROYECTO.netlify.app` para probar el chat.

## Agregarlo al sitio web

En el repositorio `manosaltadesarrollo.github.io`, pegá antes de `</body>` en `index.html`:

```html
<script src="https://TU-PROYECTO.netlify.app/chat-widget.js" defer></script>
```

El botón aparece abajo a la **izquierda** para no tapar los botones de Registro y Ateneos. Para moverlo a la derecha, agregá `data-position="right"`.

## Completar datos pendientes

En `netlify/functions/lib/prompt.ts` hay campos marcados `[COMPLETAR]` (horarios, obras sociales, valor de la consulta).
Mientras estén así, el asistente dirá que no tiene ese dato y derivará a WhatsApp. Al hacer push, Netlify redespliega solo.

## Desarrollo local

```bash
npm install
npm run typecheck
npx netlify dev        # requiere ANTHROPIC_API_KEY en el entorno o en .env
```

## Costos y límites

- Cada mensaje es una llamada a la API de Claude (se cobra por tokens). Se usa esfuerzo `low` y respuestas breves para mantener el costo y la demora bajos, y se cachean las instrucciones del sistema.
- Se envían como máximo los últimos 20 mensajes y cada mensaje tiene un límite de 2000 caracteres.
- Recomendado: configurar un **límite de gasto mensual** en la consola de Claude, y en Netlify una regla de rate limiting para `/api/chat`.

## Privacidad

El widget guarda la conversación solo en la pestaña del navegador (`sessionStorage`) y el servidor no la almacena.
El asistente está instruido para no pedir datos sensibles. Conviene aclarar el uso del chat en la política de privacidad del sitio.
