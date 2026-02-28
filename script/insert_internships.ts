import { db } from "../server/db";
import { results, students, subjects } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";

async function run() {
    console.log("Fetching students for batch 2019-2023...");
    const targetStudents = await db.select().from(students).where(eq(students.batch, "2019-2023"));

    if (targetStudents.length === 0) {
        console.log("No students found for batch 2019-2023.");
        process.exit(0);
    }

    console.log(`Found ${targetStudents.length} students.`);

    // Define the two subjects
    const subjectCodeOther = "R1932037";
    const subjectNameOther = "SUMMER INTERNSHIP";
    const subjectCodeCSE = "R1932056";
    const subjectNameCSE = "INDUSTRIAL /SKILL DEV";

    // Ensure subjects exist
    await db.insert(subjects).values([
        { subjectCode: subjectCodeOther, subjectName: subjectNameOther, credits: 1, semester: "VI", branch: "ALL" },
        { subjectCode: subjectCodeCSE, subjectName: subjectNameCSE, credits: 1, semester: "VI", branch: "CSE" }
    ]).onConflictDoNothing({ target: subjects.subjectCode });

    const allInsertedSubjects = await db.select().from(subjects).where(inArray(subjects.subjectCode, [subjectCodeOther, subjectCodeCSE]));
    const otherSubjId = allInsertedSubjects.find(s => s.subjectCode === subjectCodeOther)?.id;
    const cseSubjId = allInsertedSubjects.find(s => s.subjectCode === subjectCodeCSE)?.id;

    if (!otherSubjId || !cseSubjId) {
        console.error("Failed to fetch subject IDs.");
        process.exit(1);
    }

    const resultsToInsert = [];

    for (const student of targetStudents) {
        const isCSE = student.branch === "CSE" || student.branch === "CSE (AI&ML)" || student.branch === "CSE (DS)";
        const targetSubjectId = isCSE ? cseSubjId : otherSubjId;

        resultsToInsert.push({
            studentId: student.id,
            subjectId: targetSubjectId,
            academicYear: "August 2022",  // standard June/July/Aug date for 3-2 Regular. We'll use June 2022 since the user said June-2022 SUMMER INTERNSHIP
            semester: "VI",
            examType: "REGULAR",
            attemptNo: 1,
            grade: "O",
            gradePoints: 10,
            creditsEarned: 1,
            status: "PASS",
            isLatest: true
        });
    }

    // Actually fix the academic year back to June 2022
    resultsToInsert.forEach(r => r.academicYear = "June 2022");

    console.log(`Preparing to insert ${resultsToInsert.length} internship results...`);

    let inserted = 0;
    for (let i = 0; i < resultsToInsert.length; i += 1000) {
        const chunk = resultsToInsert.slice(i, i + 1000);
        await db.insert(results).values(chunk).onConflictDoNothing();
        inserted += chunk.length;
    }

    console.log(`Successfully assigned internship grades of 'O' for 3-2 Regular.`);
    process.exit(0);
}

run().catch(console.error);
