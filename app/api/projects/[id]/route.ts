import { NextRequest, NextResponse } from "next/server"
import { getMeta, getWorld, getCharacters, getChapters, deleteProject } from "@/lib/storage"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const meta = getMeta(id)
  if (!meta) return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다" }, { status: 404 })
  return NextResponse.json({
    meta,
    world: getWorld(id),
    characters: getCharacters(id),
    chapters: getChapters(id),
  })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  deleteProject(id)
  return NextResponse.json({ ok: true })
}
