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
import { parsePdfResults } from "./parser.js";

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

  // Seed DB and clean any corrupted subject names on start
  seedDatabase().catch(console.error);
  storage.cleanSubjectNames().catch(console.error);

  app.post(api.auth.login.path, async (req, res) => {
    try {
      const input = api.auth.login.input.parse(req.body);
      const admin = await storage.getAdminByUsername(input.username);

      if (!admin || !(await bcrypt.compare(input.password, admin.password))) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '1d' });
      res.json({ user: { id: admin.id, username: admin.username }, token });
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

      const { examType, academicYear, semester, branch, batch, regulation } = req.body;
      if (!examType || !academicYear || !semester || !branch || !batch) {
        return res.status(400).json({ message: 'Missing required metadata' });
      }

      const filePath = req.file.path;
      let data: any[] = [];
      let detectedRegulation = regulation || "Unknown";

      if (req.file.originalname.endsWith('.csv')) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        data = csvParse(fileContent, { columns: true, skip_empty_lines: true });
      } else if (req.file.originalname.match(/\.xlsx?$/)) {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
      } else if (req.file.originalname.endsWith('.pdf')) {
        // Use Node.js PDF parser utility
        const parserResponse = await parsePdfResults(filePath);
        data = parserResponse.results;

        if (parserResponse.regulation && parserResponse.regulation !== "Unknown") {
          detectedRegulation = parserResponse.regulation;
        }

        if (data.length === 0) {
          return res.status(400).json({ message: 'Could not extract valid result data from the provided PDF.' });
        }
      } else {
        return res.status(400).json({ message: 'Unsupported file type. Use PDF, CSV or Excel.' });
      }

      if (detectedRegulation === "Unknown") {
        return res.status(400).json({ message: 'Could not auto-detect regulation from PDF. Please provide it, or ensure the PDF contains valid subject codes.' });
      }

      const result = await storage.processResultsUpload(data, {
        examType, academicYear, semester, branch, batch, regulation: detectedRegulation
      });

      // Cleanup temp file
      fs.unlinkSync(filePath);

      res.json({ message: 'Upload processed', processed: result.processed, skipped: result.skipped, errors: result.errors });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post(api.upload.preview.path, requireAuth, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const { batch } = req.body;
      if (!batch) {
        return res.status(400).json({ message: 'Missing required metadata (Batch)' });
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
      } else if (req.file.originalname.endsWith('.pdf')) {
        const parserResponse = await parsePdfResults(filePath);
        data = parserResponse.results;
        if (data.length === 0) {
          return res.status(400).json({ message: 'Could not extract valid result data from the provided PDF.' });
        }
      } else {
        return res.status(400).json({ message: 'Unsupported file type. Use PDF, CSV or Excel.' });
      }

      // Filter logic matches storage layer
      let targetPrefix = "";
      if (batch && batch.length >= 4) {
        targetPrefix = batch.substring(2, 4);
      }

      const matchedRows = [];
      let skippedCount = 0;

      for (const row of data) {
        const rollStr = (row.RollNumber || "").toString().trim();
        if (targetPrefix && rollStr.startsWith(targetPrefix)) {
          matchedRows.push(row);
        } else if (!targetPrefix) {
          matchedRows.push(row);
        } else {
          skippedCount++;
        }
      }

      // Cleanup temp file since we don't save it from preview
      fs.unlinkSync(filePath);

      res.json({
        totalParsed: data.length,
        matchedCount: matchedRows.length,
        skippedCount: skippedCount,
        previewRows: matchedRows.slice(0, 10) // Only send the first 10 for safety
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post(api.upload.students.path, requireAuth, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const filePath = req.file.path;
      let data: any[] = [];

      if (req.file.originalname.endsWith('.csv')) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        data = csvParse(fileContent, { columns: true, skip_empty_lines: true, bom: true });
      } else if (req.file.originalname.match(/\.xlsx?$/)) {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
      } else {
        return res.status(400).json({ message: 'Unsupported file type. Use CSV or Excel.' });
      }

      const result = await storage.processStudentsUpload(data);

      // Cleanup temp file
      fs.unlinkSync(filePath);

      res.json({ message: 'Student data uploaded', processed: result.processed, errors: result.errors });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get('/api/students', requireAuth, async (req, res) => {
    const query = req.query.query as string | undefined;
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const students = await storage.searchStudents(query, page);
    res.json(students);
  });

  app.get('/api/students/:id', requireAuth, async (req, res) => {
    const student = await storage.getStudent(Number(req.params.id));
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json(student);
  });

  app.get(api.reports.backlog.path, requireAuth, async (req, res) => {
    const { branch, semester, batch } = req.query;
    const backlogs = await storage.getBacklogs({ branch, semester, batch });
    res.json(backlogs);
  });

  app.get(api.reports.cumulative.path, requireAuth, async (req, res) => {
    const { branch, batch } = req.query;
    const cumulative = await storage.getCumulativeBacklogs({ branch: branch as string, batch: batch as string });
    res.json(cumulative);
  });

  app.get(api.reports.cumulativeResults.path, requireAuth, async (req, res) => {
    const { branch, batch, year } = req.query;
    const results = await storage.getCumulativeResults({ branch: branch as string, batch: batch as string, year: year as string });
    res.json(results);
  });

  app.get(api.reports.batchTranscripts.path, requireAuth, async (req, res) => {
    const { branch, batch } = req.query;
    if (!branch || !batch) {
      return res.status(400).json({ message: "Branch and Batch are required" });
    }
    const transcripts = await storage.getBatchTranscripts(branch as string, batch as string);
    res.json(transcripts);
  });

  app.get(api.reports.toppers.path, requireAuth, async (req, res) => {
    const { branch, batch, type, semester, year, topN } = req.query;
    if (!type) {
      return res.status(400).json({ message: "Type is required" });
    }
    const results = await storage.getToppers({
      branch: branch as string,
      batch: batch as string,
      type: type as string,
      semester: semester as string,
      year: year as string,
      topN: topN ? parseInt(topN as string) : 5
    });
    res.json(results);
  });

  app.get(api.reports.analytics.path, requireAuth, async (req, res) => {
    const analytics = await storage.getAnalytics();
    res.json(analytics);
  });

  // Admin Management Routes
  app.get(api.admins.list.path, requireAuth, async (req, res) => {
    try {
      const allAdmins = await storage.getAdmins();
      res.json(allAdmins);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching admins' });
    }
  });

  app.post(api.admins.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.admins.create.input.parse(req.body);
      const existing = await storage.getAdminByUsername(input.username);
      if (existing) {
        return res.status(400).json({ message: 'Username already taken' });
      }
      const hashedPassword = await bcrypt.hash(input.password, 10);
      const newAdmin = await storage.createAdmin({ username: input.username, password: hashedPassword });
      res.json({ id: newAdmin.id, username: newAdmin.username });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.put(api.admins.update.path, requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.admins.update.input.parse(req.body);

      const updateData: any = { username: input.username };
      if (input.password) {
        updateData.password = await bcrypt.hash(input.password, 10);
      }

      const updatedAdmin = await storage.updateAdmin(id, updateData);
      if (!updatedAdmin) {
        return res.status(404).json({ message: 'Admin not found' });
      }
      res.json(updatedAdmin);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete(api.admins.delete.path, requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      // Prevent deleting the last admin or the currently logged-in admin
      const allAdmins = await storage.getAdmins();
      if (allAdmins.length <= 1) {
        return res.status(400).json({ message: 'Cannot delete the last admin account' });
      }
      // Note: we can't easily prevent deleting self unless req.user.id is checked, 
      // but assuming requireAuth adds user to req:
      if ((req as any).user?.id === id) {
        return res.status(400).json({ message: 'Cannot delete your own account while logged in' });
      }

      const deleted = await storage.deleteAdmin(id);
      if (!deleted) {
        return res.status(404).json({ message: 'Admin not found' });
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  return httpServer;
}

async function seedDatabase() {
  const existingAdmin = await storage.getAdminByUsername("admin");
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await storage.createAdmin({ username: "admin", password: hashedPassword });
    console.log("Seeded admin: admin / admin123");
  }
}