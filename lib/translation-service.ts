interface TranslationRequest {
  text: string
  fromLanguage: string
  toLanguage: string
}

interface TranslationResponse {
  translatedText: string
  fromLanguage: string
  toLanguage: string
  error?: string
}

interface LanguageDetectionRequest {
  text: string
}

interface LanguageDetectionResponse {
  detectedLanguage: string
  confidence: number
  error?: string
}

class TranslationService {
  private cache = new Map<string, string>()
  private detectionCache = new Map<string, string>()

  private getCacheKey(text: string, fromLang: string, toLang: string): string {
    return `${fromLang}-${toLang}-${text}`
  }

  async detectLanguage(text: string): Promise<LanguageDetectionResponse> {
    // Check detection cache first
    const cached = this.detectionCache.get(text)
    if (cached) {
      return {
        detectedLanguage: cached,
        confidence: 1.0,
      }
    }

    try {
      const response = await fetch("/api/detect-language", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        throw new Error(`Language detection failed: ${response.statusText}`)
      }

      const result: LanguageDetectionResponse = await response.json()

      // Cache successful detections
      if (result.detectedLanguage && !result.error) {
        this.detectionCache.set(text, result.detectedLanguage)
      }

      return result
    } catch (error) {
      console.error("Language detection error:", error)
      return {
        detectedLanguage: "english", // Default fallback
        confidence: 0.0,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  async translateText(request: TranslationRequest): Promise<TranslationResponse> {
    const { text, fromLanguage, toLanguage } = request

    // Check cache first
    const cacheKey = this.getCacheKey(text, fromLanguage, toLanguage)
    const cached = this.cache.get(cacheKey)
    if (cached) {
      return {
        translatedText: cached,
        fromLanguage,
        toLanguage,
      }
    }

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        throw new Error(`Translation failed: ${response.statusText}`)
      }

      const result: TranslationResponse = await response.json()

      // Cache successful translations
      if (result.translatedText && !result.error) {
        this.cache.set(cacheKey, result.translatedText)
      }

      return result
    } catch (error) {
      console.error("Translation service error:", error)
      return {
        translatedText: `[Translation failed] ${text}`,
        fromLanguage,
        toLanguage,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  async translateForMultipleUsersWithDetection(
    text: string,
    userSelectedLanguage: string,
    targetLanguages: string[],
  ): Promise<{ translations: Record<string, string>; detectedLanguage: string }> {
    const translations: Record<string, string> = {}

    // First, detect the actual language of the text
    const detection = await this.detectLanguage(text)
    const actualSourceLanguage = detection.detectedLanguage

    // Create translation promises for all target languages
    const translationPromises = targetLanguages.map(async (targetLang) => {
      if (targetLang === actualSourceLanguage) {
        translations[targetLang] = text
        return
      }

      try {
        const result = await this.translateText({
          text,
          fromLanguage: actualSourceLanguage,
          toLanguage: targetLang,
        })
        translations[targetLang] = result.translatedText
      } catch (error) {
        console.error(`Failed to translate to ${targetLang}:`, error)
        translations[targetLang] = `[Translation failed] ${text}`
      }
    })

    await Promise.all(translationPromises)
    return { translations, detectedLanguage: actualSourceLanguage }
  }

  async translateForMultipleUsers(
    text: string,
    fromLanguage: string,
    targetLanguages: string[],
  ): Promise<Record<string, string>> {
    const translations: Record<string, string> = {}

    // Create translation promises for all target languages
    const translationPromises = targetLanguages.map(async (targetLang) => {
      if (targetLang === fromLanguage) {
        translations[targetLang] = text
        return
      }

      try {
        const result = await this.translateText({
          text,
          fromLanguage,
          toLanguage: targetLang,
        })
        translations[targetLang] = result.translatedText
      } catch (error) {
        console.error(`Failed to translate to ${targetLang}:`, error)
        translations[targetLang] = `[Translation failed] ${text}`
      }
    })

    await Promise.all(translationPromises)
    return translations
  }

  clearCache(): void {
    this.cache.clear()
    this.detectionCache.clear()
  }
}

export const translationService = new TranslationService()
