import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;
export const hashPassword = async (password) => {
    const salt = randomBytes(16).toString('base64url');
    const key = (await scryptAsync(password, salt, KEY_LENGTH));
    return `scrypt$${salt}$${key.toString('base64url')}`;
};
export const verifyPassword = async (password, passwordHash) => {
    const [algorithm, salt, hash] = passwordHash.split('$');
    if (algorithm !== 'scrypt' || !salt || !hash) {
        return false;
    }
    const expected = Uint8Array.from(Buffer.from(hash, 'base64url'));
    const actual = Uint8Array.from((await scryptAsync(password, salt, expected.length)));
    return actual.length === expected.length && timingSafeEqual(actual, expected);
};
