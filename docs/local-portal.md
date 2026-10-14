# Run STEMIFY on this Mac

The full portal can run on this Mac without a hosting subscription. Accounts, students, schedules, notes, worksheets and homework are stored locally. Keep this project folder on the Mac's own drive; do not run its live database from Google Drive, Dropbox, iCloud or a network folder.

This setup is available only on this Mac. Parents cannot open its `127.0.0.1` address from their own devices. Zoom cannot deliver real webhooks to that private address. Wayground quizzes still open on Wayground and need internet access; the local portal does not copy quizzes or import their scores.

## Start and stop

Double-click **scripts/start-local.command** in Finder. It uses the saved local `.env` settings, checks the database is stopped, and starts the portal in Terminal. Open the address shown there, normally **http://127.0.0.1:4504/portal**. The public-style website is at **http://127.0.0.1:4504/** and quiz-code entry is at **http://127.0.0.1:4504/join**.

Keep Terminal open while using the portal. Press **Control-C** in that window to stop it. Wait until the command finishes before backing up, updating the app, granting staff access or restarting. Closing the browser does not stop the server.

The launcher does not install packages, access a remote database, enable public access or start a second copy when the configured port is occupied. It refuses production settings, remote database settings and SMTP delivery. For this local setup, verification and password-reset emails are saved privately on this Mac.

## One-time setup or an updated build

Use Node.js **22.12 or newer**. Dependencies may already be installed. If the launcher reports missing dependencies, open Terminal in this project folder and run:

```sh
npm ci --include=dev
npm run build
```

Installing dependencies requires internet access. Starting an already installed/built portal does not install anything. After source updates, stop the portal and run `npm run build` again before restarting.

Use these local `.env` settings; never paste real credentials into Git or a shared document:

```dotenv
NODE_ENV=development
APP_ORIGIN=http://127.0.0.1:4504
HOST=127.0.0.1
PORT=4504
LOCAL_DATA_DIR=.data/postgres
```

Leave `DATABASE_URL` and `SMTP_URL` unset. Environment variables already set in Terminal take precedence over `.env`. The launcher refuses conflicting cloud settings rather than silently changing them. A custom `LOCAL_DATA_DIR` must remain a relative directory under `.data`, outside `mail`, `backups` and `local-operation.lock`.

## Accounts and local email

For a brand-new empty database, stop the portal and create the first teaching account from the project folder:

```sh
node --env-file-if-exists=.env scripts/setup-local-admin.mjs admin@stemify.ca
```

Use the email you want for your own local teaching account. The helper writes a private setup link to **.data/local-admin-setup.json** and sends no email. Start the portal, open that file locally, and use its link within 30 minutes to choose your password. The link works once; never paste it into chat or share the file. This helper refuses an existing account database, an active server or a cloud configuration. It does not reset existing users.

Register a parent account in the portal. Open the newest JSON file under **.data/mail** and use its email-verification link on this same Mac. Reset-password links arrive there too. Do not share those files: they contain account access links. The parent can create separate child logins, add students and view their work.

For an additional teaching account, first register and verify its email locally. Stop the portal, then grant that account staff access from the project folder:

```sh
node --env-file-if-exists=.env scripts/grant-staff.mjs teacher@example.com
```

Replace the example with the verified account's email. Restart and sign in again. Do not use the documented demo passwords for real student records.

## Back up while the portal is stopped

After pressing Control-C and waiting for the portal to stop, run from the project folder:

```sh
node --env-file-if-exists=.env scripts/backup-local.mjs
```

The helper creates a timestamped `.tar.gz` archive under **.data/backups**. It includes the selected local database and local account emails. It excludes `.env`, application code, dependencies and previous backups. The archive and backup directory have private filesystem permissions. This is an ordinary archive, not encrypted storage; keep the Mac encrypted and put any off-device copy in private, protected storage.

Only a completed archive should be copied to Drive or another backup destination. Never sync the running database folder. A backup on the same Mac protects against accidental edits but not loss of the Mac, so keep a separate protected copy if the records matter.

The helper refuses an active portal, an occupied configured port, an open database folder, another Node/npm process in this project, production settings or a remote database. Use this launcher for normal operation; avoid starting database scripts simultaneously or running this database from another checkout. The helper does not open, migrate or write the database.

## Restore cautiously

Stop the portal first. Keep the existing database and mail folders as a separate recovery copy. Extract the chosen archive into a **new empty folder**, inspect that it contains the expected `.data` database and mail paths, then copy those folders into the project while the portal remains stopped. Match `LOCAL_DATA_DIR` to the restored database. Use the same app version first; later startup may apply database migrations. The `.env` file is deliberately not part of the backup.

Restart and check a known student, class and homework attachment before relying on the restored data. Never extract over a running database or discard the recovery copy before checking the restore.

## If startup or backup is refused

An occupied port normally means the portal is already open in another Terminal window. Stop it there. Other Node/npm commands in this same project should finish before starting or backing up.

The launcher and backup share `.data/local-operation.lock`. If the Mac or Terminal crashed, this empty lock directory may remain. **Only after confirming that every portal/database process is stopped**, remove the empty directory with `rmdir .data/local-operation.lock`, then try again. Never remove a lock to force a second server to start.

No automatic restart or scheduled backup is installed. Sleeping or shutting down the Mac stops access until it is awake and the portal is running again.
