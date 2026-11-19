<script lang="ts">
    import type { Question, Questionnaire, QuestionType } from '#lib';
    import BackHome from '#lib/components/BackHome.svelte';

    // Question form
    let description = $state('');
    let type = $state<QuestionType>('open');
    let required = $state(false);
    let options = $state(['', '']);

    let questions = $state<Question[]>([]);
    let editingQuestionId = $state<string | null>(null);

    // Save modal
    let showSaveModal = $state(false);
    let questionnaireTitle = $state('');
    let modalError = $state('');
    let questionnaire = $state<Questionnaire | null>(null);

    // Visual feedback
    let feedback = $state<{ message: string; type: 'success' } | null>(null);
    let feedbackTimeout: ReturnType<typeof setTimeout> | undefined;

    function showFeedback(message: string) {
        feedback = { message, type: 'success' };

        if (feedbackTimeout) {
            clearTimeout(feedbackTimeout);
        }

        feedbackTimeout = setTimeout(() => {
            feedback = null;
            feedbackTimeout = undefined;
        }, 3000);
    }

    function dismissFeedback() {
        feedback = null;

        if (feedbackTimeout) {
            clearTimeout(feedbackTimeout);
            feedbackTimeout = undefined;
        }
    }

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

    // Create or update a question
    function saveQuestion() {
        const cleanDescription = description.trim();

        if (!cleanDescription) {
            description = '';
            return;
        }

        const question: Question = {
            id: editingQuestionId ?? generateId(),
            description: cleanDescription,
            type,
            required,
            options:
                type === 'open'
                    ? []
                    : options.map(option => option.trim()).filter(Boolean)
        };

        if (editingQuestionId) {
            const index = questions.findIndex(
                item => item.id === editingQuestionId
            );

            if (index !== -1) {
                questions[index] = question;
            }

            showFeedback('Pergunta atualizada com sucesso');
        } else {
            questions.push(question);
            showFeedback('Pergunta criada com sucesso');
        }

        resetForm();
    }

    // Standard form submission
    function handleSubmit(event: SubmitEvent) {
        event.preventDefault();
        saveQuestion();
    }

    function resetForm() {
        description = '';
        type = 'open';
        required = false;
        options = ['', ''];
        editingQuestionId = null;
    }

    function addOption() {
        options.push('');
    }

    function removeOption(index: number) {
        if (options.length <= 2) return;
        options.splice(index, 1);
    }

    function editQuestion(question: Question) {
        editingQuestionId = question.id;
        description = question.description;
        type = question.type;
        required = question.required;
        options = question.options.length
            ? [...question.options]
            : ['', ''];

        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    function deleteQuestion(id: string) {
        questions = questions.filter(question => question.id !== id);

        if (editingQuestionId === id) {
            resetForm();
        }

        showFeedback('Pergunta excluída com sucesso');
    }

    // Questionnaire save modal
    function openSaveModal() {
        questionnaireTitle = '';
        modalError = '';
        showSaveModal = true;

        if (questions.length === 0) {
            modalError = 'Crie pelo menos uma pergunta antes de continuar.';
        }
    }

    function saveQuestionnaire() {
        if (questions.length === 0) {
            modalError = 'Crie pelo menos uma pergunta antes de continuar.';
            return;
        }

        const title = questionnaireTitle.trim();

        if (!title) {
            modalError = 'Digite um nome para o questionário.';
            return;
        }

        questionnaire = {
            id: generateId(),
            title,
            questions: [...questions]
        };

        localStorage.setItem(
            questionnaire.id,
            JSON.stringify(questionnaire)
        );

        showSaveModal = false;
        showFeedback('Questionário salvo com sucesso');
    }

    function getQuestionTypeLabel(questionType: QuestionType): string {
        switch (questionType) {
            case 'open':
                return 'Resposta aberta';
            case 'closed':
                return 'Escolha única';
            case 'multiple-choice':
                return 'Múltipla escolha';
            case 'priority':
                return 'Ordenação por prioridade';
            default:
                return questionType;
        }
    }
</script>

<svelte:head>
    <title>Criador de questionários</title>
    <meta
        name="viewport"
        content="width=device-width, initial-scale=1, viewport-fit=cover"
    />
</svelte:head>

{#if feedback}
    <div
        class="fixed right-4 top-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm items-start gap-3 rounded-xl border border-emerald-200 bg-white p-4 shadow-lg shadow-slate-900/10"
        role="status"
        aria-live="polite"
    >
        <div class="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="size-5"
                aria-hidden="true"
            >
                <path d="m5 12 4 4L19 6" />
            </svg>
        </div>

        <div class="min-w-0 flex-1 pt-1">
            <p class="text-sm font-semibold text-slate-900">
                Sucesso
            </p>
            <p class="mt-0.5 break-words text-sm text-slate-600">
                {feedback.message}
            </p>
        </div>

        <button
            type="button"
            onclick={dismissFeedback}
            aria-label="Fechar notificação"
            class="-mr-1 -mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg text-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
            &times;
        </button>
    </div>
{/if}

<div class="min-h-screen bg-slate-50 px-4 py-6 pb-36 sm:px-8 sm:py-8 sm:pb-8">
    <div class="mx-auto max-w-6xl">

        <!-- Cabeçalho -->
        <header class="mb-8">
            <div class="mt-4">
                <BackHome />
            </div>

            <h1 class="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Criar questionário
            </h1>
        </header>

        <div class="grid grid-cols-1 items-start gap-8 lg:grid-cols-5">

            <!-- Editor -->
            <section class="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:col-span-2">
                <h2 class="mb-6 text-xl font-semibold text-slate-900">
                    {editingQuestionId ? 'Editar pergunta' : 'Nova pergunta'}
                </h2>

                <form
                    id="question-form"
                    onsubmit={handleSubmit}
                    class="space-y-6"
                >
                    <!-- Descrição -->
                    <div>
                        <label
                            for="description"
                            class="mb-2 block text-sm font-medium text-slate-700"
                        >
                            Pergunta
                        </label>

                        <input
                            id="description"
                            bind:value={description}
                            required
                            placeholder="Qual é o seu idioma favorito?"
                            class="min-h-12 w-full rounded-lg border border-slate-300 px-4 py-3 text-base text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />
                    </div>

                    <!-- Tipo -->
                    <div>
                        <label
                            for="question-type"
                            class="mb-2 block text-sm font-medium text-slate-700"
                        >
                            Tipo de pergunta
                        </label>

                        <select
                            id="question-type"
                            bind:value={type}
                            class="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        >
                            <option value="open">Resposta aberta</option>
                            <option value="closed">Escolha única</option>
                            <option value="multiple-choice">Múltipla escolha</option>
                            <option value="priority">Ordenação por prioridade</option>
                        </select>
                    </div>

                    <!-- Opções -->
                    {#if type === 'multiple-choice' || type === 'priority' || type === 'closed'}
                        <div class="space-y-3">
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-sm font-medium text-slate-700">
                                    Opções de resposta
                                </span>

                                <span class="text-xs text-slate-400">
                                    {options.length} opções
                                </span>
                            </div>

                            {#each options as option, index (index)}
                                <div class="flex min-w-0 gap-2">
                                    <input
                                        bind:value={options[index]}
                                        placeholder={`Opção ${index + 1}`}
                                        aria-label={`Opção ${index + 1}`}
                                        class="min-h-12 w-0 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-3 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                    />

                                    <button
                                        type="button"
                                        onclick={() => removeOption(index)}
                                        disabled={options.length <= 2}
                                        class="min-h-12 shrink-0 rounded-lg px-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-30 sm:px-3"
                                    >
                                        Remover
                                    </button>
                                </div>
                            {/each}

                            <button
                                type="button"
                                onclick={addOption}
                                class="min-h-12 w-full rounded-lg border border-dashed border-indigo-300 px-4 py-3 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
                            >
                                + Adicionar opção
                            </button>
                        </div>
                    {/if}

                    <!-- Obrigatória -->
                    <label class="flex cursor-pointer items-center gap-3 rounded-lg bg-slate-50 p-4">
                        <input
                            type="checkbox"
                            bind:checked={required}
                            class="size-5 shrink-0 accent-indigo-600"
                        />

                        <span>
                            <span class="block text-sm font-medium text-slate-800">
                                Pergunta obrigatória
                            </span>
                        </span>
                    </label>

                    <!-- Ações para desktop -->
                    <div class="hidden space-y-3 border-t border-slate-100 pt-5 sm:block">
                        <button
                            type="submit"
                            class="min-h-12 w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700"
                        >
                            {editingQuestionId ? 'Atualizar pergunta' : '+ Criar pergunta'}
                        </button>

                        {#if editingQuestionId}
                            <button
                                type="button"
                                onclick={resetForm}
                                class="min-h-12 w-full rounded-lg border border-slate-300 px-4 py-3 font-medium text-slate-600 hover:bg-slate-50"
                            >
                                Cancelar edição
                            </button>
                        {/if}

                        <button
                            type="button"
                            onclick={openSaveModal}
                            class="min-h-12 w-full rounded-lg border border-slate-200 px-4 py-3 font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
                        >
                            Salvar questionário
                        </button>
                    </div>
                </form>
            </section>

            <!-- Lista de perguntas -->
            <section class="min-w-0 lg:col-span-3">
                <div class="mb-4 flex items-center justify-between gap-4">
                    <div>
                        <h2 class="text-xl font-bold text-slate-900">
                            Suas perguntas
                        </h2>

                        <p class="mt-1 text-sm text-slate-500">
                            As perguntas mais recentes aparecem primeiro.
                        </p>
                    </div>

                    <span class="rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700">
                        {questions.length}
                    </span>
                </div>

                <div class="space-y-4">
                    {#each [...questions].reverse() as question, index (question.id)}
                        <article class="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                            <div class="flex items-start gap-3 sm:gap-4">
                                <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-sm font-bold text-indigo-700">
                                    {questions.length - index}
                                </div>

                                <div class="min-w-0 flex-1">
                                    <h3 class="break-words font-semibold text-slate-900">
                                        {question.description}
                                    </h3>

                                    <div class="mt-3 flex flex-wrap gap-2">
                                        <span class="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                                            {getQuestionTypeLabel(question.type)}
                                        </span>

                                        {#if question.required}
                                            <span class="rounded-md bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                                                Obrigatória
                                            </span>
                                        {:else}
                                            <span class="rounded-md bg-slate-50 px-2.5 py-1 text-xs text-slate-500">
                                                Opcional
                                            </span>
                                        {/if}
                                    </div>

                                    {#if question.options.length > 0}
                                        <ul class="mt-4 space-y-2">
                                            {#each question.options as option}
                                                <li class="flex items-start gap-2 break-words text-sm text-slate-600">
                                                    <span class="text-indigo-500">•</span>
                                                    <span class="min-w-0">{option}</span>
                                                </li>
                                            {/each}
                                        </ul>
                                    {/if}

                                    <div class="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                                        <button
                                            type="button"
                                            onclick={() => editQuestion(question)}
                                            class="min-h-11 rounded-lg px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
                                        >
                                            Editar
                                        </button>

                                        <button
                                            type="button"
                                            onclick={() => deleteQuestion(question.id)}
                                            class="min-h-11 rounded-lg px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
                                        >
                                            Excluir
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </article>
                    {:else}
                        <div class="rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-16 text-center">
                            <div class="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl text-indigo-600">
                                +
                            </div>

                            <h3 class="font-semibold text-slate-900">
                                Nenhuma pergunta ainda
                            </h3>

                            <p class="mt-2 text-sm text-slate-500">
                                Crie sua primeira pergunta utilizando o editor.
                            </p>
                        </div>
                    {/each}
                </div>
            </section>
        </div>
    </div>
</div>

<!-- Barra de ações mobile -->
<div class="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(15,23,42,0.08)] backdrop-blur sm:hidden">
    <div class="mx-auto grid max-w-lg grid-cols-2 gap-3">

        <button
            type="button"
            onclick={saveQuestion}
            class="min-h-12 touch-manipulation rounded-xl bg-indigo-600 px-3 py-3 text-sm font-semibold text-white"
        >
            {editingQuestionId ? 'Atualizar pergunta' : '+ Criar pergunta'}
        </button>

        <button
            type="button"
            onclick={openSaveModal}
            class="min-h-12 touch-manipulation rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-700 active:bg-slate-100"
        >
            Salvar questionário
        </button>

        {#if editingQuestionId}
            <button
                type="button"
                onclick={resetForm}
                class="col-span-2 min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600"
            >
                Cancelar edição
            </button>
        {/if}
    </div>
</div>

<!-- Modal de salvamento -->
{#if showSaveModal}
    <div class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
        <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="save-modal-title"
            class="my-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        >
            <div class="mb-5 flex items-start justify-between gap-4">
                <div>
                    <h2 id="save-modal-title" class="text-xl font-bold text-slate-900">
                        Salvar questionário
                    </h2>

                    <p class="mt-1 text-sm text-slate-500">
                        Defina um nome para o seu questionário.
                    </p>
                </div>

                <button
                    type="button"
                    onclick={() => showSaveModal = false}
                    aria-label="Fechar modal"
                    class="min-h-11 min-w-11 rounded-lg text-2xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                    &times;
                </button>
            </div>

            <form
                onsubmit={(event) => {
                    event.preventDefault();
                    saveQuestionnaire();
                }}
            >
                <label for="questionnaire-title" class="mb-2 block text-sm font-medium text-slate-700">
                    Nome do questionário
                </label>

                <input
                    id="questionnaire-title"
                    bind:value={questionnaireTitle}
                    placeholder="Ex.: Pesquisa de satisfação"
                    class="min-h-12 w-full rounded-lg border border-slate-300 px-4 py-3 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />

                {#if modalError}
                    <p class="mt-2 text-sm text-rose-600" role="alert">
                        {modalError}
                    </p>
                {/if}

                <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onclick={() => showSaveModal = false}
                        class="min-h-12 rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        class="min-h-12 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
                    >
                        Salvar
                    </button>
                </div>
            </form>
        </section>
</div>
{/if}
