import type { KeyManagementServiceClient } from "@google-cloud/kms";
import { scryptSync } from "crypto";

export const createStubbedKeyManagementClient = (key: Buffer): KeyManagementServiceClient => {
    return {
        decrypt: async () => [
            {
                plaintext: key,
            },
        ],
    } as unknown as KeyManagementServiceClient;
};

export const setupStubbedKms = (password: string): any => {
    const key = scryptSync(password, "random-salt", 32);
    const iv = Buffer.from("init-vector");
    return {
        key,
        iv,
        kms: createStubbedKeyManagementClient(key),
    };
};
