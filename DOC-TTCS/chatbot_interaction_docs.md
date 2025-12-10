# Chatbot Interaction Documentation
----2.1.2.8----
## 1. Actors
- **User (Farmer)**: Interacts with the chatbot via natural language.
- **Chatbot (AI System)**: Processes requests (NLP), queries databases/IoT, and responds.
- **IoT System**: Sensors and Devices (Pumps, Lights).
- **Python AI Service**: Handles Intent Recognition and NER.
- **Gemini (LLM)**: Generates natural language responses for QA.

## 2. Use Case Specifications

### UC-CHAT-01: IoT Interaction via ChatBot (Sensor Query & Device Control)
| Feature | Description |
| :--- | :--- |
| **Use Case** | **IoT Interaction** |
| **Actor** | User |
| **Brief Description** | User asks for sensor data or commands devices to turn on/off via chat. |
| **Pre-conditions** | User is logged in. Farm has configured IoT devices. |
| **Basic Flows** | **Flow A: Query Sensors**<br>1. User asks: "How is the temperature in Greenhouse 1?"<br>2. Chatbot identifies intent `sensor_query` and entity `area`.<br>3. System fetches latest sensor data for that area.<br>4. Chatbot replies: "Current temperature in Greenhouse 1 is 28°C."<br><br>**Flow B: Control Device**<br>1. User says: "Turn on the pump for 10 minutes."<br>2. Chatbot identifies intent `device_control`, device `pump`, action `ON`, duration `10m`.<br>3. System commands device via MQTT.<br>4. Chatbot replies: "Pump turned on for 10 minutes." |
| **Alternative Flows** | **A1. Ambiguous Request:**<br>1. System cannot identify specific device/area.<br>2. Chatbot asks for clarification.<br><br>**A2. Device Offline:**<br>1. Command fails.<br>2. Chatbot reports error. |
| **Post-conditions** | User receives info or device state changes. |

### UC-CHAT-02: Ask Agriculture Knowledge (QA)
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Ask Agriculture Knowledge** |
| **Actor** | User |
| **Brief Description** | User asks general farming questions. The system processes this through a 3-layer architecture: Exact Match -> RAG -> LLM Fallback. |
| **Pre-conditions** | User is logged in. **User has credits > 0** (or active Premium with unlimited/daily quota). |
| **Basic Flows** | 1. User asks a question (e.g., "Mật độ trồng cà chua?").<br>2. **Intent Analysis**: System determines intent is `knowledge_query`.<br>3. **Credit Check**: System checks if User Credit > 0. If yes, deduct 1 credit.<br>4. **Layer 1 (Exact Match)**: System searches for exact document match (Confidence >= 0.9). If found, return content.<br>5. **Layer 2 (RAG)**: If Layer 1 fails, System searches Vector DB (Similarity >= 0.7). If context found, generate answer via Gemini.<br>6. **Layer 3 (LLM Fallback)**: If Layer 2 fails, System uses pure LLM knowledge to answer.<br>7. Chatbot displays the answer to User along with the source (Document/AI). |
| **Alternative Flows** | **A1. Out of Credits:**<br>1. System checks credit = 0.<br>2. System denies request.<br>3. Chatbot replies: "You have run out of credits. Please upgrade or buy more."<br><br>**A2. Off-topic (Unknown Intent):**<br>1. Query classified as UNKNOWN.<br>2. System validates if agriculture-related.<br>3. If valid -> Layer 3 (LLM Fallback).<br>4. If off-topic -> Reject ("I only answer agriculture questions"). |
| **Post-conditions** | User receives answer; 1 Credit deducted. |

### UC-CHAT-03: Query Farm Financial Data
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Query Farm Financial Data** |
| **Actor** | User |
| **Brief Description** | User asks for financial summaries via chat. |
| **Pre-conditions** | User has a farm with financial records. |
| **Basic Flows** | 1. User asks: "What is my revenue this month?"<br>2. Chatbot identifies intent `yield_farming_query` (or similar financial intent).<br>3. System queries database for aggregated financial stats.<br>4. Chatbot replies: "Your revenue for December is 5,000,000 VND." |
| **Post-conditions** | User receives financial insight. |

## 3. Sequence Diagrams

