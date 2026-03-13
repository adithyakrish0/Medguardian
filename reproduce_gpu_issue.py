
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
import os
import logging
import bitsandbytes as bnb

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_gpu_load():
    model_path = os.path.abspath("backend/models/saved/llama-medguardian")
    logger.info(f"Testing load from {model_path}")
    logger.info(f"Torch version: {torch.__version__}")
    logger.info(f"CUDA available: {torch.cuda.is_available()}")
    logger.info(f"BitsAndBytes version: {bnb.__version__}")
    
    if not torch.cuda.is_available():
        logger.error("CUDA not available! Aborting GPU test.")
        return

    try:
        # 4-bit quantization config
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_compute_dtype=torch.float16,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_use_double_quant=True,
        )

        logger.info("Loading tokenizer...")
        tokenizer = AutoTokenizer.from_pretrained(model_path, local_files_only=True)
        
        logger.info("Loading model with quantization...")
        model = AutoModelForCausalLM.from_pretrained(
            model_path,
            local_files_only=True,
            quantization_config=bnb_config,
            device_map="auto"
        )
        
        logger.info(f"Success! Model device: {model.device}")
        logger.info(f"Memory footprint: {model.get_memory_footprint() / 1024**2:.2f} MB")
        
    except Exception as e:
        logger.error(f"CRITICAL FAILURE: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_gpu_load()
