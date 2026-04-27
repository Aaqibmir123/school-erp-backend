export interface DashboardData {
  attendance: {
    absent: number;
    percentage: number;
    present: number;
    todayStatus: "PRESENT" | "ABSENT" | "N/A";
  };
  className: string;
  nextClass: {
    endTime: string;
    startTime: string;
    subject: string;
    teacher: string;
  } | null;
  sectionName: string;
  stats: {
    activeHomeworkCount: number;
    pendingFeeCount: number;
    upcomingExamCount: number;
  };
  studentId: string;
  studentName: string;
}
