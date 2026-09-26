// The app owner's account. Owner-only things (Copy Catalog, the expansion)
// check this. Hiding in the app is a convenience; anything that must stay
// private also needs a database rule — see CLAUDE.md.
export const OWNER_EMAIL = "thaianh.dng@gmail.com";

export function isOwner(session) {
  return session?.user?.email?.toLowerCase() === OWNER_EMAIL;
}
