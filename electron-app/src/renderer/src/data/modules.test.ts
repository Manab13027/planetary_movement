import { describe, it, expect } from 'vitest'
import { MODULES, getModuleById } from './modules'

describe('modules', () => {
  it('has 6 modules in curriculum order', () => {
    expect(MODULES).toHaveLength(6)
    expect(MODULES.map((m) => m.id)).toEqual([
      'spinning-world',
      'tilted-orbit',
      'climate-patterns',
      'weather-in-motion',
      'restless-crust',
      'moon-and-tides'
    ])
  })

  it('only spinning-world is implemented for now', () => {
    const implemented = MODULES.filter((m) => m.implemented)
    expect(implemented.map((m) => m.id)).toEqual(['spinning-world'])
  })

  it('getModuleById returns the matching module', () => {
    expect(getModuleById('spinning-world')?.title).toBe('Spinning World')
  })

  it('getModuleById returns undefined for an unknown id', () => {
    expect(getModuleById('nonexistent')).toBeUndefined()
  })
})
