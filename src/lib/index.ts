export type QuestionType =  | 'open'| 'closed' | 'multiple-choice' | 'priority';

export interface Question {
    id: string;
    description: string;
    type: QuestionType;
    required: boolean;
    options: string[]
    answers: Record<string, string | string[]>;
}

export interface Questionnaire {
    id: string;
    title: string;
    questions: Question[]
}


