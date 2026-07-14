"use client";

import { useEffect, useState } from "react";
import { loginHref, signupHref } from "@/lib/marketing/site/app-url";

/** Client-only auth links that follow marketing host + deploy stage at runtime. */
export function useAppAuthHrefs() {
  const [login, setLogin] = useState(loginHref);
  const [signup, setSignup] = useState(signupHref);

  useEffect(() => {
    setLogin(loginHref());
    setSignup(signupHref());
  }, []);

  return { loginHref: login, signupHref: signup };
}
