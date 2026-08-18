export type AnalyzeResult = {
  targetGroup: string
  itemType: string
  brand: string
  brandConfidence: number
  size: string
  color: string
  material: string
  condition: string
  defects: string
  detectedLabelText: string[]
  title: string
  description: string
  price: string
  priceNote: string
  missingInformation: string[]
  warnings: string[]
}

function analyzeUrl(): string {
  return import.meta.env.VITE_ANALYZE_URL || 'https://vinted-analyze.incandescent-ornament.workers.dev'
}

export async function analyzePhotos(images: string[]): Promise<AnalyzeResult> {
  let response: Response
  try {
    response = await fetch(analyzeUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images: images.slice(0, 4) }),
    })
  } catch {
    throw new Error(
      'AI server právě není dostupný. Zkus to za chvíli znovu, nebo otevři appku znovu v nové kartě.',
    )
  }

  const payload = (await response.json().catch(() => ({}))) as AnalyzeResult & {
    error?: string
  }

  if (response.status === 404) {
    throw new Error(
      'AI server ještě není zapnutý. GitHub Pages umí jen stránku. Čtení visaček potřebuje tajný klíč na Vercelu.',
    )
  }

  if (!response.ok) {
    throw new Error(payload.error || 'Analýza se nezdařila.')
  }

  return payload
}
