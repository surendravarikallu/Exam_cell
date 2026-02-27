import { db, pool } from "./db";
import { sql } from "drizzle-orm";

async function main() {
    try {
        console.log("Altering subjects table...");
        await db.execute(sql`ALTER TABLE subjects ALTER COLUMN credits TYPE double precision USING credits::double precision;`);
        console.log("Altering results table...");
        await db.execute(sql`ALTER TABLE results ALTER COLUMN credits_earned TYPE double precision USING credits_earned::double precision;`);
        console.log("Successfully altered columns.");
        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

main().finally(() => pool.end());
