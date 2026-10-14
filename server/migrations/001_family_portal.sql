CREATE TABLE users (
  id uuid PRIMARY KEY, email text UNIQUE, login_name text UNIQUE, name text NOT NULL,
  password_hash text NOT NULL, role text NOT NULL DEFAULT 'parent' CHECK (role IN ('parent','staff','student')),
  verified_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sessions (
  token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf text NOT NULL, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE TABLE auth_tokens (
  token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK(purpose IN ('verify','reset')), expires_at timestamptz NOT NULL
);
CREATE TABLE students (
  id uuid PRIMARY KEY, parent_id uuid NOT NULL REFERENCES users(id), account_id uuid UNIQUE REFERENCES users(id), name text NOT NULL,
  grade text NOT NULL, timezone text NOT NULL DEFAULT 'America/Toronto', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX students_parent ON students(parent_id);
CREATE TABLE classes (
  id uuid PRIMARY KEY, student_id uuid NOT NULL REFERENCES students(id), title text NOT NULL,
  subject text NOT NULL, teacher text NOT NULL, starts_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL CHECK(duration_minutes BETWEEN 10 AND 240),
  status text NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','completed','cancelled')),
  join_url text NOT NULL DEFAULT '', zoom_meeting_id text NOT NULL DEFAULT '', zoom_uuid text UNIQUE,
  preparation text NOT NULL DEFAULT '', version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX classes_student_date ON classes(student_id, starts_at);
CREATE INDEX classes_zoom_meeting ON classes(zoom_meeting_id);
CREATE TABLE lesson_notes (
  class_id uuid PRIMARY KEY REFERENCES classes(id), draft_summary text NOT NULL DEFAULT '',
  draft_next_steps text NOT NULL DEFAULT '', source text NOT NULL DEFAULT 'Teacher',
  published_summary text NOT NULL DEFAULT '', published_next_steps text NOT NULL DEFAULT '',
  published_at timestamptz, published_by uuid REFERENCES users(id),
  version integer NOT NULL DEFAULT 1, published_version integer NOT NULL DEFAULT 0,
  zoom_modified_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE zoom_events (
  id text PRIMARY KEY, event_type text NOT NULL, meeting_uuid text NOT NULL,
  payload jsonb NOT NULL, status text NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','processed','unmatched','failed')),
  attempts integer NOT NULL DEFAULT 0, next_attempt timestamptz NOT NULL DEFAULT now(),
  received_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz
);
CREATE INDEX zoom_events_pending ON zoom_events(status,next_attempt);
CREATE TABLE rate_limits (key_hash text PRIMARY KEY, count integer NOT NULL, expires_at timestamptz NOT NULL);
CREATE TABLE audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL, resource_id uuid, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE integration_state (key text PRIMARY KEY, value text NOT NULL);
