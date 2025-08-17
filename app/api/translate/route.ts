import { generateText } from "ai"
import { google } from "@ai-sdk/google"
import { type NextRequest, NextResponse } from "next/server"

// Language code to full name mapping for better translation context
const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  ru: "Russian",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  ar: "Arabic",
  hi: "Hindi",
  bn: "Bengali",
  ur: "Urdu",
  fa: "Persian",
  tr: "Turkish",
  nl: "Dutch",
  sv: "Swedish",
  no: "Norwegian",
  da: "Danish",
  fi: "Finnish",
  pl: "Polish",
  cs: "Czech",
  sk: "Slovak",
  hu: "Hungarian",
  ro: "Romanian",
  bg: "Bulgarian",
  hr: "Croatian",
  sr: "Serbian",
  sl: "Slovenian",
  et: "Estonian",
  lv: "Latvian",
  lt: "Lithuanian",
  el: "Greek",
  he: "Hebrew",
  th: "Thai",
  vi: "Vietnamese",
  id: "Indonesian",
  ms: "Malay",
  tl: "Filipino",
  sw: "Swahili",
  am: "Amharic",
  gu: "Gujarati",
  kn: "Kannada",
  ml: "Malayalam",
  mr: "Marathi",
  pa: "Punjabi",
  ta: "Tamil",
  te: "Telugu",
  uk: "Ukrainian",
  be: "Belarusian",
  ka: "Georgian",
  hy: "Armenian",
  az: "Azerbaijani",
  kk: "Kazakh",
  ky: "Kyrgyz",
  uz: "Uzbek",
  tg: "Tajik",
  tk: "Turkmen",
  mn: "Mongolian",
  ne: "Nepali",
  si: "Sinhala",
  my: "Myanmar",
  km: "Khmer",
  lo: "Lao",
  bo: "Tibetan",
  dz: "Dzongkha",
}

export async function POST(request: NextRequest) {
  try {
    const { text, fromLanguage, toLanguage } = await request.json()

    if (!text || !fromLanguage || !toLanguage) {
      return NextResponse.json({ error: "Missing required fields: text, fromLanguage, toLanguage" }, { status: 400 })
    }

    // If source and target languages are the same, return original text
    if (fromLanguage === toLanguage) {
      return NextResponse.json({ translatedText: text })
    }

    const fromLangName = LANGUAGE_NAMES[fromLanguage] || fromLanguage
    const toLangName = LANGUAGE_NAMES[toLanguage] || toLanguage

    const { text: translatedText } = await generateText({
      model: google("gemini-1.5-flash"), // Using Gemini 1.5 Flash for free tier and speed
      prompt: `You are a professional translator. Translate the following text from ${fromLangName} to ${toLangName}. 

Important instructions:
- Provide ONLY the translation, no explanations or additional text
- Maintain the original tone and context
- If the text is already in ${toLangName}, return it as-is
- For informal messages, keep the informal tone
- For formal messages, maintain formality
- Preserve any emotions or expressions in the text

Text to translate: "${text}"

Translation:`,
      maxTokens: 500,
      temperature: 0.3, // Lower temperature for more consistent translations
    })

    return NextResponse.json({
      translatedText: translatedText.trim(),
      fromLanguage,
      toLanguage,
    })
  } catch (error) {
    console.error("Translation error:", error)

    // Return a fallback response instead of exposing the error
    return NextResponse.json(
      {
        error: "Translation service temporarily unavailable",
        translatedText: `[Translation unavailable] ${(await request.json()).text}`,
      },
      { status: 500 },
    )
  }
}
