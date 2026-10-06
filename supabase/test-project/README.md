# BOXGO test database (owner only)

A second, separate Supabase project. In BOXGO, Settings → Data →
Database switches the owner's device between **Live BOXGO** and **Test
BOXGO**. Nothing done in Test touches the live data. The app's side is in
`src/lib/dbMode.js`, which holds the test project's address
(`sknqssjxtctadptwziqb`) and its public (publishable) key.

## One-time setup

1. **Create the project.** supabase.com → sign in → **New project**. Same
   organization as BOXGO, name `boxgo-test`, generate a database password
   (save it somewhere; BOXGO doesn't need it), same region as the live
   project, Free plan → **Create new project**. Wait a minute or two.
2. **Build the tables.** In the new project: left sidebar → **SQL Editor** →
   **New query** → paste all of `000_test_setup.sql` → **Run**. It should
   say "Success. No rows returned".
3. **Add yourself.** Left sidebar → **Authentication** → **Users** → **Add
   user** → **Create new user** → your usual email, a password, tick
   **Auto Confirm User** → **Create user**.
4. **Send Claude the address and key.** Left sidebar → **Project Settings**
   (gear) → **API Keys**: copy the **anon / public** key (under "Legacy API
   keys" if there are two tabs). Then **Data API** (or **API**): copy the
   **Project URL**. Paste both into the chat. Both are public by design.

## Using it

- Switch: Settings → Data → Database → Test BOXGO. The app
  reloads; sign in with the test password. A teal **TEST** badge shows in
  the header (and on the sign-in screen) the whole time.
- To fill it with a copy of your real data: in Live, Settings → Backup;
  switch to Test; Settings → Restore that file (all sections are safe
  there). Or restore `testdata/boxgo-test-backup.json`.
- Back: Settings → Database → Live BOXGO (or "Back to live BOXGO" on the
  test sign-in screen).
- A free project pauses after about a week unused. If Test won't load:
  supabase.com → the test project → **Restore** (about a minute), or tap
  "Back to live BOXGO".
- Share links made in Test only work on your device (share pages always
  read the live database).
