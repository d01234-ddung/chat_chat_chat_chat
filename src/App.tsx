import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import type * as cocoSsd from '@tensorflow-models/coco-ssd'
import {
  ArrowDown,
  ArrowRight,
  Check,
  CircleHelp,
  FileImage,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from 'lucide-react'

type Prediction = cocoSsd.DetectedObject

const MAX_FILE_SIZE = 15 * 1024 * 1024
const MIN_DETECTION_SCORE = 0.05
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function App() {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [fileName, setFileName] = useState('')
  const [modelReady, setModelReady] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [hasAnalyzed, setHasAnalyzed] = useState(false)
  const [error, setError] = useState('')
  const imageRef = useRef<HTMLImageElement>(null)
  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null)
  const modelPromiseRef = useRef<Promise<cocoSsd.ObjectDetection> | null>(null)
  const requestIdRef = useRef(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const detectImage = useCallback(async (image: HTMLImageElement, model = modelRef.current) => {
    if (!model || !image.naturalWidth) return
    const requestId = ++requestIdRef.current
    setIsAnalyzing(true)
    setError('')
    setHasAnalyzed(false)

    try {
      const results = await model.detect(image, 20, MIN_DETECTION_SCORE)
      if (requestId !== requestIdRef.current) return
      setPredictions(results)
      setHasAnalyzed(true)
    } catch {
      if (requestId === requestIdRef.current) {
        setError('Không thể phân tích ảnh này. Hãy thử một ảnh khác.')
      }
    } finally {
      if (requestId === requestIdRef.current) setIsAnalyzing(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    if (!modelPromiseRef.current) {
      modelPromiseRef.current = (async () => {
        const tf = await import('@tensorflow/tfjs')
        try {
          await import('@tensorflow/tfjs-backend-webgl')
          const webglAvailable = await tf.setBackend('webgl')
          if (!webglAvailable) throw new Error('WebGL backend is unavailable')
        } catch {
          await import('@tensorflow/tfjs-backend-cpu')
          await tf.setBackend('cpu')
        }
        await tf.ready()
        const cocoSsd = await import('@tensorflow-models/coco-ssd')
        return cocoSsd.load({ base: 'lite_mobilenet_v2' })
      })()
    }

    modelPromiseRef.current
      .then((model) => {
        if (!active) return
        modelRef.current = model
        setModelReady(true)
        const image = imageRef.current
        if (image?.complete && image.naturalWidth) void detectImage(image, model)
      })
      .catch(() => {
        if (active) setError('Không tải được mô hình AI. Vui lòng kiểm tra kết nối mạng rồi tải lại trang.')
      })

    return () => {
      active = false
    }
  }, [detectImage])

  useEffect(() => {
    if (!imageUrl) return
    return () => URL.revokeObjectURL(imageUrl)
  }, [imageUrl])

  const selectFile = (file?: File) => {
    if (!file) return
    if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
      setError('Định dạng không được hỗ trợ. Vui lòng chọn ảnh JPG, PNG hoặc WEBP.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('Ảnh vượt quá 15 MB. Hãy chọn tệp nhỏ hơn.')
      return
    }

    requestIdRef.current += 1
    setError('')
    setPredictions([])
    setHasAnalyzed(false)
    setImageSize({ width: 0, height: 0 })
    setFileName(file.name)
    setImageUrl(URL.createObjectURL(file))
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    selectFile(event.target.files?.[0])
    event.target.value = ''
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    selectFile(event.dataTransfer.files[0])
  }

  const ballPredictions = predictions.filter((prediction) => prediction.class === 'sports ball')
  const otherPredictions = predictions.filter((prediction) => prediction.class !== 'sports ball')
  const bestBall = ballPredictions.reduce<Prediction | null>(
    (best, prediction) => (!best || prediction.score > best.score ? prediction : best),
    null,
  )
  const bestOther = otherPredictions.reduce<Prediction | null>(
    (best, prediction) => (!best || prediction.score > best.score ? prediction : best),
    null,
  )
  const confidence = bestBall ? Math.round(bestBall.score * 100) : null
  const statusLabel = !hasAnalyzed
    ? 'Đang chờ ảnh'
    : bestBall
      ? 'Đã nhận diện bóng'
      : 'Chưa phát hiện bóng'

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Ball Vision trang chủ">
          <span className="brand-mark"><span /></span>
          <span>ball<span className="brand-light">vision</span></span>
        </a>
        <div className="topbar-right">
          <span className="model-indicator"><span className={modelReady ? 'status-dot ready' : 'status-dot'} />
            {modelReady ? 'Mô hình đã sẵn sàng' : 'Đang khởi tạo mô hình'}
          </span>
          <span className="topbar-divider" />
          <span className="edition">THỊ GIÁC MÁY TÍNH <span>01 / 01</span></span>
        </div>
      </header>

      <section id="top" className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> PHÒNG THÍ NGHIỆM THỊ GIÁC MÁY TÍNH</div>
          <h1>Mọi quả bóng,<br /><span>được tìm thấy.</span></h1>
          <p className="hero-description">Tải lên một bức ảnh. AI sẽ quét khung hình và cho bạn biết liệu có bóng trong đó — ngay trên thiết bị của bạn.</p>
          <div className="hero-note"><LockKeyhole size={14} strokeWidth={1.8} /><span>Ảnh được xử lý riêng tư, không rời khỏi trình duyệt.</span></div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
          <div className="art-cross cross-a">+</div><div className="art-cross cross-b">+</div>
          <div className="art-ball"><div className="art-ball-seam seam-one" /><div className="art-ball-seam seam-two" /><div className="art-ball-shine" /></div>
          <div className="art-label"><span>OBJ / 001</span><span>SPHERE DETECTED</span></div>
          <div className="art-coordinate">21°01' N<br />105°51' E</div>
          <div className="art-radar"><span /><span /><span /></div>
        </div>
      </section>

      <section className="workspace" aria-label="Khu vực phân tích ảnh">
        <div className="section-heading">
          <div><div className="section-kicker">01 <span>/</span> PHÂN TÍCH HÌNH ẢNH</div><h2>Bắt đầu với một hình ảnh</h2></div>
          <span className="formats"><FileImage size={15} /> JPG, PNG, WEBP <span>·</span> TỐI ĐA 15 MB</span>
        </div>

        <div className="workspace-grid">
          <div className={`upload-panel ${isDragging ? 'is-dragging' : ''} ${imageUrl ? 'has-image' : ''}`}
            onDragOver={(event) => { event.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}>
            {!imageUrl ? (
              <div className="empty-state">
                <div className="upload-icon"><Upload size={22} strokeWidth={1.7} /></div>
                <div className="upload-title">Thả ảnh vào đây</div>
                <div className="upload-subtitle">hoặc chọn từ thiết bị của bạn</div>
                <button className="choose-button" type="button" onClick={() => fileInputRef.current?.click()}>
                  Chọn hình ảnh <ArrowRight size={15} />
                </button>
                <div className="upload-footnote"><LockKeyhole size={12} /> An toàn &amp; riêng tư</div>
              </div>
            ) : (
              <div className="preview-wrap">
                <div className="preview-topline"><span><span className="preview-dot" /> ẢNH ĐÃ TẢI LÊN</span><span>{fileName}</span></div>
                <div className="image-stage">
                  <img ref={imageRef} src={imageUrl} alt={`Ảnh cần phân tích: ${fileName}`} onLoad={(event) => {
                    const image = event.currentTarget
                    setImageSize({ width: image.naturalWidth, height: image.naturalHeight })
                    if (modelRef.current) void detectImage(image)
                  }} />
                  {hasAnalyzed && imageSize.width > 0 && (
                    <svg className="detection-overlay" viewBox={`0 0 ${imageSize.width} ${imageSize.height}`} aria-hidden="true">
                      {ballPredictions.map((prediction, index) => {
                        const [x, y, width, height] = prediction.bbox
                        return <g key={`${prediction.class}-${index}`}><rect x={x} y={y} width={width} height={height} rx="8" className="box-rect" />
                          <rect x={x} y={Math.max(0, y - 30)} width="108" height="25" rx="5" className="box-label-bg" />
                          <text x={x + 10} y={Math.max(0, y - 13)} className="box-label">BÓNG {Math.round(prediction.score * 100)}%</text></g>
                      })}
                    </svg>
                  )}
                  {isAnalyzing && <div className="scan-line"><span /></div>}
                </div>
                <div className="preview-footer">
                  <span><Check size={13} /> Ảnh đã sẵn sàng</span>
                  <button type="button" onClick={() => fileInputRef.current?.click()}><RefreshCw size={13} /> Đổi ảnh</button>
                </div>
              </div>
            )}
            <input ref={fileInputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} aria-label="Chọn ảnh để phân tích" />
          </div>

          <aside className="result-panel" aria-live="polite">
            <div className="result-top"><span className="result-kicker">02 <span>/</span> KẾT QUẢ</span><span className={`result-status ${bestBall ? 'positive' : ''}`}><span />{statusLabel}</span></div>
            {hasAnalyzed ? (
              <div className="result-content">
                <div className="result-wordmark">{bestBall ? 'Có bóng' : bestOther ? 'Chưa xác nhận bóng' : 'Chưa nhận diện'}<span>.</span></div>
                <p className="result-description">{bestBall
                  ? 'Mô hình đã nhận diện một vật thể thuộc nhóm bóng thể thao trong ảnh.'
                  : bestOther
                    ? 'Mô hình có phát hiện vật thể, nhưng chưa phân loại vật thể nào là bóng thể thao. Bóng tennis nhỏ hoặc ở xa có thể khó nhận diện.'
                    : 'Không có phát hiện bóng thể thao vượt ngưỡng 5%. Điều này không có nghĩa ảnh chắc chắn không có bóng.'}</p>
                <div className="confidence-block">
                  <div className="confidence-label"><span>ĐỘ TIN CẬY NHẬN DIỆN</span><span className="confidence-value">{confidence ?? '—'}{confidence !== null && <small>%</small>}</span></div>
                  <div className="confidence-track"><span style={{ width: `${confidence ?? 0}%` }} /></div>
                  <div className="confidence-caption">{bestBall ? 'Điểm tin cậy của phát hiện cao nhất, không phải xác suất' : 'Không có điểm tin cậy bóng để hiển thị'}</div>
                </div>
                {(bestBall || bestOther) && <div className="detection-meta"><span className="meta-icon"><Sparkles size={15} /></span><span>{bestBall ? 'Đối tượng' : 'Dự đoán khác'}<strong>{bestBall ? 'Bóng thể thao' : bestOther?.class}</strong></span><span className="meta-score">{Math.round((bestBall?.score ?? bestOther?.score ?? 0) * 100)}%</span></div>}
                <button className="analyze-button" type="button" onClick={() => imageRef.current && void detectImage(imageRef.current)} disabled={!imageUrl || isAnalyzing || !modelReady}>
                  {isAnalyzing ? <><LoaderCircle size={16} className="spin" /> Đang phân tích...</> : <><RefreshCw size={15} /> Phân tích lại</>}
                </button>
              </div>
            ) : (
              <div className="result-empty">
                <div className="result-empty-icon">{isAnalyzing ? <LoaderCircle size={24} className="spin" /> : <ScanSearch size={23} strokeWidth={1.5} />}</div>
                <div className="empty-result-title">{isAnalyzing ? 'Đang quét hình ảnh' : imageUrl ? 'Ảnh đã sẵn sàng' : 'Kết quả sẽ xuất hiện ở đây'}</div>
                <p>{isAnalyzing
                  ? 'AI đang tìm kiếm các vật thể có hình dạng bóng trong khung hình.'
                  : imageUrl
                    ? modelReady ? 'Mô hình sẽ tự động phân tích ảnh của bạn.' : 'Đang tải mô hình nhận diện lần đầu, vui lòng chờ một chút.'
                    : 'Tải ảnh lên để bắt đầu quá trình nhận diện tự động.'}</p>
                {imageUrl && <div className="scan-progress"><span /></div>}
              </div>
            )}
            <div className="result-bottom"><ShieldCheck size={14} /><span>Phân tích trực tiếp trên trình duyệt</span><CircleHelp size={14} className="help-icon" aria-label="Mô hình chỉ nhận diện lớp bóng thể thao trong COCO-SSD." /></div>
          </aside>
        </div>
        {error && <div className="error-banner" role="alert"><X size={16} /><span>{error}</span><button type="button" aria-label="Đóng thông báo" onClick={() => setError('')}><X size={15} /></button></div>}
        <div className="workspace-hint"><ArrowDown size={14} /><span>Mẹo: ảnh rõ nét, đủ sáng sẽ cho kết quả tốt hơn.</span></div>
      </section>

      <section className="how-section">
        <div className="how-heading"><div className="section-kicker">CÁCH HOẠT ĐỘNG</div><h2>Đơn giản như một cú ném.</h2></div>
        <div className="steps-grid">
          <article className="step-card"><span className="step-number">01</span><div className="step-icon"><Upload size={18} /></div><h3>Tải ảnh lên</h3><p>Chọn một tấm ảnh từ thiết bị. Hỗ trợ JPG, PNG và WEBP.</p></article>
          <article className="step-card"><span className="step-number">02</span><div className="step-icon"><ScanSearch size={18} /></div><h3>AI bắt đầu quét</h3><p>COCO-SSD tìm vật thể bóng thể thao ngay trên trình duyệt.</p></article>
          <article className="step-card"><span className="step-number">03</span><div className="step-icon"><Sparkles size={18} /></div><h3>Xem độ tin cậy</h3><p>Khung nhận diện và điểm tin cậy giúp bạn xem kết quả nhanh chóng.</p></article>
        </div>
      </section>

      <footer className="footer"><a className="brand footer-brand" href="#top"><span className="brand-mark"><span /></span><span>ball<span className="brand-light">vision</span></span></a><span>NHẬN DIỆN BÓNG, NGAY TRÊN THIẾT BỊ CỦA BẠN.</span><a href="#top" className="back-to-top">LÊN ĐẦU TRANG <ArrowDown size={13} /></a></footer>
    </main>
  )
}

export default App
