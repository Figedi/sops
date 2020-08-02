import { encryptJson } from "../sopsUtils";
import { ISopsEncryptedJSON } from "../../types";
import baseJson = require("./secrets.json");

export const getUnencryptedSecret = (): Record<string, any> => baseJson;
export const getEncryptedSecret = (key: Buffer, iv: Buffer): ISopsEncryptedJSON => encryptJson(key, iv, baseJson);

export const getEncryptedSecretWrongMac = (key: Buffer, iv: Buffer): ISopsEncryptedJSON => {
    const encrypted = getEncryptedSecret(key, iv);

    return {
        ...encrypted,
        sops: {
            ...encrypted.sops,
            // please note that getEncryptedSecret() always outputs a mac
            mac: encrypted.sops.mac!.replace(/data:(.)/, "data:"), // removes one char from data-block
        },
    };
};
