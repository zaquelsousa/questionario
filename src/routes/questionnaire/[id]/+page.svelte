
<script lang="ts">
    import { page } from '$app/state';
    import { beforeNavigate } from '$app/navigation';
    import { onMount } from 'svelte';
    import BackHome from '#lib/components/BackHome.svelte';

    type QuestionType =
        | 'open'
        | 'closed'
        | 'multiple-choice'
        | 'priority';

    type EditableQuestion = {
        id: string;
        description: string;
        type: QuestionType;
        required: boolean;
        options: string[];
    };

    type EditableQuestionnaire = {
        id: string;
        title: string;
        questions: EditableQuestion[];
        [key: string]: unknown;
    };

    type Answer = string | string[];

    let questionnaire = $state<EditableQuestionnaire | null>(null);
    let answers = $state<Record<string, Answer>>({});

    let editing = $state(false);
    let editorDirty = $state(false);
    let loadError = $state('');

    const hasAnswers = $derived(
        Object.values(answers).some((answer) =>
            Array.isArray(answer)
                ? answer.length > 0
                : answer.trim().length > 0
        )
    );

    const hasUnsavedChanges = $derived(
        hasAnswers || editorDirty
    );

    function getStorageKey() {
        return questionnaire?.id ?? page.params.id;
    }

    function loadQuestionnaire() {
        const id = page.params.id;
        const saved = localStorage.getItem(id);

        if (!saved) {
            questionnaire = null;
            return;
        }

        try {
            const parsed = JSON.parse(saved);

            if (
                !parsed ||
                typeof parsed.title !== 'string' ||
                !Array.isArray(parsed.questions)
            ) {
                throw new Error('Invalid questionnaire format');
            }

            questionnaire = parsed as EditableQuestionnaire;
            loadError = '';
        } catch (error) {
            console.error('Failed to load questionnaire:', error);
            loadError = 'The questionnaire data is invalid.';
            questionnaire = null;
        }
    }

    onMount(() => {
        loadQuestionnaire();

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener(
                'beforeunload',
                handleBeforeUnload
            );
        };
    });

    beforeNavigate(({ cancel }) => {
        if (!hasUnsavedChanges) return;

        const shouldLeave = confirm(
            'You have unsaved changes. If you leave this page, your progress will be lost. Continue?'
        );

        if (!shouldLeave) {
            cancel();
        }
    });

    function handleBeforeUnload(event: BeforeUnloadEvent) {
        if (!hasUnsavedChanges) return;

        event.preventDefault();
        event.returnValue = '';
    }

    function generateId() {
        return crypto.randomUUID();
    }

    function createQuestion(): EditableQuestion {
        return {
            id: generateId(),
            description: 'New question',
            type: 'open',
            required: false,
            options: []
        };
    }

    // -----------------------------------------
    // EDITOR
    // -----------------------------------------

    function startEditing() {
        if (!questionnaire) return;

        editing = true;
        editorDirty = false;
    }

    function cancelEditing() {
        if (editorDirty) {
            const shouldCancel = confirm(
                'Discard all questionnaire changes?'
            );

            if (!shouldCancel) return;
        }

        loadQuestionnaire();
        editorDirty = false;
        editing = false;
    }

    function addQuestion() {
        if (!questionnaire) return;

        questionnaire.questions.push(createQuestion());
        editorDirty = true;
    }

    function removeQuestion(index: number) {
        if (!questionnaire) return;

        const shouldRemove = confirm(
            'Are you sure you want to delete this question?'
        );

        if (!shouldRemove) return;

        const removed = questionnaire.questions[index];

        questionnaire.questions.splice(index, 1);

        if (removed) {
            delete answers[removed.id];
        }

        editorDirty = true;
    }

    function moveQuestion(index: number, direction: number) {
        if (!questionnaire) return;

        const target = index + direction;

        if (
            target < 0 ||
            target >= questionnaire.questions.length
        ) {
            return;
        }

        const questions = questionnaire.questions;

        [questions[index], questions[target]] = [
            questions[target],
            questions[index]
        ];

        editorDirty = true;
    }

    function updateOptions(
        question: EditableQuestion,
        value: string
    ) {
        question.options = value
            .split('\n')
            .map((option) => option.trim())
            .filter(Boolean);

        editorDirty = true;
    }

    function validateQuestionnaire(): string | null {
        if (!questionnaire) {
            return 'Questionnaire not found.';
        }

        if (!questionnaire.title.trim()) {
            return 'The questionnaire needs a title.';
        }

        if (questionnaire.questions.length === 0) {
            return 'Add at least one question.';
        }

        for (let i = 0; i < questionnaire.questions.length; i++) {
            const question = questionnaire.questions[i];

            if (!question.description.trim()) {
                return `Question ${i + 1} needs a description.`;
            }

            if (
                question.type !== 'open' &&
                question.options.length === 0
            ) {
                return `Question ${i + 1} needs at least one option.`;
            }
        }

        return null;
    }

    function saveQuestionnaire() {
        if (!questionnaire) return;

        const error = validateQuestionnaire();

        if (error) {
            alert(error);
            return;
        }

        const normalized: EditableQuestionnaire = {
            ...questionnaire,
            title: questionnaire.title.trim(),
            questions: questionnaire.questions.map((question) => ({
                ...question,
                description: question.description.trim(),
                options: question.options
            }))
        };

        try {
            localStorage.setItem(
                getStorageKey(),
                JSON.stringify(normalized)
            );

            questionnaire = normalized;
            editorDirty = false;
            editing = false;

            alert('Questionnaire saved successfully!');
        } catch (error) {
            console.error('Failed to save questionnaire:', error);
            alert('Could not save the questionnaire.');
        }
    }

    // -----------------------------------------
    // EXPORT
    // -----------------------------------------

    function downloadJSON(data: unknown, filename: string) {
        const json = JSON.stringify(data, null, 2);

        const blob = new Blob([json], {
            type: 'application/json'
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = filename;

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);
    }

    function exportQuestionnaire() {
        if (!questionnaire) return;

        const template = {
            ...questionnaire,
            questions: questionnaire.questions.map((question) => ({
                ...question,
                answers: {}
            }))
        };

        const filename =
            `${questionnaire.title.replace(/[^a-z0-9]/gi, '_')}.json`;

        downloadJSON(template, filename);
    }

    // -----------------------------------------
    // RESPONSE SUBMISSION
    // -----------------------------------------

    function handleSubmit(event: SubmitEvent) {
        event.preventDefault();

        if (!questionnaire) return;

        const name = prompt('What is your name?');

        if (!name?.trim()) return;

        const key = `questionnaire-response:${name.trim()}`;

        if (localStorage.getItem(key)) {
            const overwrite = confirm(
                'A response with this name already exists. Overwrite it?'
            );

            if (!overwrite) return;
        }

        const responseAnswers = JSON.parse(
            JSON.stringify(answers)
        ) as Record<string, Answer>;

        const submission = {
            questionnaireId: questionnaire.id,
            questionnaireTitle: questionnaire.title,
            name: name.trim(),
            answers: responseAnswers,
            savedAt: new Date().toISOString()
        };

        try {
            localStorage.setItem(
                key,
                JSON.stringify(submission)
            );

            const filename = `${name.trim()}.json`
                .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');

            downloadJSON(submission, filename);

            answers = {};

            alert('Questionnaire submitted successfully!');
        } catch (error) {
            console.error('Submission failed:', error);
            alert('Could not save your response.');
        }
    }

    // -----------------------------------------
    // ANSWER HELPERS
    // -----------------------------------------

    function toggleMultipleChoice(
        questionId: string,
        option: string,
        checked: boolean
    ) {
        const current = Array.isArray(answers[questionId])
            ? answers[questionId] as string[]
            : [];

        answers[questionId] = checked
            ? [...current, option]
            : current.filter((item) => item !== option);
    }

    function togglePriority(
        questionId: string,
        option: string
    ) {
        const current = Array.isArray(answers[questionId])
            ? answers[questionId] as string[]
            : [];

        answers[questionId] = current.includes(option)
            ? current.filter((item) => item !== option)
            : [...current, option];
    }
</script>

<svelte:head>
    <title>
        {editing ? 'Edit questionnaire' : 'Apply questionnaire'}
    </title>

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1, viewport-fit=cover"
    />
</svelte:head>

<div class="min-h-screen bg-slate-50 px-4 py-6 pb-10 sm:px-8 sm:py-8">
    <div class="mx-auto max-w-3xl">

        {#if questionnaire}

            <!-- HEADER -->

            <header class="mb-8">
                <div class="flex items-center justify-between gap-3">

                    <BackHome />

                    <div class="flex flex-wrap justify-end gap-2">

                        <button
                            type="button"
                            onclick={exportQuestionnaire}
                            class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                        >
                            Exportar JSON
                        </button>

                        {#if editing}

                            <button
                                type="button"
                                onclick={cancelEditing}
                                class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                            >
                                Cancelar
                            </button>

                            <button
                                type="button"
                                onclick={saveQuestionnaire}
                                disabled={!editorDirty}
                                class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Salvar alterações
                            </button>

                        {:else}

                            <button
                                type="button"
                                onclick={startEditing}
                                class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                            >
                                Editar questionário
                            </button>

                        {/if}
                    </div>
                </div>

                <p class="mt-4 text-sm text-slate-500">
                    {#if editing}
                        Editando a estrutura do questionário.
                    {:else}
                        Responda às perguntas abaixo e envie suas respostas.
                    {/if}
                </p>
            </header>

            <!-- EDIT MODE -->

            {#if editing}

                <div class="space-y-5">

                    <!-- TITLE EDITOR -->

                    <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <label
                            for="questionnaire-title"
                            class="mb-2 block text-sm font-semibold text-slate-700"
                        >
                            Título do questionário
                        </label>

                        <input
                            id="questionnaire-title"
                            type="text"
                            bind:value={questionnaire.title}
                            oninput={() => editorDirty = true}
                            placeholder="Título do questionário"
                            class="w-full rounded-xl border border-slate-300 px-4 py-3 text-lg font-semibold text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />
                    </section>

                    <!-- QUESTIONS EDITOR -->

                    {#each questionnaire.questions as question, index (question.id)}

                        <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">

                            <div class="mb-5 flex items-center justify-between gap-3">

                                <span class="font-semibold text-slate-700">
                                    Pergunta {index + 1}
                                </span>

                                <div class="flex items-center gap-1">

                                    <button
                                        type="button"
                                        onclick={() => moveQuestion(index, -1)}
                                        disabled={index === 0}
                                        aria-label="Mover pergunta para cima"
                                        class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                                    >
                                        ↑
                                    </button>

                                    <button
                                        type="button"
                                        onclick={() => moveQuestion(index, 1)}
                                        disabled={index === questionnaire.questions.length - 1}
                                        aria-label="Mover pergunta para baixo"
                                        class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                                    >
                                        ↓
                                    </button>

                                    <button
                                        type="button"
                                        onclick={() => removeQuestion(index)}
                                        aria-label="Excluir pergunta"
                                        class="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                                    >
                                        Excluir
                                    </button>

                                </div>
                            </div>

                            <!-- DESCRIPTION -->

                            <div class="mb-5">
                                <label class="mb-2 block text-sm font-medium text-slate-700">
                                    Enunciado da pergunta
                                </label>

                                <textarea
                                    bind:value={question.description}
                                    oninput={() => editorDirty = true}
                                    rows="3"
                                    placeholder="Escreva sua pergunta..."
                                    class="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                ></textarea>
                            </div>

                            <!-- QUESTION TYPE -->

                            <div class="mb-5">
                                <label class="mb-2 block text-sm font-medium text-slate-700">
                                    Tipo de pergunta
                                </label>

                                <select
                                    bind:value={question.type}
                                    onchange={() => editorDirty = true}
                                    class="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-500"
                                >
                                    <option value="open">Resposta aberta</option>
                                    <option value="closed">Escolha única</option>
                                    <option value="multiple-choice">Múltipla escolha</option>
                                    <option value="priority">Ordem de prioridade</option>
                                </select>

                                <p class="mt-2 text-xs text-slate-500">
                                    {#if question.type === 'open'}
                                        Os participantes podem escrever qualquer resposta.
                                    {:else if question.type === 'closed'}
                                        Os participantes podem selecionar uma opção.
                                    {:else if question.type === 'multiple-choice'}
                                        Os participantes podem selecionar várias opções.
                                    {:else}
                                        Os participantes podem organizar as opções por ordem de prioridade.
                                    {/if}
                                </p>
                            </div>

                            <!-- OPTIONS -->

                            {#if question.type !== 'open'}

                                <div class="mb-5">
                                    <label class="mb-2 block text-sm font-medium text-slate-700">
                                        Opções de resposta
                                    </label>

                                    <textarea
                                        value={question.options.join('\n')}
                                        oninput={(event) => updateOptions(
                                            question,
                                            event.currentTarget.value
                                        )}
                                        rows="5"
                                        placeholder={'Opção 1\nOpção 2\nOpção 3'}
                                        class="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                    ></textarea>

                                    <p class="mt-2 text-xs text-slate-500">
                                        Escreva uma opção por linha.
                                    </p>
                                </div>

                            {/if}

                            <!-- REQUIRED -->

                            <label class="flex cursor-pointer items-center gap-3 rounded-xl bg-slate-50 p-3">
                                <input
                                    type="checkbox"
                                    bind:checked={question.required}
                                    onchange={() => editorDirty = true}
                                    class="size-4 accent-indigo-600"
                                />

                                <span class="text-sm font-medium text-slate-700">
                                    Esta pergunta é obrigatória
                                </span>
                            </label>

                        </section>

                    {/each}

                    <!-- ADD QUESTION -->

                    <button
                        type="button"
                        onclick={addQuestion}
                        class="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/50 px-4 py-3 font-semibold text-indigo-700 transition hover:border-indigo-500 hover:bg-indigo-50"
                    >
                        <span class="text-xl">+</span>
                        Adicionar pergunta
                    </button>

                    <!-- SAVE FOOTER -->

                    <div class="sticky bottom-4 flex gap-3 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">

                        <button
                            type="button"
                            onclick={cancelEditing}
                            class="min-h-12 flex-1 rounded-lg border border-slate-300 px-4 py-3 font-medium text-slate-700 hover:bg-slate-50"
                        >
                            Cancelar
                        </button>

                        <button
                            type="button"
                            onclick={saveQuestionnaire}
                            disabled={!editorDirty}
                            class="min-h-12 flex-1 rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Salvar questionário
                        </button>

                    </div>

                </div>

            <!-- ANSWER MODE -->

            {:else}

                <h1 class="mb-6 break-words text-center text-2xl font-bold text-slate-900 sm:text-3xl">
                    {questionnaire.title}
                </h1>

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
                                            Obrigatória
                                        </span>
                                    {:else}
                                        <span class="mt-2 inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                                            Opcional
                                        </span>
                                    {/if}

                                </div>
                            </div>

                            <!-- OPEN -->

                            {#if question.type === 'open'}

                                <textarea
                                    name={question.id}
                                    required={question.required}
                                    value={answers[question.id] as string ?? ''}
                                    oninput={(event) => {
                                        answers[question.id] = event.currentTarget.value;
                                    }}
                                    rows="4"
                                    placeholder="Digite sua resposta aqui..."
                                    class="min-h-32 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                ></textarea>

                            <!-- SINGLE CHOICE -->

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

                                            <span class="min-w-0 break-words">
                                                {option}
                                            </span>

                                        </label>

                                    {/each}

                                </div>

                                {#if typeof answers[question.id] === 'string' &&
                                    answers[question.id].toLowerCase() === 'outro'}

                                    <input
                                        type="text"
                                        placeholder="Digite sua resposta"
                                        value={answers[`${question.id}-other`] as string ?? ''}
                                        oninput={(event) => {
                                            answers[`${question.id}-other`] = event.currentTarget.value;
                                        }}
                                        class="mt-3 min-h-12 w-full rounded-lg border border-slate-300 px-4 py-3 text-base text-slate-900 outline-none focus:border-indigo-500"
                                    />

                                {/if}

                            <!-- MULTIPLE CHOICE -->

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
                                                onchange={(event) => toggleMultipleChoice(
                                                    question.id,
                                                    option,
                                                    event.currentTarget.checked
                                                )}
                                                class="size-4 shrink-0 rounded accent-indigo-600"
                                            />

                                            <span class="min-w-0 break-words">
                                                {option}
                                            </span>

                                        </label>

                                    {/each}

                                </div>

                            <!-- PRIORITY -->

                            {:else if question.type === 'priority'}

                                <p class="mb-3 text-sm text-slate-500">
                                    Selecione as opções em ordem de prioridade. Selecione uma opção novamente para removê-la.
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
                                                onclick={() => togglePriority(question.id, option)}
                                                class="flex min-h-12 w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition"
                                                class:border-indigo-300={rank !== -1}
                                                class:bg-indigo-50={rank !== -1}
                                                class:text-indigo-800={rank !== -1}
                                                class:border-slate-200={rank === -1}
                                                class:bg-white={rank === -1}
                                                class:text-slate-700={rank === -1}
                                            >

                                                <span
                                                    class="flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                                                    class:bg-indigo-600={rank !== -1}
                                                    class:text-white={rank !== -1}
                                                    class:bg-slate-100={rank === -1}
                                                    class:text-slate-500={rank === -1}
                                                >
                                                    {rank !== -1 ? rank + 1 : '+'}
                                                </span>

                                                <span class="min-w-0 flex-1 break-words">
                                                    {option}
                                                </span>

                                                {#if rank !== -1}
                                                    <span class="text-xs font-semibold text-indigo-600">
                                                        {rank + 1}ª prioridade
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
                            class="min-h-12 w-full rounded-xl bg-indigo-600 px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto sm:min-w-48"
                        >
                            Enviar respostas
                        </button>

                    </div>

                </form>

            {/if}

        {:else}

            <div class="rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">

                <div class="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                    <span class="text-2xl">?</span>
                </div>

                <h1 class="text-xl font-bold text-slate-900">
                    Questionário não encontrado
                </h1>

                <p class="mt-2 text-sm text-slate-500">
                    {loadError || 'Este questionário pode ter sido removido ou o link pode ser inválido.'}
                </p>

            </div>

        {/if}

    </div>
</div>
