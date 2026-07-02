import { app } from "../../scripts/app.js";

const EXTENSION_NAME = "Local.Ollama.Translator.V1_0_2";

function shortPreview(text, maxChars = 110) {
    const clean = String(text || "")
        .replace(/\s+/g, " ")
        .trim();

    if (clean.length <= maxChars) {
        return clean;
    }

    return clean.slice(0, maxChars) + "…";
}

function createPreviewElement() {
    const root = document.createElement("div");
    root.className = "local-ollama-translator-preview";
    root.style.boxSizing = "border-box";
    root.style.width = "100%";
    root.style.height = "150px";
    root.style.padding = "8px";
    root.style.border = "1px solid rgba(120, 190, 145, 0.85)";
    root.style.borderRadius = "8px";
    root.style.background = "rgba(10, 12, 16, 0.96)";
    root.style.color = "rgba(238, 238, 238, 1)";
    root.style.fontFamily = "monospace";
    root.style.fontSize = "12px";
    root.style.overflow = "hidden";

    const title = document.createElement("div");
    title.textContent = "Translation Preview";
    title.style.fontFamily = "sans-serif";
    title.style.fontSize = "12px";
    title.style.fontWeight = "600";
    title.style.color = "rgba(166, 225, 185, 1)";
    title.style.marginBottom = "6px";

    const textarea = document.createElement("textarea");
    textarea.readOnly = true;
    textarea.spellcheck = false;
    textarea.wrap = "soft";
    textarea.value = "";
    textarea.style.boxSizing = "border-box";
    textarea.style.width = "100%";
    textarea.style.height = "112px";
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
    textarea.style.overflowY = "auto";

    root.appendChild(title);
    root.appendChild(textarea);

    return { root, textarea };
}

function updateFallbackWidget(node, translation) {
    let widget = node.widgets?.find((w) => w.name === "translation_preview");

    if (!widget) {
        widget = node.addWidget(
            "text",
            "translation_preview",
            "",
            () => {},
            {}
        );
    }

    widget.value = shortPreview(translation, 110);
}

function updateDomPreview(node, translation) {
    if (typeof node.addDOMWidget !== "function") {
        return false;
    }

    if (!node.localOllamaPreviewDom) {
        const preview = createPreviewElement();

        node.localOllamaPreviewDom = preview;

        const widget = node.addDOMWidget(
            "translation_preview_full",
            "LocalOllamaPreview",
            preview.root,
            {
                serialize: false,
                hideOnZoom: false,
                getValue() {
                    return preview.textarea.value;
                },
                setValue(value) {
                    preview.textarea.value = String(value ?? "");
                },
            }
        );

        widget.computeSize = function(width) {
            return [width, 170];
        };
    }

    node.localOllamaPreviewDom.textarea.value = String(translation || "");
    return true;
}

app.registerExtension({
    name: EXTENSION_NAME,

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== "LocalOllamaTranslate") {
            return;
        }

        const onExecuted = nodeType.prototype.onExecuted;

        nodeType.prototype.onExecuted = function(message) {
            onExecuted?.apply(this, arguments);

            const translation =
                message?.translation?.[0] ??
                message?.text?.[0] ??
                "";

            const source =
                message?.source?.[0] ??
                "";

            const meta =
                message?.meta?.[0] ??
                "";

            this.localOllamaTranslationPreview = translation;
            this.localOllamaTranslationSource = source;
            this.localOllamaTranslationMeta = meta;

            updateFallbackWidget(this, translation);
            updateDomPreview(this, translation);

            this.size[0] = Math.max(this.size[0], 720);
            this.size[1] = Math.max(this.size[1], 620);

            this.setDirtyCanvas(true, true);
        };
    },
});
