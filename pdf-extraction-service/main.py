"""
PDF Extraction Microservice
Supports both text-based PDF (pdfplumber) and scanned PDF (PaddleOCR)
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pdfplumber
import tempfile
import os
from typing import Optional, List
import logging

# PaddleOCR is optional - only needed for scanned PDF support
try:
    from paddleocr import PaddleOCR
    PADDLEOCR_AVAILABLE = True
except ImportError:
    PADDLEOCR_AVAILABLE = False
    logging.warning("PaddleOCR not installed. Scanned PDF support disabled.")

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="PDF Extraction Service", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize PaddleOCR (lazy load)
ocr_instance = None

def get_ocr():
    global ocr_instance
    if not PADDLEOCR_AVAILABLE:
        raise HTTPException(
            status_code=501,
            detail="PaddleOCR not installed. Cannot process scanned PDFs. Please install: pip install paddleocr paddlepaddle pdf2image"
        )
    if ocr_instance is None:
        logger.info("Initializing PaddleOCR...")
        ocr_instance = PaddleOCR(
            use_angle_cls=True,
            lang='vi',  # Vietnamese
            use_gpu=False,  # Set to True if GPU available
            show_log=False
        )
        logger.info("PaddleOCR initialized")
    return ocr_instance


class ExtractionResult(BaseModel):
    text: str
    method: str  # "pdfplumber" or "paddleocr"
    page_count: int
    processing_time: float
    metadata: dict


def detect_pdf_type(pdf_path: str) -> str:
    """
    Detect if PDF is text-based or scanned
    Returns: "text" or "scanned"
    """
    try:
        with pdfplumber.open(pdf_path) as pdf:
            if len(pdf.pages) == 0:
                return "scanned"
            
            # Check first 3 pages
            text_chars = 0
            for i, page in enumerate(pdf.pages[:3]):
                text = page.extract_text()
                if text:
                    text_chars += len(text.strip())
            
            # If we have significant text, it's text-based PDF
            if text_chars > 100:
                return "text"
            else:
                return "scanned"
    except Exception as e:
        logger.error(f"Error detecting PDF type: {e}")
        return "scanned"  # Default to scanned if detection fails


def extract_text_with_pdfplumber(pdf_path: str) -> tuple[str, dict]:
    """
    Extract text from text-based PDF using pdfplumber
    Automatically skips images
    """
    import time
    start_time = time.time()
    
    extracted_text = []
    metadata = {
        "pages": [],
        "total_chars": 0,
        "images_skipped": 0
    }
    
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            # Extract text only (images are automatically ignored)
            text = page.extract_text()
            
            if text:
                extracted_text.append(text)
                metadata["pages"].append({
                    "page_num": i + 1,
                    "char_count": len(text)
                })
            
            # Count images (for metadata)
            images = page.images
            if images:
                metadata["images_skipped"] += len(images)
    
    full_text = "\n\n".join(extracted_text)
    metadata["total_chars"] = len(full_text)
    metadata["processing_time"] = time.time() - start_time
    
    return full_text, metadata


def extract_text_with_paddleocr(pdf_path: str) -> tuple[str, dict]:
    """
    Extract text from scanned PDF using PaddleOCR
    PDF -> Images -> OCR -> Text
    """
    import time
    
    try:
        from pdf2image import convert_from_path
    except ImportError:
        raise HTTPException(
            status_code=501,
            detail="pdf2image not installed. Cannot process scanned PDFs. Please install: pip install pdf2image and poppler-utils"
        )
    
    start_time = time.time()
    ocr = get_ocr()
    
    extracted_text = []
    metadata = {
        "pages": [],
        "total_chars": 0,
        "confidence_scores": []
    }
    
    # Convert PDF to images
    logger.info(f"Converting PDF to images: {pdf_path}")
    images = convert_from_path(pdf_path, dpi=300)
    
    logger.info(f"Processing {len(images)} pages with OCR...")
    
    for i, image in enumerate(images):
        # Save image temporarily
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
            image.save(tmp.name, 'JPEG')
            tmp_path = tmp.name
        
        try:
            # Run OCR
            result = ocr.ocr(tmp_path, cls=True)
            
            # Extract text from OCR result
            page_text = []
            page_confidences = []
            
            if result and result[0]:
                for line in result[0]:
                    text = line[1][0]  # Text content
                    confidence = line[1][1]  # Confidence score
                    page_text.append(text)
                    page_confidences.append(confidence)
            
            page_text_str = "\n".join(page_text)
            extracted_text.append(page_text_str)
            
            avg_confidence = sum(page_confidences) / len(page_confidences) if page_confidences else 0
            
            metadata["pages"].append({
                "page_num": i + 1,
                "char_count": len(page_text_str),
                "avg_confidence": avg_confidence
            })
            metadata["confidence_scores"].append(avg_confidence)
            
            logger.info(f"Page {i+1}/{len(images)} processed (confidence: {avg_confidence:.2f})")
            
        finally:
            # Clean up temp file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
    
    full_text = "\n\n".join(extracted_text)
    metadata["total_chars"] = len(full_text)
    metadata["processing_time"] = time.time() - start_time
    metadata["avg_confidence"] = sum(metadata["confidence_scores"]) / len(metadata["confidence_scores"]) if metadata["confidence_scores"] else 0
    
    return full_text, metadata


@app.get("/")
async def root():
    return {
        "service": "PDF Extraction Service",
        "version": "1.0.0",
        "methods": ["pdfplumber", "paddleocr" if PADDLEOCR_AVAILABLE else "pdfplumber only"],
        "paddleocr_available": PADDLEOCR_AVAILABLE
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/extract", response_model=ExtractionResult)
async def extract_pdf(file: UploadFile = File(...)):
    """
    Extract text from PDF file
    Automatically detects PDF type and uses appropriate method
    """
    import time
    
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    start_time = time.time()
    
    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    
    try:
        # Detect PDF type
        logger.info(f"Processing PDF: {file.filename}")
        pdf_type = detect_pdf_type(tmp_path)
        logger.info(f"Detected PDF type: {pdf_type}")
        
        # Extract text based on type
        if pdf_type == "text":
            text, metadata = extract_text_with_pdfplumber(tmp_path)
            method = "pdfplumber"
        else:
            text, metadata = extract_text_with_paddleocr(tmp_path)
            method = "paddleocr"
        
        # Get page count
        with pdfplumber.open(tmp_path) as pdf:
            page_count = len(pdf.pages)
        
        processing_time = time.time() - start_time
        
        logger.info(f"Extraction completed: {method}, {page_count} pages, {processing_time:.2f}s")
        
        return ExtractionResult(
            text=text,
            method=method,
            page_count=page_count,
            processing_time=processing_time,
            metadata=metadata
        )
        
    except Exception as e:
        logger.error(f"Error extracting PDF: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error extracting PDF: {str(e)}")
    
    finally:
        # Clean up temp file
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
