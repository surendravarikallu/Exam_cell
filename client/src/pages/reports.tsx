import React, { useState } from "react";
import { useBacklogReports } from "@/hooks/use-reports";
import { FileWarning, Loader2, Download, Filter } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";

export default function Reports() {
  const [branch, setBranch] = useState("");
  const [semester, setSemester] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  
  const { data: backlogs, isLoading } = useBacklogReports({ branch, semester, academicYear });

  const exportToCSV = () => {
    if (!backlogs || backlogs.length === 0) return;
    
    // Quick frontend CSV generation
    const headers = ["Roll Number", "Name", "Branch", "Semester", "Subject Code", "Subject Name", "Attempts"];
    const rows = backlogs.map((b: any) => [
      b.rollNumber,
      b.name,
      b.branch,
      b.semester,
      b.subjectCode,
      `"${b.subjectName}"`,
      b.attemptNo
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `backlogs_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Backlog Reports</h1>
          <p className="text-muted-foreground mt-1">Identify and track students requiring supplementary exams.</p>
        </div>
        
        <button
          onClick={exportToCSV}
          disabled={!backlogs || backlogs.length === 0}
          className="px-6 py-2.5 rounded-xl font-medium bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-6 rounded-2xl flex flex-wrap items-end gap-4"
      >
        <div className="flex items-center gap-2 w-full mb-2 md:hidden text-primary font-medium">
          <Filter className="w-4 h-4" /> Filters
        </div>
        <div className="space-y-2 flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Branch</label>
          <select 
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none text-sm"
          >
            <option value="">All Branches</option>
            <option value="CSE">CSE</option>
            <option value="ECE">ECE</option>
            <option value="EEE">EEE</option>
            <option value="MECH">Mechanical</option>
            <option value="CIVIL">Civil</option>
          </select>
        </div>
        <div className="space-y-2 flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Semester</label>
          <select 
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none text-sm"
          >
            <option value="">All Semesters</option>
            {["I", "II", "III", "IV", "V", "VI", "VII", "VIII"].map(sem => (
              <option key={sem} value={sem}>Semester {sem}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2 flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Academic Year</label>
          <input 
            type="text"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            placeholder="e.g., 2023-2024"
            className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
        </div>
      </motion.div>

      {/* Results Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p>Generating report...</p>
          </div>
        ) : !backlogs || backlogs.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
              <FileWarning className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-display font-semibold text-white mb-2">No backlogs found</h3>
            <p className="text-muted-foreground">Excellent! No active backlogs match your criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-black/20 text-sm font-medium text-muted-foreground">
                  <th className="p-4 pl-6">Student</th>
                  <th className="p-4">Branch/Sem</th>
                  <th className="p-4">Failed Subject</th>
                  <th className="p-4 text-center">Attempts</th>
                  <th className="p-4 pr-6 text-right">View Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {backlogs.map((record: any, i: number) => (
                  <motion.tr 
                    key={`${record.studentId}-${record.subjectId}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.05, 0.5) }}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="p-4 pl-6">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">{record.name}</span>
                        <span className="text-xs text-muted-foreground">{record.rollNumber}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-white">{record.branch}</span>
                      <span className="text-xs text-muted-foreground ml-2">Sem {record.semester}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-sm text-destructive font-medium">{record.subjectName}</span>
                        <span className="text-xs text-muted-foreground">{record.subjectCode}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/10 text-xs font-bold text-white">
                        {record.attemptNo}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <Link 
                        href={`/students/${record.studentId}`}
                        className="text-primary hover:text-primary/80 text-sm font-medium hover:underline transition-colors"
                      >
                        Profile
                      </Link>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
