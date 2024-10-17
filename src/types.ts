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

export interface IKeyDecryptor {
    canDecrypt: (objOrPath: string | ISopsEncryptedJSON) => Promise<boolean>;

    decryptKey(objOrPath: string | ISopsEncryptedJSON): Promise<Buffer>;
}
