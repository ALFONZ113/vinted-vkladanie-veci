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
  return import.meta.env.VITE_ANALYZE_URL || '/api/analyze'
}

export async function analyzePhotos(images: string[]): Promise<AnalyzeResult> {
  const response = await fetch(analyzeUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images }),
  })

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
