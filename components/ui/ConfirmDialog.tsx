"use client"
import Modal from "./Modal"

interface Props {
  open: boolean
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ open, message, onConfirm, onCancel }: Props) {
  return (
    <Modal open={open} onClose={onCancel} title="확인">
      <p className="mb-6" style={{ color: "var(--muted)" }}>{message}</p>
      <div className="flex justify-end gap-3">
        <button onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
          취소
        </button>
        <button onClick={onConfirm}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: "#c0392b" }}>
          삭제
        </button>
      </div>
    </Modal>
  )
}
