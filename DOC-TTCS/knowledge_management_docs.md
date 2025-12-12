# Knowledge Management Documentation
-----2.1.2.15-----
## 1. Overview
The Knowledge Management module is divided into two distinct layers to support the Chatbot's AI capabilities:
1.  **Layer 1: Crop Knowledge (Formal Logic)** -> Uses structured Markdown (`.md`) files for precise logic, rules, and farming guides.
2.  **Layer 2: RAG Documents (Semantic Search)** -> Uses unstructured Text (`.txt`) and PDF (`.pdf`) files for broad knowledge retrieval via Vector Embeddings.

## 2. Actors
- **Admin**: Responsible for maintaining both knowledge layers.
- **System**: Processes files (parsing Markdown or generating Embeddings).

## 3. Use Case Specifications

### A. Crop Knowledge Management (Layer 1)

#### UC-KM-01: Upload Crop Knowledge (Markdown)
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Upload Crop Knowledge** |
| **Actor** | Admin |
| **Brief Description** | Admin uploads a structured `.md` file to update specific crop guides. |
| **Pre-conditions** | Admin is logged in at Crop Knowledge management page. Item is a `.md` file < 10MB. |
| **Basic Flows** | 1. Admin drags & drops a `.md` file into the upload area.<br>2. Admin clicks "Preview" to verify chunk structure (H1->H2->H3).<br>3. System parses headers and displays chunk preview.<br>4. Admin selects Category and adds Tags.<br>5. Admin clicks "Upload".<br>6. System saves file and creates structured chunks in DB.<br>7. System returns success message.<br>8. List automatically refreshes. |
| **Alternative Flows** | **A1. Invalid Structure:** System warns if headers don't match H1->H2->H3 format during preview.<br>**A2. File too large:** System blocks files > 10MB. |
| **Post-conditions** | File and chunks are saved to Database; System is ready to answer questions using this knowledge. |

#### UC-KM-02: Search Crop Knowledge
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Search Crop Knowledge** |
| **Actor** | Admin |
| **Brief Description** | Admin searches for existing Markdown files using server-side filters. |
| **Pre-conditions** | Admin is logged in. |
| **Basic Flows** | 1. Admin enters a keyword in the search bar on `/admin/documents`.<br>2. Web App sends request with `?search={keyword}`.<br>3. System searches `originalName` in database (paginated).<br>4. Web App updates the list with results. |
| **Alternative Flows** | **A1. No Results:** System returns empty list; UI shows "No documents found". |
| **Post-conditions** | UI displays filtered list of documents. |

#### UC-KM-03: Delete Crop Knowledge
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Delete Crop Knowledge** |
| **Actor** | Admin |
| **Brief Description** | Admin removes a Markdown file and its associated chunks. |
| **Pre-conditions** | Admin logged in. |
| **Basic Flows** | 1. Admin clicks "Trash" icon on a file.<br>2. Admin confirms the modal dialog.<br>3. System deletes the file and all generated FTS chunks.<br>4. Web App removes the item from the list. |
| **Alternative Flows** | **A1. Delete Failed:** System shows error message if file is locked or missing. |
| **Post-conditions** | Document and all related chunks are permanently removed from Database. |

---

### B. RAG Document Management (Layer 2)

#### UC-KM-04: Upload RAG Document (TXT/PDF)
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Upload RAG Document** |
| **Actor** | Admin |
| **Brief Description** | Admin uploads unstructured text/pdf for vector search. |
| **Pre-conditions** | Admin is logged in at RAG documents management page. File is `.txt` (10MB) or `.pdf` (50MB). |
| **Basic Flows** | 1. Admin drags & drops a `.txt` or `.pdf` file.<br>2. Admin selects Category and adds Tags.<br>3. Admin clicks "Upload".<br>4. System saves file and triggers background Embedding generation.<br>5. System returns success message.<br>6. List refreshes to show status `PENDING` or `PROCESSING`. |
| **Alternative Flows** | **A1. Invalid File Type:** System rejects files not ending in .txt/.pdf.<br>**A2. File too large:** System blocks upload > limit. |
| **Post-conditions** | Document saved; Background job started to generate Embeddings. |

#### UC-KM-05: Search RAG Document
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Search RAG Document** |
| **Actor** | Admin |
| **Brief Description** | Admin filters the loaded list of RAG documents (Client-side). |
| **Pre-conditions** | Admin logged in. |
| **Basic Flows** | 1. System fetches ALL RAG documents on page load.<br>2. Admin types in the search bar.<br>3. Web App filters the displayed list instantly by name or tag match.<br>*(Note: This is client-side filtering as implemented in `RagDocumentList`)* |
| **Alternative Flows** | **A1. No Match:** List becomes empty based on client filter. |
| **Post-conditions** | UI displays filtered list. |

#### UC-KM-06: Delete RAG Document
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Delete RAG Document** |
| **Actor** | Admin |
| **Brief Description** | Admin removes a RAG document and its vector embeddings. |
| **Pre-conditions** | Admin logged in. |
| **Basic Flows** | 1. Admin clicks "Trash" icon.<br>2. System validates and deletes the document and cleans up vector store.<br>3. ListItem is removed from view. |
| **Alternative Flows** | **A1. Delete Failed:** System shows error if ID not found. |
| **Post-conditions** | Document and all associated Vector Embeddings are permanently deleted. |

