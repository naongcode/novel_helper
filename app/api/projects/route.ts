import { NextRequest, NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { listProjects, createProject, deleteProject } from "@/lib/storage"

export async function GET() {
  const projects = listProjects().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
  return NextResponse.json(projects)
}

export async function POST(req: NextRequest) {
  const { title, genres } = await req.json()
  if (!title?.trim()) {
    return NextResponse.json({ error: "제목을 입력해주세요" }, { status: 400 })
  }
  const id = nanoid(10)
  const meta = createProject(id, title.trim(), genres ?? [])
  return NextResponse.json(meta, { status: 201 })
}
