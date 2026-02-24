import React, { useState } from "react";
import { useStudentsSearch } from "@/hooks/use-students";
import { Search, Loader2, User, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useDebounce } from "@/hooks/use-debounce";

// Simple debounce hook for local use
function useLocalDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function Students() {
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useLocalDebounce(searchInput, 500);
  const { data: students, isLoading } = useStudentsSearch(debouncedSearch);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Student Directory</h1>
          <p className="text-muted-foreground mt-1">Search and view detailed student academic profiles.</p>
        </div>
        
        <div className="relative w-full md:w-96">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-card/60 backdrop-blur-md border border-white/10 rounded-xl text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-lg shadow-black/20"
            placeholder="Search by Roll No or Name..."
          />
        </div>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p>Searching students...</p>
          </div>
        ) : !students || students.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
              <User className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-display font-semibold text-white mb-2">No students found</h3>
            <p className="text-muted-foreground">Try adjusting your search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-sm font-medium text-muted-foreground">
                  <th className="p-4 pl-6">Roll Number</th>
                  <th className="p-4">Name</th>
                  <th className="p-4">Branch & Batch</th>
                  <th className="p-4">Regulation</th>
                  <th className="p-4 text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {students.map((student: any, i: number) => (
                  <motion.tr 
                    key={student.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="hover:bg-white/5 transition-colors group"
                  >
                    <td className="p-4 pl-6 font-medium text-white">{student.rollNumber}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                          {student.name.charAt(0)}
                        </div>
                        <span className="text-white">{student.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 mr-2">
                        {student.branch}
                      </span>
                      <span className="text-sm text-muted-foreground">{student.batch}</span>
                    </td>
                    <td className="p-4 text-muted-foreground text-sm">{student.regulation}</td>
                    <td className="p-4 pr-6 text-right">
                      <Link 
                        href={`/students/${student.id}`}
                        className="inline-flex items-center justify-center p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
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
