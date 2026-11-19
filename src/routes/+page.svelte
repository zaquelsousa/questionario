<script lang="ts">
    import type { Questionnaire } from "#lib";
import { onMount } from "svelte";

const nav = [
    {label: 'Novo questionario', href: '/createQuestionnarie'}
]

type AppliedQuestionnaire = {
    questionnaireId: string;
    questionnaireTitle: string;
    name: string;
    answers: Record<string, string | string[]>;
    savedAt: string;
};

//const questionnaires: Questionnaire[] = [];
let questionnaires = $state<Questionnaire[]>([]);
let applied = $state<AppliedQuestionnaire[]>([]);

let activeTab = $state<'questionnaires' | 'applied'>(
    'questionnaires'
);

onMount(() => {
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        const saved = localStorage.getItem(key);
        if (!saved) continue;

        try {
            const item = JSON.parse(saved);

            if (key.startsWith('questionnaire-response:')) {
                if (item.questionnaireId && item.answers) {
                    applied.push(item as AppliedQuestionnaire);
                }
            } else if (Array.isArray(item.questions)) {
                questionnaires.push(item as Questionnaire);
            }
        } catch {
            // Ignore invalid JSON.
        }
    }
});

    function generateId(): string {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }

        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            const bytes = crypto.getRandomValues(new Uint8Array(16));

            bytes[6] = (bytes[6] & 0x0f) | 0x40;
            bytes[8] = (bytes[8] & 0x3f) | 0x80;

            const hex = Array.from(bytes, b =>
                b.toString(16).padStart(2, '0')
            ).join('');

            return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
        }

        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

async function handleImport(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    try {
        const content = await file.text();
        const imported = JSON.parse(content);

        // Basic validation
        if (
            typeof imported !== 'object' ||
            imported === null ||
            typeof imported.title !== 'string' ||
            !Array.isArray(imported.questions)
        ) {
            throw new Error('Invalid questionnaire format.');
        }

        // Validate questions
        const validQuestions = imported.questions.every((q: any) =>
            typeof q.id === 'string' &&
            typeof q.description === 'string' &&
            ['open', 'closed', 'multiple-choice', 'priority'].includes(q.type) &&
            typeof q.required === 'boolean' &&
            Array.isArray(q.options) &&
            typeof q.answers === 'object'
        );

        if (!validQuestions) {
            throw new Error('The file contains invalid questions.');
        }

        // Create a new questionnaire
        const questionnaire: Questionnaire = {
            id: generateId(),
            title: imported.title,
            questions: imported.questions
        };

        // Save
        localStorage.setItem(
            questionnaire.id,
            JSON.stringify(questionnaire)
        );

        // Update state
        questionnaires.push(questionnaire);

        alert('Questionnaire imported successfully!');

    } catch (error) {
        console.error('Import error:', error);
        alert(
            error instanceof Error
                ? error.message
                : 'Failed to import questionnaire.'
        );
    } finally {
        // Reset input so the same file can be imported again
        input.value = '';
    }
}
</script>

<svelte:head>
    <title>Questionários</title>
</svelte:head>

