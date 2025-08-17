import { generateText } from "ai"
import { google } from "@ai-sdk/google"
import { type NextRequest, NextResponse } from "next/server"

// Language code mapping for consistent detection results
const LANGUAGE_CODES: Record<string, string> = {
  english: "english",
  spanish: "spanish",
  french: "french",
  german: "german",
  italian: "italian",
  portuguese: "portuguese",
  russian: "russian",
  japanese: "japanese",
  korean: "korean",
  chinese: "chinese",
  arabic: "arabic",
  hindi: "hindi",
  bengali: "bengali",
  urdu: "urdu",
  persian: "persian",
  turkish: "turkish",
  dutch: "dutch",
  swedish: "swedish",
  norwegian: "norwegian",
  danish: "danish",
  finnish: "finnish",
  polish: "polish",
  czech: "czech",
  slovak: "slovak",
  hungarian: "hungarian",
  romanian: "romanian",
  bulgarian: "bulgarian",
  croatian: "croatian",
  serbian: "serbian",
  slovenian: "slovenian",
  estonian: "estonian",
  latvian: "latvian",
  lithuanian: "lithuanian",
  greek: "greek",
  hebrew: "hebrew",
  thai: "thai",
  vietnamese: "vietnamese",
  indonesian: "indonesian",
  malay: "malay",
  filipino: "filipino",
  swahili: "swahili",
  amharic: "amharic",
  gujarati: "gujarati",
  kannada: "kannada",
  malayalam: "malayalam",
  marathi: "marathi",
  punjabi: "punjabi",
  tamil: "tamil",
  telugu: "telugu",
  ukrainian: "ukrainian",
  belarusian: "belarusian",
  georgian: "georgian",
  armenian: "armenian",
  azerbaijani: "azerbaijani",
  kazakh: "kazakh",
  kyrgyz: "kyrgyz",
  uzbek: "uzbek",
  tajik: "tajik",
  turkmen: "turkmen",
  mongolian: "mongolian",
  nepali: "nepali",
  sinhala: "sinhala",
  myanmar: "myanmar",
  khmer: "khmer",
  lao: "lao",
  tibetan: "tibetan",
  dzongkha: "dzongkha",
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: "Missing or empty text" }, { status: 400 })
    }

    // For very short texts, default to English
    if (text.trim().length < 3) {
      return NextResponse.json({
        detectedLanguage: "english",
        confidence: 0.5,
      })
    }

    const { text: detectionResult } = await generateText({
      model: google("gemini-1.5-flash"),
      prompt: `You are a language detection expert. Analyze the following text and identify what language it is written in.

Important instructions:
- Respond with ONLY the language name in lowercase (e.g., "english", "spanish", "hindi", "chinese")
- Be confident in your detection
- If you're unsure, default to "english"
- Consider context clues like script, common words, and grammar patterns
- For mixed language text, identify the primary language

Available languages: ${Object.keys(LANGUAGE_CODES).join(", ")}

Text to analyze: "${text}"

Detected language:`,
      maxTokens: 50,
      temperature: 0.1, // Very low temperature for consistent detection
    })

    const detectedLanguage = detectionResult.trim().toLowerCase()

    // Validate the detected language is in our supported list
    const normalizedLanguage = LANGUAGE_CODES[detectedLanguage] || "english"

    return NextResponse.json({
      detectedLanguage: normalizedLanguage,
      confidence: detectedLanguage in LANGUAGE_CODES ? 0.9 : 0.5,
    })
  } catch (error) {
    console.error("Language detection error:", error)

    return NextResponse.json(
      {
        error: "Language detection service temporarily unavailable",
        detectedLanguage: "english", // Safe fallback
        confidence: 0.0,
      },
      { status: 500 },
    )
  }
}
