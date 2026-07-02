import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('App', () => {
  it('defaults to showing the Spinning World module', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Spinning World' })).toBeInTheDocument()
  })

  it('switches module view when a nav item is clicked', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /Spinning World/ }))
    expect(screen.getByRole('heading', { name: 'Spinning World' })).toBeInTheDocument()
  })
})
