import hashlib
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request


NODE_VERSION = "1.0.0"

LOCAL_HOSTS = {
    "127.0.0.1",
    "localhost",
    "::1",
    "0:0:0:0:0:0:0:1",
}


DIRECTION_OPTIONS = [
    "Auto",
    "English → Simplified Chinese",
    "Chinese → American English",
]

STYLE_OPTIONS = [
    "Natural",
    "Image Prompt",
    "Literal",
    "UI Text",
]


def _normalize_ollama_base_url(endpoint: str) -> str:
    endpoint = (endpoint or "http://127.0.0.1:11434").strip().rstrip("/")

    if not endpoint:
        endpoint = "http://127.0.0.1:11434"

    if not endpoint.startswith(("http://", "https://")):
        endpoint = "http://" + endpoint

    for suffix in ("/api/generate", "/api/chat"):
        if endpoint.endswith(suffix):
            endpoint = endpoint[: -len(suffix)]

    return endpoint.rstrip("/")


def _assert_local_or_allowed(base_url: str, allow_remote_endpoint: bool):
    parsed = urllib.parse.urlparse(base_url)
    host = parsed.hostname

    if allow_remote_endpoint:
        return

    if host not in LOCAL_HOSTS:
        raise RuntimeError(
            "Remote Ollama endpoint blocked. "
            "This node is privacy-first by default and only allows localhost / 127.0.0.1. "
            "Set allow_remote_endpoint=True only if you intentionally want to send text to another machine."
        )


def _style_instruction(style: str) -> str:
    if style == "Image Prompt":
        return (
            "Treat the input as an image-generation prompt. Preserve comma-separated prompt structure. "
            "Translate ordinary descriptive words fully. Preserve true proper nouns, character names, "
            "brand names, model names, LoRA trigger words, file paths, URLs, and code-like tokens."
        )

    if style == "Literal":
        return (
            "Translate closely and literally while still being grammatically correct. "
            "Do not embellish or rewrite creatively."
        )

    if style == "UI Text":
        return (
            "Treat the input as interface text, labels, menus, buttons, settings, or short instructions. "
            "Use concise, clear, native UI wording."
        )

    return (
        "Translate naturally and fluently. Preserve tone and meaning. "
        "Prefer native human wording over stiff software translation."
    )


def _direction_instruction(direction: str) -> str:
    if direction == "English → Simplified Chinese":
        return "The input is English. Translate it into natural Simplified Chinese."

    if direction == "Chinese → American English":
        return "The input is Chinese. Translate it into natural American English."

    return (
        "Detect whether the input is English or Chinese. "
        "If it is English, translate it into natural Simplified Chinese. "
        "If it is Chinese, translate it into natural American English."
    )


def _build_system_prompt(direction: str, style: str, preserve_terms: str, extra_instruction: str) -> str:
    preserve_terms = (preserve_terms or "").strip()
    extra_instruction = (extra_instruction or "").strip()

    parts = [
        "You are a private offline bidirectional English-Chinese translation engine.",
        "",
        "Your only job is translation.",
        _direction_instruction(direction),
        _style_instruction(style),
        "",
        "Rules:",
        "- Output only the translation.",
        "- Do not answer questions.",
        "- Do not greet the user.",
        "- Do not explain.",
        "- Do not summarize.",
        "- Do not add notes.",
        "- Do not include reasoning.",
        "- Do not include <think> tags.",
        "- Do not repeat the original text unless the item should remain untranslated.",
        "- Preserve numbers, punctuation, formatting, line breaks, names, and technical tokens.",
        "- Translate generic descriptive English fully, even when ordinary words are capitalized.",
    ]

    if preserve_terms:
        parts.extend([
            "",
            "Preserve these terms exactly when they appear:",
            preserve_terms,
        ])

    if extra_instruction:
        parts.extend([
            "",
            "Additional user instruction:",
            extra_instruction,
        ])

    return "\n".join(parts)


