import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WizardState, Academy, Instructor, ContractPeriod, WorkCondition, Salary, Protection, CalculatedValues } from '@/types/wizard';
import { calculateWorkHours, calculateFixedSalary, calculateWeeklyHolidayHours, calculateMonthlyTotalHours } from './calculations';

const initialAcademy: Academy = {
  name: '',
  address: '',
  representative: '',
  phone: '',
  businessNumber: '',
};

const initialInstructor: Instructor = {
  name: '',
  address: '',
  phone: '',
  birthDate: '',
  subject: '',
};

const getDefaultDates = () => {
  const today = new Date();
  const startDate = today.toISOString().split('T')[0];
  const oneYearLater = new Date(today);
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
  oneYearLater.setDate(oneYearLater.getDate() - 1);
  const endDate = oneYearLater.toISOString().split('T')[0];
  return { startDate, endDate };
};

const initialContractPeriod: ContractPeriod = {
  ...getDefaultDates(),
  probationMonths: 3,
  durationMonths: 12, // 기본값: 1년
};

const defaultSchedule = [
  { day: '월', isWorkDay: true, startTime: '14:00', endTime: '21:00', breakTime: 60 },
  { day: '화', isWorkDay: true, startTime: '14:00', endTime: '21:00', breakTime: 60 },
  { day: '수', isWorkDay: true, startTime: '14:00', endTime: '21:00', breakTime: 60 },
  { day: '목', isWorkDay: true, startTime: '14:00', endTime: '21:00', breakTime: 60 },
  { day: '금', isWorkDay: true, startTime: '14:00', endTime: '21:00', breakTime: 60 },
  { day: '토', isWorkDay: false, startTime: '10:00', endTime: '17:00', breakTime: 60 },
  { day: '일', isWorkDay: false, startTime: '10:00', endTime: '17:00', breakTime: 60 },
];

const initialWorkCondition: WorkCondition = {
  weeklyHours: 0,
  workDays: 5,
  weeklyHoliday: '일요일',
  schedule: defaultSchedule,
};

const initialSalary: Salary = {
  type: 'FIXED',
  baseSalary: 0,
  hourlyWage: 0,
  revenueRatio: 50,
  minGuarantee: 0,
  payDay: 10,
  mealAllowance: 0,
  transportAllowance: 0,
  positionAllowance: 0,
  overtimeAllowance: 0,
  otherAllowance: 0,
  otherAllowanceMemo: '',
  percentageBaseSalary: 0,
  percentageWeeklyHolidayPay: 0,
};

const initialProtection: Protection = {
  hasNonCompete: false,
  nonCompetePeriod: 6,
  nonCompeteRadius: 3,
  nonCompeteCompensation: 0,
};

const initialCalculated: CalculatedValues = {
  weeklyHours: 0,
  dailyHours: 0,
  weeklyHolidayHours: 0,
  monthlyWorkHours: 0,
  hourlyRate: 0,
  weeklyHolidayPay: 0,
};

const initialState = {
  currentStep: 1,
  academy: initialAcademy,
  instructor: initialInstructor,
  contractPeriod: initialContractPeriod,
  workCondition: initialWorkCondition,
  salary: initialSalary,
  protection: initialProtection,
  calculated: initialCalculated,
  specialTerms: '',
  draftId: null as string | null,
  sourceContractStatus: null as string | null,
  signatureImageUrl: '',
};

export const useWizardStore = create<WizardState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      updateAcademy: (data) => set((state) => ({ academy: { ...state.academy, ...data } })),
      updateInstructor: (data) => set((state) => ({ instructor: { ...state.instructor, ...data } })),
      updateContractPeriod: (data) => set((state) => ({ contractPeriod: { ...state.contractPeriod, ...data } })),
      updateWorkCondition: (data) => set((state) => ({ workCondition: { ...state.workCondition, ...data } })),
      updateSalary: (data) => set((state) => ({ salary: { ...state.salary, ...data } })),
      updateProtection: (data) => set((state) => ({ protection: { ...state.protection, ...data } })),
      updateSpecialTerms: (terms) => set({ specialTerms: terms }),
      setDraftId: (id) => set({ draftId: id }),
      setSourceContractStatus: (status) => set({ sourceContractStatus: status }),
      setSignatureImageUrl: (url) => set({ signatureImageUrl: url }),
      
      recalculate: () => {
        const state = get();
        const { workCondition, salary, protection } = state;
        
        const weeklyHours = workCondition.weeklyHours || 0;
        const workDays = workCondition.workDays || 5;
        const dailyHours = workDays > 0 ? weeklyHours / workDays : 0;
        const weeklyHolidayHours = calculateWeeklyHolidayHours(weeklyHours);
        const monthlyWorkHours = calculateMonthlyTotalHours(weeklyHours);
        
        let hourlyRate = 0;
        let weeklyHolidayPay = 0;
        
        if (salary.type === 'FIXED' && salary.baseSalary > 0 && monthlyWorkHours > 0) {
          // calculateFixedSalary는 복잡한 계산을 하므로, 간단하게 계산
          hourlyRate = salary.baseSalary / monthlyWorkHours;
          weeklyHolidayPay = Math.round(hourlyRate * weeklyHolidayHours * 4.345);
        } else if (salary.type === 'HOURLY' && salary.hourlyWage > 0) {
          hourlyRate = salary.hourlyWage;
          weeklyHolidayPay = weeklyHours >= 15 ? Math.round(hourlyRate * weeklyHolidayHours * 4.345) : 0;
        }
        
        set({
          calculated: {
            weeklyHours,
            dailyHours,
            weeklyHolidayHours,
            monthlyWorkHours,
            hourlyRate,
            weeklyHolidayPay,
          },
        });
      },
      
      reset: () => {
        set(initialState);
        // localStorage도 삭제
        if (typeof window !== 'undefined') {
          localStorage.removeItem('hagon-wizard-storage');
        }
      },
      
      // localStorage 완전 삭제 함수 (완료 시 사용)
      clearStorage: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('hagon-wizard-storage');
        }
      },
      
      // 저장된 데이터가 있는지 확인하는 함수
      hasSavedData: () => {
        if (typeof window === 'undefined') return false;
        const stored = localStorage.getItem('hagon-wizard-storage');
        if (!stored) return false;
        try {
          const parsed = JSON.parse(stored);
          // persist는 state 객체를 직접 저장하거나 { state: {...} } 형식으로 저장할 수 있음
          const state = parsed.state || parsed;
          // 초기 상태가 아닌 경우에만 true 반환
          return state && (
            state.academy?.name ||
            state.instructor?.name ||
            (state.currentStep && state.currentStep > 1)
          );
        } catch {
          return false;
        }
      },
    }),
    {
      name: 'hagon-wizard-storage',
    }
  )
);
