# ComfyUI Local Ollama Translator

A local-first ComfyUI custom node for English ↔ Simplified Chinese translation using a locally running Ollama model.

It is designed for prompt translation inside ComfyUI workflows. The node sends text to Ollama on your own machine, receives the translation, shows a GUI preview, and outputs the translated text as a `STRING` that can be wired into `CLIP Text Encode` or other text-input nodes.

## Features

- English → Simplified Chinese
- Chinese → American English
- Auto direction mode
- Image Prompt mode for prompt-style text
- Natural, Literal, and UI Text modes
- Preserve-terms field for model names, LoRA triggers, brands, file paths, or technical tokens
- GUI translation preview
- `translated_text` and `source_text` outputs
- Privacy-first default endpoint: `http://127.0.0.1:11434`
- Remote Ollama endpoints blocked by default
- No extra Python dependencies

## Privacy

By default, this node only talks to Ollama running on the same machine:

```text
http://127.0.0.1:11434
```

It does not call Google Translate, DeepL, ChatGPT, or any external translation API.

The `allow_remote_endpoint` option is off by default. Leave it off unless you intentionally want to send text to another machine running Ollama.

## Requirements

- ComfyUI
- Ollama installed and running
- A multilingual Ollama model

Recommended model:

```cmd
ollama pull qwen2.5:7b
```

Other multilingual models can work too. Set the node's `model` field to match your installed Ollama model name.

## Installation

Clone this repository into your ComfyUI custom nodes folder:

```cmd
cd /d path\to\ComfyUI\custom_nodes
git clone https://github.com/InfernusIntraMe/ComfyUI-Local-Ollama-Translator.git
```

Example:

```cmd
cd /d D:\AI\ComfyUI\custom_nodes
git clone https://github.com/InfernusIntraMe/ComfyUI-Local-Ollama-Translator.git
```

Restart ComfyUI.

The node appears under:

```text
Local/Ollama/Local Ollama Translator
```

## Basic usage

For translation only, place the node on the canvas, enter text, and queue the workflow. The translation appears in the node preview and the `translated_text` output.

For image generation, wire it like this:

```text
Local Ollama Translator: translated_text
        ↓
CLIP Text Encode: text
```

Your actual image workflow still needs its own proper text encoder:

```text
Your workflow's Load CLIP / text encoder
        ↓
CLIP Text Encode: clip
```

This node translates prompt text. It does not replace the model's text encoder.

## Recommended image-prompt settings

```text
direction: English → Simplified Chinese
style: Image Prompt
model: qwen2.5:7b
endpoint: http://127.0.0.1:11434
keep_alive: 0
allow_remote_endpoint: false
debug_logging: false
```

## `num_ctx`

`num_ctx` is the Ollama context length, not a seed. It controls how much text the model can see in one run.

For short prompt translation, `8192` is usually enough. The default `32768` gives more room for long prompts, captions, lyrics, or larger text blocks.

## Notes for workflow sharing

ComfyUI workflows can store prompt text, translations, filenames, and widget values inside the JSON. Clear private prompts and generated preview text before uploading workflows publicly.

## License

MIT
