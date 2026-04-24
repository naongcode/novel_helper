"use client"
import { useState, useEffect } from "react"
import type { UsageRecord, GenerateType } from "@/lib/types"

interface Props {
  projectId: string
}

const TYPE_LABEL: Record<GenerateType, string> = {
  concept: "작품 설정",
  world: "세계관",
  character: "캐릭터",
  plot: "줄거리",
  scene: "장면 생성",
}

const TYPE_COLOR: Record<GenerateType, string> = {
  concept: "#a78bfa",
  world: "#34d399",
  character: "#60a5fa",
  plot: "#fb923c",
  scene: "#f472b6",
}

function fmt(n: number, digits = 4) {
  return n.toFixed(digits)
}

function fmtTokens(n: number) {
  return n.toLocaleString()
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`
}

export default function UsageTab({ projectId }: Props) {
  const [records, setRecords] = useState<UsageRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [exchangeRate, setExchangeRate] = useState(1500)

  useEffect(() => {
    fetch(`/api/projects/${projectId}/usage`)
      .then((r) => r.json())
      .then((data) => setRecords(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [projectId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: "var(--muted)" }}>
        불러오는 중...
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: "var(--muted)" }}>
        <p className="text-sm">아직 AI 생성 기록이 없습니다.</p>
        <p className="text-xs">AI 기능을 사용하면 여기에 토큰/비용이 기록됩니다.</p>
      </div>
    )
  }

  const totalInput = records.reduce((s, r) => s + r.inputTokens, 0)
  const totalOutput = records.reduce((s, r) => s + r.outputTokens, 0)
  const totalCost = records.reduce((s, r) => s + r.totalCost, 0)

  // 타입별 집계
  const byType = (Object.keys(TYPE_LABEL) as GenerateType[]).map((type) => {
    const filtered = records.filter((r) => r.type === type)
    return {
      type,
      count: filtered.length,
      cost: filtered.reduce((s, r) => s + r.totalCost, 0),
    }
  }).filter((t) => t.count > 0)

  const sorted = [...records].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-8">
      {/* 총계 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">토큰 / 비용</h2>
          <div className="flex items-center gap-2 text-sm">
            <span style={{ color: "var(--muted)" }}>환율</span>
            <span style={{ color: "var(--muted)" }}>$1 =</span>
            <input
              type="number"
              value={exchangeRate}
              min={1}
              onChange={(e) => setExchangeRate(Number(e.target.value))}
              style={{ width: "80px", padding: "3px 8px", fontSize: "13px", textAlign: "right" }}
            />
            <span style={{ color: "var(--muted)" }}>₩</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "총 비용", value: `$${fmt(totalCost)}`, sub: `≈ ₩${Math.round(totalCost * exchangeRate).toLocaleString()}` },
            { label: "입력 토큰", value: fmtTokens(totalInput), sub: `$${fmt(totalInput * 2.5e-6)}` },
            { label: "출력 토큰", value: fmtTokens(totalOutput), sub: `$${fmt(totalOutput * 1e-5)}` },
          ].map(({ label, value, sub }) => (
            <div key={label} className="rounded-xl p-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-xs mb-1" style={{ color: "var(--muted)" }}>{label}</p>
              <p className="text-xl font-semibold">{value}</p>
              <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 타입별 요약 */}
      <div>
        <h3 className="text-sm font-medium mb-3" style={{ color: "var(--muted)" }}>기능별 사용량</h3>
        <div className="flex flex-col gap-2">
          {byType.sort((a, b) => b.cost - a.cost).map(({ type, count, cost: c }) => (
            <div key={type} className="flex items-center gap-3 px-4 py-2 rounded-lg"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: TYPE_COLOR[type] + "22", color: TYPE_COLOR[type] }}>
                {TYPE_LABEL[type]}
              </span>
              <span className="text-sm flex-1">{count}회</span>
              <span className="text-sm font-medium">${fmt(c)}</span>
            </div>
          ))}
        </div>
        <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
          환율 기준 $1 = ₩{exchangeRate.toLocaleString()} (참고용 추정치)
        </p>
      </div>

      {/* 상세 기록 */}
      <div>
        <h3 className="text-sm font-medium mb-3" style={{ color: "var(--muted)" }}>상세 기록 ({records.length}건)</h3>
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
                {["시각", "종류", "설명", "입력", "출력", "비용"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-medium"
                    style={{ color: "var(--muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={r.id}
                  style={{ borderBottom: i < sorted.length - 1 ? "1px solid var(--border)" : undefined }}>
                  <td className="px-3 py-2 text-xs whitespace-nowrap" style={{ color: "var(--muted)" }}>
                    {fmtDate(r.timestamp)}
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-xs px-1.5 py-0.5 rounded"
                      style={{ background: TYPE_COLOR[r.type] + "22", color: TYPE_COLOR[r.type] }}>
                      {TYPE_LABEL[r.type]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">{r.label}</td>
                  <td className="px-3 py-2 text-xs text-right">{fmtTokens(r.inputTokens)}</td>
                  <td className="px-3 py-2 text-xs text-right">{fmtTokens(r.outputTokens)}</td>
                  <td className="px-3 py-2 text-xs text-right font-medium">${fmt(r.totalCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
