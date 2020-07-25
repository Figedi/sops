import { createDecipheriv, createHash } from "crypto";
import { set, omit, chunk, isPlainObject, isArray } from "lodash";
import { statSync } from "fs";
import { v1, KeyManagementServiceClient } from "@google-cloud/kms";

export interface ISopsEncryptedJSON extends Record<string, any> {
    sops: {
        gcp_kms: {
            resource_id: string;
            created_at: string;
            enc: string;
        }[];
        mac?: string;
        lastmodified: string;
        version: string;
    };
}

export const canDecryptViaKMS = (obj: any): obj is ISopsEncryptedJSON => {
    return !!obj.sops && obj.sops.gcp_kms && !!obj.sops.gcp_kms.length;
};

export class CheckSumMismatchError extends Error {}

export const decryptScalarValue = (value: string, key: Buffer, aad = ""): Buffer | string | number | boolean => {
    const valre = value.match(/^ENC\[AES256_GCM,data:(.+),iv:(.+),tag:(.+),type:(.+)\]/);
    if (!valre) {
        return value;
    }
    const encValue = valre[1];
    const iv = Buffer.from(valre[2], "base64");
    const tag = Buffer.from(valre[3], "base64");
    const valtype = valre[4];

    const decryptor = createDecipheriv("aes-256-gcm", key, iv);

    decryptor.setAuthTag(tag);
    decryptor.setAAD(Buffer.from(aad));

    const cleartext = decryptor.update(encValue, "base64", "utf8");

    switch (valtype) {
        case "bytes":
            return cleartext;
        case "str":
            return cleartext;
        case "int":
            return parseInt(cleartext, 10);
        case "float":
            return parseFloat(cleartext);
        case "bool":
            return cleartext === "true";
        default:
            throw new Error(`Unknown type ${valtype}`);
    }
};

export const decryptKeyViaGCPKMS = async (
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

export const uncoverPaths = (tree: any): any[][] => {
    const doUncover = (t: any, path: (string | number)[] = []): any[][] => {
        if (isArray(t)) {
            return t.reduce((acc, v, k) => [...acc, ...doUncover(v, [...path, k])], []);
        }
        if (isPlainObject(t)) {
            return Object.keys(t).reduce((acc, k) => [...acc, ...doUncover(t[k], [...path, k])], [] as any);
        }

        return [path.join("."), t];
    };

    return chunk(doUncover(tree), 2); // since the output is flattened, chunk k-v entrypairs
};

export const decryptSopsJson = async (
    client: v1.KeyManagementServiceClient,
    sopsJson: ISopsEncryptedJSON,
): Promise<Record<string, any>> => {
    const key = await decryptKeyViaGCPKMS(client, sopsJson);
    const paths = uncoverPaths(omit(sopsJson, "sops"));
    const digest = createHash("sha512");

    const decryptedJson = paths.reduce((acc, [nodePath, scalarValue]) => {
        const cleartext = decryptScalarValue(scalarValue, key, nodePath);
        digest.update(String(cleartext));
        return set(acc, nodePath, cleartext);
    }, {});

    if (sopsJson.sops.mac) {
        const hash = decryptScalarValue(sopsJson.sops.mac, key, sopsJson.sops.lastmodified) as string;
        if (hash.toUpperCase() !== digest.digest("hex").toUpperCase()) {
            throw new CheckSumMismatchError();
        }
    }

    return decryptedJson;
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
