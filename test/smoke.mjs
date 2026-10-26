import assert from 'node:assert/strict'
import {
  Config,
  DEFAULTS,
  DENSITIES,
  MAX_GAP,
  POSITIONS,
  apply,
  contributeStyleRow,
  cssFor,
  readOptions,
} from '../lib/index.js'

// ── 1. settings schema ────────────────────────────────────────────────────
// Volatile fields validate into references (`{ get() }`), like the Loader hands
// them to apply(); plain-valued reads are covered through readOptions below.
const parsed = Config({})
const defaults = {
  enabled: parsed.enabled.get(),
  position: parsed.position.get(),
  density: parsed.density.get(),
  gap: parsed.gap.get(),
}
assert.deepEqual(defaults, DEFAULTS, 'defaults match the shipped layout')
assert.deepEqual(Object.keys(parsed).sort(), ['density', 'enabled', 'gap', 'position'])
assert.throws(() => Config({ position: 'nowhere' }), 'unknown positions are rejected')
assert.throws(() => Config({ density: 'huge' }), 'unknown densities are rejected')
assert.throws(() => Config({ gap: 99 }), 'gap above the schema bound is rejected')
assert.equal(Config({ position: 'inlineBrand' }).position.get(), 'inlineBrand')
assert.equal(Config({ density: 'icon' }).density.get(), 'icon')

// ── 2. option normalization (volatile refs and plain values) ───────────────
const ref = (value) => ({ get: () => value })
assert.deepEqual(readOptions(undefined), DEFAULTS, 'missing config falls back to defaults')
assert.deepEqual(
  readOptions({ enabled: ref(true), position: ref('beforePanels'), density: ref('icon'), gap: ref(7) }),
  { enabled: true, position: 'beforePanels', density: 'icon', gap: 7 },
  'volatile refs are unwrapped',
)
assert.equal(readOptions({ position: 'bogus' }).position, DEFAULTS.position, 'unknown position falls back')
assert.equal(readOptions({ density: 'bogus' }).density, DEFAULTS.density, 'unknown density falls back')
assert.equal(readOptions({ gap: 999 }).gap, MAX_GAP, 'gap clamps high')
assert.equal(readOptions({ gap: -3 }).gap, 0, 'gap clamps low')
assert.equal(readOptions({ gap: 'abc' }).gap, DEFAULTS.gap, 'invalid gap falls back')

// ── 3. stylesheet generation ──────────────────────────────────────────────
assert.equal(cssFor({ enabled: false }), '', 'disabled emits no rules')
const top = cssFor({ position: 'top', gap: 4 })
assert.ok(top.includes("[class*='_footArea'] { display: contents; }"), 'the footer becomes a layout pass-through')
assert.ok(
  top.includes(`> [class*='_footArea'] > [class*='_settingsArea'] { order: -1; margin-bottom: 4px; }`),
  'top placement lifts only the account row',
)
assert.ok(top.startsWith('/* dsh-avatar-top:'), 'stylesheet carries an identifying header')
assert.ok(!top.includes('_logoRow'), 'top placement leaves the other rows alone')

