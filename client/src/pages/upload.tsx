import React, { useState, useRef, useEffect } from "react";
import { useUploadResults, useUploadStudents, useUploadPreview } from "@/hooks/use-upload";
import { UploadCloud, FileType, CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function UploadResults() {
  const [file, setFile] = useState<File | null>(null);
  const [examType, setExamType] = useState("REGULAR");
  const [examMonth, setExamMonth] = useState("November");
  const [examYear, setExamYear] = useState(new Date().getFullYear().toString());
  const [semester, setSemester] = useState("I");
  const [branch, setBranch] = useState("ALL");
  const [batch, setBatch] = useState(`${new Date().getFullYear()}-${new Date().getFullYear() + 4}`);
  const [regulation, setRegulation] = useState("Unknown");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutateAsync: uploadPreview, isPending: isPreviewing } = useUploadPreview();
  const { mutateAsync: uploadResults, isPending: isResultsPending } = useUploadResults();
  const { mutateAsync: uploadStudents, isPending: isStudentsPending } = useUploadStudents();

  // Preview Modal State
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  const [timer, setTimer] = useState(0);

  // Student Data specific state
  const [studentFile, setStudentFile] = useState<File | null>(null);
  const [isDraggingStudent, setIsDraggingStudent] = useState(false);
  const studentFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isResultsPending || isStudentsPending || isPreviewing) {
      setTimer(0);
      interval = setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isResultsPending, isStudentsPending, isPreviewing]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragOverStudent = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingStudent(true);
  };

  const handleDragLeave = () => setIsDragging(false);
  const handleDragLeaveStudent = () => setIsDraggingStudent(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleDropStudent = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingStudent(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setStudentFile(e.dataTransfer.files[0]);
    }
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentFile) return;

    const formData = new FormData();
    formData.append("file", studentFile);

    try {
      await uploadStudents(formData);
      setStudentFile(null);
    } catch (err) { }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const monthYear = `${examMonth} ${examYear}`;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("batch", batch);
    formData.append("regulation", regulation);

    try {
      // 1. Fetch preview data first
      const data = await uploadPreview(formData);
      setPreviewData(data);
      setShowPreviewDialog(true);
    } catch (err) {
      // Error handled by hook's toast
    }
  };

  const handleConfirmUpload = async () => {
    if (!file) return;

    const monthYear = `${examMonth} ${examYear}`;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("examType", examType);
    formData.append("academicYear", monthYear);
    formData.append("semester", semester);
    formData.append("branch", branch);
    formData.append("batch", batch);
    formData.append("regulation", regulation);

    try {
      await uploadResults(formData);
      setFile(null); // Reset on success
      setShowPreviewDialog(false);
    } catch (err) {
      // Error handled by hook's toast
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900">Data Upload</h1>
        <p className="text-slate-500 mt-1">Centralized hub for importing academic results and student master directories.</p>
      </div>

      <Tabs defaultValue="results" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-100/50 p-1 rounded-xl">
          <TabsTrigger value="results" className="text-base py-3 rounded-lg font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary">Upload Results</TabsTrigger>
          <TabsTrigger value="students" className="text-base py-3 rounded-lg font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary">Student Directory</TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="mt-0 outline-none">
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-slate-200 shadow-sm p-8 rounded-2xl space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Exam Type</label>
                <select
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none font-medium"
                >
                  <option value="REGULAR">REGULAR</option>
                  <option value="REGULAR_REVALUATION">REGULAR_REVALUATION</option>
                  <option value="SUPPLY">SUPPLY</option>
                  <option value="SUPPLY_REVALUATION">SUPPLY_REVALUATION</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Results Month</label>
                <select
                  value={examMonth}
                  onChange={(e) => setExamMonth(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none font-medium"
                >
                  {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Results Year</label>
                <select
                  value={examYear}
                  onChange={(e) => setExamYear(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none font-medium"
                >
                  {Array.from({ length: 10 }, (_, i) => (2020 + i).toString()).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Semester</label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none font-medium"
                >
                  {["I", "II", "III", "IV", "V", "VI", "VII", "VIII"].map(sem => (
                    <option key={sem} value={sem}>Semester {sem}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Branch</label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none font-medium"
                >
                  <option value="ALL">All Branches</option>
                  <option value="CSE">CSE</option>
                  <option value="ECE">ECE</option>
                  <option value="EEE">EEE</option>
                  <option value="MECH">Mechanical</option>
                  <option value="CIVIL">Civil</option>
                  <option value="CSE(AIML)">CSE(AIML)</option>
                  <option value="CSE(DS)">CSE(DS)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Batch</label>
                <select
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none font-medium"
                >
                  {Array.from({ length: 15 }, (_, i) => { const y = 2015 + i; return <option key={y} value={`${y}-${y + 4}`}>{`${y}-${y + 4}`}</option>; }).reverse()}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Regulation</label>
                <select
                  value={regulation}
                  onChange={(e) => setRegulation(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none font-medium"
                >
                  <option value="Unknown">Auto-Detect (PDF Only)</option>
                  <option value="R23">R23</option>
                  <option value="R20">R20</option>
                  <option value="R19">R19</option>
                  <option value="R16">R16</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Upload Data File</label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 bg-slate-50
                  ${isDragging ? 'border-primary bg-primary/5' : 'border-slate-300 hover:border-primary/50'}
                  ${file ? 'bg-primary/5 border-primary/50' : ''}
                `}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files && setFile(e.target.files[0])}
                  className="hidden"
                  accept=".pdf, application/pdf, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                />

                <AnimatePresence mode="wait">
                  {file ? (
                    <motion.div
                      key="file-selected"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex flex-col items-center"
                    >
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <CheckCircle className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="text-lg font-medium text-slate-900">{file.name}</h3>
                      <p className="text-sm text-slate-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                        className="mt-4 px-4 py-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-colors text-sm font-medium"
                      >
                        Remove File
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="upload-prompt"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex flex-col items-center"
                    >
                      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
                        <UploadCloud className="w-8 h-8 text-primary/70" />
                      </div>
                      <h3 className="text-lg font-medium text-slate-900">Click or drag file to this area to upload</h3>
                      <p className="text-sm text-slate-500 mt-1">Support for PDF, CSV or Excel files</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={!file || isPreviewing}
                className={`px-8 py-3.5 rounded-xl font-bold text-lg bg-primary text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2 ${isPreviewing ? 'opacity-80 cursor-wait transform-none' : 'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'}`}
              >
                {isPreviewing ? (
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating Preview...
                    </div>
                  </div>
                ) : (
                  <>
                    Preview & Upload
                  </>
                )}
              </button>
            </div>
          </motion.form>
        </TabsContent>

        <TabsContent value="students" className="mt-0 outline-none">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <form
              onSubmit={handleStudentSubmit}
              className="bg-white border border-slate-200 shadow-sm p-8 rounded-2xl space-y-8"
            >
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-display font-bold text-slate-900 mb-1">Upload Master Student Directory</h2>
                  <p className="text-slate-500 text-sm">Upload an Excel/CSV file containing all student details (Roll Number, Name, Branch, etc.) to link results to actual names instead of 'TBA'.</p>
                </div>

                <div
                  onDragOver={handleDragOverStudent}
                  onDragLeave={handleDragLeaveStudent}
                  onDrop={handleDropStudent}
                  onClick={() => studentFileInputRef.current?.click()}
                  className={`
                    relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 bg-slate-50
                    ${isDraggingStudent ? 'border-primary bg-primary/5' : 'border-slate-300 hover:border-primary/50'}
                    ${studentFile ? 'bg-primary/5 border-primary/50' : ''}
                  `}
                >
                  <input
                    type="file"
                    ref={studentFileInputRef}
                    onChange={(e) => e.target.files && setStudentFile(e.target.files[0])}
                    className="hidden"
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  />

                  <AnimatePresence mode="wait">
                    {studentFile ? (
                      <motion.div
                        key="student-file-selected"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex flex-col items-center"
                      >
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                          <CheckCircle className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">{studentFile.name}</h3>
                        <p className="text-sm text-slate-500 mt-1">{(studentFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setStudentFile(null); }}
                          className="mt-4 px-4 py-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-colors text-sm font-medium"
                        >
                          Remove File
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="student-upload-prompt"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex flex-col items-center"
                      >
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
                          <FileType className="w-8 h-8 text-primary/70" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">Click or drag data file to upload</h3>
                        <p className="text-sm text-slate-500 mt-1">Required Columns: Roll Number, Name, Branch, Batch, Regulation</p>
                        <a
                          href="/student_template.csv"
                          download
                          onClick={(e) => e.stopPropagation()}
                          className="mt-6 px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-primary hover:border-primary/30 transition-all text-sm font-medium flex items-center gap-2 shadow-sm"
                        >
                          <FileType className="w-4 h-4" />
                          Download CSV Template
                        </a>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={!studentFile || isStudentsPending}
                  className={`px-8 py-3.5 rounded-xl font-bold text-lg bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:shadow-xl hover:shadow-slate-900/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2 ${isStudentsPending ? 'opacity-80 cursor-wait transform-none' : 'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'}`}
                >
                  {isStudentsPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Syncing Master Data...
                    </>
                  ) : (
                    <>
                      Sync Master Directory
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Smart Preview Confirmation Modal */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display text-slate-900">Upload Preview</DialogTitle>
            <DialogDescription>
              Review the processed results before committing them to the database.
            </DialogDescription>
          </DialogHeader>

          {previewData && (
            <div className="mt-4 flex-1 overflow-auto space-y-6 px-1">
              {/* Summary Stats Widget */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                  <p className="text-sm font-medium text-slate-500 mb-1">Total Parsed</p>
                  <p className="text-3xl font-display font-bold text-slate-800">{previewData.totalParsed}</p>
                </div>
                <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl text-center">
                  <p className="text-sm font-medium text-primary mb-1">Row Matches (To Save)</p>
                  <p className="text-3xl font-display font-bold text-primary">{previewData.matchedCount}</p>
                </div>
                <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-xl text-center">
                  <p className="text-sm font-medium text-destructive mb-1">Rows Skipped</p>
                  <p className="text-3xl font-display font-bold text-destructive">{previewData.skippedCount}</p>
                </div>
              </div>

              {previewData.skippedCount > previewData.matchedCount && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-800">High Skipped Row Count</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      The parser skipped more rows than it matched. The uploaded file likely contains data across multiple batches. Only rows prefixed with <span className="font-bold">'{batch.substring(2, 4)}'</span> will be saved for this Batch ({batch}).
                    </p>
                  </div>
                </div>
              )}

              {/* Data Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">First 10 Matched Rows Data</h3>
                  <span className="text-xs font-medium px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-600 shadow-sm">
                    {examType} • {semester}
                  </span>
                </div>
                {previewData.previewRows && previewData.previewRows.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-100/50 text-slate-500 uppercase text-xs tracking-wider">
                        <tr>
                          <th className="px-4 py-3 font-medium">Roll No</th>
                          <th className="px-4 py-3 font-medium">Sub Code</th>
                          <th className="px-4 py-3 font-medium">Sub Name</th>
                          <th className="px-4 py-3 font-medium text-center">Cr</th>
                          <th className="px-4 py-3 font-medium text-center">Gr</th>
                          <th className="px-4 py-3 font-medium text-center">Pts</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewData.previewRows.map((row: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-slate-900">{row.RollNumber}</td>
                            <td className="px-4 py-3 font-mono text-slate-600 text-xs">{row.SubjectCode}</td>
                            <td className="px-4 py-3 text-slate-700 truncate max-w-xs">{row.SubjectName}</td>
                            <td className="px-4 py-3 text-center text-slate-600">{row.Credits}</td>
                            <td className="px-4 py-3 text-center font-bold text-slate-800">{row.Grade}</td>
                            <td className="px-4 py-3 text-center text-slate-600">{row.GradePoints}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500">
                    No data matched the selected Batch criteria.
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="mt-6 border-t border-slate-100 pt-6">
            <Button
              variant="outline"
              onClick={() => setShowPreviewDialog(false)}
              disabled={isResultsPending}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmUpload}
              disabled={isResultsPending || (previewData && previewData.matchedCount === 0)}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white"
            >
              {isResultsPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving ({timer}s)...
                </>
              ) : (
                <>Confirm & Save Results</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
