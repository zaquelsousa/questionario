<script lang="ts">
import type { Question, Questionnaire, QuestionType } from '#lib';

let description = $state('');
let type = $state<QuestionType>('open');
let required = $state(false);
let options = $state(['', '']);

let questionnaire = $state<Questionnaire | null>(null);

//let questions: Question[] = []
let questions = $state<Question[]>([]);
let editingQuestionId = $state<string | null>(null);

function handleSubmit(event: SubmitEvent) {
    event.preventDefault();

    const question: Question = {
        id: editingQuestionId ?? crypto.randomUUID(),
        description,
        type,
        required,
        options: type === 'open'
            ? []
            : options.map(option => option.trim()).filter(Boolean)
    };

    if (editingQuestionId) {
        const index = questions.findIndex(
            q => q.id === editingQuestionId
        );

        if (index !== -1) {
            questions[index] = question;
        }
    } else {
        questions.push(question);
    }
    
    console.log(question);
    resetForm();
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

function editQuestion(question: Question) {
    editingQuestionId = question.id;
    description = question.description;
    type = question.type;
    required = question.required;
    options = question.options.length
        ? [...question.options]
        : ['', ''];
}

function deleteQuestion(id: string) {
    questions = questions.filter(q => q.id !== id);

    if (editingQuestionId === id) {
        resetForm();
    }
}

function removeOption(index: number) {
    options.splice(index, 1);
}


function saveQuestionnaire() {
    if (questions.length === 0) {
        alert('deve ter pelo menos uma pergunta ne fi.');
        return;
    }
    const title = prompt('Nome do questionário:');

    if (!title?.trim()) return;

    questionnaire = {
        id: crypto.randomUUID(),
        title: title.trim(),
        questions: [...questions]
    };

    console.log(questionnaire);
    localStorage.setItem(
        questionnaire.id,
        JSON.stringify(questionnaire)
    );
}

</script>


<div class="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
    <div class="mx-auto max-w-6xl">

        <header class="mb-8">
            <p class="text-sm font-semibold uppercase tracking-widest text-indigo-600">
                Questionnaire builder
            </p>
            <h1 class="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                Create your questionnaire
            </h1>
            <p class="mt-2 text-slate-500">
                Build, organize and manage your questions.
            </p>
        </header>

        <div class="grid grid-cols-1 items-start gap-8 lg:grid-cols-5">

            <!-- Question editor -->
            <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                <h2 class="mb-6 text-xl font-semibold text-slate-900">
                    {editingQuestionId ? 'Edit question' : 'New question'}
                </h2>

                <form onsubmit={handleSubmit} class="space-y-6">

                    <div>
                        <label for="description" class="mb-2 block text-sm font-medium text-slate-700">
                            Question
                        </label>
                        <input
                            id="description"
                            bind:value={description}
                            required
                            placeholder="e.g. What is your favorite language?"
                            class="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />
                    </div>

                    <div>
                        <label for="type" class="mb-2 block text-sm font-medium text-slate-700">
                            Question type
                        </label>
                        <select
                            id="type"
                            bind:value={type}
                            class="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        >
                            <option value="open">Open-ended</option>
                            <option value="closed">Single choice</option>
                            <option value="multiple-choice">Multiple choice</option>
                            <option value="priority">Priority ranking</option>
                        </select>
                    </div>

                    {#if type === 'multiple-choice' || type === 'priority' || type === 'closed'}
                        <div class="space-y-3">
                            <div class="flex items-center justify-between">
                                <label class="text-sm font-medium text-slate-700">
                                    Answer options
                                </label>
                                <span class="text-xs text-slate-400">
                                    {options.length} options
                                </span>
                            </div>

                            {#each options as option, index}
                                <div class="flex gap-2" key={index}>
                                    <input
                                        bind:value={options[index]}
                                        placeholder={`Option ${index + 1}`}
                                        class="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                    />
                                    <button
                                        type="button"
                                        onclick={() => removeOption(index)}
                                        disabled={options.length <= 2}
                                        class="rounded-lg px-3 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-30"
                                    >
                                        Remove
                                    </button>
                                </div>
                            {/each}

                            <button
                                type="button"
                                onclick={addOption}
                                class="w-full rounded-lg border border-dashed border-indigo-300 px-4 py-3 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50"
                            >
                                + Add option
                            </button>
                        </div>
                    {/if}

                    <label class="flex cursor-pointer items-center gap-3 rounded-lg bg-slate-50 p-4">
                        <input
                            type="checkbox"
                            bind:checked={required}
                            class="size-4 accent-indigo-600"
                        />
                        <span>
                            <span class="block text-sm font-medium text-slate-800">
                                Required question
                            </span>
                            <span class="text-xs text-slate-500">
                                Respondents must answer this question.
                            </span>
                        </span>
                    </label>

                    <div class="space-y-3 border-t border-slate-100 pt-5">
                        <button
                            type="submit"
                            class="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.99]"
                        >
                            {editingQuestionId ? 'Update question' : '+ Create question'}
                        </button>

                        {#if editingQuestionId}
                            <button
                                type="button"
                                onclick={resetForm}
                                class="w-full rounded-lg border border-slate-300 px-4 py-3 font-medium text-slate-600 transition hover:bg-slate-50"
                            >
                                Cancel editing
                            </button>
                        {/if}

                        <button
                            type="button"
                            onclick={saveQuestionnaire}
                            class="w-full rounded-lg border border-slate-200 px-4 py-3 font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                        >
                            Save questionnaire
                        </button>
                    </div>
                </form>
            </section>

            <!-- Question list -->
            <section class="lg:col-span-3">
                <div class="mb-4 flex items-center justify-between gap-4">
                    <div>
                        <h2 class="text-xl font-bold text-slate-900">
                            Your questions
                        </h2>
                        <p class="mt-1 text-sm text-slate-500">
                            Newest questions appear first.
                        </p>
                    </div>

                    <span class="rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700">
                        {questions.length}
                    </span>
                </div>

                <div class="space-y-4">
                    {#each [...questions].reverse() as question, index (question.id)}
                        <article class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300">
                            <div class="flex items-start gap-4">
                                <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-sm font-bold text-indigo-700">
                                    {questions.length - index}
                                </div>

                                <div class="min-w-0 flex-1">
                                    <h3 class="break-words font-semibold text-slate-900">
                                        {question.description}
                                    </h3>

                                    <div class="mt-3 flex flex-wrap gap-2">
                                        <span class="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                                            {question.type}
                                        </span>

                                        {#if question.required}
                                            <span class="rounded-md bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                                                Required
                                            </span>
                                        {:else}
                                            <span class="rounded-md bg-slate-50 px-2.5 py-1 text-xs text-slate-500">
                                                Optional
                                            </span>
                                        {/if}
                                    </div>

                                    {#if question.options.length > 0}
                                        <ul class="mt-4 space-y-2">
                                            {#each question.options as option}
                                                <li class="flex items-start gap-2 text-sm text-slate-600">
                                                    <span class="mt-0.5 text-indigo-500">•</span>
                                                    <span class="break-words">{option}</span>
                                                </li>
                                            {/each}
                                        </ul>
                                    {/if}

                                    <div class="mt-5 flex gap-3 border-t border-slate-100 pt-4">
                                        <button
                                            type="button"
                                            onclick={() => editQuestion(question)}
                                            class="rounded-lg px-3 py-2 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50"
                                        >
                                            Edit
                                        </button>

                                        <button
                                            type="button"
                                            onclick={() => deleteQuestion(question.id)}
                                            class="rounded-lg px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                                        >
                                            Delete
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
                                No questions yet
                            </h3>
                            <p class="mt-2 text-sm text-slate-500">
                                Create your first question using the editor.
                            </p>
                        </div>
                    {/each}
                </div>
            </section>
        </div>
    </div>
</div>

