import type { Item } from '../types'

function clean(value: string): string {
  return value.trim()
}

function sentenceCase(value: string): string {
  const text = clean(value)
  if (!text) return ''
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function suggestPrices(item: Item): { label: string; amount: number }[] {
  const original = Number(item.originalPrice.replace(',', '.'))
  const base = Number.isFinite(original) && original > 0 ? original : 0
  if (!base) return []

  const condition = item.condition
  let ratio = 0.35
  if (condition.startsWith('Nové s visačkou')) ratio = 0.55
  else if (condition.startsWith('Nové')) ratio = 0.45
  else if (condition.startsWith('Velmi')) ratio = 0.38
  else if (condition.startsWith('Dobrý')) ratio = 0.28
  else if (condition.startsWith('Uspokojivý')) ratio = 0.2

  const recommended = Math.max(50, Math.round((base * ratio) / 10) * 10)
  return [
    { label: 'Rychlý prodej', amount: Math.max(40, recommended - 40) },
    { label: 'Doporučená cena', amount: recommended },
    { label: 'S prostorem pro nabídky', amount: recommended + 40 },
  ]
}

export function buildListing(item: Item): { title: string; description: string } {
  const group = clean(item.targetGroup)
  const type = clean(item.itemType)
  const brand = clean(item.brand)
  const color = clean(item.color)
  const size = clean(item.size)
  const material = clean(item.material)
  const condition = clean(item.condition)
  const defects = clean(item.defects)
  const note = clean(item.note)

  const titleParts = [group, color, type || 'kousek', brand].filter(Boolean)
  let title = titleParts.join(' ')
  if (size) title += `, vel. ${size}`
  title = sentenceCase(title)

  const lines: string[] = []
  const first: string[] = []
  if (group) first.push(group.toLowerCase())
  if (color) first.push(color.toLowerCase())
  first.push(type ? type.toLowerCase() : 'kousek')
  if (brand) first.push(brand)

  let opener = sentenceCase(first.join(' '))
  if (size) opener += ` ve velikosti ${size}`
  opener += '.'
  lines.push(opener)

  if (material) {
    lines.push(`Materiál: ${material}.`)
  }

  if (condition) {
    lines.push(`Stav: ${condition.toLowerCase()}.`)
  }

  if (defects) {
    lines.push(`Vady: ${defects}.`)
  } else if (condition && !condition.startsWith('Nové')) {
    lines.push('Viditelné známky nošení jsou na fotografiích.')
  }

  if (note) {
    lines.push(note.endsWith('.') ? note : `${note}.`)
  }

  lines.push('Fotografie odpovídají skutečnému stavu.')
  lines.push('Osobní předání po dohodě, nebo posílám.')

  return {
    title: title.slice(0, 80),
    description: lines.join('\n\n'),
  }
}

export function missingForListing(item: Item): string[] {
  const missing: string[] = []
  if (item.photos.length === 0) missing.push('aspoň jednu fotku')
  if (!item.itemType) missing.push('typ oblečení')
  if (!item.size) missing.push('velikost')
  if (!item.condition) missing.push('stav')
  if (!item.price) missing.push('cenu')
  return missing
}
