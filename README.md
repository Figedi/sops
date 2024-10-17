# SOPS

Minimal Sops re-implementation for decrypting sops files directly w/ node.js w/o any sops-dependencies

## Why?
I needed a quick way to decrypt sops-encoded files loaded w/ node.js without going through child-process hacks

## Features

This library in no way supports all sops-versions and is only tested on 3.9.x. It does not implement encoding, although this could probably easily added. An example for encoding, but by all means not complete, is found in `sops.spec-utils.ts`

*Use this at your own risk*
I've used this in several production projects in a k8s-context in GCP (through GCP KMS).

## Usage

Example to decrypt an encrypted file with a GCP-KMS keyring:
```typescript
import { readFile } from "node:fs/promises";
import { GoogleKmsKeyDecryptor } from "@figedi/sops/kms";
import { SopsClient } from "@figedi/sops";
import { KeyManagementServiceClient } from '@google-cloud/kms';

const run = async () => {
    const decryptor = new GoogleKmsKeyDecryptor(new KeyManagementServiceClient({ projectId: '<your gcp project id>', keyFilename: '<path to a service-account.json>' }));
    const sopsClient = new SopsClient(decryptor);
    const testFile = await readFile('<path to a sops encrypted file>', { encoding: 'utf-8'})

    console.log(await sopsClient.decrypt(testFile))

}

run()

```
