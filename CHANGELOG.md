# Changelog

## 1.1.4 - Multilingual Expansion

### Fast default and resizable previews

- New multilingual nodes now default to `thinking_enabled: false`.
- Existing workflows retain their saved thinking setting.
- Added independent drag-resizing for Thinking Preview and Translation Preview from 110 to 900 pixels.
- Added double-click reset for preview height.
- Preview text remains session-only and excluded from workflow JSON and prompt/API serialization.
- Blank Thinking Preview is no longer created in fast mode.
- Retains the streamed response and automatic finalization backend.
- Preserves the original V1 node for backward compatibility.

## 1.1.3 - Preview Privacy Lock

- Disabled workflow serialization and prompt/API serialization for both preview widgets.
- Reasserted privacy flags whenever a preview updates.
- Existing workflows saved before this version must be re-saved to remove old serialized preview traces.

## 1.1.2 - Automatic Finalization

- If a thinking-capable model spends the full output-token budget inside its thinking trace, the node automatically performs one second pass with `think: false` to obtain the final translation.
- Replaces a potentially truncated final answer when Ollama reports `done_reason: length`.
- Preserves the complete thinking trace from the first pass.

## 1.1.1 - Streamed Thinking

- Replaced the multilingual node's non-streaming Ollama request with NDJSON streaming.
- `timeout_seconds` now acts as a response-inactivity window.
- Added `thinking_effort` and `max_output_tokens` controls.
- Added clearer inactivity, truncation, malformed-stream, and missing-final-answer errors.
- Added one compatibility fallback when a model rejects a thinking effort string.

## 1.1.0 - Multilingual Core

- Added `Local Ollama Translator Multilingual` with Auto Detect and 30 target languages.
- Added `Local Ollama Translation Prompt Forge`.
- Added `Local Ollama Model Selector`.
- Added optional thinking output and GUI preview.
- Added external system-prompt modes, one-time refusal retry, and localhost-only privacy guard.
- Kept the original V1 translator unchanged for existing workflows.

## 1.0.0

- Initial English/Simplified-Chinese local Ollama translator release.
