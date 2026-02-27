import { db, pool } from './server/db';
import { admins, students, subjects, results } from '@shared/schema';
import * as fs from 'fs';
import * as path from 'path';

function toCSV(data: any[]): string {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const rows = data.map(row =>
        headers.map(fieldName => {
            let val = row[fieldName];
            if (val === null || val === undefined) val = '';
            else if (val instanceof Date) val = val.toISOString();
            else val = val.toString();
            // Escape quotes and wrap in quotes if contains comma
            val = val.replace(/"/g, '""');
            if (val.includes(',') || val.includes('"') || val.includes('\n')) {
                val = `"${val}"`;
            }
            return val;
        }).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
}

async function backup() {
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const folderPath = path.join(backupDir, `backup_${timestamp}`);
    fs.mkdirSync(folderPath);

    console.log(`Starting backup to ${folderPath}...`);

    try {
        const allAdmins = await db.select().from(admins);
        fs.writeFileSync(path.join(folderPath, 'admins.csv'), toCSV(allAdmins));
        console.log(`- Exported ${allAdmins.length} admins`);

        const allStudents = await db.select().from(students);
        fs.writeFileSync(path.join(folderPath, 'students.csv'), toCSV(allStudents));
        console.log(`- Exported ${allStudents.length} students`);

        const allSubjects = await db.select().from(subjects);
        fs.writeFileSync(path.join(folderPath, 'subjects.csv'), toCSV(allSubjects));
        console.log(`- Exported ${allSubjects.length} subjects`);

        const allResults = await db.select().from(results);
        fs.writeFileSync(path.join(folderPath, 'results.csv'), toCSV(allResults));
        console.log(`- Exported ${allResults.length} results`);

        console.log('Backup completed successfully.');
    } catch (error) {
        console.error('Backup failed:', error);
    } finally {
        process.exit(0);
    }
}

backup();
