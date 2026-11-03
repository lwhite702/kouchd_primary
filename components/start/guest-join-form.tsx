"use client";

import { FormEvent, useId, useState } from "react";

import { guestJoinSignUpHref } from "@/lib/start/join-code";

/**
 * Collects a guest's invite code on the signed-out Start page. Joining a stay
 * needs an account, so the code travels through sign-up and pre-fills the
 * existing "Join with code" card, which calls `api.referral.joinWithCode`.
 */
export function GuestJoinForm() {
  const inputId = useId();
  const errorId = useId();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const href = guestJoinSignUpHref(code);
    if (!href) {
      setError("Check the code and try again. Host codes start with KCH-.");
      return;
    }
    window.location.assign(href);
  }

  return (
    <form className="kd-start-join" action="/sign-up" method="get" onSubmit={handleSubmit} noValidate>
      <label className="kd-start-join-label" htmlFor={inputId}>
        Invite code
      </label>
      <div className="kd-start-join-row">
        <input
          id={inputId}
          className="kd-start-join-input"
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="KCH-AB12CD"
          maxLength={20}
          value={code}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => {
            setCode(event.target.value.toUpperCase());
            if (error) setError("");
          }}
        />
        <button className="kd-start-join-button" type="submit">
          Join
        </button>
      </div>
      {error && (
        <p id={errorId} className="kd-start-join-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
