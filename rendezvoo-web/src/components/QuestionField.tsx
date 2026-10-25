'use client';

import type { Question } from '@/lib/types';
import { Card, Chip, TextArea } from './ui';

/** One invite question, rendered as the right input for its type. Every question is optional. */
export function QuestionField({ question, value, onChange, disabled }: {
  question: Question; value: unknown; onChange: (v: unknown) => void; disabled?: boolean;
}) {
  return (
    <Card className="flex flex-col gap-3">
      <p className="font-semibold">{question.prompt}</p>
      {question.type === 'yn' && (
        <div className="flex gap-2">
          <Chip label="Yes" selected={value === true} disabled={disabled} onClick={() => onChange(value === true ? undefined : true)} />
          <Chip label="No" selected={value === false} disabled={disabled} onClick={() => onChange(value === false ? undefined : false)} />
        </div>
      )}
      {question.type === 'mcq' && (
        <div className="flex flex-wrap gap-2">
          {(question.options ?? []).map((o) => (
            <Chip key={o} label={o} selected={value === o} disabled={disabled} onClick={() => onChange(value === o ? undefined : o)} />
          ))}
        </div>
      )}
      {question.type === 'frq' && (
        <TextArea
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Type your answer"
        />
      )}
    </Card>
  );
}
