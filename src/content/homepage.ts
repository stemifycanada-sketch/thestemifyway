// Working copy and labels from STEMIFY_MASTER_SPEC.md. None are newly invented claims.
export const homepage = {
  heroLead: 'Turning',
  heroLines: ['curiosity', 'into', 'confidence'],
  heroSupport: 'Personalised learning support with live classes for K–12.',
  adaptive: 'Learning built around one student.',
  interactive: 'Learning becomes interactive.',
  journey: 'The learning journey.',
  subjects: 'Subjects & learning plans.',
  closing: 'Before we teach, we understand.',
  closingSupport: 'Let’s build the right path for your child.',
  assessment: 'Book a free assessment',
} as const

export const storyOrder = ['choice', 'adaptive', 'interactive', 'journey', 'subjects', 'understand', 'reviews'] as const
export type StoryId = (typeof storyOrder)[number]

export const navigation = [
  { label: 'Learning', href: '#adaptive' },
  { label: 'Subjects', href: '#subjects' },
  { label: 'How it works', href: '#interactive' },
  { label: 'Reviews', href: '#reviews' },
] as const

// Resource destinations currently refer to the relevant homepage sections.
export const resourceNavigation = [
  { label: 'About us', href: '#understand' },
  { label: 'Curriculum', href: '#subjects' },
  { label: 'Digital sheets', href: '#learning-resources' },
] as const

export const adaptations = [
  { title: 'Pace', description: 'Class moves at the right speed.' },
  { title: 'Level', description: 'Matches their current level.' },
  { title: 'Teaching style', description: 'Adapts to how they learn best.' },
  { title: 'Practice', description: 'Focuses on what they need.' },
  { title: 'Interactivity', description: 'Keeps them engaged and involved.' },
  { title: 'Challenge', description: 'Builds confidence with the right level of challenge.' },
] as const

export const journeyStages = ['Foundations', 'Advanced', 'Competitive'] as const

export const pendingContent = {
  assessment: 'The assessment booking experience is being prepared. This preview does not submit a booking.',
  footer: 'Contact and legal details pending.',
  whiteboard: 'TODO_CONTENT: Final whiteboard and teaching-philosophy copy.',
} as const
