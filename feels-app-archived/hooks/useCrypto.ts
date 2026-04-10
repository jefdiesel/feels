import { useCallback, useRef, useEffect } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Key storage keys
const PRIVATE_KEY_STORAGE_KEY = 'feels_private_key';
const PUBLIC_KEY_STORAGE_KEY = 'feels_public_key';

// Type definitions for Web Crypto API
interface CryptoKeyPair {
  privateKey: CryptoKey;
  publicKey: CryptoKey;
}

interface ExportedKeyPair {
  privateKey: string;
  publicKey: string;
}

// Get the crypto object based on platform
const getCrypto = (): SubtleCrypto | null => {
  if (Platform.OS === 'web') {
    return window.crypto?.subtle || null;
  }
  // React Native - use expo-crypto or polyfill
  // Note: For production, you would use expo-crypto or a native module
  // This uses the global crypto which may be available via react-native-get-random-values
  if (typeof global !== 'undefined' && (global as any).crypto?.subtle) {
    return (global as any).crypto.subtle;
  }
  return null;
};

// Convert ArrayBuffer to base64
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  if (Platform.OS === 'web') {
    return btoa(binary);
  }
  // React Native
  return Buffer.from(bytes).toString('base64');
};

// Convert base64 to ArrayBuffer
const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  let binary: string;
  if (Platform.OS === 'web') {
    binary = atob(base64);
  } else {
    // React Native
    binary = Buffer.from(base64, 'base64').toString('binary');
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

// Storage wrapper for keys
const keyStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },

  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export function useCrypto() {
  const cryptoRef = useRef<SubtleCrypto | null>(null);

  useEffect(() => {
    cryptoRef.current = getCrypto();
  }, []);

  /**
   * Generate a new ECDH key pair for E2E encryption
   * Returns the public key as base64 (to be sent to server)
   * Private key is stored securely on device
   */
  const generateKeyPair = useCallback(async (): Promise<string> => {
    const crypto = cryptoRef.current || getCrypto();
    if (!crypto) {
      throw new Error('WebCrypto not available');
    }

    // Generate ECDH key pair using P-256 curve
    const keyPair = await crypto.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      true, // extractable
      ['deriveKey', 'deriveBits']
    ) as CryptoKeyPair;

    // Export public key as SPKI format
    const publicKeyData = await crypto.exportKey('spki', keyPair.publicKey);
    const publicKeyBase64 = arrayBufferToBase64(publicKeyData);

    // Export private key as PKCS8 format
    const privateKeyData = await crypto.exportKey('pkcs8', keyPair.privateKey);
    const privateKeyBase64 = arrayBufferToBase64(privateKeyData);

    // Store both keys securely
    await keyStorage.setItem(PRIVATE_KEY_STORAGE_KEY, privateKeyBase64);
    await keyStorage.setItem(PUBLIC_KEY_STORAGE_KEY, publicKeyBase64);

    return publicKeyBase64;
  }, []);

  /**
   * Get the stored public key
   */
  const getStoredPublicKey = useCallback(async (): Promise<string | null> => {
    return keyStorage.getItem(PUBLIC_KEY_STORAGE_KEY);
  }, []);

  /**
   * Get the stored private key (for internal use)
   */
  const getStoredPrivateKey = useCallback(async (): Promise<CryptoKey | null> => {
    const crypto = cryptoRef.current || getCrypto();
    if (!crypto) {
      return null;
    }

    const privateKeyBase64 = await keyStorage.getItem(PRIVATE_KEY_STORAGE_KEY);
    if (!privateKeyBase64) {
      return null;
    }

    const privateKeyData = base64ToArrayBuffer(privateKeyBase64);
    return crypto.importKey(
      'pkcs8',
      privateKeyData,
      {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      false,
      ['deriveKey', 'deriveBits']
    );
  }, []);

  /**
   * Import a public key from base64
   */
  const importPublicKey = useCallback(async (publicKeyBase64: string): Promise<CryptoKey> => {
    const crypto = cryptoRef.current || getCrypto();
    if (!crypto) {
      throw new Error('WebCrypto not available');
    }

    const publicKeyData = base64ToArrayBuffer(publicKeyBase64);
    return crypto.importKey(
      'spki',
      publicKeyData,
      {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      true,
      []
    );
  }, []);

  /**
   * Derive a shared AES key from our private key and their public key
   */
  const deriveSharedKey = useCallback(async (theirPublicKey: CryptoKey): Promise<CryptoKey> => {
    const crypto = cryptoRef.current || getCrypto();
    if (!crypto) {
      throw new Error('WebCrypto not available');
    }

    const privateKey = await getStoredPrivateKey();
    if (!privateKey) {
      throw new Error('No private key found');
    }

    return crypto.deriveKey(
      {
        name: 'ECDH',
        public: theirPublicKey,
      },
      privateKey,
      {
        name: 'AES-GCM',
        length: 256,
      },
      false,
      ['encrypt', 'decrypt']
    );
  }, [getStoredPrivateKey]);

  /**
   * Encrypt a message using the recipient's public key
   * Returns: base64 encoded string containing IV + ciphertext
   */
  const encryptMessage = useCallback(async (
    recipientPublicKeyBase64: string,
    message: string
  ): Promise<string> => {
    const crypto = cryptoRef.current || getCrypto();
    if (!crypto) {
      throw new Error('WebCrypto not available');
    }

    // Import recipient's public key
    const recipientPublicKey = await importPublicKey(recipientPublicKeyBase64);

    // Derive shared AES key
    const sharedKey = await deriveSharedKey(recipientPublicKey);

    // Generate random IV (12 bytes for AES-GCM)
    const iv = new Uint8Array(12);
    if (Platform.OS === 'web') {
      window.crypto.getRandomValues(iv);
    } else {
      // React Native - use crypto.getRandomValues if available
      const cryptoObj = (global as any).crypto;
      if (cryptoObj?.getRandomValues) {
        cryptoObj.getRandomValues(iv);
      } else {
        // Fallback: generate random bytes
        for (let i = 0; i < 12; i++) {
          iv[i] = Math.floor(Math.random() * 256);
        }
      }
    }

    // Encode message to bytes
    const encoder = new TextEncoder();
    const messageBytes = encoder.encode(message);

    // Encrypt
    const ciphertext = await crypto.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      sharedKey,
      messageBytes
    );

    // Combine IV + ciphertext
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    return arrayBufferToBase64(combined.buffer);
  }, [importPublicKey, deriveSharedKey]);

  /**
   * Decrypt a message using the sender's public key
   * Input: base64 encoded string containing IV + ciphertext
   */
  const decryptMessage = useCallback(async (
    senderPublicKeyBase64: string,
    encryptedMessage: string
  ): Promise<string> => {
    const crypto = cryptoRef.current || getCrypto();
    if (!crypto) {
      throw new Error('WebCrypto not available');
    }

    // Import sender's public key
    const senderPublicKey = await importPublicKey(senderPublicKeyBase64);

    // Derive shared AES key
    const sharedKey = await deriveSharedKey(senderPublicKey);

    // Decode combined IV + ciphertext
    const combined = new Uint8Array(base64ToArrayBuffer(encryptedMessage));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    // Decrypt
    const decrypted = await crypto.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      sharedKey,
      ciphertext
    );

    // Decode message from bytes
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }, [importPublicKey, deriveSharedKey]);

  /**
   * Check if we have a stored key pair
   */
  const hasKeyPair = useCallback(async (): Promise<boolean> => {
    const privateKey = await keyStorage.getItem(PRIVATE_KEY_STORAGE_KEY);
    const publicKey = await keyStorage.getItem(PUBLIC_KEY_STORAGE_KEY);
    return !!privateKey && !!publicKey;
  }, []);

  /**
   * Clear stored keys (for logout or key rotation)
   */
  const clearKeys = useCallback(async (): Promise<void> => {
    await keyStorage.deleteItem(PRIVATE_KEY_STORAGE_KEY);
    await keyStorage.deleteItem(PUBLIC_KEY_STORAGE_KEY);
  }, []);

  /**
   * Check if WebCrypto is available
   */
  const isCryptoAvailable = useCallback((): boolean => {
    return !!(cryptoRef.current || getCrypto());
  }, []);

  return {
    generateKeyPair,
    getStoredPublicKey,
    encryptMessage,
    decryptMessage,
    hasKeyPair,
    clearKeys,
    isCryptoAvailable,
  };
}

export type UseCryptoReturn = ReturnType<typeof useCrypto>;
