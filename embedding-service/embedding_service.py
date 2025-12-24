from sentence_transformers import SentenceTransformer
# sử dụng sentence_transformers để tải pre-trained model dangvantuan/vietnamese-document-embedding
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel 
from typing import List
import logging
import time

# Setup logging (console only)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Vietnamese Embedding Service")

# Load model at startup
logger.info("Loading model: dangvantuan/vietnamese-document-embedding")
model = SentenceTransformer(
    'dangvantuan/vietnamese-document-embedding',
    trust_remote_code=True
)
logger.info("Model loaded successfully")

class EmbedRequest(BaseModel):
    texts: List[str]
    normalize: bool = True
# normalize: chuẩn hoá vector về độ dài đơn vị hay ko - quan trọng cho việc tính cosine similarity
class EmbedResponse(BaseModel):
    embeddings: List[List[float]]
    dimensions: int
    count: int #số lượng embeddings đã tạo

@app.post("/embed", response_model=EmbedResponse)
async def embed_texts(request: EmbedRequest):
    """Generate embeddings for texts"""
    start_time = time.time()
    
    logger.info(f" /embed - Processing {len(request.texts)} text(s)")
    
    try:
        if not request.texts:
            raise HTTPException(status_code=400, detail="texts cannot be empty")
        
        # Truncate to max length (256 tokens ≈ 1000 chars)
        truncated_texts = [text[:1000] for text in request.texts]
        truncated_count = sum(1 for i, text in enumerate(request.texts) if len(text) > 1000)
        if truncated_count > 0:
            logger.warning(f" Truncated {truncated_count} texts to 1000 characters")
        
        # Generate embeddings
        embeddings = model.encode(
            truncated_texts, #input text đã đc chunk
            normalize_embeddings=request.normalize,
            show_progress_bar=False,
            convert_to_numpy=True #chuyển kqua về numpy array
        )
        # output: NumPy array of shape (len(texts), 768)
        processing_time = time.time() - start_time
        logger.info(f" /embed - Completed in {processing_time:.3f}s | {len(embeddings)} embeddings x {embeddings.shape[1]} dims")
        
        return EmbedResponse(
            embeddings=embeddings.tolist(),# chuyển numpy về list
            dimensions=embeddings.shape[1],#768     
            count=len(embeddings) # số lượng
        )
    
    except Exception as e:
        processing_time = time.time() - start_time
        logger.error(f" /embed - Error after {processing_time:.3f}s: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/embed-batch", response_model=EmbedResponse)
async def embed_batch(request: EmbedRequest):
    """Embed batch with progress tracking - typically used for knowledge file uploads"""
    start_time = time.time()
    
    total_chars = sum(len(text) for text in request.texts)
    logger.info(f" /embed-batch - Processing {len(request.texts)} chunks ({total_chars:,} chars)")
    
    try:
        if not request.texts:
            raise HTTPException(status_code=400, detail="texts cannot be empty")
        
        truncated_texts = [text[:1000] for text in request.texts]
        truncated_count = sum(1 for i, text in enumerate(request.texts) if len(text) > 1000)
        if truncated_count > 0:
            logger.warning(f"Truncated {truncated_count} chunks to 1000 characters")
        
        embeddings = model.encode(
            truncated_texts,
            batch_size=32, #xử lý 32 chunks cùng lúc
            normalize_embeddings=request.normalize,
            show_progress_bar=True, #hiển thị trong console
            convert_to_numpy=True
        )
        
        processing_time = time.time() - start_time
        chunks_per_sec = len(embeddings) / processing_time
        logger.info(f" /embed-batch - Completed in {processing_time:.3f}s | {len(embeddings)} chunks ({chunks_per_sec:.1f} chunks/s)")
        
        return EmbedResponse(
            embeddings=embeddings.tolist(),
            dimensions=embeddings.shape[1],
            count=len(embeddings)
        )
    
    except Exception as e:
        processing_time = time.time() - start_time
        logger.error(f" /embed-batch - Error after {processing_time:.3f}s: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "model": "dangvantuan/vietnamese-document-embedding",
        "dimensions": 768,
        "max_sequence_length": 256
    }

if __name__ == "__main__":
    import uvicorn
    logger.info(" Starting Vietnamese Embedding Service on port 8001")
    uvicorn.run(app, host="0.0.0.0", port=8001)
