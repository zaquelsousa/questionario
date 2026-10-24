// place files you want to import through the `#lib` alias in this folder.

export type QuestionType =  | 'open'| 'closed' | 'multiple-choice' | 'priority';

export interface Question {
    id: string;
    description: string;
    type: QuestionType;
    required: boolean;
    options: string[]
    answer?: string;
}

export interface Questionnaire {
    id: string;
    title: string;
    questions: Question[]
}


