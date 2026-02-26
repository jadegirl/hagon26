export interface Academy {
  name: string;
  address: string;
  representative: string;
  phone: string;
  businessNumber: string;
}

export interface Instructor {
  name: string;
  address: string;
  phone: string;
  birthDate: string;
  subject: string;
  grade?: string; // 담당 학년 (선택사항)
}

export interface ContractPeriod {
  startDate: string;
  endDate: string;
  probationMonths: number;
  durationMonths?: number; // 계약 기간 (개월 단위, 0이면 직접 입력)
}

export interface WorkCondition {
  weeklyHours: number;
  workDays: number;
  weeklyHoliday: string;
  schedule: DaySchedule[];
}

export interface DaySchedule {
  day: string;
  isWorkDay: boolean;
  startTime: string;
  endTime: string;
  breakTime?: number; // 휴게시간 (분 단위)
}

export interface Salary {
  type: 'FIXED' | 'PERCENTAGE' | 'HOURLY';
  baseSalary: number;
  hourlyWage: number;
  revenueRatio: number;
  minGuarantee: number;
  payDay: number;
  mealAllowance: number;
  transportAllowance: number;
  positionAllowance: number;
  overtimeAllowance: number;
  otherAllowance: number;
  otherAllowanceMemo: string;
  percentageBaseSalary: number;
  percentageWeeklyHolidayPay: number;
}

export interface Protection {
  hasNonCompete: boolean;
  nonCompetePeriod: number;
  nonCompeteRadius: number;
  nonCompeteCompensation: number;
}

export interface CalculatedValues {
  weeklyHours: number;
  dailyHours: number;
  weeklyHolidayHours: number;
  monthlyWorkHours: number;
  hourlyRate: number;
  weeklyHolidayPay: number;
}

export interface WizardState {
  currentStep: number;
  academy: Academy;
  instructor: Instructor;
  contractPeriod: ContractPeriod;
  workCondition: WorkCondition;
  salary: Salary;
  protection: Protection;
  calculated: CalculatedValues;
  specialTerms: string;
  draftId: string | null;
  sourceContractStatus: string | null;
  signatureImageUrl: string;
  
  // Actions
  updateAcademy: (data: Partial<Academy>) => void;
  updateInstructor: (data: Partial<Instructor>) => void;
  updateContractPeriod: (data: Partial<ContractPeriod>) => void;
  updateWorkCondition: (data: Partial<WorkCondition>) => void;
  updateSalary: (data: Partial<Salary>) => void;
  updateProtection: (data: Partial<Protection>) => void;
  updateSpecialTerms: (terms: string) => void;
  setDraftId: (id: string | null) => void;
  setSourceContractStatus: (status: string | null) => void;
  setSignatureImageUrl: (url: string) => void;
  recalculate: () => void;
  reset: () => void;
  clearStorage: () => void;
  hasSavedData: () => boolean;
}
