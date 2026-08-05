EstateWatch Firecrawl guide

This folder contains a Firecrawl configuration and run guidance for harvesting Government Gazette PDFs and extracting "deceased estate" notice candidates.

Files:
- gazette-firecrawl-config.yaml — canonical crawler config used by Firecrawl (or your scrapy wrapper)

Quick run
1. Ensure Firecrawl or your chosen crawler runner supports YAML configs in this format, or adapt keys to your system.
2. Create a writable output directory: `mkdir -p data/pdf data`.
3. Run Firecrawl with the config, e.g. `firecrawl run --config scripts/firecrawl/gazette-firecrawl-config.yaml` (replace with your runner command).
4. After run completes, review `data/gazette-harvest.jsonl` for harvested items and downloaded PDFs under `data/pdf`.

Post-processing checklist
- For each harvested JSONL row, apply the EstateWatch ingestion pipeline in this order:
  1. direct PDF text extraction (read embedded text layer) — Node libs: pdf-parse, pdfjs-dist, pdf-lib
  2. OCR fallback if embedded text fails — use Google Cloud Vision / Azure Form Recognizer / AWS Textract
  3. AI cleanup: call OpenAI (gpt-4.1 or gpt-4.1-mini) with a strict prompt to produce JSON fields for the estate

Security & compliance
- Downloaded PDFs may contain personal information. Store them encrypted at rest and limit retention per POPIA guidance.
- Mask ID numbers before storing parsed results in any publicly readable location.

Tips to avoid missing notices
- Run across multiple sources (gov.za, gazettes.africa, Nuusflits / LegalNotice)
- Increase crawl frequency during initial validation (daily) then drop to weekly once stable
- Watch for changes in gov.za HTML structure — maintain a small monitor that alerts when the number of discovered PDFs drops suddenly

Contact
If you want, I can also generate a starter extraction script (Node/TypeScript) that:
- downloads a PDF URL
- attempts direct text extraction with `pdf-parse`
- falls back to a Tesseract or OCR provider call
- invokes OpenAI for final JSON extraction

Tell me which runner you use (Firecrawl, Scrapy, custom) and I can adapt the config or provide the starter script.