## 4. Sequence Diagrams

### 4.1 Sequence Diagram: Upload Crop Knowledge (Markdown) with Preview

```mermaid
sequenceDiagram
    participant A as Admin
    participant FE as Web App (DocumentUpload)
    participant CTL as AdminCropController
    participant SVC as DocumentService
    participant DB as Database

    A->>FE: Select .md File -> Click "Preview"
    FE->>CTL: POST /api/admin/crop-knowledge/preview (Multipart)
    CTL->>SVC: previewChunks(file)
    SVC->>SVC: Parse Markdown Headers
    SVC-->>CTL: Return Chunk array
    CTL-->>FE: JSON { chunks: [...] }
    FE-->>A: Show Preview List (H1/H2/H3)
    
    A->>FE: Click "Upload"
    FE->>CTL: POST /api/admin/crop-knowledge/upload
    CTL->>SVC: uploadAndProcess(file, dto)
    SVC->>DB: Save Document Record
    SVC->>DB: Save Generated Chunks (FTS)
    DB-->>SVC: Success
    SVC-->>CTL: Success
    CTL-->>FE: Success Message
    FE-->>A: Auto-refresh List
```

### 4.2 Sequence Diagram: Search Crop Knowledge (Server-side)

```mermaid
sequenceDiagram
    participant A as Admin
    participant FE as Web App (DocumentList)
    participant CTL as AdminDocumentController
    participant SVC as DocumentService
    participant DB as Database

    A->>FE: Enter "Rice" -> Press Enter
    FE->>CTL: GET /api/admin/documents?page=1&search=Rice
    CTL->>SVC: findAll(query)
    SVC->>DB: SELECT * FROM documents WHERE name ILIKE '%Rice%' LIMIT 10
    DB-->>SVC: Documents []
    SVC-->>CTL: { data: docs, total: n }
    CTL-->>FE: Update Table UI
```

### 4.3 Sequence Diagram: Upload RAG Document (TXT/PDF)

```mermaid
sequenceDiagram
    participant A as Admin
    participant FE as Web App (RagDocumentUpload)
    participant CTL as AdminRagDocumentController
    participant SVC as RagDocumentService
    participant CHK as ChunkingService
    participant EMB as EmbeddingService
    participant PY as Python AI Service
    participant DB as Database

    A->>FE: Select .txt/.pdf -> Click Upload
    FE->>CTL: POST /api/admin/rag-documents/upload
    CTL->>SVC: uploadAndProcess(file, dto)
    
    SVC->>SVC: Save File to Disk & Extract Text
    SVC->>DB: Create Document (Status=PROCESSING)
    DB-->>SVC: Document Entity
    
    par Async Background Processing
        SVC->>CHK: chunkDocument()
        CHK-->>SVC: chunks []
        
        SVC->>EMB: generateEmbeddingsBatch(chunks)
        EMB->>PY: POST /embed-batch (texts)
        PY-->>EMB: Embeddings Vector []
        EMB-->>SVC: Embeddings []
        
        SVC->>DB: Insert Chunks (rag_chunks with pgvector)
        SVC->>DB: Update Document (Status=COMPLETED)
    end
    
    SVC-->>CTL: Return Document (Immediate)
    CTL-->>FE: Success JSON
    FE-->>A: Show "Upload Success, Processing..."
```

### 4.4 Sequence Diagram: Search RAG Document (Client-side)

```mermaid
sequenceDiagram
    participant A as Admin
    participant FE as Web App (RagDocumentList)
    participant CTL as AdminRagDocumentController
    participant DB as Database

    A->>FE: Navigate to RAG documents managent page
    FE->>CTL: GET /api/admin/rag-documents
    CTL->>DB: Fetch ALL RagDocuments
    DB-->>CTL: List []
    CTL-->>FE: JSON List
    
    A->>FE: Type "Fertilizer"
    FE->>FE: Filter local array (doc.name.includes("Fertilizer"))
    FE-->>A: Update displayed list instantly
```

### 4.5 Sequence Diagram: Delete Crop Knowledge (Markdown)

```mermaid
sequenceDiagram
    participant A as Admin
    participant FE as Web App (DocumentList)
    participant CTL as AdminDocumentController
    participant SVC as DocumentService
    participant DB as Database

    A->>FE: Click Trash Icon -> Confirm
    FE->>CTL: DELETE /api/admin/documents/:id
    CTL->>SVC: delete(id)
    
    SVC->>DB: Find Document path
    SVC->>DB: Delete Document & Chunks
    DB-->>SVC: Success
    
    SVC-->>CTL: Return Success
    CTL-->>FE: Success JSON
    FE-->>A: Remove from List
```

### 4.6 Sequence Diagram: Delete RAG Document

```mermaid
sequenceDiagram
    participant A as Admin
    participant FE as Web App (RagDocumentList)
    participant CTL as AdminRagDocumentController
    participant SVC as RagDocumentService
    participant DB as Database

    A->>FE: Click Trash Icon -> Confirm
    FE->>CTL: DELETE /api/admin/rag-documents/:id
    CTL->>SVC: delete(id)
    
    SVC->>DB: Find Document path
    
    SVC->>DB: Delete Document Record & vector chunks
    DB-->>SVC: Success
    
    SVC-->>CTL: Return Success
    CTL-->>FE: Success JSON
    FE-->>A: Remove from List
```
