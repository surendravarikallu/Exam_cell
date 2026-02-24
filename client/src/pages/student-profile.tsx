import React from "react";
import { useParams } from "wouter";
import { useStudentDetails } from "@/hooks/use-students";
import { Loader2, GraduationCap, Award, BookOpen, AlertCircle } from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";
import { motion } from "framer-motion";

export default function StudentProfile() {
  const { id } = useParams();
  const { data: student, isLoading } = useStudentDetails(id || "");

  if (isLoading || !student) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-muted-foreground">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p>Loading student profile...</p>
      </div>
    );
  }

  // Format SGPA data for chart
  const sgpaData = student.sgpaPerSemester 
    ? Object.entries(student.sgpaPerSemester).map(([sem, sgpa]) => ({ sem: `Sem ${sem}`, sgpa }))
    : [];

  return (
    <div className="space-y-8">
      {/* Header Profile Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl overflow-hidden glass-panel border-t border-white/20"
      >
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-primary/20 via-amber-600/20 to-blue-900/20" />
        
        <div className="relative pt-16 px-8 pb-8 flex flex-col md:flex-row items-center md:items-end gap-6">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center shadow-xl shadow-primary/30 border-4 border-card">
            <GraduationCap className="w-12 h-12 text-primary-foreground" />
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-display font-bold text-white mb-1">{student.name}</h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm text-muted-foreground">
              <span className="px-3 py-1 rounded-full bg-white/10 text-white font-medium">{student.rollNumber}</span>
              <span>{student.branch}</span>
              <span>•</span>
              <span>Batch {student.batch}</span>
              <span>•</span>
              <span>{student.regulation} Regulation</span>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="text-center px-6 py-3 rounded-2xl bg-white/5 border border-white/10">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Overall CGPA</p>
              <p className="text-2xl font-display font-bold text-primary">{student.cgpa?.toFixed(2) || "N/A"}</p>
            </div>
            <div className="text-center px-6 py-3 rounded-2xl bg-destructive/10 border border-destructive/20">
              <p className="text-xs text-destructive/80 uppercase tracking-wider mb-1">Backlogs</p>
              <p className="text-2xl font-display font-bold text-destructive">{student.backlogCount || 0}</p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Academic Performance Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 glass-panel p-6 rounded-2xl"
        >
          <h3 className="text-lg font-display font-semibold text-white mb-6 flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            SGPA Progression
          </h3>
          <div className="h-[250px] w-full">
            {sgpaData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sgpaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSgpa" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(43, 96%, 56%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(43, 96%, 56%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="sem" stroke="rgba(255,255,255,0.4)" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 10]} stroke="rgba(255,255,255,0.4)" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(222, 47%, 9%)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  />
                  <Area type="monotone" dataKey="sgpa" stroke="hsl(43, 96%, 56%)" strokeWidth={3} fillOpacity={1} fill="url(#colorSgpa)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                No semester data available yet.
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel p-6 rounded-2xl flex flex-col"
        >
          <h3 className="text-lg font-display font-semibold text-white mb-6 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Credits Info
          </h3>
          <div className="flex-1 flex flex-col justify-center gap-6">
            <div className="p-5 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Earned Credits</p>
                <p className="text-3xl font-bold text-white">{student.totalCredits || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Award className="w-6 h-6 text-primary" />
              </div>
            </div>
            
            {student.backlogCount > 0 && (
              <div className="p-5 rounded-xl bg-destructive/10 border border-destructive/20 flex justify-between items-center">
                <div>
                  <p className="text-sm text-destructive/80 mb-1">Uncleared Subjects</p>
                  <p className="text-3xl font-bold text-destructive">{student.backlogCount}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-destructive" />
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Detailed Results Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-panel rounded-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-white/10 bg-white/5">
          <h3 className="text-lg font-display font-semibold text-white flex items-center gap-2">
            Subject-wise Results History
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-black/20 text-sm font-medium text-muted-foreground">
                <th className="p-4 pl-6">Semester</th>
                <th className="p-4">Subject Code & Name</th>
                <th className="p-4">Credits</th>
                <th className="p-4">Grade</th>
                <th className="p-4">Type & Attempt</th>
                <th className="p-4 pr-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {student.results && student.results.length > 0 ? (
                student.results.map((result: any, i: number) => (
                  <tr key={result.id || i} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 pl-6 text-white font-medium">{result.semester}</td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">{result.subject?.subjectName}</span>
                        <span className="text-xs text-muted-foreground">{result.subject?.subjectCode}</span>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">{result.subject?.credits}</td>
                    <td className="p-4">
                      <span className={`font-bold ${result.status === 'PASS' ? 'text-primary' : 'text-destructive'}`}>
                        {result.grade}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-white w-max">
                          {result.examType}
                        </span>
                        <span className="text-xs text-muted-foreground">Attempt #{result.attemptNo}</span>
                      </div>
                    </td>
                    <td className="p-4 pr-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${
                        result.status === 'PASS' 
                          ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                          : 'bg-destructive/10 text-destructive border-destructive/20'
                      }`}>
                        {result.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No results recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
