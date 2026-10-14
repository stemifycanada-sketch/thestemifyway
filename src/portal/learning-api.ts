export type ResourceKind = 'worksheet' | 'wayground' | 'reference'
export type AssignmentStatus = 'assigned' | 'submitted' | 'needs_revision' | 'reviewed'
export interface Resource {
  id: string
  title: string
  description: string
  subject: string
  grade: string
  kind: ResourceKind
  visibility: 'assigned' | 'library'
  file_id: string | null
  file_name: string | null
  link_url: string
  embed_url: string
  published: boolean
  created_at: string
}
export interface Assignment {
  id: string
  student_id: string
  student_name: string
  resource_id: string | null
  title: string
  instructions: string
  due_at: string | null
  status: AssignmentStatus
  version: number
  created_at: string
}
export interface Submission {
  id: string
  assignment_id: string
  attempt?: number
  answer_text: string
  file_id: string | null
  file_name: string | null
  submitted_at: string
  feedback: string
  score: number | null
  review_status: 'reviewed' | 'needs_revision' | null
  reviewed_at: string | null
}
export interface LearningData {
  resources: Resource[]
  assignments: Assignment[]
  submissions: Submission[]
  page: number
  hasMore: boolean
}

export function mergeLearningPages(previous: LearningData, next: LearningData): LearningData {
  const merge = <T extends { id: string }>(before: T[], after: T[]) => [...new Map([...before, ...after].map(item => [item.id, item])).values()]
  return {
    page: next.page,
    hasMore: next.hasMore,
    resources: merge(previous.resources, next.resources),
    assignments: merge(previous.assignments, next.assignments),
    submissions: merge(previous.submissions, next.submissions),
  }
}

export const uploadTypes = ['application/pdf', 'image/png', 'image/jpeg']
export const uploadLimit = 5 * 1024 * 1024

export async function uploadLearningFile(file: File, csrf: string): Promise<{ id: string; name: string }> {
  if (!uploadTypes.includes(file.type)) throw new Error('Choose a PDF, PNG or JPEG file.')
  if (!file.size || file.size > uploadLimit) throw new Error('Choose a file larger than 0 bytes and no bigger than 5 MB.')
  const response = await fetch('/api/learning/files', {
    method: 'POST', credentials: 'same-origin', body: file,
    headers: { 'Content-Type': file.type, 'X-File-Name': encodeURIComponent(file.name), 'X-CSRF-Token': csrf },
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Your file could not be uploaded. Please try again.')
  return data
}

export function safeLearningUrl(value: string): string | null {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443') ? url.href : null
  } catch { return null }
}

export function safeQuizEmbed(value: string): string | null {
  const safe = safeLearningUrl(value)
  if (!safe) return null
  const url = new URL(safe)
  const official = ['wayground.com', 'quizizz.com'].some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))
  return official ? safe : null
}
