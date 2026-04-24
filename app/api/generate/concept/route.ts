import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { appendUsage } from "@/lib/storage"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function cost(input: number, output: number) {
  return input * 2.5e-6 + output * 1e-5
}

export async function POST(req: NextRequest) {
  const { title, genres, projectId } = await req.json()
  const genreStr = genres?.length ? genres.join(", ") : "장르 미정"

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "당신은 소설 기획 전문가입니다. 제목과 장르를 보고 작품의 핵심 설정을 JSON으로 작성해주세요. 반드시 JSON만 출력하세요.",
      },
      {
        role: "user",
        content: `제목: ${title}\n장르: ${genreStr}\n\n다음 JSON 형식으로 작품 설정을 작성해주세요:\n{\n  "theme": "가치관/주제 (1~2문장)",\n  "ending": "엔딩 방향 (1~2문장)",\n  "tone": "분위기/톤 (1~2문장)",\n  "style": "문체 (1~2문장)"\n}`,
      },
    ],
    response_format: { type: "json_object" },
  })

  if (projectId && completion.usage) {
    const { prompt_tokens, completion_tokens } = completion.usage
    appendUsage(projectId, {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type: "concept",
      label: "작품 설정 자동생성",
      model: "gpt-4o",
      inputTokens: prompt_tokens,
      outputTokens: completion_tokens,
      totalCost: cost(prompt_tokens, completion_tokens),
    })
  }

  const content = completion.choices[0].message.content ?? "{}"
  return NextResponse.json(JSON.parse(content))
}
