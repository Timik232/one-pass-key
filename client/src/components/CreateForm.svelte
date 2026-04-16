<script lang="ts">
  import { encrypt } from '../lib/crypto';
  import { createSecret } from '../lib/api';
  import { TTL_OPTIONS } from '../lib/utils';

  let { onCreated }: { onCreated: (link: string) => void } = $props();

  let message = $state('');
  let ttlIndex = $state(1);
  let passphrase = $state('');
  let loading = $state(false);
  let error = $state('');

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!message.trim() || loading) return;

    loading = true;
    error = '';

    try {
      const { encrypted_data, iv, salt, key } = await encrypt(message, passphrase || undefined);
      const { id } = await createSecret({
        encrypted_data,
        iv,
        salt,
        has_passphrase: !!passphrase,
        ttl_seconds: TTL_OPTIONS[ttlIndex].seconds,
      });

      const origin = window.location.origin;
      let link: string;
      if (passphrase) {
        link = `${origin}/#/secret/${id}`;
      } else {
        link = `${origin}/#/secret/${id}#${key}`;
      }

      onCreated(link);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to create secret';
    } finally {
      loading = false;
    }
  }
</script>

<form onsubmit={handleSubmit} class="card">
  <h2>Create Secret</h2>

  <div class="form-group">
    <label for="secret-message">Message</label>
    <textarea
      id="secret-message"
      bind:value={message}
      placeholder="Enter your secret message..."
      required
      minlength="1"
    ></textarea>
  </div>

  <div class="form-group">
    <label for="secret-ttl">Expires in</label>
    <select id="secret-ttl" bind:value={ttlIndex}>
      {#each TTL_OPTIONS as option, i}
        <option value={i}>{option.label}</option>
      {/each}
    </select>
  </div>

  <div class="form-group">
    <label for="secret-passphrase">Passphrase (optional)</label>
    <input
      id="secret-passphrase"
      type="password"
      bind:value={passphrase}
      placeholder="Add extra security with a passphrase"
    />
  </div>

  {#if error}
    <p class="error-text">{error}</p>
  {/if}

  <button type="submit" class="btn-primary" disabled={loading || !message.trim()}>
    {loading ? 'Creating...' : 'Create Secure Link'}
  </button>
</form>

<style>
  h2 {
    font-size: 20px;
    margin-bottom: 16px;
  }

  .form-group {
    margin-bottom: 16px;
  }

  .error-text {
    color: var(--danger);
    font-size: 14px;
    margin-bottom: 12px;
  }
</style>
