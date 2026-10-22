/**
 * dsh-avatar-top — Host half.
 *
 * The left sidebar is a flex column: brand row, New Session, global panel rows
 * (the "插件" entry and friends), the workspace/session browser, and a
 * bottom-pinned footer carrying the account avatar ("头像 + 账号名"), which
 * doubles as the Settings launcher. This plugin reorders that column so the
 * account entry sits where the user wants it and the bottom strip is freed.
 *
 * ── Why a boot-injection row and not `tapIndex` ─────────────────────────────
 * `ctx.webServer.tapIndex()` only runs inside `WebServer.renderIndex()`, i.e.
 * when the SPA dist server answers the index over HTTP. The desktop app does
 * not do that: Electron's main process owns the `dsh-app://` scheme, serves
 * `dsh-web-frontend/dist/index.html` out of the package, and hands the
 * *structured* injection table to the page over IPC; the page-side interpreter
 * then applies rows of kind `global` / `script` / `script-src` / `style` /
 * `html`. A `style` row is the one channel both shells render.
 *
 * The table is collected per index response (web) but snapshotted once at Host
 * start (desktop), so the browser half re-applies the stylesheet live from the
 * same settings; the row only guarantees the first paint matches.
 *
 * ── Settings ────────────────────────────────────────────────────────────────
 * `Config` declares volatile fields, so the Host serves the `avatar-top`
 * namespace (the loader row id) and the browser half binds it through
 * `ctx.configForms`. Defaults reproduce the layout this plugin shipped with.
 */
import Schema from '@deepseek-ai/schemastery'

/** Where the account row goes, relative to the other sidebar rows. */
export const POSITIONS = ['top', 'afterBrand', 'beforePanels', 'inlineBrand']

/** How much room the account row takes when it is not inlined. */
export const DENSITIES = ['full', 'compact', 'icon']

/** Upper bound on the user-tuned spacing, in CSS pixels. */
export const MAX_GAP = 24

/** Values used when a field is absent or invalid. */
export const DEFAULTS = Object.freeze({ enabled: true, position: 'top', density: 'full', gap: 4 })

/**
 * Host configuration. Every field is `volatile()`: user-owned settings rather
 * than deployment config, editable from the Plugins page and persisted through
 * the profile's Cordis patch.
 */
export const Config = Schema.object({
  enabled: Schema.boolean()
    .default(DEFAULTS.enabled)
    .description('把账号入口移出底部；关闭后恢复 DSH 默认布局。')
    .volatile(),
  position: Schema.union(POSITIONS.map((value) => Schema.const(value)))
    .default(DEFAULTS.position)
    .description('账号入口的位置：侧栏最顶部、品牌行下方、新会话下方，或内嵌到品牌行右端（Windows 桌面，不占纵向空间）。')
    .volatile(),
  density: Schema.union(DENSITIES.map((value) => Schema.const(value)))
    .default(DEFAULTS.density)
    .description('账号行的尺寸：完整 44px、紧凑 32px、仅头像 28px（藏起账号名）。')
    .volatile(),
  gap: Schema.natural()
    .max(MAX_GAP)
    .default(DEFAULTS.gap)
    .description('账号行与其下方内容的间距（px）。')
    .volatile(),
})

/** Public liveness endpoint: current stylesheet, readable without a session. */
export const DIAGNOSTIC_PATH = '/dsh-avatar-top.css'

/** Root selector shared by every rule: the sidebar column, outside macOS chrome. */
const SCOPE = "html:not([data-platform='darwin']) [class*='_root']"

/**
 * The expanded column. Collapsed is excluded on purpose: the rail hides the
 * footer on Windows anyway, and leaving `display` alone there keeps the stock
 * rail geometry (the `[data-windows-titlebar] … display:none` rule).
 */
const EXPANDED = `${SCOPE}:not([class*='_collapsed'])`

/** Same column, split by whether the Windows titlebar is providing window chrome. */
const EXPANDED_WIN = `html:not([data-platform='darwin'])[data-windows-titlebar] [class*='_root']:not([class*='_collapsed'])`
const EXPANDED_WEB = `html:not([data-platform='darwin']):not([data-windows-titlebar]) [class*='_root']:not([class*='_collapsed'])`

/** Rule header so the injected block is identifiable in DevTools. */
const HEADER = '/* dsh-avatar-top: sidebar account row placement (settings: Plugins page). */'

/** @param {unknown} value — a volatile ref, a plain value, or undefined. */
function unref(value) {
  if (value !== null && typeof value === 'object' && typeof value.get === 'function') return value.get()
  return value
}

/** @param {unknown} value — candidate gap value. */
function clampGap(value) {
  const gap = Number(value)
  if (!Number.isFinite(gap)) return DEFAULTS.gap
  return Math.min(MAX_GAP, Math.max(0, Math.round(gap)))
}

/**
 * Read the effective options out of a cordis config (refs or plain values).
 *
 * @param {object | undefined} config — the plugin config at activation.
 * @returns {{ enabled: boolean, position: string, density: string, gap: number }} normalized options.
 */
export function readOptions(config) {
  const source = config ?? {}
  const position = unref(source.position)
  const density = unref(source.density)
  return {
    enabled: unref(source.enabled) !== false,
    position: POSITIONS.includes(position) ? position : DEFAULTS.position,
    density: DENSITIES.includes(density) ? density : DEFAULTS.density,
    gap: clampGap(unref(source.gap)),
  }
}

