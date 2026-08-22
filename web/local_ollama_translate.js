import { app } from "../../scripts/app.js";

const EXTENSION_NAME = "Local.Ollama.Translator.V1_1_4";
const SUPPORTED_NODE_NAMES = new Set([
    "LocalOllamaTranslate",
    "LocalOllamaTranslateMultilingual",
]);

const MIN_PANEL_HEIGHT = 110;
const MAX_PANEL_HEIGHT = 900;
const DOM_WIDGET_MARGIN = 20;

function disableWidgetSerialization(widget) {
    if (!widget) {
        return widget;
    }

    // ComfyUI has two different serialization flags:
    //   widget.serialize          -> workflow / graph JSON
    //   widget.options.serialize  -> prompt / API payload
    // Preview text is session-only, so disable both layers.
    widget.serialize = false;
    widget.options = {
        ...(widget.options || {}),
        serialize: false,
    };

    return widget;
}

function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
}

function canvasScale() {
    const scale = Number(app.canvas?.ds?.scale);
    return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

function shortPreview(text, maxChars = 110) {
    const clean = String(text || "")
        .replace(/\s+/g, " ")
        .trim();

    if (clean.length <= maxChars) {
        return clean;
    }

    return clean.slice(0, maxChars) + "…";
}

function storedPanelHeight(node, propertyName, fallback) {
    const raw = Number(node.properties?.[propertyName]);
    if (!Number.isFinite(raw)) {
        return fallback;
    }
    return clamp(Math.round(raw), MIN_PANEL_HEIGHT, MAX_PANEL_HEIGHT);
}

function savePanelHeight(node, propertyName, height) {
    node.properties = node.properties || {};
    node.properties[propertyName] = Math.round(height);
}

function createPanel(
    node,
    propertyName,
    titleText,
    accentColor,
    defaultHeight = 170
) {
    const height = storedPanelHeight(node, propertyName, defaultHeight);

    const root = document.createElement("div");
    root.style.boxSizing = "border-box";
    root.style.width = "100%";
    root.style.height = `${height}px`;
    root.style.padding = "8px 8px 0 8px";
    root.style.border = `1px solid ${accentColor}`;
    root.style.borderRadius = "8px";
    root.style.background = "rgba(10, 12, 16, 0.96)";
    root.style.color = "rgba(238, 238, 238, 1)";
    root.style.fontFamily = "monospace";
    root.style.fontSize = "12px";
    root.style.overflow = "hidden";
    root.style.display = "flex";
    root.style.flexDirection = "column";

    const titleRow = document.createElement("div");
    titleRow.style.display = "flex";
    titleRow.style.alignItems = "center";
    titleRow.style.justifyContent = "space-between";
    titleRow.style.gap = "10px";
    titleRow.style.flex = "0 0 auto";
    titleRow.style.marginBottom = "6px";

    const title = document.createElement("div");
    title.textContent = titleText;
    title.style.fontFamily = "sans-serif";
    title.style.fontSize = "12px";
    title.style.fontWeight = "600";
    title.style.color = accentColor;

    const hint = document.createElement("div");
    hint.textContent = "drag bottom bar";
    hint.style.fontFamily = "sans-serif";
    hint.style.fontSize = "10px";
    hint.style.color = "rgba(190, 190, 190, 0.72)";
    hint.style.userSelect = "none";

    titleRow.appendChild(title);
    titleRow.appendChild(hint);

    const textarea = document.createElement("textarea");
    textarea.readOnly = true;
    textarea.spellcheck = false;
    textarea.wrap = "soft";
    textarea.value = "";
    textarea.style.boxSizing = "border-box";
    textarea.style.width = "100%";
    textarea.style.height = "auto";
    textarea.style.minHeight = "60px";
    textarea.style.flex = "1 1 auto";
    textarea.style.resize = "none";
    textarea.style.border = "0";
    textarea.style.outline = "none";
    textarea.style.padding = "6px";
    textarea.style.borderRadius = "6px";
    textarea.style.background = "rgba(0, 0, 0, 0.28)";
    textarea.style.color = "rgba(238, 238, 238, 1)";
    textarea.style.fontFamily = "monospace";
    textarea.style.fontSize = "12px";
    textarea.style.lineHeight = "1.35";
    textarea.style.overflow = "auto";

    const resizeGrip = document.createElement("div");
    resizeGrip.title = "Drag vertically to resize this preview. Double-click to reset.";
    resizeGrip.style.boxSizing = "border-box";
    resizeGrip.style.height = "12px";
    resizeGrip.style.flex = "0 0 12px";
    resizeGrip.style.cursor = "ns-resize";
    resizeGrip.style.touchAction = "none";
    resizeGrip.style.userSelect = "none";
    resizeGrip.style.display = "flex";
    resizeGrip.style.alignItems = "center";
    resizeGrip.style.justifyContent = "center";

    const gripLine = document.createElement("div");
    gripLine.style.width = "70px";
    gripLine.style.height = "4px";
    gripLine.style.borderRadius = "999px";
    gripLine.style.background = "rgba(190, 190, 190, 0.46)";
    resizeGrip.appendChild(gripLine);

    root.appendChild(titleRow);
    root.appendChild(textarea);
    root.appendChild(resizeGrip);

    const panel = {
        node,
        propertyName,
        defaultHeight,
        height,
        root,
        textarea,
        resizeGrip,
        widget: null,
    };

    resizeGrip.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const startY = event.clientY;
        const startHeight = panel.height;
        const pointerId = event.pointerId;
        resizeGrip.setPointerCapture?.(pointerId);

        const onMove = (moveEvent) => {
            const delta = (moveEvent.clientY - startY) / canvasScale();
            setPanelHeight(panel, startHeight + delta, true);
        };

        const onEnd = () => {
            panel.node.graph?.incrementVersion?.();
            resizeGrip.removeEventListener("pointermove", onMove);
            resizeGrip.removeEventListener("pointerup", onEnd);
            resizeGrip.removeEventListener("pointercancel", onEnd);
            try {
                resizeGrip.releasePointerCapture?.(pointerId);
            } catch {
                // Pointer capture may already have been released by the browser.
            }
        };

        resizeGrip.addEventListener("pointermove", onMove);
        resizeGrip.addEventListener("pointerup", onEnd);
        resizeGrip.addEventListener("pointercancel", onEnd);
    });

    resizeGrip.addEventListener("dblclick", (event) => {
        event.preventDefault();
        event.stopPropagation();
        setPanelHeight(panel, panel.defaultHeight, true);
        panel.node.graph?.incrementVersion?.();
    });

    return panel;
}

