import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import type { GenerateCharacterRequest } from "@/lib/types"
import { appendUsage } from "@/lib/storage"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function cost(input: number, output: number) {
  return input * 2.5e-6 + output * 1e-5
}

export async function POST(req: NextRequest) {
  const body: GenerateCharacterRequest = await req.json()
  const { name, role, concept, genres, world, existingCharacters, projectId } = body
  const genreStr = genres?.length ? genres.join(", ") : "장르 미정"
  const isRandom = !name && !role
  const count = Math.min(Math.max(Number(body.count ?? 1), 1), 10)
  const worldSummary = Object.values(world).filter(Boolean).join("\n\n").slice(0, 1500)
  const charList = existingCharacters.map((c) => `- ${c.name}(${c.role}): ${c.personality.slice(0, 60)}`).join("\n")

  const singleFormat = isRandom
    ? `{ "name": "이름", "role": "역할", "personality": "성격", "background": "배경", "appearance": "외모", "appearanceChapter": null, "relationships": [] }`
    : `{ "personality": "성격", "background": "배경", "appearance": "외모", "appearanceChapter": null, "relationships": [] }`

  const userContent = count > 1
    ? `세계관:\n${worldSummary}\n\n기존 캐릭터:\n${charList || "없음"}\n\n서로 다른 역할과 개성을 가진 캐릭터 ${count}명을 창작해주세요. 각 캐릭터끼리 흥미로운 관계를 형성하도록 해주세요.\n\n다음 JSON 형식으로 작성해주세요:\n{ "characters": [ ${singleFormat}, ... ] }`
    : isRandom
      ? `세계관:\n${worldSummary}\n\n기존 캐릭터:\n${charList || "없음"}\n\n새로운 캐릭터를 자유롭게 창작해주세요.\n\n형식: ${singleFormat}`
      : `이름: ${name}\n역할: ${role}\n\n세계관:\n${worldSummary}\n\n기존 캐릭터:\n${charList || "없음"}\n\n형식: ${singleFormat}`

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `당신은 소설 캐릭터 전문 작가입니다.\n장르: ${genreStr}\n가치관: ${concept.theme}\n분위기: ${concept.tone}\n\n입체적인 캐릭터를 JSON으로 작성하세요. 반드시 JSON만 출력하세요.`,
      },
      { role: "user", content: userContent },
    ],
    response_format: { type: "json_object" },
  })

  if (projectId && completion.usage) {
    const { prompt_tokens, completion_tokens } = completion.usage
    const label = isRandom
      ? count > 1 ? `캐릭터 랜덤 ${count}명 생성` : "캐릭터 랜덤 생성"
      : `캐릭터 - ${name}(${role})`
    appendUsage(projectId, {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type: "character",
      label,
      model: "gpt-4o",
      inputTokens: prompt_tokens,
      outputTokens: completion_tokens,
      totalCost: cost(prompt_tokens, completion_tokens),
    })
  }

  const parsed = JSON.parse(completion.choices[0].message.content ?? "{}")
  const result = count > 1 ? (parsed.characters ?? []) : parsed
  return NextResponse.json(result)
}
