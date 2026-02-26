'use client';

import { useEffect, useMemo, useRef } from 'react';
import { calculateWeeklyHolidayHours, calculateMonthlyTotalHours } from '@/lib/calculations';
import { calcPercentageMinimumGuarantee, calcFixedOrdinarySplit, calcFixedTotalMonthlyPayFromBase } from '@/lib/calculations/wage';
import { LEGAL_STANDARDS } from '@/constants/legalStandards';
import type { Academy, Instructor, ContractPeriod, WorkCondition, Salary, Protection } from '@/types/wizard';

type ContractDocumentData = {
  academy?: Partial<Academy>;
  instructor?: Partial<Instructor>;
  contractPeriod?: Partial<ContractPeriod>;
  workCondition?: Partial<WorkCondition>;
  salary?: Partial<Salary>;
  protection?: Partial<Protection>;
  specialTerms?: string;
  signature_image_url?: string;
  signature?: {
    name?: string;
    phone?: string;
    dataUrl?: string;
    signedAt?: string;
    ipAddress?: string;
  };
};

type ContractDocumentProps = {
  data: ContractDocumentData;
  stampUrl?: string | null;
  className?: string;
  showSignatureSection?: boolean;
  showAnnex?: boolean;
};

export default function ContractDocument({
  data,
  stampUrl,
  className,
  showSignatureSection = true,
  showAnnex = true,
}: ContractDocumentProps) {
  const academy = data.academy || {};
  const instructor = data.instructor || {};
  const contractPeriod = data.contractPeriod || {};
  const workCondition = data.workCondition || {};
  const salary = data.salary || {};
  const protection = data.protection || {};
  const specialTerms = data.specialTerms || '';
  const signature = data.signature || {};
  const salaryType =
    salary.type === 'FIXED' || salary.type === 'PERCENTAGE' || salary.type === 'HOURLY'
      ? salary.type
      : 'FIXED';

  const lastRowA = useRef<HTMLTableRowElement>(null);
  const lastRowB = useRef<HTMLTableRowElement>(null);

  const formatCurrency = (value: number) => value.toLocaleString('ko-KR');

  const numberToKorean = (num: number): string => {
    if (num === 0) return '영';

    const digits = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
    const units = ['', '십', '백', '천'];

    if (num < 10000) {
      let result = '';
      const str = num.toString().padStart(4, '0');

      for (let i = 0; i < 4; i += 1) {
        const digit = parseInt(str[i], 10);
        const pos = 3 - i;

        if (digit > 0) {
          if (digit === 1 && pos > 0) {
            result += units[pos];
          } else {
            result += digits[digit] + units[pos];
          }
        }
      }
      return result;
    }

    const man = Math.floor(num / 10000);
    const remainder = num % 10000;
    let result = '';

    if (man > 0) {
      if (man < 10000) {
        const manStr = man.toString().padStart(4, '0');
        for (let i = 0; i < 4; i += 1) {
          const digit = parseInt(manStr[i], 10);
          const pos = 3 - i;
          if (digit > 0) {
            if (digit === 1 && pos > 0) {
              result += units[pos];
            } else {
              result += digits[digit] + units[pos];
            }
          }
        }
      } else {
        result = numberToKorean(man);
      }
      result += '만';
    }

    if (remainder > 0) {
      const remainderStr = remainder.toString().padStart(4, '0');
      for (let i = 0; i < 4; i += 1) {
        const digit = parseInt(remainderStr[i], 10);
        const pos = 3 - i;
        if (digit > 0) {
          if (digit === 1 && pos > 0) {
            result += units[pos];
          } else {
            result += digits[digit] + units[pos];
          }
        }
      }
    }

    return result;
  };

  const weeklyHours = workCondition.weeklyHours || 0;
  const workDays = workCondition.workDays || 5;
  const weeklyHolidayHours = calculateWeeklyHolidayHours(weeklyHours);
  const monthlyTotalHours = calculateMonthlyTotalHours(weeklyHours);
  const dailyHours = workDays > 0 ? weeklyHours / workDays : 0;
  const percentageMinimum = calcPercentageMinimumGuarantee({
    weeklyHours,
    weeklyHolidayHours,
    minHourlyWage: LEGAL_STANDARDS.MIN_HOURLY_WAGE,
    baseSalary: salary.percentageBaseSalary || 0,
    meal: salary.mealAllowance || 0,
    transport: salary.transportAllowance || 0,
    position: salary.positionAllowance || 0,
    other: salary.otherAllowance || 0,
  });

  const scheduleDetails = useMemo(() => {
    const schedule = workCondition.schedule || [];
    return schedule.filter((d) => d.isWorkDay).map((d) => `${d.day}(${d.startTime || ''}~${d.endTime || ''})`);
  }, [workCondition.schedule]);

  useEffect(() => {
    if (lastRowA.current && lastRowB.current) {
      const heightA = lastRowA.current.offsetHeight;
      const heightB = lastRowB.current.offsetHeight;
      const maxHeight = Math.max(heightA, heightB);
      if (maxHeight > 0) {
        lastRowA.current.style.height = `${maxHeight}px`;
        lastRowB.current.style.height = `${maxHeight}px`;
      }
    }
  }, [academy.address, instructor.address]);

  const getTotalSalary = () => {
    if (salaryType === 'FIXED') {
      const nonCompete = protection.hasNonCompete ? protection.nonCompeteCompensation || 0 : 0;
      return calcFixedTotalMonthlyPayFromBase({
        baseSalary: salary.baseSalary || 0,
        weeklyHours,
        weeklyHolidayHours,
        meal: salary.mealAllowance || 0,
        transport: salary.transportAllowance || 0,
        position: salary.positionAllowance || 0,
        other: salary.otherAllowance || 0,
        overtime: salary.overtimeAllowance || 0,
        nonCompete,
      });
    }
    if (salaryType === 'PERCENTAGE') {
      const separatePay = protection.hasNonCompete ? protection.nonCompeteCompensation || 0 : 0;
      const percentageResult = salary.minGuarantee || 0;
      return Math.max(percentageResult, percentageMinimum.minGuarantee) + separatePay + (salary.overtimeAllowance || 0);
    }
    if (salaryType === 'HOURLY') {
      const hourlyWage = salary.hourlyWage || 0;
      const monthlyBase = Math.round(hourlyWage * weeklyHours * 4.345);
      const holidayPay = weeklyHours >= 15 ? Math.round(hourlyWage * weeklyHolidayHours * 4.345) : 0;
      return (
        monthlyBase +
        holidayPay +
        (salary.mealAllowance || 0) +
        (salary.transportAllowance || 0) +
        (salary.positionAllowance || 0) +
        (salary.otherAllowance || 0) +
        (salary.overtimeAllowance || 0)
      );
    }
    return 0;
  };

  const getWeeklyHolidayPay = () => {
    if (salaryType === 'FIXED') {
      const nonCompete = protection.hasNonCompete ? protection.nonCompeteCompensation || 0 : 0;
      const totalMonthlyPay = calcFixedTotalMonthlyPayFromBase({
        baseSalary: salary.baseSalary || 0,
        weeklyHours,
        weeklyHolidayHours,
        meal: salary.mealAllowance || 0,
        transport: salary.transportAllowance || 0,
        position: salary.positionAllowance || 0,
        other: salary.otherAllowance || 0,
        overtime: salary.overtimeAllowance || 0,
        nonCompete,
      });
      const split = calcFixedOrdinarySplit({
        totalMonthlyPay,
        weeklyHours,
        weeklyHolidayHours,
        meal: salary.mealAllowance || 0,
        transport: salary.transportAllowance || 0,
        position: salary.positionAllowance || 0,
        other: salary.otherAllowance || 0,
        overtime: salary.overtimeAllowance || 0,
        nonCompete,
      });
      return split.holidayPay;
    }
    if (salaryType === 'PERCENTAGE') {
      return percentageMinimum.weeklyHolidayPay;
    }
    if (salaryType === 'HOURLY') {
      const hourlyWage = salary.hourlyWage || 0;
      return weeklyHours >= 15 ? Math.round(hourlyWage * weeklyHolidayHours * 4.345) : 0;
    }
    return 0;
  };

  const getWeeklyHolidayPayNote = () => {
    if (salaryType === 'PERCENTAGE') {
      return '기본급의 20%';
    }
    if (salaryType === 'FIXED' && (salary.baseSalary || 0) > 0) {
      const nonCompete = protection.hasNonCompete ? protection.nonCompeteCompensation || 0 : 0;
      const totalMonthlyPay = calcFixedTotalMonthlyPayFromBase({
        baseSalary: salary.baseSalary || 0,
        weeklyHours,
        weeklyHolidayHours,
        meal: salary.mealAllowance || 0,
        transport: salary.transportAllowance || 0,
        position: salary.positionAllowance || 0,
        other: salary.otherAllowance || 0,
        overtime: salary.overtimeAllowance || 0,
        nonCompete,
      });
      const split = calcFixedOrdinarySplit({
        totalMonthlyPay,
        weeklyHours,
        weeklyHolidayHours,
        meal: salary.mealAllowance || 0,
        transport: salary.transportAllowance || 0,
        position: salary.positionAllowance || 0,
        other: salary.otherAllowance || 0,
        overtime: salary.overtimeAllowance || 0,
        nonCompete,
      });
      return `통상시급 ${formatCurrency(Math.round(split.ordinaryHourly))}원 × ${split.mh.toFixed(1)}시간`;
    }
    if (salaryType === 'HOURLY' && weeklyHours >= 15) {
      return `${formatCurrency(salary.hourlyWage || 0)}원 × ${weeklyHolidayHours.toFixed(1)}시간 × 4.345주`;
    }
    return '';
  };

  const clauseNumberMap = useMemo(() => {
    const config = [
      { key: 'parties' },
      { key: 'period' },
      { key: 'duties' },
      { key: 'workHours' },
      { key: 'breakTime' },
      { key: 'wage' },
      { key: 'holiday' },
      { key: 'retirement' },
      { key: 'confidential' },
      { key: 'nonCompete', condition: protection.hasNonCompete },
      { key: 'damages' },
      { key: 'others' },
      { key: 'jurisdiction' },
    ];
    let number = 1;
    const map: Record<string, number> = {};
    config.forEach((item) => {
      if (item.condition === false) return;
      map[item.key] = number;
      number += 1;
    });
    return map;
  }, [protection.hasNonCompete]);

  return (
    <div className={className}>
      <p className="mb-6 text-base">
        {academy.name || '(학원명)'}(이하 &quot;갑&quot;이라 한다)과 {instructor.name || '(강사명)'}(이하 &quot;을&quot;이라 한다)은
        다음과 같이 근로계약을 체결한다.
      </p>

      <div className="print-section">
        <h2 className="text-lg font-bold mt-8 mb-4 border-l-4 border-navy pl-3">제{clauseNumberMap.parties}조 (계약 당사자)</h2>
        <div className="flex flex-col gap-6 mb-4">
          <div className="flex flex-col">
            <p className="mb-2 font-semibold text-sm">갑 (사용자)</p>
            <div className="overflow-x-auto">
              <table className="party-table w-full border-collapse border border-gray-300">
                <tbody>
                  <tr>
                    <td className="border border-gray-300 p-4 bg-gray-100 font-semibold text-base">상호</td>
                    <td className="border border-gray-300 p-4 text-base value-cell">{academy.name || '(미입력)'}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-4 bg-gray-100 font-semibold text-base">대표자</td>
                    <td className="border border-gray-300 p-4 text-base value-cell">{academy.representative || '(미입력)'}</td>
                  </tr>
                  {academy.businessNumber ? (
                    <tr>
                      <td className="border border-gray-300 p-4 bg-gray-100 font-semibold text-base">사업자번호</td>
                      <td className="border border-gray-300 p-4 text-base value-cell">{academy.businessNumber}</td>
                    </tr>
                  ) : (
                    <tr>
                      <td className="border border-gray-300 p-4 bg-gray-100 font-semibold text-base"></td>
                      <td className="border border-gray-300 p-4 text-base"></td>
                    </tr>
                  )}
                  {academy.phone ? (
                    <tr>
                      <td className="border border-gray-300 p-4 bg-gray-100 font-semibold text-base">연락처</td>
                      <td className="border border-gray-300 p-4 text-base value-cell">{academy.phone}</td>
                    </tr>
                  ) : (
                    <tr>
                      <td className="border border-gray-300 p-4 bg-gray-100 font-semibold text-base"></td>
                      <td className="border border-gray-300 p-4 text-base"></td>
                    </tr>
                  )}
                  <tr ref={lastRowA}>
                    <td className="border border-gray-300 p-4 bg-gray-100 font-semibold text-base">주소</td>
                    <td className="border border-gray-300 p-4 text-base value-cell address-cell">{academy.address || '(미입력)'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col">
            <p className="mb-2 font-semibold text-sm">을 (근로자)</p>
            <div className="overflow-x-auto">
              <table className="party-table w-full border-collapse border border-gray-300">
                <tbody>
                  <tr>
                    <td className="border border-gray-300 p-4 bg-gray-100 font-semibold text-base">성명</td>
                    <td className="border border-gray-300 p-4 text-base value-cell">{instructor.name || '(미입력)'}</td>
                  </tr>
                  {instructor.birthDate ? (
                    <tr>
                      <td className="border border-gray-300 p-4 bg-gray-100 font-semibold text-base">생년월일</td>
                      <td className="border border-gray-300 p-4 text-base value-cell">{instructor.birthDate}</td>
                    </tr>
                  ) : (
                    <tr>
                      <td className="border border-gray-300 p-4 bg-gray-100 font-semibold text-base"></td>
                      <td className="border border-gray-300 p-4 text-base"></td>
                    </tr>
                  )}
                  {instructor.phone ? (
                    <tr>
                      <td className="border border-gray-300 p-4 bg-gray-100 font-semibold text-base">연락처</td>
                      <td className="border border-gray-300 p-4 text-base value-cell">{instructor.phone}</td>
                    </tr>
                  ) : (
                    <tr>
                      <td className="border border-gray-300 p-4 bg-gray-100 font-semibold text-base"></td>
                      <td className="border border-gray-300 p-4 text-base"></td>
                    </tr>
                  )}
                  <tr>
                    <td className="border border-gray-300 p-4 bg-gray-100 font-semibold text-base">담당과목</td>
                    <td className="border border-gray-300 p-4 text-base value-cell">{instructor.subject || '(미입력)'}</td>
                  </tr>
                  {instructor.address ? (
                    <tr ref={lastRowB}>
                      <td className="border border-gray-300 p-4 bg-gray-100 font-semibold text-base">주소</td>
                      <td className="border border-gray-300 p-4 text-base value-cell address-cell">{instructor.address}</td>
                    </tr>
                  ) : (
                    <tr ref={lastRowB}>
                      <td className="border border-gray-300 p-4 bg-gray-100 font-semibold text-base"></td>
                      <td className="border border-gray-300 p-4 text-base"></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="print-section">
        <h2 className="text-base font-bold mt-8 mb-3 border-l-4 border-navy pl-3">제{clauseNumberMap.period}조 (계약기간)</h2>
        <p className="mb-2 text-base">
          ① 본 계약의 기간은 {contractPeriod.startDate || '(시작일)'}부터 {contractPeriod.endDate || '(종료일)'}까지로 한다.
        </p>
        {(contractPeriod.probationMonths || 0) > 0 && (
          <p className="text-base">② 수습기간: 계약개시일로부터 {contractPeriod.probationMonths}개월</p>
        )}
      </div>

      <div className="print-section">
        <h2 className="text-base font-bold mt-8 mb-3 border-l-4 border-navy pl-3">제{clauseNumberMap.duties}조 (업무내용)</h2>
        <p className="mb-2 text-base">을의 담당 업무는 다음과 같다.</p>
        <ul className="list-disc list-inside pl-6 space-y-1 text-base">
          <li>담당 과목: {instructor.subject || '(미입력)'}</li>
          {(instructor as Instructor).grade && <li>담당 학년: {(instructor as Instructor).grade}</li>}
          <li>갑이 지시하는 교육 관련 업무</li>
        </ul>
      </div>

      <div className="print-section">
        <h2 className="text-base font-bold mt-8 mb-3 border-l-4 border-navy pl-3">제{clauseNumberMap.workHours}조 (근로시간)</h2>
        <p className="mb-2 text-base">① 소정근로시간 및 휴게시간의 상세 사항은 별지 제1호에 따른다.</p>
        <p className="text-base">
          ② 1주 소정근로시간은 1주 {weeklyHours}시간이며, 1일 소정근로시간은 {dailyHours.toFixed(1)}시간으로 한다.
        </p>
      </div>

      <div className="print-section">
        <h2 className="text-base font-bold mt-8 mb-3 border-l-4 border-navy pl-3">제{clauseNumberMap.breakTime}조 (휴게시간)</h2>
        <p className="mb-2 text-base">① 4시간 이상 근로하는 경우 30분 이상, 8시간 이상 근로하는 경우 1시간 이상의 휴게시간을 부여한다.</p>
        <p className="text-base">② 휴게시간은 근로시간 도중에 자유롭게 이용할 수 있다.</p>
      </div>

      <div className="print-section clause-wage">
        <h2 className="text-base font-bold mt-8 mb-3 border-l-4 border-navy pl-3">제{clauseNumberMap.wage}조 (임금)</h2>
        {salaryType === 'PERCENTAGE' && (
          <>
            {(() => {
              const minGuarantee = percentageMinimum.minGuarantee;
              return (
                <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                  <p className="text-sm font-bold text-blue-900 mb-2">📌 급여 산정 방식</p>
                  <div className="flex items-center justify-center gap-3 text-sm">
                    <div className="px-4 py-2 bg-white rounded-lg border border-blue-300 text-center">
                      <p className="text-xs text-gray-500">매출 기준</p>
                      <p className="font-bold text-blue-800">매출 × {salary.revenueRatio || 0}%</p>
                    </div>
                    <span className="text-lg font-bold text-blue-600">VS</span>
                    <div className="px-4 py-2 bg-white rounded-lg border border-blue-300 text-center">
                      <p className="text-xs text-gray-500">최소 보장</p>
                      <p className="font-bold text-blue-800">{formatCurrency(minGuarantee)}원</p>
                    </div>
                  </div>
                  <p className="text-center mt-3 text-sm text-blue-800 font-medium">
                    👉 <strong>둘 중 큰 금액</strong>을 매월 지급합니다.
                  </p>
                </div>
              );
            })()}
          </>
        )}
        <div className="mt-4 space-y-2">
          <p className="text-sm text-gray-600">① 급여 지급일: 매월 {salary.payDay || 10}일</p>
          <p className="text-sm text-gray-600">② 을이 지정한 금융기관 계좌로 이체하여 지급한다.</p>
          <p className="text-sm text-gray-600">③ 상세 항목 및 산정 내역은 별지 제2호에 따른다.</p>
          {salaryType === 'PERCENTAGE' && (
            <p className="text-sm text-gray-600 mt-2">※ 매월 정산 급여가 최소 보장 금액에 미달할 경우, 최소 보장 금액을 지급합니다.</p>
          )}
          {salaryType !== 'PERCENTAGE' && (
            <p className="mt-2 text-sm text-gray-500">※ 위 금액은 세전금액이며, 실제 지급액은 소득세 및 4대보험료를 공제한 후의 금액입니다.</p>
          )}
        </div>
      </div>

      <div className="print-section">
        <h2 className="text-base font-bold mt-8 mb-3 border-l-4 border-navy pl-3">제{clauseNumberMap.holiday}조 (휴일 및 휴가)</h2>
        <p className="mb-2 text-base">① 주휴일: 매주 일요일</p>
        <p className="mb-2 text-base">② 법정공휴일은 유급휴일로 한다.</p>
        <p className="mb-2 text-base">③ 연차유급휴가는 근로기준법에 따라 부여한다.</p>
        <p className="text-base">④ 1년간 80% 이상 출근 시 15일의 유급휴가 부여, 1년 미만 근로자는 1개월 개근 시 1일 부여</p>
      </div>

      <div className="print-section">
        <h2 className="text-base font-bold mt-8 mb-3 border-l-4 border-navy pl-3">제{clauseNumberMap.retirement}조 (퇴직급여)</h2>
        <p className="mb-2 text-base">① 계속근로기간이 1년 이상인 경우, 퇴직일로부터 14일 이내에 퇴직급여를 지급한다.</p>
        <p className="mb-2 text-base">② 퇴직급여는 근로자퇴직급여보장법에 따라 산정한다.</p>
        <p className="text-base">③ 퇴직급여 = 1일 평균임금 × 30일 × (근속연수)</p>
      </div>

      <div className="print-section">
        <h2 className="text-base font-bold mt-8 mb-3 border-l-4 border-navy pl-3">제{clauseNumberMap.confidential}조 (비밀유지)</h2>
        <p className="mb-2 text-base">① 을은 재직 중 및 퇴직 후에도 갑의 경영상, 영업상 비밀 및 학생·학부모 정보를 누설하여서는 아니 된다.</p>
        <p className="mb-2 text-base">② 비밀의 범위는 다음 각 호와 같다.</p>
        <ul className="list-disc list-inside pl-6 space-y-1 text-base">
          <li>갑의 교육 프로그램, 교재, 교구 등 교육 관련 정보</li>
          <li>학생 및 학부모의 개인정보</li>
          <li>갑의 영업상 비밀 및 고객 정보</li>
          <li>기타 갑이 비밀에 유지할 필요가 있다고 인정하는 정보</li>
        </ul>
      </div>

      {protection.hasNonCompete && (
        <div className="print-section">
          <h2 className="text-base font-bold mt-8 mb-3 border-l-4 border-navy pl-3">제{clauseNumberMap.nonCompete}조 (경업금지)</h2>
          <p className="mb-2 text-base">
            ① 을은 퇴직 후 {protection.nonCompetePeriod || 0}개월간 {academy.name || '갑'}으로부터 반경 {protection.nonCompeteRadius || 0}km 이내에서
            동종 업종에 종사하지 않는다.
          </p>
          <p className="mb-2 text-base">
            ② 경업금지의 대가로 갑은 을에게 매월 {formatCurrency(protection.nonCompeteCompensation || 0)}원을 지급한다. 이 금액은 본 계약 제6조의 급여에 포함하여 지급한다.
          </p>
          <p className="text-base">③ 을이 본 조를 위반한 경우, 갑에게 발생한 손해를 배상할 책임을 진다.</p>
        </div>
      )}

      <div className="print-section">
        <h2 className="text-base font-bold mt-8 mb-3 border-l-4 border-navy pl-3">제{clauseNumberMap.damages}조 (손해배상)</h2>
        <p className="mb-2 text-base">① 당사자 일방이 고의 또는 중대한 과실로 상대방에게 손해를 입힌 경우, 그 손해를 배상할 책임을 진다.</p>
        <p className="text-base">② 본 계약에 위약금 또는 손해배상액을 예정하는 계약을 하지 아니한다.</p>
      </div>

      <div className="print-section">
        <h2 className="text-base font-bold mt-8 mb-3 border-l-4 border-navy pl-3">제{clauseNumberMap.others}조 (기타)</h2>
        <p className="mb-2 text-base">① 본 계약서에 명시되지 않은 사항은 근로기준법 및 관계 법령에 따른다.</p>
        <p className="text-base">② 본 계약서는 2부를 작성하여 갑과 을이 각 1부씩 보관한다.</p>
      </div>

      <div className="print-section">
        <h2 className="text-base font-bold mt-8 mb-3 border-l-4 border-navy pl-3">제{clauseNumberMap.jurisdiction}조 (관할법원)</h2>
        <p className="text-base">본 계약과 관련하여 분쟁이 발생한 경우, 갑의 주소지 관할법원을 제1심 관할법원으로 한다.</p>
      </div>

      <div className="print-section">
        {specialTerms && (
          <div>
            <h2 className="text-base font-bold mt-8 mb-3 border-l-4 border-navy pl-3">【특약사항】</h2>
            <p className="whitespace-pre-wrap text-base">{specialTerms}</p>
          </div>
        )}

        {showSignatureSection && (
          <div className="mt-12 text-center">
            <p className="mb-8 text-base">
              위 계약을 증명하기 위하여 본 계약서 2부를 작성하여 갑과 을이 각각 서명 날인 후 1부씩 보관한다.
            </p>
            <p className="text-xl font-bold mb-8">
              {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
              <div className="border-2 border-gray-400 rounded-lg p-6">
                <div className="text-left space-y-2 mb-6">
                  <p className="font-semibold text-base">갑 (사용자)</p>
                  <p className="font-medium text-base">상호: {academy.name || '(미입력)'}</p>
                  <p className="text-base">주소: {academy.address || '(미입력)'}</p>
                  <p className="text-base">대표자: {academy.representative || '(미입력)'}</p>
                </div>
                <div className="mt-8 pt-6 border-t border-gray-300 flex items-center justify-center">
                  {stampUrl ? (
                    <img src={stampUrl} alt="학원 직인" crossOrigin="anonymous" className="h-24 w-24 object-contain" />
                  ) : (
                    <div className="w-16 h-16 border-2 border-gray-400 rounded-full inline-flex items-center justify-center">
                      <span className="text-sm text-gray-600">인</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-2 border-gray-400 rounded-lg p-6">
                <div className="text-left space-y-2 mb-6">
                  <p className="font-semibold text-base">을 (근로자)</p>
                  <p className="font-medium text-base">성명: {instructor.name || '(미입력)'}</p>
                  {instructor.address && <p className="text-base">주소: {instructor.address}</p>}
                  {instructor.phone && <p className="text-base">연락처: {instructor.phone}</p>}
                </div>
                <div className="mt-8 pt-6 border-t border-gray-300 flex items-center justify-center">
                  {signature.dataUrl ? (
                    <img src={signature.dataUrl} alt="강사 서명" crossOrigin="anonymous" className="h-24 w-24 object-contain" />
                  ) : (
                    <div className="w-16 h-16 border-2 border-gray-400 rounded-full inline-flex items-center justify-center">
                      <span className="text-sm text-gray-600">인</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showAnnex && (
        <div style={{ breakBefore: 'page' }} className="print-section mt-12">
          <div className="mb-6">
            <h2 className="text-base font-bold text-navy mb-4 border-l-4 border-navy pl-3">【별지 1】 상세 근로시간표</h2>
            <div className="overflow-x-auto my-3">
              <table className="annex-table w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100 font-semibold">
                    <th className="border border-gray-300 p-3 text-left w-32 text-base">요일</th>
                    <th className="border border-gray-300 p-3 text-left text-base">근무시간</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleDetails.length > 0 ? (
                    scheduleDetails.map((item) => {
                      const openIndex = item.indexOf('(');
                      const closeIndex = item.indexOf(')');
                      const day = openIndex > -1 ? item.slice(0, openIndex) : item;
                      const time = openIndex > -1 && closeIndex > -1 ? item.slice(openIndex + 1, closeIndex) : '';
                      return (
                        <tr key={item}>
                          <td className="border border-gray-300 p-4 text-base">{day}</td>
                          <td className="border border-gray-300 p-4 text-base">{time || '(미입력)'}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="border border-gray-300 p-4 text-base" colSpan={2}>
                        (미입력)
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="text-base font-bold text-navy mb-4 border-l-4 border-navy pl-3">【별지 2】 상세 임금산정 내역</h2>
            <div className="overflow-x-auto my-3">
              <table className="annex-table w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100 font-semibold">
                    <th className="border border-gray-300 p-3 text-left w-40 text-base">항목</th>
                    <th className="border border-gray-300 p-3 text-right w-40 text-base">금액</th>
                    <th className="border border-gray-300 p-3 text-left text-base">비고</th>
                  </tr>
                </thead>
                <tbody>
                  {salaryType === 'FIXED' && (
                    <>
                      <tr>
                        <td className="border border-gray-300 p-4 text-base">기본급</td>
                        <td className="border border-gray-300 p-4 text-right font-mono text-base">{formatCurrency(salary.baseSalary || 0)}원</td>
                        <td className="border border-gray-300 p-4 text-base"></td>
                      </tr>
                      {getWeeklyHolidayPay() > 0 && (
                        <tr>
                          <td className="border border-gray-300 p-4 text-base">주휴수당</td>
                          <td className="border border-gray-300 p-4 text-right font-mono text-base">{formatCurrency(getWeeklyHolidayPay())}원</td>
                          <td className="border border-gray-300 p-4 text-sm text-gray-500">{getWeeklyHolidayPayNote()}</td>
                        </tr>
                      )}
                    </>
                  )}
                  {salaryType === 'PERCENTAGE' && (
                    <>
                      {(() => {
                        const minGuarantee = percentageMinimum.minGuarantee;
                        const monthlyTotal = getTotalSalary();
                        const separatePay = protection.hasNonCompete ? protection.nonCompeteCompensation || 0 : 0;
                        return (
                          <>
                            <tr>
                              <td className="border border-gray-300 p-3 text-base">급여 산정 기준</td>
                              <td className="border border-gray-300 p-3 text-right font-semibold text-base">매출의 {salary.revenueRatio || 0}%</td>
                              <td className="border border-gray-300 p-3 text-sm text-gray-600">담당 수강료 기준</td>
                            </tr>
                            <tr className="bg-gray-50">
                              <td className="border border-gray-300 p-3 font-medium text-base" colSpan={3}>
                                최소 보장 내역
                              </td>
                            </tr>
                            <tr>
                              <td className="border border-gray-300 p-3 pl-6 text-base">기본급</td>
                              <td className="border border-gray-300 p-3 text-right font-mono text-base">{formatCurrency(salary.percentageBaseSalary || 0)}원</td>
                              <td className="border border-gray-300 p-3 text-base"></td>
                            </tr>
                            <tr>
                              <td className="border border-gray-300 p-3 pl-6 text-base">주휴수당</td>
                              <td className="border border-gray-300 p-3 text-right font-mono text-base">{formatCurrency(percentageMinimum.weeklyHolidayPay)}원</td>
                              <td className="border border-gray-300 p-3 text-sm text-gray-600"></td>
                            </tr>
                            {salary.mealAllowance ? (
                              <tr>
                                <td className="border border-gray-300 p-3 pl-6 text-base">식대</td>
                                <td className="border border-gray-300 p-3 text-right font-mono text-base">{formatCurrency(salary.mealAllowance)}원</td>
                                <td className="border border-gray-300 p-3 text-sm text-green-600">비과세</td>
                              </tr>
                            ) : null}
                            {salary.transportAllowance ? (
                              <tr>
                                <td className="border border-gray-300 p-3 pl-6 text-base">자가운전보조금</td>
                                <td className="border border-gray-300 p-3 text-right font-mono text-base">{formatCurrency(salary.transportAllowance)}원</td>
                                <td className="border border-gray-300 p-3 text-sm text-green-600">비과세</td>
                              </tr>
                            ) : null}
                            {salary.positionAllowance ? (
                              <tr>
                                <td className="border border-gray-300 p-3 pl-6 text-base">직책수당</td>
                                <td className="border border-gray-300 p-3 text-right font-mono text-base">{formatCurrency(salary.positionAllowance)}원</td>
                                <td className="border border-gray-300 p-3 text-base"></td>
                              </tr>
                            ) : null}
                            {salary.otherAllowance ? (
                              <tr>
                                <td className="border border-gray-300 p-3 pl-6 text-base">기타수당</td>
                                <td className="border border-gray-300 p-3 text-right font-mono text-base">{formatCurrency(salary.otherAllowance)}원</td>
                                <td className="border border-gray-300 p-3 text-sm text-gray-600">{salary.otherAllowanceMemo || ''}</td>
                              </tr>
                            ) : null}
                            {salary.overtimeAllowance ? (
                              <tr>
                                <td className="border border-gray-300 p-3 pl-6 text-base">연장근로수당</td>
                                <td className="border border-gray-300 p-3 text-right font-mono text-base">{formatCurrency(salary.overtimeAllowance)}원</td>
                                <td className="border border-gray-300 p-3 text-sm text-gray-600">법정 연장근로수당</td>
                              </tr>
                            ) : null}
                            {(protection.hasNonCompete && (protection.nonCompeteCompensation || 0) > 0) && (
                              <>
                                <tr className="bg-gray-50">
                                  <td className="border border-gray-300 p-3 font-medium text-base" colSpan={3}>
                                    별도 지급 항목
                                  </td>
                                </tr>
                                {protection.hasNonCompete && (protection.nonCompeteCompensation || 0) > 0 && (
                                  <tr>
                                    <td className="border border-gray-300 p-3 pl-6 text-base">경업금지대가</td>
                                    <td className="border border-gray-300 p-3 text-right font-mono text-base">{formatCurrency(protection.nonCompeteCompensation || 0)}원</td>
                                    <td className="border border-gray-300 p-3 text-sm text-gray-600">
                                      제{clauseNumberMap.nonCompete}조 참조
                                    </td>
                                  </tr>
                                )}
                              </>
                            )}
                            <tr className="bg-blue-50">
                              <td className="border-2 border-blue-200 p-3 font-bold text-blue-900 text-base">월 급여 (세전)</td>
                              <td className="border-2 border-blue-200 p-3 text-right font-bold text-blue-900 text-lg">
                                {formatCurrency(monthlyTotal)}원
                              </td>
                              <td className="border-2 border-blue-200 p-3 text-sm text-blue-800">
                                매출 기준과 최소 보장 중 큰 금액 + 별도 지급 {separatePay ? `(${formatCurrency(separatePay)}원)` : ''}
                              </td>
                            </tr>
                          </>
                        );
                      })()}
                    </>
                  )}
                  {salaryType === 'HOURLY' && (
                    <>
                      <tr>
                        <td className="border border-gray-300 p-4 text-base">기본급</td>
                        <td className="border border-gray-300 p-4 text-right font-mono text-base">
                          {formatCurrency(Math.round((salary.hourlyWage || 0) * weeklyHours * 4.345))}원
                        </td>
                        <td className="border border-gray-300 p-4 text-sm text-gray-500">
                          {salary.hourlyWage || 0}원 × {weeklyHours}시간 × 4.345주
                        </td>
                      </tr>
                      {getWeeklyHolidayPay() > 0 && (
                        <tr>
                          <td className="border border-gray-300 p-4 text-base">주휴수당</td>
                          <td className="border border-gray-300 p-4 text-right font-mono text-base">{formatCurrency(getWeeklyHolidayPay())}원</td>
                          <td className="border border-gray-300 p-4 text-sm text-gray-500">{getWeeklyHolidayPayNote()}</td>
                        </tr>
                      )}
                    </>
                  )}
                  {salaryType !== 'PERCENTAGE' && salary.mealAllowance ? (
                    <tr>
                      <td className="border border-gray-300 p-4 text-base">식대</td>
                      <td className="border border-gray-300 p-4 text-right font-mono text-base">{formatCurrency(salary.mealAllowance)}원</td>
                      <td className="border border-gray-300 p-4 text-base">비과세</td>
                    </tr>
                  ) : null}
                  {salary.transportAllowance ? (
                    <tr>
                      <td className="border border-gray-300 p-4 text-base">자가운전보조금</td>
                      <td className="border border-gray-300 p-4 text-right font-mono text-base">{formatCurrency(salary.transportAllowance)}원</td>
                      <td className="border border-gray-300 p-4 text-base">비과세</td>
                    </tr>
                  ) : null}
                  {salaryType !== 'PERCENTAGE' && salary.overtimeAllowance ? (
                    <tr>
                      <td className="border border-gray-300 p-4 text-base">연장근로수당</td>
                      <td className="border border-gray-300 p-4 text-right font-mono text-base">{formatCurrency(salary.overtimeAllowance)}원</td>
                      <td className="border border-gray-300 p-4 text-base"></td>
                    </tr>
                  ) : null}
                  {salaryType !== 'PERCENTAGE' && salary.positionAllowance ? (
                    <tr>
                      <td className="border border-gray-300 p-4 text-base">직책수당</td>
                      <td className="border border-gray-300 p-4 text-right font-mono text-base">{formatCurrency(salary.positionAllowance)}원</td>
                      <td className="border border-gray-300 p-4 text-base"></td>
                    </tr>
                  ) : null}
                  {salaryType !== 'PERCENTAGE' && salary.otherAllowance ? (
                    <tr>
                      <td className="border border-gray-300 p-4 text-base">기타수당</td>
                      <td className="border border-gray-300 p-4 text-right font-mono text-base">{formatCurrency(salary.otherAllowance)}원</td>
                      <td className="border border-gray-300 p-4 text-sm text-gray-600">{salary.otherAllowanceMemo || ''}</td>
                    </tr>
                  ) : null}
                  {salaryType !== 'PERCENTAGE' && protection.hasNonCompete && (protection.nonCompeteCompensation || 0) > 0 && (
                    <tr>
                      <td className="border border-gray-300 p-4 text-base">경업금지대가</td>
                      <td className="border border-gray-300 p-4 text-right font-mono text-base">{formatCurrency(protection.nonCompeteCompensation || 0)}원</td>
                      <td className="border border-gray-300 p-4 text-base"></td>
                    </tr>
                  )}
                  {salaryType !== 'PERCENTAGE' && (
                    <tr className="bg-navy/10">
                      <td className="border-2 border-navy/30 p-3 font-bold text-navy text-base">월 예상 총액 (세전)</td>
                      <td className="border-2 border-navy/30 p-3 text-right font-mono font-bold text-navy text-lg">
                        {formatCurrency(getTotalSalary())}원 ({numberToKorean(getTotalSalary())}원)
                      </td>
                      <td className="border-2 border-navy/30 p-3 text-sm text-navy">세전</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="mt-12 pt-4 border-t border-gray-300 text-center text-base text-gray-500">
        <p>
          본 계약서는 <span className="font-semibold text-navy">학온(HAGON)</span> 전자계약 시스템을 통해 생성되었습니다.
        </p>
      </div>
    </div>
  );
}