function fixedWidgetHeight(panel) {
    return panel.height + DOM_WIDGET_MARGIN;
}

function setPanelHeight(panel, requestedHeight, adjustNode) {
    const nextHeight = clamp(
        Math.round(requestedHeight),
        MIN_PANEL_HEIGHT,
        MAX_PANEL_HEIGHT
    );
    const previousHeight = panel.height;

    if (nextHeight === previousHeight) {
        return;
    }

    panel.height = nextHeight;
    panel.root.style.height = `${nextHeight}px`;
    savePanelHeight(panel.node, panel.propertyName, nextHeight);

    const widget = panel.widget;
    if (widget) {
        const totalHeight = fixedWidgetHeight(panel);

        // New frontend layout API.
        widget.options = {
            ...(widget.options || {}),
            serialize: false,
            getMinHeight: () => totalHeight,
            getMaxHeight: () => totalHeight,
            getHeight: () => totalHeight,
        };
        widget.computeLayoutSize = () => ({
            minHeight: totalHeight,
            maxHeight: totalHeight,
            minWidth: 0,
        });

        // Legacy frontend compatibility.
        widget.computeSize = (width) => [width, totalHeight];
        widget.computedHeight = totalHeight;
        disableWidgetSerialization(widget);
    }

    if (adjustNode && panel.node?.size) {
        const delta = nextHeight - previousHeight;
        const width = panel.node.size[0];
        const height = Math.max(220, panel.node.size[1] + delta);

        if (typeof panel.node.setSize === "function") {
            panel.node.setSize([width, height]);
        } else {
            panel.node.size[1] = height;
        }
    }

    panel.node?.setDirtyCanvas?.(true, true);
}

function ensureFallbackWidget(node, name, label, value) {
    let widget = node.widgets?.find((item) => item.name === name);

    if (!widget) {
        widget = node.addWidget(
            "text",
            name,
            "",
            () => {},
            { serialize: false }
        );
    }

    widget.label = label;
    widget.value = shortPreview(value, 110);
    disableWidgetSerialization(widget);

    return widget;
}

