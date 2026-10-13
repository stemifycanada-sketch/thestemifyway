export interface User { id: string; name: string; email: string | null; role: 'parent' | 'student' | 'staff'; verified: boolean }
export interface Session { user: User | null; csrf: string | null }
export interface Student { id: string; name: string; grade: string; timezone: string; account_id: string | null; login_name: string | null; parent_name?: string; parent_email?: string }
export interface Lesson {
  id: string; student_id: string; student_name: string; timezone: string; title: string; subject: string; teacher: string;
  starts_at: string; duration_minutes: number; status: 'scheduled' | 'completed' | 'cancelled'; join_url: string; preparation: string;
  zoom_meeting_id?: string; zoom_uuid?: string; version: number; published_summary: string | null; published_next_steps: string | null;
  published_at: string | null; draft_summary?: string; draft_next_steps?: string; source?: string; note_version?: number; published_version?: number;
}
export interface Dashboard { students: Student[]; classes: Lesson[]; integration?: { configured: boolean; unresolved: { id: string; event_type: string; meeting_uuid: string; status: string; received_at: string; meeting_id: string | null; starts_at: string | null }[]; counts: { status: string; count: number }[]; state: Record<string, string> } }
export async function api<T>(path: string, csrf: string | null, body?: unknown, method = 'POST'): Promise<T> {
  const response = await fetch(`/api${path}`, { method: body === undefined ? 'GET' : method, credentials: 'same-origin',
    headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(csrf ? { 'X-CSRF-Token': csrf } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.')
  return data as T
}
