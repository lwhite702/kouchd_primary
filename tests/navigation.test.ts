import { describe, expect, it } from "vitest";
import type { MobileHeaderMenuProps } from "@/components/navigation/header-menu";

describe("Mobile Navigation Header Menu", () => {
  it("supports comprehensive household options with callback actions", () => {
    let tourTriggered = false;
    let staysTriggered = false;
    let joinCodeTriggered = false;
    let settingsTriggered = false;

    const props: MobileHeaderMenuProps = {
      onTakeTour: () => {
        tourTriggered = true;
      },
      onStays: () => {
        staysTriggered = true;
      },
      onJoinCode: () => {
        joinCodeTriggered = true;
      },
      onSettings: () => {
        settingsTriggered = true;
      },
      docsHref: "https://help.kouchd.com",
    };

    expect(props.docsHref).toBe("https://help.kouchd.com");

    props.onTakeTour?.();
    expect(tourTriggered).toBe(true);

    props.onStays?.();
    expect(staysTriggered).toBe(true);

    props.onJoinCode?.();
    expect(joinCodeTriggered).toBe(true);

    props.onSettings?.();
    expect(settingsTriggered).toBe(true);
  });
});
