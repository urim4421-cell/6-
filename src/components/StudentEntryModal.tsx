import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { StudentProfile } from '../types';

interface StudentEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: StudentProfile[];
  currentStudent: StudentProfile | null;
  onSelectStudent: (student: StudentProfile) => void;
  onCreateStudent: (classNum: number, studentNum: number, name: string) => Promise<void>;
}

export const StudentEntryModal: React.FC<StudentEntryModalProps> = ({
  isOpen,
  onClose,
  students,
  currentStudent,
  onSelectStudent,
  onCreateStudent,
}) => {
  const [classNum, setClassNum] = useState(1);
  const [studentNum, setStudentNum] = useState(students.length + 1);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('이름을 입력해 주세요.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await onCreateStudent(classNum, studentNum, name.trim());
      setName('');
      onClose();
    } catch {
      setError('접속 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-modal-title"
    >
      <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 id="student-modal-title" className="text-lg font-bold text-slate-900">
              6학년 학생 접속 및 전환
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              이름을 선택하거나 새로 등록하면 연습 기록과 평균 타수가 실시간으로 저장됩니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="창 닫기"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5">
          <div className="text-xs font-semibold text-slate-700">우리 반 등록 학생 바로 선택</div>
          <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
            {students.map((stu) => {
              const selected = currentStudent?.id === stu.id;
              return (
                <button
                  key={stu.id}
                  type="button"
                  onClick={() => {
                    onSelectStudent(stu);
                    onClose();
                  }}
                  className={`flex flex-col items-start rounded-lg border px-3 py-2 text-left transition-colors ${
                    selected
                      ? 'border-sky-600 bg-sky-50 text-sky-900'
                      : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs font-semibold truncate w-full">
                    {stu.classNum}반 {stu.studentNum}번 {stu.name}
                  </span>
                  <span className="mt-0.5 text-[11px] text-slate-500 tabular-nums">
                    평균 {stu.avgCpm}타 · {stu.avgAccuracy}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 border-t border-slate-100 pt-5">
          <div className="text-xs font-semibold text-slate-700">새 학생으로 접속하기</div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label htmlFor="modal-class" className="block text-xs text-slate-600 mb-1">
                반
              </label>
              <input
                id="modal-class"
                type="number"
                min={1}
                max={15}
                value={classNum}
                onChange={(e) => setClassNum(Number(e.target.value) || 1)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums focus:border-sky-600 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="modal-num" className="block text-xs text-slate-600 mb-1">
                번호
              </label>
              <input
                id="modal-num"
                type="number"
                min={1}
                max={40}
                value={studentNum}
                onChange={(e) => setStudentNum(Number(e.target.value) || 1)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums focus:border-sky-600 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="modal-name" className="block text-xs text-slate-600 mb-1">
                이름
              </label>
              <input
                id="modal-name"
                type="text"
                maxLength={15}
                placeholder="예: 홍길동"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-600 focus:outline-none"
              />
            </div>
          </div>

          {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 whitespace-nowrap"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-50 whitespace-nowrap"
            >
              {submitting ? '접속 중...' : '접속 완료'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
