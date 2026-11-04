/**
 * Contrato y validación para OCR de Recibos COREMAR
 * Inspirado en la arquitectura de validación estricta de Lovable
 */

export interface CampoRespaldo {
  valor: string | null;
  texto_original: string | null;
  confianza: "alta" | "media" | "baja" | null;
  requiere_revision: boolean;
}

export interface ReciboCOREMAR {
  numeroRecibo: string | null;
  fecha: string | null;
  proveedor: string | null;
  motonave: string | null;
  equipo: string | null;
  horaInicio: string | null;
  horaFinal: string | null;
  detenciones: string | null;
  operador: string | null;
  tipoCarga: string | null;
  observaciones: string | null;
  texto_crudo: string;
  respaldo_campos: Record<string, CampoRespaldo>;
  verificar: string[];
  motor: "local" | "ia";
}

export const CAMPOS_COREMAR = [
  "numeroRecibo", "fecha", "proveedor", "motonave", "equipo", 
  "horaInicio", "horaFinal", "detenciones", "operador", "tipoCarga", "observaciones"
] as const;

/**
 * Valida que la IA no esté alucinando: el texto_original debe existir en el texto_crudo
 */
export function validarLecturaIA(data: any, motor: "local" | "ia" = "ia"): ReciboCOREMAR {
  const respaldo: Record<string, CampoRespaldo> = {};
  const valores: Record<string, string | null> = {};
  const verificar: string[] = [];

  for (const key of CAMPOS_COREMAR) {
    const entry = data[key] || { valor: null, texto_original: null, confianza: "baja", requiere_revision: true };
    
    // VALIDACIÓN ESTRICTA: El valor debe estar respaldado por el texto original, y este debe estar en el crudo
    const justified = Boolean(
      entry.valor?.trim() && 
      entry.texto_original?.trim() && 
      data.texto_crudo?.toUpperCase().includes(entry.texto_original.toUpperCase())
    );

    const valorFinal = justified ? entry.valor : null;
    valores[key] = valorFinal;

    respaldo[key] = {
      valor: valorFinal,
      texto_original: entry.texto_original,
      confianza: entry.confianza || "baja",
      requiere_revision: !justified || entry.requiere_revision || entry.confianza !== "alta",
    };

    if (valorFinal && respaldo[key].requiere_revision) {
      verificar.push(key);
    }
  }

  // Si la IA no logró extraer NADA válido, lanzamos error para que el usuario use el local o manual
  if (motor === "ia" && !Object.values(valores).some(Boolean)) {
    throw new Error("La IA no pudo identificar campos con respaldo en la imagen. Por favor, ingresa los datos manualmente o mejora la foto.");
  }

     return {
    numeroRecibo: valores.numeroRecibo || null,
    fecha: valores.fecha || null,
    proveedor: valores.proveedor || null,
    motonave: valores.motonave || null,
    equipo: valores.equipo || null,
    horaInicio: valores.horaInicio || null,
    horaFinal: valores.horaFinal || null,
    detenciones: valores.detenciones || null,
    operador: valores.operador || null,
    tipoCarga: valores.tipoCarga || null,
    observaciones: valores.observaciones || null,
    texto_crudo: data.texto_crudo || "",
    respaldo_campos: respaldo,
    verificar,
    motor,
  };
}  //