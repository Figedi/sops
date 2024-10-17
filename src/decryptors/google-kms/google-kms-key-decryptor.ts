import { stat } from 'node:fs/promises';
import type { KeyManagementServiceClient } from '@google-cloud/kms';
import { resolvePathOrObj } from '../../helpers';
import { IKeyDecryptor, ISopsEncryptedJSON } from '../../types';

export class GoogleKmsKeyDecryptor implements IKeyDecryptor {
    private constructor(private client: KeyManagementServiceClient) {}

    public static async create(projectId?: string, serviceAccountPath?: string) {
        const mod = await import('@google-cloud/kms');
        // in k8s, there might a service-account mounted
        if (serviceAccountPath) {
            try {
                stat(serviceAccountPath);
                return new GoogleKmsKeyDecryptor(new mod.KeyManagementServiceClient({ projectId, keyFilename: serviceAccountPath }));
            } catch (e) {
                if (e.code !== 'ENOENT') {
                    throw e;
                }
            }
        }

        // implicit authorization for non-k8s envs
        return new GoogleKmsKeyDecryptor(new mod.KeyManagementServiceClient({ projectId }));
    }

    public static createWithKmsClient(client: KeyManagementServiceClient): IKeyDecryptor {
        return new GoogleKmsKeyDecryptor(client);
    }

    public async canDecrypt(objOrPath: string | ISopsEncryptedJSON) {
        const { content } = await resolvePathOrObj(objOrPath);

        return !!content.sops && content.sops.gcp_kms && !!content.sops.gcp_kms.length;
    }

    public async decryptKey(objOrPath: string | ISopsEncryptedJSON): Promise<Buffer> {
        const { content } = await resolvePathOrObj(objOrPath);
        const ciphertext = Buffer.from(content.sops.gcp_kms[0].enc, 'base64');
        const [result] = await this.client.decrypt({ ciphertext, name: content.sops.gcp_kms[0].resource_id });

        if (!Buffer.isBuffer(result.plaintext)) {
            throw new Error(`Could not decrypt ciphertext, result is not a buffer`);
        }
        return result.plaintext;
    }
}
