<script lang="ts">
import { page } from '$app/state';
import { beforeNavigate } from '$app/navigation';
import { onMount } from 'svelte';
import type { Questionnaire } from '#lib';
import BackHome from '#lib/components/BackHome.svelte';

let questionnaire = $state<Questionnaire | null>(null);

let answers = $state<Record<string, string | string[]>>({});

const hasAnswers = $derived(
    Object.values(answers).some((answer) =>
        Array.isArray(answer)
            ? answer.length > 0
            : answer.trim().length > 0
    )
);

beforeNavigate(({ cancel }) => {
    if (!hasAnswers) return;

    const shouldLeave = confirm(
        'Você tem respostas não salvas. Se sair desta página, seu progresso será perdido. Deseja continuar?'
    );

    if (!shouldLeave) {
        cancel();
    }
});

function handleBeforeUnload(event: BeforeUnloadEvent) {
    if (!hasAnswers) return;

    event.preventDefault();
    event.returnValue = '';
}

onMount(() => {
    const id = page.params.id;
    const saved = localStorage.getItem(id);

    if (saved) {
        questionnaire = JSON.parse(saved);
    }

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
    };
});

function downloadJSON(data: unknown, filename: string) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], {
        type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
}

function handleSubmit(event: SubmitEvent) {
    event.preventDefault();

    const name = prompt('Qual o nome deste questionário?');

    if (!name || !name.trim()) return;

    const key = `questionnaire-response:${name.trim()}`;

    if (localStorage.getItem(key)) {
        const overwrite = confirm(
            'Já existe um questionário com esse nome. Deseja sobrescrever?'
        );

        if (!overwrite) return;
    }

    const submission = {
        questionnaireId: questionnaire?.id,
        questionnaireTitle: questionnaire?.title,
        name: name.trim(),
        answers,
        savedAt: new Date().toISOString()
    };

    localStorage.setItem(key, JSON.stringify(submission));

    const filename = `${name.trim()}.json`
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');

    downloadJSON(submission, filename);

    alert('Questionário salvo com sucesso!');
}

