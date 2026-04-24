"use client"
import { useState, useRef } from "react"
import type { ProjectMeta, WorldSetting, Character, Chapter, Scene } from "@/lib/types"
import AiButton from "@/components/ui/AiButton"
import { readStream } from "@/lib/stream"

interface Props {
  projectId: string
  meta: ProjectMeta
  world: WorldSetting
  characters: Character[]
  chapters: Chapter[]
  onUpdateChapter: (chapter: Chapter) => Promise<void>
}

function isLocked(scene: Scene) {
  // 본문 있고 명시적으로 해제되지 않은 경우 잠금
  return scene.content.length > 0 && scene.locked !== false
}

export default function WritingTab({ projectId, meta, world, characters, chapters, onUpdateChapter }: Props) {
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(chapters[0]?.id ?? null)
  const [loadingScene, setLoadingScene] = useState<string | null>(null)
  const [generatingAll, setGeneratingAll] = useState(false)
  const [streamingContent, setStreamingContent] = useState<Record<string, string>>({})
  const abortRef = useRef(false)

  const selectedChapter = chapters.find((c) => c.id === selectedChapterId) ?? null

  function buildPayload(chapter: Chapter, scene: Scene) {
    return {
      scene,
      chapter,
      otherChapterSummaries: chapters
        .filter((c) => c.id !== chapter.id)
        .map((c) => ({ number: c.number, title: c.title, summary: c.summary })),
      concept: meta.concept,
      genres: meta.genres,
      world,
      characters,
      projectId,
    }
  }

  async function toggleLock(chapter: Chapter, scene: Scene) {
    const updatedScenes = chapter.scenes.map((s) =>
      s.id === scene.id ? { ...s, locked: isLocked(s) ? false : true } : s
    )
    await onUpdateChapter({ ...chapter, scenes: updatedScenes })
  }

  async function runGenerateScene(chapter: Chapter, scene: Scene): Promise<Chapter> {
    setLoadingScene(scene.id)
    let generated = ""
    try {
      await readStream("/api/generate/scene", buildPayload(chapter, scene), (chunk) => {
        generated += chunk
        setStreamingContent((prev) => ({ ...prev, [scene.id]: generated }))
      })
      const updatedChapter = {
        ...chapter,
        scenes: chapter.scenes.map((s) =>
          s.id === scene.id ? { ...s, content: generated, locked: true } : s
        ),
      }
      await onUpdateChapter(updatedChapter)
      setStreamingContent((prev) => { const next = { ...prev }; delete next[scene.id]; return next })
      return updatedChapter
    } finally {
      setLoadingScene(null)
    }
  }

  async function handleGenerateScene(chapter: Chapter, scene: Scene) {
    await runGenerateScene(chapter, scene)
  }

  async function generateChapterScenes(chapter: Chapter) {
    let current = { ...chapter, scenes: [...chapter.scenes] }
    for (const scene of chapter.scenes) {
      if (abortRef.current) break
      if (isLocked(scene)) continue  // 잠긴 장면 건너뜀
      current = await runGenerateScene(current, { ...scene, locked: false })
    }
  }

  async function handleGenerateAll(chapter: Chapter) {
    setGeneratingAll(true)
    abortRef.current = false
    try {
      await generateChapterScenes(chapter)
    } finally {
      setGeneratingAll(false)
      abortRef.current = false
    }
  }

  function downloadChapter(chapter: Chapter) {
    const lines: string[] = [
      `${chapter.number}챕터: ${chapter.title}`,
      `요약: ${chapter.summary}`,
      "",
    ]
    for (const scene of chapter.scenes) {
      lines.push(`▶ 장면 ${scene.order}. ${scene.description}`)
      lines.push("")
      lines.push(scene.content || "(본문 없음)")
      lines.push("")
      lines.push("─".repeat(40))
      lines.push("")
    }
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${chapter.number}챕터_${chapter.title}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleGenerateAllChapters() {
    setGeneratingAll(true)
    abortRef.current = false
    const sorted = [...chapters].sort((a, b) => a.number - b.number)
    try {
      for (const chapter of sorted) {
        if (abortRef.current) break
        setSelectedChapterId(chapter.id)
        await generateChapterScenes(chapter)
      }
    } finally {
      setGeneratingAll(false)
      abortRef.current = false
    }
  }

  if (chapters.length === 0) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: "var(--muted)" }}>
        줄거리/챕터 탭에서 챕터를 먼저 추가해주세요.
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* 챕터 목록 */}
      <aside className="w-56 shrink-0 overflow-y-auto p-4 flex flex-col gap-1"
        style={{ borderRight: "1px solid var(--border)", background: "var(--surface)" }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium" style={{ color: "var(--muted)" }}>챕터 목록</p>
          {generatingAll ? (
            <button onClick={() => { abortRef.current = true }}
              className="text-xs px-2 py-1 rounded"
              style={{ background: "#7f1d1d", color: "#fca5a5" }}>■ 중단</button>
          ) : (
            <button onClick={handleGenerateAllChapters}
              disabled={loadingScene !== null}
              className="text-xs px-2 py-1 rounded font-medium"
              style={{ background: "var(--accent)", color: "white", opacity: loadingScene !== null ? 0.5 : 1 }}>
              전체 생성
            </button>
          )}
        </div>
        {[...chapters].sort((a, b) => a.number - b.number).map((ch) => (
          <button key={ch.id}
            className="text-left px-3 py-2 rounded-lg text-sm transition-colors"
            style={{
              background: selectedChapterId === ch.id ? "var(--accent)" : "transparent",
              color: selectedChapterId === ch.id ? "white" : "var(--text)",
            }}
            onClick={() => setSelectedChapterId(ch.id)}>
            <span className="text-xs opacity-70">{ch.number}. </span>{ch.title}
          </button>
        ))}
      </aside>

      {/* 본문 에디터 */}
      <main className="flex-1 overflow-y-auto px-8 py-6">
        {!selectedChapter ? (
          <p style={{ color: "var(--muted)" }}>챕터를 선택하세요</p>
        ) : (
          <div className="max-w-2xl mx-auto flex flex-col gap-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold mb-1">
                  {selectedChapter.number}챕터: {selectedChapter.title}
                </h2>
                <p className="text-sm" style={{ color: "var(--muted)" }}>{selectedChapter.summary}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => downloadChapter(selectedChapter)}
                  className="px-3 py-2 rounded-lg text-sm"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  ↓ txt
                </button>
                {selectedChapter.scenes.length > 0 && (
                  generatingAll ? (
                    <button onClick={() => { abortRef.current = true }}
                      className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium"
                      style={{ background: "#7f1d1d", color: "#fca5a5", border: "1px solid #991b1b" }}>
                      ■ 중단
                    </button>
                  ) : (
                    <AiButton onClick={() => handleGenerateAll(selectedChapter)}
                      loading={false} disabled={loadingScene !== null}>
                      전체 장면 생성
                    </AiButton>
                  )
                )}
              </div>
            </div>

            {selectedChapter.scenes.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                줄거리/챕터 탭에서 장면을 추가하세요.
              </p>
            ) : (
              selectedChapter.scenes.map((scene) => {
                const locked = isLocked(scene)
                return (
                  <div key={scene.id} className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-medium flex-1">
                        <span style={{ color: "var(--muted)" }}>장면 {scene.order}.</span> {scene.description}
                      </h3>
                      <div className="flex items-center gap-2 shrink-0">
                        {scene.content.length > 0 && (
                          <button
                            onClick={() => toggleLock(selectedChapter, scene)}
                            className="text-xs px-2 py-1 rounded"
                            style={{
                              background: "var(--surface2)",
                              border: "1px solid var(--border)",
                              color: locked ? "var(--muted)" : "var(--accent)",
                            }}>
                            {locked ? "🔒 잠금" : "🔓 해제"}
                          </button>
                        )}
                        <AiButton
                          onClick={() => handleGenerateScene(selectedChapter, scene)}
                          loading={loadingScene === scene.id}
                          disabled={locked || generatingAll || (loadingScene !== null && loadingScene !== scene.id)}>
                          AI 생성
                        </AiButton>
                      </div>
                    </div>
                    <textarea
                      rows={12}
                      value={streamingContent[scene.id] ?? scene.content}
                      placeholder="장면 본문을 입력하거나 AI로 생성하세요"
                      readOnly={loadingScene === scene.id}
                      onChange={(e) => {
                        const updatedScenes = selectedChapter.scenes.map((s) =>
                          s.id === scene.id ? { ...s, content: e.target.value } : s
                        )
                        onUpdateChapter({ ...selectedChapter, scenes: updatedScenes })
                      }}
                      style={{
                        minHeight: "280px", lineHeight: "1.8",
                        opacity: locked ? 0.7 : 1,
                      }}
                    />
                    <p className="text-xs text-right" style={{ color: "var(--muted)" }}>
                      {(streamingContent[scene.id] ?? scene.content).length.toLocaleString()}자
                      {loadingScene === scene.id && <span className="ml-2" style={{ color: "var(--accent)" }}>생성 중...</span>}
                      {locked && <span className="ml-2">· 잠금됨</span>}
                    </p>
                  </div>
                )
              })
            )}
          </div>
        )}
      </main>
    </div>
  )
}
