import { db } from "../server/db";
import { results, students } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";

async function clearResults() {
    console.log("Locating 2-2 (Semester IV) records for Batch 2021-2025...");

    // Find the exact records to delete
    const records = await db.select({ id: results.id })
        .from(results)
        .innerJoin(students, eq(results.studentId, students.id))
        .where(
            and(
                eq(students.batch, "2021-2025"),
                eq(results.semester, "IV")
            )
        );

    console.log(`Found ${records.length} records matching 2-2 for batch 2021-2025.`);

    if (records.length > 0) {
        const idsToDelete = records.map(r => r.id);

        // Chunk deletions to avoid statement size limits
        const chunks = [];
        for (let i = 0; i < idsToDelete.length; i += 1000) {
            chunks.push(idsToDelete.slice(i, i + 1000));
        }

        let deletedCount = 0;
        for (const chunk of chunks) {
            await db.delete(results).where(inArray(results.id, chunk));
            deletedCount += chunk.length;
        }

        console.log(`Successfully deleted ${deletedCount} records for 2-2 (Semester IV), Batch 2021-2025.`);
    } else {
        console.log("No records found to delete! Make sure the parameters match existing records.");
    }

    process.exit(0);
}

clearResults().catch(console.error);
