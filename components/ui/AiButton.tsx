"use client"

interface Props {
  onClick: () => void
  loading: boolean
  children: React.ReactNode
  disabled?: boolean
  variant?: "primary" | "secondary"
}

export default function AiButton({ onClick, loading, children, disabled, variant = "primary" }: Props) {
  const isPrimary = variant === "primary"
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-40 transition-colors"
      style={{
        background: isPrimary ? "var(--accent)" : "var(--surface2)",
        color: isPrimary ? "white" : "var(--text)",
        border: isPrimary ? "none" : "1px solid var(--border)",
      }}
    >
      {loading && (
        <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}
