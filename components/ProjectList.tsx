"use client"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import type { ProjectMeta } from "@/lib/types"
import { GENRE_OPTIONS } from "@/lib/types"
import Modal from "./ui/Modal"
import ConfirmDialog from "./ui/ConfirmDialog"

export default function ProjectList() {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectMeta[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ProjectMeta | null>(null)
  const [title, setTitle] = useState("")
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [creating, setCreating] = useState(false)

  const fetchProjects = useCallback(async () => {
    const res = await fetch("/api/projects")
    setProjects(await res.json())
  }, [])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  function toggleGenre(g: string) {
    setSelectedGenres((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    )
  }

  async function handleCreate() {
    if (!title.trim()) return
    setCreating(true)
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, genres: selectedGenres }),
    })
    const meta = await res.json()
    setCreating(false)
    setShowCreate(false)
    setTitle("")
    setSelectedGenres([])
    router.push(`/project/${meta.id}`)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    await fetch(`/api/projects/${deleteTarget.id}`, { method: "DELETE" })
    setDeleteTarget(null)
    fetchProjects()
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Novel Helper</h1>
        <button onClick={() => setShowCreate(true)}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: "var(--accent)" }}>
          + 새 프로젝트
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-24" style={{ color: "var(--muted)" }}>
          <p className="text-lg mb-2">아직 프로젝트가 없어요</p>
          <p className="text-sm">새 프로젝트를 만들어 소설을 시작하세요</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <div key={p.id} className="rounded-xl p-5 flex flex-col gap-3 cursor-pointer"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              onClick={() => router.push(`/project/${p.id}`)}>
              <div className="flex-1">
                <h3 className="font-semibold text-base mb-2 leading-snug">{p.title}</h3>
                <div className="flex flex-wrap gap-1 mb-3">
                  {p.genres.map((g) => (
                    <span key={g} className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: "var(--surface2)", color: "var(--accent)" }}>
                      {g}
                    </span>
                  ))}
                </div>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  {new Date(p.updatedAt).toLocaleDateString("ko-KR")}
                </p>
              </div>
              <div className="flex gap-2 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                <button className="flex-1 py-1.5 text-sm rounded-lg"
                  style={{ background: "var(--surface2)" }}
                  onClick={(e) => { e.stopPropagation(); router.push(`/project/${p.id}`) }}>
                  열기
                </button>
                <button className="px-3 py-1.5 text-sm rounded-lg"
                  style={{ background: "var(--surface2)", color: "#e74c3c" }}
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(p) }}>
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="새 프로젝트 만들기">
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm mb-1.5 block" style={{ color: "var(--muted)" }}>제목</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="소설 제목을 입력하세요" onKeyDown={(e) => e.key === "Enter" && handleCreate()} />
          </div>
          <div>
            <label className="text-sm mb-1.5 block" style={{ color: "var(--muted)" }}>
              장르 <span className="text-xs">(선택 안해도 됨, 중복 선택 가능)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {GENRE_OPTIONS.map((g) => (
                <button key={g} onClick={() => toggleGenre(g)}
                  className="px-3 py-1 rounded-full text-sm transition-colors"
                  style={{
                    background: selectedGenres.includes(g) ? "var(--accent)" : "var(--surface2)",
                    color: selectedGenres.includes(g) ? "white" : "var(--text)",
                    border: `1px solid ${selectedGenres.includes(g) ? "var(--accent)" : "var(--border)"}`,
                  }}>
                  {g}
                </button>
              ))}
            </div>
            {selectedGenres.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedGenres.map((g) => (
                  <span key={g} className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                    style={{ background: "var(--surface2)", color: "var(--accent)" }}>
                    {g}
                    <button onClick={() => toggleGenre(g)} className="opacity-70 hover:opacity-100">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 mt-2">
            <button onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-lg text-sm"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              취소
            </button>
            <button onClick={handleCreate} disabled={!title.trim() || creating}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40"
              style={{ background: "var(--accent)" }}>
              {creating ? "만드는 중..." : "만들기"}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        message={`"${deleteTarget?.title}" 프로젝트를 삭제할까요? 이 작업은 되돌릴 수 없습니다.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
