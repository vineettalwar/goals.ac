# Data processing agreement (draft for counsel)

**Status:** engineering draft. Do not send to a customer or investor until a lawyer revises and Some Tech Work UG signs.

This is not clickwrap. It is a starting AVV/DPA outline for EU B2B customers who appoint goals.ac as processor.

## Parties

- **Controller:** the customer organization using goals.ac
- **Processor:** Some Tech Work UG (haftungsbeschränkt), Wiesbaden, Germany

## Subject matter

Processor hosts the SaaS, generates content on Controller instructions, stores drafts and credentials, and publishes to CMS destinations Controller connects.

## Nature of data

Account identifiers, brand and site content, CMS/OAuth secrets (encrypted), Search Console / GA4 tokens, chat transcripts, usage metrics.

## Subprocessors

Current list: public `/subprocessors`. Changes: email notice to the Controller admin.

## Location

Cloudflare Workers and D1. No EU location_hint is committed in application config unless confirmed in writing.

## Security

AES-256-GCM at rest for secrets; TLS in transit; invite-only signup by default; optional org MFA and IP allowlist; org audit log for admin events.

## Assistance

Processor will assist with DSAR (in-product export + privacy@goals.ac), deletion (in-product account delete when the requester is the sole org member), and breach notice without undue delay after confirmation.

## Return / deletion

On termination, Controller may export then delete the account. Processor will delete remaining production copies except records required by tax or dispute holds.

## Instructions

Processor processes only on documented instructions in the product (generate, publish, connect integrations) and this DPA.
