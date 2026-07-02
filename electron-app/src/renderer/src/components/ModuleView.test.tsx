import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ModuleView } from './ModuleView'

describe('ModuleView', () => {
  it('shows the module title and summary for a known module', () => {
    render(<ModuleView moduleId="spinning-world" />)
    expect(screen.getByRole('heading', { name: 'Spinning World' })).toBeInTheDocument()
    expect(screen.getByText(/Earth's rotation/)).toBeInTheDocument()
  })

  it('shows a not-found message for an unknown module id', () => {
    render(<ModuleView moduleId="does-not-exist" />)
    expect(screen.getByText(/Module not found/)).toBeInTheDocument()
  })

  it('shows a coming-soon placeholder for a module that is not implemented yet', () => {
    render(<ModuleView moduleId="tilted-orbit" />)
    expect(screen.getByText(/Coming soon/)).toBeInTheDocument()
  })
})
