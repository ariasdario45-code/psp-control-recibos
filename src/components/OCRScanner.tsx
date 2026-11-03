import React, { useState, useRef } from 'react'
import { Camera, Upload, Loader, CheckCircle, AlertCircle, XCircle } from 'lucide-react'
import { createWorker } from 'tesseract.js'
import { ImageProcessor } from '../lib/ocr/imageProcessor'
import { ReceiptParser } from '../lib/ocr/receiptParser'
import type { ExtractedData } from '../lib/ocr/receiptParser'

interface OCRScannerProps {
  onExtracted: (data: ExtractedData) => void
  onCancel: () => void
}

export default function OCRScanner({ onExtracted, onCancel }: OCRScannerProps) {
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const [preview, setPreview] = useState<string>('')
  const [error, setError] = useState<string>('')
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

      // Preprocesar
      setStatus('Mejorando imagen...')
      const processedImage = await ImageProcessor.process(file)
      setProgress(30)

      // OCR con Tesseract
      setStatus('Leyendo texto...')
      const worker = await createWorker('spa+eng')
      
      await worker.setParameters({
        tessedit_pageseg_mode: '6',
        preserve_interword_spaces: '1',
      })

      const { data } = await worker.recognize(processedImage)
      setProgress(80)

      console.log('📝 Texto OCR:', data.text)
      console.log('📊 Confianza:', data.confidence)

      // Parsear
      setStatus('Extrayendo datos...')
      const extractedData = ReceiptParser.parse(data.text, data.confidence)
      setProgress(100)

      await worker.terminate()

      console.log('✅ Datos extraídos:', extractedData)
      onExtracted(extractedData)

    } catch (err: any) {
      console.error('❌ Error OCR:', err)
      setError(`Error: ${err.message}`)
    } finally {
      setProcessing(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleImageSelect(file)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Camera className="w-5 h-5 text-blue-600" />
          Escaneo Inteligente de Recibo
        </h3>
        <button
          onClick={onCancel}
          className="text-slate-500 hover:text-slate-700"
        >
          <XCircle className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={processing}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Camera className="w-5 h-5" />
            Tomar Foto / Subir
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        {preview && (
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="w-full max-h-64 object-contain rounded-lg border border-slate-200"
            />
            {processing && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                <div className="text-white text-center">
                  <Loader className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <p className="text-sm font-medium">{status}</p>
                  <div className="w-48 h-2 bg-slate-700 rounded-full mt-3 mx-auto">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
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

        {!processing && !preview && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-900 text-sm mb-2">
              📸 Consejos para mejor precisión:
            </h4>
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