<script lang="ts">
  import CreateForm from '../components/CreateForm.svelte';
  import SecretLink from '../components/SecretLink.svelte';

  let phase = $state<'form' | 'link'>('form');
  let generatedLink = $state('');
  let generatedSingleUse = $state(true);

  function handleCreated(link: string, singleUse: boolean) {
    generatedLink = link;
    generatedSingleUse = singleUse;
    phase = 'link';
  }

  function handleCreateAnother() {
    generatedLink = '';
    generatedSingleUse = true;
    phase = 'form';
  }
</script>

{#if phase === 'form'}
  <CreateForm onCreated={handleCreated} />
{:else}
  <SecretLink link={generatedLink} singleUse={generatedSingleUse} />
  <button class="btn-secondary" onclick={handleCreateAnother} style="width: 100%;">
    Create another
  </button>
{/if}
