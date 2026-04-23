"use client"
import { useState } from "react"
import type { ProjectMeta, ProjectConcept } from "@/lib/types"
import AiButton from "@/components/ui/AiButton"

interface Props {
  projectId: string
  meta: ProjectMeta
  onUpdate: (partial: Partial<ProjectMeta>) => Promise<void>
}

const FIELDS: { key: keyof ProjectConcept; label: string; placeholder: string; rows: number }[] = [
  { key: "theme",        label: "가치관/주제",  placeholder: "이 소설이 말하고자 하는 메시지 (예: 복수는 또 다른 상처를 낳는다)", rows: 2 },
  { key: "ending",       label: "엔딩 방향",    placeholder: "해피엔딩 / 비극 / 열린 결말 등", rows: 2 },
  { key: "tone",         label: "분위기/톤",    placeholder: "어둡고 긴장감 있는 / 가볍고 유쾌한 / 서정적인 등", rows: 2 },
  { key: "style",        label: "문체",         placeholder: "3인칭 전지적 시점, 과거형 서술 등", rows: 2 },
  { key: "writingGuide", label: "집필 지침",    placeholder: "예: 대화 위주로 구성, 장면 묘사를 풍부하게, 주인공 내면 독백 포함, 긴장감 있는 문장 사용", rows: 4 },
]

export default function ConceptTab({ projectId, meta, onUpdate }: Props) {
  const [concept, setConcept] = useState<ProjectConcept>({
    ...meta.concept,
    writingGuide: meta.concept.writingGuide ?? "",
  })
  const [loading, setLoading] = useState(false)

  async function handleAiGenerate() {
    setLoading(true)
    try {
      const res = await fetch("/api/generate/concept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: meta.title, genres: meta.genres }),
      })
      const generated: ProjectConcept = await res.json()
      const merged = { ...generated, writingGuide: generated.writingGuide ?? "" }
      setConcept(merged)
      await onUpdate({ concept: merged })
    } finally {
      setLoading(false)
    }
  }

  async function handleChange(key: keyof ProjectConcept, value: string) {
    const updated = { ...concept, [key]: value }
    setConcept(updated)
    await onUpdate({ concept: updated })
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">작품 설정</h2>
        <AiButton onClick={handleAiGenerate} loading={loading}>
          AI 작품 설정 자동생성
        </AiButton>
      </div>
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        모든 AI 생성 시 공통 컨텍스트로 사용됩니다. 집필 지침은 본문 작성 시에만 추가로 전달됩니다.
      </p>

      {FIELDS.map(({ key, label, placeholder, rows }) => (
        <div key={key}>
          <label className="text-sm font-medium mb-2 block" style={{ color: "var(--muted)" }}>
            {label}
            {key === "writingGuide" && (
              <span className="ml-2 text-xs px-1.5 py-0.5 rounded"
                style={{ background: "var(--surface2)", color: "var(--accent)" }}>
                본문 작성 전용
              </span>
            )}
          </label>
          <textarea
            rows={rows}
            value={concept[key]}
            placeholder={placeholder}
            onChange={(e) => handleChange(key, e.target.value)}
          />
        </div>
      ))}
    </div>
  )
}
