from fastapi import FastAPI, UploadFile, File
from pypdfium2 import PdfDocument
import io
import re

import concurrent.futures
import multiprocessing

# Pre-compile regex for speed — roll numbers are 10-12 alphanum chars
ROW_PATTERN = re.compile(r"^(?:(\d+)\s+)?([0-9A-Z]{10,12})\s+([A-Z0-9]+)\s+(.+)$", re.IGNORECASE)

# Grade to Points mapping for JNTU
# CHANGE = revaluation resulted in mark change (credits decide if pass/fail)
# COMPLE = non-credit subject completed
GRADE_MAP = {
    # Old regulation grades
    'O': 10, 'A+': 9, 'B+': 7,
    # Standard JNTU grades (per certificate)
    'S': 10,   # Superior  (90+)
    'A': 9,    # Excellent (80-89)
    'B': 8,    # Very Good (70-79)
    'C': 7,    # Good      (60-69)
    'D': 6,    # Average   (50-59)
    'E': 5,    # Pass      (40-49)
    'F': 0, 'ABSENT': 0, 'AB': 0,
    'CHANGE': -1, 'COMPLE': -1
}

app = FastAPI()

# Global process pool executor
process_pool = None

@app.on_event("startup")
def startup_event():
    global process_pool
    # 8 cores based on server spec, adjust if needed
    process_pool = concurrent.futures.ProcessPoolExecutor(max_workers=8)

@app.on_event("shutdown")
def shutdown_event():
    process_pool.shutdown()

def process_page(page_index, contents):
    """
    Function to process a single page. 
    Needs contents to be passed because PdfDocument objects cannot be pickled.
    """
    pdf = PdfDocument(contents)
    page = pdf[page_index]
    textpage = page.get_textpage()
    text = textpage.get_text_bounded()
    
    lines = text.split('\n')
    page_results = []
    page_regulation = "Unknown"
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        match = ROW_PATTERN.match(line)
        if match:
            sno, roll, subcode, rest = match.groups()
            parts = rest.split()
            
            if not parts: continue
            
            credits_val = parts[-1]
            
            grade = "UNKNOWN"
            grade_points = "0"
            grade_idx = -1
            
            # Scan backwards to find the standard JNTU Grade letter
            # Start from second-to-last (last is usually credits)
            # Also check last position in case no credits field is present
            search_range = list(range(len(parts)-2, -1, -1))
            if len(parts) >= 1:
                search_range = list(range(len(parts)-1, -1, -1))  # include last
            for i in search_range:
                if parts[i].upper() in GRADE_MAP:
                    grade = parts[i].upper()
                    # -1 means special grade (CHANGE/COMPLE), use 0 grade points
                    grade_points = "0" if GRADE_MAP[grade] < 0 else str(GRADE_MAP[grade])
                    grade_idx = i
                    break
                    
            if grade_idx != -1:
                # Subject name is everything before the grade, removing any lone trailing numbers (like internal/total marks)
                name_parts = parts[:grade_idx]
                while name_parts and name_parts[-1].replace('.','',1).isdigit():
                    name_parts.pop()
                subname = " ".join(name_parts)
            else:
                # Fallback if no valid grade letter was matched
                subname = " ".join(parts[:-2]) if len(parts) >= 2 else " ".join(parts)
                grade = parts[-2] if len(parts) >= 2 else "UNKNOWN"

            # Strip revaluation artefacts: PDFs print "--- No" or similar at end of subject name
            # to indicate "no change in marks". Remove these so the name stays clean.
            subname = re.sub(r'\s*-{2,3}\s*No\s*$', '', subname, flags=re.IGNORECASE).strip()
            
            # Detect regulation per row
            row_reg = "Unknown"
            if subcode.startswith("R") and len(subcode) >= 3:
                reg_match = re.match(r'^(R\d{2})', subcode)
                if reg_match:
                    row_reg = reg_match.group(1)
                    
            if page_regulation == "Unknown" and row_reg != "Unknown":
                page_regulation = row_reg
            
            page_results.append({
                "RollNumber": roll.upper(),
                "StudentName": "TBA", # Names are usually not in JNTU results tables
                "SubjectCode": subcode.upper(),
                "SubjectName": subname,
                "Credits": credits_val,
                "Grade": grade,
                "GradePoints": grade_points,
                "Regulation": row_reg
            })
            
    return page_results, page_regulation

@app.post("/parse")
async def parse_pdf(file: UploadFile = File(...)):
    contents = await file.read()
    results = []
    detected_regulation = "Unknown"
    
    # We just need to know how many pages there are
    pdf = PdfDocument(contents)
    num_pages = len(pdf)
    
    # Process pages using the global process pool
    # The asyncio event loop awaits the CPU-bound tasks
    import asyncio
    loop = asyncio.get_running_loop()
    
    futures = [
        loop.run_in_executor(process_pool, process_page, i, contents)
        for i in range(num_pages)
    ]
    
    for future in await asyncio.gather(*futures):
        page_results, page_reg = future
        results.extend(page_results)
        if detected_regulation == "Unknown" and page_reg != "Unknown":
            detected_regulation = page_reg
                
    return {"results": results, "count": len(results), "regulation": detected_regulation}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
