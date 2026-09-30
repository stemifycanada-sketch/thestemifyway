export interface Review { id: string; quote: string; attribution: string }
// TODO_CONTENT: Add only supplied, verified testimonials. No synthetic names or ratings.
export const reviews: readonly Review[] = []
export const reviewPlaceholder = 'TODO_CONTENT: Real reviews will appear here when supplied.'
