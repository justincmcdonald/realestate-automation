# Technical Walkthrough — Property Automation Platform

A walkthrough of how an end-to-end financial automation platform was designed and built for a residential property development client. The system replaces a manual, multi-system bill-pay and bookkeeping process with a single front-end interface backed by automated workflows that orchestrate accounting and record-keeping across several external systems.

This document explains how each piece fits together: the front-end pages, the automation workflows behind them, and the architectural decisions that make the platform reliable and able to scale across multiple business entities.

---

## System overview

The platform is built in three layers:

**Presentation** — a low-code web front end where the team (and contractors) interact with the system through simple forms and dashboards. No one touches the accounting system or the spreadsheets directly.

**Orchestration** — a workflow automation layer (iPaaS) that receives requests from the front end via webhooks, applies business logic and routing, and reads from / writes to the systems of record.

**Systems of record** — the accounting platform (one account per business entity) and a spreadsheet-based master database that together hold the authoritative data.

The core design principle is that the front end stays simple and the complexity lives in the orchestration layer, where it can be controlled, branched, and scaled without changing the user experience.

---

## Technology stack

| Layer | Technology | Role |
|-------|-----------|------|
| Front end | Low-code web app builder | Forms, dashboards, navigation |
| Orchestration | n8n (workflow automation / iPaaS) | Webhook-triggered workflows, routing, business logic |
| Accounting | QuickBooks Online | System of record for bills, vendors, customers; check generation |
| Database | Google Sheets | Master property/contractor data and per-property financial ledgers |
| AI parsing | LLM API (free tier) | Extracts structured invoice data from uploaded PDFs |

---

## Data model

The spreadsheet master database is the backbone of the system. The key structures:

**Master sheet — properties.** Each property record holds its address, the bank it's associated with, a reference to the bank's workbook, its accounting-system customer reference, the date added, an active flag, and (in the multi-entity design) the company that owns it. The property record is the central lookup that drives nearly every workflow — selecting a property tells the system which company, which bank, and which accounting account to use.

**Master sheet — accounts.** Maps each bank to its workbook and its accounting account reference, with the owning company. This is what the routing logic and payment workflows read to resolve the correct destination.

**Master sheet — contractors.** Holds contractor name, vendor reference, and an active flag. Powers the contractor dropdowns and the add/remove contractor flows.

**Per-bank workbooks.** Each bank has its own workbook, and each property has its own tab within that workbook. These tabs are the detailed financial ledger for the property — line items, amounts, check numbers, cleared status, dates, and payment information.

A deliberate principle here is **single source of truth**: the property record in the master sheet is authoritative for the property-to-company-to-bank mapping, and everything else derives from it rather than duplicating that logic.

---

## Front-end pages and the workflows behind them

Each front-end page maps to one or more automation workflows. Below, each page is paired with what it does and how the workflow behind it operates.

### Submit Invoice (contractor-facing)

**What the user does:** A contractor selects their name from a dropdown, selects the property they're billing for, and enters the invoice details (description, amount, requested payment date). The page reveals fields progressively to keep it simple on mobile.

**What happens behind the scenes:** Submitting the form sends the data to a webhook that triggers the Submit Invoice workflow. The workflow looks up the selected property in the master sheet to determine which company owns it. It then routes to the correct accounting account, resolves the contractor as a vendor in that account, and creates the bill.

The dropdown options are themselves populated by GET workflows (one for contractors, one for properties) that read the master sheet — so the front end never hardcodes data and always reflects the current state of the database.

**Optional PDF path:** If an invoice PDF is uploaded, the workflow routes it through an LLM API call that extracts the structured fields (vendor, amount, description) before creating the bill, rather than requiring manual entry.

### Pay Bills (owner-facing)

**What the user does:** The owner sees a live dashboard of all unpaid bills, can filter by company, search by vendor, and sort by due date. Clicking "Pay" on a bill opens a modal to record the payment against a property and date.

**What happens behind the scenes:** On load, the page calls the Get Unpaid Bills workflow, which queries the accounting system for all bills with an outstanding balance. In the multi-entity design this workflow fans out to each company's accounting account in parallel, tags each returned bill with its owning company, merges the results into one unified list, and returns it. That tagging is what makes the company filter on the dashboard possible.

When a payment is recorded, a separate workflow creates the payment in the correct accounting account and writes the corresponding line into the property's ledger tab in the right bank workbook.

### Property Management (owner-facing)

