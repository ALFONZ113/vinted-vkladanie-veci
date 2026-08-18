import type { Item } from '../types'
import { nowIso, uid } from './id'

const KEY = 'do-vinted-items-v1'

function emptyItem(): Item {
  const stamp = nowIso()
  return {
    id: uid(),
    createdAt: stamp,
    updatedAt: stamp,
    status: 'draft',
    photos: [],
    targetGroup: '',
    itemType: '',
    brand: '',
    size: '',
    color: '',
    material: '',
    condition: '',
    defects: '',
    originalPrice: '',
    price: '',
    note: '',
    title: '',
    description: '',
    priceNote: '',
    missingInformation: [],
    detectedLabelText: [],
  }
}

function normalize(item: Partial<Item>): Item {
  return {
    ...emptyItem(),
    ...item,
    photos: item.photos ?? [],
    missingInformation: item.missingInformation ?? [],
    detectedLabelText: item.detectedLabelText ?? [],
    priceNote: item.priceNote ?? '',
  }
}

function readAll(): Item[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Partial<Item>[]
    return Array.isArray(parsed) ? parsed.map(normalize) : []
  } catch {
    return []
  }
}

function writeAll(items: Item[]) {
  localStorage.setItem(KEY, JSON.stringify(items))
}

export const itemsStore = {
  list(): Item[] {
    return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  },

  get(id: string): Item | undefined {
    return readAll().find((item) => item.id === id)
  },

  create(): Item {
    const item = emptyItem()
    writeAll([item, ...readAll()])
    return item
  },

  save(next: Item): Item {
    const ready = Boolean(next.title.trim() && next.description.trim() && next.photos.length)
    const saved: Item = {
      ...next,
      updatedAt: nowIso(),
      status: next.status === 'listed' ? 'listed' : ready ? 'ready' : 'draft',
    }
    const items = readAll()
    const index = items.findIndex((item) => item.id === saved.id)
    if (index === -1) writeAll([saved, ...items])
    else {
      items[index] = saved
      writeAll(items)
    }
    return saved
  },

  remove(id: string) {
    writeAll(readAll().filter((item) => item.id !== id))
  },
}
