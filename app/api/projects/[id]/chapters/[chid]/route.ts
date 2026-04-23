import { NextRequest, NextResponse } from "next/server"
import { saveChapter, deleteChapter } from "@/lib/storage"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; chid: string }> }) {
  const { id } = await params
  const chapter = await req.json()
  saveChapter(id, chapter)
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; chid: string }> }) {
  const { id, chid } = await params
  deleteChapter(id, chid)
  return NextResponse.json({ ok: true })
}
