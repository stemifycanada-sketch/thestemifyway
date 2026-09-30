export const gradeBands = ['K–8', 'High School'] as const
export type GradeBand = (typeof gradeBands)[number]
export interface LearningPlan { id: string; name: string; price?: string; inclusions: string[] }
// TODO_CONTENT: Real names, pricing, counts and inclusions for both grade bands.
export const plans: Record<GradeBand, readonly LearningPlan[]> = { 'K–8': [], 'High School': [] }
export const planPlaceholder = 'TODO_CONTENT: Plan names, pricing and inclusions have not been supplied.'
