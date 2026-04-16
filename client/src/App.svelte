<script lang="ts">
import Header from './components/Header.svelte';
import CreatePage from './pages/CreatePage.svelte';
import ViewPage from './pages/ViewPage.svelte';

let route = $state<{ page: string; id?: string }>({ page: 'create' });

function parseHash(): { page: string; id?: string } {
  const hash = window.location.hash || '#/';
  if (hash === '#/' || hash === '#' || hash === '') {
    return { page: 'create' };
  }
  const match = hash.match(/^#\/secret\/(.+)$/);
  if (match) {
    return { page: 'view', id: match[1] };
  }
  return { page: 'create' };
}

$effect(() => {
  route = parseHash();

  const onHashChange = () => {
    route = parseHash();
  };

  window.addEventListener('hashchange', onHashChange);
  return () => window.removeEventListener('hashchange', onHashChange);
});
</script>

<Header />

{#if route.page === 'view' && route.id}
  <ViewPage secretId={route.id} />
{:else}
  <CreatePage />
{/if}
