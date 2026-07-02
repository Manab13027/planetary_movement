import { getModuleById } from '../data/modules'

interface ModuleViewProps {
  moduleId: string
}

export function ModuleView({ moduleId }: ModuleViewProps): React.JSX.Element {
  const module = getModuleById(moduleId)

  if (!module) {
    return <p>Module not found.</p>
  }

  return (
    <section>
      <h1>{module.title}</h1>
      <p>{module.summary}</p>
      {!module.implemented && <p>Coming soon.</p>}
      {module.implemented && (
        <div data-testid="module-scene-slot">
          {/* Unity scene, narration, and voice Q&A mount here — added in later plans */}
        </div>
      )}
    </section>
  )
}
