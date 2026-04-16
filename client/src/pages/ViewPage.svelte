<script lang="ts">
import { getSecret, getSecretMeta } from '../lib/api';
import { decrypt } from '../lib/crypto';
import PassphrasePrompt from '../components/PassphrasePrompt.svelte';
import SecretView from '../components/SecretView.svelte';
import BurnNotice from '../components/BurnNotice.svelte';
import ErrorDisplay from '../components/ErrorDisplay.svelte';
import type { SecretMetaResponse, SecretResponse } from '../lib/types';

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

// Cached encrypted data for passphrase-protected secrets.
// Fetched once from server (which destroys it), then decryption
// retries happen locally without re-fetching.
let cachedSecret: SecretResponse | null = null;

$effect(() => {
  loadMeta();
});

async function loadMeta() {
  phase = 'loading';
  try {
    const meta: SecretMetaResponse = await getSecretMeta(secretId);

    if (meta.has_passphrase) {
      // Fetch the encrypted data NOW (server destroys it after this),
      // cache it locally so passphrase retries don't need another API call.
      phase = 'revealing';
      cachedSecret = await getSecret(secretId);
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
      phase = 'error';
      errorMessage = err instanceof Error ? err.message : 'Decryption failed';
    }
  }
}

function handlePassphraseSubmit(passphrase: string) {
  if (!cachedSecret) {
    phase = 'error';
    errorMessage = 'Secret data not available';
    return;
  }
  passphraseError = null;
  phase = 'revealing';

  // Decrypt locally using cached data — no server call needed.
  // This allows passphrase retries without destroying the secret again.
  decrypt(
    cachedSecret.encrypted_data,
    cachedSecret.iv,
    passphrase,
    cachedSecret.salt ?? undefined
  ).then((message) => {
    decryptedMessage = message;
    cachedSecret = null; // Clear sensitive data after successful decryption
    phase = 'revealed';
  }).catch((err) => {
    passphraseError = err instanceof Error ? err.message : 'Wrong passphrase. Try again.';
    phase = 'passphrase';
  });
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
