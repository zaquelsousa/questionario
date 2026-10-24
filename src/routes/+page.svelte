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

</script>

<nav>
    {#each nav as n}
        <a href={n.href}>{n.label}</a>
    {/each}
</nav>

<h1>Questionários</h1>

<div class="tabs">
    <button
        class:active={activeTab === 'questionnaires'}
        onclick={() => activeTab = 'questionnaires'}
    >
        Questionários ({questionnaires.length})
    </button>

    <button
        class:active={activeTab === 'applied'}
        onclick={() => activeTab = 'applied'}
    >
        Aplicados ({applied.length})
    </button>
</div>

<div class="questionnaire-grid">
    {#if activeTab === 'questionnaires'}
        {#each questionnaires as q (q.id)}
            <a
                class="questionnaire-card"
                href={`/questionnaire/${q.id}`}
            >
                <h2>{q.title}</h2>
                <p>
                    {q.questions.length}
                    {q.questions.length === 1 ? 'questão' : 'questões'}
                </p>
                <span>Abrir questionário →</span>
            </a>
        {:else}
            <p>Nenhum questionário salvo ainda.</p>
        {/each}

    {:else}
        {#each applied as a (a.name)}
            <a
                class="questionnaire-card"
                href={`/applied?name=${encodeURIComponent(a.name)}`}
            >
                <h2>{a.name}</h2>
                <p>{a.questionnaireTitle}</p>
                <span>
                    Aplicado em {new Date(a.savedAt).toLocaleDateString('pt-BR')}
                </span>
                <br />
                <span>Ver respostas →</span>
            </a>
        {:else}
            <p>Nenhum questionário aplicado ainda.</p>
        {/each}
    {/if}
</div>
<style>
  .questionnaire-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .questionnaire-card {
    display: block;
    padding: 1.25rem;
    border: 1px solid #ddd;
    border-radius: 12px;
    color: inherit;
    text-decoration: none;
    transition: border-color 0.2s, transform 0.2s;
  }

  .questionnaire-card:hover {
    border-color: #777;
    transform: translateY(-2px);
  }

  .questionnaire-card h2 {
    margin-top: 0;
  }

  .questionnaire-card p {
    color: #666;
  }

  .tabs {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
    border-bottom: 1px solid #ddd;
}

.tabs button {
    padding: 0.75rem 1rem;
    border: none;
    border-bottom: 2px solid transparent;
    background: transparent;
    cursor: pointer;
}

.tabs button.active {
    border-bottom-color: #333;
    font-weight: 600;
}

.tabs button:hover {
    background: #f5f5f5;
}
</style>
