import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { uid } from '../lib/id'
import { buildListing, missingForListing, suggestPrices } from '../lib/listing'
import { downloadDataUrl, fileToDataUrl } from '../lib/photos'
import { itemsStore } from '../lib/storage'
import {
  CONDITIONS,
  ITEM_TYPES,
  PHOTO_KINDS,
  TARGET_GROUPS,
  VINTED_NEW_ITEM_URL,
  type Item,
  type PhotoKind,
} from '../types'

type Step = 'photos' | 'details' | 'listing'

export function ItemPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = useState<Item | null>(null)
  const [step, setStep] = useState<Step>('photos')
  const [kind, setKind] = useState<PhotoKind>('front')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

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

  const suggestions = useMemo(() => (item ? suggestPrices(item) : []), [item])
  const missing = item ? missingForListing(item) : []

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
          kind,
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

  const compose = () => {
    if (!item) return
    const listing = buildListing(item)
    persist({
      ...item,
      title: item.title.trim() || listing.title,
      description: item.description.trim() || listing.description,
    })
    setStep('listing')
  }

  const copyText = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value)
    setCopied(label)
    window.setTimeout(() => setCopied(null), 1600)
  }

  const copyAll = async () => {
    if (!item) return
    const text = [
      item.title,
      '',
      item.description,
      '',
      item.price ? `Cena: ${item.price} Kč` : '',
    ]
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

      <div className="steps">
        <button className={`step ${step === 'photos' ? 'active' : ''}`} onClick={() => setStep('photos')}>
          <small>1</small>
          Fotky
        </button>
        <button className={`step ${step === 'details' ? 'active' : ''}`} onClick={() => setStep('details')}>
          <small>2</small>
          Údaje
        </button>
        <button className={`step ${step === 'listing' ? 'active' : ''}`} onClick={() => setStep('listing')}>
          <small>3</small>
          Inzerát
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {step === 'photos' && (
        <section className="card section">
          <h2>Vyfoť nebo nahraj fotky</h2>
          <div className="kind-row">
            {PHOTO_KINDS.map((option) => (
              <button
                key={option.id}
                className={`chip ${kind === option.id ? 'active' : ''}`}
                onClick={() => setKind(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="muted">
            Teď přidáváš: {PHOTO_KINDS.find((option) => option.id === kind)?.hint}. Ideálně 5–8 fotek.
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
            <button className="btn btn-primary" onClick={() => setStep('details')}>
              Pokračovat k údajům
            </button>
          </div>
        </section>
      )}

      {step === 'details' && (
        <section className="card section">
          <h2>Doplň jen to, co víš</h2>
          <label className="field">
            <span>Pro koho</span>
            <select value={item.targetGroup} onChange={(e) => patch({ targetGroup: e.target.value })}>
              <option value="">Nevybráno</option>
              {TARGET_GROUPS.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Typ</span>
            <select value={item.itemType} onChange={(e) => patch({ itemType: e.target.value })}>
              <option value="">Nevybráno</option>
              {ITEM_TYPES.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Značka</span>
            <input
              value={item.brand}
              placeholder="Jen když je na štítku"
              onChange={(e) => patch({ brand: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Velikost</span>
            <input value={item.size} onChange={(e) => patch({ size: e.target.value })} />
          </label>
          <label className="field">
            <span>Barva</span>
            <input value={item.color} onChange={(e) => patch({ color: e.target.value })} />
          </label>
          <label className="field">
            <span>Materiál</span>
            <input value={item.material} onChange={(e) => patch({ material: e.target.value })} />
          </label>
          <label className="field">
            <span>Stav</span>
            <select value={item.condition} onChange={(e) => patch({ condition: e.target.value })}>
              <option value="">Nevybráno</option>
              {CONDITIONS.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Vady</span>
            <input
              value={item.defects}
              placeholder="Díra, žmolky, flek…"
              onChange={(e) => patch({ defects: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Původní cena v Kč</span>
            <input
              inputMode="numeric"
              value={item.originalPrice}
              onChange={(e) => patch({ originalPrice: e.target.value })}
            />
          </label>
          {suggestions.length > 0 && (
            <div className="price-pills">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.label}
                  type="button"
                  onClick={() => patch({ price: String(suggestion.amount) })}
                >
                  {suggestion.label}: {suggestion.amount} Kč
                </button>
              ))}
            </div>
          )}
          <label className="field">
            <span>Tvoje cena v Kč</span>
            <input
              inputMode="numeric"
              value={item.price}
              onChange={(e) => patch({ price: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Poznámka</span>
            <input
              value={item.note}
              placeholder="Třeba: prané, kouřeny nebylo"
              onChange={(e) => patch({ note: e.target.value })}
            />
          </label>
          {missing.length > 0 && (
            <div className="notice">Ještě chybí: {missing.join(', ')}. Můžeš pokračovat i tak.</div>
          )}
          <div className="btn-row" style={{ marginTop: 16 }}>
            <button className="btn btn-primary" onClick={compose}>
              Sestavit inzerát
            </button>
          </div>
        </section>
      )}

      {step === 'listing' && (
        <section className="card section">
          <h2>Zkontroluj a zkopíruj</h2>
          <label className="field">
            <span>Název</span>
            <input value={item.title} onChange={(e) => patch({ title: e.target.value })} />
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
