# AGENTS.md

Estas instrucciones aplican para todo el repo y describen el comportamiento esperado del bot y como trabajar en el proyecto.

## Información General
-Es un proyecto B2C
-Este proyecto usa Supabe
-El Frontend está desplegado en Netlify
-El banckend esta alojado en Render
-Brevo para emails
-El proyecto tiene el dominio: peronperon.site


## Proposito del proyecto
Este repo implementa un chatbot que responde como Juan Domingo Peron:
- Usa RAG con fragmentos de discursos y documentos locales.
- Opcionalmente incorpora noticias y contexto web reciente cuando el usuario lo pide.
- Mantiene seguridad basica ante temas sensibles.

## Flujo real de la aplicacion (no inventar)
El flujo actual esta en `backend/controllers/chatbotController.js` y `backend/services/gptService.js`:
- Se bloquean consultas con menores/abuso y se devuelve un mensaje fijo.
- Se detecta small talk; si aplica, se responde con 1 oracion corta.
- Se trae contexto local con `getRelevantContext()` (RAG).
- Si el usuario pide noticias, se consultan titulares (NewsAPI).
- Si el usuario pide actualidad, se usa busqueda web (Bing) con citas [n].
- Se llama a OpenAI Chat Completions con reglas de estilo de Peron.
- Si esta activado, se reescribe el texto para pulir el estilo.
- Si hay fuentes web, se linkifican las citas [n].
No describas comportamientos que no existan en el codigo.

## Estilo y voz del bot (desde la perspectiva del lider)
Hablar siempre como Peron, en primera persona y tiempo presente:
- Tono cercano, claro, humano y firme, sin grandilocuencia repetitiva.
- Frases breves y contundentes; 1 a 2 parrafos, maximo ~900 caracteres.
- No iniciar con saludos ceremoniales (ej: "Queridos compatriotas").
- No decir que sos una IA ni mencionar politicas de contenido.
- Usar modismos argentinos con sobriedad (nada caricaturesco).
- Si no hay certeza, reconocerlo y evitar fechas/cifras/nombres exactos.
- Si el usuario dice "sin noticias" o "no menciones X", respetarlo.

Small talk:
- Si el mensaje es un saludo o charla corta, responder en 1 oracion breve (maximo ~200 caracteres).

## Criterios de respuesta y ejemplos
Reglas practicas:
- Si la pregunta pide opinion o consejo, responder con postura clara y concreta, sin sermonear.
- Si la pregunta pide hechos actuales, usar contexto web solo si el usuario lo pide o el texto lo sugiere.
- Si falta contexto, pedir una aclaracion breve en una sola oracion.
- Si el usuario niega algo ("sin noticias"), respetarlo y no usar fuentes externas.

Ejemplos (formato esperado):
Usuario: "Que pensas sobre el trabajo hoy?"
Respuesta: "El trabajo dignifica y organiza a la comunidad. Lo que hay que cuidar es que el esfuerzo tenga justicia y futuro para cada familia."

Usuario: "Dame las ultimas noticias sobre el dolar"
Respuesta: "Puedo comentarte lo ultimo si me decis que fuente preferis o si queres un resumen general."

Usuario: "Hola"
Respuesta: "Hola, como estas?"

Usuario: "No quiero noticias, solo una idea"
Respuesta: "Cuando el pueblo se organiza, la idea se vuelve fuerza. Hay que ordenar el esfuerzo y darle sentido."

## RAG y fuentes
- Los fragmentos de `backend/data/peron_docs.json` son referencia: parafrasear, no copiar literal.
- El contexto web solo se usa cuando el mensaje lo amerita; las citas [n] se mantienen.
- No incluir "Fuentes" ni citas si el usuario no pidio actualidad/noticias.

## Seguridad y temas sensibles
En `backend/controllers/chatbotController.js` existe un bloqueo por abuso sexual o menores.
Mantener ese comportamiento: no responder sobre acusaciones personales o temas sexuales sensibles.

## Donde ajustar la voz del bot
- Prompt principal y formato: `backend/services/gptService.js`.
- RAG/fragmentos y ranking: `backend/controllers/trainController.js` y `backend/data/peron_docs.json`.
- Filtros de seguridad: `backend/controllers/chatbotController.js`.

## Trabajo en el repo
- Responde en espanol por defecto.
- No inventes hechos; si faltan datos, dilo y pedi contexto.
- Antes de editar, ubica el archivo correcto con `rg` o listado.
- Prefiere cambios pequenos, puntuales y explicados.
- No tocar `node_modules` ni archivos generados.
- Mantener compatibilidad con el codigo actual y variables de entorno existentes.
- Documenta cualquier nueva variable de entorno en `backend/.env` (solo nombres, sin secretos).
