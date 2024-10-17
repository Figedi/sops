import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ISopsEncryptedJSON } from '../../types.js';
import { encryptJson } from '../sops.spec-utils.js';

// @ts-expect-error target is not commonjs 🤷‍♂️
const __dirname = import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));

const baseJson = JSON.parse(readFileSync(join(__dirname, './secrets.json'), { encoding: 'utf-8' }));
export const getUnencryptedSecret = (): Record<string, any> => baseJson;
export const getEncryptedSecret = (key: Buffer, iv: Buffer): ISopsEncryptedJSON => encryptJson(key, iv, baseJson);

export const getEncryptedSecretWrongMac = (key: Buffer, iv: Buffer): ISopsEncryptedJSON => {
    const encrypted = getEncryptedSecret(key, iv);

    return {
        ...encrypted,
        sops: {
            ...encrypted.sops,
            // please note that getEncryptedSecret() always outputs a mac
            mac: encrypted.sops.mac!.replace(/data:(.)/, 'data:'), // removes one char from data-block
        },
    };
};