function ensureDomPanel(
    node,
    key,
    widgetName,
    propertyName,
    title,
    accent,
    defaultHeight
) {
    if (typeof node.addDOMWidget !== "function") {
        return null;
    }

    if (!node[key]) {
        const panel = createPanel(
            node,
            propertyName,
            title,
            accent,
            defaultHeight
        );
        node[key] = panel;

        const widget = node.addDOMWidget(
            widgetName,
            "LocalOllamaPreview",
            panel.root,
            {
                serialize: false,
                hideOnZoom: false,
                getValue() {
                    return panel.textarea.value;
                },
                setValue(value) {
                    panel.textarea.value = String(value ?? "");
                },
                getMinHeight() {
                    return fixedWidgetHeight(panel);
                },
                getMaxHeight() {
                    return fixedWidgetHeight(panel);
                },
                getHeight() {
                    return fixedWidgetHeight(panel);
                },
            }
        );

        panel.widget = widget;
        widget.computeLayoutSize = () => ({
            minHeight: fixedWidgetHeight(panel),
            maxHeight: fixedWidgetHeight(panel),
            minWidth: 0,
        });
        widget.computeSize = (width) => [width, fixedWidgetHeight(panel)];
        widget.computedHeight = fixedWidgetHeight(panel);
        disableWidgetSerialization(widget);
    }

    // Re-assert on every update in case the frontend recreated or normalized
    // the widget object after graph configuration.
    const currentWidget =
        node[key]?.widget ??
        node.widgets?.find((item) => item.name === widgetName);
    disableWidgetSerialization(currentWidget);

    return node[key];
}

function updateLegacyPreview(node, translation) {
    const translationPanel = ensureDomPanel(
        node,
        "localOllamaTranslationPanel",
        "translation_preview_full",
        "local_ollama_translation_preview_height",
        "Translation Preview",
        "rgba(166, 225, 185, 1)",
        150
    );

    if (translationPanel) {
        translationPanel.textarea.value = String(translation || "");
    } else {
        ensureFallbackWidget(
            node,
            "translation_preview",
            "translation_preview",
            translation
        );
    }

    const width = Math.max(node.size[0], 720);
    const height = Math.max(node.size[1], 620);
    node.setSize?.([width, height]);
}

function updateMultilingualPreview(node, translation, thinking) {
    const thinkingEnabled = Boolean(
        node.widgets?.find((widget) => widget.name === "thinking_enabled")?.value
    );
    const hasThinking = Boolean(String(thinking || "").trim());

    // Do not create a blank Thinking Preview for the default fast mode.
    // It appears automatically after a thinking-enabled run returns a trace.
    let thinkingPanel = node.localOllamaThinkingPanel || null;
    if (thinkingEnabled || hasThinking) {
        thinkingPanel = ensureDomPanel(
            node,
            "localOllamaThinkingPanel",
            "thinking_preview_full",
            "local_ollama_thinking_preview_height",
            "Thinking Preview",
            "rgba(190, 145, 255, 1)",
            170
        );
    }

    const translationPanel = ensureDomPanel(
        node,
        "localOllamaTranslationPanel",
        "translation_preview_full",
        "local_ollama_translation_preview_height",
        "Translation Preview",
        "rgba(166, 225, 185, 1)",
        170
    );

    if (thinkingPanel) {
        thinkingPanel.textarea.value = String(thinking || "");
    }

    if (translationPanel) {
        translationPanel.textarea.value = String(translation || "");
    } else {
        if (thinkingEnabled || hasThinking) {
            ensureFallbackWidget(
                node,
                "thinking_preview",
                "thinking_preview",
                thinking
            );
        }
        ensureFallbackWidget(
            node,
            "translation_preview",
            "translation_preview",
            translation
        );
    }

    const width = Math.max(node.size[0], 760);
    const minimumHeight = thinkingPanel ? 850 : 690;
    const height = Math.max(node.size[1], minimumHeight);
    node.setSize?.([width, height]);
}

app.registerExtension({
    name: EXTENSION_NAME,

    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (!SUPPORTED_NODE_NAMES.has(nodeData.name)) {
            return;
        }

        const originalOnExecuted = nodeType.prototype.onExecuted;

        nodeType.prototype.onExecuted = function(message) {
            originalOnExecuted?.apply(this, arguments);

            const translation =
                message?.translation?.[0] ??
                message?.text?.[0] ??
                "";

            const thinking =
                message?.thinking?.[0] ??
                "";

            const source =
                message?.source?.[0] ??
                "";

            const meta =
                message?.meta?.[0] ??
                "";

            this.localOllamaTranslationPreview = translation;
            this.localOllamaThinkingPreview = thinking;
            this.localOllamaTranslationSource = source;
            this.localOllamaTranslationMeta = meta;

            if (nodeData.name === "LocalOllamaTranslateMultilingual") {
                updateMultilingualPreview(this, translation, thinking);
            } else {
                updateLegacyPreview(this, translation);
            }

            this.setDirtyCanvas(true, true);
        };
    },
});
