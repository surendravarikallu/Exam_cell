import { db } from "../server/db";
import { results, students } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";

async function doUpdate() {
    const records = await db.select({ id: results.id, academicYear: results.academicYear })
        .from(results)
        .innerJoin(students, eq(results.studentId, students.id))
        .where(
            and(
                eq(students.batch, "2022-2026"),
                eq(results.semester, "I"),
                eq(results.examType, "SUPPLY"),
                eq(results.academicYear, "June 2024")
            )
        );

    console.log(`Found ${records.length} records in Drizzle Query to fix.`);

    if (records.length > 0) {
        const ids = records.map(r => r.id);

        const chunks = [];
        for (let i = 0; i < ids.length; i += 1000) {
            chunks.push(ids.slice(i, i + 1000));
        }

        let processed = 0;
        for (const chunk of chunks) {
            await db.update(results)
                .set({ academicYear: 'June 2025' })
                .where(inArray(results.id, chunk));
            processed += chunk.length;
        }
        console.log(`Successfully updated ${processed} records to 'June 2025' for 1-1 Supply (Batch 2022-2026)`);
    } else {
        console.log("No records found to update!");
    }
    process.exit(0);
}

doUpdate().catch(console.error);
