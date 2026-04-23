"use client"
import { useState } from "react"
import { nanoid } from "nanoid"
import type { ProjectMeta, WorldSetting, Character, CharacterRelationship } from "@/lib/types"
import AiButton from "@/components/ui/AiButton"
import Modal from "@/components/ui/Modal"
import ConfirmDialog from "@/components/ui/ConfirmDialog"

interface Props {
  projectId: string
  meta: ProjectMeta
  world: WorldSetting
  characters: Character[]
  onUpdate: (characters: Character[]) => Promise<void>
}

const EMPTY_CHAR = (): Character => ({
  id: nanoid(10), name: "", role: "", personality: "", background: "",
  appearance: "", appearanceChapter: null, relationships: [],
})

export default function CharacterTab({ projectId, meta, world, characters, onUpdate }: Props) {
  const [editing, setEditing] = useState<Character | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Character | null>(null)
  const [loading, setLoading] = useState(false)
  const [randomLoading, setRandomLoading] = useState(false)
  const [randomCount, setRandomCount] = useState(1)

  function openCreate() { setEditing(EMPTY_CHAR()) }
  function openEdit(c: Character) { setEditing({ ...c }) }

  function toCharacter(generated: Record<string, unknown>, existingChars: Character[]): Character {
    return {
      id: nanoid(10),
      name: (generated.name as string) ?? "",
      role: (generated.role as string) ?? "",
      personality: (generated.personality as string) ?? "",
      background: (generated.background as string) ?? "",
      appearance: (generated.appearance as string) ?? "",
      appearanceChapter: (generated.appearanceChapter as number | null) ?? null,
      relationships: ((generated.relationships as Omit<CharacterRelationship, "targetId">[]) ?? []).map((r) => ({
        targetId: existingChars.find((c) => c.name === r.targetName)?.id ?? "",
        targetName: r.targetName,
        relation: r.relation,
        description: r.description,
      })),
    }
  }

  async function handleRandomGenerate() {
    setRandomLoading(true)
    try {
      const res = await fetch("/api/generate/character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "", role: "", count: randomCount,
          concept: meta.concept, genres: meta.genres, world,
          existingCharacters: characters.map((c) => ({ id: c.id, name: c.name, role: c.role, personality: c.personality })),
        }),
      })
      const generated = await res.json()

      if (randomCount === 1) {
        // 단건: 편집 모달 열기
        setEditing(toCharacter(generated, characters))
      } else {
        // 다건: 바로 목록에 추가
        const newChars = (generated as Record<string, unknown>[]).map((g) => toCharacter(g, characters))
        await onUpdate([...characters, ...newChars])
      }
    } finally {
      setRandomLoading(false)
    }
  }

  async function handleSave() {
    if (!editing) return
    const exists = characters.find((c) => c.id === editing.id)
    const updated = exists
      ? characters.map((c) => (c.id === editing.id ? editing : c))
      : [...characters, editing]
    await onUpdate(updated)
    setEditing(null)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    await onUpdate(characters.filter((c) => c.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  async function handleAiGenerate() {
    if (!editing || !editing.name || !editing.role) return
    setLoading(true)
    try {
      const res = await fetch("/api/generate/character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editing.name,
          role: editing.role,
          concept: meta.concept,
          genres: meta.genres,
          world,
          existingCharacters: characters.map((c) => ({ id: c.id, name: c.name, role: c.role, personality: c.personality })),
        }),
      })
      const generated = await res.json()
      setEditing((prev) => prev ? {
        ...prev,
        personality: generated.personality ?? prev.personality,
        background: generated.background ?? prev.background,
        appearance: generated.appearance ?? prev.appearance,
        appearanceChapter: generated.appearanceChapter ?? prev.appearanceChapter,
        relationships: (generated.relationships ?? []).map((r: Omit<CharacterRelationship, "targetId">) => ({
          targetId: characters.find((c) => c.name === r.targetName)?.id ?? "",
          targetName: r.targetName,
          relation: r.relation,
          description: r.description,
        })),
      } : prev)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">캐릭터</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg overflow-hidden"
            style={{ border: "1px solid var(--border)", background: "var(--surface2)" }}>
            <button className="px-2 py-1.5 text-sm hover:opacity-70"
              onClick={() => setRandomCount((n) => Math.max(1, n - 1))}>−</button>
            <span className="text-sm w-6 text-center">{randomCount}</span>
            <button className="px-2 py-1.5 text-sm hover:opacity-70"
              onClick={() => setRandomCount((n) => Math.min(10, n + 1))}>+</button>
          </div>
          <AiButton onClick={handleRandomGenerate} loading={randomLoading} variant="secondary">
            랜덤 {randomCount > 1 ? `${randomCount}명` : ""} 생성
          </AiButton>
          <button onClick={openCreate}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: "var(--accent)" }}>
            + 직접 추가
          </button>
        </div>
      </div>

      {characters.length === 0 ? (
        <p className="text-sm text-center py-16" style={{ color: "var(--muted)" }}>
          아직 캐릭터가 없어요. 캐릭터를 추가해보세요.
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {characters.map((c) => (
            <div key={c.id} className="rounded-xl p-4 cursor-pointer hover:opacity-80 transition-opacity"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              onClick={() => openEdit(c)}>
              <div className="font-semibold mb-1">{c.name || "(이름 없음)"}</div>
              <div className="text-xs mb-2" style={{ color: "var(--accent)" }}>{c.role || "역할 미정"}</div>
              <div className="text-xs line-clamp-2" style={{ color: "var(--muted)" }}>{c.personality}</div>
              {c.appearanceChapter && (
                <div className="text-xs mt-2" style={{ color: "var(--muted)" }}>{c.appearanceChapter}챕터 등장</div>
              )}
              <button className="mt-3 text-xs px-2 py-1 rounded"
                style={{ color: "#e74c3c", background: "var(--surface2)" }}
                onClick={(e) => { e.stopPropagation(); setDeleteTarget(c) }}>
                삭제
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal open title="캐릭터 편집" onClose={() => setEditing(null)}>
          <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto pr-1">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs mb-1 block" style={{ color: "var(--muted)" }}>이름</label>
                <input type="text" value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="이름" />
              </div>
              <div className="flex-1">
                <label className="text-xs mb-1 block" style={{ color: "var(--muted)" }}>역할</label>
                <input type="text" value={editing.role}
                  onChange={(e) => setEditing({ ...editing, role: e.target.value })} placeholder="주인공, 악당, 조연 등" />
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-xs" style={{ color: "var(--muted)" }}>이름과 역할 입력 후 AI 생성</span>
              <AiButton onClick={handleAiGenerate} loading={loading}
                disabled={!editing.name || !editing.role}>
                AI 프로필 생성
              </AiButton>
            </div>

            {[
              { key: "personality", label: "성격", rows: 3 },
              { key: "background", label: "배경", rows: 4 },
              { key: "appearance", label: "외모", rows: 2 },
            ].map(({ key, label, rows }) => (
              <div key={key}>
                <label className="text-xs mb-1 block" style={{ color: "var(--muted)" }}>{label}</label>
                <textarea rows={rows} value={(editing as unknown as Record<string, string>)[key]}
                  onChange={(e) => setEditing({ ...editing, [key as keyof typeof editing]: e.target.value } as Character)} />
              </div>
            ))}

            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--muted)" }}>출현 챕터</label>
              <input type="number" value={editing.appearanceChapter ?? ""}
                onChange={(e) => setEditing({ ...editing, appearanceChapter: e.target.value ? Number(e.target.value) : null })}
                placeholder="챕터 번호" style={{ width: "100px" }} />
            </div>

            <div>
              <label className="text-xs mb-2 block" style={{ color: "var(--muted)" }}>다른 인물과의 관계</label>
              <div className="flex flex-col gap-2">
                {editing.relationships.map((r, i) => (
                  <div key={i} className="flex gap-2 items-start p-2 rounded-lg" style={{ background: "var(--surface2)" }}>
                    <div className="flex-1 text-xs">
                      <span className="font-medium">{r.targetName}</span>
                      <span className="mx-1" style={{ color: "var(--muted)" }}>|</span>
                      <span style={{ color: "var(--accent)" }}>{r.relation}</span>
                      <p className="mt-1" style={{ color: "var(--muted)" }}>{r.description}</p>
                    </div>
                    <button className="text-xs shrink-0" style={{ color: "#e74c3c" }}
                      onClick={() => setEditing({ ...editing, relationships: editing.relationships.filter((_, j) => j !== i) })}>
                      삭제
                    </button>
                  </div>
                ))}
                <button className="text-xs px-3 py-1.5 rounded-lg self-start"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                  onClick={() => setEditing({
                    ...editing,
                    relationships: [...editing.relationships, { targetId: "", targetName: "", relation: "", description: "" }],
                  })}>
                  + 관계 추가
                </button>
                {editing.relationships.map((r, i) =>
                  r.targetName === "" && r.relation === "" ? (
                    <div key={`edit-${i}`} className="flex gap-2">
                      <input type="text" placeholder="상대 이름" value={r.targetName}
                        onChange={(e) => {
                          const rels = [...editing.relationships]
                          rels[i] = { ...rels[i], targetName: e.target.value, targetId: characters.find((c) => c.name === e.target.value)?.id ?? "" }
                          setEditing({ ...editing, relationships: rels })
                        }} style={{ flex: 1 }} />
                      <input type="text" placeholder="관계 (예: 라이벌)" value={r.relation}
                        onChange={(e) => {
                          const rels = [...editing.relationships]
                          rels[i] = { ...rels[i], relation: e.target.value }
                          setEditing({ ...editing, relationships: rels })
                        }} style={{ flex: 1 }} />
                      <input type="text" placeholder="설명" value={r.description}
                        onChange={(e) => {
                          const rels = [...editing.relationships]
                          rels[i] = { ...rels[i], description: e.target.value }
                          setEditing({ ...editing, relationships: rels })
                        }} style={{ flex: 2 }} />
                    </div>
                  ) : null
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
            <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg text-sm"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>취소</button>
            <button onClick={handleSave} className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: "var(--accent)" }}>저장</button>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        message={`"${deleteTarget?.name}" 캐릭터를 삭제할까요?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
