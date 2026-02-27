import React from "react";
import { useAnalytics } from "@/hooks/use-reports";
import { Users, FileWarning, TrendingUp, Award, Loader2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { data: analytics, isLoading } = useAnalytics();

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-muted-foreground">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p>Loading analytics data...</p>
      </div>
    );
  }

  // Mock data if backend isn't seeded yet
  const stats = analytics || {
    passPercentage: 78.5,
    branchWiseBacklogs: [
      { name: "CSE", value: 145 },
      { name: "ECE", value: 89 },
      { name: "EEE", value: 112 },
      { name: "MECH", value: 65 },
      { name: "CIVIL", value: 45 },
    ],
    mostFailedSubjects: [
      { name: "Mathematics-II", count: 85 },
      { name: "Data Structures", count: 62 },
      { name: "Engineering Physics", count: 54 },
      { name: "Circuits & Systems", count: 41 },
    ]
  };

  const passFailData = [
    { name: "Passed", value: stats.passPercentage },
    { name: "Failed", value: 100 - stats.passPercentage },
  ];

  const COLORS = ['hsl(43, 96%, 56%)', 'hsl(0, 84%, 60%)']; // Primary Gold, Destructive Red

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900">Dashboard Overview</h1>
        <p className="text-slate-500 mt-1">Real-time statistics for current academic sessions.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: "Overall Pass Rate", value: `${stats.passPercentage.toFixed(1)}%`, icon: Award, color: "text-primary", bg: "bg-primary/10" },
          { title: "Total Backlogs", value: stats.branchWiseBacklogs.reduce((acc: number, curr: any) => acc + curr.value, 0).toString(), icon: FileWarning, color: "text-destructive", bg: "bg-destructive/10" },
          { title: "Active Students", value: (stats.totalStudents ?? 0).toString(), icon: Users, color: "text-blue-400", bg: "bg-blue-400/10" },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-panel p-6 rounded-2xl flex items-center gap-6 group hover:border-primary/30 transition-colors duration-300"
          >
            <div className={`w-14 h-14 rounded-2xl ${stat.bg} flex items-center justify-center ${stat.color} group-hover:scale-110 transition-transform duration-300`}>
              <stat.icon className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">{stat.title}</p>
              <h3 className="text-3xl font-display font-bold text-slate-900">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Branch-wise Backlogs */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="glass-panel p-6 rounded-2xl"
        >
          <h3 className="text-lg font-display font-semibold text-slate-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Branch-wise Backlogs
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.branchWiseBacklogs} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(0,0,0,0.4)" tick={{ fill: 'rgba(0,0,0,0.6)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis stroke="rgba(0,0,0,0.4)" tick={{ fill: 'rgba(0,0,0,0.6)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', color: '#0f172a' }}
                />
                <Bar dataKey="value" fill="hsl(43, 96%, 56%)" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Pass vs Fail Ratio */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="glass-panel p-6 rounded-2xl flex flex-col"
        >
          <h3 className="text-lg font-display font-semibold text-slate-900 mb-2 flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Overall Results Distribution
          </h3>
          <div className="flex-1 min-h-[300px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={passFailData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {passFailData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', color: '#0f172a' }}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Percentage']}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ color: '#475569' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-[-20px]">
              <div className="text-center">
                <span className="block text-3xl font-display font-bold text-slate-900">{stats.passPercentage.toFixed(0)}%</span>
                <span className="block text-xs text-slate-500 uppercase tracking-widest">Passed</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
