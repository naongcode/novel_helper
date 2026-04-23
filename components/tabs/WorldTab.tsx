"use client"
import { useState } from "react"
import type { ProjectMeta, WorldSetting } from "@/lib/types"
import { WORLD_SECTIONS } from "@/lib/types"
import AiButton from "@/components/ui/AiButton"
import { readStream } from "@/lib/stream"

interface Props {
  projectId: string
  meta: ProjectMeta
  world: WorldSetting
  onUpdate: (world: WorldSetting) => Promise<void>
}

export default function WorldTab({ meta, world, onUpdate }: Props) {
  const [values, setValues] = useState<WorldSetting>(world)
  const [seeds, setSeeds] = useState<Partial<Record<keyof WorldSetting, string>>>({})
  const [loading, setLoading] = useState<Partial<Record<keyof WorldSetting | "batch", boolean>>>({})
  const [selected, setSelected] = useState<Set<keyof WorldSetting>>(
    new Set(WORLD_SECTIONS.map((s) => s.key))
  )

  const isAnyLoading = Object.values(loading).some(Boolean)

  function toggleSection(key: keyof WorldSetting) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function selectAll() { setSelected(new Set(WORLD_SECTIONS.map((s) => s.key))) }
  function selectNone() { setSelected(new Set()) }

  async function generateSection(key: keyof WorldSetting, currentValues: WorldSetting): Promise<string> {
    let generated = ""
    await readStream(
      "/api/generate/world",
      { section: key, seed: seeds[key] ?? "", concept: meta.concept, genres: meta.genres, existingWorld: currentValues },
      (chunk) => {
        generated += chunk
        setValues((prev) => ({ ...prev, [key]: generated }))
      }
    )
    return generated
  }

  async function handleGenerate(key: keyof WorldSetting) {
    setLoading((p) => ({ ...p, [key]: true }))
    try {
      const generated = await generateSection(key, values)
      const updated = { ...values, [key]: generated }
      await onUpdate(updated)
      setValues(updated)
    } finally {
      setLoading((p) => ({ ...p, [key]: false }))
    }
  }

  async function handleBatchGenerate() {
    if (selected.size === 0) return
    setLoading({ batch: true })
    let current = { ...values }
    const targetSections = WORLD_SECTIONS.filter(({ key }) => selected.has(key))
    try {
      for (const { key } of targetSections) {
        setLoading((p) => ({ ...p, batch: true, [key]: true }))
        const generated = await generateSection(key, current)
        current = { ...current, [key]: generated }
        setLoading((p) => ({ ...p, [key]: false }))
      }
      await onUpdate(current)
      setValues(current)
    } finally {
      setLoading({})
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-8">
      <div className="flex flex-col gap-4 p-4 rounded-xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">일괄 생성</h2>
          <div className="flex gap-2">
            <button onClick={selectAll} className="text-xs px-2 py-1 rounded"
              style={{ color: "var(--muted)", background: "var(--surface2)" }}>전체 선택</button>
            <button onClick={selectNone} className="text-xs px-2 py-1 rounded"
              style={{ color: "var(--muted)", background: "var(--surface2)" }}>전체 해제</button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {WORLD_SECTIONS.map(({ key, label }) => {
            const isSelected = selected.has(key)
            const isGenerating = !!loading[key]
            return (
              <button key={key} onClick={() => !isAnyLoading && toggleSection(key)}
                className="px-3 py-1 rounded-full text-sm transition-colors flex items-center gap-1"
                style={{
                  background: isSelected ? "var(--accent)" : "var(--surface2)",
                  color: isSelected ? "white" : "var(--muted)",
                  border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                  opacity: isAnyLoading ? 0.6 : 1,
                  cursor: isAnyLoading ? "default" : "pointer",
                }}>
                {isGenerating && (
                  <span className="inline-block w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                )}
                {label}
              </button>
            )
          })}
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            {selected.size}개 선택됨 · 순서대로 생성 (앞 섹션이 다음 섹션 컨텍스트로 전달됨)
          </span>
          <AiButton onClick={handleBatchGenerate} loading={!!loading.batch}
            disabled={isAnyLoading || selected.size === 0}>
            {loading.batch ? "생성 중..." : `${selected.size}개 일괄 생성`}
          </AiButton>
        </div>
      </div>

      <h2 className="text-lg font-semibold -mb-4">세계관</h2>

      {WORLD_SECTIONS.map(({ key, label }) => (
        <div key={key} className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-sm font-medium flex items-center gap-2">
              {label}
              {loading[key] && (
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: "var(--accent)", color: "white" }}>생성 중</span>
              )}
            </label>
            <div className="flex items-center gap-2 shrink-0">
              <input type="text" value={seeds[key] ?? ""}
                onChange={(e) => setSeeds((p) => ({ ...p, [key]: e.target.value }))}
                placeholder="시드 (선택)" disabled={isAnyLoading}
                style={{ width: "130px", padding: "4px 8px", fontSize: "13px" }} />
              <AiButton onClick={() => handleGenerate(key)} loading={!!loading[key]}
                disabled={isAnyLoading} variant="secondary">
                AI 생성
              </AiButton>
            </div>
          </div>
          <textarea rows={5} value={values[key]}
            placeholder={`${label}에 대한 내용을 입력하거나 AI로 생성하세요`}
            disabled={isAnyLoading}
            onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
            onBlur={() => onUpdate(values)} />
        </div>
      ))}
    </div>
  )
}
