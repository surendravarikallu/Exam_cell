import { db } from "./db";
import { admins, students, subjects, results, type Admin, type InsertAdmin, type Student, type InsertStudent, type Subject, type InsertSubject, type Result, type InsertResult, type StudentDetails } from "@shared/schema";
import { eq, and, desc, asc, sql, ilike, inArray, or } from "drizzle-orm";

export interface IStorage {
  getAdminByUsername(username: string): Promise<Admin | undefined>;
  getAdmins(): Promise<Omit<Admin, 'password'>[]>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;
  updateAdmin(id: number, admin: Partial<InsertAdmin>): Promise<Omit<Admin, 'password'> | undefined>;
  deleteAdmin(id: number): Promise<boolean>;
  getStudentByRoll(rollNumber: string): Promise<Student | undefined>;
  getStudent(id: number): Promise<StudentDetails | undefined>;
  searchStudents(query?: string, page?: number, limit?: number): Promise<{ data: Student[], total: number, page: number, totalPages: number }>;
  processResultsUpload(resultsData: any[], metadata: any): Promise<{ processed: number, skipped: number, errors: string[] }>;
  processStudentsUpload(studentsData: any[]): Promise<{ processed: number, errors: string[] }>;
  getBacklogs(filters?: any): Promise<any[]>;
  getCumulativeBacklogs(filters?: any): Promise<any[]>;
  getAnalytics(): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.username, username));
    return admin;
  }

  async getAdmins(): Promise<Omit<Admin, 'password'>[]> {
    const allAdmins = await db.select({ id: admins.id, username: admins.username }).from(admins);
    return allAdmins;
  }

  async createAdmin(admin: InsertAdmin): Promise<Admin> {
    const [newAdmin] = await db.insert(admins).values(admin).returning();
    return newAdmin;
  }

  async updateAdmin(id: number, data: Partial<InsertAdmin>): Promise<Omit<Admin, 'password'> | undefined> {
    const [updatedAdmin] = await db.update(admins)
      .set(data)
      .where(eq(admins.id, id))
      .returning({ id: admins.id, username: admins.username });
    return updatedAdmin;
  }

  async deleteAdmin(id: number): Promise<boolean> {
    const [deleted] = await db.delete(admins).where(eq(admins.id, id)).returning();
    return !!deleted;
  }

  async getStudentByRoll(rollNumber: string): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.rollNumber, rollNumber));
    return student;
  }

  async searchStudents(query?: string, page: number = 1, limit: number = 50): Promise<{ data: Student[], total: number, page: number, totalPages: number }> {
    const offset = (page - 1) * limit;

    let conditions = undefined;
    if (query) {
      conditions = sql`${students.rollNumber} ILIKE ${'%' + query + '%'} OR ${students.name} ILIKE ${'%' + query + '%'}`;
    }

    const baseQuery = db.select().from(students);
    const countQuery = db.select({ count: sql<number>`cast(count(${students.id}) as int)` }).from(students);

    if (conditions) {
      baseQuery.where(conditions);
      countQuery.where(conditions);
    }

    // Enforce ascending order as requested
    const data = await baseQuery.orderBy(asc(students.rollNumber)).limit(limit).offset(offset);
    const [{ count }] = await countQuery;

    return {
      data,
      total: count,
      page,
      totalPages: Math.ceil(count / limit) || 1
    };
  }

  async getStudent(id: number): Promise<StudentDetails | undefined> {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    if (!student) return undefined;

    const allResults = await db.select().from(results).where(eq(results.studentId, id));
    const allSubjects = await db.select().from(subjects).where(
      inArray(subjects.id, allResults.map(r => r.subjectId).concat([-1]))
    );

    const subjectMap = new Map(allSubjects.map(s => [s.id, s]));

    let sgpaPerSemester: Record<string, { totalPoints: number, totalCredits: number }> = {};
    let totalCredits = 0;
    let totalCreditPoints = 0; // Σ(Ci × Gi) across all semesters (for CGPA)
    let totalRegisteredCredits = 0; // Σ(Ci) across all semesters (for CGPA denominator)
    let backlogCount = 0;

    const resultsWithSubjects = allResults.map(r => {
      const subj = subjectMap.get(r.subjectId)!;

      if (r.isLatest) {
        const actualCredits = Math.max(subj.credits || 0, r.creditsEarned || 0);

        // Count backlogs
        if (r.status === 'BACKLOG') {
          backlogCount++;
        } else {
          // Only passed subjects contribute to earned credits
          totalCredits += actualCredits;
        }

        // JNTU SGPA formula: SGPA = Σ(Ci × Gi) / Σ(Ci) for ALL registered courses
        // Failed subjects: Gi = 0, but Ci still counts in denominator
        // Skip non-credit subjects (credits = 0) from GPA calculation entirely
        if (actualCredits > 0) {
          const subjectCredits = actualCredits;
          const gradePoints = r.status === 'BACKLOG' ? 0 : (r.gradePoints || 0);

          if (!sgpaPerSemester[r.semester]) {
            sgpaPerSemester[r.semester] = { totalPoints: 0, totalCredits: 0 };
          }
          // Numerator: Ci × Gi
          sgpaPerSemester[r.semester].totalPoints += gradePoints * subjectCredits;
          // Denominator: Ci (all registered subjects)
          sgpaPerSemester[r.semester].totalCredits += subjectCredits;

          // Accumulate for CGPA
          totalCreditPoints += gradePoints * subjectCredits;
          totalRegisteredCredits += subjectCredits;
        }
      }
      return { ...r, subject: subj };
    });

    const finalSgpa: Record<string, number> = {};
    for (const [sem, data] of Object.entries(sgpaPerSemester)) {
      finalSgpa[sem] = data.totalCredits > 0 ? Number((data.totalPoints / data.totalCredits).toFixed(2)) : 0;
    }

    // CGPA = Σ(Ci × Gi) over all semesters / Σ(Ci) over all semesters
    const cgpa = totalRegisteredCredits > 0 ? Number((totalCreditPoints / totalRegisteredCredits).toFixed(2)) : 0;

    return {
      ...student,
      results: resultsWithSubjects,
      sgpaPerSemester: finalSgpa,
      cgpa,
      totalCredits,
      backlogCount
    };
  }

  async processResultsUpload(resultsData: any[], metadata: { examType: string, academicYear: string, semester: string, branch: string, batch: string, regulation: string }): Promise<{ processed: number, skipped: number, errors: string[] }> {
    let processed = 0;
    let skipped = 0;
    let errors: string[] = [];

    // 0. Filter by active Batch using Roll Number prefix
    // E.g., batch "2023" means roll numbers start with "23"
    let targetPrefix = "";
    if (metadata.batch && metadata.batch.length >= 4) {
      targetPrefix = metadata.batch.substring(2, 4); // "2023" -> "23"
    }

    const validResultsData = targetPrefix ? resultsData.filter(r => {
      const rollStr = (r.RollNumber || "").toString().trim();
      return rollStr.startsWith(targetPrefix);
    }) : resultsData;

    skipped = resultsData.length - validResultsData.length;

    if (validResultsData.length === 0) {
      return { processed: 0, skipped, errors: ["No records matched the selected batch prefix."] };
    }

    // 1. Get unique rolls and subjects
    const uniqueRolls = Array.from(new Set(validResultsData.map(r => r.RollNumber).filter(Boolean)));
    const uniqueSubjects = Array.from(new Set(validResultsData.map(r => r.SubjectCode).filter(Boolean)));

    if (uniqueRolls.length === 0 || uniqueSubjects.length === 0) {
      return { processed: 0, skipped, errors: ["No valid records found in data."] };
    }

    // 2. Fetch existing students
    const existingStudents = await db.select().from(students).where(inArray(students.rollNumber, uniqueRolls));
    const studentMap = new Map(existingStudents.map(s => [s.rollNumber, s]));

    // 3. Insert missing students
    const missingStudentsData = [];
    for (const r of uniqueRolls) {
      if (!studentMap.has(r)) {
        const row = resultsData.find(x => x.RollNumber === r);
        missingStudentsData.push({
          rollNumber: r,
          name: row?.StudentName || 'Unknown',
          branch: metadata.branch,
          batch: metadata.academicYear,
          regulation: row?.Regulation && row?.Regulation !== "Unknown" ? row.Regulation : metadata.regulation
        });
      }
    }
    if (missingStudentsData.length > 0) {
      const chunks = [];
      for (let i = 0; i < missingStudentsData.length; i += 1000) {
        chunks.push(missingStudentsData.slice(i, i + 1000));
      }
      await Promise.all(chunks.map(chunk =>
        db.insert(students).values(chunk).onConflictDoNothing({ target: students.rollNumber })
      ));
      const allStudents = await db.select().from(students).where(inArray(students.rollNumber, uniqueRolls));
      for (const s of allStudents) {
        studentMap.set(s.rollNumber, s);
      }
    }

    // 3.5 Auto-heal existing student regulations if incorrect
    const studentsToUpdateReg = new Map();
    for (const r of resultsData) {
      const s = studentMap.get(r.RollNumber);
      if (s && r.Regulation && r.Regulation !== "Unknown" && s.regulation !== r.Regulation) {
        studentsToUpdateReg.set(s.id, r.Regulation);
        s.regulation = r.Regulation; // update map reference
      }
    }
    for (const [id, reg] of Array.from(studentsToUpdateReg.entries())) {
      await db.update(students).set({ regulation: reg }).where(eq(students.id, id));
    }

    // 4. Fetch existing subjects
    const existingSubjects = await db.select().from(subjects).where(inArray(subjects.subjectCode, uniqueSubjects));
    const subjectMap = new Map(existingSubjects.map(s => [s.subjectCode, s]));

    // 5. Insert missing subjects
    const missingSubjectsData = [];
    for (const c of uniqueSubjects) {
      if (!subjectMap.has(c)) {
        const row = validResultsData.find(x => x.SubjectCode === c);
        missingSubjectsData.push({
          subjectCode: c,
          subjectName: row?.SubjectName || 'Unknown Subject',
          credits: parseFloat(row?.Credits) || 0,
          semester: metadata.semester,
          branch: metadata.branch
        });
      }
    }
    if (missingSubjectsData.length > 0) {
      const chunks = [];
      for (let i = 0; i < missingSubjectsData.length; i += 1000) {
        chunks.push(missingSubjectsData.slice(i, i + 1000));
      }
      await Promise.all(chunks.map(chunk =>
        db.insert(subjects).values(chunk).onConflictDoNothing({ target: subjects.subjectCode })
      ));
      const allSubj = await db.select().from(subjects).where(inArray(subjects.subjectCode, uniqueSubjects));
      for (const s of allSubj) {
        subjectMap.set(s.subjectCode, s);
      }
    }

    // 5.5 Auto-heal truncated subject names and missing credits
    const subjectsToUpdateName = new Map();
    const subjectsToUpdateCredits = new Map();
    for (const r of validResultsData) {
      const s = subjectMap.get(r.SubjectCode);
      if (s) {
        if (r.SubjectName && r.SubjectName !== "Unknown Subject" && s.subjectName !== r.SubjectName) {
          // Sanitise: strip revaluation artefacts (e.g. "--- No") from the incoming name
          const cleanedName = r.SubjectName.replace(/\s*-{2,3}\s*No\s*$/i, "").trim();
          // Reject any name that still contains '---' — it's corrupted parser output
          if (!cleanedName.includes("---") && cleanedName && cleanedName.length > s.subjectName.length) {
            subjectsToUpdateName.set(s.id, cleanedName);
            s.subjectName = cleanedName; // update map reference
          }
        }

        // Auto-heal missing or lower credits
        const incomingCredits = parseFloat(r.Credits);
        if (!isNaN(incomingCredits) && incomingCredits > (s.credits || 0)) {
          subjectsToUpdateCredits.set(s.id, incomingCredits);
          s.credits = incomingCredits; // update map reference
        }
      }
    }
    for (const [id, name] of Array.from(subjectsToUpdateName.entries())) {
      await db.update(subjects).set({ subjectName: name }).where(eq(subjects.id, id));
    }
    for (const [id, credits] of Array.from(subjectsToUpdateCredits.entries())) {
      await db.update(subjects).set({ credits }).where(eq(subjects.id, id));
    }

    // 6. Pre-fetch all previous attempts for these students
    const studentIds = Array.from(studentMap.values()).map(s => s.id);
    let allExistingResults: typeof results.$inferSelect[] = [];
    if (studentIds.length > 0) {
      const chunks = [];
      for (let i = 0; i < studentIds.length; i += 500) {
        chunks.push(studentIds.slice(i, i + 500));
      }
      const resultsPerChunk = await Promise.all(chunks.map(chunk =>
        db.select().from(results).where(inArray(results.studentId, chunk))
      ));
      allExistingResults = resultsPerChunk.flat();
    }

    const previousAttemptsMap = new Map<string, typeof results.$inferSelect[]>();
    for (const r of allExistingResults) {
      const key = `${r.studentId}-${r.subjectId}`;
      if (!previousAttemptsMap.has(key)) previousAttemptsMap.set(key, []);
      previousAttemptsMap.get(key)!.push(r);
    }

    const resultsToInsert = [];
    const resultIdsToUpdateLatest = [];
    // For REVALUATION: track which existing result IDs need grade/status updates
    const resultUpdatesForRevaluation: { id: number, grade: string, gradePoints: number, creditsEarned: number, status: string }[] = [];

    // 7. Prepare results data sequentially in memory
    for (const row of validResultsData) {
      try {
        if (!row.RollNumber || !row.SubjectCode) continue;

        const student = studentMap.get(row.RollNumber);
        const subject = subjectMap.get(row.SubjectCode);
        if (!student || !subject) continue;

        const key = `${student.id}-${subject.id}`;
        const previousAttempts = previousAttemptsMap.get(key) || [];
        previousAttempts.sort((a, b) => b.attemptNo - a.attemptNo);

        const grade = row.Grade?.toString().toUpperCase().trim() || 'UNKNOWN';
        const credits = parseFloat(row.Credits) || 0;
        let isBacklog = false;

        // Explicit fail grades
        if (['F', 'ABSENT', 'AB', 'FAIL', 'UNKNOWN'].includes(grade)) {
          isBacklog = true;
        } else if (grade === 'CHANGE') {
          // JNTU Revaluation - mark was changed. If credits earned > 0, they passed.
          isBacklog = credits === 0;
        } else if (grade === 'COMPLE') {
          // Non-credit subject completed — always a pass
          isBacklog = false;
        }
        // All other valid grades (O, A+, A, B+, B, C, D, E, S) = PASS

        // ── REGULAR_REVALUATION / SUPPLY_REVALUATION update existing attempts in-place ──
        if (metadata.examType === 'REGULAR_REVALUATION' || metadata.examType === 'SUPPLY_REVALUATION') {
          // Find the most recent applicable attempt to update
          // For REGULAR_REVALUATION: Update the REGULAR attempt
          // For SUPPLY_REVALUATION: Update the latest SUPPLY attempt
          const targetType = metadata.examType === 'REGULAR_REVALUATION' ? 'REGULAR' : 'SUPPLY';

          const targetAttempt = previousAttempts
            .filter(a => a.examType === targetType)
            .sort((a, b) => b.attemptNo - a.attemptNo)[0];

          if (targetAttempt && targetAttempt.id) {
            // Only update if the revaluation actually changes something
            if (targetAttempt.grade !== grade) {
              resultUpdatesForRevaluation.push({
                id: targetAttempt.id,
                grade,
                gradePoints: parseInt(row.GradePoints) || 0,
                creditsEarned: isBacklog ? 0 : credits,
                status: isBacklog ? 'BACKLOG' : 'PASS',
              });
              // Update the in-memory reference as well
              targetAttempt.grade = grade;
              targetAttempt.status = isBacklog ? 'BACKLOG' : 'PASS';
              processed++;
            }
          }
          // Revaluation never creates a new result row — skip to next row
          continue;
        }

        // ── REGULAR / SUPPLY: normal attempt insertion logic ──

        // Prevent duplicate attempts if same file is uploaded twice
        const existingSameAttempt = previousAttempts.find(a =>
          a.examType === metadata.examType &&
          a.academicYear === metadata.academicYear &&
          a.semester === metadata.semester
        );

        if (existingSameAttempt) {
          continue; // Skip inserting duplicate
        }

        // Compute Attempt Number based on Exam Type rules
        let attemptNo = 1;
        if (metadata.examType === 'SUPPLY') {
          // Supply is always +1 over the highest previous attempt
          attemptNo = previousAttempts.length > 0 ? previousAttempts[0].attemptNo + 1 : 2;
        } else if (metadata.examType === 'REGULAR') {
          attemptNo = 1;
        }

        // Determine if they already passed this subject in a prior attempt
        let alreadyPassed = false;
        for (const old of previousAttempts) {
          if (old.status === 'PASS') {
            alreadyPassed = true;
          }
        }

        let isLatestForNew = true;

        // If they already passed, a new failing attempt shouldn't revoke their PASS status.
        if (alreadyPassed && isBacklog) {
          isLatestForNew = false;
        }

        if (isLatestForNew && previousAttempts.length > 0) {
          const latestOld = previousAttempts.filter(x => x.isLatest);
          for (const old of latestOld) {
            old.isLatest = false;
            resultIdsToUpdateLatest.push(old.id);
          }
        }

        const newResult = {
          studentId: student.id,
          subjectId: subject.id,
          semester: metadata.semester,
          academicYear: metadata.academicYear,
          examType: metadata.examType,
          attemptNo,
          grade: grade,
          gradePoints: parseInt(row.GradePoints) || 0,
          creditsEarned: isBacklog ? 0 : (parseFloat(row.Credits) || 0),
          status: isBacklog ? 'BACKLOG' : 'PASS',
          isLatest: isLatestForNew
        };

        resultsToInsert.push(newResult);
        previousAttempts.push(newResult as any);
        previousAttemptsMap.set(key, previousAttempts);

        processed++;
      } catch (err: any) {
        errors.push(`Error building record for ${row.RollNumber}: ${err.message}`);
      }
    }

    // 8. Execute Batch Updates (isLatest flags)
    if (resultIdsToUpdateLatest.length > 0) {
      const chunks = [];
      for (let i = 0; i < resultIdsToUpdateLatest.length; i += 1000) {
        chunks.push(resultIdsToUpdateLatest.slice(i, i + 1000));
      }
      await Promise.all(chunks.map(chunk =>
        db.update(results).set({ isLatest: false }).where(inArray(results.id, chunk))
      ));
    }

    // 8b. Revaluation grade in-place updates (small set — typically a few hundred max)
    for (const rev of resultUpdatesForRevaluation) {
      await db.update(results).set({
        grade: rev.grade,
        gradePoints: rev.gradePoints,
        creditsEarned: rev.creditsEarned,
        status: rev.status,
      }).where(eq(results.id, rev.id));
    }

    // 9. Execute Batch Inserts
    if (resultsToInsert.length > 0) {
      const chunks = [];
      for (let i = 0; i < resultsToInsert.length; i += 1000) {
        chunks.push(resultsToInsert.slice(i, i + 1000));
      }
      await Promise.all(chunks.map(chunk =>
        db.insert(results).values(chunk)
      ));
    }

    return { processed, skipped, errors };
  }

  async processStudentsUpload(studentsData: any[]): Promise<{ processed: number, errors: string[] }> {
    let processed = 0;
    let errors: string[] = [];

    const studentsToUpsert = [];

    for (const row of studentsData) {
      const rawRollNum = row.RollNumber || row.Roll_Number || row.roll_number || row.rollNumber || row["Roll Number"] || row["Roll number"] || row["ROLL NUMBER"];
      if (!rawRollNum) continue;

      const rollNumber = rawRollNum.toString().trim().toUpperCase();
      const name = (row.Name || row.StudentName || row.name || row["Student Name"] || row["student name"] || "Unknown").toString().trim();
      const branch = (row.Branch || row.branch || "Unknown").toString().trim().toUpperCase();
      const batch = (row.Batch || row.batch || "Unknown").toString().trim();
      const regulation = (row.Regulation || row.Reg || row.regulation || "Unknown").toString().trim().toUpperCase();

      if (!rollNumber) {
        errors.push("Skipped row with missing Roll Number.");
        continue;
      }

      studentsToUpsert.push({
        rollNumber,
        name,
        branch,
        batch,
        regulation
      });
      processed++;
    }

    if (studentsToUpsert.length > 0) {
      const chunks = [];
      for (let i = 0; i < studentsToUpsert.length; i += 1000) {
        chunks.push(studentsToUpsert.slice(i, i + 1000));
      }

      // Execute all chunk inserts in parallel
      await Promise.all(chunks.map(chunk =>
        db.insert(students)
          .values(chunk)
          .onConflictDoUpdate({
            target: students.rollNumber,
            set: {
              name: sql`EXCLUDED.name`,
              branch: sql`EXCLUDED.branch`,
              batch: sql`EXCLUDED.batch`,
              regulation: sql`EXCLUDED.regulation`
            }
          })
      ));
    }

    return { processed, errors };
  }

  async getBacklogs(filters: any = {}): Promise<any[]> {
    let conditions = [eq(results.isLatest, true), eq(results.status, 'BACKLOG')];
    if (filters.semester) conditions.push(eq(results.semester, filters.semester));
    // Note: batch filter is applied on students (see below), not on results

    // First, get all backlog rows matching result filters
    const backlogRows = await db.select({
      studentId: results.studentId,
      subjectId: results.subjectId,
      semester: results.semester,
      examType: results.examType
    }).from(results).where(and(...conditions));

    if (backlogRows.length === 0) return [];

    // Filter students by branch and/or batch
    let studentConditions: any[] = [inArray(students.id, Array.from(new Set(backlogRows.map(r => r.studentId))))];
    if (filters.branch) studentConditions.push(eq(students.branch, filters.branch));
    if (filters.batch) {
      // e.g. "2023-2027" -> "23" -> prefix "23JK"
      const startYearMatch = filters.batch.match(/^20(\d{2})/);
      if (startYearMatch) {
        const yy = startYearMatch[1];
        const prefix = `${yy}JK%`;
        studentConditions.push(or(
          eq(students.batch, filters.batch),
          ilike(students.rollNumber, prefix)
        ));
      } else {
        studentConditions.push(eq(students.batch, filters.batch));
      }
    }

    const studentRows = await db.select().from(students).where(and(...studentConditions));

    const subjectRows = await db.select().from(subjects).where(inArray(subjects.id, Array.from(new Set(backlogRows.map(r => r.subjectId)))));
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

    return resultList.sort((a, b) => b.backlogCount - a.backlogCount);
  }

  async getCumulativeBacklogs(filters: any = {}): Promise<any[]> {
    // This method fetches detailed performance for all students matching filters
    let studentConditions: any[] = [];
    if (filters.branch) studentConditions.push(eq(students.branch, filters.branch));
    if (filters.batch) {
      // e.g. "2023-2027" -> "23" -> prefix "23JK"
      const startYearMatch = filters.batch.match(/^20(\d{2})/);
      if (startYearMatch) {
        const yy = startYearMatch[1];
        const prefix = `${yy}JK%`;
        studentConditions.push(or(
          eq(students.batch, filters.batch),
          ilike(students.rollNumber, prefix)
        ));
      } else {
        studentConditions.push(eq(students.batch, filters.batch));
      }
    }

    const queryResult = await db.select({
      student: students,
      result: results,
      subject: subjects
    })
      .from(students)
      .innerJoin(results, eq(students.id, results.studentId))
      .innerJoin(subjects, eq(results.subjectId, subjects.id))
      .where(and(eq(results.isLatest, true), ...studentConditions));

    if (queryResult.length === 0) return [];

    const studentMap = new Map<number, typeof students.$inferSelect>();
    const resultsByStudent = new Map<number, any[]>();

    for (const row of queryResult) {
      if (!studentMap.has(row.student.id)) {
        studentMap.set(row.student.id, row.student);
        resultsByStudent.set(row.student.id, []);
      }
      resultsByStudent.get(row.student.id)!.push({ ...row.result, subject: row.subject });
    }

    const studentRows = Array.from(studentMap.values());

    const cumulativeData = [];

    for (const student of studentRows) {
      const studentResults = resultsByStudent.get(student.id) || [];

      const semesters = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
      const semesterData: Record<string, { backlogs: string[], backlogCount: number, sgpa: number, credits: number, registeredCredits: number, totalPoints: number }> = {};

      semesters.forEach(sem => {
        semesterData[sem] = { backlogs: [], backlogCount: 0, sgpa: 0, credits: 0, registeredCredits: 0, totalPoints: 0 };
      });

      let totalCredits = 0;
      let totalPointsForCgpa = 0;
      let totalRegisteredCredits = 0;
      let totalBacklogs = 0;

      for (const r of studentResults) {
        const subj = r.subject;
        if (!subj) continue;

        const sem = r.semester;
        if (!semesterData[sem]) {
          semesterData[sem] = { backlogs: [], backlogCount: 0, sgpa: 0, credits: 0, registeredCredits: 0, totalPoints: 0 };
        }

        const actualCredits = Math.max(subj.credits || 0, r.creditsEarned || 0);

        if (r.status === 'BACKLOG') {
          semesterData[sem].backlogs.push(subj.subjectName);
          semesterData[sem].backlogCount++;
          totalBacklogs++;

          if (actualCredits > 0) {
            semesterData[sem].registeredCredits += actualCredits;
            totalRegisteredCredits += actualCredits;
          }
        } else {
          totalCredits += actualCredits;
          if (actualCredits > 0) {
            semesterData[sem].credits += actualCredits;
            semesterData[sem].registeredCredits += actualCredits;
            semesterData[sem].totalPoints += r.gradePoints * actualCredits;
            totalRegisteredCredits += actualCredits;
            totalPointsForCgpa += r.gradePoints * actualCredits;
          }
        }
      }

      // Calculate SGPAs
      for (const sem of Object.keys(semesterData)) {
        semesterData[sem].sgpa = semesterData[sem].registeredCredits > 0
          ? Number((semesterData[sem].totalPoints / semesterData[sem].registeredCredits).toFixed(2))
          : 0;
      }

      const cgpa = totalRegisteredCredits > 0 ? Number((totalPointsForCgpa / totalRegisteredCredits).toFixed(2)) : 0;

      cumulativeData.push({
        student,
        semesterData,
        totalBacklogs,
        cgpa,
        totalCredits
      });
    }

    return cumulativeData.sort((a, b) => a.student.rollNumber.localeCompare(b.student.rollNumber));
  }

  async getCumulativeResults(filters: { branch?: string; batch?: string; year?: string }): Promise<any> {
    const studentConditions = [];
    if (filters.branch) studentConditions.push(eq(students.branch, filters.branch));
    if (filters.batch) studentConditions.push(eq(students.batch, filters.batch));

    // Get all relevant data in one query using joins to avoid N+1 and inArray bottlenecks
    const queryResult = await db.select({
      student: students,
      result: results
    })
      .from(students)
      .innerJoin(results, eq(students.id, results.studentId))
      .where(and(eq(results.isLatest, true), ...studentConditions));

    if (queryResult.length === 0) return { summary: {}, passed: [], failed: [] };

    const studentMap = new Map<number, typeof students.$inferSelect>();
    const resultsByStudent = new Map<number, (typeof results.$inferSelect)[]>();

    for (const row of queryResult) {
      if (!studentMap.has(row.student.id)) {
        studentMap.set(row.student.id, row.student);
        resultsByStudent.set(row.student.id, []);
      }
      resultsByStudent.get(row.student.id)!.push(row.result);
    }

    const studentRows = Array.from(studentMap.values());

    const yearMapping: Record<string, string[]> = {
      "1st": ["I", "II"],
      "2nd": ["III", "IV"],
      "3rd": ["V", "VI"],
      "4th": ["VII", "VIII"]
    };

    const targetSemesters = filters.year && filters.year !== "All"
      ? yearMapping[filters.year] || []
      : ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

    let passedStudents = [];
    let failedStudents = [];

    // Summary per semester requested
    const summary: Record<string, { registered: number; passed: number; failed: number }> = {};
    targetSemesters.forEach(sem => summary[sem] = { registered: 0, passed: 0, failed: 0 });

    for (const student of studentRows) {
      const studentResults = resultsByStudent.get(student.id) || [];
      let passedAllTargetSems = true;
      let registeredInTarget = false;

      targetSemesters.forEach(sem => {
        const semResults = studentResults.filter(r => r.semester === sem);
        if (semResults.length > 0) {
          registeredInTarget = true;
          summary[sem].registered++;
          const hasBacklog = semResults.some(r => r.status === "BACKLOG");
          if (hasBacklog) {
            summary[sem].failed++;
            passedAllTargetSems = false;
          } else {
            summary[sem].passed++;
          }
        }
      });

      if (registeredInTarget) {
        if (passedAllTargetSems) passedStudents.push(student);
        else failedStudents.push(student);
      }
    }

    return {
      summary,
      passed: passedStudents.sort((a, b) => a.rollNumber.localeCompare(b.rollNumber)),
      failed: failedStudents.sort((a, b) => a.rollNumber.localeCompare(b.rollNumber))
    };
  }

  async getToppers(filters: { branch?: string; batch?: string; type: string; semester?: string; year?: string; topN?: number }): Promise<any> {
    const studentConditions = [];
    if (filters.branch) studentConditions.push(eq(students.branch, filters.branch));
    if (filters.batch) studentConditions.push(eq(students.batch, filters.batch));

    const queryResult = await db.select({
      student: students,
      result: results,
      subject: subjects
    })
      .from(students)
      .innerJoin(results, eq(students.id, results.studentId))
      .innerJoin(subjects, eq(results.subjectId, subjects.id))
      .where(and(eq(results.isLatest, true), ...studentConditions));

    if (queryResult.length === 0) return [];

    const studentMap = new Map<number, typeof students.$inferSelect>();
    const resultsByStudent = new Map<number, any[]>();

    for (const row of queryResult) {
      if (!studentMap.has(row.student.id)) {
        studentMap.set(row.student.id, row.student);
        resultsByStudent.set(row.student.id, []);
      }
      resultsByStudent.get(row.student.id)!.push({ ...row.result, subject: row.subject });
    }

    const studentRows = Array.from(studentMap.values());

    const yearMapping: Record<string, string[]> = {
      "1st": ["I", "II"],
      "2nd": ["III", "IV"],
      "3rd": ["V", "VI"],
      "4th": ["VII", "VIII"]
    };

    const targetSemesters = filters.type === "Semester" && filters.semester
      ? [filters.semester]
      : filters.type === "Year" && filters.year
        ? yearMapping[filters.year] || []
        : [];

    if (targetSemesters.length === 0) return [];

    let eligibleStudents = [];

    for (const student of studentRows) {
      const studentAllResults = resultsByStudent.get(student.id) || [];
      if (studentAllResults.length === 0) continue;

      // Rule: Eligibility requires 0 active backlogs IN ANY SEMESTER
      const hasActiveBacklog = studentAllResults.some(r => r.status === "BACKLOG");
      if (hasActiveBacklog) continue;

      const studentTargetResults = studentAllResults.filter(r => targetSemesters.includes(r.semester));

      // Enforce the student has passed exams in ALL target semesters
      // E.g., a "Yearly" topper must have cleared subjects spanning BOTH Sem I and Sem II.
      const presentSemesters = new Set(studentTargetResults.map(r => r.semester));
      if (presentSemesters.size < targetSemesters.length) continue;

      // Toppers must clear everything in their first valid attempt (REGULAR) or REGULAR_REVALUATION.
      // If ANY result in the target timeframe is a SUPPLY or SUPPLY_REVALUATION attempt (even if passed), they are disqualified.
      const hasSupplyInTarget = studentTargetResults.some(r => r.examType === "SUPPLY" || r.examType === "SUPPLY_REVALUATION");
      if (hasSupplyInTarget) continue;

      let totalPoints = 0;
      let totalRegisteredCredits = 0;

      for (const r of studentTargetResults) {
        // Enforce only regular attempts count for ranking score (just in case they slipped through)
        if (!["REGULAR", "REGULAR_REVALUATION"].includes(r.examType)) continue;
        const subj = r.subject;
        if (!subj) continue;
        const actualCredits = Math.max(subj.credits || 0, r.creditsEarned || 0);

        if (actualCredits > 0) {
          totalRegisteredCredits += actualCredits;
          totalPoints += r.gradePoints * actualCredits;
        }
      }

      if (totalRegisteredCredits > 0) {
        const gpa = Number((totalPoints / totalRegisteredCredits).toFixed(2));
        eligibleStudents.push({ ...student, gpa });
      }
    }

    // Sort by GPA descending
    eligibleStudents.sort((a, b) => b.gpa - a.gpa);

    // Assign Ranks (handle ties)
    const rankedStudents = [];
    let currentRank = 1;
    let rankOffset = 0;
    let prevGpa = null;

    for (let i = 0; i < eligibleStudents.length; i++) {
      const s = eligibleStudents[i];
      if (prevGpa !== null && s.gpa < prevGpa) {
        currentRank += rankOffset;
        rankOffset = 1;
      } else if (prevGpa !== null && s.gpa === prevGpa) {
        rankOffset++;
      } else {
        rankOffset = 1;
      }
      rankedStudents.push({ ...s, rank: currentRank });
      prevGpa = s.gpa;
    }

    const topN = filters.topN || 5;
    return rankedStudents.filter(s => s.rank <= topN);
  }

  async getAnalytics(): Promise<any> {
    const allLatestResults = await db.select().from(results).where(eq(results.isLatest, true));
    const [{ count: studentCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(students);

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
      const studentIds = Array.from(new Set(backlogResults.map(r => r.studentId)));
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
      branchWiseBacklogs,
      totalStudents: studentCount
    };
  }

  /**
   * One-time cleanup: strip '--- No' revaluation artefacts from subject names in the DB.
   * Called automatically on server startup.
   */
  async cleanSubjectNames(): Promise<{ fixed: number }> {
    const allSubjects = await db.select().from(subjects);
    let fixed = 0;
    for (const subj of allSubjects) {
      const cleaned = subj.subjectName.replace(/\s*-{2,3}\s*No\s*$/i, '').trim();
      if (cleaned !== subj.subjectName && cleaned.length > 0) {
        await db.update(subjects).set({ subjectName: cleaned }).where(eq(subjects.id, subj.id));
        fixed++;
      }
    }
    if (fixed > 0) console.log(`[cleanup] Fixed ${fixed} corrupted subject name(s)`);
    return { fixed };
  }
}

export const storage = new DatabaseStorage();