import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  rollNumber: text("roll_number").notNull().unique(),
  name: text("name").notNull(),
  branch: text("branch").notNull(),
  batch: text("batch").notNull(),
  regulation: text("regulation").notNull(),
});

export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  subjectCode: text("subject_code").notNull().unique(),
  subjectName: text("subject_name").notNull(),
  credits: doublePrecision("credits").notNull(),
  semester: text("semester").notNull(),
  branch: text("branch").notNull(),
});

export const results = pgTable("results", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => students.id),
  subjectId: integer("subject_id").notNull().references(() => subjects.id),
  semester: text("semester").notNull(),
  academicYear: text("academic_year").notNull(),
  examType: text("exam_type").notNull(), // REGULAR, SUPPLY, REVALUATION
  attemptNo: integer("attempt_no").notNull(),
  grade: text("grade").notNull(),
  gradePoints: integer("grade_points").notNull(),
  creditsEarned: doublePrecision("credits_earned").notNull(),
  status: text("status").notNull(), // PASS, BACKLOG
  isLatest: boolean("is_latest").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    // Unique constraint to prevent concurrent duplicate uploads
    uniqueResultIdx: uniqueIndex("unique_result_idx").on(
      table.studentId,
      table.subjectId,
      table.examType,
      table.academicYear
    )
  };
});

// Base schemas
export const insertAdminSchema = createInsertSchema(admins).pick({
  username: true,
  password: true,
}).extend({
  username: z.string().min(3),
  password: z.string().min(6), // Enforce minimum password length
});
export const insertStudentSchema = createInsertSchema(students).omit({ id: true });
export const insertSubjectSchema = createInsertSchema(subjects).omit({ id: true });
export const insertResultSchema = createInsertSchema(results).omit({ id: true, createdAt: true });

// Explicit types
export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;

export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;

export type Subject = typeof subjects.$inferSelect;
export type InsertSubject = z.infer<typeof insertSubjectSchema>;

export type Result = typeof results.$inferSelect;
export type InsertResult = z.infer<typeof insertResultSchema>;

export type ResultWithRelations = Result & {
  subject: Subject;
};

export type StudentDetails = Student & {
  results: ResultWithRelations[];
  sgpaPerSemester: Record<string, number>;
  cgpa: number;
  totalCredits: number;
  backlogCount: number;
};

export type AuthResponse = {
  user: { id: number; email: string } | null;
  token?: string;
};