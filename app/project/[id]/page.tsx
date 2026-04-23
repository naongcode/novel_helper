import ProjectLayout from "@/components/ProjectLayout"

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ProjectLayout id={id} />
}