/**
 * Build the stylesheet for one option set.
 *
 * The sidebar is a flex column, so placement is pure `order`. The account row
 * lives inside `_footArea` next to `_footerActions`, and that second box is
 * where other plugins (e.g. dsh-cost-meter) mount their sidebar widgets. Moving
 * `_footArea` would drag them along, so the footer becomes `display: contents`
 * — its two children join the column — and only `_settingsArea` (the account
 * row) is reordered. `_footerActions` keeps its default order and stays pinned
 * at the bottom. `_root` / `_footArea` / `_settingsArea` / `_footerActions` /
 * `_logoRow` / `_newSession` / `_panelList` are the stable suffixes of the
 * CSS-module class names, which survive the per-build hash prefix.
 *
 * `inlineBrand` is the zero-height option: the account button is lifted into
 * the free right end of the brand row (Windows desktop, where the collapse
 * toggle lives in the native titlebar) and shrinks to the avatar alone. On
 * other shells it falls back to the `top` placement.
 *
 * @param {object} [options] — normalized or raw options (refs are accepted).
 * @returns {string} the stylesheet, or '' when disabled.
 */
export function cssFor(options) {
  const { enabled, position, density, gap } = readOptions(options)
  if (!enabled) return ''
  const foot = `${EXPANDED} > [class*='_footArea']`
  const settings = `${foot} > [class*='_settingsArea']`
  const rules = [`${foot} { display: contents; }`]
  if (position === 'inlineBrand') {
    const winSettings = `${EXPANDED_WIN} > [class*='_footArea'] > [class*='_settingsArea']`
    const webSettings = `${EXPANDED_WEB} > [class*='_footArea'] > [class*='_settingsArea']`
    rules.push(`${EXPANDED_WIN} { position: relative; }`)
    rules.push(`${winSettings} { position: absolute; top: 8px; right: 12px; width: auto; z-index: 3; }`)
    rules.push(`${winSettings} [class*='_trigger'] { width: 28px; height: 28px; min-height: 28px; padding: 2px; justify-content: center; }`)
    rules.push(`${winSettings} [class*='_label'] { display: none; }`)
    rules.push(`${winSettings} [class*='_avatar'] { width: 20px; height: 20px; }`)
    rules.push(`${webSettings} { order: -1; margin-bottom: ${gap}px; }`)
    return `${HEADER}\n${rules.join('\n')}`
  }
  if (position === 'afterBrand') {
    rules.push(`${EXPANDED} > [class*='_logoRow'] { order: -4; }`)
    rules.push(`${settings} { order: -3; margin-bottom: ${gap}px; }`)
    rules.push(`${EXPANDED} > [class*='_newSession'] { order: -2; }`)
    rules.push(`${EXPANDED} > [class*='_panelList'] { order: -1; }`)
  } else if (position === 'beforePanels') {
    rules.push(`${EXPANDED} > [class*='_logoRow'] { order: -4; }`)
    rules.push(`${EXPANDED} > [class*='_newSession'] { order: -3; }`)
    rules.push(`${settings} { order: -2; margin-bottom: ${gap}px; }`)
    rules.push(`${EXPANDED} > [class*='_panelList'] { order: -1; }`)
  } else {
    rules.push(`${settings} { order: -1; margin-bottom: ${gap}px; }`)
  }
  const trigger = `${settings} [class*='_trigger']`
  if (density === 'compact') {
    rules.push(`${trigger} { height: 32px; min-height: 32px; padding: 2px 6px; }`)
  } else if (density === 'icon') {
    rules.push(`${trigger} { height: 28px; min-height: 28px; padding: 2px; }`)
    rules.push(`${settings} [class*='_label'] { display: none; }`)
    rules.push(`${settings} [class*='_avatar'] { width: 20px; height: 20px; }`)
  }
  return `${HEADER}\n${rules.join('\n')}`
}

/**
 * Append one `style` row for the given options, unless the table already
 * carries the identical stylesheet.
 *
 * @param {Array<object>} table — the collecting injection table.
 * @param {object} [options] — options (refs accepted).
 * @returns {boolean} whether this call appended a row.
 */
export function contributeStyleRow(table, options) {
  if (!Array.isArray(table)) return false
  const text = cssFor(options)
  if (text === '') return false
  const present = table.some((row) => row !== null && typeof row === 'object' && row.kind === 'style' && row.text === text)
  if (present) return false
  table.push({ kind: 'style', text })
  return true
}

/**
 * Host plugin body: contribute the boot row and the diagnostics endpoint for
 * as long as the plugin stays loaded.
 *
 * @param {import('@deepseek-ai/cordis').Context} ctx — plugin context.
 * @param {object} [config] — validated config (volatile fields arrive as refs).
 */
export function apply(ctx, config) {
  const current = () => cssFor(readOptions(config))
  ctx.inject(['webServer'], (ctx) => {
    ctx.effect(
      () => ctx.on('webserver/index-inject', (table) => contributeStyleRow(table, readOptions(config))),
      'avatar-top: boot injection row',
    )
    ctx.effect(
      () => ctx.webServer.register({
        kind: 'exact',
        path: DIAGNOSTIC_PATH,
        handler: (_request, response) => {
          response.writeHead(200, { 'content-type': 'text/css; charset=utf-8', 'cache-control': 'no-store' })
          response.end(current())
        },
      }),
      'avatar-top: diagnostics route',
    )
  })
}
