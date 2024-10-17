import { createCipheriv, createHash } from 'node:crypto';
import { set } from 'es-toolkit/compat';
import { uncoverPaths } from '../helpers.js';
import { ISopsEncryptedJSON } from '../types.js';

/**
 * Encrypts a given string-value (e.g. a stringified object) in a sops-like fashion:
 *
 * @param key A provided key, must be a buffer containing a key of 32 bytes
 * @param data Stringified data
 * @param iv An initialization-vector for  the cipher
 * @param aad Additional authenticated data, in sops, the keys are concatenated and added as aa d
 */
const encryptScalarValue = (key: Buffer, data: string | Buffer | number | boolean, iv: Buffer, aad = '') => {
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(Buffer.from(aad));

    let encryptedBase64;
    let valType;
    if (typeof data === 'number') {
        encryptedBase64 = cipher.update(String(data), 'utf8', 'base64');
        valType = 'int';
    } else if (data instanceof Buffer) {
        encryptedBase64 = cipher.update(data);
        valType = 'bytes';
    } else if (typeof data === 'boolean') {
        encryptedBase64 = cipher.update(data.toString());
        valType = 'bool';
    } else {
        encryptedBase64 = cipher.update(data as string, 'utf8', 'base64');
        valType = 'str';
    }

    encryptedBase64 += cipher.final('base64');
    const ivBase64 = iv.toString('base64');
    const authTagBase64 = cipher.getAuthTag().toString('base64');

    return {
        valType,
        encValue: encryptedBase64,
        authTag: authTagBase64,
        iv: ivBase64,
        formatted: `ENC[AES256_GCM,data:${encryptedBase64},iv:${ivBase64},tag:${authTagBase64},type:${valType}]`,
    };
};

export const encryptJson = (key: Buffer, iv: Buffer, data: unknown): ISopsEncryptedJSON => {
    const paths = uncoverPaths(data);
    const digest = createHash('sha512');
    const lastModified = new Date().toISOString();

    const encryptedData = paths.reduce((acc, [nodePath, scalarValue]) => {
        const encryptedValue = encryptScalarValue(key, scalarValue, iv, nodePath).formatted;
        digest.update(String(scalarValue));
        return set(acc, nodePath, encryptedValue);
    }, {});

    return {
        ...encryptedData,
        sops: {
            gcp_kms: [
                {
                    resource_id: 'stubbed-kms-keyring',
                    created_at: lastModified,
                    enc: 'not-used',
                },
            ],
            lastmodified: lastModified,
            version: '3.7.3',
            mac: encryptScalarValue(key, digest.digest('hex'), iv, lastModified).formatted,
        },
    };
};
