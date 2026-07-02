import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ModuleNav } from './ModuleNav'

describe('ModuleNav', () => {
  it('renders all 6 module titles', () => {
    render(<ModuleNav activeModuleId="spinning-world" onSelect={() => {}} />)
    expect(screen.getByText('Spinning World')).toBeInTheDocument()
    expect(screen.getByText('Moon & Tides')).toBeInTheDocument()
  })

  it('calls onSelect with the module id when an implemented module is clicked', async () => {
    const onSelect = vi.fn()
    render(<ModuleNav activeModuleId="spinning-world" onSelect={onSelect} />)
    await userEvent.click(screen.getByText('Spinning World'))
    expect(onSelect).toHaveBeenCalledWith('spinning-world')
  })

  it('disables buttons for modules that are not implemented', () => {
    render(<ModuleNav activeModuleId="spinning-world" onSelect={() => {}} />)
    expect(screen.getByRole('button', { name: /Moon & Tides/ })).toBeDisabled()
  })

  it('marks the active module button', () => {
    render(<ModuleNav activeModuleId="spinning-world" onSelect={() => {}} />)
    expect(screen.getByRole('button', { name: /Spinning World/ })).toHaveAttribute(
      'aria-current',
      'true'
    )
  })
})
