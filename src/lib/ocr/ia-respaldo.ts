/**
 * Motor de respaldo IA con Google Gemini (Principal) + OpenRouter (Fallback)
 * Gemini: 1,500 llamadas/mes GRATIS, estable, sin tarjeta
 */

import { validarLecturaIA, type ReciboCOREMAR } from "./coremar-ocr";
import { mejorarConGemini } from "./google-gemini";

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || "tu_api_key_aqui"; 
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Modelos de respaldo (solo si Gemini falla)
const VISION_MODELS = [
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.2-90b-vision-instruct:free"
];

const PROMPT_COREMAR = `Eres un experto en lectura de recibos portuarios COREMAR. Extrae estos campos y devuelve SOLO JSON válido:

{
  "numeroRecibo": {"valor": "5 dígitos", "texto_original": "fragmento", "confianza": "alta|media|baja", "requiere_revision": false},
  "fecha": {"valor": "DD/MM/YY", "texto_original": "fragmento", "confianza": "alta|media|baja", "requiere_revision": false},
  "proveedor": {"valor": "nombre", "texto_original": "fragmento", "confianza": "alta|media|baja", "requiere_revision": false},
  "motonave": {"valor": "nombre buque", "texto_original": "fragmento", "confianza": "alta|media|baja", "requiere_revision": false},
  "equipo": {"valor": "TC-02", "texto_original": "fragmento", "confianza": "alta|media|baja", "requiere_revision": false},
  "horaInicio": {"valor": "HH:MM", "texto_original": "fragmento", "confianza": "alta|media|baja", "requiere_revision": false},
  "horaFinal": {"valor": "HH:MM", "texto_original": "fragmento", "confianza": "alta|media|baja", "requiere_revision": false},
  "detenciones": {"valor": "1H ALIMENTO", "texto_original": "fragmento", "confianza": "alta|media|baja", "requiere_revision": false},
  "operador": {"valor": "nombre", "texto_original": "fragmento", "confianza": "alta|media|baja", "requiere_revision": false},
  "tipoCarga": {"valor": "ACERO", "texto_original": "fragmento", "confianza": "alta|media|baja", "requiere_revision": false},
  "observaciones": {"valor": "texto", "texto_original": "fragmento", "confianza": "alta|media|baja", "requiere_revision": false},
  "texto_crudo": "TRANSCRIPCIÓN COMPLETA"
}

Responde SOLO JSON, sin markdown.`;

export async function mejorarConIA(imageBase64: string): Promise<ReciboCOREMAR> {
  let lastError: Error | null = null;

  // INTENTO 1: Google Gemini (PRINCIPAL - 1,500/mes gratis, muy estable)
  try {
    console.log('[IA] Intentando con Google Gemini (principal)...');
    return await mejorarConGemini(imageBase64);
  } catch (error) {
    console.warn('[IA] Gemini falló:', error);
    lastError = error as Error;
  }

  // INTENTO 2: OpenRouter (RESPALDO)
  for (const model of VISION_MODELS) {
    try {
      console.log(`[IA] Intentando con OpenRouter: ${model}...`);
      
      const imagenComprimida = await new Promise<string>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = 1024;
          canvas.height = (1024 / img.width) * img.height;
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
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
          model: model,
          messages: [{
            role: "user",
            content: [
              { type: "text", text: PROMPT_COREMAR },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imagenComprimida}` } }
            ]
          }],
          temperature: 0.1,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      let text = data.choices?.[0]?.message?.content;
      
      if (!text) throw new Error("Sin contenido");
      
      text = text.replace(/^```json\n?/i, "").replace(/\n?```$/i, "").trim();
      const parsed = JSON.parse(text);
      
      console.log(`[IA] ¡Éxito con ${model}!`);
      return validarLecturaIA(parsed, "ia");

    } catch (error) {
      console.warn(`[IA] ${model} falló:`, error);
      lastError = error as Error;
    }
  }

  throw new Error(`Todas las IAs fallaron. Último error: ${lastError?.message}. Usa OCR local o ingresa manualmente.`);
}