import { db } from "../server/db";
import { results } from "../shared/schema";
import { eq, or, inArray, asc } from "drizzle-orm";

// Helper function to convert JNTU Month Year string (e.g. "January 2024", "June 2025") into a sortable Date
function parseAcademicYear(academicYear: string): Date {
    // Try parsing directly. If it fails or is invalid, return a very old date so it goes first.
    const date = new Date(academicYear);
    if (isNaN(date.getTime())) {
        return new Date("2000-01-01");
    }
    return date;
}

async function runUpdates() {
    console.log("Starting database retroactive update for Attempt Numbers...");

    try {
        // We need to re-evaluate attemptNo for every student/subject combination
        const allResults = await db.select().from(results);

        // Group by studentId + subjectId
        const groups = new Map<string, typeof results.$inferSelect[]>();
        for (const r of allResults) {
            const key = `${r.studentId}-${r.subjectId}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(r);
        }

        let fixCount = 0;

        for (const [key, attempts] of groups.entries()) {
            if (attempts.length <= 1) continue; // No sorting needed for single attempts

            // Sort attempts chronologically
            attempts.sort((a, b) => parseAcademicYear(a.academicYear).getTime() - parseAcademicYear(b.academicYear).getTime());

            // Re-assign attempt numbers based on the chronological timeline
            // Note: Revaluation attempts don't get their own attempt number structurally in the app's display logic
            // but they share the attemptNo of the attempt they revaluated.
            // Easiest is to number them 1, 2, 3 chronologically.

            let currentAttemptNo = 1;

            for (const attempt of attempts) {
                // Only update if it's currently wrong
                if (attempt.attemptNo !== currentAttemptNo) {
                    await db.update(results)
                        .set({ attemptNo: currentAttemptNo })
                        .where(eq(results.id, attempt.id));
                    fixCount++;
                }
                currentAttemptNo++;
            }
        }

        console.log(`Successfully fixed attempt numbers for ${fixCount} out-of-order records.`);
    } catch (error) {
        console.error("Error updating database:", error);
    } finally {
        process.exit(0);
    }
}

runUpdates();
