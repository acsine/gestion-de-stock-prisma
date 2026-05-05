'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import type { Result } from '@zxing/library'

export type ScanStatus = 'idle' | 'requesting' | 'scanning' | 'success' | 'error'

export interface ScanResult {
  barcode:  string
  format:   string
  rawBytes?: Uint8Array
}

export interface UseBarcodeScanner {
  videoRef:     React.RefObject<HTMLVideoElement | null>
  status:       ScanStatus
  error:        string | null
  lastScan:     ScanResult | null
  isScanning:   boolean
  startScan:    () => Promise<void>
  stopScan:     () => void
  resetScan:    () => void
  toggleTorch:  () => Promise<void>
  torchOn:      boolean
  cameras:      MediaDeviceInfo[]
  activeCamera: string
  setCamera:    (id: string) => void
}

export function useBarcodeScanner(
  onScan?: (result: ScanResult) => void,
  debounceMs = 1500
): UseBarcodeScanner {
  const videoRef    = useRef<HTMLVideoElement>(null)
  const readerRef   = useRef<BrowserMultiFormatReader | null>(null)
  const streamRef   = useRef<MediaStream | null>(null)
  const lastScanRef = useRef<string>('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const torchTrackRef = useRef<MediaStreamTrack | null>(null)

  const [status,       setStatus]       = useState<ScanStatus>('idle')
  const [error,        setError]        = useState<string | null>(null)
  const [lastScan,     setLastScan]     = useState<ScanResult | null>(null)
  const [torchOn,      setTorchOn]      = useState(false)
  const [cameras,      setCameras]      = useState<MediaDeviceInfo[]>([])
  const [activeCamera, setActiveCamera] = useState<string>('environment') // préfère la caméra arrière

  // ── Enumerate cameras ────────────────────────────────────────────────────
  useEffect(() => {
    BrowserMultiFormatReader.listVideoInputDevices()
      .then((devices) => {
        setCameras(devices)
        // prefer back camera
        const back = devices.find(
          (d) => /back|rear|environment/i.test(d.label)
        )
        if (back) setActiveCamera(back.deviceId)
      })
      .catch(() => {/* cameras not enumerable before permission */})
  }, [])

  // ── Stop scanning & release resources ────────────────────────────────────
  const stopScan = useCallback(() => {
    // readerRef.current?.reset() // reset() does not exist on BrowserMultiFormatReader in this version
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current  = null
    readerRef.current  = null
    torchTrackRef.current = null
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setStatus('idle')
    setTorchOn(false)
  }, [])

  // ── Reset to initial state ────────────────────────────────────────────────
  const resetScan = useCallback(() => {
    stopScan()
    setLastScan(null)
    setError(null)
    lastScanRef.current = ''
  }, [stopScan])

  // ── Toggle torch (flashlight) ─────────────────────────────────────────────
  const toggleTorch = useCallback(async () => {
    const track = torchTrackRef.current
    if (!track) return
    const newVal = !torchOn
    try {
      await (track as MediaStreamTrack & {
        applyConstraints: (c: { advanced: { torch: boolean }[] }) => Promise<void>
      }).applyConstraints({ advanced: [{ torch: newVal }] })
      setTorchOn(newVal)
    } catch {
      /* torch not supported on this device */
    }
  }, [torchOn])

  // ── Start scanning ────────────────────────────────────────────────────────
  const startScan = useCallback(async () => {
    if (!videoRef.current) return
    setError(null)
    setStatus('requesting')

    try {
      // Request camera permission
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId:   activeCamera !== 'environment' ? { exact: activeCamera } : undefined,
          facingMode: activeCamera === 'environment' ? 'environment' : undefined,
          width:      { ideal: 1280 },
          height:     { ideal: 720 },
        },
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      // Store torch track reference
      const videoTrack = stream.getVideoTracks()[0]
      torchTrackRef.current = videoTrack ?? null

      // Enumerate cameras now that we have permission
      const devices = await BrowserMultiFormatReader.listVideoInputDevices()
      setCameras(devices)

      // Attach stream to video element
      videoRef.current.srcObject = stream
      await videoRef.current.play()

      const reader = new BrowserMultiFormatReader()
      readerRef.current = reader
      setStatus('scanning')

      // Decode continuously
      reader.decodeFromStream(stream, videoRef.current, (result: Result | undefined, err) => {
        if (result) {
          const barcode = result.getText()
          const format  = result.getBarcodeFormat().toString()

          // Debounce to avoid firing multiple times for the same scan
          if (barcode === lastScanRef.current) return
          if (debounceRef.current) clearTimeout(debounceRef.current)

          debounceRef.current = setTimeout(() => {
            lastScanRef.current = ''
          }, debounceMs)

          lastScanRef.current = barcode
          const scanResult: ScanResult = { barcode, format }
          setLastScan(scanResult)
          setStatus('success')
          onScan?.(scanResult)

          // Reset to scanning after short feedback delay
          setTimeout(() => setStatus('scanning'), 800)
        }
        // NotFoundException is normal (no barcode in frame yet) — ignore
        if (err && err.name !== 'NotFoundException') {
          console.warn('Scanner error', err)
        }
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur caméra inconnue'
      const friendly =
        msg.includes('Permission')  || msg.includes('NotAllowed')
          ? 'Permission caméra refusée. Autorisez l\'accès dans les paramètres de votre navigateur.'
          : msg.includes('NotFound')
          ? 'Aucune caméra trouvée sur cet appareil.'
          : msg.includes('NotReadable') || msg.includes('TrackStart')
          ? 'La caméra est déjà utilisée par une autre application.'
          : `Erreur caméra : ${msg}`

      setError(friendly)
      setStatus('error')
    }
  }, [activeCamera, debounceMs, onScan])

  // Cleanup on unmount
  useEffect(() => () => stopScan(), [stopScan])

  return {
    videoRef,
    status,
    error,
    lastScan,
    isScanning:   status === 'scanning' || status === 'success',
    startScan,
    stopScan,
    resetScan,
    toggleTorch,
    torchOn,
    cameras,
    activeCamera,
    setCamera:    setActiveCamera,
  }
}
