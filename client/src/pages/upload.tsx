import React, { useState, useRef } from "react";
import { useUploadResults } from "@/hooks/use-upload";
import { UploadCloud, FileType, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function UploadResults() {
  const [file, setFile] = useState<File | null>(null);
  const [examType, setExamType] = useState("REGULAR");
  const [academicYear, setAcademicYear] = useState("2023-2024");
  const [semester, setSemester] = useState("I");
  const [branch, setBranch] = useState("ALL");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutateAsync: uploadResults, isPending } = useUploadResults();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("examType", examType);
    formData.append("academicYear", academicYear);
    formData.append("semester", semester);
    formData.append("branch", branch);

    try {
      await uploadResults(formData);
      setFile(null); // Reset on success
    } catch (err) {
      // Error is handled by hook's toast
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-white">Upload Results</h1>
        <p className="text-muted-foreground mt-1">Import student grades via CSV or Excel sheets.</p>
      </div>

      <motion.form 
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-8 rounded-3xl space-y-8"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Exam Type</label>
            <select 
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
            >
              <option value="REGULAR">Regular</option>
              <option value="SUPPLY">Supplementary</option>
              <option value="REVALUATION">Revaluation</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Academic Year</label>
            <input 
              type="text"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="e.g., 2023-2024"
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Semester</label>
            <select 
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
            >
              {["I", "II", "III", "IV", "V", "VI", "VII", "VIII"].map(sem => (
                <option key={sem} value={sem}>Semester {sem}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Branch</label>
            <select 
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
            >
              <option value="ALL">All Branches</option>
              <option value="CSE">CSE</option>
              <option value="ECE">ECE</option>
              <option value="EEE">EEE</option>
              <option value="MECH">Mechanical</option>
              <option value="CIVIL">Civil</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Upload Data File</label>
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300
              ${isDragging ? 'border-primary bg-primary/10' : 'border-white/20 hover:border-primary/50 hover:bg-white/5'}
              ${file ? 'bg-primary/5 border-primary/50' : ''}
            `}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={(e) => e.target.files && setFile(e.target.files[0])}
              className="hidden" 
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
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
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-medium text-white">{file.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
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
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-white">Click or drag file to this area to upload</h3>
                  <p className="text-sm text-muted-foreground mt-1">Support for CSV or Excel files</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={!file || isPending}
            className="px-8 py-3.5 rounded-xl font-bold text-lg bg-gradient-to-r from-primary to-amber-500 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Upload & Process Results
              </>
            )}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
