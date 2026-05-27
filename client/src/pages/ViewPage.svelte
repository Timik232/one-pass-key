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
// The router regex captures everything after /secret/, so we split on '#'.
function parseSecretRef(secretRef: string): { secretId: string; keyFromUrl: string | null } {
  const hashIndex = secretRef.indexOf('#');
  return {
    secretId: hashIndex >= 0 ? secretRef.substring(0, hashIndex) : secretRef,
    keyFromUrl: hashIndex >= 0 ? secretRef.substring(hashIndex + 1) : null,
  };
}

type Phase = 'loading' | 'passphrase' | 'revealing' | 'revealed' | 'not-found' | 'error';
let phase = $state<Phase>('loading');
let decryptedMessage = $state('');
let passphraseError = $state<string | null>(null);
let errorMessage = $state('');
let currentSingleUse = $state(true);

// Cached encrypted data for passphrase-protected secrets with single_use=false.
// After the first fetch from the server, we cache locally so passphrase
// retries don't trigger additional server calls.
let cachedSecret: SecretResponse | null = null;

// Resolved secretId from URL parsing (set once during loadMeta).
let resolvedSecretId = $state('');

$effect(() => {
  loadMeta();
});

async function loadMeta() {
  phase = 'loading';
  try {
    const { secretId, keyFromUrl } = parseSecretRef(rawSecretId);
    resolvedSecretId = secretId;
    const meta: SecretMetaResponse = await getSecretMeta(secretId);
    currentSingleUse = meta.single_use;

    if (meta.has_passphrase) {
      // DO NOT fetch encrypted data yet — wait for the user to submit a passphrase.
      // For single_use=true secrets, the server destroys the data on read,
      // so fetching prematurely would burn the secret before the recipient
      // even sees the passphrase prompt.
      phase = 'passphrase';
    } else if (keyFromUrl) {
      await fetchAndDecrypt(secretId, keyFromUrl);
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

async function fetchAndDecrypt(secretId: string, keyOrPassphrase: string) {
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

async function handlePassphraseSubmit(passphrase: string) {
  passphraseError = null;
  phase = 'revealing';

  // If we already have cached encrypted data (reusable secret, wrong passphrase
  // on first try), decrypt locally without hitting the server again.
  if (cachedSecret) {
    try {
      decryptedMessage = await decrypt(
        cachedSecret.encrypted_data,
        cachedSecret.iv,
        passphrase,
        cachedSecret.salt ?? undefined
      );
      cachedSecret = null;
      phase = 'revealed';
    } catch {
      passphraseError = 'Wrong passphrase. Try again.';
      phase = 'passphrase';
    }
    return;
  }

  // First attempt: fetch from server, then try to decrypt.
  // For single_use=true this consumes the secret — that's correct,
  // the user explicitly submitted a passphrase.
  try {
    const secret = await getSecret(resolvedSecretId);

    try {
      decryptedMessage = await decrypt(
        secret.encrypted_data,
        secret.iv,
        passphrase,
        secret.salt ?? undefined
      );
      phase = 'revealed';
    } catch {
      // Decryption failed (wrong passphrase).
      // For single_use=false: cache the data locally so the user can retry
      // without burning another server read.
      // For single_use=true: the secret is already gone, nothing to retry.
      if (!currentSingleUse) {
        cachedSecret = secret;
        passphraseError = 'Wrong passphrase. Try again.';
        phase = 'passphrase';
      } else {
        phase = 'error';
        errorMessage = 'Wrong passphrase. The one-time secret has been destroyed.';
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('not found')) {
      phase = 'not-found';
    } else {
      phase = 'error';
      errorMessage = err instanceof Error ? err.message : 'Failed to fetch secret';
    }
  }
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
  <SecretView message={decryptedMessage} singleUse={currentSingleUse} />
{/if}

<style>
  .loading-text {
    color: var(--text-secondary);
    font-size: 14px;
    text-align: center;
  }
</style>
