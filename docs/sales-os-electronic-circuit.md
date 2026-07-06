# Sales OS Electronic Circuit Diagram

## Legend

- INPUT = data source
- BUS = common data line
- GATE = decision or validation
- IC = processing module
- DB = Supabase table
- OUT = output action

## Main Circuit

```text
[Manual] -----+
[CSV] --------+
[GoogleSheet]-+
[ClickUp] ----+
[IndiaMART] --+
[TradeIndia] -+----> (INPUT BUS) ----> [GATE: Normalize] ----> DB:sales_inbox_events
[Website/Sweb]+
[WhatsApp] ---+
[Email] ------+
[Calling] ----+
[Reference] --+
[ExistingClient]+
```

```text
DB:sales_inbox_events
        |
        v
[GATE: Duplicate Check]
        |
        +---- match found ----> DB:sales_lead_matches ----> [GATE: Update existing lead/client]
        |
        +---- no match -------> [GATE: New lead candidate]
        |
        v
[IC: Enrichment]
        |
        +---- BIS ----+
        +---- MCA ----+
        +---- FSSAI --+----> DB:sales_enrichment_records
        +---- GST ----+
        +---- TIN ----+
        +---- TSIN ---+
        |
        v
[GATE: Convert]
        |
        +----> DB:leads
        +----> DB:lead_history
        +----> DB:followups
```

## Communication Circuit

```text
[WhatsApp] ---> [IC: WhatsApp Parser] ---> DB:sales_communications ----+
[Email] ------> [IC: Email Parser] -----> DB:sales_communications ----+----> [GATE: Link to lead/client]
                                                                      |
                                                                      +----> DB:sales_inbox_events if new enquiry
```

## Calling / Call Coach Circuit

```text
[Auto Dialer / Manual Call]
        |
        v
[IC: Call Logger]
        |
        v
DB:sales_call_logs
        |
        +---- recording_url
        +---- transcript
        +---- outcome
        |
        v
[IC: AI Assistant]
        |
        +---- OpenAI
        +---- Ollama / local LLM
        |
        v
DB:sales_ai_suggestions
        |
        +----> DB:lead_history
        +----> DB:followups
```

## Calculator / Quotation Circuit

```text
DB:leads / DB:clients
        |
        v
[IC: Sales Calculator]
        |
        +---- price
        +---- margin
        +---- GST
        +---- freight
        +---- MOQ / quantity
        |
        v
DB:sales_calculations
        |
        v
[OUT: Quotation Draft] ---> DB:quotations
```

## ClickUp Mirror Circuit

```text
DB:followups / DB:tasks
        |
        v
[GATE: mirror required?]
        |
        +---- no ----> stay in Supabase
        |
        +---- yes ---> [OUT: ClickUp Task]
                          |
                          v
                    DB:clickup_tasks
```

## Dashboard Read Circuit

```text
Sales Dashboard
   |
   +---- DB:sales_inbox_events        -> new inbox / duplicate review
   +---- DB:leads                     -> CRM pipeline
   +---- DB:followups                 -> today followups
   +---- DB:sales_communications      -> WhatsApp/email pending replies
   +---- DB:sales_call_logs           -> call coach
   +---- DB:sales_ai_suggestions      -> AI pending / accepted suggestions
   +---- DB:sales_calculations        -> calculator drafts
   +---- DB:quotations                -> quote status
   +---- DB:clickup_tasks             -> ClickUp sync health
```

## Golden Rule

No source writes directly into DB:leads. Every source must pass through an input bus, gate, and controlled conversion.
