/**
 * Motor de respaldo IA usando OpenRouter (Modelos de Visión Gratuitos/Baratos)
 * Prompt adaptado específicamente para recibos COREMAR
 */

import { validarLecturaIA, type ReciboCOREMAR } from "./coremar-ocr";

// Puedes obtener una API Key gratis en https://openrouter.ai/
// Modelos gratuitos o muy baratos que leen bien imágenes: 
// "qwen/qwen-2-vl-7b-instruct:free" o "meta-llama/llama-3.2-11b-vision-instruct:free"
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || "tu_api_key_aqui"; 
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

const PROMPT_COREMAR = `Eres un experto en lectura de recibos portuarios (específicamente COREMAR). Tu trabajo es extraer datos de una foto de un recibo, que puede tener texto impreso y manuscrito.

CAMPOS A EXTRAER (Devuelve SOLO un JSON válido, sin markdown):
{
  "numeroRecibo": {"valor": "5 dígitos", "texto_original": "fragmento exacto de la imagen", "confianza": "alta|media|baja", "requiere_revision": false},
  "fecha": {"valor": "DD/MM/YY o DD-MM-YY", "texto_original": "fragmento exacto", "confianza": "alta|media|baja", "requiere_revision": false},
  "proveedor": {"valor": "ej: CARGO PORT", "texto_original": "fragmento exacto", "confianza": "alta|media|baja", "requiere_revision": false},
  "motonave": {"valor": "Nombre del buque", "texto_original": "fragmento exacto", "confianza": "alta|media|baja", "requiere_revision": false},
  "equipo": {"valor": "ej: TC-02, CL-1611", "texto_original": "fragmento exacto", "confianza": "alta|media|baja", "requiere_revision": false},
  "horaInicio": {"valor": "HH:MM", "texto_original": "fragmento exacto", "confianza": "alta|media|baja", "requiere_revision": false},
  "horaFinal": {"valor": "HH:MM", "texto_original": "fragmento exacto", "confianza": "alta|media|baja", "requiere_revision": false},
  "detenciones": {"valor": "ej: 1H ALIMENTO, 1 HR HSEQ", "texto_original": "fragmento exacto", "confianza": "alta|media|baja", "requiere_revision": false},
  "operador": {"valor": "Nombre completo", "texto_original": "fragmento exacto", "confianza": "alta|media|baja", "requiere_revision": false},
  "tipoCarga": {"valor": "ej: ACERO, MAIZ, TRIGO", "texto_original": "fragmento exacto", "confianza": "alta|media|baja", "requiere_revision": false},
  "observaciones": {"valor": "texto de observaciones", "texto_original": "fragmento exacto", "confianza": "alta|media|baja", "requiere_revision": false},
  "texto_crudo": "TRANSCRIPCIÓN LITERAL de TODO el texto visible en el recibo, línea por línea."
}

REGLAS CRÍTICAS:
1. NO inventes datos. Si no ves un campo, su "valor" y "texto_original" deben ser null.
2. "equipo" suele ser un código como TC-02, TC02, CL-1611.
3. "detenciones" suele ser "1H ALIMENTO" o "1 HR HSEQ".
4. "texto_crudo" debe ser una transcripción completa, es vital para la validación.
5. Responde SOLO con el objeto JSON, sin \`\`\`json ni explicaciones.`;

export async function mejorarConIA(imageBase64: string): Promise<ReciboCOREMAR> {
  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === "tu_api_key_aqui") {
    throw new Error("Falta configurar VITE_OPENROUTER_API_KEY en tu archivo .env");
  }

  // Comprimir imagen para envío rápido (máx 1024px de ancho)
  const imagenComprimida = await new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const maxWidth = 1024;
      const scale = maxWidth / img.width;
      canvas.width = maxWidth;
      canvas.height = img.height * scale;
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]); // Solo la parte base64
    };
    img.src = imageBase64;
  });

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": window.location.origin,
      "X-Title": "PSP Control de Recibos",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "qwen/qwen-2-vl-7b-instruct:free", // Modelo gratuito excelente para OCR
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT_COREMAR },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imagenComprimida}` } }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error de IA: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  let text = data.choices?.[0]?.message?.content;
  
  if (!text) throw new Error("La IA no devolvió contenido.");

  // Limpiar markdown si la IA lo incluye a pesar de las instrucciones
  text = text.replace(/^```json\n?/i, "").replace(/\n?```$/i, "").trim();
  
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("La IA devolvió un formato JSON inválido.");
  }

  // Validar estrictamente contra el texto crudo
  return validarLecturaIA(parsed, "ia");
}