<script lang="ts">
import { getSecret, getSecretMeta } from '../lib/api';
import { decrypt } from '../lib/crypto';
import PassphrasePrompt from '../components/PassphrasePrompt.svelte';
import SecretView from '../components/SecretView.svelte';
import BurnNotice from '../components/BurnNotice.svelte';
import ErrorDisplay from '../components/ErrorDisplay.svelte';
import type { SecretMetaResponse } from '../lib/types';

let { secretId: rawSecretId }: { secretId: string } = $props();

// Parse the encryption key from the ID (URL format: #/secret/ID#KEY)
// The router regex captures everything after /secret/, so we split on '#'
const hashIndex = rawSecretId.indexOf('#');
const secretId = hashIndex >= 0 ? rawSecretId.substring(0, hashIndex) : rawSecretId;
const keyFromUrl: string | null = hashIndex >= 0 ? rawSecretId.substring(hashIndex + 1) : null;

type Phase = 'loading' | 'passphrase' | 'revealing' | 'revealed' | 'not-found' | 'error';
let phase = $state<Phase>('loading');
let decryptedMessage = $state('');
let passphraseError = $state<string | null>(null);
let errorMessage = $state('');

$effect(() => {
  loadMeta();
});

async function loadMeta() {
  phase = 'loading';
  try {
    const meta: SecretMetaResponse = await getSecretMeta(secretId);

    if (meta.has_passphrase) {
      phase = 'passphrase';
    } else if (keyFromUrl) {
      await fetchAndDecrypt(keyFromUrl);
    } else {
      phase = 'error';
      errorMessage = 'Invalid link - missing encryption key';
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('not found')) {
      phase = 'not-found';
    } else {
      phase = 'error';
      errorMessage = err instanceof Error ? err.message : 'Failed to load secret';
    }
  }
}

async function fetchAndDecrypt(keyOrPassphrase: string) {
  phase = 'revealing';
  try {
    const secret = await getSecret(secretId);
    decryptedMessage = await decrypt(
      secret.encrypted_data,
      secret.iv,
      keyOrPassphrase,
      secret.salt ?? undefined
    );
    phase = 'revealed';
  } catch (err) {
    if (err instanceof Error && err.message.includes('not found')) {
      phase = 'not-found';
    } else {
      phase = 'passphrase';
      passphraseError = err instanceof Error ? err.message : 'Decryption failed. Check your passphrase.';
    }
  }
}

function handlePassphraseSubmit(passphrase: string) {
  passphraseError = null;
  fetchAndDecrypt(passphrase);
}
</script>

{#if phase === 'loading'}
  <div class="card">
    <p class="loading-text">Loading...</p>
  </div>
{:else if phase === 'not-found'}
  <BurnNotice />
{:else if phase === 'error'}
  <ErrorDisplay message={errorMessage} />
{:else if phase === 'passphrase'}
  <PassphrasePrompt onSubmit={handlePassphraseSubmit} error={passphraseError} />
{:else if phase === 'revealing'}
  <div class="card">
    <p class="loading-text">Decrypting...</p>
  </div>
{:else if phase === 'revealed'}
  <SecretView message={decryptedMessage} />
{/if}

<style>
  .loading-text {
    color: var(--text-secondary);
    font-size: 14px;
    text-align: center;
  }
</style>
