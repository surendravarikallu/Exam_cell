import pypdfium2 as pdfium
import re
import sys

if len(sys.argv) < 2:
    print("Usage: python debug_pdf.py <path_to_pdf>")
    sys.exit(1)

ROW_PATTERN = re.compile(r"^(?:(\d+)\s+)?([0-9A-Z]{10})\s+([A-Z0-9]+)\s+(.+)$", re.IGNORECASE)
GRADE_MAP = {
    'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'D': 4, 'E': 4, 'S': 10,
    'F': 0, 'ABSENT': 0, 'AB': 0, 'CHANGE': 0, 'COMPLE': 1
}

file_path = sys.argv[1]
doc = pdfium.PdfDocument(file_path)
num_pages = len(doc)
print(f"Total pages: {num_pages}\n")

matched = 0
unmatched_samples = []
page_limit = int(sys.argv[2]) if len(sys.argv) > 2 else 2

for page_idx in range(min(page_limit, num_pages)):
    page = doc[page_idx]
    textpage = page.get_textpage()
    raw = textpage.get_text_bounded()
    lines = raw.split('\n')
    print(f"=== PAGE {page_idx+1} ({len(lines)} lines) ===")
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
        m = ROW_PATTERN.match(line)
        if m:
            matched += 1
            sno, roll, subcode, rest = m.groups()
            parts = rest.split()
            grade = "UNKNOWN"
            for j in range(len(parts)-2, -1, -1):
                if parts[j].upper() in GRADE_MAP:
                    grade = parts[j].upper()
                    break
            print(f"  [MATCH] Roll={roll} Sub={subcode} Grade={grade} → {rest[:60]}")
        else:
            if len(unmatched_samples) < 20:
                unmatched_samples.append(f"  [MISS ] {repr(line[:100])}")

print(f"\nTotal matched rows: {matched}")
if unmatched_samples:
    print(f"\nUnmatched line samples (up to 20):")
    for s in unmatched_samples:
        print(s)
