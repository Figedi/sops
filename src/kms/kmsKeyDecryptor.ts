import { statSync } from "fs";
import { KeyManagementServiceClient, v1 } from "@google-cloud/kms";
import { IKeyDecryptor, ISopsEncryptedJSON } from "../types";

export class KmsKeyDecryptor implements IKeyDecryptor {
    private constructor(private client: v1.KeyManagementServiceClient) {}

    public static create(projectId?: string, serviceAccountPath?: string) {
        // in k8s, there might a service-account mounted
        if (serviceAccountPath) {
            try {
                statSync(serviceAccountPath);
                return new KmsKeyDecryptor(
                    new KeyManagementServiceClient({ projectId, keyFilename: serviceAccountPath }),
                );
            } catch (e) {
                if (e.code !== "ENOENT") {
                    throw e;
                }
            }
        }

        // implicit authorization for non-k8s envs
        return new KmsKeyDecryptor(new KeyManagementServiceClient({ projectId }));
    }

    public static createWithKmsClient(client: v1.KeyManagementServiceClient): IKeyDecryptor {
        return new KmsKeyDecryptor(client);
    }

    public canDecrypt(obj: ISopsEncryptedJSON) {
        return !!obj.sops && obj.sops.gcp_kms && !!obj.sops.gcp_kms.length;
    }

    public async decryptKey(obj: ISopsEncryptedJSON): Promise<Buffer> {
        const ciphertext = Buffer.from(obj.sops.gcp_kms[0].enc, "base64");
        const [result] = await this.client.decrypt({ ciphertext, name: obj.sops.gcp_kms[0].resource_id });

        if (!Buffer.isBuffer(result.plaintext)) {
            throw new Error(`Could not decrypt ciphertext, result is not a buffer`);
        }
        return result.plaintext;
    }
}
