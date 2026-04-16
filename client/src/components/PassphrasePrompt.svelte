<script lang="ts">
  let { onSubmit, error }: { onSubmit: (passphrase: string) => void; error: string | null } = $props();

  let passphrase = $state('');

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (passphrase) {
      onSubmit(passphrase);
    }
  }
</script>

<form onsubmit={handleSubmit} class="card">
  <h2>This message is password-protected</h2>
  <p class="description">Enter the passphrase shared by the sender to decrypt the message.</p>
  <div class="field">
    <label for="passphrase">Passphrase</label>
    <input
      id="passphrase"
      type="password"
      bind:value={passphrase}
      placeholder="Enter passphrase..."
      autocomplete="off"
    />
  </div>
  {#if error}
    <p class="error-text">{error}</p>
  {/if}
  <button type="submit" class="btn-primary" disabled={!passphrase}>
    Decrypt
  </button>
</form>

<style>
  h2 {
    font-size: 20px;
    margin-bottom: 8px;
  }

  .description {
    color: var(--text-secondary);
    font-size: 14px;
    margin-bottom: 20px;
  }

  .field {
    margin-bottom: 16px;
  }

  .error-text {
    color: var(--danger);
    font-size: 14px;
    margin-bottom: 12px;
  }
</style>