// Regression: dsh-cost-meter and friends mount into `_footerActions`. Neither
// that box nor the footer itself may be reordered, or their widgets ride along.
for (const options of [{}, { position: 'afterBrand' }, { position: 'beforePanels' }, { density: 'icon' }]) {
  const sheet = cssFor(options)
  assert.ok(!sheet.includes("[class*='_footerActions'] { order"), `footer actions stay put (${JSON.stringify(options)})`)
  assert.ok(!/_footArea'\] \{ order:/.test(sheet), `the footer box itself is never reordered (${JSON.stringify(options)})`)
}
assert.ok(!cssFor({}).includes('_footerActions'), 'footer actions are not targeted at all')

const afterBrand = cssFor({ position: 'afterBrand', gap: 6 })
const orderOf = (sheet, suffix) => {
  const match = sheet.match(new RegExp(`\\[class\\*='${suffix}'\\] \\{ order: (-?\\d+);`))
  return match === null ? undefined : Number(match[1])
}
assert.deepEqual(
  ['_logoRow', '_settingsArea', '_newSession', '_panelList'].map((suffix) => orderOf(afterBrand, suffix)),
  [-4, -3, -2, -1],
  'afterBrand places the account row directly under the brand row',
)

const beforePanels = cssFor({ position: 'beforePanels', gap: 6 })
assert.deepEqual(
  ['_logoRow', '_newSession', '_settingsArea', '_panelList'].map((suffix) => orderOf(beforePanels, suffix)),
  [-4, -3, -2, -1],
  'beforePanels places the account row above the panel entries',
)

// Density: full leaves the row alone, compact trims it, icon drops the name.
const full = cssFor({ position: 'top', density: 'full' })
assert.ok(!full.includes("[class*='_trigger'] {"), 'full keeps the stock row height')
const compact = cssFor({ position: 'top', density: 'compact' })
// The account button selector must not swallow `_triggerRow`: that row also holds
// the connection indicator and the desktop update pill, and sizing it collapsed
// the row and drew the pill underneath the avatar.
const BUTTON = "[class*='_trigger']:not([class*='_triggerRow']):not([class*='_triggerLabel'])"
assert.ok(compact.includes(`${BUTTON} { height: 32px;`), 'compact trims the account button to 32px')
const icon = cssFor({ position: 'top', density: 'icon' })
assert.ok(icon.includes(`${BUTTON} { height: 28px;`), 'icon trims the account button to 28px')
assert.ok(icon.includes("[class*='_label'] { display: none; }"), 'icon hides the account name')
assert.ok(icon.includes("[class*='_avatar'] { width: 20px; height: 20px; }"), 'icon shrinks the avatar')
assert.ok(!icon.includes("[class*='_trigger'] { height"), 'no rule sizes anything merely matching `_trigger`')

// The desktop update pill lives in the same flex row; the row must wrap, not clip.
for (const position of POSITIONS) {
  assert.ok(
    cssFor({ position }).includes("[class*='_triggerRow'] { flex-wrap: wrap; row-gap: 4px; }"),
    `the account row wraps instead of clipping the update pill (${position})`,
  )
}

// Inline brand row: zero-height placement, avatar only, top falls back elsewhere.
const inline = cssFor({ position: 'inlineBrand', gap: 5 })
assert.ok(inline.includes('[data-windows-titlebar]'), 'inline needs the Windows titlebar')
assert.ok(inline.includes('{ position: relative; }'), 'the column becomes the positioning context')
assert.ok(
  inline.includes('{ position: absolute; top: 8px; right: 12px; width: auto; z-index: 3; }'),
  'the account row is lifted into the brand row',
)
assert.ok(inline.includes("[class*='_label'] { display: none; }"), 'inline hides the account name')
assert.ok(inline.includes('order: -1; margin-bottom: 5px;'), 'non-Windows shells fall back to top')

// While the update pill exists, the inline shape has no width to share, so the row
// drops back into the flow under the brand row and both stay readable.
assert.ok(inline.includes(":has([class*='_indicator'])"), 'inline reacts to the desktop update pill')
assert.ok(
  inline.includes('{ position: static; top: auto; right: auto; width: auto; z-index: auto; order: -3; margin: 0 0 5px; }'),
  'the update pill forces the account row back under the brand row',
)
assert.ok(inline.includes(":has([class*='_indicator']) > [class*='_logoRow'] { order: -4; }"), 'the brand row stays first')
assert.ok(inline.includes(":has([class*='_indicator']) > [class*='_panelList'] { order: -1; }"), 'panel rows stay after it')

for (const position of POSITIONS) {
  assert.ok(cssFor({ position }).includes("html:not([data-platform='darwin'])"), `macOS stays untouched (${position})`)
}

// ── 4. injection table ────────────────────────────────────────────────────
const table = []
assert.equal(contributeStyleRow(table, { position: 'top' }), true, 'first collection appends')
assert.equal(table.length, 1)
assert.equal(contributeStyleRow(table, { position: 'top' }), false, 'identical stylesheet is not duplicated')
assert.equal(contributeStyleRow([], { enabled: false }), false, 'disabled contributes nothing')
assert.equal(contributeStyleRow(undefined, {}), false, 'non-table input is ignored')

// ── 5. plugin body wiring (cordis-shaped fake) ────────────────────────────
const listeners = []
const routes = []
let effects = 0
const fakeCtx = {
  inject(deps, callback) {
    assert.deepEqual(deps, ['webServer'])
    callback({
      webServer: {
        register(route) {
          routes.push(route)
          return () => {}
        },
      },
      on(name, listener) {
        listeners.push({ name, listener })
        return () => {}
      },
      effect(run, label) {
        assert.equal(typeof label, 'string')
        assert.equal(typeof run(), 'function')
        effects += 1
        return () => {}
      },
    })
  },
}

const config = { enabled: ref(true), position: ref('beforePanels'), density: ref('icon'), gap: ref(9) }
apply(fakeCtx, config)
assert.equal(effects, 2, 'row subscription + diagnostics route')
assert.deepEqual(listeners.map((entry) => entry.name), ['webserver/index-inject'])
assert.equal(routes.length, 1)
assert.equal(routes[0].path, '/dsh-avatar-top.css')

const collected = []
listeners[0].listener(collected)
assert.equal(collected.length, 1, 'host collection sees the configured row')
assert.equal(collected[0].text, cssFor({ position: 'beforePanels', density: 'icon', gap: 9 }), 'row reflects the current settings')

let status
let headers
let body
routes[0].handler({}, {
  writeHead(code, next) { status = code; headers = next },
  end(text) { body = text },
})
assert.equal(status, 200)
assert.equal(headers['content-type'], 'text/css; charset=utf-8')
assert.equal(body, cssFor({ position: 'beforePanels', density: 'icon', gap: 9 }), 'diagnostics serve the live stylesheet')

// ── 6. the browser half stays in lock-step with the host ─────────────────
const loaded = []
globalThis.window = { __ModuleLoader__: { load: (entry) => loaded.push(entry) } }
const clientUrl = new URL('../lib/client.js', import.meta.url).href
await import(clientUrl)
assert.equal(loaded.length, 1, 'client bundle registers one module')
assert.equal(loaded[0].id, 'dsh-avatar-top', 'module id is the package name')

const stubs = {
  react: {
    useSyncExternalStore: () => {},
    createElement: () => ({}),
  },
  'react/jsx-runtime': {
    jsx: () => ({}),
    jsxs: () => ({}),
    Fragment: {},
  },
  '@deepseek-ai/dsh-client-ui-primitives': {},
}
const client = loaded[0].factory((id) => {
  if (!(id in stubs)) throw new Error(`unexpected require: ${id}`)
  return stubs[id]
})
assert.deepEqual(client.inject, ['slots', 'locale', 'configForms'], 'client waits for its services')
assert.equal(typeof client.apply, 'function')
assert.equal(client.CONFIG_NS, 'avatar-top', 'namespace is the loader row id')

const matrix = []
for (const enabled of [true, false]) {
  for (const position of POSITIONS) {
    for (const density of DENSITIES) {
      for (const gap of [0, 4, 12, 24, 99]) matrix.push({ enabled, position, density, gap })
    }
  }
}
for (const options of matrix) {
  assert.equal(client.cssFor(options), cssFor(options), `halves agree: ${JSON.stringify(options)}`)
}

delete globalThis.window
console.log(`ok: settings schema, ${matrix.length}-case stylesheet matrix, injection row, diagnostics route, client parity`)
