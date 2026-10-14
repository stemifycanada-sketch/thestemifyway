CREATE TABLE learning_files (
  id uuid PRIMARY KEY, uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  quota_owner uuid REFERENCES users(id) ON DELETE SET NULL,
  name text NOT NULL, mime_type text NOT NULL CHECK(mime_type IN ('application/pdf','image/png','image/jpeg')),
  byte_size integer NOT NULL CHECK(byte_size BETWEEN 1 AND 5242880), content bytea NOT NULL,
  attached boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX learning_files_owner ON learning_files(uploaded_by);
CREATE INDEX learning_files_quota_owner ON learning_files(quota_owner);
CREATE TABLE learning_resources (
  id uuid PRIMARY KEY, title text NOT NULL, description text NOT NULL DEFAULT '', subject text NOT NULL,
  grade text NOT NULL, kind text NOT NULL CHECK(kind IN ('worksheet','wayground','reference')),
  visibility text NOT NULL CHECK(visibility IN ('assigned','library')),
  file_id uuid UNIQUE REFERENCES learning_files(id), link_url text NOT NULL DEFAULT '', embed_url text NOT NULL DEFAULT '',
  published boolean NOT NULL DEFAULT false, created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE learning_assignments (
  id uuid PRIMARY KEY, student_id uuid NOT NULL REFERENCES students(id), resource_id uuid REFERENCES learning_resources(id),
  title text NOT NULL, instructions text NOT NULL DEFAULT '', due_at timestamptz,
  status text NOT NULL DEFAULT 'assigned' CHECK(status IN ('assigned','submitted','needs_revision','reviewed')),
  version integer NOT NULL DEFAULT 1, created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX learning_assignments_student ON learning_assignments(student_id,created_at);
CREATE TABLE learning_submissions (
  id uuid PRIMARY KEY, assignment_id uuid NOT NULL REFERENCES learning_assignments(id), attempt integer NOT NULL,
  answer_text text NOT NULL DEFAULT '', file_id uuid UNIQUE REFERENCES learning_files(id),
  submitted_by uuid REFERENCES users(id) ON DELETE SET NULL, submitted_at timestamptz NOT NULL DEFAULT now(),
  feedback text NOT NULL DEFAULT '', score numeric(5,2) CHECK(score BETWEEN 0 AND 100),
  review_status text CHECK(review_status IN ('reviewed','needs_revision')),
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL, reviewed_at timestamptz,
  UNIQUE(assignment_id,attempt)
);
CREATE INDEX learning_submissions_assignment ON learning_submissions(assignment_id,attempt);
