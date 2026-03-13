"""
LLM Inference Service — Llama 3.2-1B
Optimized for RTX 3050 (4 GB VRAM) via 4-bit NF4 quantization.
"""

import torch
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    BitsAndBytesConfig,
)
import os
import logging
import gc

logger = logging.getLogger(__name__)


class LLMInference:
    """Singleton that holds the quantized model in GPU memory."""

    _instance = None

    # ── singleton ────────────────────────────────────────────
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._ready = False
        return cls._instance

    def __init__(self):
        if self._ready:
            return
        self.model_path = os.path.abspath(
            "backend/models/saved/llama-medguardian"
        )
        self.tokenizer = None
        self.model = None
        self._ready = True
        logger.info("LLMInference singleton created (model NOT loaded yet).")

    # ── load ─────────────────────────────────────────────────
    def load_model(self):
        """Load with 4-bit quantization. Call is idempotent."""
        if self.model is not None:
            return

        logger.info("Loading Llama 3.2-1B from %s …", self.model_path)

        self.tokenizer = AutoTokenizer.from_pretrained(
            self.model_path,
            local_files_only=True,
            trust_remote_code=True,
        )
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token

        if torch.cuda.is_available():
            # GPU path: 4-bit NF4 quantization for low-VRAM GPUs
            bnb_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_compute_dtype=torch.float16,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_use_double_quant=True,
            )
            self.model = AutoModelForCausalLM.from_pretrained(
                self.model_path,
                local_files_only=True,
                trust_remote_code=True,
                quantization_config=bnb_config,
                device_map="auto",
            )
        else:
            # CPU fallback: load in float32 without quantization
            logger.warning(
                "CUDA not available — loading Llama 3.2 on CPU (slower). "
                "Install CUDA-enabled PyTorch for GPU acceleration."
            )
            self.model = AutoModelForCausalLM.from_pretrained(
                self.model_path,
                local_files_only=True,
                trust_remote_code=True,
                device_map="cpu",
            )

        mem_mb = self.model.get_memory_footprint() / 1024 ** 2
        logger.info(
            "✅ Llama 3.2 Model Loaded  |  device=%s  |  Memory=%.0f MB",
            self.model.device,
            mem_mb,
        )

    # ── generate ─────────────────────────────────────────────
    def generate(self, prompt: str, max_new_tokens: int = 512) -> str:
        """Run inference and immediately free VRAM cache."""
        if self.model is None:
            self.load_model()

        try:
            inputs = self.tokenizer(
                prompt, return_tensors="pt", truncation=True, max_length=2048
            ).to(self.model.device)

            with torch.no_grad():
                outputs = self.model.generate(
                    **inputs,
                    max_new_tokens=max_new_tokens,
                    temperature=0.7,
                    top_p=0.9,
                    do_sample=True,
                    repetition_penalty=1.15,
                    eos_token_id=self.tokenizer.eos_token_id,
                    pad_token_id=self.tokenizer.eos_token_id,
                )

            # Decode only the NEW tokens (skip the prompt)
            new_tokens = outputs[0][inputs["input_ids"].shape[-1] :]
            response = self.tokenizer.decode(new_tokens, skip_special_tokens=True).strip()
            return response

        except Exception as e:
            logger.error("Generation failed: %s", e, exc_info=True)
            return "I apologize, but I encountered an error generating the response."

        finally:
            # CRITICAL: free VRAM after every call
            self._clear_vram()

    # ── helpers ───────────────────────────────────────────────
    def _clear_vram(self):
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()


# Global singleton — import this from other modules
llm_service = LLMInference()
