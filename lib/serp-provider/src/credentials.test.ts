import { afterEach, describe, expect, it } from "vitest";
import { getDataForSeoCredentials, setDataForSeoCredentialsOverlay } from "./credentials";

const originalLogin = process.env["DATAFORSEO_LOGIN"];
const originalPassword = process.env["DATAFORSEO_PASSWORD"];

afterEach(() => {
  setDataForSeoCredentialsOverlay(null);
  if (originalLogin === undefined) delete process.env["DATAFORSEO_LOGIN"];
  else process.env["DATAFORSEO_LOGIN"] = originalLogin;
  if (originalPassword === undefined) delete process.env["DATAFORSEO_PASSWORD"];
  else process.env["DATAFORSEO_PASSWORD"] = originalPassword;
});

describe("getDataForSeoCredentials", () => {
  it("uses overlay when env is empty", () => {
    delete process.env["DATAFORSEO_LOGIN"];
    delete process.env["DATAFORSEO_PASSWORD"];
    setDataForSeoCredentialsOverlay({ login: "db-login", password: "db-password" });
    expect(getDataForSeoCredentials()).toEqual({ login: "db-login", password: "db-password" });
  });

  it("prefers env over overlay", () => {
    process.env["DATAFORSEO_LOGIN"] = "env-login";
    process.env["DATAFORSEO_PASSWORD"] = "env-password";
    setDataForSeoCredentialsOverlay({ login: "db-login", password: "db-password" });
    expect(getDataForSeoCredentials()).toEqual({ login: "env-login", password: "env-password" });
  });
});
