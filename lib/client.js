window.__ModuleLoader__.load({
	id: "dsh-avatar-top",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		let primitives = require("@deepseek-ai/dsh-client-ui-primitives");

		//#region layout rule (kept byte-identical to the Host half; the smoke test
		// compares both halves across every option combination)
		const POSITIONS = ["top", "afterBrand", "beforePanels", "inlineBrand"];
		const DENSITIES = ["full", "compact", "icon"];
		const MAX_GAP = 24;
		const DEFAULTS = { enabled: true, position: "top", density: "full", gap: 4 };
		const SCOPE = "html:not([data-platform='darwin']) [class*='_root']";
		const EXPANDED = `${SCOPE}:not([class*='_collapsed'])`;
		const EXPANDED_WIN = `html:not([data-platform='darwin'])[data-windows-titlebar] [class*='_root']:not([class*='_collapsed'])`;
		const EXPANDED_WEB = `html:not([data-platform='darwin']):not([data-windows-titlebar]) [class*='_root']:not([class*='_collapsed'])`;
		const HEADER = "/* dsh-avatar-top: sidebar account row placement (settings: Plugins page). */";

		/** Read a value that may still be a volatile ref on the Host side. */
		function unref(value) {
			if (value !== null && typeof value === "object" && typeof value.get === "function") return value.get();
			return value;
		}

		/** Clamp the spacing setting to the range the page offers. */
		function clampGap(value) {
			const gap = Number(value);
			if (!Number.isFinite(gap)) return DEFAULTS.gap;
			return Math.min(MAX_GAP, Math.max(0, Math.round(gap)));
		}

		/** Normalize a config snapshot into renderable options. */
		function readOptions(config) {
			const source = config ?? {};
			const position = unref(source.position);
			const density = unref(source.density);
			return {
				enabled: unref(source.enabled) !== false,
				position: POSITIONS.includes(position) ? position : DEFAULTS.position,
				density: DENSITIES.includes(density) ? density : DEFAULTS.density,
				gap: clampGap(unref(source.gap))
			};
		}

		/** Build the stylesheet for one option set. */
		function cssFor(options) {
			const { enabled, position, density, gap } = readOptions(options);
			if (!enabled) return "";
			const foot = `${EXPANDED} > [class*='_footArea']`;
			const settings = `${foot} > [class*='_settingsArea']`;
			const rules = [`${foot} { display: contents; }`];
			if (position === "inlineBrand") {
				const winSettings = `${EXPANDED_WIN} > [class*='_footArea'] > [class*='_settingsArea']`;
				const webSettings = `${EXPANDED_WEB} > [class*='_footArea'] > [class*='_settingsArea']`;
				rules.push(`${EXPANDED_WIN} { position: relative; }`);
				rules.push(`${winSettings} { position: absolute; top: 8px; right: 12px; width: auto; z-index: 3; }`);
				rules.push(`${winSettings} [class*='_trigger'] { width: 28px; height: 28px; min-height: 28px; padding: 2px; justify-content: center; }`);
				rules.push(`${winSettings} [class*='_label'] { display: none; }`);
				rules.push(`${winSettings} [class*='_avatar'] { width: 20px; height: 20px; }`);
				rules.push(`${webSettings} { order: -1; margin-bottom: ${gap}px; }`);
				return `${HEADER}\n${rules.join("\n")}`;
			}
			if (position === "afterBrand") {
				rules.push(`${EXPANDED} > [class*='_logoRow'] { order: -4; }`);
				rules.push(`${settings} { order: -3; margin-bottom: ${gap}px; }`);
				rules.push(`${EXPANDED} > [class*='_newSession'] { order: -2; }`);
				rules.push(`${EXPANDED} > [class*='_panelList'] { order: -1; }`);
			} else if (position === "beforePanels") {
				rules.push(`${EXPANDED} > [class*='_logoRow'] { order: -4; }`);
				rules.push(`${EXPANDED} > [class*='_newSession'] { order: -3; }`);
				rules.push(`${settings} { order: -2; margin-bottom: ${gap}px; }`);
				rules.push(`${EXPANDED} > [class*='_panelList'] { order: -1; }`);
			} else {
				rules.push(`${settings} { order: -1; margin-bottom: ${gap}px; }`);
			}
			const trigger = `${settings} [class*='_trigger']`;
			if (density === "compact") {
				rules.push(`${trigger} { height: 32px; min-height: 32px; padding: 2px 6px; }`);
			} else if (density === "icon") {
				rules.push(`${trigger} { height: 28px; min-height: 28px; padding: 2px; }`);
				rules.push(`${settings} [class*='_label'] { display: none; }`);
				rules.push(`${settings} [class*='_avatar'] { width: 20px; height: 20px; }`);
			}
			return `${HEADER}\n${rules.join("\n")}`;
		}
		//#endregion

		//#region copy
		/** Simplified Chinese copy. */
		const zh = {
			title: "账号入口位置",
			summary: "把左栏底部的账号头像挪到上方，腾出底部空间。",
			description: "账号头像同时是设置入口。改动即时生效，无需重启。",
			enabled: "启用",
			position: "位置",
			top: "最顶部",
			afterBrand: "品牌行下",
			beforePanels: "新会话下",
			inlineBrand: "内嵌品牌行",
			density: "占用高度",
			full: "完整 44",
			compact: "紧凑 32",
			icon: "仅头像 28",
			densityInline: "内嵌品牌行时只有头像，不占纵向高度",
			gap: "与下方间距",
			pixels: "px",
			reset: "恢复默认",
			readOnly: "本部署的设置为只读。",
			unavailable: "Host 尚未提供这项设置，暂时无法修改。"
		};
		/** English copy. */
		const en = {
			title: "Account entry position",
			summary: "Moves the sidebar's account avatar above the plugin entries, freeing the bottom strip.",
			description: "The avatar doubles as the Settings entry. Changes apply immediately.",
			enabled: "Enabled",
			position: "Position",
			top: "Top",
			afterBrand: "Below brand",
			beforePanels: "Below New Session",
			inlineBrand: "Inside brand row",
			density: "Height",
			full: "Full 44",
			compact: "Compact 32",
			icon: "Avatar only 28",
			densityInline: "Inside the brand row it is the avatar alone — no vertical space",
			gap: "Spacing below",
			pixels: "px",
			reset: "Restore defaults",
			readOnly: "This deployment stores settings read-only.",
			unavailable: "The host does not serve this setting yet."
		};
		//#endregion

		const CONFIG_NS = "avatar-top";
		const LOCALE_NS = "settings.avatarTop";
		const STYLE_ELEMENT_ID = "dsh-avatar-top-live";

		/** One labelled control row. */
		function fieldRow(label, control) {
			return (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "16px",
					minHeight: "32px"
				},
				children: [(0, react_jsx_runtime.jsx)("span", {
					style: { fontSize: "13px", color: "var(--dsw-alias-label-primary)" },
					children: label
				}), control]
			});
		}

		/** The Plugins page's configuration card for this plugin. */
		function SettingsCard(props) {
			const { t } = props;
			const config = props.config;
			const snapshot = react.useSyncExternalStore(
				(listener) => config.subscribe(listener),
				() => config.getSnapshot(),
			);
			if (props.view === "summary") return t("summary");
			const value = snapshot.value ?? {};
			const writable = snapshot.writable !== false;
			const known = snapshot.value !== void 0;
			const position = POSITIONS.includes(value.position) ? value.position : DEFAULTS.position;
			const density = DENSITIES.includes(value.density) ? value.density : DEFAULTS.density;
			const gap = typeof value.gap === "number" ? value.gap : DEFAULTS.gap;
			const enabled = value.enabled !== false;
			const inline = position === "inlineBrand";
			const set = (field, next) => {
				if (writable) config.set(field, next);
			};
			const reset = () => {
				if (!writable) return;
				for (const field of ["enabled", "position", "density", "gap"]) config.unset(field);
			};
			const status = !known ? t("unavailable") : writable ? null : t("readOnly");
			return (0, react_jsx_runtime.jsxs)("div", {
				style: { display: "flex", flexDirection: "column", gap: "12px", paddingTop: "4px" },
				children: [
					(0, react_jsx_runtime.jsx)("p", {
						style: { margin: 0, fontSize: "13px", lineHeight: "20px", color: "var(--dsw-alias-label-secondary)" },
						children: t("description")
					}),
					fieldRow(t("enabled"), (0, react_jsx_runtime.jsx)(primitives.Switch, {
						label: t("enabled"),
						checked: enabled,
						disabled: !writable,
						onChange: (next) => {
							set("enabled", next);
						}
					})),
					fieldRow(t("position"), (0, react_jsx_runtime.jsx)(primitives.SegmentedControl, {
						id: "avatar-top-position",
						label: t("position"),
						value: position,
						disabled: !writable || !enabled,
						options: [
							{ value: "top", label: t("top") },
							{ value: "afterBrand", label: t("afterBrand") },
							{ value: "beforePanels", label: t("beforePanels") },
							{ value: "inlineBrand", label: t("inlineBrand") }
						],
						onChange: (next) => {
							set("position", next);
						}
					})),
					fieldRow(t("density"), (0, react_jsx_runtime.jsx)(primitives.SegmentedControl, {
						id: "avatar-top-density",
						label: t("density"),
						value: density,
						disabled: !writable || !enabled || inline,
						options: [
							{ value: "full", label: t("full") },
							{ value: "compact", label: t("compact") },
							{ value: "icon", label: t("icon") }
						],
						onChange: (next) => {
							set("density", next);
						}
					})),
					fieldRow(t("gap"), (0, react_jsx_runtime.jsxs)("span", {
						style: { display: "inline-flex", alignItems: "center", gap: "6px" },
						children: [
							(0, react_jsx_runtime.jsx)(primitives.Input, {
								type: "number",
								min: 0,
								max: MAX_GAP,
								step: 1,
								value: String(gap),
								"aria-label": t("gap"),
								disabled: !writable || !enabled,
								style: { width: "64px", textAlign: "center" },
								onChange: (event) => {
									const next = clampGap(event.currentTarget.value);
									if (next !== gap) set("gap", next);
								}
							}),
							(0, react_jsx_runtime.jsx)("span", {
								style: { fontSize: "12px", color: "var(--dsw-alias-label-tertiary)" },
								children: t("pixels")
							})
						]
					})),
					inline ? (0, react_jsx_runtime.jsx)("p", {
						style: { margin: 0, fontSize: "12px", color: "var(--dsw-alias-label-tertiary)" },
						children: t("densityInline")
					}) : null,
					(0, react_jsx_runtime.jsx)("div", {
						style: { display: "flex", justifyContent: "flex-end" },
						children: (0, react_jsx_runtime.jsx)(primitives.Button, {
							variant: "outline",
							size: "sm",
							disabled: !writable,
							onClick: reset,
							children: t("reset")
						})
					}),
					status === null ? null : (0, react_jsx_runtime.jsx)("p", {
						role: "status",
						style: { margin: 0, fontSize: "12px", color: "var(--dsw-alias-label-tertiary)" },
						children: status
					})
				]
			});
		}

		/** Required client services (cordis fiber inject). */
		const inject = ["slots", "locale", "configForms"];

		/**
		 * Mount the live stylesheet and the Plugins page card while the Host
		 * serves the `avatar-top` namespace.
		 * @param ctx - the browser plugin context.
		 */
		function apply(ctx) {
			const t = ctx.locale.bind(LOCALE_NS);
			ctx.effect(() => ctx.locale.register(LOCALE_NS, { zh, en }), "avatar-top: dictionaries");
			const config = ctx.configForms.get(CONFIG_NS);
			ctx.effect(() => {
				const element = document.createElement("style");
				element.id = STYLE_ELEMENT_ID;
				document.head.append(element);
				const render = () => {
					element.textContent = cssFor(config.getSnapshot().value ?? {});
				};
				render();
				const off = config.subscribe(render);
				return () => {
					off();
					element.remove();
				};
			}, "avatar-top: live stylesheet");
			ctx.effect(() => ctx.configForms.whileServed([CONFIG_NS], () => ctx.slots.inject("plugins.bundle.config", () => ctx.slots.register({
				name: "plugins.bundle.config",
				key: "dsh-avatar-top",
				locale: LOCALE_NS,
				inject: () => ({ config, t })
			}, SettingsCard))), "avatar-top: settings page");
		}

		exports.apply = apply;
		exports.inject = inject;
		exports.cssFor = cssFor;
		exports.CONFIG_NS = CONFIG_NS;
		return module.exports;
	}
});
