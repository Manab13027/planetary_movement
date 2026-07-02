export interface CurriculumModule {
  id: string
  title: string
  summary: string
  implemented: boolean
}

export const MODULES: CurriculumModule[] = [
  {
    id: 'spinning-world',
    title: 'Spinning World',
    summary: "Earth's rotation, day and night, and why the sun seems to move.",
    implemented: true
  },
  {
    id: 'tilted-orbit',
    title: 'The Tilted Orbit',
    summary: 'Revolution around the sun and axial tilt cause the seasons.',
    implemented: false
  },
  {
    id: 'climate-patterns',
    title: 'Climate Patterns',
    summary: 'How season, latitude, and currents combine into long-term climate.',
    implemented: false
  },
  {
    id: 'weather-in-motion',
    title: 'Weather in Motion',
    summary: 'Short-term atmosphere and ocean interactions that make weather.',
    implemented: false
  },
  {
    id: 'restless-crust',
    title: "Earth's Restless Crust",
    summary: 'Plate tectonics and earthquakes cause tsunamis — not planetary motion.',
    implemented: false
  },
  {
    id: 'moon-and-tides',
    title: 'Moon & Tides',
    summary: "The Moon's gravity causes tides — different again from tsunamis.",
    implemented: false
  }
]

export function getModuleById(id: string): CurriculumModule | undefined {
  return MODULES.find((m) => m.id === id)
}
