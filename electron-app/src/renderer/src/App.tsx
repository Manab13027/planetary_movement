import { useState } from 'react'
import { ModuleNav } from './components/ModuleNav'
import { ModuleView } from './components/ModuleView'

function App(): React.JSX.Element {
  const [activeModuleId, setActiveModuleId] = useState('spinning-world')

  return (
    <div className="app-layout">
      <ModuleNav activeModuleId={activeModuleId} onSelect={setActiveModuleId} />
      <main>
        <ModuleView moduleId={activeModuleId} />
      </main>
    </div>
  )
}

export default App
