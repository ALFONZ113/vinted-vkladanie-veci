import { Link } from 'react-router-dom'
import { itemsStore } from '../lib/storage'
import type { Item } from '../types'

const STATUS: Record<Item['status'], string> = {
  draft: 'Rozpracováno',
  ready: 'Připraveno',
  listed: 'Vystaveno',
}

export function HomePage() {
  const items = itemsStore.list()

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <small>Příprava inzerátu</small>
          <strong>Do Vinted</strong>
        </div>
      </header>

      <section className="card hero-card">
        <h1>Vyfoť věc. AI doplní zbytek.</h1>
        <p>
          Vyfoť kousek a visačku. Appka přečte značku, barvu a velikost, najde přibližnou cenu a
          napíše český inzerát. Na Vinted to vložíš ručně.
        </p>
        <Link className="btn btn-primary" to="/nova">
          Přidat věc
        </Link>
      </section>

      {items.length === 0 ? (
        <div className="card empty">Zatím tu nic není. Přidej první kousek.</div>
      ) : (
        <div className="item-list">
          {items.map((item) => (
            <Link key={item.id} className="card item-link" to={`/vec/${item.id}`}>
              {item.photos[0] ? (
                <img className="thumb" src={item.photos[0].dataUrl} alt="" />
              ) : (
                <div className="thumb empty">bez fotky</div>
              )}
              <div className="item-copy">
                <strong>{item.title || item.itemType || 'Bez názvu'}</strong>
                <span>
                  {item.brand || 'Značka neznámá'}
                  {item.price ? ` · ${item.price} Kč` : ''}
                </span>
              </div>
              <span className={`badge ${item.status}`}>{STATUS[item.status]}</span>
            </Link>
          ))}
        </div>
      )}

      <p className="legal">
        Nezávislý nástroj. Není spojený s Vinted a automaticky se tam nepřihlašuje.
      </p>
    </>
  )
}
