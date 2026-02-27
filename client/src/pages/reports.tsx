import React, { useState } from "react";
import { useBacklogReports } from "@/hooks/use-reports";
import { FileWarning, Loader2, Download, Filter, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatSemester } from "@/lib/utils";

export default function Reports() {
  const [branch, setBranch] = useState("");
  const [semester, setSemester] = useState("");
  const [batch, setBatch] = useState("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const { data: backlogs, isLoading } = useBacklogReports({ branch, semester, batch });

  const exportToCSV = () => {
    if (!backlogs || backlogs.length === 0) return;

    // Quick frontend CSV generation
    const headers = ["Roll Number", "Name", "Branch", "Semester", "Subject Code", "Subject Name", "Attempts"];
    const rows = backlogs.map((b: any) => [
      b.student?.rollNumber || b.rollNumber,
      b.student?.name || b.name,
      b.student?.branch || b.branch,
      b.semester || "Multiple",
      b.subjectCode || "Multiple",
      `"${b.subjectName || "Multiple"}"`,
      b.attemptNo || b.backlogCount || 1
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\n"
      + rows.map((e: any[]) => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `backlogs_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = async () => {
    try {
      setIsGeneratingPdf(true);

      // Fetch cumulative backlogs
      const response = await fetch(`/api/reports/cumulative-backlogs?branch=${branch}&batch=${batch}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) throw new Error("Failed to fetch cumulative data");
      const data = await response.json();

      if (!data || data.length === 0) {
        alert("No data available for the selected filters.");
        return;
      }

      const doc = new jsPDF('landscape', 'pt', 'a4');
      const pageW = doc.internal.pageSize.width;
      const LEFT_PAD = 30;

      // ── Load full header image from /public and embed it ──
      const headerDataUrl = await new Promise<string>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          canvas.getContext('2d')!.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve('');
        img.src = '/Screenshot 2025-07-25 113411_1753423944040.webp';
      });

      // Header image dimensions: full page width, proportional height
      const HEADER_IMG_H = headerDataUrl ? 72 : 0;
      if (headerDataUrl) {
        doc.addImage(headerDataUrl, 'PNG', 0, 0, pageW, HEADER_IMG_H);
      }

      // Thin separator line below header image
      const HEADER_BOTTOM = HEADER_IMG_H + 2;
      doc.setDrawColor('#aaa');
      doc.setLineWidth(0.5);
      doc.line(LEFT_PAD, HEADER_BOTTOM, pageW - LEFT_PAD, HEADER_BOTTOM);

      // ── Report Title ──
      const TITLE_Y = HEADER_BOTTOM + 14;
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor('#000');
      doc.text('BACKLOGS REPORT', pageW / 2, TITLE_Y, { align: 'center' });
      doc.setLineWidth(0.4);
      doc.line(pageW / 2 - 58, TITLE_Y + 2, pageW / 2 + 58, TITLE_Y + 2);

      // ── Metadata row ──
      const META_Y = TITLE_Y + 16;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor('#000');
      doc.text('Course: B.TECH', LEFT_PAD, META_Y);
      doc.text(`Branch: ${branch || 'ALL'}`, pageW / 2, META_Y, { align: 'center' });
      doc.text(`Batch: ${batch || 'ALL'}`, pageW - LEFT_PAD, META_Y, { align: 'right' });

      const HEADER_HEIGHT = META_Y; // used as startY reference below


      const semesters = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

      // Short label for PDF column header (e.g. "1Y S1", "2Y S1")
      const semShortLabel = (s: string) => {
        const labels: Record<string, string> = {
          "I": "1Yr\nSem1", "II": "1Yr\nSem2",
          "III": "2Yr\nSem1", "IV": "2Yr\nSem2",
          "V": "3Yr\nSem1", "VI": "3Yr\nSem2",
          "VII": "4Yr\nSem1", "VIII": "4Yr\nSem2",
        };
        return labels[s] ?? s;
      };

      // Table Headers Data
      const head = [
        [
          { content: 'Sno', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Roll No', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Name of the Student', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          ...semesters.map(sem => ({ content: semShortLabel(sem), colSpan: 4, styles: { halign: 'center' } })),
          { content: 'Total\nBlgs', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'CGPA', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Tot.\nCrs', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
        ],
        [
          ...Array(8).fill([
            { content: 'Backlogs', styles: { halign: 'center' } },
            { content: 'Blgs', styles: { halign: 'center' } },
            { content: 'Crs', styles: { halign: 'center' } },
            { content: 'SGPA', styles: { halign: 'center' } }
          ]).flat()
        ]
      ];

      // Format Body Rows
      const body = data.map((item: any, index: number) => {
        const row = [
          index + 1,
          item.student.rollNumber,
          item.student.name,
        ];

        semesters.forEach(sem => {
          const sData = item.semesterData[sem] || { backlogs: [], backlogCount: 0, credits: 0, sgpa: 0 };
          row.push({ content: sData.backlogs.join(", "), styles: { cellWidth: 'auto', minCellWidth: 35 } }); // Backlogs text with min width
          row.push(sData.backlogCount === 0 ? "0" : sData.backlogCount); // Blgs No
          row.push(sData.credits); // Crs
          row.push(sData.sgpa.toFixed(2)); // SGPA
        });

        row.push(item.totalBacklogs);
        row.push(item.cgpa.toFixed(2));
        row.push(item.totalCredits);

        return row;
      });

      autoTable(doc, {
        startY: HEADER_HEIGHT + 38,
        head: head,
        body: body,
        theme: 'grid',
        styles: {
          fontSize: 5,
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0.1,
          cellPadding: 1,
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          fontSize: 6,
        },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' }, // Sno
          1: { cellWidth: 40, halign: 'center' }, // Roll No
          2: { cellWidth: 50 }, // Name
          // Shrink purely numerical columns to expand Backlogs list visually
          // Sem I
          4: { cellWidth: 12, halign: 'center' }, // Blgs
          5: { cellWidth: 12, halign: 'center' }, // Crs
          6: { cellWidth: 18, halign: 'center' }, // SGPA
          // Sem II
          8: { cellWidth: 12, halign: 'center' },
          9: { cellWidth: 12, halign: 'center' },
          10: { cellWidth: 18, halign: 'center' },
          // Sem III
          12: { cellWidth: 12, halign: 'center' },
          13: { cellWidth: 12, halign: 'center' },
          14: { cellWidth: 18, halign: 'center' },
          // Sem IV
          16: { cellWidth: 12, halign: 'center' },
          17: { cellWidth: 12, halign: 'center' },
          18: { cellWidth: 18, halign: 'center' },
          // Sem V
          20: { cellWidth: 12, halign: 'center' },
          21: { cellWidth: 12, halign: 'center' },
          22: { cellWidth: 18, halign: 'center' },
          // Sem VI
          24: { cellWidth: 12, halign: 'center' },
          25: { cellWidth: 12, halign: 'center' },
          26: { cellWidth: 18, halign: 'center' },
          // Sem VII
          28: { cellWidth: 12, halign: 'center' },
          29: { cellWidth: 12, halign: 'center' },
          30: { cellWidth: 18, halign: 'center' },
          // Sem VIII
          32: { cellWidth: 12, halign: 'center' },
          33: { cellWidth: 12, halign: 'center' },
          34: { cellWidth: 18, halign: 'center' },

          // Totals
          35: { cellWidth: 15, halign: 'center' }, // Total Blgs
          36: { cellWidth: 20, halign: 'center' }, // CGPA
          37: { cellWidth: 15, halign: 'center' }, // Total Crs
        },
        // Auto wrap for the backlogs column
      });

      doc.save(`Cumulative_Backlogs_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("Failed to export PDF", error);
      alert("Failed to generate PDF. Please check the console.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Backlog Reports</h1>
          <p className="text-slate-500 mt-1">Identify and track students requiring supplementary exams.</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={exportToCSV}
            disabled={!backlogs || backlogs.length === 0}
            className="px-6 py-2.5 rounded-xl font-medium bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button
            onClick={exportToPDF}
            disabled={isGeneratingPdf || !backlogs || backlogs.length === 0}
            className="px-6 py-2.5 rounded-xl font-medium bg-primary text-white hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm min-w-[140px] justify-center"
          >
            {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {isGeneratingPdf ? "Generating..." : "Export PDF"}
          </button>
        </div>
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
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Branch</label>
          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none text-sm"
          >
            <option value="">All Branches</option>
            <option value="CSE">CSE</option>
            <option value="ECE">ECE</option>
            <option value="EEE">EEE</option>
            <option value="MECH">Mechanical</option>
            <option value="CIVIL">Civil</option>
            <option value="AIML">AIML</option>
          </select>
        </div>
        <div className="space-y-2 flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Semester</label>
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none text-sm"
          >
            <option value="">All Semesters</option>
            {["I", "II", "III", "IV", "V", "VI", "VII", "VIII"].map(sem => (
              <option key={sem} value={sem}>{formatSemester(sem)}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2 flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Batch</label>
          <select
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none text-sm"
          >
            <option value="">All Batches</option>
            {/* Generate batches from 2021 to current year + 2 */}
            {Array.from({ length: new Date().getFullYear() - 2021 + 3 }, (_, i) => {
              const startYear = 2021 + i;
              const batchString = `${startYear}-${startYear + 4}`;
              return <option key={batchString} value={batchString}>{batchString}</option>;
            }).reverse()}
          </select>
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
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-6">
              <FileWarning className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-display font-semibold text-slate-900 mb-2">No backlogs found</h3>
            <p className="text-slate-500">Excellent! No active backlogs match your criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-sm font-medium text-slate-500">
                  <th className="p-4 pl-6">Student</th>
                  <th className="p-4">Branch/Sem</th>
                  <th className="p-4">Failed Subject</th>
                  <th className="p-4 text-center">Attempts</th>
                  <th className="p-4 pr-6 text-right">View Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {backlogs.map((record: any, i: number) => {
                  // Fallback safe keys for grouped or flat data
                  const safeKey = record.student?.id ? `${record.student.id}-${record.backlogCount}` : `${record.studentId}-${record.subjectId}-${i}`;
                  return (
                    <motion.tr
                      key={safeKey}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.05, 0.5) }}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="p-4 pl-6">
                        <div className="flex flex-col">
                          <span className="text-slate-900 font-medium">{record.student?.name || record.name || "Unknown"}</span>
                          <span className="text-xs text-slate-500">{record.student?.rollNumber || record.rollNumber}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-slate-900">{record.student?.branch || record.branch}</span>
                        <span className="text-xs text-slate-500 ml-2">{formatSemester(record.semester) || "Multiple"}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1 flex-wrap">
                          {record.subjects ? (
                            record.subjects.map((sub: any, idx: number) => (
                              <span key={idx} className="px-2 py-1 bg-destructive/10 text-destructive text-xs rounded font-medium">
                                {sub.subjectCode}
                              </span>
                            ))
                          ) : (
                            <div className="flex flex-col">
                              <span className="text-sm text-destructive font-medium">{record.subjectName}</span>
                              <span className="text-xs text-slate-500">{record.subjectCode}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                          {record.backlogCount || record.attemptNo || 1}
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <Link
                          href={`/students/${record.student?.id || record.studentId}`}
                          className="text-primary hover:text-primary/80 text-sm font-medium hover:underline transition-colors"
                        >
                          Profile
                        </Link>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