<div class="min-h-screen bg-slate-50 px-4 py-6 sm:px-8 sm:py-8">
    <div class="mx-auto max-w-6xl">
        <header class="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h1 class="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    Questionários
                </h1>
                <p class="mt-2 text-sm text-slate-500">
                    Gerencie seus questionários e acompanhe as respostas.
                </p>
            </div>

            <nav class="flex flex-wrap gap-3">
                <label
                    class="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                    Importar
                    <input
                        type="file"
                        accept=".json,application/json"
                        class="hidden"
                        onchange={handleImport}
                    />
                </label>

                {#each nav as n}
                    <a
                        href={n.href}
                        class="inline-flex min-h-12 items-center justify-center rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                    >
                        + {n.label}
                    </a>
                {/each}
            </nav>    
        </header>

        <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div class="border-b border-slate-100">
                <div class="flex gap-2 overflow-x-auto" role="tablist" aria-label="Questionários">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'questionnaires'}
                        class={`min-h-12 shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                            activeTab === 'questionnaires'
                                ? 'border-indigo-600 text-indigo-700'
                                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                        }`}
                        onclick={() => activeTab = 'questionnaires'}
                    >
                        Questionários
                        <span class={`ml-1.5 rounded-full px-2 py-0.5 text-xs ${
                            activeTab === 'questionnaires'
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'bg-slate-100 text-slate-600'
                        }`}>
                            {questionnaires.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'applied'}
                        class={`min-h-12 shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                            activeTab === 'applied'
                                ? 'border-indigo-600 text-indigo-700'
                                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                        }`}
                        onclick={() => activeTab = 'applied'}
                    >
                        Aplicados
                        <span class={`ml-1.5 rounded-full px-2 py-0.5 text-xs ${
                            activeTab === 'applied'
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'bg-slate-100 text-slate-600'
                        }`}>
                            {applied.length}
                        </span>
                    </button>
                </div>
            </div>

            <div class="mt-6">
                {#if activeTab === 'questionnaires'}
                    <div class="mb-4">
                        <h2 class="text-lg font-bold text-slate-900">
                            Seus questionários
                        </h2>
                        <p class="mt-1 text-sm text-slate-500">
                            Abra um questionário para visualizar seus detalhes.
                        </p>
                    </div>

                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {#each questionnaires as q (q.id)}
                            <a
                                class="group flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                href={`/questionnaire/${q.id}`}
                            >
                                <div class="mb-4 flex size-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-100">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="size-5">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                                    </svg>
                                </div>

                                <h3 class="break-words text-base font-semibold text-slate-900 group-hover:text-indigo-700">
                                    {q.title}
                                </h3>

                                <p class="mt-2 text-sm text-slate-500">
                                    {q.questions.length}
                                    {q.questions.length === 1 ? 'questão' : 'questões'}
                                </p>

                                <span class="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600">
                                    Abrir questionário
                                    <span aria-hidden="true" class="transition group-hover:translate-x-1">→</span>
                                </span>
                            </a>
                        {:else}
                            <div class="col-span-full rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center">
                                <div class="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl font-semibold text-indigo-600">
                                    +
                                </div>
                                <h3 class="font-semibold text-slate-900">
                                    Nenhum questionário salvo ainda
                                </h3>
                                <p class="mt-2 text-sm text-slate-500">
                                    Crie seu primeiro questionário para começar.
                                </p>
                            </div>
                        {/each}
                    </div>
                {:else}
                    <div class="mb-4">
                        <h2 class="text-lg font-bold text-slate-900">
                            Questionários aplicados
                        </h2>
                        <p class="mt-1 text-sm text-slate-500">
                            Consulte os questionários respondidos.
                        </p>
                    </div>

                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {#each applied as a (a.name)}
                            <a
                                class="group flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                href={`/applied?name=${encodeURIComponent(a.name)}`}
                            >
                                <div class="mb-4 flex size-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-100">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="size-5">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                    </svg>
                                </div>

                                <h3 class="break-words text-base font-semibold text-slate-900 group-hover:text-indigo-700">
                                    {a.name}
                                </h3>

                                <p class="mt-2 break-words text-sm text-slate-600">
                                    {a.questionnaireTitle}
                                </p>

                                <span class="mt-3 text-xs text-slate-400">
                                    Aplicado em {new Date(a.savedAt).toLocaleDateString('pt-BR')}
                                </span>

                                <span class="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600">
                                    Ver respostas
                                    <span aria-hidden="true" class="transition group-hover:translate-x-1">→</span>
                                </span>
                            </a>
                        {:else}
                            <div class="col-span-full rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center">
                                <div class="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl text-indigo-600">
                                    ✓
                                </div>
                                <h3 class="font-semibold text-slate-900">
                                    Nenhum questionário aplicado ainda
                                </h3>
                                <p class="mt-2 text-sm text-slate-500">
                                    Quando alguém responder a um questionário, ele aparecerá aqui.
                                </p>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        </section>
    </div>
</div>
