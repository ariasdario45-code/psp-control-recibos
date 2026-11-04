import React, { useState, useRef } from 'react'
import { Camera, Loader, AlertCircle, XCircle, Sparkles, CheckCircle } from 'lucide-react'
import { createWorker } from 'tesseract.js'
import { ImageProcessor } from '../lib/ocr/imageProcessor'
import { ReceiptParser } from '../lib/ocr/receiptParser'
import { mejorarConIA } from '../lib/ocr/ia-respaldo'
import type { ExtractedData } from '../lib/ocr/receiptParser'

interface OCRScannerProps {
  onExtracted: (data: ExtractedData) => void
  onCancel: () => void
}

export default function OCRScanner({ onExtracted, onCancel }: OCRScannerProps) {
  const [processing, setProcessing] = useState(false)
  const [processingIA, setProcessingIA] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const [preview, setPreview] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [localResult, setLocalResult] = useState<ExtractedData | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = async (file: File) => {
    try {
      setProcessing(true)
      setError('')
      setProgress(0)
      setStatus('Cargando imagen...')

      const previewUrl = URL.createObjectURL(file)
      setPreview(previewUrl)
      setProgress(10)

      setStatus('Mejorando imagen...')
      const imagenesProcesadas = await ImageProcessor.process(file)
      setProgress(30)

      setStatus('Leyendo texto (OCR Local)...')
      const worker = await createWorker('spa+eng')
      
      await worker.setParameters({
        tessedit_pageseg_mode: 6 as any,
        preserve_interword_spaces: '1',
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ÁÉÍÓÚÑáéíóúñ.,-/: ',
        tessedit_enable_dict: '0',
      })

      let mejorData: any = null
      let mejorPuntaje = -1

      for (const imgProc of imagenesProcesadas) {
        const { data } = await worker.recognize(imgProc.src)
        const puntaje = data.confidence - (data.text.length < 10 ? 30 : 0)
        
        console.log(`[OCR Local] Intento ${imgProc.grados}° → Confianza: ${data.confidence}`)
        if (puntaje > mejorPuntaje) {
          mejorPuntaje = puntaje
          mejorData = data
        }
      }

      setProgress(80)
      console.log('📝 Texto OCR final:', mejorData.text)

      setStatus('Extrayendo datos...')
      const extractedData = await ReceiptParser.parse(mejorData.text, mejorData.confidence)
      setProgress(100)

      await worker.terminate()

      console.log('✅ Datos extraídos (Local):', extractedData)
      setLocalResult(extractedData)
      setProcessing(false)

    } catch (err: any) {
      console.error('❌ Error OCR:', err)
      setError(`Error: ${err.message}`)
      setProcessing(false)
    }
  }

  const handleMejorarConIA = async () => {
    if (!preview) return
    try {
      setProcessingIA(true)
      setStatus('Consultando IA para mejorar precisión...')
      
      // Convertir preview URL a base64 para la IA
      const response = await fetch(preview)
      const blob = await response.blob()
      const reader = new FileReader()
      const base64data = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })

      const iaResult = await mejorarConIA(base64data)
      
      // Fusionar resultados: la IA tiene prioridad si tiene datos válidos
      const fusedData: ExtractedData = {
        ...localResult,
        numeroRecibo: iaResult.numeroRecibo || localResult?.numeroRecibo,
        fecha: iaResult.fecha || localResult?.fecha,
        proveedor: iaResult.proveedor || localResult?.proveedor,
        motonave: iaResult.motonave || localResult?.motonave,
        equipo: iaResult.equipo || localResult?.equipo,
        horaInicio: iaResult.horaInicio || localResult?.horaInicio,
        horaFinal: iaResult.horaFinal || localResult?.horaFinal,
        detenciones: iaResult.detenciones || localResult?.detenciones,
        operador: iaResult.operador || localResult?.operador,
        tipoCarga: iaResult.tipoCarga || localResult?.tipoCarga,
        observaciones: iaResult.observaciones || localResult?.observaciones,
        respaldo_campos: { ...localResult?.respaldo_campos, ...iaResult.respaldo_campos },
        verificar: iaResult.verificar,
        texto_crudo: iaResult.texto_crudo || localResult?.texto_crudo,
        confidence: {
          numeroRecibo: iaResult.respaldo_campos?.numeroRecibo?.confianza === 'alta' ? 95 : 70,
          fecha: iaResult.respaldo_campos?.fecha?.confianza === 'alta' ? 95 : 70,
          proveedor: iaResult.respaldo_campos?.proveedor?.confianza === 'alta' ? 95 : 70,
          motonave: iaResult.respaldo_campos?.motonave?.confianza === 'alta' ? 95 : 70,
          equipo: iaResult.respaldo_campos?.equipo?.confianza === 'alta' ? 95 : 70,
          horas: iaResult.respaldo_campos?.horaInicio?.confianza === 'alta' ? 95 : 70,
          detenciones: iaResult.respaldo_campos?.detenciones?.confianza === 'alta' ? 95 : 70,
          operador: iaResult.respaldo_campos?.operador?.confianza === 'alta' ? 95 : 70,
          tipoCarga: iaResult.respaldo_campos?.tipoCarga?.confianza === 'alta' ? 95 : 70,
          observaciones: iaResult.respaldo_campos?.observaciones?.confianza === 'alta' ? 95 : 70,
        }
      }

      console.log('✅ Datos fusionados (IA + Local):', fusedData)
      setLocalResult(fusedData)
      setProcessingIA(false)
      alert('✨ IA ha mejorado la extracción. Revisa los campos antes de confirmar.')

    } catch (err: any) {
      console.error('❌ Error IA:', err)
      setError(`Error IA: ${err.message}`)
      setProcessingIA(false)
    }
  }

  const handleConfirmar = () => {
    if (localResult) {
      onExtracted(localResult)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleImageSelect(file)
  }

  const getConfidenceColor = (campo: string) => {
    if (!localResult?.respaldo_campos?.[campo]) return 'border-slate-300 bg-slate-50'
    const conf = localResult.respaldo_campos[campo].confianza
    if (conf === 'alta') return 'border-green-400 bg-green-50'
    if (conf === 'media') return 'border-yellow-400 bg-yellow-50'
    return 'border-red-400 bg-red-50'
  }

  const getConfidenceLabel = (campo: string) => {
    if (!localResult?.respaldo_campos?.[campo]) return '⚪ Sin detectar'
    const conf = localResult.respaldo_campos[campo].confianza
    if (conf === 'alta') return '🟢 Alta'
    if (conf === 'media') return '🟡 Media'
    return '🔴 Baja'
  }

  return (
    <div className="bg-white rounded-lg shadow-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Camera className="w-5 h-5 text-blue-600" />
          Escaneo Inteligente de Recibo
        </h3>
        <button onClick={onCancel} className="text-slate-500 hover:text-slate-700">
          <XCircle className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        {!preview ? (
          <div className="flex gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={processing || processingIA}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Camera className="w-5 h-5" />
              Tomar Foto / Subir
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        ) : (
          <div className="relative">
            <img src={preview} alt="Preview" className="w-full max-h-64 object-contain rounded-lg border border-slate-200" />
            {(processing || processingIA) && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                <div className="text-white text-center p-4">
                  <Loader className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <p className="text-sm font-medium">{status}</p>
                  <div className="w-48 h-2 bg-slate-700 rounded-full mt-3 mx-auto">
                    <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-xs mt-2">{progress}%</p>
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {localResult && !processing && !processingIA && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              💡 <strong>Revisa los campos:</strong> 🟢 Confiable | 🟡 Revisar | 🔴 No detectado/Baja confianza. 
              Puedes editarlos directamente o usar la IA para mejorar.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { key: 'numeroRecibo', label: 'N° Recibo' },
                { key: 'fecha', label: 'Fecha' },
                { key: 'motonave', label: 'Motonave' },
                { key: 'equipo', label: 'Equipo' },
                { key: 'tipoCarga', label: 'Tipo Carga' },
                { key: 'horaInicio', label: 'Hora Inicio' },
                { key: 'horaFinal', label: 'Hora Final' },
                { key: 'detenciones', label: 'Detenciones' },
                { key: 'operador', label: 'Operador' },
                { key: 'observaciones', label: 'Observaciones' },
              ].map((field) => (
                <div key={field.key} className={`p-3 rounded-lg border-2 ${getConfidenceColor(field.key)}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-700">{field.label}</span>
                    <span className="text-xs">{getConfidenceLabel(field.key)}</span>
                  </div>
                  <input
                    type="text"
                    value={(localResult as any)[field.key] || ''}
                    onChange={(e) => {
                      const updated = { ...localResult, [field.key]: e.target.value }
                      if (updated.respaldo_campos) {
                        updated.respaldo_campos[field.key] = {
                          ...updated.respaldo_campos[field.key],
                          valor: e.target.value,
                          confianza: 'alta',
                          requiere_revision: false
                        }
                      }
                      setLocalResult(updated as ExtractedData)
                    }}
                    className="w-full px-2 py-1 border border-slate-300 rounded text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="No detectado"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleMejorarConIA}
                disabled={processingIA}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 text-sm font-medium"
              >
                {processingIA ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                ✨ Mejorar con IA
              </button>
              <button
                onClick={handleConfirmar}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                <CheckCircle className="w-4 h-4" />
                Confirmar y Aplicar
              </button>
            </div>
          </div>
        )}

        {!processing && !processingIA && !preview && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-900 text-sm mb-2">📸 Consejos para mejor precisión:</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>✓ Buena iluminación, sin sombras</li>
              <li>✓ Recibo completo en el encuadre</li>
              <li>✓ Cámara paralela al documento</li>
              <li>✓ Enfoque nítido en el texto</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}