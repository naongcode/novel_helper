import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import type { GeneratePlotRequest } from "@/lib/types"
import { WORLD_SECTIONS } from "@/lib/types"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  const body: GeneratePlotRequest = await req.json()
  const { chapterCount, concept, genres, world, characters, existingChapters, insertAfter } = body
  const genreStr = genres?.length ? genres.join(", ") : "장르 미정"

  const worldSummary = WORLD_SECTIONS
    .map(({ key, label }) => world[key] ? `[${label}] ${world[key]}` : "")
    .filter(Boolean)
    .join("\n")
    .slice(0, 2000)

  const charList = characters.map((c) => `- ${c.name}(${c.role}): ${c.personality.slice(0, 80)}`).join("\n")

  let insertionContext = ""
  if (existingChapters && existingChapters.length > 0 && insertAfter !== undefined) {
    const before = existingChapters.filter((c) => c.number <= insertAfter)
    const after = existingChapters.filter((c) => c.number > insertAfter)

    if (before.length > 0) {
      insertionContext += `\n[앞에 오는 기존 챕터]\n` + before.map((c) => `${c.number}챕터 "${c.title}": ${c.summary}`).join("\n")
    }
    insertionContext += `\n\n← 이 위치에 새 챕터 ${chapterCount}개 삽입 →\n`
    if (after.length > 0) {
      insertionContext += `\n[뒤에 오는 기존 챕터]\n` + after.map((c) => `${c.number}챕터 "${c.title}": ${c.summary}`).join("\n")
    }
  }

  const isInsertion = !!insertionContext

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: [
          "당신은 소설 플롯 전문 작가입니다.",
          `장르: ${genreStr}`,
          `가치관: ${concept.theme}`,
          `엔딩: ${concept.ending}`,
          `분위기: ${concept.tone}`,
          isInsertion
            ? `기존 줄거리의 앞뒤 흐름을 자연스럽게 연결하는 챕터 ${chapterCount}개를 작성하세요.`
            : `기승전결 구조로 흥미롭고 탄탄한 챕터 ${chapterCount}개를 작성하세요.`,
          `반드시 {"chapters": [...]} 형식의 JSON 객체만 출력하세요.`,
        ].filter(Boolean).join("\n"),
      },
      {
        role: "user",
        content: [
          `챕터 수: ${chapterCount}`,
          `\n세계관:\n${worldSummary || "없음"}`,
          `\n등장인물:\n${charList || "없음"}`,
          insertionContext ? `\n${insertionContext}` : "",
          `\n{"chapters": [...]} 형식으로 출력하세요. chapters 배열의 각 요소:\n{"number": 1, "title": "제목", "summary": "요약(2~4문장)", "keyEvents": ["사건1"], "scenes": [{"order": 1, "description": "장면 설명"}]}`,
        ].filter(Boolean).join("\n"),
      },
    ],
    response_format: { type: "json_object" },
  })

  const content = completion.choices[0].message.content ?? "{}"
  const parsed = JSON.parse(content)
  const chapters = Array.isArray(parsed) ? parsed : (parsed.chapters ?? parsed.data ?? [])
  return NextResponse.json(chapters)
}
