/**
 * ProjectFilter Component
 * Allows users to filter tasks by Todoist project
 */

'use client'

interface Project {
  id: string
  name: string
  color?: string
}

interface ProjectFilterProps {
  projects: Project[]
  selectedProjectId: string | null
  onChange: (projectId: string | null) => void
  loading?: boolean
}

export function ProjectFilter({ projects, selectedProjectId, onChange, loading }: ProjectFilterProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-2">
        📁 Filtruj po projekcie:
      </label>
      <select
        value={selectedProjectId || ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={loading}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
      >
        <option value="">Wszystkie projekty</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
    </div>
  )
}
