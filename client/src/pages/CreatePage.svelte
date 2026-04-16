<script lang="ts">
  import CreateForm from '../components/CreateForm.svelte';
  import SecretLink from '../components/SecretLink.svelte';

  let phase = $state<'form' | 'link'>('form');
  let generatedLink = $state('');

  function handleCreated(link: string) {
    generatedLink = link;
    phase = 'link';
  }

  function handleCreateAnother() {
    generatedLink = '';
    phase = 'form';
  }
</script>

{#if phase === 'form'}
  <CreateForm onCreated={handleCreated} />
{:else}
  <SecretLink link={generatedLink} />
  <button class="btn-secondary" onclick={handleCreateAnother} style="width: 100%;">
    Create another
  </button>
{/if}
