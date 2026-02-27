import React, { useState } from "react";
import { useBacklogReports, useCumulativeResultsReport, useToppersReport } from "@/hooks/use-reports";
import { FileWarning, Loader2, Download, Filter, FileText, Trophy, Users, CheckCircle, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { pdf } from "@react-pdf/renderer";
import { TranscriptDocument } from "@/components/pdf/TranscriptDocument";
import { formatSemester } from "@/lib/utils";

// Helper for generating PDF headers
const addPdfHeader = async (doc: jsPDF, title: string, branch: string, batch: string, extra?: string) => {
  const pageW = doc.internal.pageSize.width;
  const LEFT_PAD = 30;

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

  const HEADER_IMG_H = headerDataUrl ? 72 : 0;
  if (headerDataUrl) {
    doc.addImage(headerDataUrl, 'PNG', 0, 0, pageW, HEADER_IMG_H);
  }

  const HEADER_BOTTOM = HEADER_IMG_H + 2;
  doc.setDrawColor('#aaa');
  doc.setLineWidth(0.5);
  doc.line(LEFT_PAD, HEADER_BOTTOM, pageW - LEFT_PAD, HEADER_BOTTOM);

  const TITLE_Y = HEADER_BOTTOM + 14;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#000');
  doc.text(title, pageW / 2, TITLE_Y, { align: 'center' });
  doc.setLineWidth(0.4);
  const textWidth = doc.getTextWidth(title);
  doc.line(pageW / 2 - (textWidth / 2) - 5, TITLE_Y + 2, pageW / 2 + (textWidth / 2) + 5, TITLE_Y + 2);

  const META_Y = TITLE_Y + 16;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#000');
  doc.text('Course: B.TECH', LEFT_PAD, META_Y);
  doc.text(`Branch: ${branch || 'ALL'}`, pageW / 2, META_Y, { align: 'center' });
  doc.text(`Batch: ${batch || 'ALL'}`, pageW - LEFT_PAD, META_Y, { align: 'right' });

  if (extra) {
    doc.text(extra, pageW / 2, META_Y + 12, { align: 'center' });
    return META_Y + 12;
  }

  return META_Y;
};


export default function Reports() {
  const [activeReport, setActiveReport] = useState("backlogs"); // backlogs, cumulative, toppers

  const [branch, setBranch] = useState("");
  const [semester, setSemester] = useState("");
  const [batch, setBatch] = useState("");

  // New States
  const [cumulativeYear, setCumulativeYear] = useState("All");
  const [toppersType, setToppersType] = useState("Semester");
  const [toppersTopN, setToppersTopN] = useState(5);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Data Hooks
  const { data: backlogs, isLoading: loadersBacklogs } = useBacklogReports({ branch, semester, batch });
  const { data: cumulativeData, isLoading: loadersCumulative } = useCumulativeResultsReport({ branch, batch, year: cumulativeYear });
  const { data: toppersData, isLoading: loadersToppers } = useToppersReport({
    branch, batch, type: toppersType,
    semester: toppersType === "Semester" ? semester || "I" : undefined,
    year: toppersType === "Year" ? cumulativeYear === "All" ? "1st" : cumulativeYear : undefined,
    topN: toppersTopN
  });


  // --- EXPORT logic for existing BACKLOGS ---
  const exportBacklogsCSV = () => {
    if (!backlogs || backlogs.length === 0) return;
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
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map((e: any[]) => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `backlogs_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const exportBacklogsPDF = async () => {
    try {
      setIsGeneratingPdf(true);
      const response = await fetch(`/api/reports/cumulative-backlogs?branch=${branch}&batch=${batch}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` } });
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      if (!data || data.length === 0) { alert("No data"); return; }

      const doc = new jsPDF('landscape', 'pt', 'a4');
      const HEADER_HEIGHT = await addPdfHeader(doc, 'BACKLOGS REPORT', branch, batch);

      const semesters = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
      const semShortLabel = (s: string) => ({ "I": "1Yr\nSem1", "II": "1Yr\nSem2", "III": "2Yr\nSem1", "IV": "2Yr\nSem2", "V": "3Yr\nSem1", "VI": "3Yr\nSem2", "VII": "4Yr\nSem1", "VIII": "4Yr\nSem2" }[s] ?? s);

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
          ...Array(8).fill([{ content: 'Backlogs', styles: { halign: 'center' } }, { content: 'Blgs', styles: { halign: 'center' } }, { content: 'Crs', styles: { halign: 'center' } }, { content: 'SGPA', styles: { halign: 'center' } }]).flat()
        ]
      ];

      const body = data.map((item: any, index: number) => {
        const row = [index + 1, item.student.rollNumber, item.student.name];
        semesters.forEach(sem => {
          const sData = item.semesterData[sem] || { backlogs: [], backlogCount: 0, credits: 0, sgpa: 0 };
          row.push({ content: sData.backlogs.join(", "), styles: { cellWidth: 'auto', minCellWidth: 35 } });
          row.push(sData.backlogCount === 0 ? "0" : sData.backlogCount);
          row.push(sData.credits);
          row.push(sData.sgpa.toFixed(2));
        });
        row.push(item.totalBacklogs);
        row.push(item.cgpa.toFixed(2));
        row.push(item.totalCredits);
        return row;
      });

      autoTable(doc, {
        startY: HEADER_HEIGHT + 38, head, body, theme: 'grid',
        styles: { fontSize: 5, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.1, cellPadding: 1, overflow: 'linebreak' },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', valign: 'middle', fontSize: 6 },
        columnStyles: { 0: { cellWidth: 15, halign: 'center' }, 1: { cellWidth: 40, halign: 'center' }, 2: { cellWidth: 50 } },
        didParseCell: function (data) {
          if (data.section === 'body') {
            const rawCol = data.column.index;
            if (rawCol >= 3 && rawCol <= 34) {
              const semColIndex = (rawCol - 3) % 4;
              if (semColIndex === 1 || semColIndex === 2 || semColIndex === 3) data.cell.styles.halign = 'center';
              if (semColIndex === 0) data.cell.styles.fontSize = 4;
            }
            if (rawCol >= 35) data.cell.styles.halign = 'center';
          }
        },
      });

      const pageCount = doc.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 40, doc.internal.pageSize.height - 20, { align: 'right' });
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 30, doc.internal.pageSize.height - 20);
      }
      doc.save(`Cumulative_Backlogs_${branch || 'ALL'}_${batch || 'ALL'}.pdf`);
    } catch (error) {
      console.error(error); alert("Failed to generate PDF");
    } finally { setIsGeneratingPdf(false); }
  };

  // --- EXPORT logic for CUMULATIVE REPORT ---
  const exportCumulativePDF = async () => {
    if (!cumulativeData) return;
    try {
      setIsGeneratingPdf(true);
      const doc = new jsPDF('portrait', 'pt', 'a4');
      let currentY = await addPdfHeader(doc, 'CUMULATIVE RESULT REPORT', branch, batch, `Target: ${cumulativeYear === 'All' ? 'All Semesters' : cumulativeYear + ' Year'}`);
      currentY += 20;

      // Summary Table
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text("Semester Wise Summary", 30, currentY);
      currentY += 10;

      const summaryHead = [["Semester", "Registered", "Passed", "Failed", "Pass %"]];
      const summaryBody = Object.keys(cumulativeData.summary).map(sem => {
        const stats = cumulativeData.summary[sem];
        const pct = stats.registered > 0 ? ((stats.passed / stats.registered) * 100).toFixed(2) : "0.00";
        return [formatSemester(sem), stats.registered, stats.passed, stats.failed, `${pct}%`];
      });

      autoTable(doc, {
        startY: currentY, head: summaryHead, body: summaryBody, theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 }, headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] }
      });
      currentY = (doc as any).lastAutoTable.finalY + 30;

      // Passed List
      if (cumulativeData.passed.length > 0) {
        doc.setFontSize(11);
        doc.text("Passed Students (0 Backlogs in target period)", 30, currentY);
        currentY += 10;
        const passHead = [["S.No", "Roll Number", "Name", "Branch"]];
        const passBody = cumulativeData.passed.map((s: any, i: number) => [i + 1, s.rollNumber, s.name, s.branch]);
        autoTable(doc, { startY: currentY, head: passHead, body: passBody, theme: 'grid', styles: { fontSize: 8 }, headStyles: { fillColor: [230, 255, 230], textColor: [0, 0, 0] } });
        currentY = (doc as any).lastAutoTable.finalY + 30;
      }

      // Failed List
      if (cumulativeData.failed.length > 0) {
        doc.setFontSize(11);
        doc.text("Failed Students", 30, currentY);
        currentY += 10;
        const failHead = [["S.No", "Roll Number", "Name", "Branch"]];
        const failBody = cumulativeData.failed.map((s: any, i: number) => [i + 1, s.rollNumber, s.name, s.branch]);
        autoTable(doc, { startY: currentY, head: failHead, body: failBody, theme: 'grid', styles: { fontSize: 8 }, headStyles: { fillColor: [255, 230, 230], textColor: [0, 0, 0] } });
      }

      doc.save(`Cumulative_Result_${branch || 'ALL'}_${batch || 'ALL'}.pdf`);
    } catch (err) { console.error(err); alert("Failed"); } finally { setIsGeneratingPdf(false); }
  };

  // --- EXPORT logic for TOPPERS ---
  const exportToppersPDF = async () => {
    if (!toppersData || toppersData.length === 0) return;
    try {
      setIsGeneratingPdf(true);
      const doc = new jsPDF('portrait', 'pt', 'a4');
      const timeTarget = toppersType === "Semester" ? formatSemester(semester || "I") : `${cumulativeYear === 'All' ? '1st' : cumulativeYear} Year`;
      let currentY = await addPdfHeader(doc, `TOPPERS REPORT - ${toppersType.toUpperCase()}`, branch, batch, `Target: ${timeTarget}`);
      currentY += 20;

      const head = [["Rank", "Roll Number", "Name", "Branch", "GPA"]];
      const body = toppersData.map((s: any) => [s.rank, s.rollNumber, s.name, s.branch, s.gpa.toFixed(2)]);

      autoTable(doc, {
        startY: currentY, head: head, body: body, theme: 'grid',
        styles: { fontSize: 9, cellPadding: 4, halign: 'center' },
        columnStyles: { 2: { halign: 'left' } },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] }
      });

      doc.save(`Toppers_${branch || 'ALL'}_${batch || 'ALL'}.pdf`);
    } catch (err) { console.error(err); alert("Failed"); } finally { setIsGeneratingPdf(false); }
  };

  // --- EXPORT logic for BULK TRANSCRIPTS ---
  const exportBulkTranscripts = async () => {
    if (!branch || !batch) {
      alert("Please select both Branch and Batch to export transcripts.");
      return;
    }
    try {
      setIsGeneratingPdf(true);
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/reports/batch-transcripts?branch=${branch}&batch=${batch}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error("Failed to fetch transcripts");
      const studentsDataRaw = await res.json();

      if (!studentsDataRaw || studentsDataRaw.length === 0) {
        alert("No students found for this branch and batch.");
        return;
      }

      const formattedData = studentsDataRaw.map((s: any) => ({
        student: s,
        results: s.results || []
      }));

      const blob = await pdf(<TranscriptDocument studentsData={formattedData} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Bulk_Transcripts_${branch}_${batch}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Failed to generate bulk transcripts PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  };


  // Custom Selectors
  const BranchSelector = () => (
    <div className="space-y-2 flex-1 min-w-[200px]">
      <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Branch</label>
      <select value={branch} onChange={(e) => setBranch(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm">
        <option value="">All Branches</option>
        <option value="CSE">CSE</option>
        <option value="ECE">ECE</option>
        <option value="EEE">EEE</option>
        <option value="MECH">Mechanical</option>
        <option value="CIVIL">Civil</option>
        <option value="CSE(AIML)">CSE(AIML)</option>
        <option value="CSE(DS)">CSE(DS)</option>
      </select>
    </div>
  );

  const BatchSelector = () => (
    <div className="space-y-2 flex-1 min-w-[200px]">
      <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Batch</label>
      <select value={batch} onChange={(e) => setBatch(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm">
        <option value="">All Batches</option>
        {Array.from({ length: 10 }, (_, i) => { const y = 2020 + i; return <option key={y} value={`${y}-${y + 4}`}>{`${y}-${y + 4}`}</option>; }).reverse()}
      </select>
    </div>
  );

  const ReportTypeSelector = () => (
    <div className="space-y-2 flex-1 min-w-[200px]">
      <label className="text-xs font-medium text-slate-500 uppercase tracking-wider text-primary">Report Type</label>
      <select
        value={activeReport}
        onChange={(e) => setActiveReport(e.target.value)}
        className="w-full px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-xl text-sm font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
      >
        <option value="backlogs">Backlogs Report</option>
        <option value="cumulative">Cumulative Result Report</option>
        <option value="toppers">Semester & Year-wise Toppers List</option>
        <option value="transcripts">Bulk Batch Transcripts</option>
      </select>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Academic Reports</h1>
          <p className="text-slate-500 mt-1">Generate and analyze student performance data across various metrics.</p>
        </div>
      </div>

      <div className="w-full">

        {/* --- BACKLOGS REPORT TAB --- */}
        {activeReport === "backlogs" && (
          <div className="mt-0 outline-none space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-4 items-end">
              <BranchSelector />
              <div className="space-y-2 flex-1 min-w-[200px]">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Semester</label>
                <select value={semester} onChange={(e) => setSemester(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                  <option value="">All Semesters</option>
                  {["I", "II", "III", "IV", "V", "VI", "VII", "VIII"].map(sem => (<option key={sem} value={sem}>{formatSemester(sem)}</option>))}
                </select>
              </div>
              <BatchSelector />
              <ReportTypeSelector />

              <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
                <button onClick={exportBacklogsCSV} disabled={!backlogs?.length} className="flex-1 md:flex-none px-6 py-2.5 rounded-xl font-medium bg-white border border-slate-200 hover:bg-slate-50 hover:text-primary transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
                  <Download className="w-4 h-4" /> CSV
                </button>
                <button onClick={exportBacklogsPDF} disabled={isGeneratingPdf} className="flex-1 md:flex-none px-6 py-2.5 rounded-xl font-medium bg-primary text-white shadow-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
                  {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} PDF
                </button>
              </div>
            </div>

            <div className="glass-panel rounded-2xl overflow-hidden">
              {loadersBacklogs ? (
                <div className="p-16 flex flex-col items-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
              ) : !backlogs || backlogs.length === 0 ? (
                <div className="p-16 flex flex-col items-center"><FileWarning className="w-10 h-10 text-slate-400 mb-4" /><p>No backlogs found</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b bg-slate-50 text-sm font-medium text-slate-500">
                        <th className="p-4 pl-6">Student</th><th className="p-4">Branch/Sem</th><th className="p-4">Failed Subject</th><th className="p-4">Attempts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {backlogs.map((record: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-4 pl-6"><div className="font-medium text-slate-900">{record.student?.name || record.name}</div><div className="text-xs text-slate-500">{record.student?.rollNumber || record.rollNumber}</div></td>
                          <td className="p-4"><div className="text-sm">{record.student?.branch || record.branch}</div><div className="text-xs text-slate-500">{formatSemester(record.semester) || "Multiple"}</div></td>
                          <td className="p-4">
                            <div className="flex gap-1 flex-wrap">
                              {record.subjects ? record.subjects.map((sub: any, idx: number) => (<span key={idx} className="px-2 py-1 bg-destructive/10 text-destructive text-xs rounded">{sub.subjectCode}</span>)) : (<div><span className="text-sm text-destructive">{record.subjectName}</span><br /><span className="text-xs">{record.subjectCode}</span></div>)}
                            </div>
                          </td>
                          <td className="p-4">{record.backlogCount || record.attemptNo || 1}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- CUMULATIVE RESULT TAB --- */}
        {activeReport === "cumulative" && (
          <div className="mt-0 outline-none space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-4 items-end flex-wrap">
              <BranchSelector />
              <BatchSelector />
              <div className="space-y-2 flex-1 min-w-[200px]">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Target Year</label>
                <select value={cumulativeYear} onChange={(e) => setCumulativeYear(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                  <option value="All">All Years</option>
                  <option value="1st">1st Year (I, II Sem)</option>
                  <option value="2nd">2nd Year (III, IV Sem)</option>
                  <option value="3rd">3rd Year (V, VI Sem)</option>
                  <option value="4th">4th Year (VII, VIII Sem)</option>
                </select>
              </div>
              <ReportTypeSelector />

              <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
                <button onClick={exportCumulativePDF} disabled={isGeneratingPdf || !cumulativeData?.summary} className="flex-1 md:flex-none px-6 py-2.5 rounded-xl font-medium bg-primary text-white shadow-sm hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
                  {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} PDF Report
                </button>
              </div>
            </div>

            <div className="glass-panel rounded-2xl overflow-hidden p-6">
              {loadersCumulative ? (
                <div className="p-16 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
              ) : !cumulativeData || !cumulativeData.summary ? (
                <div className="p-16 text-center text-slate-500">Select filters to view cumulative report.</div>
              ) : (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-lg font-bold mb-4">Semester Wise Summary</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {Object.entries(cumulativeData.summary).map(([sem, stats]: [string, any]) => {
                        if (stats.registered === 0) return null;
                        const pct = ((stats.passed / stats.registered) * 100).toFixed(1);
                        return (
                          <div key={sem} className="bg-slate-50 border rounded-xl p-4">
                            <div className="font-bold text-slate-900 mb-2 border-b pb-2">{formatSemester(sem)}</div>
                            <div className="text-sm flex justify-between"><span>Reg:</span> <b>{stats.registered}</b></div>
                            <div className="text-sm flex justify-between text-green-600"><span>Pass:</span> <b>{stats.passed}</b></div>
                            <div className="text-sm flex justify-between text-red-500"><span>Fail:</span> <b>{stats.failed}</b></div>
                            <div className="mt-2 text-center text-xs font-bold bg-white py-1 rounded border">Pass: {pct}%</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <h2 className="text-lg font-bold mb-4 text-green-600 flex items-center gap-2"><CheckCircle className="w-5 h-5" /> Passed Students ({cumulativeData.passed.length})</h2>
                      <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl max-h-[500px] overflow-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-emerald-100/50 sticky top-0"><tr className="text-emerald-800"><th className="p-3">Roll No</th><th className="p-3">Name</th><th className="p-3">Branch</th></tr></thead>
                          <tbody className="divide-y divide-emerald-100">
                            {cumulativeData.passed.map((s: any, i: number) => (
                              <tr key={i}><td className="p-3 font-medium">{s.rollNumber}</td><td className="p-3">{s.name}</td><td className="p-3">{s.branch}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold mb-4 text-red-500 flex items-center gap-2"><XCircle className="w-5 h-5" /> Failed Students ({cumulativeData.failed.length})</h2>
                      <div className="bg-red-50/50 border border-red-100 rounded-xl max-h-[500px] overflow-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-red-100/50 sticky top-0"><tr className="text-red-800"><th className="p-3">Roll No</th><th className="p-3">Name</th><th className="p-3">Branch</th></tr></thead>
                          <tbody className="divide-y divide-red-100">
                            {cumulativeData.failed.map((s: any, i: number) => (
                              <tr key={i}><td className="p-3 font-medium">{s.rollNumber}</td><td className="p-3">{s.name}</td><td className="p-3">{s.branch}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TOPPERS LIST TAB --- */}
        {activeReport === "toppers" && (
          <div className="mt-0 outline-none space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-4 items-end flex-wrap">
              <BranchSelector />
              <BatchSelector />
              <div className="space-y-2 flex-1 min-w-[150px]">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Type</label>
                <select value={toppersType} onChange={(e) => setToppersType(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                  <option value="Semester">Semester</option>
                  <option value="Year">Yearly</option>
                </select>
              </div>

              {toppersType === "Semester" ? (
                <div className="space-y-2 flex-1 min-w-[150px]">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Semester</label>
                  <select value={semester} onChange={(e) => setSemester(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                    {["I", "II", "III", "IV", "V", "VI", "VII", "VIII"].map(sem => (<option key={sem} value={sem}>{formatSemester(sem)}</option>))}
                  </select>
                </div>
              ) : (
                <div className="space-y-2 flex-1 min-w-[150px]">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Year</label>
                  <select value={cumulativeYear} onChange={(e) => setCumulativeYear(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                    <option value="1st">1st Year (I, II Sem)</option>
                    <option value="2nd">2nd Year (III, IV Sem)</option>
                    <option value="3rd">3rd Year (V, VI Sem)</option>
                    <option value="4th">4th Year (VII, VIII Sem)</option>
                  </select>
                </div>
              )}

              <div className="space-y-2 w-[100px]">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Top N</label>
                <input type="number" min="1" max="50" value={toppersTopN} onChange={(e) => setToppersTopN(parseInt(e.target.value) || 5)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
              </div>
              <ReportTypeSelector />

              <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
                <button onClick={exportToppersPDF} disabled={isGeneratingPdf || !toppersData?.length} className="flex-1 md:flex-none px-6 py-2.5 rounded-xl font-medium bg-amber-500 text-white shadow-sm hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
                  {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />} Export Toppers
                </button>
              </div>
            </div>

            <div className="glass-panel rounded-2xl overflow-hidden p-6">
              {loadersToppers ? (
                <div className="p-16 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
              ) : !toppersData || toppersData.length === 0 ? (
                <div className="p-16 text-center text-slate-500">No toppers data found for the selected criteria. Ensure students have cleared the selected timeframe with no backlogs in regular/reval attempts.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-amber-50 text-amber-900 border-b border-amber-200">
                        <th className="p-4 text-center w-20">Rank</th>
                        <th className="p-4">Roll Number</th>
                        <th className="p-4">Student Name</th>
                        <th className="p-4">Branch</th>
                        <th className="p-4 text-right">GPA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {toppersData.map((s: any, i: number) => (
                        <tr key={i} className={s.rank === 1 ? 'bg-amber-50/30 font-medium' : 'hover:bg-slate-50'}>
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${s.rank === 1 ? 'bg-yellow-400 text-yellow-900 font-bold' : s.rank === 2 ? 'bg-slate-300 text-slate-800 font-bold' : s.rank === 3 ? 'bg-orange-300 text-orange-900 font-bold' : 'bg-slate-100 text-slate-600'}`}>
                              {s.rank}
                            </span>
                          </td>
                          <td className="p-4">{s.rollNumber}</td>
                          <td className="p-4">{s.name}</td>
                          <td className="p-4">{s.branch}</td>
                          <td className="p-4 text-right font-bold text-slate-900">{s.gpa.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- BULK TRANSCRIPTS TAB --- */}
        {activeReport === "transcripts" && (
          <div className="mt-0 outline-none space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-4 items-end flex-wrap">
              <BranchSelector />
              <BatchSelector />
              <ReportTypeSelector />

              <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
                <button
                  onClick={exportBulkTranscripts}
                  disabled={isGeneratingPdf || !branch || !batch}
                  className="flex-1 md:flex-none px-6 py-2.5 rounded-xl font-medium bg-indigo-600 text-white shadow-sm hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                >
                  {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Download Transcripts PDF
                </button>
              </div>
            </div>

            <div className="glass-panel rounded-2xl overflow-hidden p-16 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">Automated Batch Transcripts</h3>
              <p className="text-slate-500 max-w-md mx-auto">
                Select a Branch and Batch to automatically generate a multi-page PDF document containing the full academic transcript for every student matching the criteria, formatted perfectly to the official Autonomous template.
              </p>
            </div>
          </div>
        )}

      </div>
    </div >
  );
}
