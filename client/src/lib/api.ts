import type { CreateSecretRequest, CreateSecretResponse, SecretResponse, SecretMetaResponse } from './types';

const API_BASE = '/api/secrets';

export async function createSecret(data: CreateSecretRequest): Promise<CreateSecretResponse> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create secret');
  }
  return res.json();
}

export async function getSecret(id: string): Promise<SecretResponse> {
  const res = await fetch(`${API_BASE}/${id}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to get secret');
  }
  return res.json();
}

export async function getSecretMeta(id: string): Promise<SecretMetaResponse> {
  const res = await fetch(`${API_BASE}/${id}/meta`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Secret not found');
  }
  return res.json();
}
