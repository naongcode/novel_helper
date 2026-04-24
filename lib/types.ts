export const GENRE_OPTIONS = [
  "판타지", "무협", "로맨스", "SF", "추리",
  "공포", "역사", "현대", "성장", "기타",
] as const

export interface ProjectConcept {
  theme: string          // 가치관/주제
  ending: string         // 엔딩 방향
  tone: string           // 분위기/톤
  style: string          // 문체
  writingGuide: string   // 집필 지침
  styleReference: string // 문체 레퍼런스 (실제 텍스트 예시)
}

export interface ProjectMeta {
  id: string
  title: string
  genres: string[]
  concept: ProjectConcept
  createdAt: string
  updatedAt: string
}

export interface WorldSetting {
  races: string        // 종족
  countries: string    // 나라
  currencies: string   // 화폐
  geography: string    // 지리/지형
  history: string      // 역사
  magic: string        // 마법/기술 체계
  religion: string     // 종교/신앙
  culture: string      // 문화/풍습
  politics: string     // 정치 체계
  social: string       // 계급/사회구조
  creatures: string    // 생물/생태계
  mythology: string    // 신화/전설
  language: string     // 언어
  misc: string         // 기타
}

export const WORLD_SECTIONS: { key: keyof WorldSetting; label: string }[] = [
  { key: "races",      label: "종족" },
  { key: "countries",  label: "나라" },
  { key: "currencies", label: "화폐" },
  { key: "geography",  label: "지리/지형" },
  { key: "history",    label: "역사" },
  { key: "magic",      label: "마법/기술 체계" },
  { key: "religion",   label: "종교/신앙" },
  { key: "culture",    label: "문화/풍습" },
  { key: "politics",   label: "정치 체계" },
  { key: "social",     label: "계급/사회구조" },
  { key: "creatures",  label: "생물/생태계" },
  { key: "mythology",  label: "신화/전설" },
  { key: "language",   label: "언어" },
  { key: "misc",       label: "기타" },
]

export const EMPTY_WORLD: WorldSetting = {
  races: "", countries: "", currencies: "", geography: "",
  history: "", magic: "", religion: "", culture: "",
  politics: "", social: "", creatures: "", mythology: "",
  language: "", misc: "",
}

export interface CharacterRelationship {
  targetId: string
  targetName: string
  relation: string
  description: string
}

export interface Character {
  id: string
  name: string
  role: string
  personality: string
  background: string
  appearance: string
  appearanceChapter: number | null
  relationships: CharacterRelationship[]
}

export interface Scene {
  id: string
  order: number
  description: string
  content: string
  locked?: boolean
}

export interface Chapter {
  id: string
  number: number
  title: string
  summary: string
  keyEvents: string[]
  scenes: Scene[]
}

// API 요청 타입
export interface GenerateConceptRequest {
  title: string
  genres: string[]
}

export interface GenerateWorldRequest {
  section: keyof WorldSetting
  seed: string
  concept: ProjectConcept
  genres: string[]
  existingWorld: WorldSetting
}

export interface GenerateCharacterRequest {
  name: string
  role: string
  count?: number
  concept: ProjectConcept
  genres: string[]
  world: WorldSetting
  existingCharacters: Pick<Character, "id" | "name" | "role" | "personality">[]
}

export interface GeneratePlotRequest {
  chapterCount: number
  concept: ProjectConcept
  genres: string[]
  world: WorldSetting
  characters: Pick<Character, "id" | "name" | "role" | "personality">[]
  existingChapters?: { number: number; title: string; summary: string }[]
  insertAfter?: number  // 0 = 맨 앞, N = N챕터 이후
}

export interface GenerateSceneRequest {
  scene: Scene
  chapter: Chapter
  otherChapterSummaries: { number: number; title: string; summary: string }[]
  concept: ProjectConcept
  genres: string[]
  world: WorldSetting
  characters: Character[]
}
