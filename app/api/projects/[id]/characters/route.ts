import { NextRequest, NextResponse } from "next/server"
import { getCharacters, saveCharacters } from "@/lib/storage"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return NextResponse.json(getCharacters(id))
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const characters = await req.json()
  saveCharacters(id, characters)
  return NextResponse.json({ ok: true })
}
