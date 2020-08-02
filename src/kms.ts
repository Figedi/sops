import { v1, KeyManagementServiceClient } from "@google-cloud/kms";
import { statSync } from "fs";

import { ISopsEncryptedJSON } from "./types";
import { decryptSopsJson } from "./sops";

const decryptKeyViaGCPKMS = async (
    client: v1.KeyManagementServiceClient,
    { sops }: ISopsEncryptedJSON,
): Promise<Buffer> => {
    const ciphertext = Buffer.from(sops.gcp_kms[0].enc, "base64");
    const [result] = await client.decrypt({ ciphertext, name: sops.gcp_kms[0].resource_id });

    if (!Buffer.isBuffer(result.plaintext)) {
        throw new Error(`Could not decrypt ciphertext, result is not a buffer`);
    }
    return result.plaintext;
};

export const canDecryptViaKMS = (obj: any): obj is ISopsEncryptedJSON => {
    return !!obj.sops && obj.sops.gcp_kms && !!obj.sops.gcp_kms.length;
};

export const decryptSopsJsonViaGCPKMS = async (
    client: v1.KeyManagementServiceClient,
    sopsJson: ISopsEncryptedJSON,
): Promise<Record<string, any>> => {
    const key = await decryptKeyViaGCPKMS(client, sopsJson);

    return decryptSopsJson(key, sopsJson);
};

export const createKMSManagementClient = (
    projectId?: string,
    serviceAccountPath?: string,
): v1.KeyManagementServiceClient => {
    // in k8s, there might a service-account mounted
    if (serviceAccountPath) {
        try {
            statSync(serviceAccountPath);
            return new KeyManagementServiceClient({ projectId, keyFilename: serviceAccountPath });
        } catch (e) {
            if (e.code !== "ENOENT") {
                throw e;
            }
        }
    }

    // implicit authorization for non-k8s envs
    return new KeyManagementServiceClient({ projectId });
};
