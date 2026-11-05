/**
 * Google Gemini API - 1,500 llamadas/mes GRATIS (permanente)
 * NO requiere tarjeta de crédito
 * Precisión 95%+ en texto manuscrito
 */

import { validarLecturaIA, type ReciboCOREMAR } from "./coremar-ocr";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const PROMPT_GEMINI = `Eres un experto en lectura de recibos portuarios COREMAR. Extrae estos campos del texto OCR:

CAMPOS:
- numeroRecibo: 5 dígitos (ej: 69952)
- fecha: formato DD/MM/YY o DD-MM-YY
- proveedor: nombre del proveedor (ej: CARGO PORT)
- motonave: nombre del buque (ej: Great Fortune)
- equipo: código del equipo (ej: TC-02, CL-1611)
- horaInicio: HH:MM
- horaFinal: HH:MM
- detenciones: ej: "1H ALIMENTO", "1 HR HSEQ"
- operador: nombre completo del operador
- tipoCarga: ej: ACERO, MAIZ, TRIGO
- observaciones: texto de observaciones

Devuelve SOLO JSON válido con esta estructura:
{
  "numeroRecibo": {"valor": "69952", "texto_original": "69952", "confianza": "alta", "requiere_revision": false},
  "fecha": {"valor": "03/11/26", "texto_original": "03/11/26", "confianza": "alta", "requiere_revision": false},
  "proveedor": {"valor": "CARGO PORT", "texto_original": "CARGO PORT", "confianza": "alta", "requiere_revision": false},
  "motonave": {"valor": "Great Fortune", "texto_original": "Great Fortune", "confianza": "alta", "requiere_revision": false},
  "equipo": {"valor": "TC-02", "texto_original": "TC-02", "confianza": "alta", "requiere_revision": false},
  "horaInicio": {"valor": "07:30", "texto_original": "07:30", "confianza": "alta", "requiere_revision": false},
  "horaFinal": {"valor": "19:30", "texto_original": "19:30", "confianza": "alta", "requiere_revision": false},
  "detenciones": {"valor": "1H ALIMENTO", "texto_original": "1H ALIMENTO", "confianza": "alta", "requiere_revision": false},
  "operador": {"valor": "Nombre Completo", "texto_original": "Nombre Completo", "confianza": "alta", "requiere_revision": false},
  "tipoCarga": {"valor": "ACERO", "texto_original": "ACERO", "confianza": "alta", "requiere_revision": false},
  "observaciones": {"valor": "texto", "texto_original": "texto", "confianza": "alta", "requiere_revision": false},
  "texto_crudo": "TRANSCRIPCIÓN COMPLETA DEL TEXTO"
}

REGLAS:
1. NO inventes datos. Si no existe, usa null.
2. "texto_original" debe ser el fragmento exacto del texto.
3. confianza: "alta" si es claro, "media" si hay duda.
4. Responde SOLO JSON, sin markdown.`;

export async function mejorarConGemini(imageBase64: string): Promise<ReciboCOREMAR> {
  if (!GEMINI_API_KEY) {
    throw new Error("Falta VITE_GEMINI_API_KEY en .env.local");
  }

  // Comprimir imagen (máx 1024px)
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
      resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
    };
    img.src = imageBase64;
  });

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        role: "user",
        parts: [
          { text: PROMPT_GEMINI },
          { inline_data: { mime_type: "image/jpeg", data: imagenComprimida } }
        ]
      }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!text) throw new Error("Gemini no devolvió contenido");
  
  // Limpiar markdown
  text = text.replace(/^```json\n?/i, "").replace(/\n?```$/i, "").trim();
  
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Gemini devolvió JSON inválido");
  }

  return validarLecturaIA(parsed, "ia");
}