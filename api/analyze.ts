const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SYSTEM = `Jsi asistent pro přípravu inzerátů second-hand oblečení na Vinted CZ.
Pravidla:
- Čti visačky, štítky, loga a celý kousek na fotkách.
- Nikdy nevymýšlej značku, velikost, materiál ani cenu. Když to není jasně vidět, nech prázdné.
- Nikdy netvrď autenticitu.
- Nikdy netvrď „bez vad“ / „jako nové“, pokud to fotky 100% neukazují.
- Vady nezmenšuj ani neschovávej.
- Popis piš přirozenou češtinou, bez hashtagů a bez přehánění.
- Ceny označ jako odhad, ne jako ověřenou cenu z Vintedu.
- Odpověz POUZE validním JSON, bez markdownu.`

const SCHEMA = `{
  "targetGroup": "Dámské|Pánské|Dětské|",
  "itemType": "",
  "brand": "",
  "brandConfidence": 0,
  "size": "",
  "color": "",
  "material": "",
  "condition": "Nové s visačkou|Nové bez visačky|Velmi dobrý stav|Dobrý stav|Uspokojivý stav|",
  "defects": "",
  "detectedLabelText": [],
  "title": "",
  "description": "",
  "price": "",
  "priceNote": "",
  "missingInformation": [],
  "warnings": []
}`

type AnalyzeBody = {
  images?: string[]
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function extractText(payload: Record<string, unknown>): string {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text
  }
  const output = payload.output
  if (Array.isArray(output)) {
    const chunks: string[] = []
    for (const item of output) {
      const content = (item as { content?: unknown }).content
      if (!Array.isArray(content)) continue
      for (const part of content) {
        const text = (part as { text?: unknown }).text
        if (typeof text === 'string') chunks.push(text)
      }
    }
    if (chunks.length) return chunks.join('\n')
  }
  const choices = payload.choices
  if (Array.isArray(choices)) {
    const content = (choices[0] as { message?: { content?: unknown } } | undefined)?.message?.content
    if (typeof content === 'string') return content
  }
  return ''
}

function parseJson(raw: string): Record<string, unknown> {
  const trimmed = raw.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('AI nevrátila JSON.')
  return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim()
}

function asList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : []
}

export async function OPTIONS() {
  return new Response('ok', { headers: CORS })
}

export async function POST(request: Request) {
  const apiKey = process.env.XAI_API_KEY
  if (!apiKey) {
    return json(
      {
        error:
          'AI ještě není zapnutá. Chybí XAI_API_KEY na serveru. Klíč se bere na console.x.ai a nesmí jít do prohlížeče.',
      },
      503,
    )
  }

  let body: AnalyzeBody
  try {
    body = (await request.json()) as AnalyzeBody
  } catch {
    return json({ error: 'Neplatná data.' }, 400)
  }

  const images = (body.images ?? []).filter(
    (item) => typeof item === 'string' && item.startsWith('data:image/'),
  )
  if (!images.length) return json({ error: 'Pošlete aspoň jednu fotku.' }, 400)

  const content: Array<Record<string, unknown>> = images.slice(0, 8).map((image) => ({
    type: 'input_image',
    image_url: image,
    detail: 'high',
  }))
  content.push({
    type: 'input_text',
    text: `Analyzuj VŠECHNY fotografie jako JEDEN kousek oblečení.
Přečti visačky a loga. Pak použij web search a zjisti přibližnou použitou cenu v ČR (Kč) pro stejnou nebo velmi podobnou věc.
Nevymýšlej značku, pokud není na fotce. Vrať jen JSON:
${SCHEMA}`,
  })

  const aiRes = await fetch('https://api.x.ai/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.XAI_MODEL || 'grok-4.6',
      input: [{ role: 'user', content }],
      tools: [{ type: 'web_search' }],
    }),
  })

  if (!aiRes.ok) {
    const detail = (await aiRes.text()).slice(0, 400)
    if (aiRes.status === 401) return json({ error: 'Neplatný XAI_API_KEY.' }, 502)
    if (aiRes.status === 429) return json({ error: 'AI je teď zaneprázdněná. Zkus to za chvíli.' }, 429)
    return json({ error: 'AI služba selhala.', detail }, 502)
  }

  const payload = (await aiRes.json()) as Record<string, unknown>
  const raw = extractText(payload)
  if (!raw) return json({ error: 'AI nevrátila výsledek.' }, 502)

  let parsed: Record<string, unknown>
  try {
    parsed = parseJson(raw)
  } catch {
    return json({ error: 'AI vrátila nečitelný výsledek. Zkus ostřejší fotku visačky.' }, 502)
  }

  return json({
    targetGroup: asString(parsed.targetGroup),
    itemType: asString(parsed.itemType),
    brand: asString(parsed.brand),
    brandConfidence: Number(parsed.brandConfidence) || 0,
    size: asString(parsed.size),
    color: asString(parsed.color),
    material: asString(parsed.material),
    condition: asString(parsed.condition),
    defects: asString(parsed.defects),
    detectedLabelText: asList(parsed.detectedLabelText),
    title: asString(parsed.title),
    description: asString(parsed.description),
    price: asString(parsed.price).replace(/[^\d]/g, ''),
    priceNote: asString(parsed.priceNote),
    missingInformation: asList(parsed.missingInformation),
    warnings: asList(parsed.warnings),
  })
}