### 3.1 Sequence Diagram: Ask Agriculture Knowledge (3-Layer Architecture)

```mermaid
sequenceDiagram
    participant U as User
    participant BE as AIOrchestratorService
    participant INT as IntentClassifierService
    participant US as UsersEntity
    participant FTS as ExactMatchService
    participant RAG as RAGService
    participant LLM as LLMFallbackService

    U->>BE: Send Question
    BE->>INT: Classify Intent & Extract Entities
    INT-->>BE: Intent: knowledge_query
    
    BE->>US: Check Credits
    alt Credit > 0
        US->>US: Deduct 1 Credit
        US-->>BE: Access Allowed
        
        note right of BE: Layer 1: Exact Match
        BE->>FTS: Find Exact Document (Entities)
        alt Confidence >= 0.9
            FTS-->>BE: Return Document Content
            BE-->>U: Return Answer (Source: Doc)
        else Layer 1 Failed
            note right of BE: Layer 2: RAG
            BE->>RAG: Vector Search & Generate
            alt Confidence >= 0.5
                RAG-->>BE: Return AI Answer
                BE-->>U: Return Answer (Source: RAG)
            else Layer 2 Failed
                note right of BE: Layer 3: LLM Fallback
                BE->>LLM: Generate Pure AI Response
                LLM-->>BE: Return Answer
                BE-->>U: Return Answer (Source: LLM)
            end
        end
    else Out of Credit
        US-->>BE: Access Denied
        BE-->>U: Show "Please buy more credits"
    end
```

### 3.2 Sequence Diagram: IoT Sensor Query

```mermaid
sequenceDiagram
    participant U as User
    participant BE as AIOrchestratorService
    participant INT as IntentClassifierService
    participant AR as ActionRouterService
    participant SQ as SensorQueryHandler
    participant DB as SensorDataEntity

    U->>BE: Send "Request Temperature"
    BE->>INT: Classify Intent & Extract Entities
    INT-->>BE: Intent: sensor_query, Entity: Area A
    
    BE->>AR: routeAction(Context)
    AR->>SQ: handle(User, Entities, Query)
    
    SQ->>SQ: Extract Metrics
    SQ->>DB: Query Latest Data (Area A)
    DB-->>SQ: { temp: 28, humidity: 60 }
    
    SQ-->>AR: Return Success & Message
    AR-->>BE: Return Response
    BE-->>U: "Temperature is 28°C..."
```

### 3.3 Sequence Diagram: IoT Device Control

```mermaid
sequenceDiagram
    participant U as User
    participant BE as AIOrchestratorService
    participant INT as IntentClassifierService
    participant AR as ActionRouterService
    participant DC as DeviceControlHandler
    participant MQ as MQTT Service
    participant DV as IoT Device

    U->>BE: "Turn on Pump 1"
    BE->>INT: Classify Intent
    INT-->>BE: Intent: device_control, Dev: Pump 1, Action: ON
    
    BE->>AR: routeAction(Context)
    AR->>DC: handle(User, Entities, Query)
    
    DC->>DC: Validate Ownership & Device Status
    DC->>MQ: Publish Command (Start Pump)
    MQ->>DV: Forward Command
    DV-->>MQ: Ack (State Changed)
    
    DC-->>AR: Return Success & Command Info
    AR-->>BE: Return Response
    BE-->>U: "Pump 1 is ON now."
```

### 3.4 Sequence Diagram: Query Financial Data

```mermaid
sequenceDiagram
    participant U as User
    participant BE as AIOrchestratorService
    participant INT as IntentClassifierService
    participant AR as ActionRouterService
    participant FQ as FinancialQueryHandler
    participant DB as FinancialStatsEntity

    U->>BE: "Profit this month?"
    BE->>INT: Classify Intent
    INT-->>BE: Intent: financial_query, Time: this_month
    
    BE->>AR: routeAction(Context)
    AR->>FQ: handle(User, Entities, Query)
    
    FQ->>DB: Aggregation Query (Revenue - Expenses)
    DB-->>FQ: Result: 2,000,000
    
    FQ-->>AR: Return Success & Message
    AR-->>BE: Return Response
    BE-->>U: "Your profit this month is 2,000,000 VND."
```
