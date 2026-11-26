import React from 'react';
import type { AppTab, StudentProfile } from '../types';

interface HeaderProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  currentStudent: StudentProfile | null;
  onOpenStudentModal: () => void;
}

const NAV_ITEMS: Array<{ id: AppTab; label: string }> = [
  { id: 'SHORT', label: '단문 연습' },
  { id: 'LONG', label: '장문 학습' },
  { id: 'ACID_RAIN', label: '산성비 게임' },
  { id: 'RACING', label: '레이싱 대결' },
  { id: 'TEACHER', label: '교사 대시보드' },
];

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  currentStudent,
  onOpenStudentModal,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-8 px-6 py-3.5">
        {/* Zone 1: Single-element Brand Wordmark */}
        <button
          type="button"
          onClick={() => onSelectTab('HOME')}
          className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 hover:text-sky-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 rounded"
        >
          한빛타자 6학년
        </button>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav
          aria-label="주요 학습 메뉴"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative py-1 whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 rounded ${
                  isActive
                    ? 'text-sky-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[15px] h-0.5 bg-sky-600"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenStudentModal}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
          >
            {currentStudent
              ? `${currentStudent.classNum}반 ${currentStudent.studentNum}번 ${currentStudent.name}`
              : '학생 접속하기'}
          </button>
        </div>
      </div>

      {/* Compact mobile navigation row */}
      <nav
        aria-label="모바일 학습 메뉴"
        className="flex md:hidden items-center gap-4 overflow-x-auto border-t border-slate-100 px-4 py-2 text-xs font-medium text-slate-600"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`py-1 whitespace-nowrap shrink-0 ${
                isActive ? 'text-sky-700 font-semibold underline underline-offset-4' : ''
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
