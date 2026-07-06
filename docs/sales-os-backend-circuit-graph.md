# Sales OS Backend Circuit Graph

This document explains Sales OS like an AI calling agent backend graph. Think of every box as a backend node. Data moves through edges. Supabase tables are memory nodes.

## Graph 1: Full Sales Backend Circuit

```mermaid
flowchart LR
  subgraph INPUTS[INPUT NODES]
    MANUAL[Manual Entry]
    CSV[CSV Upload]
    GS[Google Sheets]
    CU[ClickUp]
    IM[IndiaMART]
    TI[TradeIndia]
    WEB[Website / Sweb]
    WA[WhatsApp]
    EM[Email]
    CALL[Calling / Dialer]
    REF[References]
    EXIST[Existing Clients]
  end

  BUS((Input Bus))
  NORMALIZE[Normalize Node]
  INBOX[(sales_inbox_events)]
  DEDUPE{Duplicate Gate}
  MATCH[(sales_lead_matches)]
  ENRICH[Enrichment Node]
  ENRICHDB[(sales_enrichment_records)]
  CONVERT{Convert Gate}
  LEADS[(leads)]
  HISTORY[(lead_history)]
  FOLLOW[(followups)]
  TASKS[(tasks)]
  QUOTE[(quotations)]
  CLIENTS[(clients)]

  MANUAL --> BUS
  CSV --> BUS
  GS --> BUS
  CU --> BUS
  IM --> BUS
  TI --> BUS
  WEB --> BUS
  WA --> BUS
  EM --> BUS
  CALL --> BUS
  REF --> BUS
  EXIST --> BUS

  BUS --> NORMALIZE --> INBOX --> DEDUPE
  DEDUPE -->|match found| MATCH
  DEDUPE -->|new candidate| ENRICH
  MATCH -->|update existing| LEADS
  MATCH -->|existing client| CLIENTS
  MATCH -->|manual review| INBOX
  ENRICH --> ENRICHDB --> CONVERT
  CONVERT -->|new lead| LEADS
  CONVERT --> HISTORY
  CONVERT --> FOLLOW
  LEADS --> TASKS
  LEADS --> QUOTE
  LEADS --> CLIENTS
```

## Graph 2: Communication and Call Coach Circuit

```mermaid
flowchart LR
  WA[WhatsApp] --> WAP[WhatsApp Parser]
  EM[Email] --> EMP[Email Parser]
  DIAL[Auto Dialer / Manual Call] --> CALLLOG[Call Logger]

  WAP --> COMM[(sales_communications)]
  EMP --> COMM
  CALLLOG --> CALLS[(sales_call_logs)]

  COMM --> LINK{Lead/Client Link Gate}
  CALLS --> LINK

  LINK -->|found| LEADS[(leads)]
  LINK -->|not found| INBOX[(sales_inbox_events)]

  CALLS --> AI[AI Assistant Node]
  COMM --> AI

  AI --> OPENAI[OpenAI]
  AI --> OLLAMA[Ollama / Local LLM]
  OPENAI --> SUGGEST[(sales_ai_suggestions)]
  OLLAMA --> SUGGEST

  SUGGEST --> HISTORY[(lead_history)]
  SUGGEST --> FOLLOW[(followups)]
```

## Graph 3: Calculator and Quotation Circuit

```mermaid
flowchart LR
  LEAD[(leads)] --> CALC[Sales Calculator Node]
  CLIENT[(clients)] --> CALC

  CALC --> PRICE[Price Calculator]
  CALC --> MARGIN[Margin Calculator]
  CALC --> GST[GST Calculator]
  CALC --> FREIGHT[Freight Calculator]
  CALC --> MOQ[MOQ / Quantity Calculator]

  PRICE --> CALCDB[(sales_calculations)]
  MARGIN --> CALCDB
  GST --> CALCDB
  FREIGHT --> CALCDB
  MOQ --> CALCDB

  CALCDB --> QDRAFT[Quotation Draft Node]
  QDRAFT --> QUOTE[(quotations)]
  QUOTE --> HISTORY[(lead_history)]
  QUOTE --> FOLLOW[(followups)]
```

## Graph 4: ClickUp Mirror Circuit

```mermaid
flowchart LR
  FOLLOW[(followups)] --> MIRROR{Mirror Required?}
  TASKS[(tasks)] --> MIRROR
  LEADS[(leads)] --> MIRROR

  MIRROR -->|no| SUPA[(Supabase Only)]
  MIRROR -->|yes| CUAPI[ClickUp API]
  CUAPI --> CUTASK[(clickup_tasks)]
  CUTASK --> SYNC[Sync Status Node]
  SYNC --> DASH[Sales Dashboard]
```

## Graph 5: Backend API Map

```mermaid
flowchart TD
  A[/api/sales/intake/] --> B[(sales_inbox_events)]
  C[/api/sales/dedupe/] --> D[(sales_lead_matches)]
  E[/api/sales/enrich/] --> F[(sales_enrichment_records)]
  G[/api/sales/convert-lead/] --> H[(leads)]
  G --> I[(lead_history)]
  J[/api/sales/followups/] --> K[(followups)]
  L[/api/sales/communication/whatsapp/] --> M[(sales_communications)]
  N[/api/sales/communication/email/] --> M
  O[/api/sales/calls/] --> P[(sales_call_logs)]
  Q[/api/sales/ai/suggest/] --> R[(sales_ai_suggestions)]
  S[/api/sales/calculator/] --> T[(sales_calculations)]
  U[/api/quotations/] --> V[(quotations)]
```

## Node Responsibilities

### Input Bus

Receives all raw data from manual entry, CSV, Google Sheets, ClickUp, IndiaMART, TradeIndia, WhatsApp, Email, website, calling, references, and existing clients.

### Normalize Node

Standardizes names, mobile, email, source ids, product interest, message text, and raw payload.

### Duplicate Gate

Checks against leads and clients by mobile, email, company name, and external ids.

### Enrichment Node

Calls BIS, MCA, FSSAI, GST, TIN, TSIN, or other verification sources.

### Convert Gate

Decides whether to create a new lead, update existing lead, create followup, create opportunity for existing client, or ignore duplicate.

### AI Assistant Node

Routes prompts to OpenAI, Ollama, or local LLM and stores output in sales_ai_suggestions.

### Calculator Node

Creates pricing, margin, GST, freight, MOQ, and quotation helper outputs.

## Hard Rule

No external source writes directly into leads. Every source must pass through a controlled node path.
