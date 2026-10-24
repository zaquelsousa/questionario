<script lang="ts">
    import { page } from '$app/state';
    import { onMount } from 'svelte';
    import type { Questionnaire } from '#lib';

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

{#if submission && questionnaire}
    <h1>{submission.name}</h1>
    <p>Questionário: {questionnaire.title}</p>

    <button onclick={downloadCSV}>
        Baixar CSV
    </button>

    {#each questionnaire.questions as question (question.id)}
        <fieldset>
            <legend>{question.description}</legend>

            {#if question.type === 'open'}
                <p>
                    {typeof submission.answers[question.id] === 'string'
                        ? submission.answers[question.id]
                        : 'Sem resposta'}
                </p>

            {:else if question.type === 'closed'}
                {#each question.options as option}
                    <label>
                        <input
                            type="radio"
                            checked={submission.answers[question.id] === option}
                            disabled
                        />
                        {option}
                    </label>
                {/each}

            {:else if question.type === 'multiple-choice'}
                {#each question.options as option}
                    <label>
                        <input
                            type="checkbox"
                            checked={
                                Array.isArray(submission.answers[question.id]) &&
                                submission.answers[question.id].includes(option)
                            }
                            disabled
                        />
                        {option}
                    </label>
                {/each}

            {:else if question.type === 'priority'}
                {@const ranked = Array.isArray(submission.answers[question.id])
                    ? submission.answers[question.id] as string[]
                    : []}

                <ol>
                    {#each ranked as option, index}
                        <li>{option} [{index + 1}º]</li>
                    {/each}
                </ol>
            {/if}
        </fieldset>
    {/each}
{:else}
    <p>Questionário aplicado não encontrado.</p>
{/if}
