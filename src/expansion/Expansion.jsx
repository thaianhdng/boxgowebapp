// Owner-only expansion. Everything in src/expansion/ is loaded only when the
// owner is signed in (see ExpansionMount in EquipmentManifest.jsx), as its
// own download — other accounts never fetch or run it.
//
// `app` gives the expansion what it needs from BOXGO. Add fields there
// rather than reaching into BOXGO's internals from here.
//
// Nothing to show yet: this renders nothing, so BOXGO looks exactly like 1.0.
export default function Expansion({ app }) { // eslint-disable-line no-unused-vars
  return null;
}
