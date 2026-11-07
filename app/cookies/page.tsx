import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import {
  LegalArticle,
  LegalCrossLinks,
  LegalOverview,
  LegalPageHeader,
  LegalSectionList,
} from "@/components/legal/legal-article";
import { Cookie } from "lucide-react";
import { cookiePolicy, legalMeta } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Cookie Policy | Kouchd",
  description:
    "Cookie and Tracking Policy for Kouchd, operated by Wrelik Brands LLC. Learn how cookies and local storage are used.",
  alternates: { canonical: "/cookies" },
};

export default function CookiePolicyPage() {
  return (
    <LegalPageLayout activeRoute="cookies">
      <LegalArticle>
        <LegalPageHeader
          eyebrow={<>Wrelik Brands LLC &middot; Legal Documentation</>}
          icon={<Cookie size={28} color="var(--kouchd-forest, #184f3a)" />}
          title="Cookie Policy"
          meta={
            <>
              Effective Date: {cookiePolicy.effectiveDate} &middot; Last updated: {cookiePolicy.lastUpdated} &middot; Brand:{" "}
              <strong>{legalMeta.provider}</strong> (operating <strong>Kouchd</strong>)
            </>
          }
        />
        <LegalOverview>{cookiePolicy.summary}</LegalOverview>
        <LegalSectionList sections={cookiePolicy.sections} />
        <LegalCrossLinks currentRoute="cookies" />
      </LegalArticle>
    </LegalPageLayout>
  );
}
