<script lang="ts">
    import { page } from '$app/state';
    import { onMount } from 'svelte';
    import type { Questionnaire } from '#lib';
    import BackHome from '#lib/components/BackHome.svelte';

    type AppliedQuestionnaire = {
        questionnaireId: string;
        questionnaireTitle: string;
        name: string;
        answers: Record<string, string | string[]>;
        savedAt: string;
    };

    let submission = $state<AppliedQuestionnaire | null>(null);
    let questionnaire = $state<Questionnaire | null>(null);

    onMount(() => {
        const name = page.url.searchParams.get('name');
        if (!name) return;

        try {
            const saved = localStorage.getItem(
                `questionnaire-response:${name}`
            );

            if (!saved) return;

            submission = JSON.parse(saved);

            const definition = localStorage.getItem(
                submission.questionnaireId
            );

            if (definition) {
                questionnaire = JSON.parse(definition);
            }
        } catch {
            submission = null;
            questionnaire = null;
        }
    });

    
function downloadCSV() {
    if (!submission || !questionnaire) return;

    const rows = [
        ['Question', 'Type', 'Answer']
    ];

    for (const question of questionnaire.questions) {
        const answer = submission.answers[question.id];

        let formattedAnswer = '';

        if (Array.isArray(answer)) {
            formattedAnswer = answer
                .map((option, index) =>
                    question.type === 'priority'
                        ? `${index + 1}º - ${option}`
                        : option
                )
                .join('; ');
        } else if (typeof answer === 'string') {
            formattedAnswer = answer;
        }

        rows.push([
            question.description,
            question.type,
            formattedAnswer
        ]);
    }

    const escapeCSV = (value: string) =>
        `"${value.replace(/"/g, '""')}"`;

    const csv = '\uFEFF' + rows
        .map(row => row.map(escapeCSV).join(','))
        .join('\r\n');

    const blob = new Blob([csv], {
        type: 'text/csv;charset=utf-8;'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `${submission.name}.csv`;
    link.click();

    URL.revokeObjectURL(url);
}

</script>

<svelte:head>
    <title>Applied questionnaire</title>
    <meta
        name="viewport"
        content="width=device-width, initial-scale=1, viewport-fit=cover"
    />
</svelte:head>

<div class="min-h-screen bg-slate-50 px-4 py-6 sm:px-8 sm:py-8">
    <main class="mx-auto max-w-4xl">
        {#if submission && questionnaire}
            <!-- Page header -->
            <header class="mb-8">
                <p class="text-sm font-semibold uppercase tracking-widest text-indigo-600">
                    Questionnaire response
                </p>

                <div class="mt-4">
                    <BackHome />
                </div>

                <h1 class="mt-4 break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    {submission.name}
                </h1>

                <p class="mt-2 break-words text-sm text-slate-500 sm:text-base">
                    Questionnaire: {questionnaire.title}
                </p>
</header>
            <!-- Response summary -->
            <section class="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div>
                    <h2 class="font-semibold text-slate-900">
                        Applied questionnaire
                    </h2>
                    <p class="mt-1 text-sm text-slate-500">
                        Review the answers submitted in this response.
                    </p>
                </div>

                <button
                    type="button"
                    onclick={downloadCSV}
                    class="min-h-12 w-full shrink-0 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
                >
                    <span class="inline-flex items-center justify-center gap-2">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            class="size-4"
                            aria-hidden="true"
                        >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <path d="m7 10 5 5 5-5" />
                            <path d="M12 15V3" />
                        </svg>
                        Download CSV
                    </span>
                </button>
            </section>

            <!-- Questions and submitted answers -->
            <section class="space-y-4">
                <div class="mb-4 flex items-center justify-between gap-3">
                    <div>
                        <h2 class="text-xl font-bold text-slate-900">
                            Submitted answers
                        </h2>
                        <p class="mt-1 text-sm text-slate-500">
                            The selected options and written answers are shown below.
                        </p>
                    </div>

                    <span class="shrink-0 rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700">
                        {questionnaire.questions.length}
                    </span>
                </div>

                {#each questionnaire.questions as question, index (question.id)}
                    <article class="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                        <div class="flex items-start gap-3 sm:gap-4">
                            <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-sm font-bold text-indigo-700">
                                {index + 1}
                            </div>

                            <div class="min-w-0 flex-1">
                                <div class="mb-4 flex flex-wrap items-center gap-2">
                                    <span class="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                                        {question.type}
                                    </span>
                                </div>

                                <h3 class="break-words font-semibold leading-relaxed text-slate-900">
                                    {question.description}
                                </h3>

                                {#if question.type === 'open'}
                                    <div class="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                                        <p class="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
                                            {typeof submission.answers[question.id] === 'string'
                                                ? submission.answers[question.id]
                                                : 'No answer'}
                                        </p>
                                    </div>

                                {:else if question.type === 'closed'}
                                    <div class="mt-4 space-y-2">
                                        {#each question.options as option}
                                            <label class="flex min-h-12 items-center gap-3 rounded-lg border px-3 py-3 text-sm {submission.answers[question.id] === option
                                                ? 'border-indigo-300 bg-indigo-50 text-indigo-900'
                                                : 'border-slate-200 bg-white text-slate-600'}">
                                                <input
                                                    type="radio"
                                                    checked={submission.answers[question.id] === option}
                                                    disabled
                                                    class="size-4 shrink-0 accent-indigo-600"
                                                />
                                                <span class="min-w-0 break-words">
                                                    {option}
                                                </span>

                                                {#if submission.answers[question.id] === option}
                                                    <span class="ml-auto shrink-0 text-xs font-semibold text-indigo-700">
                                                        Selected
                                                    </span>
                                                {/if}
                                            </label>
                                        {/each}
                                    </div>

                                {:else if question.type === 'multiple-choice'}
                                    <div class="mt-4 space-y-2">
                                        {#each question.options as option}
                                            <label class="flex min-h-12 items-center gap-3 rounded-lg border px-3 py-3 text-sm {Array.isArray(submission.answers[question.id]) &&
                                                submission.answers[question.id].includes(option)
                                                ? 'border-indigo-300 bg-indigo-50 text-indigo-900'
                                                : 'border-slate-200 bg-white text-slate-600'}">
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        Array.isArray(submission.answers[question.id]) &&
                                                        submission.answers[question.id].includes(option)
                                                    }
                                                    disabled
                                                    class="size-4 shrink-0 rounded accent-indigo-600"
                                                />
                                                <span class="min-w-0 break-words">
                                                    {option}
                                                </span>

                                                {#if Array.isArray(submission.answers[question.id]) &&
                                                    submission.answers[question.id].includes(option)}
                                                    <span class="ml-auto shrink-0 text-xs font-semibold text-indigo-700">
                                                        Selected
                                                    </span>
                                                {/if}
                                            </label>
                                        {/each}
                                    </div>

                                {:else if question.type === 'priority'}
                                    {@const ranked = Array.isArray(submission.answers[question.id])
                                        ? submission.answers[question.id] as string[]
                                        : []}

                                    <ol class="mt-4 space-y-2">
                                        {#each ranked as option, index}
                                            <li class="flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                                                <span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-sm font-bold text-indigo-700">
                                                    {index + 1}
                                                </span>
                                                <span class="min-w-0 break-words text-sm font-medium text-slate-800">
                                                    {option}
                                                </span>
                                                <span class="ml-auto shrink-0 text-xs font-medium text-slate-400">
                                                    {index + 1}º
                                                </span>
                                            </li>
                                        {/each}
                                    </ol>
                                {/if}
                            </div>
                        </div>
                    </article>
                {/each}
            </section>
        {:else}
            <section class="rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
                <div class="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="size-7"
                        aria-hidden="true"
                    >
                        <path d="M8 6h13" />
                        <path d="M8 12h13" />
                        <path d="M8 18h13" />
                        <path d="M3 6h.01" />
                        <path d="M3 12h.01" />
                        <path d="M3 18h.01" />
                    </svg>
                </div>

                <h1 class="text-xl font-bold text-slate-900">
                    Applied questionnaire not found
                </h1>

                <p class="mt-2 text-sm text-slate-500">
                    The requested questionnaire response could not be loaded.
                </p>
            </section>
        {/if}
    </main>
</div>
