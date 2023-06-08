import { expect } from "chai";
import type { KeyManagementServiceClient } from "@google-cloud/kms";

import { setupStubbedKms } from "./shared.specFiles/kmsStubs";
import { encryptJson } from "../shared.specFiles/sopsUtils";
import { getEncryptedSecret, getUnencryptedSecret, getEncryptedSecretWrongMac } from "../shared.specFiles/fixtures";
import { uncoverPaths } from "../helpers";
import { KmsKeyDecryptor } from "./kmsKeyDecryptor";
import { CheckSumMismatchError } from "../errors";
import { IKeyDecryptor } from "../types";
import { SopsClient } from "../SopsClient";

describe("SopsClient with KmsKeyDecryptor", () => {
    describe("specs tooling", () => {
        it("should decrypt a record", async () => {
            const data = {
                theThing: "42",
            };
            const { key, iv, kms } = setupStubbedKms("random-password");
            const sopsClient = new SopsClient(KmsKeyDecryptor.createWithKmsClient(kms));
            const encryptedData = encryptJson(key, iv, data);
            const decryptedData = await sopsClient.decrypt(encryptedData);

            expect(decryptedData).to.deep.equal(data);
        });
    });

    describe("uncoverPaths", () => {
        it("uncovers deeply nested paths w/ their scalar-values", () => {
            const TEST_TREE = {
                some: {
                    nested: [
                        {
                            tree: {
                                deepNestedValue: 42,
                            },
                        },
                        42,
                    ],
                },
                parent: 42,
                simple: {
                    simpleValue: 1337,
                },
            };
            const paths = uncoverPaths(TEST_TREE);
            expect(paths).to.deep.equal([
                ["some.nested.0.tree.deepNestedValue", 42],
                ["some.nested.1", 42],
                ["parent", 42],
                ["simple.simpleValue", 1337],
            ]);
        });
    });

    describe("decryptSopsJson", () => {
        let key: Buffer;
        let iv: Buffer;
        let kms: KeyManagementServiceClient;
        let keyDecryptor: IKeyDecryptor;
        let sopsClient: SopsClient;

        before(() => {
            const deps = setupStubbedKms("random-password");
            key = deps.key;
            iv = deps.iv;
            kms = deps.kms;
            keyDecryptor = KmsKeyDecryptor.createWithKmsClient(kms);
            sopsClient = new SopsClient(keyDecryptor);
        });

        it("is able to decrypt encrypted json files", async () => {
            const encrypted = await getEncryptedSecret(key, iv);

            const decrypted = await sopsClient.decrypt(encrypted);
            expect(decrypted).to.deep.equal(getUnencryptedSecret());
        }).timeout(15000);

        it("detects malformed json-files by checksum through MAC", async () => {
            const encrypted = await getEncryptedSecretWrongMac(key, iv);
            try {
                await sopsClient.decrypt(encrypted);
                throw new Error("fn should throw");
            } catch (e) {
                expect(e).to.be.instanceOf(CheckSumMismatchError);
            }
        }).timeout(15000);
    });
});
