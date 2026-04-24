import { NextRequest } from "next/server"
import OpenAI from "openai"
import { exec } from "child_process"
import { promisify } from "util"
import type { GenerateSceneRequest } from "@/lib/types"
import { WORLD_SECTIONS } from "@/lib/types"
import { appendUsage } from "@/lib/storage"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const execAsync = promisify(exec)

function cost(input: number, output: number) {
  return input * 2.5e-6 + output * 1e-5
}

async function gitCommit(projectTitle: string, chapterNum: number, sceneOrder: number) {
  try {
    await execAsync(`git -C "${process.cwd()}" add data/`)
    await execAsync(`git -C "${process.cwd()}" commit -m "[${projectTitle}] ${chapterNum}챕터 ${sceneOrder}장면 생성"`)
  } catch {
    // git이 없거나 변경사항 없으면 무시
  }
}

export async function POST(req: NextRequest) {
  const body: GenerateSceneRequest = await req.json()
  const { scene, chapter, otherChapterSummaries, concept, genres, world, characters, projectId } = body
  const genreStr = genres?.length ? genres.join(", ") : "장르 미정"

  const worldText = WORLD_SECTIONS
    .map(({ key, label }) => world[key] ? `[${label}]\n${world[key]}` : "")
    .filter(Boolean)
    .join("\n\n")

  const charText = characters.map((c) =>
    `${c.name}(${c.role}): ${c.personality} / ${c.background.slice(0, 100)}`
  ).join("\n")

  const otherChapters = otherChapterSummaries
    .map((c) => `${c.number}챕터 ${c.title}: ${c.summary}`)
    .join("\n")

  const scenesInChapter = chapter.scenes.map((s) => `  장면 ${s.order}: ${s.description}`).join("\n")

  const stream = await openai.chat.completions.create({
    model: "gpt-4o",
    stream: true,
    stream_options: { include_usage: true },
    messages: [
      {
        role: "system",
        content: [
          "당신은 한국 소설을 쓰는 전문 작가입니다.",
          `장르: ${genreStr}`,
          `가치관: ${concept.theme}`,
          `엔딩: ${concept.ending}`,
          `분위기: ${concept.tone}`,
          `문체: ${concept.style}`,
          concept.writingGuide ? `집필 지침: ${concept.writingGuide}` : "",
          concept.styleReference
            ? `\n[문체 레퍼런스]\n아래 예시 텍스트의 문체, 리듬, 문장 길이, 어휘 선택, 서술 방식을 최대한 모방해 본문을 작성하세요.\n\n${concept.styleReference}\n\n위 예시처럼 써주세요.`
            : "",
          "\n주어진 장면 설명을 바탕으로 생동감 있고 몰입감 높은 소설 본문을 800~1500자로 작성하세요.",
        ].filter(Boolean).join("\n"),
      },
      {
        role: "user",
        content: `[세계관]\n${worldText}\n\n[등장인물]\n${charText}\n\n[다른 챕터 흐름]\n${otherChapters || "없음"}\n\n[현재 챕터: ${chapter.number}챕터 ${chapter.title}]\n요약: ${chapter.summary}\n핵심사건: ${chapter.keyEvents.join(", ")}\n전체 장면 구성:\n${scenesInChapter}\n\n[지금 써야 할 장면]\n장면 ${scene.order}: ${scene.description}\n\n위 장면을 소설 본문으로 작성해주세요.`,
      },
    ],
  })

  const encoder = new TextEncoder()
  let fullContent = ""

  const readable = new ReadableStream({
    async start(controller) {
      let usageData: { prompt_tokens: number; completion_tokens: number } | null = null
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? ""
        if (text) {
          fullContent += text
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "chunk", content: text })}\n\n`))
        }
        if (chunk.usage) usageData = chunk.usage
      }
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`))
      controller.close()

      const projectTitle = body.genres?.join("") || "novel"
      gitCommit(projectTitle, chapter.number, scene.order).catch(() => {})

      if (projectId && usageData) {
        appendUsage(projectId, {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          type: "scene",
          label: `${chapter.number}챕터 ${scene.order}장면`,
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
