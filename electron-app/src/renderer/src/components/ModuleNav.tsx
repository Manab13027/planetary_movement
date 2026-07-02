import { MODULES } from '../data/modules'

interface ModuleNavProps {
  activeModuleId: string
  onSelect: (moduleId: string) => void
}

export function ModuleNav({ activeModuleId, onSelect }: ModuleNavProps): React.JSX.Element {
  return (
    <nav aria-label="Curriculum modules">
      <ul>
        {MODULES.map((module) => (
          <li key={module.id}>
            <button
              type="button"
              disabled={!module.implemented}
              aria-current={module.id === activeModuleId ? 'true' : undefined}
              onClick={() => onSelect(module.id)}
            >
              {module.title}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
