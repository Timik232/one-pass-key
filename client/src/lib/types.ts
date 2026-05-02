export interface CreateSecretRequest {
  encrypted_data: string; // base64url encoded
  iv: string; // base64url encoded
  salt?: string; // base64url encoded
  has_passphrase: boolean;
  single_use?: boolean;
  ttl_seconds: number;
}

export interface CreateSecretResponse {
  id: string;
  expires_at: string;
}

export interface SecretResponse {
  id: string;
  encrypted_data: string;
  iv: string;
  salt: string | null;
  has_passphrase: boolean;
  single_use: boolean;
}

export interface SecretMetaResponse {
  id: string;
  has_passphrase: boolean;
  single_use: boolean;
  expires_at: string;
}

export type TtlOption = {
  label: string;
  seconds: number;
};
