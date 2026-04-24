"use client"
import { useState } from "react"
import { nanoid } from "nanoid"
import type { ProjectMeta, WorldSetting, Character, Chapter, Scene } from "@/lib/types"
import AiButton from "@/components/ui/AiButton"
import ConfirmDialog from "@/components/ui/ConfirmDialog"

interface Props {
  projectId: string
  meta: ProjectMeta
  world: WorldSetting
  characters: Character[]
  chapters: Chapter[]
  onUpdateChapter: (chapter: Chapter) => Promise<void>
  onDeleteChapter: (id: string) => Promise<void>
}

export default function PlotTab({ projectId, meta, world, characters, chapters, onUpdateChapter, onDeleteChapter }: Props) {
  const [chapterCount, setChapterCount] = useState(3)
  const [insertAfter, setInsertAfter] = useState<number>(-1)  // -1 = 맨 끝
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const sortedChapters = [...chapters].sort((a, b) => a.number - b.number)
  const hasExisting = sortedChapters.length > 0

  // -1(맨 끝) 은 마지막 챕터 번호로 해석
  const effectiveInsertAfter = insertAfter === -1
    ? (sortedChapters[sortedChapters.length - 1]?.number ?? 0)
    : insertAfter

  async function handleGeneratePlot() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/generate/plot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterCount,
          concept: meta.concept,
          genres: meta.genres,
          world,
          characters: characters.map((c) => ({ id: c.id, name: c.name, role: c.role, personality: c.personality })),
          projectId,
          ...(hasExisting ? {
            existingChapters: sortedChapters.map((c) => ({ number: c.number, title: c.title, summary: c.summary })),
            insertAfter: effectiveInsertAfter,
          } : {}),
        }),
      })
      if (!res.ok) {
        const text = await res.text()
        setError(`API 오류 (${res.status}): ${text.slice(0, 200)}`)
        return
      }
      const generated: Omit<Chapter, "id">[] = await res.json()

      const validChapters = (generated ?? []).filter(
        (ch): ch is Omit<Chapter, "id"> => typeof ch === "object" && ch !== null && !Array.isArray(ch)
      )
      if (validChapters.length === 0) {
        setError(`챕터 파싱 실패. 원본: ${JSON.stringify(generated).slice(0, 300)}`)
        return
      }

      // 삽입 위치 이후 기존 챕터들 번호 밀기 (실제 생성된 수 기준)
      if (hasExisting) {
        const toShift = sortedChapters.filter((c) => c.number > effectiveInsertAfter)
        for (const ch of toShift) {
          await onUpdateChapter({ ...ch, number: ch.number + validChapters.length })
        }
      }

      // 새 챕터 저장 (번호는 insertAfter+1부터)
      for (const [i, ch] of validChapters.entries()) {
        await onUpdateChapter({
          ...ch,
          id: nanoid(10),
          number: hasExisting ? effectiveInsertAfter + i + 1 : ch.number,
          scenes: (ch.scenes ?? []).map((s: Partial<Scene>, j: number) => ({
            id: nanoid(10),
            order: s.order ?? j + 1,
            description: s.description ?? "",
            content: "",
          })),
        })
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  async function addScene(chapter: Chapter) {
    const updated: Chapter = {
      ...chapter,
      scenes: [...chapter.scenes, { id: nanoid(10), order: chapter.scenes.length + 1, description: "", content: "" }],
    }
    await onUpdateChapter(updated)
  }

  async function updateScene(chapter: Chapter, sceneId: string, description: string) {
    const updated: Chapter = {
      ...chapter,
      scenes: chapter.scenes.map((s) => s.id === sceneId ? { ...s, description } : s),
    }
    await onUpdateChapter(updated)
  }

  async function deleteScene(chapter: Chapter, sceneId: string) {
    const updated: Chapter = { ...chapter, scenes: chapter.scenes.filter((s) => s.id !== sceneId) }
    await onUpdateChapter(updated)
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <h2 className="text-lg font-semibold">줄거리/챕터</h2>
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <label className="text-sm" style={{ color: "var(--muted)" }}>챕터 수</label>
          <input type="number" value={chapterCount} min={1} max={50}
            onChange={(e) => setChapterCount(Number(e.target.value))}
            style={{ width: "64px", padding: "4px 8px" }} />
          {hasExisting && (
            <select
              value={insertAfter}
              onChange={(e) => setInsertAfter(Number(e.target.value))}
              style={{ padding: "4px 8px", fontSize: "14px", border: "1px solid var(--border)", borderRadius: "8px", background: "var(--surface2)", color: "var(--fg)" }}
            >
              <option value={0}>맨 앞에 추가</option>
              {sortedChapters.map((ch) => (
                <option key={ch.id} value={ch.number}>{ch.number}챕터 이후에 추가</option>
              ))}
              <option value={-1}>맨 끝에 추가</option>
            </select>
          )}
          <AiButton onClick={handleGeneratePlot} loading={loading}>
            {hasExisting ? "AI 챕터 추가 생성" : "AI 전체 줄거리 생성"}
          </AiButton>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ background: "#3d1a1a", color: "#f87171", border: "1px solid #7f1d1d" }}>
          {error}
          <button className="ml-3 underline" onClick={() => setError(null)}>닫기</button>
        </div>
      )}

      {chapters.length === 0 ? (
        <p className="text-sm text-center py-16" style={{ color: "var(--muted)" }}>
          챕터가 없어요. AI로 생성하거나 직접 추가하세요.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {sortedChapters.map((ch) => (
            <div key={ch.id} className="rounded-xl overflow-hidden"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                onClick={() => setExpanded(expanded === ch.id ? null : ch.id)}>
                <span className="text-sm font-medium flex-1">
                  <span style={{ color: "var(--muted)" }}>{ch.number}챕터</span> {ch.title}
                </span>
                <button className="text-xs px-2 py-1 rounded" style={{ color: "#e74c3c", background: "var(--surface2)" }}
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(ch.id) }}>삭제</button>
                <span style={{ color: "var(--muted)" }}>{expanded === ch.id ? "▼" : "▶"}</span>
              </div>

              {expanded === ch.id && (
                <div className="px-4 pb-4 flex flex-col gap-3" style={{ borderTop: "1px solid var(--border)" }}>
                  <div className="pt-3">
                    <label className="text-xs mb-1 block" style={{ color: "var(--muted)" }}>제목</label>
                    <input type="text" value={ch.title}
                      onChange={(e) => onUpdateChapter({ ...ch, title: e.target.value })} placeholder="챕터 제목" />
                  </div>
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: "var(--muted)" }}>요약</label>
                    <textarea rows={2} value={ch.summary}
                      onChange={(e) => onUpdateChapter({ ...ch, summary: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: "var(--muted)" }}>핵심 사건</label>
                    <div className="flex flex-col gap-1">
                      {ch.keyEvents.map((ev, i) => (
                        <div key={i} className="flex gap-2">
                          <input type="text" value={ev}
                            onChange={(e) => {
                              const evs = [...ch.keyEvents]
                              evs[i] = e.target.value
                              onUpdateChapter({ ...ch, keyEvents: evs })
                            }} />
                          <button className="text-xs px-2" style={{ color: "#e74c3c" }}
                            onClick={() => onUpdateChapter({ ...ch, keyEvents: ch.keyEvents.filter((_, j) => j !== i) })}>×</button>
                        </div>
                      ))}
                      <button className="text-xs px-3 py-1 rounded self-start"
                        style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                        onClick={() => onUpdateChapter({ ...ch, keyEvents: [...ch.keyEvents, ""] })}>
                        + 사건 추가
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs mb-2 block" style={{ color: "var(--muted)" }}>장면 목록</label>
                    <div className="flex flex-col gap-2">
                      {ch.scenes.map((sc) => (
                        <div key={sc.id} className="flex gap-2 items-center">
                          <span className="text-xs shrink-0" style={{ color: "var(--muted)" }}>{sc.order}.</span>
                          <input type="text" value={sc.description} placeholder="장면 설명"
                            onChange={(e) => updateScene(ch, sc.id, e.target.value)} />
                          <button className="text-xs px-2" style={{ color: "#e74c3c" }}
                            onClick={() => deleteScene(ch, sc.id)}>×</button>
                        </div>
                      ))}
                      <button className="text-xs px-3 py-1 rounded self-start"
                        style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                        onClick={() => addScene(ch)}>
                        + 장면 추가
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button className="mt-4 px-4 py-2 rounded-lg text-sm"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        onClick={async () => {
          setError(null)
          const newId = nanoid(10)
          const maxNum = chapters.length > 0 ? Math.max(...chapters.map((c) => c.number)) : 0
          setExpanded(newId)
          try {
            await onUpdateChapter({
              id: newId, number: maxNum + 1, title: "새 챕터",
              summary: "", keyEvents: [], scenes: [],
            })
          } catch (e) {
            setError(String(e))
          }
        }}>
        + 챕터 추가
      </button>

      <ConfirmDialog
        open={!!deleteTarget}
        message="이 챕터를 삭제할까요?"
        onConfirm={async () => { if (deleteTarget) { await onDeleteChapter(deleteTarget); setDeleteTarget(null) } }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
