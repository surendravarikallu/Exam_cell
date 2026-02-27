import React from "react";
import { useParams, Link } from "wouter";
import { useStudentDetails } from "@/hooks/use-students";
import { Loader2, GraduationCap, Award, BookOpen, AlertCircle, ArrowLeft } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { formatSemester } from "@/lib/utils";

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
        className="relative rounded-3xl overflow-hidden glass-panel border-t border-slate-200"
      >
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-primary/20 via-amber-600/20 to-blue-900/20" />

        <div className="relative pt-16 px-8 pb-8 flex flex-col md:flex-row items-center md:items-end gap-6">
          <div className="w-24 h-24 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/20 border-4 border-white z-10">
            <GraduationCap className="w-12 h-12 text-white" />
          </div>

          <div className="flex-1 text-center md:text-left z-10">
            <h1 className="text-3xl font-display font-bold text-slate-900 mb-1">{student.name}</h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm text-slate-600">
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-bold">{student.rollNumber}</span>
              <span className="font-medium text-slate-700">{student.branch}</span>
              <span>•</span>
              <span className="font-medium text-slate-700">Batch {student.batch}</span>
              <span>•</span>
              <span className="font-medium text-slate-700">{student.regulation} Regulation</span>
            </div>
          </div>

          <div className="flex gap-4 z-10">
            <div className="text-center px-6 py-3 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-semibold">Overall CGPA</p>
              <p className="text-2xl font-display font-bold text-primary">{student.cgpa?.toFixed(2) || "N/A"}</p>
            </div>
            <div className="text-center px-6 py-3 rounded-2xl bg-destructive/5 border border-destructive/20 shadow-sm">
              <p className="text-xs text-destructive uppercase tracking-wider mb-1 font-semibold">Backlogs</p>
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
          <h3 className="text-lg font-display font-semibold text-slate-900 mb-6 flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            SGPA Progression
          </h3>
          <div className="h-[250px] w-full">
            {sgpaData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sgpaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSgpa" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(43, 96%, 56%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(43, 96%, 56%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis dataKey="sem" stroke="rgba(0,0,0,0.4)" tick={{ fontSize: 12, fill: 'rgba(0,0,0,0.6)' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 10]} stroke="rgba(0,0,0,0.4)" tick={{ fontSize: 12, fill: 'rgba(0,0,0,0.6)' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', color: '#0f172a' }}
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
          <h3 className="text-lg font-display font-semibold text-slate-900 mb-6 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Credits Info
          </h3>
          <div className="flex-1 flex flex-col justify-center gap-6">
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
              <div>
                <p className="text-sm text-slate-500 mb-1 font-medium">Total Earned Credits</p>
                <p className="text-3xl font-bold text-slate-900">{student.totalCredits || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Award className="w-6 h-6 text-primary" />
              </div>
            </div>

            {student.backlogCount > 0 && (
              <Dialog>
                <DialogTrigger asChild>
                  <div className="p-5 rounded-xl bg-destructive/5 border border-destructive/20 flex justify-between items-center cursor-pointer hover:bg-destructive/10 transition-colors">
                    <div>
                      <p className="text-sm text-destructive mb-1 font-medium hover:underline">Uncleared Subjects (Click to view)</p>
                      <p className="text-3xl font-bold text-destructive">{student.backlogCount}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
                      <AlertCircle className="w-6 h-6 text-destructive" />
                    </div>
                  </div>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Active Backlogs</DialogTitle>
                    <DialogDescription>
                      The following subjects have not yet been cleared by {student.name}.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="max-h-[60vh] overflow-y-auto pr-2 mt-4 space-y-3">
                    {student.results
                      ?.filter((r: any) => r.isLatest && r.status === 'BACKLOG')
                      .map((result: any, i: number) => (
                        <div key={i} className="flex justify-between items-start p-3 rounded-lg border border-slate-200 bg-slate-50">
                          <div>
                            <p className="font-semibold text-slate-900 text-sm">{result.subject?.subjectName}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{result.subject?.subjectCode}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-medium px-2 py-1 rounded bg-slate-200 text-slate-700">Sem {result.semester}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </motion.div>
      </div>

      {/* Detailed Results Table - Pivoted by Subject */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-panel rounded-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <h3 className="text-lg font-display font-semibold text-slate-900 flex items-center gap-2">
            Subject-wise Results History
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <th className="p-3 pl-4">SNo</th>
                <th className="p-3">Exam Code</th>
                <th className="p-3 min-w-[180px]">Subject</th>
                <th className="p-3 text-center">Regular</th>
                <th className="p-3 text-center">Supp1</th>
                <th className="p-3 text-center">Supp2</th>
                <th className="p-3 text-center">Supp3</th>
                <th className="p-3 text-center">Supp4</th>
                <th className="p-3 text-center">Supp5</th>
                <th className="p-3 text-center">Supp6</th>
                <th className="p-3 text-center">Supp7</th>
                <th className="p-3 text-center">Supp8</th>
                <th className="p-3 text-center font-bold text-slate-700">Grade</th>
                <th className="p-3 pr-4 text-center">Credits</th>
              </tr>
            </thead>
            <tbody>
              {student.results && student.results.length > 0 ? (() => {
                // Group results by semester, then by subjectCode
                const semesterMap: Record<string, Record<string, any[]>> = {};
                for (const r of student.results) {
                  const sem = r.semester || "Unknown";
                  const code = r.subject?.subjectCode || r.subjectId;
                  if (!semesterMap[sem]) semesterMap[sem] = {};
                  if (!semesterMap[sem][code]) semesterMap[sem][code] = [];
                  semesterMap[sem][code].push(r);
                }

                let globalSno = 0;
                return Object.entries(semesterMap).map(([semester, subjectMap]) => {
                  const subjectEntries = Object.entries(subjectMap);
                  return (
                    <React.Fragment key={semester}>
                      {/* Semester header row */}
                      <tr className="bg-slate-200/60">
                        <td
                          colSpan={14}
                          className="p-2 pl-4 text-xs font-bold text-slate-600 uppercase tracking-widest border-y border-slate-200"
                        >
                          {formatSemester(semester)}
                        </td>
                      </tr>
                      {subjectEntries.map(([code, attempts]) => {
                        globalSno++;
                        // Sort all attempts by attemptNo
                        const sorted = [...attempts].sort((a, b) => a.attemptNo - b.attemptNo);

                        // Filter out revaluation-no-change rows (grade === 'CHANGE')
                        // These should NOT occupy a Supp column slot
                        const realAttempts = sorted.filter(
                          a => a.grade?.toUpperCase()?.trim() !== 'CHANGE'
                        );
                        const hasRevaluation = sorted.some(
                          a => a.grade?.toUpperCase()?.trim() === 'CHANGE'
                        );

                        // Slot-based lookup: idx 0 = Regular, idx 1 = Supp1 ... idx 8 = Supp8
                        const attemptForSlot = (idx: number) => {
                          return realAttempts[idx] || null;
                        };

                        // Use last real attempt for final Grade/Credits/Status
                        const latest = realAttempts[realAttempts.length - 1] ?? sorted[sorted.length - 1];
                        const isPass = latest?.status === "PASS";

                        return (
                          <tr
                            key={code}
                            className="border-b border-slate-100 hover:bg-amber-50/30 transition-colors"
                          >
                            <td className="p-3 pl-4 text-slate-500 tabular-nums">{globalSno}</td>
                            <td className="p-3 font-mono text-xs text-slate-700">{code}</td>
                            <td className="p-3 text-slate-900 font-medium leading-snug">
                              {latest?.subject?.subjectName || "—"}
                            </td>
                            {/* Regular = slot 0 */}
                            <td className="p-3 text-center">
                              {(() => {
                                const a = attemptForSlot(0);
                                if (!a) return <span className="text-slate-200">—</span>;
                                const g = a.grade;
                                const isFail = g === 'F';
                                return (
                                  <div className="flex flex-col items-center">
                                    <span className={isFail ? 'text-destructive font-bold' : 'text-slate-700 font-medium'}>{g}</span>
                                    <span className="text-[10px] text-slate-400 mt-1 whitespace-nowrap">{a.academicYear}</span>
                                  </div>
                                );
                              })()}
                            </td>
                            {/* Supp1–Supp8 = slots 1–8 */}
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((slotIdx) => {
                              const a = attemptForSlot(slotIdx);
                              if (!a) return <td key={slotIdx} className="p-3 text-center"><span className="text-slate-200">—</span></td>;
                              const g = a.grade;
                              const isFail = g === 'F';
                              return (
                                <td key={slotIdx} className="p-3 text-center">
                                  <div className="flex flex-col items-center">
                                    <span className={isFail ? 'text-destructive font-bold' : 'text-slate-600 font-medium'}>{g}</span>
                                    <span className="text-[10px] text-slate-400 mt-1 whitespace-nowrap">{a.academicYear}</span>
                                  </div>
                                </td>
                              );
                            })}
                            {/* Final Grade — with optional Rev badge if revaluation was filed */}
                            <td className="p-3 text-center">
                              <span className={`font-bold text-base ${isPass ? 'text-primary' : 'text-destructive'}`}>
                                {latest?.grade || "—"}
                              </span>
                              {hasRevaluation && (
                                <span className="ml-1 text-[9px] font-semibold px-1 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-300 align-middle">Rev</span>
                              )}
                            </td>
                            {/* Credits */}
                            <td className="p-3 pr-4 text-center text-slate-700 font-medium">
                              {latest?.subject?.credits ?? "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                });
              })() : (
                <tr>
                  <td colSpan={14} className="p-8 text-center text-muted-foreground">
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
