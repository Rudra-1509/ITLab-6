import { hash as argonHash, verify as argonVerify } from '@node-rs/argon2';
import bcrypt from 'bcryptjs';

export async function hashPassword(password: string): Promise<string> {
  try {
    return await argonHash(password);
  } catch (error) {
    // Fallback to bcrypt if Argon2 fails for any reason
    return bcrypt.hash(password, 12);
  }
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    if (hash.startsWith('$argon2')) {
      return await argonVerify(hash, password);
    }
    return await bcrypt.compare(password, hash);
  } catch (error) {
    return false;
  }
}
