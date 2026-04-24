import { NextRequest } from "next/server"
import OpenAI from "openai"
import type { GenerateWorldRequest } from "@/lib/types"
import { WORLD_SECTIONS } from "@/lib/types"
import { appendUsage } from "@/lib/storage"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SECTION_LABELS: Record<string, string> = Object.fromEntries(
  WORLD_SECTIONS.map(({ key, label }) => [key, label])
)

function cost(input: number, output: number) {
  return input * 2.5e-6 + output * 1e-5
}

export async function POST(req: NextRequest) {
  const body: GenerateWorldRequest = await req.json()
  const { section, seed, concept, genres, existingWorld, projectId } = body
  const sectionLabel = SECTION_LABELS[section] ?? section
  const genreStr = genres?.length ? genres.join(", ") : "장르 미정"

  const otherSections = Object.entries(existingWorld)
    .filter(([k, v]) => k !== section && v.trim())
    .map(([k, v]) => `[${SECTION_LABELS[k]}]\n${v}`)
    .join("\n\n")

  const stream = await openai.chat.completions.create({
    model: "gpt-4o",
    stream: true,
    stream_options: { include_usage: true },
    messages: [
      {
        role: "system",
        content: `당신은 소설 세계관 전문 작가입니다.\n장르: ${genreStr}\n가치관: ${concept.theme}\n분위기: ${concept.tone}\n\n기존 세계관과 일관성을 유지하며 ${sectionLabel} 섹션을 풍부하고 구체적으로 작성하세요.`,
      },
      {
        role: "user",
        content: `${otherSections ? `기존 세계관:\n${otherSections}\n\n` : ""}요청 사항: ${seed || `${sectionLabel}을 작성해주세요`}\n\n위 정보를 바탕으로 [${sectionLabel}] 섹션을 상세하게 작성해주세요.`,
      },
    ],
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      let usageData: { prompt_tokens: number; completion_tokens: number } | null = null
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? ""
        if (text) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "chunk", content: text })}\n\n`))
        if (chunk.usage) usageData = chunk.usage
      }
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`))
      controller.close()

      if (projectId && usageData) {
        appendUsage(projectId, {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          type: "world",
          label: `세계관 - ${sectionLabel}`,
          model: "gpt-4o",
          inputTokens: usageData.prompt_tokens,
          outputTokens: usageData.completion_tokens,
          totalCost: cost(usageData.prompt_tokens, usageData.completion_tokens),
        })
      }
    },
  })

  return new Response(readable, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  })
}
