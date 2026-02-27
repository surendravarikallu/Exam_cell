import { db } from './server/db';
import { results, subjects, students } from './shared/schema';

async function flush() {
    console.log('Initiating database flush...');

    // Results depends on subjects and students, delete first
    console.log('Clearing results table...');
    await db.delete(results);

    console.log('Clearing subjects table...');
    await db.delete(subjects);

    console.log('Clearing students table...');
    await db.delete(students);

    console.log('Database successfully flushed (Users excluded).');
    process.exit(0);
}

flush().catch(err => {
    console.error(err);
    process.exit(1);
});
