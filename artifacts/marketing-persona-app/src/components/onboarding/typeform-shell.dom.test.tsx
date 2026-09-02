// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { OnboardingSessionDTO } from "./onboarding-api";

/**
 * A real DOM render test, not the pure-logic extraction in onboarding-logic.test.ts.
 * That extraction proved resolveKeyAction("Enter") produces the right ACTION; it
 * could not catch the actual defect found in review, which was that the shell's
 * keydown listener held a stale closure over handlePrimarySubmit and so Enter did
 * nothing at all on a required text step, regardless of what resolveKeyAction said.
 * Only a render test that types into a real input and presses a real key exercises
 * the closure. This is the first component-render test in the monorepo — see
 * vitest.config.ts's environmentMatchGlobs for the jsdom opt-in via `.dom.test.tsx`.
 */

const getSessionMock = vi.fn();
const patchSessionMock = vi.fn();

vi.mock("./onboarding-api", async () => {
  const actual = await vi.importActual<typeof import("./onboarding-api")>("./onboarding-api");
  return {
    ...actual,
    getSession: () => getSessionMock(),
    patchSession: (input: unknown) => patchSessionMock(input),
  };
});

function baseSession(overrides: Partial<OnboardingSessionDTO> = {}): OnboardingSessionDTO {
  return {
    id: 1,
    organizationId: null,
    companyId: null,
    websiteProjectId: null,
    vertical: null,
    currentStep: "firm_name",
    answers: {},
    stepStatus: {},
    completedAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  getSessionMock.mockReset();
  patchSessionMock.mockReset();
  patchSessionMock.mockResolvedValue({
    session: baseSession({ answers: { orgName: "Acme Law" }, currentStep: "vertical" }),
    nextStep: "vertical",
  });
});

describe("TypeformShell — Enter actually submits (regression for the stale-closure bug)", () => {
  it("submits the value just typed when the user presses Enter on a required text step", async () => {
    getSessionMock.mockResolvedValue({ session: baseSession() });
    const { TypeformShell } = await import("./typeform-shell");
    const user = userEvent.setup();

    render(<TypeformShell />);

    const input = await screen.findByRole("textbox");
    await user.type(input, "Acme Law");
    await user.keyboard("{Enter}");

    // The bug: the keydown handler was frozen at mount, when draftText was still
    // empty, so pressing Enter read an empty draft and the required-field guard
    // silently swallowed the keystroke — patchSession was never called with what
    // the user had actually typed.
    await waitFor(() => {
      expect(patchSessionMock).toHaveBeenCalledWith(
        expect.objectContaining({ step: "firm_name", answer: "Acme Law" }),
      );
    });
  });

  it("does not submit an empty required field on Enter", async () => {
    getSessionMock.mockResolvedValue({ session: baseSession() });
    const { TypeformShell } = await import("./typeform-shell");
    const user = userEvent.setup();

    render(<TypeformShell />);

    await screen.findByRole("textbox");
    await user.keyboard("{Enter}");

    // Give any (incorrect) async submit a chance to fire before asserting it didn't.
    await new Promise((r) => setTimeout(r, 50));
    expect(patchSessionMock).not.toHaveBeenCalled();
  });
});
