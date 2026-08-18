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

const ALLOWED_ORIGINS = [
  'https://alfonz113.github.io',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
]

function corsHeaders(origin: string | null): Record<string, string> {
  const allow =
    origin &&
    (ALLOWED_ORIGINS.includes(origin) ||
      origin.startsWith('http://192.168.') ||
      origin.startsWith('http://10.') ||
      origin.startsWith('http://172.'))
      ? origin
      : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

function json(data: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  })
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim()
}

function asList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : []
}

function parseModelJson(raw: string): Record<string, unknown> {
  const trimmed = raw.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('AI nevrátila JSON.')
  return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>
}

export default {
  async fetch(request: Request, env: { XAI_API_KEY?: string }): Promise<Response> {
    const origin = request.headers.get('Origin')
    if (request.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders(origin) })
    }
    if (request.method !== 'POST') {
      return json({ error: 'Použij POST.' }, 405, origin)
    }

    const apiKey = env.XAI_API_KEY
    if (!apiKey) {
      return json({ error: 'AI server nemá klíč.' }, 503, origin)
    }

    let body: { images?: string[] }
    try {
      body = (await request.json()) as { images?: string[] }
    } catch {
      return json({ error: 'Neplatná data.' }, 400, origin)
    }

    const images = (body.images ?? []).filter(
      (item) => typeof item === 'string' && item.startsWith('data:image/'),
    )
    if (!images.length) return json({ error: 'Pošlete aspoň jednu fotku.' }, 400, origin)

    const content: Array<Record<string, unknown>> = images.slice(0, 6).map((image) => ({
      type: 'image_url',
      image_url: { url: image, detail: 'high' },
    }))
    content.push({
      type: 'text',
      text: `Analyzuj VŠECHNY fotografie jako JEDEN kousek oblečení.
Přečti visačky a loga. Najdi přibližnou použitou cenu v ČR (Kč) pro stejnou nebo velmi podobnou věc.
Nevymýšlej značku, pokud není na fotce. Vrať jen JSON:
${SCHEMA}`,
    })

    const aiRes = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-4.6',
        temperature: 0.2,
        search_parameters: { mode: 'on', return_citations: true },
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content },
        ],
      }),
    })

    if (!aiRes.ok) {
      const detail = (await aiRes.text()).slice(0, 300)
      if (aiRes.status === 401) return json({ error: 'AI klíč vypršel. Napiš mi a obnovíme ho.' }, 502, origin)
      if (aiRes.status === 429) return json({ error: 'AI je teď zaneprázdněná. Zkus to za chvíli.' }, 429, origin)
      return json({ error: 'AI služba selhala.', detail }, 502, origin)
    }

    const payload = (await aiRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const raw = payload.choices?.[0]?.message?.content ?? ''
    if (!raw) return json({ error: 'AI nevrátila výsledek.' }, 502, origin)

    let parsed: Record<string, unknown>
    try {
      parsed = parseModelJson(raw)
    } catch {
      return json({ error: 'AI vrátila nečitelný výsledek. Zkus ostřejší fotku visačky.' }, 502, origin)
    }

    return json(
      {
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
      },
      200,
      origin,
    )
  },
}
