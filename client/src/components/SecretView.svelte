<script lang="ts">
  import { copyToClipboard } from '../lib/utils';

  let { message, singleUse = true }: { message: string; singleUse?: boolean } = $props();

  let copied = $state(false);

  async function handleCopy() {
    const ok = await copyToClipboard(message);
    if (ok) {
      copied = true;
      setTimeout(() => { copied = false; }, 2000);
    }
  }
</script>

<div class="card">
  <h2>Decrypted Message</h2>
  <div class="message-content">{message}</div>
  <div class="actions">
    <button class="btn-secondary" onclick={handleCopy}>
      {copied ? 'Copied!' : 'Copy to Clipboard'}
    </button>
  </div>
  <p class="warning">
    {singleUse
      ? 'This message has been destroyed and cannot be viewed again.'
      : 'This link is reusable and remains available until it expires.'}
  </p>
</div>

<style>
  h2 {
    font-size: 20px;
    margin-bottom: 16px;
  }

  .message-content {
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    font-size: 14px;
    line-height: 1.5;
    color: var(--text-primary);
    max-height: 400px;
    overflow-y: auto;
  }

  .actions {
    margin-top: 16px;
  }

  .warning {
    color: var(--text-secondary);
    font-size: 13px;
    margin-top: 16px;
    text-align: center;
  }
</style>
