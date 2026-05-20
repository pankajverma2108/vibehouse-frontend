import docx2txt
import PyPDF2

docx_text = docx2txt.process(r"d:\VibeHouse\docs\Eval_ Vibe House Concept Note.docx")
with open(r"d:\VibeHouse\docs\concept.txt", "w", encoding="utf-8") as f:
    f.write(docx_text)

with open(r"d:\VibeHouse\docs\B2B Business Dashboard SOP - Google Slides.pdf", "rb") as f:
    reader = PyPDF2.PdfReader(f)
    pdf_text = ""
    for page in reader.pages:
        pdf_text += page.extract_text() + "\n"
with open(r"d:\VibeHouse\docs\sop.txt", "w", encoding="utf-8") as f:
    f.write(pdf_text)
