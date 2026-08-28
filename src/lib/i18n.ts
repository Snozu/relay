/**
 * Interface copy in both languages.
 *
 * Deliberately a plain dictionary rather than an i18n framework. Two locales
 * and about forty strings do not justify a library, a build step and a new
 * concept to explain. If this grows past a third locale, revisit it.
 *
 * Note what is NOT translated: tool names, order numbers and document titles.
 * Those are identifiers. An operator who sees `get_order` in the activity
 * panel should see the same token in the audit log and in the source.
 */
export const LOCALES = ["en", "es"] as const;
export type Locale = (typeof LOCALES)[number];

export const STRINGS = {
  en: {
    subtitle: "Operations console · Harbor & Pine",
    orders: "orders",
    passages: "passages",
    inspect: "inspect",
    hide: "hide",

    eyebrow: "Grounded in live data · nothing invented",
    heading: "Ask about the business.",
    intro:
      "Relay coordinates two specialists: one reads Harbor & Pine's live order, shipment and ticket data, the other reads its policy documents. Watch the delegation happen on the right, and open any tool call to see exactly what it asked and got back.",
    starters: [
      "What is running late right now?",
      "What happened with HP-1042, and is she owed a refund?",
      "What is our policy when a package is damaged in transit?",
      "Give me an overview of the operation",
    ],
    composer: "Ask about orders, shipments, customers, tickets or policy…",
    send: "Send",
    routing: "Routing to a specialist",

    activity: "Agent activity",
    topology: "1 orchestrator · 2 specialists",
    activityEmpty:
      "Ask something and the delegation shows up here: which specialist was called, what it was asked, every tool it ran, and how long each took.",
    operationsSpecialist: "Operations specialist",
    knowledgeSpecialist: "Knowledge specialist",
    reportedBack: "specialist reported back",
    done: "done",
    writeOrchestrator: "write · orchestrator",
    notDelegated: "not delegated",

    tabKnowledge: "Knowledge",
    tabAudit: "Audit",
    tabData: "Data",
    refresh: "refresh",

    dropFile: "Drop a PDF, Markdown or text file here, or",
    chooseFile: "choose a file",
    uploadNote:
      "Up to 8MB. Processed on the server: extracted, chunked, embedded locally, stored in Postgres. No third party sees the contents.",
    processing: "Extracting text, splitting into passages and embedding…",
    indexedInto: (title: string, n: number) =>
      `${title} indexed into ${n} passages. Relay can answer from it now.`,
    libraryEmpty: "No documents yet. Upload one above and Relay can answer from it immediately.",
    remove: "remove",
    removing: "removing…",
    passagesCount: (n: number) => `${n} passages`,

    retrievalPreview: "Retrieval preview",
    retrievalNote:
      "The same search the knowledge specialist runs. Semantic finds meaning, keyword finds exact terms, and a passage found by both ranks highest. Retrieval is multilingual: ask in either language.",
    retrievalPlaceholder: "Ask the document library something…",
    retrieve: "Retrieve",
    noMatches: "Nothing in the library matched that.",
    fused: "hybrid vector + full-text, fused with reciprocal rank",

    auditEmpty: "No tool calls recorded yet.",
    businessData: "Business data",
    businessDataNote: "Live Postgres. Every read tool queries this directly.",
    knowledgeBase: "Knowledge base",
    knowledgeBaseNote: "Embedded locally with a multilingual model, stored as pgvector, same database.",
    activityStats: "Activity",
    activityNote: "Every tool call is recorded with its input, result and latency.",
    statOrders: "orders",
    statDelayed: "running late",
    statCustomers: "customers",
    statShipments: "shipments",
    statTickets: "support tickets",
    statRefunds: "refunds issued",
    statDocuments: "documents",
    statPassages: "passages indexed",
    statToolCalls: "tool calls",
    statLatency: "avg latency",

    approvalRequired: "Approval required",
    approvalIntro: "Relay wants to issue a refund. Nothing has been charged back yet.",
    order: "Order",
    amount: "Amount",
    reason: "Reason",
    approveRefund: "Approve refund",
    cancel: "Cancel",
    executing: "Approved. Executing the refund…",
    declined: "Declined. Nothing was written.",
    written: "Written to the audit log.",
    refundFailed: "The refund failed and nothing was written.",

    rag: {
      heading: "Inside retrieval",
      intro:
        "Two lanes that clients routinely conflate. The top runs once per document, when it is uploaded. The bottom runs on every question the knowledge specialist is asked.",
      ingestLane: "Ingestion · once per document",
      queryLane: "Query · every question",
      ingest: [
        { title: "Upload", sub: "PDF · Markdown · text" },
        { title: "Extract", sub: "unpdf / utf-8" },
        { title: "Chunk", sub: "~1000 chars, 150 overlap" },
        { title: "Embed", sub: "MiniLM multilingual, 384d" },
        { title: "Store", sub: "pgvector + tsvector" },
      ],
      query: [
        { title: "Question", sub: "any language" },
        { title: "Embed", sub: "same model, 384d" },
        { title: "Vector search", sub: "cosine · top 20" },
        { title: "Keyword search", sub: "tsvector BM25 · top 20" },
        { title: "Fuse", sub: "reciprocal rank · k=60" },
        { title: "Top passages", sub: "5, with source" },
      ],
      note:
        "Why both searches: vector similarity finds a passage that means the same thing in different words, and misses an exact SKU or status code. Full-text finds the exact token and misses the paraphrase. Reciprocal rank fusion merges the two rankings without needing to calibrate scores between two incomparable systems — a passage found by either rises, and one found by both rises further. Embeddings are computed in-process, so document contents never leave the server.",
    },

    viewConsole: "Console",
    viewArchitecture: "Architecture",
    archEyebrow: "How it is wired",
    archHeading: "One orchestrator, two specialists, one gate.",
    archIntro:
      "This is not a drawing of the system. It is the system: nodes light up as the agent runs, edges show the path a request actually took, and each specialist lists the tools it called with their real latency. Ask something in the console, then come back here.",
    archMcpBlocked: "write not exposed",
    archReadPath: "read path",
    archWritePath: "write path",
    archActive: "touched by the last request",
    archWriteNote:
      "The write path never passes through a specialist. issue_refund sits on the orchestrator, behind a human approval gate. No sub-agent can move money, and no amount of delegation can route around the gate — that is a property of the topology, not a setting.",
    arch: {
      mcpclient: {
        title: "MCP clients",
        sub: "Claude Desktop · Cursor · agents",
        detail: "Anything that speaks Model Context Protocol can connect to Relay and use its read tools inside whatever the client already works in.",
      },
      mcpendpoint: {
        title: "/api/mcp",
        sub: "8 read tools · no write",
        detail: "Exposes the read tools over MCP, straight to the data — the agents are not in this path. issue_refund is deliberately absent: the approval gate lives in Relay's own interface, so federating the write would hand an external client a way around it.",
      },
      browser: {
        title: "Browser",
        sub: "useChat · streaming UI parts",
        detail: "Holds the conversation and renders every tool result as a real component. The model chooses the tool; the frontend owns how it looks.",
      },
      gate: {
        title: "API route",
        sub: "rate limit · schema validation",
        detail: "Per-IP rate limits on chat, upload and retrieval, because a public demo URL is effectively a public API key. Every payload is schema-validated before anything downstream sees it.",
      },
      orchestrator: {
        title: "Relay orchestrator",
        sub: "routes · synthesises · owns the write",
        detail: "Reads the request, decides which specialist should handle it, and combines their findings into one answer in the operator's language. It also owns the single write tool.",
      },
      operations: {
        title: "Operations specialist",
        sub: "7 read tools · own context",
        detail: "Answers what actually happened: orders, shipments, customers, tickets, and the operational overview. Queries PostgreSQL directly and reports back in English.",
      },
      knowledge: {
        title: "Knowledge specialist",
        sub: "search_knowledge · own context",
        detail: "Answers what the rules say, from the company's uploaded documents. Never paraphrases a policy into something it does not say.",
      },
      approval: {
        title: "Human approval gate",
        sub: "issue_refund · not delegated",
        detail: "The agent proposes the refund with an amount grounded in the real order and a policy citation. Nothing is written until a person presses approve. Capped at the order total and idempotent.",
      },
      retrieval: {
        title: "Hybrid retrieval",
        sub: "pgvector + full-text · RRF",
        detail: "Vector similarity finds meaning, Postgres full-text finds exact terms, and reciprocal rank fusion merges them. Embeddings are multilingual and computed locally, so document contents never leave the server.",
      },
      database: {
        title: "PostgreSQL + pgvector",
        sub: "business data and embeddings, one store",
        detail: "Orders, shipments, customers, tickets, refunds and document vectors all live here. One thing to run, one thing to back up, one thing to explain.",
      },
      audit: {
        title: "Audit log",
        sub: "input · result · status · latency",
        detail: "Every tool call from every agent is recorded and readable in the console. This is what answers 'how do I know what it did?' after the fact.",
      },
    },

    moreRows: (n: number) => `+${n} more in the panel`,
    chartStatus: "Orders by status",
    chartCarrier: "Delays by carrier",
    chartTrend: "Volume, last 14 days",
    seriesOrders: "orders placed",
    seriesDelayed: "running late",
    tabSettings: "Settings",
    settingsTitle: "Model credentials",
    settingsIntro:
      "Point Relay at your own account and run it on your own tokens. Everything else in this console stays exactly the same.",
    usingServerKey: "Running on this deployment's own credentials.",
    usingOwnKey: (p: string) => `Running on your ${p} key. You are paying for these conversations.`,
    provider: "Provider",
    apiKey: "API key",
    useKey: "Use key",
    removeKey: "remove",
    model: "Model",
    modelCustom: "Other…",
    modelCustomPlaceholder: "Model id",
    providerDetected: (p: string) => `That key looks like ${p}. Provider selected for you.`,
    keyPrivacy:
      "Stored in this browser only, sent with each request and forwarded to the provider it belongs to. Never written to the database, never logged, never in the audit trail.",
    getKey: (p: string) => `Get a key from ${p}`,
    settingsSaved: "Saved.",

    preparing: "preparing",
    running: "running",
    waitingApproval: "waiting for approval",
    approved: "approved",
    declinedByOperator: "declined by operator",
    input: "input",
    result: "result",
  },

  es: {
    subtitle: "Consola de operaciones · Harbor & Pine",
    orders: "pedidos",
    passages: "pasajes",
    inspect: "inspeccionar",
    hide: "ocultar",

    eyebrow: "Fundamentado en datos en vivo · nada inventado",
    heading: "Pregunta sobre el negocio.",
    intro:
      "Relay coordina dos especialistas: uno lee los pedidos, envíos y tickets en vivo de Harbor & Pine, el otro lee sus documentos de política. Observa la delegación a la derecha, y abre cualquier llamada para ver exactamente qué pidió y qué recibió.",
    starters: [
      "¿Qué pedidos van retrasados ahorita?",
      "¿Qué pasó con HP-1042, y le debemos un reembolso?",
      "¿Cuál es nuestra política cuando un paquete se daña en tránsito?",
      "Dame un panorama general de la operación",
    ],
    composer: "Pregunta sobre pedidos, envíos, clientes, tickets o políticas…",
    send: "Enviar",
    routing: "Enrutando a un especialista",

    activity: "Actividad de agentes",
    topology: "1 orquestador · 2 especialistas",
    activityEmpty:
      "Pregunta algo y la delegación aparece aquí: qué especialista fue invocado, qué se le pidió, cada tool que ejecutó, y cuánto tardó cada una.",
    operationsSpecialist: "Especialista de operaciones",
    knowledgeSpecialist: "Especialista de conocimiento",
    reportedBack: "el especialista reportó",
    done: "listo",
    writeOrchestrator: "escritura · orquestador",
    notDelegated: "no delegado",

    tabKnowledge: "Conocimiento",
    tabAudit: "Auditoría",
    tabData: "Datos",
    refresh: "actualizar",

    dropFile: "Arrastra un PDF, Markdown o archivo de texto aquí, o",
    chooseFile: "elige un archivo",
    uploadNote:
      "Hasta 8MB. Se procesa en el servidor: se extrae, se parte en pasajes, se vectoriza localmente y se guarda en Postgres. Ningún tercero ve el contenido.",
    processing: "Extrayendo texto, partiendo en pasajes y vectorizando…",
    indexedInto: (title: string, n: number) =>
      `${title} indexado en ${n} pasajes. Relay ya puede responder con él.`,
    libraryEmpty: "Aún no hay documentos. Sube uno arriba y Relay podrá responder con él de inmediato.",
    remove: "eliminar",
    removing: "eliminando…",
    passagesCount: (n: number) => `${n} pasajes`,

    retrievalPreview: "Vista previa de recuperación",
    retrievalNote:
      "La misma búsqueda que hace el especialista de conocimiento. La semántica encuentra significado, la de palabra clave encuentra términos exactos, y un pasaje hallado por ambas queda hasta arriba. La recuperación es multilingüe: pregunta en cualquier idioma.",
    retrievalPlaceholder: "Pregúntale algo a la biblioteca de documentos…",
    retrieve: "Recuperar",
    noMatches: "Nada en la biblioteca coincidió con eso.",
    fused: "híbrido vectorial + texto completo, fusionado por rango recíproco",

    auditEmpty: "Aún no hay llamadas registradas.",
    businessData: "Datos de negocio",
    businessDataNote: "Postgres en vivo. Cada tool de lectura consulta esto directamente.",
    knowledgeBase: "Base de conocimiento",
    knowledgeBaseNote: "Vectorizado localmente con un modelo multilingüe, guardado como pgvector, misma base.",
    activityStats: "Actividad",
    activityNote: "Cada llamada queda registrada con su entrada, resultado y latencia.",
    statOrders: "pedidos",
    statDelayed: "retrasados",
    statCustomers: "clientes",
    statShipments: "envíos",
    statTickets: "tickets de soporte",
    statRefunds: "reembolsos emitidos",
    statDocuments: "documentos",
    statPassages: "pasajes indexados",
    statToolCalls: "llamadas a tools",
    statLatency: "latencia promedio",

    approvalRequired: "Requiere aprobación",
    approvalIntro: "Relay quiere emitir un reembolso. Todavía no se ha devuelto nada.",
    order: "Pedido",
    amount: "Monto",
    reason: "Motivo",
    approveRefund: "Aprobar reembolso",
    cancel: "Cancelar",
    executing: "Aprobado. Ejecutando el reembolso…",
    declined: "Rechazado. No se escribió nada.",
    written: "Registrado en la bitácora de auditoría.",
    refundFailed: "El reembolso falló y no se escribió nada.",

    rag: {
      heading: "Por dentro de la recuperación",
      intro:
        "Dos carriles que los clientes suelen confundir. El de arriba corre una vez por documento, al subirlo. El de abajo corre en cada pregunta que recibe el especialista de conocimiento.",
      ingestLane: "Ingesta · una vez por documento",
      queryLane: "Consulta · cada pregunta",
      ingest: [
        { title: "Subida", sub: "PDF · Markdown · texto" },
        { title: "Extracción", sub: "unpdf / utf-8" },
        { title: "Partición", sub: "~1000 chars, 150 traslape" },
        { title: "Vectorización", sub: "MiniLM multilingüe, 384d" },
        { title: "Almacén", sub: "pgvector + tsvector" },
      ],
      query: [
        { title: "Pregunta", sub: "cualquier idioma" },
        { title: "Vectorización", sub: "mismo modelo, 384d" },
        { title: "Búsqueda vectorial", sub: "coseno · top 20" },
        { title: "Búsqueda por término", sub: "tsvector BM25 · top 20" },
        { title: "Fusión", sub: "rango recíproco · k=60" },
        { title: "Mejores pasajes", sub: "5, con fuente" },
      ],
      note:
        "Por qué las dos búsquedas: la similitud vectorial encuentra un pasaje que significa lo mismo con otras palabras, y falla con un SKU exacto o un código de estado. La de texto completo encuentra el término exacto y falla con la paráfrasis. La fusión por rango recíproco combina ambos rankings sin tener que calibrar puntajes entre dos sistemas incomparables — un pasaje hallado por cualquiera sube, y uno hallado por ambos sube más. Los embeddings se calculan dentro del proceso, así que el contenido de los documentos nunca sale del servidor.",
    },

    viewConsole: "Consola",
    viewArchitecture: "Arquitectura",
    archEyebrow: "Cómo está cableado",
    archHeading: "Un orquestador, dos especialistas, una compuerta.",
    archIntro:
      "Esto no es un dibujo del sistema. Es el sistema: los nodos se encienden mientras el agente trabaja, las aristas muestran el camino que tomó la petición, y cada especialista lista las tools que llamó con su latencia real. Pregunta algo en la consola y regresa aquí.",
    archMcpBlocked: "escritura no expuesta",
    archReadPath: "ruta de lectura",
    archWritePath: "ruta de escritura",
    archActive: "tocado por la última petición",
    archWriteNote:
      "La ruta de escritura nunca pasa por un especialista. issue_refund vive en el orquestador, detrás de una compuerta de aprobación humana. Ningún subagente puede mover dinero, y ninguna cantidad de delegación puede rodear la compuerta — eso es una propiedad de la topología, no un ajuste.",
    arch: {
      mcpclient: {
        title: "Clientes MCP",
        sub: "Claude Desktop · Cursor · agentes",
        detail: "Cualquier cosa que hable Model Context Protocol puede conectarse a Relay y usar sus tools de lectura dentro de la herramienta que ya usa.",
      },
      mcpendpoint: {
        title: "/api/mcp",
        sub: "8 tools de lectura · sin escritura",
        detail: "Expone las tools de lectura por MCP, directo a los datos — los agentes no están en esta ruta. issue_refund está ausente a propósito: la compuerta de aprobación vive en la interfaz de Relay, así que federar la escritura le daría a un cliente externo una forma de rodearla.",
      },
      browser: {
        title: "Navegador",
        sub: "useChat · partes de UI en streaming",
        detail: "Sostiene la conversación y renderiza cada resultado de tool como un componente real. El modelo elige la tool; el frontend decide cómo se ve.",
      },
      gate: {
        title: "Ruta de API",
        sub: "límite de tasa · validación de esquema",
        detail: "Límites por IP en chat, subida y recuperación, porque una URL de demo pública es en la práctica una API key pública. Todo payload se valida contra un esquema antes de que algo aguas abajo lo vea.",
      },
      orchestrator: {
        title: "Orquestador Relay",
        sub: "enruta · sintetiza · posee la escritura",
        detail: "Lee la petición, decide qué especialista la atiende, y combina sus hallazgos en una respuesta en el idioma del operador. También posee la única tool de escritura.",
      },
      operations: {
        title: "Especialista de operaciones",
        sub: "7 tools de lectura · contexto propio",
        detail: "Responde qué pasó realmente: pedidos, envíos, clientes, tickets y el panorama operativo. Consulta PostgreSQL directo y reporta en inglés.",
      },
      knowledge: {
        title: "Especialista de conocimiento",
        sub: "search_knowledge · contexto propio",
        detail: "Responde qué dicen las reglas, desde los documentos subidos por la empresa. Nunca parafrasea una política hacia algo que no dice.",
      },
      approval: {
        title: "Compuerta de aprobación humana",
        sub: "issue_refund · no delegado",
        detail: "El agente propone el reembolso con un monto anclado al pedido real y una cita de política. No se escribe nada hasta que una persona aprueba. Topado al total del pedido e idempotente.",
      },
      retrieval: {
        title: "Recuperación híbrida",
        sub: "pgvector + texto completo · RRF",
        detail: "La similitud vectorial encuentra significado, el texto completo de Postgres encuentra términos exactos, y la fusión por rango recíproco los combina. Los embeddings son multilingües y se calculan localmente, así que el contenido nunca sale del servidor.",
      },
      database: {
        title: "PostgreSQL + pgvector",
        sub: "datos de negocio y embeddings, un solo almacén",
        detail: "Pedidos, envíos, clientes, tickets, reembolsos y vectores de documentos viven aquí. Una sola cosa que operar, respaldar y explicar.",
      },
      audit: {
        title: "Bitácora de auditoría",
        sub: "entrada · resultado · estado · latencia",
        detail: "Cada llamada a tool de cada agente queda registrada y es legible desde la consola. Esto es lo que responde '¿cómo sé qué hizo?' después del hecho.",
      },
    },

    moreRows: (n: number) => `+${n} más en el panel`,
    chartStatus: "Pedidos por estado",
    chartCarrier: "Retrasos por transportista",
    chartTrend: "Volumen, últimos 14 días",
    seriesOrders: "pedidos creados",
    seriesDelayed: "retrasados",
    tabSettings: "Ajustes",
    settingsTitle: "Credenciales del modelo",
    settingsIntro:
      "Apunta Relay a tu propia cuenta y córrelo con tus tokens. Todo lo demás en esta consola sigue exactamente igual.",
    usingServerKey: "Corriendo con las credenciales de este despliegue.",
    usingOwnKey: (p: string) => `Corriendo con tu key de ${p}. Estas conversaciones las estás pagando tú.`,
    provider: "Proveedor",
    apiKey: "API key",
    useKey: "Usar key",
    removeKey: "quitar",
    model: "Modelo",
    modelCustom: "Otro…",
    modelCustomPlaceholder: "ID del modelo",
    providerDetected: (p: string) => `Esa key parece de ${p}. Se seleccionó el proveedor por ti.`,
    keyPrivacy:
      "Se guarda solo en este navegador, se manda con cada petición y se reenvía únicamente al proveedor al que pertenece. Nunca se escribe en la base de datos, ni en logs, ni en la auditoría.",
    getKey: (p: string) => `Consigue una key de ${p}`,
    settingsSaved: "Guardado.",

    preparing: "preparando",
    running: "ejecutando",
    waitingApproval: "esperando aprobación",
    approved: "aprobado",
    declinedByOperator: "rechazado por el operador",
    input: "entrada",
    result: "resultado",
  },
} as const;

export type Strings = (typeof STRINGS)["en"];
