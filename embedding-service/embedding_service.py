from sentence_transformers import SentenceTransformer
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import logging
import time
import json
from datetime import datetime

# Setup detailed logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('embedding_service.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)

def log_request_details(endpoint: str, request_data: dict, processing_time: float = None, result_summary: dict = None):
    """Log detailed request information"""
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "endpoint": endpoint,
        "request_summary": {
            "text_count": len(request_data.get('texts', [])),
            "normalize": request_data.get('normalize', True),
            "total_chars": sum(len(text) for text in request_data.get('texts', [])),
            "avg_text_length": sum(len(text) for text in request_data.get('texts', [])) / len(request_data.get('texts', [])) if request_data.get('texts') else 0
        }
    }
    
    if processing_time:
        log_entry["processing_time_seconds"] = round(processing_time, 3)
    
    if result_summary:
        log_entry["result_summary"] = result_summary
    
    # Log first few characters of each text for debugging (without exposing full content)
    if request_data.get('texts'):
        log_entry["text_previews"] = [text[:100] + "..." if len(text) > 100 else text for text in request_data.get('texts', [])[:3]]
    
    logger.info(f"📊 REQUEST DETAILS: {json.dumps(log_entry, ensure_ascii=False, indent=2)}")

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

class EmbedResponse(BaseModel):
    embeddings: List[List[float]]
    dimensions: int
    count: int

@app.post("/embed", response_model=EmbedResponse)
async def embed_texts(request: EmbedRequest):
    """Generate embeddings for texts"""
    start_time = time.time()
    
    # Log incoming user prompt/request
    logger.info(f"🔵 USER PROMPT RECEIVED - /embed endpoint")
    logger.info(f"📝 Input texts count: {len(request.texts)}")
    logger.info(f"🔧 Normalize embeddings: {request.normalize}")
    
    # Log preview of user texts (first 200 chars of each)
    for i, text in enumerate(request.texts[:3]):  # Only log first 3 texts
        preview = text[:200] + "..." if len(text) > 200 else text
        logger.info(f"📄 Text {i+1} preview: {preview}")
    
    try:
        if not request.texts:
            logger.error("❌ Empty texts provided")
            raise HTTPException(status_code=400, detail="texts cannot be empty")
        
        # Truncate to max length (256 tokens ≈ 1000 chars)
        truncated_texts = [text[:1000] for text in request.texts]
        truncated_count = sum(1 for i, text in enumerate(request.texts) if len(text) > 1000)
        if truncated_count > 0:
            logger.warning(f"⚠️ Truncated {truncated_count} texts to 1000 characters")
        
        logger.info(f"🔄 Processing embeddings for {len(truncated_texts)} texts...")
        
        # Generate embeddings
        embeddings = model.encode(
            truncated_texts,
            normalize_embeddings=request.normalize,
            show_progress_bar=False,
            convert_to_numpy=True
        )
        
        processing_time = time.time() - start_time
        
        # Log processing results
        result_summary = {
            "embeddings_count": len(embeddings),
            "dimensions": embeddings.shape[1],
            "processing_time_seconds": round(processing_time, 3),
            "avg_embedding_norm": float(embeddings.mean()) if embeddings.size > 0 else 0
        }
        
        logger.info(f"✅ PROCESSING COMPLETED - /embed")
        logger.info(f"📊 Generated {len(embeddings)} embeddings with {embeddings.shape[1]} dimensions")
        logger.info(f"⏱️ Processing time: {processing_time:.3f} seconds")
        logger.info(f"📈 Average processing time per text: {(processing_time/len(request.texts)):.3f} seconds")
        
        # Log detailed request summary
        log_request_details("/embed", request.dict(), processing_time, result_summary)
        
        return EmbedResponse(
            embeddings=embeddings.tolist(),
            dimensions=embeddings.shape[1],
            count=len(embeddings)
        )
    
    except Exception as e:
        processing_time = time.time() - start_time
        logger.error(f"❌ EMBEDDING ERROR after {processing_time:.3f}s: {str(e)}")
        logger.error(f"🔍 Error details - Text count: {len(request.texts)}, Normalize: {request.normalize}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/embed-batch", response_model=EmbedResponse)
