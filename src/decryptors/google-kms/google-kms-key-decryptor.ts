import type { KeyManagementServiceClient } from '@google-cloud/kms';
import { resolvePathOrObj } from '../../helpers.js';
import type { IKeyDecryptor, ISopsEncryptedJSON } from '../../types.js';

export class GoogleKmsKeyDecryptor implements IKeyDecryptor {
    constructor(private client: KeyManagementServiceClient) {}

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
