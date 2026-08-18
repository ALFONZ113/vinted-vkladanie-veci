import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { analyzePhotos } from '../lib/analyze'
import { uid } from '../lib/id'
import { downloadDataUrl, fileToDataUrl, shrinkForAi } from '../lib/photos'
import { itemsStore } from '../lib/storage'
import { VINTED_NEW_ITEM_URL, type Item } from '../types'

const STEPS = [
  'Čtu visačky a loga',
  'Rozpoznávám kousek',
  'Hledám podobné věci a cenu',
  'Píšu název a popis',
]

export function ItemPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = useState<Item | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [stepLabel, setStepLabel] = useState(STEPS[0])

  useEffect(() => {
    if (id) {
      const existing = itemsStore.get(id)
      if (!existing) {
        navigate('/', { replace: true })
        return
      }
      setItem(existing)
      return
    }
    const created = itemsStore.create()
    navigate(`/vec/${created.id}`, { replace: true })
  }, [id, navigate])

  const persist = (next: Item) => {
    const saved = itemsStore.save(next)
    setItem(saved)
    return saved
  }

  const patch = (partial: Partial<Item>) => {
    if (!item) return
    persist({ ...item, ...partial })
  }

  const onFiles = async (files: FileList | null) => {
    if (!item || !files?.length) return
    setError(null)
    setBusy(true)
    try {
      const added = []
      for (const file of Array.from(files).slice(0, 20 - item.photos.length)) {
        added.push({
          id: uid(),
          dataUrl: await fileToDataUrl(file),
          kind: 'other' as const,
        })
      }
      persist({ ...item, photos: [...item.photos, ...added] })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fotku se nepodařilo načíst.')
    } finally {
      setBusy(false)
    }
  }

  const removePhoto = (photoId: string) => {
    if (!item) return
    persist({ ...item, photos: item.photos.filter((photo) => photo.id !== photoId) })
  }

  const prepare = async () => {
    if (!item || item.photos.length === 0) {
      setError('Nejdřív přidej aspoň jednu fotku, ideálně i visačku.')
      return
    }
    setError(null)
    setAnalyzing(true)
    let tick = 0
    setStepLabel(STEPS[0])
    const timer = window.setInterval(() => {
      tick = (tick + 1) % STEPS.length
      setStepLabel(STEPS[tick])
    }, 2200)

    try {
      const images = await Promise.all(item.photos.slice(0, 8).map((photo) => shrinkForAi(photo.dataUrl)))
      const result = await analyzePhotos(images)
      persist({
        ...item,
        targetGroup: result.targetGroup,
        itemType: result.itemType,
        brand: result.brand,
        size: result.size,
        color: result.color,
        material: result.material,
        condition: result.condition,
        defects: result.defects,
        title: result.title,
        description: result.description,
        price: result.price,
        priceNote: result.priceNote,
        missingInformation: result.missingInformation,
        detectedLabelText: result.detectedLabelText,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analýza se nezdařila.')
    } finally {
      window.clearInterval(timer)
      setAnalyzing(false)
    }
  }

  const copyText = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value)
    setCopied(label)
    window.setTimeout(() => setCopied(null), 1600)
  }

  const copyAll = async () => {
    if (!item) return
    const text = [item.title, '', item.description, '', item.price ? `Cena: ${item.price} Kč` : '']
      .filter(Boolean)
      .join('\n')
    await copyText('vše', text)
  }

  const downloadPhotos = () => {
    if (!item) return
    item.photos.forEach((photo, index) => {
      downloadDataUrl(photo.dataUrl, `vinted-${item.id.slice(0, 8)}-${index + 1}.jpg`)
    })
  }

  if (!item) return null

  const ready = Boolean(item.title || item.description)

  return (
    <>
      <header className="topbar">
        <Link className="back" to="/">
          ← Zpět
        </Link>
        <button
          className="back"
          onClick={() => {
            if (confirm('Smazat tento kousek?')) {
              itemsStore.remove(item.id)
              navigate('/')
            }
          }}
        >
          Smazat
        </button>
      </header>

      {error && <div className="error">{error}</div>}

      <section className="card section">
        <h2>Jen vyfoť věc</h2>
        <p className="muted">
          Stačí fotky. Nejvíc pomůže ostře vyfocená visačka se značkou a velikostí. Zbytek doplní
          AI.
        </p>
        <div className="photo-grid">
          <label className="photo-tile add-photo">
            {busy ? 'Nahrávám…' : 'Foto / galerie'}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              hidden
              onChange={(event) => {
                void onFiles(event.target.files)
                event.target.value = ''
              }}
            />
          </label>
          {item.photos.map((photo) => (
            <div key={photo.id} className="photo-tile">
              <img src={photo.dataUrl} alt="" />
              <button className="remove" onClick={() => removePhoto(photo.id)} type="button">
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="btn-row" style={{ marginTop: 16 }}>
          <button className="btn btn-primary" disabled={analyzing || item.photos.length === 0} onClick={() => void prepare()}>
            {analyzing ? stepLabel : ready ? 'Připravit znovu z fotek' : 'Připravit inzerát z fotek'}
          </button>
        </div>
      </section>

      {ready && (
        <section className="card section">
          <h2>Hotový inzerát</h2>
          {item.detectedLabelText.length > 0 && (
            <p className="muted">Přečtené visačky: {item.detectedLabelText.join(' · ')}</p>
          )}
          {item.missingInformation.length > 0 && (
            <div className="notice">AI si není jistá: {item.missingInformation.join(', ')}.</div>
          )}
          {item.priceNote && <p className="muted">{item.priceNote}</p>}
          <label className="field">
            <span>Název</span>
            <input value={item.title} onChange={(e) => patch({ title: e.target.value })} />
          </label>
          <label className="field">
            <span>Značka</span>
            <input value={item.brand} onChange={(e) => patch({ brand: e.target.value })} />
          </label>
          <label className="field">
            <span>Barva</span>
            <input value={item.color} onChange={(e) => patch({ color: e.target.value })} />
          </label>
          <label className="field">
            <span>Velikost</span>
            <input value={item.size} onChange={(e) => patch({ size: e.target.value })} />
          </label>
          <label className="field">
            <span>Cena v Kč</span>
            <input inputMode="numeric" value={item.price} onChange={(e) => patch({ price: e.target.value })} />
          </label>
          <label className="field">
            <span>Popis</span>
            <textarea value={item.description} onChange={(e) => patch({ description: e.target.value })} />
          </label>
          <div className="btn-row two">
            <button className="btn btn-ghost" onClick={() => void copyText('název', item.title)}>
              {copied === 'název' ? 'Zkopírováno' : 'Kopírovat název'}
            </button>
            <button className="btn btn-ghost" onClick={() => void copyText('popis', item.description)}>
              {copied === 'popis' ? 'Zkopírováno' : 'Kopírovat popis'}
            </button>
          </div>
          <div className="btn-row" style={{ marginTop: 10 }}>
            <button className="btn btn-ghost" onClick={() => void copyAll()}>
              {copied === 'vše' ? 'Zkopírováno vše' : 'Kopírovat vše'}
            </button>
            <button className="btn btn-ghost" onClick={downloadPhotos}>
              Stáhnout fotky
            </button>
            <a className="btn btn-accent" href={VINTED_NEW_ITEM_URL} target="_blank" rel="noreferrer">
              Otevřít Vinted
            </a>
            <button
              className="btn btn-primary"
              onClick={() => patch({ status: item.status === 'listed' ? 'ready' : 'listed' })}
            >
              {item.status === 'listed' ? 'Označit jako připravené' : 'Označit jako vystavené'}
            </button>
          </div>
        </section>
      )}
    </>
  )
}
