<script lang="ts">
  let { message, onRetry }: { message: string; onRetry?: () => void } = $props();
</script>

<div class="card error-card">
  <p class="error-text">{message}</p>
  {#if onRetry}
    <button class="btn-secondary" onclick={onRetry} style="margin-top: 12px; width: auto;">
      Retry
    </button>
  {/if}
</div>

<style>
  .error-card {
    border-color: var(--danger);
  }
</style>
