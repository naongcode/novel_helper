"use client"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import type { ProjectMeta, WorldSetting, Character, Chapter } from "@/lib/types"
import ConceptTab from "./tabs/ConceptTab"
import WorldTab from "./tabs/WorldTab"
import CharacterTab from "./tabs/CharacterTab"
import PlotTab from "./tabs/PlotTab"
import WritingTab from "./tabs/WritingTab"
import DownloadTab from "./tabs/DownloadTab"

const TABS = ["작품 설정", "세계관", "캐릭터", "줄거리/챕터", "본문 작성", "다운로드"] as const
type Tab = (typeof TABS)[number]

interface ProjectData {
  meta: ProjectMeta
  world: WorldSetting
  characters: Character[]
  chapters: Chapter[]
}

export default function ProjectLayout({ id }: { id: string }) {
  const router = useRouter()
  const [data, setData] = useState<ProjectData | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>("작품 설정")

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${id}`)
    if (!res.ok) { router.push("/"); return }
    setData(await res.json())
  }, [id, router])

  useEffect(() => { load() }, [load])

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ color: "var(--muted)" }}>
        불러오는 중...
      </div>
    )
  }

  const { meta, world, characters, chapters } = data

  async function updateMeta(partial: Partial<ProjectMeta>) {
    const updated = { ...meta, ...partial }
    await fetch(`/api/projects/${id}/meta`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    })
    setData((prev) => prev ? { ...prev, meta: updated } : prev)
  }

  async function updateWorld(updated: WorldSetting) {
    await fetch(`/api/projects/${id}/world`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    })
    setData((prev) => prev ? { ...prev, world: updated } : prev)
  }

  async function updateCharacters(updated: Character[]) {
    await fetch(`/api/projects/${id}/characters`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    })
    setData((prev) => prev ? { ...prev, characters: updated } : prev)
  }

  async function updateChapter(chapter: Chapter) {
    await fetch(`/api/projects/${id}/chapters/${chapter.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(chapter),
    })
    setData((prev) => {
      if (!prev) return prev
      const exists = prev.chapters.find((c) => c.id === chapter.id)
      const chapters = exists
        ? prev.chapters.map((c) => (c.id === chapter.id ? chapter : c))
        : [...prev.chapters, chapter].sort((a, b) => a.number - b.number)
      return { ...prev, chapters }
    })
  }

  async function deleteChapter(chapterId: string) {
    await fetch(`/api/projects/${id}/chapters/${chapterId}`, { method: "DELETE" })
    setData((prev) =>
      prev ? { ...prev, chapters: prev.chapters.filter((c) => c.id !== chapterId) } : prev
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* 헤더 */}
      <header className="flex items-center gap-4 px-6 py-3 shrink-0"
        style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <button onClick={() => router.push("/")} className="text-sm hover:opacity-80"
          style={{ color: "var(--muted)" }}>
          ← 목록
        </button>
        <span style={{ color: "var(--border)" }}>|</span>
        <h1 className="font-semibold">{meta.title}</h1>
        <div className="flex gap-1">
          {meta.genres.map((g) => (
            <span key={g} className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "var(--surface2)", color: "var(--accent)" }}>
              {g}
            </span>
          ))}
        </div>
      </header>

      {/* 탭 바 */}
      <nav className="flex shrink-0 px-6"
        style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        {TABS.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="px-4 py-3 text-sm font-medium border-b-2 transition-colors"
            style={{
              borderColor: activeTab === tab ? "var(--accent)" : "transparent",
              color: activeTab === tab ? "var(--accent)" : "var(--muted)",
            }}>
            {tab}
          </button>
        ))}
      </nav>

      {/* 탭 내용 */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === "작품 설정" && (
          <ConceptTab projectId={id} meta={meta} onUpdate={updateMeta} />
        )}
        {activeTab === "세계관" && (
          <WorldTab projectId={id} meta={meta} world={world} onUpdate={updateWorld} />
        )}
        {activeTab === "캐릭터" && (
          <CharacterTab projectId={id} meta={meta} world={world} characters={characters} onUpdate={updateCharacters} />
        )}
        {activeTab === "줄거리/챕터" && (
          <PlotTab projectId={id} meta={meta} world={world} characters={characters}
            chapters={chapters} onUpdateChapter={updateChapter} onDeleteChapter={deleteChapter} />
        )}
        {activeTab === "본문 작성" && (
          <WritingTab projectId={id} meta={meta} world={world} characters={characters}
            chapters={chapters} onUpdateChapter={updateChapter} />
        )}
        {activeTab === "다운로드" && (
          <DownloadTab meta={meta} chapters={chapters} />
        )}
      </main>
    </div>
  )
}
