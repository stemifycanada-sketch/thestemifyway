export interface Subject { id: string; name: string; topics: readonly { id: string; name: string }[] }
// Subject labels come from §14A. Topic coverage is intentionally unspecified.
export const subjects: readonly Subject[] = [
  { id: 'math', name: 'Math', topics: [] },
  { id: 'chemistry', name: 'Chemistry', topics: [] },
  { id: 'biology', name: 'Biology', topics: [] },
  { id: 'physics', name: 'Physics', topics: [] },
  { id: 'language', name: 'Language', topics: [] },
  { id: 'coding', name: 'Coding', topics: [] },
  { id: 'competitive', name: 'Competitive', topics: [] },
]
// TODO_CONTENT: Topic drill-down and commercial details are implemented in Milestone 7.
