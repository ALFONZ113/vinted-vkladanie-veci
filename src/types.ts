export type PhotoKind = 'front' | 'back' | 'label' | 'detail' | 'defect' | 'other'

export type ItemStatus = 'draft' | 'ready' | 'listed'

export type Photo = {
  id: string
  dataUrl: string
  kind: PhotoKind
}

export type Item = {
  id: string
  createdAt: string
  updatedAt: string
  status: ItemStatus
  photos: Photo[]
  targetGroup: string
  itemType: string
  brand: string
  size: string
  color: string
  material: string
  condition: string
  defects: string
  originalPrice: string
  price: string
  note: string
  title: string
  description: string
}

export const PHOTO_KINDS: { id: PhotoKind; label: string; hint: string }[] = [
  { id: 'front', label: 'Zepředu', hint: 'Celý kousek' },
  { id: 'back', label: 'Zezadu', hint: 'Celý kousek' },
  { id: 'label', label: 'Štítek', hint: 'Značka a velikost' },
  { id: 'detail', label: 'Detail', hint: 'Látka nebo vzor' },
  { id: 'defect', label: 'Vada', hint: 'Pokud nějaká je' },
  { id: 'other', label: 'Další', hint: 'Libovolná fotka' },
]

export const TARGET_GROUPS = ['Dámské', 'Pánské', 'Dětské']

export const ITEM_TYPES = [
  'Tričko',
  'Košile',
  'Mikina',
  'Svetr',
  'Šaty',
  'Sukně',
  'Kalhoty',
  'Džíny',
  'Bunda',
  'Kabát',
  'Boty',
  'Taška',
  'Doplněk',
  'Jiné',
]

export const CONDITIONS = [
  'Nové s visačkou',
  'Nové bez visačky',
  'Velmi dobrý stav',
  'Dobrý stav',
  'Uspokojivý stav',
]

export const VINTED_NEW_ITEM_URL = 'https://www.vinted.cz/items/new'
