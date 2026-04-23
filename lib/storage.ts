import fs from "fs"
import path from "path"
import type { ProjectMeta, WorldSetting, Character, Chapter } from "./types"
import { EMPTY_WORLD } from "./types"

const DATA_DIR = path.join(process.cwd(), "data")

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function projectDir(id: string) {
  return path.join(DATA_DIR, id)
}

function readJson<T>(filePath: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T
  } catch {
    return fallback
  }
}

function writeJson(filePath: string, data: unknown) {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8")
}

// ── 프로젝트 목록 ─────────────────────────────────────────────

export function listProjects(): ProjectMeta[] {
  ensureDir(DATA_DIR)
  const ids = fs.readdirSync(DATA_DIR).filter((name) => {
    return fs.statSync(path.join(DATA_DIR, name)).isDirectory()
  })
  return ids
    .map((id) => readJson<ProjectMeta | null>(path.join(DATA_DIR, id, "meta.json"), null))
    .filter(Boolean) as ProjectMeta[]
}

export function createProject(id: string, title: string, genres: string[]): ProjectMeta {
  const now = new Date().toISOString()
  const meta: ProjectMeta = {
    id,
    title,
    genres,
    concept: { theme: "", ending: "", tone: "", style: "", writingGuide: "" },
    createdAt: now,
    updatedAt: now,
  }
  const dir = projectDir(id)
  ensureDir(path.join(dir, "chapters"))
  writeJson(path.join(dir, "meta.json"), meta)
  writeJson(path.join(dir, "world.json"), { ...EMPTY_WORLD })
  writeJson(path.join(dir, "characters.json"), [])
  return meta
}

export function deleteProject(id: string) {
  const dir = projectDir(id)
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true })
}

// ── meta ─────────────────────────────────────────────────────

export function getMeta(id: string): ProjectMeta | null {
  return readJson(path.join(projectDir(id), "meta.json"), null)
}

export function saveMeta(id: string, meta: ProjectMeta) {
  meta.updatedAt = new Date().toISOString()
  writeJson(path.join(projectDir(id), "meta.json"), meta)
}

// ── world ────────────────────────────────────────────────────

export function getWorld(id: string): WorldSetting {
  const saved = readJson<Partial<WorldSetting>>(path.join(projectDir(id), "world.json"), {})
  return { ...EMPTY_WORLD, ...saved }
}

export function saveWorld(id: string, world: WorldSetting) {
  writeJson(path.join(projectDir(id), "world.json"), world)
  touchUpdatedAt(id)
}

// ── characters ───────────────────────────────────────────────

export function getCharacters(id: string): Character[] {
  return readJson(path.join(projectDir(id), "characters.json"), [])
}

export function saveCharacters(id: string, characters: Character[]) {
  writeJson(path.join(projectDir(id), "characters.json"), characters)
  touchUpdatedAt(id)
}

// ── chapters ─────────────────────────────────────────────────

export function getChapters(id: string): Chapter[] {
  const chaptersDir = path.join(projectDir(id), "chapters")
  if (!fs.existsSync(chaptersDir)) return []
  return fs
    .readdirSync(chaptersDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => readJson<Chapter>(path.join(chaptersDir, f), null as unknown as Chapter))
    .filter(Boolean)
    .sort((a, b) => a.number - b.number)
}

export function saveChapter(id: string, chapter: Chapter) {
  writeJson(path.join(projectDir(id), "chapters", `${chapter.id}.json`), chapter)
  touchUpdatedAt(id)
}

export function deleteChapter(id: string, chapterId: string) {
  const filePath = path.join(projectDir(id), "chapters", `${chapterId}.json`)
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  touchUpdatedAt(id)
}

// ── 내부 헬퍼 ────────────────────────────────────────────────

function touchUpdatedAt(id: string) {
  const meta = getMeta(id)
  if (meta) saveMeta(id, meta)
}
