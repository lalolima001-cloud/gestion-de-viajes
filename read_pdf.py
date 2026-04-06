import sys
import subprocess

try:
    from pypdf import PdfReader
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pypdf"])
    from pypdf import PdfReader

pdf = PdfReader("PLAN_TMS_FARMEX_2026.pdf")
text = "\n".join([page.extract_text() for page in pdf.pages])
with open("out.txt", "w", encoding="utf-8") as f:
    f.write(text)
