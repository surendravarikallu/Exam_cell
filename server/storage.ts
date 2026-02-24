import { db } from "./db";
import { admins, students, subjects, results, type Admin, type InsertAdmin, type Student, type InsertStudent, type Subject, type InsertSubject, type Result, type InsertResult, type StudentDetails } from "@shared/schema";
import { eq, and, desc, sql, ilike, inArray } from "drizzle-orm";

export interface IStorage {
  getAdminByEmail(email: string): Promise<Admin | undefined>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;
  getStudentByRoll(rollNumber: string): Promise<Student | undefined>;
  getStudent(id: number): Promise<StudentDetails | undefined>;
  searchStudents(query?: string): Promise<Student[]>;
  processResultsUpload(resultsData: any[], metadata: any): Promise<{processed: number, errors: string[]}>;
  getBacklogs(filters?: any): Promise<any[]>;
  getAnalytics(): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  async getAdminByEmail(email: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.email, email));
    return admin;
  }
  
  async createAdmin(admin: InsertAdmin): Promise<Admin> {
    const [newAdmin] = await db.insert(admins).values(admin).returning();
    return newAdmin;
  }

  async getStudentByRoll(rollNumber: string): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.rollNumber, rollNumber));
    return student;
  }

  async searchStudents(query?: string): Promise<Student[]> {
    if (!query) {
      return await db.select().from(students).limit(50);
    }
    return await db.select().from(students).where(
      sql`${students.rollNumber} ILIKE ${'%' + query + '%'} OR ${students.name} ILIKE ${'%' + query + '%'}`
    ).limit(50);
  }

  async getStudent(id: number): Promise<StudentDetails | undefined> {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    if (!student) return undefined;

    const allResults = await db.select().from(results).where(eq(results.studentId, id));
    const allSubjects = await db.select().from(subjects).where(
      inArray(subjects.id, allResults.map(r => r.subjectId).concat([-1]))
    );
    
    const subjectMap = new Map(allSubjects.map(s => [s.id, s]));
    
    let sgpaPerSemester: Record<string, {totalPoints: number, totalCredits: number}> = {};
    let totalCredits = 0;
    let totalPointsForCgpa = 0;
    let backlogCount = 0;

    const resultsWithSubjects = allResults.map(r => {
      const subj = subjectMap.get(r.subjectId)!;
      if (r.isLatest) {
        if (r.status === 'BACKLOG') {
          backlogCount++;
        } else {
          totalCredits += r.creditsEarned;
          totalPointsForCgpa += r.gradePoints * subj.credits;
          
          if (!sgpaPerSemester[r.semester]) {
             sgpaPerSemester[r.semester] = { totalPoints: 0, totalCredits: 0 };
          }
          sgpaPerSemester[r.semester].totalPoints += r.gradePoints * subj.credits;
          sgpaPerSemester[r.semester].totalCredits += subj.credits;
        }
      }
      return { ...r, subject: subj };
    });

    const finalSgpa: Record<string, number> = {};
    for (const [sem, data] of Object.entries(sgpaPerSemester)) {
      finalSgpa[sem] = data.totalCredits > 0 ? Number((data.totalPoints / data.totalCredits).toFixed(2)) : 0;
    }

    const cgpa = totalCredits > 0 ? Number((totalPointsForCgpa / totalCredits).toFixed(2)) : 0;

    return {
      ...student,
      results: resultsWithSubjects,
      sgpaPerSemester: finalSgpa,
      cgpa,
      totalCredits,
      backlogCount
    };
  }

  async processResultsUpload(resultsData: any[], metadata: { examType: string, academicYear: string, semester: string, branch: string, regulation: string }): Promise<{processed: number, errors: string[]}> {
    let processed = 0;
    let errors: string[] = [];

    for (const row of resultsData) {
      try {
        // Find or create student
        let [student] = await db.select().from(students).where(eq(students.rollNumber, row.RollNumber));
        if (!student) {
          [student] = await db.insert(students).values({
            rollNumber: row.RollNumber,
            name: row.StudentName || 'Unknown',
            branch: metadata.branch,
            batch: metadata.academicYear,
            regulation: metadata.regulation
          }).returning();
        }

        // Find or create subject
        let [subject] = await db.select().from(subjects).where(eq(subjects.subjectCode, row.SubjectCode));
        if (!subject) {
          [subject] = await db.insert(subjects).values({
            subjectCode: row.SubjectCode,
            subjectName: row.SubjectName || 'Unknown Subject',
            credits: parseInt(row.Credits) || 0,
            semester: metadata.semester,
            branch: metadata.branch
          }).returning();
        }

        // Check previous attempts
        const previousAttempts = await db.select().from(results).where(
          and(eq(results.studentId, student.id), eq(results.subjectId, subject.id))
        ).orderBy(desc(results.attemptNo));

        const attemptNo = previousAttempts.length > 0 ? previousAttempts[0].attemptNo + 1 : 1;

        if (previousAttempts.length > 0) {
          await db.update(results)
            .set({ isLatest: false })
            .where(and(eq(results.studentId, student.id), eq(results.subjectId, subject.id)));
        }

        const grade = row.Grade?.toString().toUpperCase().trim();
        let isBacklog = false;
        if (grade === 'F' || grade === 'ABSENT' || grade === 'AB' || !row.Credits || parseInt(row.Credits) === 0) {
           isBacklog = true;
        }

        await db.insert(results).values({
          studentId: student.id,
          subjectId: subject.id,
          semester: metadata.semester,
          academicYear: metadata.academicYear,
          examType: metadata.examType,
          attemptNo,
          grade: grade,
          gradePoints: parseInt(row.GradePoints) || 0,
          creditsEarned: isBacklog ? 0 : (parseInt(row.Credits) || 0),
          status: isBacklog ? 'BACKLOG' : 'PASS',
          isLatest: true
        });

        processed++;
      } catch (err: any) {
        errors.push(`Error processing ${row.RollNumber}: ${err.message}`);
      }
    }

    return { processed, errors };
  }

  async getBacklogs(filters: any = {}): Promise<any[]> {
    let conditions = [eq(results.isLatest, true), eq(results.status, 'BACKLOG')];
    if (filters.semester) conditions.push(eq(results.semester, filters.semester));
    if (filters.academicYear) conditions.push(eq(results.academicYear, filters.academicYear));
    
    // First, get backlogs matching result filters
    let backlogsQuery = db.select({
      studentId: results.studentId,
      subjectId: results.subjectId,
      semester: results.semester,
      examType: results.examType
    }).from(results).where(and(...conditions));
    
    const backlogRows = await backlogsQuery;
    
    if (backlogRows.length === 0) return [];

    // Get relevant students
    let studentConditions: any[] = [inArray(students.id, [...new Set(backlogRows.map(r => r.studentId))])];
    if (filters.branch) studentConditions.push(eq(students.branch, filters.branch));
    
    const studentRows = await db.select().from(students).where(and(...studentConditions));
    const studentMap = new Map(studentRows.map(s => [s.id, s]));
    
    const subjectRows = await db.select().from(subjects).where(inArray(subjects.id, [...new Set(backlogRows.map(r => r.subjectId))]));
    const subjectMap = new Map(subjectRows.map(s => [s.id, s]));

    // Aggregate by student
    const resultList: any[] = [];
    
    for (const s of studentRows) {
      const studentBacklogs = backlogRows.filter(r => r.studentId === s.id);
      resultList.push({
        student: s,
        backlogCount: studentBacklogs.length,
        subjects: studentBacklogs.map(b => subjectMap.get(b.subjectId))
      });
    }

    return resultList.sort((a,b) => b.backlogCount - a.backlogCount);
  }

  async getAnalytics(): Promise<any> {
    const allLatestResults = await db.select().from(results).where(eq(results.isLatest, true));
    
    const totalResults = allLatestResults.length;
    const passedResults = allLatestResults.filter(r => r.status === 'PASS').length;
    const passPercentage = totalResults > 0 ? (passedResults / totalResults) * 100 : 0;

    // Most failed subjects
    const failedCounts: Record<number, number> = {};
    allLatestResults.filter(r => r.status === 'BACKLOG').forEach(r => {
      failedCounts[r.subjectId] = (failedCounts[r.subjectId] || 0) + 1;
    });

    const sortedFailures = Object.entries(failedCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const mostFailedSubjects = [];
    for (const [subjId, count] of sortedFailures) {
      const [subj] = await db.select().from(subjects).where(eq(subjects.id, Number(subjId)));
      if (subj) {
        mostFailedSubjects.push({ name: subj.subjectName, count });
      }
    }

    // Branch wise backlogs
    const backlogResults = allLatestResults.filter(r => r.status === 'BACKLOG');
    const branchCounts: Record<string, number> = {};
    
    // get students for these backlogs
    if (backlogResults.length > 0) {
       const studentIds = [...new Set(backlogResults.map(r => r.studentId))];
       const studs = await db.select().from(students).where(inArray(students.id, studentIds));
       const sMap = new Map(studs.map(s => [s.id, s.branch]));
       
       backlogResults.forEach(r => {
         const b = sMap.get(r.studentId) || 'Unknown';
         branchCounts[b] = (branchCounts[b] || 0) + 1;
       });
    }

    const branchWiseBacklogs = Object.entries(branchCounts).map(([name, value]) => ({ name, value }));

    return {
      passPercentage: Number(passPercentage.toFixed(1)),
      mostFailedSubjects,
      branchWiseBacklogs
    };
  }
}

export const storage = new DatabaseStorage();