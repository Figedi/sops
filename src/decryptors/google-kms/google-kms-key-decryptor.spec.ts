import type { KeyManagementServiceClient } from '@google-cloud/kms';
import { beforeAll, describe, expect, it } from 'vitest';
import { CheckSumMismatchError } from '../../errors.js';
import { uncoverPaths } from '../../helpers.js';
import { getEncryptedSecret, getEncryptedSecretWrongMac, getUnencryptedSecret } from '../../shared.specFiles/fixtures/secret.fixture.js';
import { encryptJson } from '../../shared.specFiles/sops.spec-utils.js';
import { SopsClient } from '../../sops-client.js';
import type { IKeyDecryptor } from '../../types.js';
import { GoogleKmsKeyDecryptor } from './google-kms-key-decryptor.js';
import { setupStubbedKms } from './shared.specFiles/kms.stub.js';

describe('SopsClient with KmsKeyDecryptor', () => {
    describe('specs tooling', () => {
        it('should decrypt a record', async () => {
            const data = {
                theThing: '42',
            };
            const { key, iv, kms } = setupStubbedKms('random-password');
            const sopsClient = new SopsClient(new GoogleKmsKeyDecryptor(kms));
            const encryptedData = encryptJson(key, iv, data);
            const decryptedData = await sopsClient.decrypt(encryptedData);

            expect(decryptedData).to.deep.equal(data);
        });
    });

    describe('uncoverPaths', () => {
        it('uncovers deeply nested paths w/ their scalar-values', () => {
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
                ['some.nested.0.tree.deepNestedValue', 42],
                ['some.nested.1', 42],
                ['parent', 42],
                ['simple.simpleValue', 1337],
            ]);
        });
    });

    describe('decryptSopsJson', () => {
        let key: Buffer;
        let iv: Buffer;
        let kms: KeyManagementServiceClient;
        let keyDecryptor: IKeyDecryptor;
        let sopsClient: SopsClient;

        beforeAll(() => {
            const deps = setupStubbedKms('random-password');
            key = deps.key;
            iv = deps.iv;
            kms = deps.kms;
            keyDecryptor = new GoogleKmsKeyDecryptor(kms);
            sopsClient = new SopsClient(keyDecryptor);
        });

        it(
            'is able to decrypt encrypted json files',
            async () => {
                const encrypted = await getEncryptedSecret(key, iv);

                const decrypted = await sopsClient.decrypt(encrypted);
                expect(decrypted).to.deep.equal(getUnencryptedSecret());
            },
            { timeout: 15_000 },
        );

        it(
            'detects malformed json-files by checksum through MAC',
            async () => {
                const encrypted = await getEncryptedSecretWrongMac(key, iv);
                try {
                    await sopsClient.decrypt(encrypted);
                    throw new Error('fn should throw');
                } catch (e) {
                    expect(e).to.be.instanceOf(CheckSumMismatchError);
                }
            },
            { timeout: 15_000 },
        );
    });
});
