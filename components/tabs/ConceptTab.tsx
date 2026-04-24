"use client"
import { useState } from "react"
import type { ProjectMeta, ProjectConcept } from "@/lib/types"
import AiButton from "@/components/ui/AiButton"

interface Props {
  projectId: string
  meta: ProjectMeta
  onUpdate: (partial: Partial<ProjectMeta>) => Promise<void>
}

const FIELDS: { key: keyof ProjectConcept; label: string; placeholder: string; rows: number; tag?: string }[] = [
  { key: "theme",          label: "가치관/주제",    placeholder: "이 소설이 말하고자 하는 메시지 (예: 복수는 또 다른 상처를 낳는다)", rows: 2 },
  { key: "ending",         label: "엔딩 방향",      placeholder: "해피엔딩 / 비극 / 열린 결말 등", rows: 2 },
  { key: "tone",           label: "분위기/톤",      placeholder: "어둡고 긴장감 있는 / 가볍고 유쾌한 / 서정적인 등", rows: 2 },
  { key: "style",          label: "문체",           placeholder: "3인칭 전지적 시점, 과거형 서술 등", rows: 2 },
  { key: "writingGuide",   label: "집필 지침",      placeholder: "예: 대화 위주로 구성, 장면 묘사를 풍부하게, 주인공 내면 독백 포함, 긴장감 있는 문장 사용", rows: 4, tag: "본문 작성 전용" },
  { key: "styleReference", label: "문체 레퍼런스",  placeholder: "따라하고 싶은 작가의 글을 그대로 붙여넣으세요. AI가 해당 문체를 모방해 본문을 생성합니다.\n\n스타일이 일관된 장면 하나를 통째로 (1,000~2,500자 내외) 넣는 게 가장 효과적입니다.\n문피아·카카오페이지·네이버 시리즈 등에서 복사해 붙여넣으면 됩니다.", rows: 10, tag: "본문 작성 전용" },
]

export default function ConceptTab({ projectId, meta, onUpdate }: Props) {
  const [concept, setConcept] = useState<ProjectConcept>({
    ...meta.concept,
    writingGuide: meta.concept.writingGuide ?? "",
    styleReference: meta.concept.styleReference ?? "",
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
      const merged = { ...generated, writingGuide: generated.writingGuide ?? "", styleReference: concept.styleReference ?? "" }
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

      {FIELDS.map(({ key, label, placeholder, rows, tag }) => (
        <div key={key}>
          <label className="text-sm font-medium mb-2 block" style={{ color: "var(--muted)" }}>
            {label}
            {tag && (
              <span className="ml-2 text-xs px-1.5 py-0.5 rounded"
                style={{ background: "var(--surface2)", color: "var(--accent)" }}>
                {tag}
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
