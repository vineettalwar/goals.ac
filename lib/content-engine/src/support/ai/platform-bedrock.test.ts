import assert from "node:assert/strict";
import { pickBedrockCredentialSource } from "./platform-bedrock";

assert.equal(
  pickBedrockCredentialSource({
    hasOrgByok: true,
    isGranted: true,
    hasPlatformCredentials: true,
  }),
  "org-byok",
);

assert.equal(
  pickBedrockCredentialSource({
    hasOrgByok: false,
    isGranted: true,
    hasPlatformCredentials: true,
  }),
  "platform-grant",
);

assert.equal(
  pickBedrockCredentialSource({
    hasOrgByok: false,
    isGranted: false,
    hasPlatformCredentials: true,
  }),
  "none",
);

assert.equal(
  pickBedrockCredentialSource({
    hasOrgByok: false,
    isGranted: true,
    hasPlatformCredentials: false,
  }),
  "none",
);

console.log("platform-bedrock credential source: ok");
