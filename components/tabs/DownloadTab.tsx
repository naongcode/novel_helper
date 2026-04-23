"use client"
import type { ProjectMeta, Chapter } from "@/lib/types"

interface Props {
  meta: ProjectMeta
  chapters: Chapter[]
}

function chapterToText(chapter: Chapter): string {
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
  return lines.join("\n")
}

function triggerDownload(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function sceneStats(chapter: Chapter) {
  const total = chapter.scenes.length
  const done = chapter.scenes.filter((s) => s.content.length > 0).length
  const chars = chapter.scenes.reduce((sum, s) => sum + s.content.length, 0)
  return { total, done, chars }
}

export default function DownloadTab({ meta, chapters }: Props) {
  const sorted = [...chapters].sort((a, b) => a.number - b.number)
  const totalChars = sorted.reduce((sum, ch) => sum + ch.scenes.reduce((s2, sc) => s2 + sc.content.length, 0), 0)
  const totalScenes = sorted.reduce((sum, ch) => sum + ch.scenes.length, 0)
  const doneScenes = sorted.reduce((sum, ch) => sum + ch.scenes.filter((s) => s.content.length > 0).length, 0)

  function downloadChapter(chapter: Chapter) {
    triggerDownload(`${chapter.number}챕터_${chapter.title}.txt`, chapterToText(chapter))
  }

  function downloadAll() {
    const lines: string[] = [
      `■ ${meta.title}`,
      meta.genres.length ? `장르: ${meta.genres.join(", ")}` : "",
      "",
      "═".repeat(50),
      "",
    ]
    for (const chapter of sorted) {
      lines.push(chapterToText(chapter))
      lines.push("═".repeat(50))
      lines.push("")
    }
    triggerDownload(`${meta.title}_전체.txt`, lines.filter((l, i) => i < 3 || l !== "").join("\n"))
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      {/* 전체 통계 */}
      <div className="rounded-xl p-5 mb-6 flex items-center justify-between"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div>
          <h2 className="text-lg font-semibold mb-1">{meta.title}</h2>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {sorted.length}챕터 · 장면 {doneScenes}/{totalScenes} 완성 · 총 {totalChars.toLocaleString()}자
          </p>
        </div>
        <button
          onClick={downloadAll}
          disabled={totalChars === 0}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: totalChars > 0 ? "var(--accent)" : "var(--surface2)", cursor: totalChars > 0 ? "pointer" : "not-allowed" }}>
          ↓ 전체 다운로드
        </button>
      </div>

      {/* 챕터별 목록 */}
      {sorted.length === 0 ? (
        <p className="text-sm text-center py-16" style={{ color: "var(--muted)" }}>
          챕터가 없습니다.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((ch) => {
            const { total, done, chars } = sceneStats(ch)
            return (
              <div key={ch.id} className="flex items-center gap-4 px-4 py-3 rounded-xl"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    <span style={{ color: "var(--muted)" }}>{ch.number}챕터</span> {ch.title}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                    장면 {done}/{total} · {chars.toLocaleString()}자
                  </p>
                </div>
                {/* 진행 바 */}
                <div className="w-24 h-1.5 rounded-full overflow-hidden shrink-0"
                  style={{ background: "var(--surface2)" }}>
                  <div className="h-full rounded-full transition-all"
                    style={{ width: total > 0 ? `${(done / total) * 100}%` : "0%", background: "var(--accent)" }} />
                </div>
                <button
                  onClick={() => downloadChapter(ch)}
                  disabled={chars === 0}
                  className="shrink-0 px-3 py-1.5 rounded-lg text-sm"
                  style={{
                    background: "var(--surface2)", border: "1px solid var(--border)",
                    color: chars > 0 ? "var(--fg)" : "var(--muted)",
                    cursor: chars > 0 ? "pointer" : "not-allowed",
                  }}>
                  ↓ txt
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