def _build_user_prompt(text: str, direction: str, style: str) -> str:
    return (
        "Translate the following text according to the system rules.\n"
        f"Direction: {direction}\n"
        f"Style: {style}\n\n"
        "TEXT TO TRANSLATE:\n"
        f"{text}"
    )


def _clean_translation(text: str) -> str:
    text = text or ""

    text = re.sub(r"<think>.*?</think>", "", text, flags=re.IGNORECASE | re.DOTALL)
    text = text.strip()

    prefixes = [
        "Translation:",
        "Translated text:",
        "Output:",
        "Result:",
        "翻译：",
        "译文：",
        "结果：",
    ]

    changed = True
    while changed:
        changed = False
        for prefix in prefixes:
            if text.lower().startswith(prefix.lower()):
                text = text[len(prefix):].strip()
                changed = True

    if text.startswith("```") and text.endswith("```"):
        text = text.strip("`").strip()

    if len(text) >= 2:
        if (text[0] == text[-1]) and text[0] in ['"', "'", "“", "”"]:
            text = text[1:-1].strip()

    return text.strip()


def _ollama_chat(
    *,
    base_url: str,
    model: str,
    system_prompt: str,
    user_prompt: str,
    keep_alive: str,
    num_ctx: int,
    temperature: float,
    top_p: float,
    timeout_seconds: int,
):
    chat_url = base_url.rstrip("/") + "/api/chat"

    options = {
        "temperature": float(temperature),
        "top_p": float(top_p),
    }

    if int(num_ctx) > 0:
        options["num_ctx"] = int(num_ctx)

    payload = {
        "model": model,
        "stream": False,
        "keep_alive": keep_alive,
        "messages": [
            {
                "role": "system",
                "content": system_prompt,
            },
            {
                "role": "user",
                "content": user_prompt,
            },
        ],
        "options": options,
    }

    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")

    request = urllib.request.Request(
        chat_url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
            raw = response.read().decode("utf-8", errors="replace")
            result = json.loads(raw)

    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Ollama HTTP error {e.code}: {body}") from e

    except urllib.error.URLError as e:
        raise RuntimeError(
            f"Could not reach Ollama at {chat_url}. "
            f"Make sure Ollama is running and the model '{model}' exists. "
            f"Details: {e}"
        ) from e

    except json.JSONDecodeError as e:
        raise RuntimeError(f"Ollama returned invalid JSON. Details: {e}") from e

    if "error" in result:
        raise RuntimeError(f"Ollama error: {result['error']}")

    message = result.get("message") or {}
    content = message.get("content") or result.get("response") or ""

    return _clean_translation(content)


def _short(text: str, limit: int = 500) -> str:
    text = text or ""
    if len(text) <= limit:
        return text
    return text[:limit] + "... [truncated]"


class LocalOllamaTranslate:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "text": ("STRING", {
                    "multiline": True,
                    "default": "a cinematic mountain landscape, storm clouds, dramatic lighting",
                }),
                "direction": (DIRECTION_OPTIONS, {
                    "default": "English → Simplified Chinese",
                }),
                "style": (STYLE_OPTIONS, {
                    "default": "Image Prompt",
                }),
                "preserve_terms": ("STRING", {
                    "multiline": True,
                    "default": "ComfyUI, LoRA, GGUF, Flux, Krea 2, Z-Image, Qwen, Wan, SDXL",
                }),
                "extra_instruction": ("STRING", {
                    "multiline": True,
                    "default": "",
                }),
                "model": ("STRING", {
                    "default": "qwen2.5:7b",
                }),
                "endpoint": ("STRING", {
                    "default": "http://127.0.0.1:11434",
                }),
                "keep_alive": ("STRING", {
                    "default": "0",
                }),
                "num_ctx": ("INT", {
                    "default": 32768,
                    "min": 0,
                    "max": 262144,
                    "step": 1024,
                }),
                "temperature": ("FLOAT", {
                    "default": 0.0,
                    "min": 0.0,
                    "max": 2.0,
                    "step": 0.05,
                }),
                "top_p": ("FLOAT", {
                    "default": 0.7,
                    "min": 0.0,
                    "max": 1.0,
                    "step": 0.05,
                }),
                "timeout_seconds": ("INT", {
                    "default": 120,
                    "min": 10,
                    "max": 600,
                    "step": 10,
                }),
                "allow_remote_endpoint": ("BOOLEAN", {
                    "default": False,
                }),
                "force_rerun": ("BOOLEAN", {
                    "default": False,
                }),
                "debug_logging": ("BOOLEAN", {
                    "default": False,
                }),
            }
        }

    RETURN_TYPES = ("STRING", "STRING")
    RETURN_NAMES = ("translated_text", "source_text")
    FUNCTION = "translate"
    CATEGORY = "Local/Ollama"
    OUTPUT_NODE = True

    @classmethod
    def IS_CHANGED(
        cls,
        text,
        direction,
        style,
        preserve_terms,
        extra_instruction,
        model,
        endpoint,
        keep_alive,
        num_ctx,
        temperature,
        top_p,
        timeout_seconds,
        allow_remote_endpoint,
        force_rerun,
        debug_logging,
    ):
        if force_rerun:
            return time.time()

        payload = {
            "version": NODE_VERSION,
            "text": text,
            "direction": direction,
            "style": style,
            "preserve_terms": preserve_terms,
            "extra_instruction": extra_instruction,
            "model": model,
            "endpoint": endpoint,
            "keep_alive": keep_alive,
            "num_ctx": num_ctx,
            "temperature": temperature,
            "top_p": top_p,
            "timeout_seconds": timeout_seconds,
            "allow_remote_endpoint": allow_remote_endpoint,
        }

        encoded = json.dumps(payload, sort_keys=True, ensure_ascii=False).encode("utf-8")
        return hashlib.sha256(encoded).hexdigest()

    def translate(
        self,
        text,
        direction,
        style,
        preserve_terms,
        extra_instruction,
        model,
        endpoint,
        keep_alive,
        num_ctx,
        temperature,
        top_p,
        timeout_seconds,
        allow_remote_endpoint,
        force_rerun,
        debug_logging,
    ):
        text = (text or "").strip()
        model = (model or "qwen2.5:7b").strip()
        base_url = _normalize_ollama_base_url(endpoint)
        keep_alive = (keep_alive or "0").strip()

        _assert_local_or_allowed(base_url, allow_remote_endpoint)

        if not text:
            translated = ""
            return {
                "ui": {
                    "translation": [translated],
                    "source": [text],
                    "meta": [f"Local Ollama Translator v{NODE_VERSION}"],
                },
                "result": (translated, text),
            }

        system_prompt = _build_system_prompt(direction, style, preserve_terms, extra_instruction)
        user_prompt = _build_user_prompt(text, direction, style)

        if debug_logging:
            print("[Local Ollama Translator] Node executed.")
            print(f"[Local Ollama Translator] Version: {NODE_VERSION}")
            print(f"[Local Ollama Translator] Model: {model}")
            print(f"[Local Ollama Translator] Endpoint: {base_url}")
            print(f"[Local Ollama Translator] Direction: {direction}")
            print(f"[Local Ollama Translator] Style: {style}")
            print(f"[Local Ollama Translator] Input: {_short(text)}")

        translated = _ollama_chat(
            base_url=base_url,
            model=model,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            keep_alive=keep_alive,
            num_ctx=int(num_ctx),
            temperature=float(temperature),
            top_p=float(top_p),
            timeout_seconds=int(timeout_seconds),
        )

        if debug_logging:
            print(f"[Local Ollama Translator] Output: {_short(translated)}")

        meta = (
            f"Local Ollama Translator v{NODE_VERSION} | "
            f"model={model} | direction={direction} | style={style}"
        )

        return {
            "ui": {
                "translation": [translated],
                "source": [text],
                "meta": [meta],
            },
            "result": (translated, text),
        }


NODE_CLASS_MAPPINGS = {
    "LocalOllamaTranslate": LocalOllamaTranslate,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "LocalOllamaTranslate": "Local Ollama Translator",
}

WEB_DIRECTORY = "./web"
