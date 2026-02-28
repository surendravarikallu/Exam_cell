import { db } from "../server/db";
import { results, students } from "@shared/schema";
import { eq, and, ilike } from "drizzle-orm";

async function checkRecords() {
    const records = await db.select({
        id: results.id,
        academicYear: results.academicYear,
        examType: results.examType,
        grade: results.grade,
        semester: results.semester,
        subjectId: results.subjectId
    })
        .from(results)
        .innerJoin(students, eq(results.studentId, students.id))
        .where(
            and(
                eq(students.batch, "2021-2025"),
                ilike(results.academicYear, "%Jan%2024%"),
                ilike(results.grade, "%(REV)%")
            )
        );

    console.log(`Found ${records.length} records matching Jan 2024 with (REV) tag for 2021-2025.`);
    if (records.length > 0) {
        console.log("Sample records:");
        console.dir(records.slice(0, 5), { depth: null });
    }
    process.exit(0);
}

checkRecords().catch(console.error);
