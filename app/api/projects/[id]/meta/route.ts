import { NextRequest, NextResponse } from "next/server"
import { getMeta, saveMeta } from "@/lib/storage"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const meta = getMeta(id)
  if (!meta) return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다" }, { status: 404 })
  const body = await req.json()
  const updated = { ...meta, ...body }
  saveMeta(id, updated)
  return NextResponse.json(updated)
}