async def embed_batch(request: EmbedRequest):
    """Embed batch with progress tracking - typically used for knowledge file uploads"""
    start_time = time.time()
    
    # Log knowledge file upload processing
    logger.info(f"🔵 KNOWLEDGE FILE UPLOAD PROCESSING - /embed-batch endpoint")
    logger.info(f"📚 Batch size: {len(request.texts)} text chunks")
    logger.info(f"🔧 Normalize embeddings: {request.normalize}")
    
    # Calculate total content size
    total_chars = sum(len(text) for text in request.texts)
    avg_length = total_chars / len(request.texts) if request.texts else 0
    logger.info(f"📊 Total content: {total_chars:,} characters, Average chunk size: {avg_length:.0f} chars")
    
    # Log sample of knowledge content being processed
    logger.info(f"📄 Sample knowledge chunks:")
    for i, text in enumerate(request.texts[:3]):  # Show first 3 chunks
        preview = text[:150] + "..." if len(text) > 150 else text
        logger.info(f"   Chunk {i+1}: {preview}")
    
    try:
        if not request.texts:
            logger.error("❌ Empty knowledge file - no texts provided")
            raise HTTPException(status_code=400, detail="texts cannot be empty")
        
        logger.info(f"🔄 Processing knowledge embeddings for {len(request.texts)} chunks...")
        
        truncated_texts = [text[:1000] for text in request.texts]
        truncated_count = sum(1 for i, text in enumerate(request.texts) if len(text) > 1000)
        if truncated_count > 0:
            logger.warning(f"⚠️ Truncated {truncated_count} knowledge chunks to 1000 characters")
        
        embeddings = model.encode(
            truncated_texts,
            batch_size=32,
            normalize_embeddings=request.normalize,
            show_progress_bar=True,
            convert_to_numpy=True
        )
        
        processing_time = time.time() - start_time
        
        # Log knowledge processing results
        result_summary = {
            "knowledge_chunks_processed": len(embeddings),
            "dimensions": embeddings.shape[1],
            "processing_time_seconds": round(processing_time, 3),
            "chunks_per_second": round(len(embeddings) / processing_time, 2),
            "total_content_chars": total_chars,
            "avg_chunk_size": round(avg_length, 0)
        }
        
        logger.info(f"✅ KNOWLEDGE FILE PROCESSING COMPLETED")
        logger.info(f"📚 Processed {len(embeddings)} knowledge chunks with {embeddings.shape[1]} dimensions")
        logger.info(f"⏱️ Total processing time: {processing_time:.3f} seconds")
        logger.info(f"🚀 Processing speed: {len(embeddings)/processing_time:.2f} chunks/second")
        logger.info(f"💾 Knowledge base updated with {total_chars:,} characters of content")
        
        # Log detailed batch processing summary
        log_request_details("/embed-batch", request.dict(), processing_time, result_summary)
        
        return EmbedResponse(
            embeddings=embeddings.tolist(),
            dimensions=embeddings.shape[1],
            count=len(embeddings)
        )
    
    except Exception as e:
        processing_time = time.time() - start_time
        logger.error(f"❌ KNOWLEDGE FILE PROCESSING ERROR after {processing_time:.3f}s: {str(e)}")
        logger.error(f"🔍 Error details - Chunks: {len(request.texts)}, Total chars: {sum(len(text) for text in request.texts):,}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    logger.info(f"🔍 Health check requested")
    return {
        "status": "healthy",
        "model": "dangvantuan/vietnamese-document-embedding",
        "dimensions": 768,
        "max_sequence_length": 256
    }

if __name__ == "__main__":
    import uvicorn
    logger.info(f"🚀 Starting Vietnamese Embedding Service on port 8001")
    logger.info(f"📝 Logging to: embedding_service.log")
    logger.info(f"🤖 Model: dangvantuan/vietnamese-document-embedding")
    uvicorn.run(app, host="0.0.0.0", port=8001)
