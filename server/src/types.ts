export interface Secret {
  id: string;
  encrypted_data: Buffer;
  iv: Buffer;
  salt: Buffer | null;
  has_passphrase: number; // 0 or 1
  single_use: number; // 0 or 1
  ttl_seconds: number;
  expires_at: string; // ISO datetime
  created_at: string;
  is_read: number; // 0 or 1
}

export interface CreateSecretRequest {
  encrypted_data: string; // base64url encoded
  iv: string; // base64url encoded
  salt?: string; // base64url encoded, optional
  has_passphrase: boolean;
  single_use?: boolean;
  ttl_seconds: number; // 3600, 86400, or 604800
}

export interface CreateSecretResponse {
  id: string;
  expires_at: string;
}

export interface SecretResponse {
  id: string;
  encrypted_data: string; // base64url
  iv: string; // base64url
  salt: string | null; // base64url
  has_passphrase: boolean;
  single_use: boolean;
}

export interface SecretMetaResponse {
  id: string;
  has_passphrase: boolean;
  single_use: boolean;
  expires_at: string;
}
