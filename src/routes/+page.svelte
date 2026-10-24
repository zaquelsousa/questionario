<script lang="ts">
import type { Question, Questionnaire, QuestionType } from '#lib';

let description = $state('');
let type = $state<QuestionType>('open');
let required = $state(false);
let options = $state(['', '']);

let questionnaire = $state<Questionnaire | null>(null);

let questions: Question[] = []
function handleSubmit() {
    const question: Question = {
        id: crypto.randomUUID(),
        description,
        type,
        required,
        options: options
        .map(option => option.trim())
        .filter(Boolean)
    };
    
    questions.push(question)
    console.log(question);
}

function addOption() {
    options.push('');
}

function removeOption(index: number) {
    options.splice(index, 1);
}


function saveQuestionnaire() {
    const title = prompt('Nome do questionário:');

    if (!title?.trim()) return;

    questionnaire = {
        id: crypto.randomUUID(),
        title: title.trim(),
        questions: [...questions]
    };

    console.log(questionnaire);
    localStorage.setItem(
        'questionnaire',
        JSON.stringify(questionnaire)
    );
}

</script>

<form onsubmit={handleSubmit}>
    <label>
        Questao
        <input bind:value={description} required />
    </label>

    <label>
        Tipo
        <select bind:value={type}>
            <option value="open">Questao aberta</option>
            <option value="closed">Questao fechada</option>
            <option value="multiple-choice">multipla escolha</option>
            <option value="priority">ordem de prioridade</option>
        </select>
    </label>

    <label>
        {#if type === 'multiple-choice' || type === 'priority' ||type === 'closed'}
            {#each options as option, index}
                <div>
                    <input
                        bind:value={options[index]}
                        placeholder={`Option ${index + 1}`}
                    />

                    <button
                        type="button"
                        onclick={() => removeOption(index)}
                        disabled={options.length <= 2}
                    >
                        Remove
                    </button>
                </div>
            {/each}

            <button type="button" onclick={addOption}>
                Add option
            </button>
        {/if}
    </label>

    <label>
        <input type="checkbox" bind:checked={required} />
        Obrigatorio
    </label>


    <button type="submit">Criar questão</button>

    <button type="button" onclick={saveQuestionnaire}>
        Salvar questionário
    </button>
</form>
