<script lang="ts">
  import { copyToClipboard } from '../lib/utils';

  let { link, singleUse = true }: { link: string; singleUse?: boolean } = $props();

  let copied = $state(false);

  async function handleCopy() {
    const ok = await copyToClipboard(link);
    if (ok) {
      copied = true;
      setTimeout(() => {
        copied = false;
      }, 2000);
    }
  }
</script>

<div class="card success-card">
  <h2>Secret Created</h2>
  <p class="instructions">
    Share this link with the recipient.
    {singleUse
      ? ' The secret will be destroyed after the first successful view.'
      : ' The secret can be viewed multiple times until it expires.'}
  </p>

  <div class="link-row">
    <input type="text" value={link} readonly class="link-input" />
    <button class="btn-secondary copy-btn" onclick={handleCopy}>
      {copied ? 'Copied!' : 'Copy'}
    </button>
  </div>
</div>

<style>
  h2 {
    font-size: 20px;
    margin-bottom: 8px;
    color: var(--success);
  }

  .instructions {
    color: var(--text-secondary);
    font-size: 14px;
    margin-bottom: 16px;
  }

  .success-card {
    border-color: var(--success);
  }

  .link-row {
    display: flex;
    gap: 8px;
  }

  .link-input {
    flex: 1;
    font-size: 13px;
    padding: 10px 12px;
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    user-select: all;
  }

  .copy-btn {
    width: auto;
    white-space: nowrap;
    padding: 10px 20px;
  }
</style>
