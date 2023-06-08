# SOPS

Minimal Sops re-implementation for decrypting sops files directly w/ node.js

## Why?
I needed a quick way to decrypt sops-encoded files loaded w/ node.js without going through child-process hacks

## Features

This library in no way supports all sops-versions and is only tested on 3.4.x. It does not implement encoding, although this could probably easily added. An example, not complete version is found in sopsUtils in the specFiles.

*Use this at your own risk*
I've used this in several production projects in a k8s-context in GCP (through GCP KMS).

## Usage

Example to decrypt an encrypted file with a GCP-KMS keyring:
```typescript
import { decryptSopsJsonViaGCPKMS, createKMSManagementClient } from "@figedi/sops/kms"
const someEncryptedJson = require("secrets.enc.json");
const client = createKMSManagementClient("your-project-id", "optional-path-to-mounted-svc-account-json");

const decrypted = await decryptSopsJsonViaGCPKMS(client, someEncryptedJson); 
```
Note: When providing an encrypted-json with a MAC, the mac will be used and checked. If the decrypted-json
does not match the MAC, a `ChecksumMismatchError` is thrown


Example to test whether file is encrypted w/ gcp kms
```typescript
import { canDecryptViaKMS } from "@figedi/sops/kms"
const someEncryptedJson = require("secrets.enc.json");
const isDecryptable = canDecryptViaKMS(someEncryptedJson)
```
