import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import {
  LegalArticle,
  LegalCrossLinks,
  LegalOverview,
  LegalPageHeader,
  LegalSectionList,
} from "@/components/legal/legal-article";
import { ShieldAlert } from "lucide-react";
import { acceptableUsePolicy, legalMeta } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Acceptable Use Policy | Kouchd",
  description:
    "Acceptable Use Policy and Community Guidelines for Kouchd, operated by Wrelik Brands LLC.",
  alternates: { canonical: "/acceptable-use" },
};

export default function AcceptableUsePage() {
  return (
    <LegalPageLayout activeRoute="acceptable-use">
      <LegalArticle>
        <LegalPageHeader
          eyebrow={<>Wrelik Brands LLC &middot; Legal Documentation</>}
          icon={<ShieldAlert size={28} color="var(--kouchd-forest, #184f3a)" />}
          title="Acceptable Use Policy"
          meta={
            <>
              Effective Date: {acceptableUsePolicy.effectiveDate} &middot; Last updated: {acceptableUsePolicy.lastUpdated} &middot; Brand:{" "}
              <strong>{legalMeta.provider}</strong> (operating <strong>Kouchd</strong>)
            </>
          }
        />
        <LegalOverview>{acceptableUsePolicy.summary}</LegalOverview>
        <LegalSectionList sections={acceptableUsePolicy.sections} />
        <LegalCrossLinks currentRoute="acceptable-use" />
      </LegalArticle>
    </LegalPageLayout>
  );
}
