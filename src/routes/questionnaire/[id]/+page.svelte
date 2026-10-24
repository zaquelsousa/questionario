<script lang="ts">
import { page } from '$app/state';
import { onMount } from 'svelte';
import type { Questionnaire } from '#lib';

let questionnaire = $state<Questionnaire | null>(null);

let answers = $state<Record<string, string | string[]>>({});

onMount(() => {
    const id = page.params.id;
    const saved = localStorage.getItem(id);

    if (saved) {
        questionnaire = JSON.parse(saved);
    }
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

</script>


{#if questionnaire}
    <h1>{questionnaire.title}</h1>

    <form onsubmit={handleSubmit}>
        {#each questionnaire.questions as question (question.id)}
            <fieldset>
                <legend>{question.description}</legend>

                {#if question.type === 'open'}
                    <textarea
                        name={question.id}
                        required={question.required}
                        value={answers[question.id] as string ?? ''}
                        oninput={(event) => {
                            answers[question.id] = event.currentTarget.value;
                        }}
                    ></textarea>

                {:else if question.type === 'closed'}
                    {#each question.options as option}
                        <label>
                            <input
                                type="radio"
                                name={question.id}
                                value={option}
                                required={question.required}
                                bind:group={answers[question.id]}
                            />
                            {option}
                        </label>
                    {/each}
                    {#if typeof answers[question.id] === 'string' &&
                        answers[question.id].toLowerCase() === 'outro'}
                        <input
                            type="text"
                            placeholder="Digite sua resposta"
                            value={answers[`${question.id}-other`] as string ?? ''}
                            oninput={(event) => {
                                answers[`${question.id}-other`] =
                                    event.currentTarget.value;
                            }}
                        />
                    {/if}

                {:else if question.type === 'multiple-choice'}
                    {#each question.options as option}
                        <label>
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
                            />
                            {option}
                        </label>
                    {/each}

                {:else if question.type === 'priority'}
                    <ol>
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
                                >
                                    {option}
                                    {#if rank !== -1}
                                        [{rank + 1}º]
                                    {/if}
                                </button>
                            </li>
                        {/each}
                    </ol>
                {/if}
            </fieldset>
        {/each}

        <button type="submit">salvar</button>
    </form>
{:else}
    <p>Questionnaire not found</p>
{/if}

