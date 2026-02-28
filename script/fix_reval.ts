import { db } from "../server/db";
import { results, students } from "@shared/schema";
import { eq, and, ilike } from "drizzle-orm";

async function doUpdate() {
    const records = await db.select({
        id: results.id,
        grade: results.grade,
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

    console.log(`Found ${records.length} misuploaded revaluation records.`);

    if (records.length > 0) {
        let count = 0;
        // We update row-by-row because each grade transformation is unique
        for (const record of records) {
            const cleanedGrade = record.grade.replace("(REV)", "").trim();
            await db.update(results)
                .set({ grade: cleanedGrade })
                .where(eq(results.id, record.id));
            count++;
        }
        console.log(`Successfully stripped '(REV)' tags from ${count} records, converting them to standard Supply attempts.`);
    } else {
        console.log("No records needed fixing.");
    }
    process.exit(0);
}

doUpdate().catch(console.error);
