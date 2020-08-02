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
