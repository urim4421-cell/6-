import React from 'react';
import type { SubjectFilter } from '../types';

interface SubjectSelectorProps {
  value: SubjectFilter;
  onChange: (subject: SubjectFilter) => void;
  includeAll?: boolean;
}

const ALL_OPTIONS: SubjectFilter[] = ['전체', '국어', '수학', '사회', '과학'];
const SUBJECT_ONLY_OPTIONS: SubjectFilter[] = ['국어', '수학', '사회', '과학'];

export const SubjectSelector: React.FC<SubjectSelectorProps> = ({
  value,
  onChange,
  includeAll = true,
}) => {
  const options = includeAll ? ALL_OPTIONS : SUBJECT_ONLY_OPTIONS;

  return (
    <div
      role="group"
      aria-label="교과 과목 선택"
      className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200"
    >
      {options.map((subj) => {
        const active = value === subj;
        return (
          <button
            key={subj}
            type="button"
            onClick={() => onChange(subj)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 ${
              active
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {subj === '전체' ? '전체 과목' : subj}
          </button>
        );
      })}
    </div>
  );
};
