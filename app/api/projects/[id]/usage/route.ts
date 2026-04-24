import { NextRequest, NextResponse } from "next/server"
import { getUsage } from "@/lib/storage"

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return NextResponse.json(getUsage(id))
}
