import "dotenv/config";
import { db, pool } from "./server/db";
import { results, students, subjects } from "./shared/schema";
import { sql } from "drizzle-orm";

async function main() {
    try {
        console.log("Flushing database...");

        // Delete data from tables (respecting foreign key constraints)
        await db.delete(results);
        console.log("✅ Cleared results table");

        await db.delete(students);
        console.log("✅ Cleared students table");

        await db.delete(subjects);
        console.log("✅ Cleared subjects table");

        // Optional: Reset auto-increment sequences
        await db.execute(sql`ALTER SEQUENCE results_id_seq RESTART WITH 1`);
        await db.execute(sql`ALTER SEQUENCE students_id_seq RESTART WITH 1`);
        await db.execute(sql`ALTER SEQUENCE subjects_id_seq RESTART WITH 1`);
        console.log("✅ Reset ID sequences");

        console.log("🎉 Database successfully flushed! (Admins table was kept intact)");
        process.exit(0);
    } catch (e) {
        console.error("Error flushing database:", e);
        process.exit(1);
    }
}

main().finally(() => pool.end());
