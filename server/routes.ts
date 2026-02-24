import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import multer from "multer";
import { parse as csvParse } from "csv-parse/sync";
import * as xlsx from "xlsx";
import fs from "fs";
import path from "path";

const JWT_SECRET = process.env.SESSION_SECRET || 'super-secret-key-123';
const upload = multer({ dest: 'uploads/' });

// Auth Middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Seed DB on start
  seedDatabase().catch(console.error);

  app.post(api.auth.login.path, async (req, res) => {
    try {
      const input = api.auth.login.input.parse(req.body);
      const admin = await storage.getAdminByEmail(input.email);
      
      if (!admin || !(await bcrypt.compare(input.password, admin.password))) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = jwt.sign({ id: admin.id, email: admin.email }, JWT_SECRET, { expiresIn: '1d' });
      res.json({ user: { id: admin.id, email: admin.email }, token });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get(api.auth.me.path, requireAuth, (req, res) => {
    res.json({ user: (req as any).user });
  });

  app.post(api.auth.logout.path, (req, res) => {
    res.json({ message: 'Logged out' });
  });

  app.post(api.upload.results.path, requireAuth, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const { examType, academicYear, semester, branch, regulation } = req.body;
      if (!examType || !academicYear || !semester || !branch || !regulation) {
        return res.status(400).json({ message: 'Missing required metadata' });
      }

      const filePath = req.file.path;
      let data: any[] = [];

      if (req.file.originalname.endsWith('.csv')) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        data = csvParse(fileContent, { columns: true, skip_empty_lines: true });
      } else if (req.file.originalname.match(/\.xlsx?$/)) {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
      } else {
        return res.status(400).json({ message: 'Unsupported file type. Use CSV or Excel.' });
      }

      const result = await storage.processResultsUpload(data, {
        examType, academicYear, semester, branch, regulation
      });

      // Cleanup temp file
      fs.unlinkSync(filePath);

      res.json({ message: 'Upload processed', processed: result.processed, errors: result.errors });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get(api.students.search.path, requireAuth, async (req, res) => {
    const query = req.query.query as string | undefined;
    const students = await storage.searchStudents(query);
    res.json(students);
  });

  app.get(api.students.get.path, requireAuth, async (req, res) => {
    const student = await storage.getStudent(Number(req.params.id));
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json(student);
  });

  app.get(api.reports.backlog.path, requireAuth, async (req, res) => {
    const { branch, semester, academicYear } = req.query;
    const backlogs = await storage.getBacklogs({ branch, semester, academicYear });
    res.json(backlogs);
  });

  app.get(api.reports.analytics.path, requireAuth, async (req, res) => {
    const analytics = await storage.getAnalytics();
    res.json(analytics);
  });

  return httpServer;
}

async function seedDatabase() {
  const existingAdmin = await storage.getAdminByEmail("admin@kits.edu");
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await storage.createAdmin({ email: "admin@kits.edu", password: hashedPassword });
    console.log("Seeded admin: admin@kits.edu / admin123");
  }
}