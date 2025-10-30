"""
Python AI Service - PhoBERT Intent Classification & NER
FastAPI server for Vietnamese Agricultural Chatbot
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uvicorn
from loguru import logger
import sys
import time

from models.intent_classifier import IntentClassifier
from models.ner_extractor import NERExtractor

# Configure logging
logger.remove()
logger.add(sys.stdout, level="INFO")

# Initialize FastAPI app
app = FastAPI(
    title="AgriBot Python AI Service",
    description="PhoBERT-based Intent Classification and NER for Vietnamese Agricultural Chatbot",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model instances
intent_classifier: Optional[IntentClassifier] = None
ner_extractor: Optional[NERExtractor] = None


# ============================================
# Request/Response Models
# ============================================

class IntentRequest(BaseModel):
    text: str
    top_k: int = 3

class Entity(BaseModel):
    type: str
    value: str
    raw: str
    confidence: float
    start: int
    end: int

class IntentResponse(BaseModel):
    intent: str
    confidence: float
    all_intents: List[Dict[str, Any]]
    processing_time_ms: float

class NERRequest(BaseModel):
    text: str

class NERResponse(BaseModel):
    entities: List[Entity]
    processing_time_ms: float

class CombinedRequest(BaseModel):
    text: str
    top_k: int = 3

class CombinedResponse(BaseModel):
    intent: str
    intent_confidence: float
    all_intents: List[Dict[str, Any]]
    entities: List[Entity]
    processing_time_ms: float


# ============================================
# Startup/Shutdown Events
# ============================================

@app.on_event("startup")
async def startup_event():
    """Load models on startup"""
    global intent_classifier, ner_extractor
    
    logger.info("🚀 Starting Python AI Service...")
    
    try:
        logger.info("📦 Loading Intent Classifier (PhoBERT)...")
        intent_classifier = IntentClassifier()
        await intent_classifier.load_model()
        logger.info("✅ Intent Classifier loaded successfully")
        
        logger.info("📦 Loading NER Extractor (PhoBERT)...")
        ner_extractor = NERExtractor()
        await ner_extractor.load_model()
        logger.info("✅ NER Extractor loaded successfully")
        
        logger.info("🎉 Python AI Service ready!")
        
    except Exception as e:
        logger.error(f"❌ Failed to load models: {str(e)}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("👋 Shutting down Python AI Service...")


# ============================================
# Health Check
# ============================================

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "AgriBot Python AI Service",
        "status": "running",
        "version": "1.0.0",
        "models": {
            "intent_classifier": "vinai/phobert-base",
            "ner_extractor": "vinai/phobert-base"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "intent_classifier": intent_classifier is not None,
        "ner_extractor": ner_extractor is not None
    }


# ============================================
# Intent Classification Endpoints
# ============================================

@app.post("/intent/classify", response_model=IntentResponse)
async def classify_intent(request: IntentRequest):
    """
    Classify user intent using PhoBERT
    
    Args:
        request: IntentRequest with text and optional top_k
        
    Returns:
        IntentResponse with predicted intent and confidence
    """
    if intent_classifier is None:
        raise HTTPException(status_code=503, detail="Intent classifier not loaded")
    
    try:
        logger.info(f"Classifying intent for: {request.text[:50]}...")
        result = await intent_classifier.classify(request.text, top_k=request.top_k)
        logger.info(f"Intent: {result['intent']} (confidence: {result['confidence']:.2f})")
        return result
        
    except Exception as e:
        logger.error(f"Intent classification error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# NER Endpoints
# ============================================

@app.post("/ner/extract", response_model=NERResponse)
async def extract_entities(request: NERRequest):
    """
    Extract named entities using PhoBERT
    
    Args:
        request: NERRequest with text
        
    Returns:
        NERResponse with extracted entities
    """
    if ner_extractor is None:
        raise HTTPException(status_code=503, detail="NER extractor not loaded")
    
    try:
        logger.info(f"Extracting entities from: {request.text[:50]}...")
        result = await ner_extractor.extract(request.text)
        logger.info(f"Found {len(result['entities'])} entities")
        return result
        
    except Exception as e:
        logger.error(f"NER extraction error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# Combined Endpoint (Intent + NER)
# ============================================

@app.post("/analyze", response_model=CombinedResponse)
async def analyze_text(request: CombinedRequest):
    """
    Perform both intent classification and NER in one call
    
    Args:
        request: CombinedRequest with text
        
    Returns:
        CombinedResponse with intent and entities
    """
    if intent_classifier is None or ner_extractor is None:
        raise HTTPException(status_code=503, detail="Models not loaded")
    
    try:
        start_time = time.time()
        
        logger.info(f"Analyzing text: {request.text[:50]}...")
        
        # Run both models
        intent_result = await intent_classifier.classify(request.text, top_k=request.top_k)
        ner_result = await ner_extractor.extract(request.text)
        
        processing_time = (time.time() - start_time) * 1000
        
        return {
            "intent": intent_result["intent"],
            "intent_confidence": intent_result["confidence"],
            "all_intents": intent_result["all_intents"],
            "entities": ner_result["entities"],
            "processing_time_ms": processing_time
        }
        
    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# Run Server
# ============================================

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