**What the user does:** The owner adds a new property by entering its address and selecting its bank.

**What happens behind the scenes:** The workflow checks whether the property already exists (both in the accounting system as a customer and in the master sheet), and only creates what's missing. It creates the accounting customer, appends the property to the master sheet, creates a new ledger tab for it in the correct bank workbook, and writes the column headers into that new tab. The existence checks prevent duplicate properties when the same address is submitted more than once.

### Personal Invoice (owner-facing)

**What the user does:** The owner logs an out-of-pocket expense (e.g., supplies bought directly from a store) against a property. They enter the item, the store/vendor it was purchased from, the price, and the date.

**What happens behind the scenes:** This flow bypasses the accounting system entirely — it writes straight to the property's ledger tab in the spreadsheet, recording the item and the store name. It's a lightweight path for expenses that don't need to flow through formal bill creation.

### Contractor Management (owner-facing)

**What the user does:** The owner sees a list of active contractors. They can remove a contractor (which deactivates them) or add a new one by entering a name.

**What happens behind the scenes:** The list is populated by the Get Contractors workflow reading the master sheet. The **Add Contractor** workflow creates the contractor as a vendor in the accounting system first (to capture the vendor reference), then writes the contractor's name, vendor reference, and an active flag to the master sheet. The **Remove Contractor** workflow finds the contractor's row and flips their active flag, which removes them from the list without deleting any history.

---

## Key engineering decisions

These are the decisions that shaped the platform's reliability and scalability, and the reasoning behind each.

### Multi-entity routing with runtime credential selection

The client operates several separate business entities, each with its own accounting account and its own bank accounts — driven by the concrete requirement that each entity's checks must carry that entity's own identity and draw from its own bank.

Rather than building a separate platform per entity, the design uses a **routing node** that inspects the owning company (resolved from the property lookup) and directs the workflow down the correct branch, each branch using that entity's own accounting credentials. The structure is built out for all entities up front, with branches for entities not yet live left stubbed — so onboarding a new entity is a matter of adding its credential and enabling its branch, not rebuilding the workflow.

### Vendor resolution at creation time instead of stored IDs

Because each accounting account is independent, the same contractor has a different internal vendor reference in each account. Storing a single vendor reference per contractor would break the moment a bill needed to be created in a different entity's account.

The solution is to resolve the vendor by **name lookup inside the correct account at the moment the bill is created**, rather than relying on a stored reference. The contractor's name is the stable identifier that travels through the system; the account-specific reference is looked up fresh in whichever account the bill belongs to. This keeps the data model clean and avoids per-account reference columns.

### Fan-out and merge for a unified cross-entity view

A central requirement was a single dashboard showing unpaid bills across all entities. Since the bills live in separate accounting accounts, the Get Unpaid Bills workflow queries each account in parallel, tags each bill with its owning company, and merges the streams into one list. The heavy lifting happens in the orchestration layer, so the front-end filter is a trivial operation on an already-unified, already-tagged dataset.

### Reliability workarounds for silent failures

Several workflows depend on spreadsheet lookups and conditional branching, where the automation tool's default behavior can fail silently — for example, returning an empty result that a condition then misreads, or a lookup that finds nothing and quietly halts the workflow with no error.

The platform handles this defensively: conditional checks use null-safe patterns so empty results route correctly rather than throwing or stalling, and where the built-in lookup behavior proved unreliable on exact matches, the logic was moved into a code step that reads all rows and filters explicitly. Output-on-empty behavior is configured deliberately per node rather than left to defaults. These choices came directly from debugging real failures and represent the difference between a demo that works once and a system that runs unattended.

### Fire-and-forget submission

For submission flows where the user only needs confirmation that their request was received, the front end sends the request and shows success immediately rather than waiting on the full downstream process to complete. This keeps the interface responsive and decouples the user experience from the duration of the back-end work. The exception is the payment flow, which intentionally waits for a response because it returns a link the user needs to complete check printing.

---

## What this demonstrates

The platform is an example of **integration / solutions architecture**: designing how independent systems communicate across API boundaries, modeling the data, anticipating scale (multi-entity from a single-entity start), and identifying and mitigating systemic risks — credential isolation, cross-account reference mismatches, and silent failure modes — before they become production problems.

The emphasis throughout was on building something that a small, non-technical team could rely on day to day, while keeping the underlying architecture clean enough that new business entities and new workflows can be added without a rebuild.
