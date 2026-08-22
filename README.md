# ComfyUI Local Ollama Translator

Local prompt translation inside ComfyUI, powered by an Ollama model running on your own machine.

Version **1.1.4** expands the original English/Simplified-Chinese translator into a four-node multilingual toolset while preserving the original V1 node for existing workflows.

## Nodes

### Local Ollama Translator

The original V1 node, preserved for backward compatibility.

- English to Simplified Chinese
- Simplified Chinese to American English
- Auto English/Chinese direction
- Natural, Image Prompt, Literal, and UI Text styles

### Local Ollama Translator Multilingual

The new main translator.

- Auto-detect source language
- 30 target languages
- Separate source and target selectors
- Natural, Image Prompt, Literal, and UI Text styles
- Preserve-terms field for model names, LoRA triggers, file paths, URLs, brands, and technical tokens
- Optional Ollama thinking trace
- Automatic one-time refusal retry
- Automatic final-only pass if a thinking model spends its entire output budget reasoning
- `translated_text`, `source_text`, and `thinking_text` outputs
- Resizable Translation Preview and Thinking Preview panels

### Local Ollama Translation Prompt Forge

Optional system-prompt control for the multilingual translator.

Profiles:

- Hardened Translator
- Image Prompt Translator
- Lyrics / Poetic
- Literal Archivist
- Natural Native Voice
- Custom

The Forge can preserve structure and intensity, add refusal resistance, and append custom translation rules.

### Local Ollama Model Selector

Reads locally installed Ollama models from `http://127.0.0.1:11434/api/tags` and outputs the selected model name.

Restart ComfyUI after pulling a new Ollama model so the dropdown refreshes.

## Privacy

The default endpoint is:

```text
http://127.0.0.1:11434
```

Remote endpoints are blocked unless `allow_remote_endpoint` is deliberately enabled. The node does not call Google Translate, DeepL, ChatGPT, or another cloud translation API.

Translation and thinking preview text are session-only. Version 1.1.4 excludes them from both workflow JSON and prompt/API serialization. Preview heights may be saved as harmless numeric layout properties.

Remember that ordinary ComfyUI workflow JSON can still contain the source prompt and normal widget settings. Clear private source text before sharing a workflow.

## Requirements

- ComfyUI
- Ollama installed and running
- A multilingual Ollama model installed locally

No additional Python packages are required.

A practical public starting model is:

```cmd
ollama pull qwen3:8b
```

Check your installed names with:

```cmd
ollama list
```

The translator does not download models automatically. You may use any compatible multilingual Ollama model by entering its installed name or wiring the Model Selector into `model_override`.

## Installation

### ComfyUI Manager / Registry

Search for **Local Ollama Translator** in ComfyUI Manager and install it, then restart ComfyUI.

### Git

From your ComfyUI `custom_nodes` folder:

```cmd
git clone https://github.com/InfernusIntraMe/ComfyUI-Local-Ollama-Translator.git
```

Restart ComfyUI and hard-refresh the browser with `Ctrl+F5`.

### Manual ZIP

Extract the included `ComfyUI_Local_Ollama_Translate` folder into:

```text
ComfyUI\custom_nodes\
```

The final path should contain:

```text
ComfyUI\custom_nodes\ComfyUI_Local_Ollama_Translate\__init__.py
ComfyUI\custom_nodes\ComfyUI_Local_Ollama_Translate\web\local_ollama_translate.js
```

Restart ComfyUI and press `Ctrl+F5`.

## Quick start

The nodes appear under:

```text
Local/Ollama
```

Recommended wiring:

```text
Local Ollama Model Selector: model
        ↓
Local Ollama Translator Multilingual: model_override
```

```text
Local Ollama Translation Prompt Forge: system_prompt
        ↓
Local Ollama Translator Multilingual: system_prompt
```

```text
Local Ollama Translator Multilingual: translated_text
        ↓
CLIP Text Encode: text
```

The translator only provides text. Your image or video workflow still needs its proper model-specific text encoder connected to the `clip` input of `CLIP Text Encode`.

## Recommended fast defaults

```text
source_language: Auto Detect
target_language: your target language
style: Image Prompt
system_prompt_mode: Built-In + External Rules
thinking_enabled: false
retry_on_refusal: true
endpoint: http://127.0.0.1:11434
keep_alive: 0
num_ctx: 8192
temperature: 0.0
top_p: 0.7
timeout_seconds: 180
allow_remote_endpoint: false
max_output_tokens: 4096
```

`timeout_seconds` is a streamed response-inactivity window, not a hard total-generation timer.

Turn thinking on only when you want to inspect the model's reasoning. Fast mode is the default because translation normally does not need visible reasoning.

## System prompt modes

### Hardened Built-In

Uses the package's translator system prompt.

### Built-In + External Rules

Uses the hardened translator and appends the Prompt Forge or another external `STRING` input. This is the best general-purpose mode.

### External Prompt + Runtime Language Directive

Uses the external prompt as the main instruction while retaining the requested language direction at runtime.

## Supported languages

- English (American)
- Chinese (Simplified)
- Chinese (Traditional)
- Japanese
- Korean
- Spanish
- French
- German
- Italian
- Portuguese (Brazil)
- Russian
- Ukrainian
- Polish
- Dutch
- Turkish
- Arabic (Modern Standard)
- Persian
- Hindi
- Bengali
- Vietnamese
- Thai
- Indonesian
- Malay
- Swedish
- Danish
- Norwegian (Bokmål)
- Czech
- Greek
- Hebrew
- Romanian

## Preview controls

- Drag the bar beneath either preview to resize that panel from 110 to 900 pixels.
- Double-click a preview drag bar to reset its height.
- In fast mode, a blank Thinking Preview is not created.
- The Thinking Preview appears after a thinking-enabled run returns a trace.

## Troubleshooting

### The model is missing from Model Selector

Run `ollama list`, confirm Ollama is running, then restart ComfyUI.

### Connection refused

Start Ollama and verify the endpoint remains `http://127.0.0.1:11434`.

### A thinking run is slow

Set `thinking_enabled` to false. The node's default is already fast mode.

### The model reasons but never produces a final translation

Version 1.1.4 automatically performs a second final-only pass with thinking disabled. If that pass also reaches the output ceiling, increase `max_output_tokens` or use a more instruction-efficient model.

### Old workflow contains preview text

That workflow was saved before the v1.1.3 privacy fix. Install v1.1.4, reload it, clear any private source text, and save a fresh copy.

## Upgrade notes

- Existing V1 workflows continue using `Local Ollama Translator` unchanged.
- Existing multilingual workflows keep their saved `thinking_enabled` value.
- Newly added multilingual nodes default to thinking off.
- Version 1.1.4 retains the v1.1.2 streamed backend and automatic finalization behavior.

## License

MIT
