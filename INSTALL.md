# Installation and first run

## 1. Install Ollama and a multilingual model

```cmd
ollama pull qwen3:8b
ollama list
```

## 2. Install the custom node

Clone the repository into `ComfyUI\custom_nodes`, install through ComfyUI Manager, or extract the manual ZIP so this file exists:

```text
ComfyUI\custom_nodes\ComfyUI_Local_Ollama_Translate\__init__.py
```

## 3. Restart ComfyUI

Restart the ComfyUI console completely, then hard-refresh the browser with `Ctrl+F5`.

## 4. Find the nodes

```text
Local/Ollama/Local Ollama Translator
Local/Ollama/Local Ollama Translator Multilingual
Local/Ollama/Local Ollama Translation Prompt Forge
Local/Ollama/Local Ollama Model Selector
```

## 5. First multilingual test

Use the included clean example workflow or add the three new nodes manually.

Recommended first settings:

```text
source_language: Auto Detect
target_language: Japanese
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

Test prompt:

```text
a masked warrior beneath a violet moon, black armor, rain, cinematic lighting
```
