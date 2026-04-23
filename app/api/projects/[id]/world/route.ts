import { NextRequest, NextResponse } from "next/server"
import { getWorld, saveWorld } from "@/lib/storage"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return NextResponse.json(getWorld(id))
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const world = await req.json()
  saveWorld(id, world)
  return NextResponse.json({ ok: true })
}
