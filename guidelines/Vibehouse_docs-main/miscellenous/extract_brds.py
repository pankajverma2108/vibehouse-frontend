import PyPDF2
import os

docs = [
    "KYC_BRD.pdf",
    "Pre-Arrival Upsell Engine.pdf",
    "Staff Task Dashboard & SLA Engine BRD.pdf",
    "Upsell & Revenue Optimization Engine BRD.pdf",
    "During Stay Service Engine BRD.pdf",
]

for doc in docs:
    path = os.path.join(r"d:\VibeHouse\docs", doc)
    out = os.path.join(r"d:\VibeHouse\docs", doc.replace(".pdf", ".txt"))
    try:
        with open(path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
        with open(out, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"OK: {doc} -> {out}")
    except Exception as e:
        print(f"FAIL: {doc} -> {e}")
