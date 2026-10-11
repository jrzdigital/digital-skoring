/**
 * Web Crypto API utilities for End-to-End Encryption (AES-GCM 256-bit)
 * Ensures confidential student medical, performance, and training archives are tamper-proof.
 */

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptData(plainText: string, passphrase: string): Promise<string> {
  try {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(passphrase, salt);
    
    const enc = new TextEncoder();
    const encodedData = enc.encode(plainText);
    
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encodedData
    );

    // Pack salt + iv + ciphertext as Base64 JSON
    const payload = {
      s: Array.from(salt),
      i: Array.from(iv),
      c: Array.from(new Uint8Array(encrypted)),
      v: 1, // version
    };

    return btoa(JSON.stringify(payload));
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Gagal mengenkripsi data.');
  }
}

export async function decryptData(cipherPackage: string, passphrase: string): Promise<string> {
  try {
    const raw = atob(cipherPackage);
    const payload = JSON.parse(raw);
    
    const salt = new Uint8Array(payload.s);
    const iv = new Uint8Array(payload.i);
    const cipherText = new Uint8Array(payload.c);

    const key = await deriveKey(passphrase, salt);

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      cipherText
    );

    const dec = new TextDecoder();
    return dec.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Kata sandi salah atau arsip data rusak / terkorupsi.');
  }
}

export async function hashPassphrase(passphrase: string): Promise<string> {
  const enc = new TextEncoder();
  const digest = await window.crypto.subtle.digest('SHA-256', enc.encode(passphrase));
  const hashArray = Array.from(new Uint8Array(digest));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
