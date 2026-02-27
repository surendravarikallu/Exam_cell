# Complete Guide to Uploading Exam Results

This application is designed to automatically track student attempt histories, backlogs, and GPAs intelligently. However, because it calculates the "Attempt Number" and "Latest Status" automatically based on the existing database records, the **chronological order in which you upload files is extremely important**.

Always upload files from the **oldest exam date to the newest exam date**. 

---

## The Golden Rule of Uploading

`REGULAR` -> `REVALUATION` (of that regular) -> `SUPPLEMENTARY` -> `REVALUATION` (of that supplementary) -> `NEXT SUPPLEMENTARY`

Do **NOT** upload a Supplementary Excel/PDF file before uploading the original Regular results for that semester. If you do, the system will think the Supplementary attempt was their very first attempt (Attempt 1)!

---

## Step-by-Step Scenario Example

### Your Specific Scenario

Based on your timeline:
1. **1-1 Regular** written in **January 2024** (Academic Year 2023-2024)
2. **1-2 Regular** written in **June 2024/2025**
3. **1-1 Supplementary** written in **June 2024/2025** 
4. **2-1 Regular** written in **November 2025** (Academic Year 2024-2025)

Here is the exact order you must upload their data into the system:

#### Step 1: Upload the First Master Data
Before uploading *any* results, always ensure the Student Master Directory is uploaded.
- **Tab**: Student Directory
- **Action**: Upload the CSV containing all student Roll Numbers, Names, Branches, etc.

#### Step 2: Upload 1-1 `REGULAR` Results (Jan 2024)
You must establish the very first time the students attempted these subjects.
- **Tab**: Upload Results
- **Exam Type**: `Regular`
- **Academic Year**: `2023-2024`
- **Semester**: `I`
- **File**: The original PDF or CSV containing the 1-1 regular results from Jan 2024.

#### Step 3: Upload 1-2 `REGULAR` Results (June 2024/25)
- **Tab**: Upload Results
- **Exam Type**: `Regular`
- **Academic Year**: `2024-2025`
- **Semester**: `II`
- **File**: The 1-2 regular results PDF.

#### Step 4: Upload 1-1 `SUPPLEMENTARY` Results (June 2024/25)
*Important: You must upload the regular 1-1 first (Step 2) before doing this!*
- **Tab**: Upload Results
- **Exam Type**: `Supplementary`
- **Academic Year**: `2024-2025`
- **Semester**: `I` (Because these are Semester 1 subjects being rewritten!)
- **File**: The 1-1 supplementary PDF.
*Why? The system sees they already had their 1st attempt in Jan 2024, so it flags this as Attempt 2.*

#### Step 5: Upload 2-1 `REGULAR` Results (Nov 2025)
- **Tab**: Upload Results
- **Exam Type**: `Regular`
- **Academic Year**: `2024-2025`
- **Semester**: `III` (2-1 is Semester III)
- **File**: The 2-1 regular results PDF.

---

## Crucial Reminders

1. **Semester vs Academic Year**: The "Semester" dropdown must be the semester of the **subjects inside the file**. If a 4th-year student writes a 1st-year backlog exam, you select Semester `I`, not Semester `VIII`. The "Academic Year" is the current year they actually sat down to write the backlog.
2. **Never Upload Out of Order**: If you upload 2025's supply results *before* 2024's regular results, the system will tag the 2025 supply as "Attempt 1". The attempt calculation relies entirely on chronological uploads.
3. **No Need to Specify Supply 1, 2, or 3**: The UI only has a single "Supplementary" option. The database counts their existing attempts in the background and automatically figures out if it is their 2nd, 3rd, or 4th attempt at the subject.
4. **Duplicate Files**: Discovered a typo and fixed an Excel sheet? You can re-upload the same file with the exact same Exam Type, Academic Year, and Semester. The system is smart enough to overwrite those specific records instead of duplicating them.