function exportQuestionnaire(questionnaire: Questionnaire) {
    const template = {
        ...questionnaire,
        questions: questionnaire.questions.map((question) => ({
            ...question,
            answers: {}
        }))
    };

    const json = JSON.stringify(template, null, 2);

    const blob = new Blob([json], {
        type: 'application/json'
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${questionnaire.title.replace(/[^a-z0-9]/gi, '_')}.json`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}


</script>

<svelte:head>
    <title>Apply questionnaire</title>
    <meta
        name="viewport"
        content="width=device-width, initial-scale=1, viewport-fit=cover"
    />
</svelte:head>

<div class="min-h-screen bg-slate-50 px-4 py-6 pb-10 sm:px-8 sm:py-8">
    <div class="mx-auto max-w-3xl">
        {#if questionnaire}
            <!-- Page header -->
            <header class="mb-8">
    <div class="grid grid-cols-3 items-center gap-3">
        <!-- Esquerda: botão voltar -->
        <div class="flex justify-start">
            <BackHome />
        </div>

        <!-- Centro: título do questionário -->
        <h1 class="break-words text-center text-xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {questionnaire.title}
        </h1>

        <!-- Direita: exportar -->
        <div class="flex justify-end">
            <button
                type="button"
                onclick={() => exportQuestionnaire(questionnaire)}
                class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                title="Exportar modelo do questionário"
            >
                <!-- Ícone de download -->
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="size-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <path d="m7 10 5 5 5-5" />
                    <path d="M12 15V3" />
                </svg>

                <span class="hidden sm:inline">Exportar JSON</span>
            </button>
        </div>
    </div>

    <p class="mt-3 text-sm text-slate-500 sm:text-base">
        Responda às perguntas abaixo e envie suas respostas.
    </p>
</header> 

            <form onsubmit={handleSubmit} class="space-y-5">
                {#each questionnaire.questions as question, index (question.id)}
                    <fieldset class="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                        <div class="mb-5 flex items-start gap-3">
                            <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-sm font-bold text-indigo-700">
                                {index + 1}
                            </span>

                            <div class="min-w-0 flex-1">
                                <legend class="w-full break-words text-base font-semibold text-slate-900 sm:text-lg">
                                    {question.description}
                                </legend>

                                {#if question.required}
                                    <span class="mt-2 inline-flex rounded-md bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                                        Required
                                    </span>
                                {:else}
                                    <span class="mt-2 inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                                        Optional
                                    </span>
                                {/if}
                            </div>
                        </div>

                        {#if question.type === 'open'}
                            <textarea
                                name={question.id}
                                required={question.required}
                                value={answers[question.id] as string ?? ''}
                                oninput={(event) => {
                                    answers[question.id] = event.currentTarget.value;
                                }}
                                rows="4"
                                placeholder="Type your answer here..."
                                class="min-h-32 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                            ></textarea>

                        {:else if question.type === 'closed'}
                            <div class="space-y-2">
                                {#each question.options as option}
                                    <label class="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50/50 has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-50">
                                        <input
                                            type="radio"
                                            name={question.id}
                                            value={option}
                                            required={question.required}
                                            bind:group={answers[question.id]}
                                            class="size-4 shrink-0 accent-indigo-600"
                                        />
                                        <span class="min-w-0 break-words">{option}</span>
                                    </label>
                                {/each}
                            </div>

                            {#if typeof answers[question.id] === 'string' &&
                                answers[question.id].toLowerCase() === 'outro'}
                                <input
                                    type="text"
                                    placeholder="Type your answer"
                                    value={answers[`${question.id}-other`] as string ?? ''}
                                    oninput={(event) => {
                                        answers[`${question.id}-other`] =
                                            event.currentTarget.value;
                                    }}
                                    class="mt-3 min-h-12 w-full rounded-lg border border-slate-300 px-4 py-3 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                />
                            {/if}

                        {:else if question.type === 'multiple-choice'}
                            <div class="space-y-2">
                                {#each question.options as option}
                                    <label class="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50/50 has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-50">
                                        <input
                                            type="checkbox"
                                            value={option}
                                            checked={
                                            Array.isArray(answers[question.id]) &&
                                                answers[question.id].includes(option)
                                            }
                                            onchange={(event) => {
                                                const current = Array.isArray(answers[question.id])
                                                    ? answers[question.id] as string[]
                                                    : [];

                                                answers[question.id] = event.currentTarget.checked
                                                    ? [...current, option]
                                                    : current.filter((item) => item !== option);
                                            }}
                                            class="size-4 shrink-0 rounded accent-indigo-600"
                                        />
                                        <span class="min-w-0 break-words">{option}</span>
                                    </label>
                                {/each}
                            </div>

                        {:else if question.type === 'priority'}
                            <p class="mb-3 text-sm text-slate-500">
                                Select options in order of priority. Select an option again to remove it.
                            </p>

                            <ol class="space-y-2">
                                {#each question.options as option}
                                    {@const ranked = Array.isArray(answers[question.id])
                                        ? answers[question.id] as string[]
                                        : []}

                                    {@const rank = ranked.indexOf(option)}

                                    <li>
                                        <button
                                            type="button"
                                            onclick={() => {
                                                if (ranked.includes(option)) {
                                                    answers[question.id] =
                                                        ranked.filter((item) => item !== option);
                                                } else {
                                                    answers[question.id] = [...ranked, option];
                                                }
                                            }}
                                            class="flex min-h-12 w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition"
                                            class:border-indigo-300={rank !== -1}
                                            class:bg-indigo-50={rank !== -1}
                                            class:text-indigo-800={rank !== -1}
                                            class:border-slate-200={rank === -1}
                                            class:bg-white={rank === -1}
                                            class:text-slate-700={rank === -1}
                                            class:hover:border-indigo-300={rank === -1}
                                            class:hover:bg-slate-50={rank === -1}
                                        >
                                            <span class="flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                                                class:bg-indigo-600={rank !== -1}
                                                class:text-white={rank !== -1}
                                                class:bg-slate-100={rank === -1}
                                                class:text-slate-500={rank === -1}
                                            >
                                                {#if rank !== -1}
                                                    {rank + 1}
                                                {:else}
                                                    +
                                                {/if}
                                            </span>
                                            <span class="min-w-0 flex-1 break-words">{option}</span>
                                            {#if rank !== -1}
                                                <span class="text-xs font-semibold text-indigo-600">
                                                    {rank + 1}º priority
                                                </span>
                                            {/if}
                                        </button>
                                    </li>
                                {/each}
                            </ol>
                        {/if}
                    </fieldset>
                {/each}

                <div class="pt-2">
                    <button
                        type="submit"
                        class="min-h-12 w-full rounded-xl bg-indigo-600 px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 active:bg-indigo-800 sm:w-auto sm:min-w-48"
                    >
                        Submit answers
                    </button>
                </div>
            </form>
        {:else}
            <div class="rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
                <div class="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                    <span class="text-2xl">?</span>
                </div>

                <h1 class="text-xl font-bold text-slate-900">
                    Questionnaire not found
                </h1>

                <p class="mt-2 text-sm text-slate-500">
                    This questionnaire may have been removed or the link may be invalid.
                </p>
            </div>
        {/if}
    </div>
</div>
