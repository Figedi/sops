import { createDecipheriv, createHash } from "crypto";
import { omit, set } from "lodash";
import { uncoverPaths } from "./helpers";
import { ISopsEncryptedJSON, IKeyDecryptor } from "./types";
import { CheckSumMismatchError, SopsKeyNotSupportedError } from "./errors";

export class SopsClient {
    constructor(private keyDecryptor: IKeyDecryptor) {}

    public async decrypt<TResult = Record<string, any>>(sopsJson: ISopsEncryptedJSON): Promise<TResult> {
        if (!sopsJson.sops.gcp_kms) {
            throw new SopsKeyNotSupportedError("Only GCP KMS is supported for decrypting sops");
        }
        const key = await this.keyDecryptor.decryptKey(sopsJson);

        return this.decryptSopsJsonWithKey(key, sopsJson);
    }

    private decryptScalarValue = (value: string, key: Buffer, aad = ""): Buffer | string | number | boolean => {
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

    private decryptSopsJsonWithKey = async <TResult = Record<string, any>>(
        key: Buffer,
        sopsJson: ISopsEncryptedJSON,
    ): Promise<TResult> => {
        const paths = uncoverPaths(omit(sopsJson, "sops"));
        const digest = createHash("sha512");

        const decryptedJson = paths.reduce((acc, [nodePath, scalarValue]) => {
            const cleartext = this.decryptScalarValue(scalarValue, key, nodePath);
            digest.update(String(cleartext));
            return set(acc, nodePath, cleartext);
        }, {});

        if (sopsJson.sops.mac) {
            const hash = this.decryptScalarValue(sopsJson.sops.mac, key, sopsJson.sops.lastmodified) as string;
            if (hash.toUpperCase() !== digest.digest("hex").toUpperCase()) {
                throw new CheckSumMismatchError();
            }
        }

        return decryptedJson as TResult;
    };
}
