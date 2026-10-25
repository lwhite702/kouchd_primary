export type LegalListItem = {
  label?: string;
  text: string;
};

export type LegalSection = {
  title: string;
  paragraphs?: string[];
  bullets?: LegalListItem[];
  numbered?: LegalListItem[];
};

export type LegalDocumentData = {
  eyebrow: string;
  title: string;
  summary: string;
  sections: LegalSection[];
  addendum: LegalSection[];
};

export const legalMeta = {
  provider: "Wrelik Brands LLC",
  effectiveDate: "September 17, 2026",
  lastUpdated: "October 20, 2026",
  email: "legal@wrelik.com",
  privacyEmail: "privacy@wrelik.com",
  supportEmail: "support@kouchd.com",
  wrelikSupportEmail: "support@wrelik.com",
  address: "1700 Northside Drive\nAtlanta, GA 30318, United States",
  siteUrl: "https://kouchd.com",
  privacyUrl: "https://kouchd.com/privacy",
  termsUrl: "https://kouchd.com/terms",
  cookiesUrl: "https://kouchd.com/cookies",
  acceptableUseUrl: "https://kouchd.com/acceptable-use",
  smsOptInUrl: "https://kouchd.com/sms-opt-in",
  helpUrl: "https://kouchd.com/help",
};

export const privacyPolicy: LegalDocumentData = {
  eyebrow: "Wrelik legal",
  title: "Privacy Policy",
  summary:
    "This policy explains how Wrelik Brands LLC handles Personal Information across its Services. The Kouchd addendum below describes practices specific to the collaborative stay agreement and household ledger platform.",
  sections: [
    {
      title: "1. Scope and roles",
      paragraphs: [
        'This Privacy Policy explains how Wrelik Brands LLC ("Wrelik," "we," "us," or "our") collects, uses, discloses, and protects Personal Information when you visit our websites or use our applications and related services, including Kouchd, sporkd, Klutr, and DRX / Deelrx CRM (each an "App" and together, the "Services"). "Personal Information" means information that identifies, relates to, describes, or can reasonably be linked with an individual.',
        "The app-specific addendum presented with this Privacy Policy describes practices unique to the App you use. If an app-specific addendum conflicts with the general portions of this Privacy Policy, the addendum controls for that App.",
        "For consumer accounts, shared living arrangements, and our websites, Wrelik generally determines why and how Personal Information is processed as a data controller. Where an organization or group administrator coordinates managed living spaces, that administrator controls ordinary workspace membership, and Wrelik processes records to deliver the platform in accordance with account configurations and applicable law.",
      ],
    },
    {
      title: "2. Information we collect (What Data We Collect)",
      paragraphs: ["Depending on the Service and the features you use, we may collect:"],
      bullets: [
        {
          label: "Account and identity information",
          text: "name, email address, profile avatar, authentication identifiers, household or stay membership, role (host, co-host, guest), account settings, and login or security events. If you join the Kouchd website newsletter, we also collect your email address and record your newsletter consent and subscription preference.",
        },
        {
          label: "Phone number and SMS communication data",
          text: "mobile telephone number, carrier delivery timestamps, inbound/outbound SMS interaction records, verification tokens, and text messaging opt-in consent records when you provide a mobile number and consent to receive SMS notifications.",
        },
        {
          label: "Household stay and agreement details",
          text: "stay dates, room or living space nicknames, house rules, quiet hours, household check-in logistics, WiFi credentials, trash schedules, stay terms, and mutual host-guest confirmation events.",
        },
        {
          label: "Household ledger and contribution records",
          text: "bookkeeping entries, contribution amounts, dates, categories (e.g., groceries, utilities, supplies, repairs, off-platform cash transfers), notes, receipt images, and chore point redemptions. Note: Kouchd is an agreement and bookkeeping ledger; we do not store full payment card numbers, process payments, custody funds, or connect to bank accounts.",
        },
        {
          label: "Device, network, and usage information",
          text: "IP address, browser or device type, operating system, app build version, language, pages or features visited, interaction timestamps, referring pages, session activity, and related technical metadata.",
        },
        {
          label: "Diagnostics and security telemetry",
          text: "crash reports, error logs, performance traces, audit events, hashed invite tokens, suspected fraud or abuse signals, and records necessary to keep accounts, household data, and Services secure.",
        },
        {
          label: "Communications and support requests",
          text: "support tickets, inquiries, feedback, survey responses, beta-testing feedback, and other messages you submit to our team.",
        },
      ],
      numbered: [
        {
          text: "We collect information directly from you when you register, create stays, log contributions, or communicate with us; automatically from your browser or device as you navigate the Services; and from authentication or integration partners you authorize.",
        },
      ],
    },
    {
      title: "3. How we use information (How We Use Your Data)",
      paragraphs: ["Wrelik Brands LLC uses Personal Information for the purposes below. Optional marketing emails are sent only when you explicitly sign up; you can unsubscribe at any time."],
      bullets: [
        { text: "provide, operate, maintain, synchronize, and support the Services across web and mobile platforms;" },
        { text: "authenticate users, administer accounts, safeguard session tokens, and enforce role-based stay access boundaries;" },
        { text: "coordinate shared household agreements, maintain bilateral ledger partitioning, and record mutual confirmations;" },
        { text: "deliver transactional communications, stay logistics, chore alerts, and requested SMS text notifications;" },
        { text: "send occasional Kouchd product and launch updates to people who expressly subscribe to the website newsletter;" },
        { text: "personalize household settings and synchronize stay records securely across authorized devices;" },
        { text: "monitor platform reliability, diagnose system defects, measure feature performance, and prevent outages;" },
        { text: "protect hosts, guests, Wrelik, and the public from fraud, abuse, security breaches, and unauthorized access;" },
        { text: "comply with applicable laws, respond to legal process, enforce our agreements, and defend legal claims; and" },
        { text: "notify you regarding material changes to our Services, security notices, or legal policies." },
      ],
      numbered: [
        {
          text: "Where applicable law requires a legal basis, we process Personal Information based on performance of our contract with you, our legitimate interests in platform security and service quality, compliance with legal obligations, and your express consent (such as for optional SMS communications). You may withdraw consent at any time.",
        },
      ],
    },
    {
      title: "4. Strict SMS privacy commitment & carrier compliance (A2P 10DLC)",
      paragraphs: [
        "Wrelik Brands LLC maintains strict privacy boundaries for mobile messaging:",
        "We do not sell or share your SMS opt-in data or personal information with third parties for marketing purposes.",
        "Text messaging originator opt-in data and consent are strictly excluded from any sharing with third parties, affiliates, or lead generators for marketing or promotional purposes. Any mobile phone numbers collected through our SMS consent forms, onboarding flows, or support workflows are used solely to deliver the relevant operational communications, account alerts, check-in logistics, and household coordination messages you specifically requested.",
      ],
      bullets: [
        {
          label: "Express consent",
          text: "We require verifiable express opt-in consent before initiating SMS communications. Consent records include timestamp, user identity, phone number, and the specific opt-in medium.",
        },
        {
          label: "Opt-out (STOP)",
          text: "You can revoke SMS consent at any time by replying STOP, UNSUBSCRIBE, or QUIT to any text message from Kouchd. We will send a single confirmation text and immediately cease SMS delivery.",
        },
        {
          label: "Support (HELP)",
          text: "Reply HELP to any text message for instant support guidance, or email support@kouchd.com or support@wrelik.com.",
        },
        {
          label: "Rates and carriers",
          text: "Message and data rates may apply depending on your mobile carrier plan. Message frequency varies based on household stay activity. Mobile wireless carriers are not liable for delayed or undelivered messages.",
        },
      ],
    },
    {
      title: "5. How we disclose information",
      paragraphs: ["We may disclose Personal Information only in the following limited circumstances:"],
      bullets: [
        {
          label: "To infrastructure and service providers",
          text: "that provide cloud hosting, databases, authentication, error monitoring, and communications. Depending on configured features, these include Vercel (web hosting), Convex (reactive real-time database), Clerk (identity and authentication), Twilio and Knock (transactional SMS and notification routing), Loops (email updates for people who subscribe to the Kouchd website newsletter), Sentry (error diagnostics), and PostHog (privacy-conscious product telemetry).",
        },
        {
          label: "Between stay participants per role permissions",
          text: "household rules, shared stay logistics, chores, and announcements are visible to stay members. Bilateral financial ledgers, individual contribution records, rates, and balances are partitioned so that each guest's ledger is visible only to that specific guest and the host.",
        },
        {
          label: "For legal, compliance, and safety obligations",
          text: "when reasonably necessary to comply with valid legal process, court orders, or government requests; protect safety, life, or property; investigate security incidents or fraud; or enforce our Terms.",
        },
        {
          label: "In a corporate restructuring or asset transfer",
          text: "such as a financing, merger, acquisition, reorganization, or transfer of operational assets, under strict confidentiality and with advance notice where required by law.",
        },
        {
          label: "With professional legal and financial advisers",
          text: "bound by strict confidentiality and professional ethical duties who require information to provide audit, legal, accounting, or security counsel.",
        },
      ],
      numbered: [
        {
          text: "We do not sell Personal Information for monetary consideration. We do not share Personal Information for cross-context behavioral advertising. We have not sold or shared Personal Information for cross-context behavioral advertising in the preceding 12 months.",
        },
        {
          text: "Our service providers are bound by written data protection agreements restricting them from retaining, using, or disclosing Personal Information for any purpose other than providing the contracted services.",
        },
      ],
    },
    {
      title: "6. Cookies, local storage, analytics, and preferences",
      paragraphs: [
        "Our websites and web applications use essential cookies, secure local storage, and similar technologies to maintain authenticated sessions, secure CSRF tokens, remember user interface preferences, and monitor system performance.",
        "Required technologies are strictly necessary to deliver the Services. Optional performance or product telemetry is collected in an aggregated or de-identified manner without advertising beacons or cross-site behavioral tracking. You can manage or disable cookies via your browser settings, though disabling essential session cookies may prevent you from logging into Kouchd.",
        "We honor legally recognized opt-out preference signals (such as Global Privacy Control) where required by applicable law. Because Wrelik does not sell personal data or engage in targeted behavioral advertising, no sale-related opt-out is applicable.",
      ],
    },
    {
      title: "7. Data retention, cleanup, and deletion",
      paragraphs: [
        "We retain Personal Information only for as long as necessary to fulfill the purposes described in this Privacy Policy, including maintaining active household stays, preserving agreed mutual bookkeeping records, complying with legal or tax obligations, resolving disputes, and enforcing agreements.",
        "When you request account deletion or when a stay concludes and is purged, we delete or de-identify personal records from active databases within 30 days. Limited residual records may temporarily persist in encrypted backups, security logs, or legally mandated records until regular backup cycles expire or legal holds are resolved.",
        "Account deletion requests can be initiated directly within account settings or by emailing legal@wrelik.com or privacy@wrelik.com with the subject 'Account Deletion Request'.",
      ],
    },
    {
      title: "8. Security and cryptographic protections",
      paragraphs: [
        "Wrelik employs comprehensive administrative, physical, and technical safeguards designed to protect Personal Information:",
      ],
      bullets: [
        {
          label: "Encryption in transit",
          text: "All web traffic and API endpoints enforce TLS 1.3 encryption with strong modern cipher suites. Insecure HTTP connections automatically redirect to HTTPS.",
        },
        {
          label: "Encryption at rest",
          text: "Cloud storage volumes, persistent database clusters, and system backups are encrypted at rest using AES-256 encryption.",
        },
        {
          label: "Cryptographic invite tokens",
          text: "Stay invitation tokens are hashed using SHA-256 before storage in database indexes. Plaintext invite tokens are never stored at rest and expire after set validity windows.",
        },
        {
          label: "Multi-tenant and stay isolation",
          text: "Database queries and mutation handlers enforce strict authorization scoping based on verified session identity and assigned household role.",
        },
      ],
      numbered: [
        {
          text: "While we employ robust industry-standard safeguards, no internet transmission or electronic storage is completely infallible. You are responsible for safeguarding your credentials, choosing strong passwords, and notifying us promptly of any suspected unauthorized access.",
        },
      ],
    },
    {
      title: "9. Your privacy rights and choices",
      paragraphs: ["Depending on your jurisdiction, you may have statutory rights regarding your Personal Information, including the right to:"],
      bullets: [
        { text: "Know and access the categories and specific pieces of Personal Information we hold about you;" },
        { text: "Correct inaccurate or incomplete Personal Information;" },
        { text: "Request deletion of your Personal Information, subject to statutory exceptions;" },
        { text: "Obtain a portable copy of your data in a structured, machine-readable format;" },
        { text: "Opt out of marketing communications or withdraw consent for optional SMS alerts at any time;" },
        { text: "Designate an authorized agent to exercise rights on your behalf; and" },
        { text: "Non-discrimination: We will never penalize or deny services to you for exercising statutory privacy rights." },
      ],
      numbered: [
        {
          text: "To exercise any privacy right, email legal@wrelik.com or privacy@wrelik.com with the subject 'Privacy Request — Kouchd'. We will verify your identity before processing the request in accordance with applicable statutory timelines.",
        },
      ],
    },
    {
      title: "10. U.S. state privacy disclosures",
      paragraphs: [
        "Residents of California (CCPA/CPRA), Colorado, Connecticut, Virginia, and other states with comprehensive consumer privacy laws are entitled to specific disclosures. During the preceding 12 months, we collected the categories of Personal Information described in Section 2: identifiers; customer record information; commercial transaction records; internet or electronic network activity; approximate geolocation (derived from IP address); and communications.",
        "We do not sell personal information, do not share personal information for cross-context behavioral advertising, do not use sensitive personal information for inferring consumer characteristics, and do not knowingly collect or sell personal information of minors under 16.",
      ],
    },
    {
      title: "11. International data transfers",
      paragraphs: [
        "Wrelik Brands LLC is headquartered in the United States, and our cloud infrastructure providers operate primarily in the United States. If you access Kouchd from outside the United States, your information will be transferred to, stored, and processed in the United States, where privacy regulations may differ from your home country. We implement appropriate contractual and organizational safeguards to ensure lawful and protected data transfers.",
      ],
    },
    {
      title: "12. Children's privacy",
      paragraphs: [
        "Kouchd is strictly intended for individuals who are at least 18 years of age. We do not knowingly solicit, collect, or process Personal Information from children under the age of 13 (or under 16 where required by law). If you believe a child has provided us with personal information, please contact legal@wrelik.com immediately so we can promptly investigate and delete the records.",
      ],
    },
    {
      title: "13. Third-party links and external services",
      paragraphs: [
        "Kouchd may display payment handles, external payment links, or reference third-party tools (such as PayPal, Cash App, Zelle, or Apple Pay) provided by hosts to facilitate independent peer-to-peer settling of household expenses. Wrelik Brands LLC does not operate, control, or endorse third-party payment platforms, and their handling of your data is governed solely by their respective privacy policies.",
      ],
    },
    {
      title: "14. Changes to this Privacy Policy",
      paragraphs: [
        "We may update this Privacy Policy periodically to reflect enhancements in Kouchd features, technological evolution, or changes in applicable law. When we update this Policy, we will revise the 'Effective Date' and 'Last updated' dates at the top. For material updates affecting your privacy rights, we will provide conspicuous notice through the application interface, email, or SMS prior to the effective date.",
      ],
    },
    {
      title: "15. Contact and governance",
      paragraphs: [
        "For questions, concerns, or requests regarding this Privacy Policy or our data protection practices, please contact our legal and privacy team:",
        `Wrelik Brands LLC\nAttn: Privacy & Data Protection\n${legalMeta.address}\nEmail: ${legalMeta.email} / ${legalMeta.privacyEmail}\nSupport: ${legalMeta.supportEmail}`,
      ],
    },
  ],
  addendum: [
    {
      title: "Privacy Addendum — Kouchd",
      paragraphs: [
        "This Addendum provides supplemental privacy disclosures specific to Kouchd, operated by Wrelik Brands LLC.",
      ],
      numbered: [
        {
          label: "Bilateral financial ledger privacy",
          text: "In Kouchd, each guest's financial obligations, contribution records, payment notes, and ledger balance are strictly partitioned. They are visible only to that specific guest and the host. Other household guests or roommates in the same stay cannot view another guest's financial terms or contribution history.",
        },
        {
          label: "No financial custody or payment processing",
          text: "Kouchd does not connect to bank accounts, collect credit card numbers, hold funds in escrow, or process financial transfers. Contribution entries represent mutual bookkeeping records logged and confirmed by stay participants. External payment methods (such as Zelle, Venmo, Cash App, or cash) are conducted off-platform.",
        },
        {
          label: "Hashed stay invitation tokens",
          text: "Private stay invitation links contain unique tokens that are cryptographically hashed using SHA-256 prior to database storage. Plaintext tokens are never stored at rest, and tokens expire automatically upon use or configured validity expiration.",
        },
        {
          label: "10DLC carrier compliance and SMS handling",
          text: "SMS opt-in consent records are stored with cryptographic precision (timestamp, IP address, user identity, phone number, and checkbox status). We do not sell or share your SMS opt-in data or personal information with third parties for marketing purposes. SMS messages are restricted to transactional stay notices and operational coordination.",
        },
      ],
    },
  ],
};

export const termsOfUse: LegalDocumentData = {
  eyebrow: "Wrelik legal",
  title: "Terms & Conditions",
  summary:
    "These Terms govern your access to and use of Wrelik websites, applications, and messaging services. The Kouchd addendum below outlines platform role boundaries, stay agreement principles, and our complete SMS Terms.",
  sections: [
    {
      title: "1. Agreement and scope",
      paragraphs: [
        'These Terms & Conditions ("Terms") are a binding legal agreement between you and Wrelik Brands LLC ("Wrelik," "we," "us," or "our") governing your access to and use of our websites, applications, and related services, including Kouchd, sporkd, Klutr, and DRX / Deelrx CRM (the "Services"). By creating an account, accessing kouchd.com, completing registration, checking an acceptance box, or using a Service, you agree to these Terms and our Privacy Policy (accessible at /privacy).',
        "The app-specific addendum presented with these Terms forms an integral part of this agreement. In the event of an irreconcilable conflict between the general Terms and the app-specific addendum, the addendum controls for that specific Service.",
        "If you do not agree to all terms and conditions herein, you must immediately discontinue use of the Services.",
      ],
    },
    {
      title: "2. Eligibility and authority",
      paragraphs: [
        "You must be at least 18 years of age and possess the legal capacity to enter into a binding contract in order to use Kouchd. If you are under 18, you may not register for or use the Service.",
        "If you accept these Terms on behalf of an entity, household organization, or living group, you represent and warrant that you have full legal authority to bind that entity or group to these Terms.",
      ],
    },
    {
      title: "3. Accounts and credential security",
      paragraphs: [
        "You agree to provide true, accurate, current, and complete information during registration and to keep your account details updated. You are solely responsible for maintaining the confidentiality of your login credentials and session tokens, and for all activities that occur under your account.",
        "You must notify Wrelik immediately at support@kouchd.com or legal@wrelik.com if you discover or suspect any unauthorized access or security breach involving your account. Wrelik is not liable for losses caused by unauthorized use of your credentials.",
      ],
    },
    {
      title: "4. Platform role and core limitations",
      paragraphs: [
        "Kouchd is an organizational software tool designed to facilitate mutual stay agreements, chore coordination, house rules documentation, and shared bookkeeping ledgers between private hosts and temporary houseguests.",
      ],
      bullets: [
        {
          label: "Not a landlord or real estate broker",
          text: "Wrelik Brands LLC and Kouchd are not landlords, real estate brokers, leasing agents, property managers, or hospitality operators. Kouchd does not own, lease, manage, inspect, or guarantee any residential property, living quarters, or couch space.",
        },
        {
          label: "No legal advice or residential tenancy creation",
          text: "Kouchd does not provide legal advice or replace formal residential lease agreements required by municipal, state, or federal law. Users are solely responsible for compliance with local tenant-landlord regulations, zoning ordinances, and guest restrictions.",
        },
        {
          label: "No payment custody or money transmission",
          text: "Kouchd is strictly an informational bookkeeping ledger. We do not collect, hold, escrow, custody, transfer, or process user payments. Any financial settlements or reimbursements take place externally and directly between stay participants.",
        },
        {
          label: "Mutual confirmation principle",
          text: "Stay terms, date adjustments, chore points, and ledger contributions require mutual review and confirmation between host and guest to maintain transparent household records.",
        },
      ],
    },
    {
      title: "5. License grant and restrictions",
      paragraphs: [
        "Subject to your continuous compliance with these Terms, Wrelik grants you a limited, non-exclusive, non-transferable, revocable license to access and use Kouchd solely for personal, non-commercial household coordination.",
        "You agree that you will not:",
      ],
      bullets: [
        { text: "Copy, modify, sublicense, distribute, sell, or commercially exploit any portion of the Services;" },
        { text: "Reverse engineer, decompile, disassemble, or attempt to derive source code from the platform;" },
        { text: "Use automated bots, spiders, scrapers, or scripts to harvest data or interact with our APIs without written consent;" },
        { text: "Interfere with, overburden, compromise, or disrupt the integrity or security of our networks and infrastructure;" },
        { text: "Circumvent authentication, access controls, token expiration mechanisms, or stay authorization boundaries;" },
        { text: "Use the Services to harass, defraud, impersonate, stalk, threaten, or violate the legal rights of any person; or" },
        { text: "Submit false, misleading, defamatory, offensive, or infringing content to the platform." },
      ],
    },
    {
      title: "6. User content and data ownership",
      paragraphs: [
        'You retain ownership of all stay notes, house rules, chore descriptions, contribution receipts, photos, and messages you submit to the Service ("User Content"). You grant Wrelik and its service providers a non-exclusive, worldwide, royalty-free license to host, store, cache, format, transmit, and display User Content solely as necessary to operate, secure, and deliver the Services to you and your authorized stay members.',
        "You represent and warrant that you own or have obtained all necessary rights, licenses, and permissions to submit your User Content, and that your content does not violate any third-party privacy, intellectual property, or contract rights.",
        "Wrelik reserves the right, but does not assume the obligation, to monitor, review, restrict, or remove User Content that violates these Terms or applicable law.",
      ],
    },
    {
      title: "7. SMS Terms & Conditions (10DLC Carrier Standards)",
      paragraphs: [
        "By providing your mobile telephone number and opting into Kouchd text messages, you agree to receive SMS notifications from Wrelik Brands LLC (operating Kouchd).",
        "Please review our complete SMS Terms below:",
      ],
      bullets: [
        {
          label: "Program description",
          text: "The Kouchd SMS Notifications program, operated by Wrelik Brands LLC, delivers transactional and service-related text alerts to participants of shared household stays. Message types include stay agreement updates, mutual sign-off notices, chore deadline reminders, check-in logistics, and household ledger updates.",
        },
        {
          label: "Rates disclosure",
          text: "Message and data rates may apply. Standard text messaging and cellular data fees may be billed by your mobile carrier. Wrelik Brands LLC does not charge extra fees for sending SMS alerts.",
        },
        {
          label: "Message frequency",
          text: "Message frequency varies based on your household stay activity and personal notification preferences. Typically, you will receive transactional messages when key events occur (e.g., a chore due today, a stay agreement update, or a ledger contribution logged by your host or guest).",
        },
        {
          label: "Opt-out instructions (STOP)",
          text: "You can cancel the SMS service at any time. Simply text STOP, UNSUBSCRIBE, or QUIT to any text message you receive from Kouchd. Upon texting STOP, we will send you an SMS message confirming that you have been unsubscribed. After this, you will no longer receive SMS messages from Kouchd. You may re-subscribe at any time by visiting /sms-opt-in.",
        },
        {
          label: "Help instructions (HELP)",
          text: "If you need assistance or experience issues with our messaging program, reply with the keyword HELP to any message, or contact our support team directly at support@kouchd.com or support@wrelik.com.",
        },
        {
          label: "Carrier disclaimer",
          text: "Wireless carriers (including AT&T, T-Mobile, Verizon, Sprint, and regional carriers) are not liable for delayed or undelivered messages.",
        },
        {
          label: "Privacy protection",
          text: "We respect your privacy. We do not sell or share your SMS opt-in data or personal information with third parties for marketing purposes. For full details on our data protection practices, view our Privacy Policy at /privacy.",
        },
      ],
    },
    {
      title: "8. Third-party services, links, and payment handles",
      paragraphs: [
        "Kouchd may display payment handles, external payment links, or reference third-party tools (such as PayPal, Cash App, Zelle, or Apple Pay) provided by hosts to facilitate independent peer-to-peer settling of household expenses. Wrelik Brands LLC does not operate, control, or endorse third-party payment platforms, and their handling of your data is governed solely by their respective terms.",
        "Wrelik is not a party to any financial transaction between hosts and guests, does not verify whether external payments were actually completed, and assumes no liability for disputes, chargebacks, fraud, or errors arising from third-party payment platforms.",
      ],
    },
    {
      title: "9. Subscriptions, fees, and beta features",
      paragraphs: [
        "Wrelik may offer free, beta, or paid subscription tiers for Kouchd. Prices, feature allowances, renewal periods, and billing terms are clearly stated during checkout or onboarding. Unless otherwise noted, paid subscriptions renew automatically until canceled in account settings.",
        "Beta or preview features may be experimental, undergo frequent changes, contain bugs, or be discontinued at our discretion without notice. Do not rely on beta features as sole archives for indispensable records.",
      ],
    },
    {
      title: "10. Intellectual property and feedback",
      paragraphs: [
        "Wrelik Brands LLC and its licensors retain all right, title, and interest in and to the Services, software, user interfaces, branding, trademarks, logos, and documentation. You may not use Wrelik or Kouchd trademarks without prior written permission.",
        "If you submit feedback, suggestions, or ideas regarding Kouchd, you grant Wrelik an unrestricted, irrevocable, perpetual, royalty-free, worldwide license to use, adapt, publish, and incorporate that feedback without obligation or compensation to you.",
      ],
    },
    {
      title: "11. Suspension and termination",
      paragraphs: [
        "You may terminate your account at any time through account settings or by emailing support@kouchd.com.",
        "Wrelik reserves the right to suspend or terminate your account and access to the Services at any time, with or without notice, if you breach these Terms, engage in fraudulent or abusive conduct, fail to pay applicable fees, or create legal liability or security risks for the platform or its users.",
        "Upon termination, your right to use the Services immediately ceases. All provisions that by their nature should survive termination will survive, including ownership, warranty disclaimers, liability limitations, and governing law.",
      ],
    },
    {
      title: "12. Disclaimers of warranty",
      paragraphs: [
        'TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE SERVICES ARE PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. WRELIK BRANDS LLC AND ITS AFFILIATES, OFFICERS, EMPLOYEES, AND LICENSORS EXPRESSLY DISCLAIM ALL WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.',
        "WRELIK MAKES NO WARRANTY THAT (A) THE SERVICES WILL MEET YOUR REQUIREMENTS; (B) ACCESS WILL BE UNINTERRUPTED, TIMELY, SECURE, OR ERROR-FREE; (C) STAY AGREEMENTS OR LEDGERS WILL BE ACCURATE, COMPLETE, OR LEGALLY BINDING UNDER LOCAL HOUSING CODES; OR (D) DEFECTS WILL BE CORRECTED.",
      ],
    },
    {
      title: "13. Limitation of liability",
      paragraphs: [
        "TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL WRELIK BRANDS LLC, ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, SUPPLIERS, OR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, PUNITIVE, EXEMPLARY, OR CONSEQUENTIAL DAMAGES, INCLUDING LOSS OF PROFITS, DATA, USE, GOODWILL, REVENUE, OR DAMAGE ARISING FROM LIVING ARRANGEMENTS, HOUSEHOLD DISPUTES, EVICTIONS, PROPERTY DAMAGE, PERSONAL INJURY, OR DELAYED/UNDELIVERED COMMUNICATIONS.",
        "IN NO EVENT SHALL WRELIK'S AGGREGATE LIABILITY ARISING OUT OF OR RELATED TO THE SERVICES EXCEED THE GREATER OF (A) THE TOTAL AMOUNT PAID BY YOU TO WRELIK FOR KOUCHD DURING THE TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO LIABILITY, OR (B) ONE HUNDRED UNITED STATES DOLLARS ($100.00 USD).",
      ],
    },
    {
      title: "14. Indemnification",
      paragraphs: [
        "You agree to defend, indemnify, and hold harmless Wrelik Brands LLC, its parent, affiliates, officers, directors, employees, and agents from and against all third-party claims, liabilities, damages, losses, costs, and expenses (including reasonable attorneys' fees) arising out of or related to: (a) your use of or access to Kouchd; (b) your User Content; (c) your breach of these Terms; (d) any living arrangement, stay dispute, property damage, or interaction between you and another stay participant; or (e) your violation of applicable laws or third-party rights.",
      ],
    },
    {
      title: "15. Governing law and dispute resolution",
      paragraphs: [
        "These Terms and any dispute arising out of or related to them shall be governed by and construed in accordance with the laws of the State of Georgia, United States, without giving effect to conflict of laws principles.",
        "Any legal suit, action, or proceeding arising out of or related to these Terms or the Services shall be instituted exclusively in the federal or state courts located in Fulton County, Georgia, and each party irrevocably submits to the exclusive personal jurisdiction and venue of such courts.",
        "Before commencing legal action, both parties agree to attempt in good faith to resolve any dispute informally by sending written notice to legal@wrelik.com. If unresolved after thirty (30) days, either party may pursue claims in court.",
      ],
    },
    {
      title: "16. Apple App Store additional terms",
      paragraphs: ["If you access or download Kouchd through the Apple App Store, the following terms apply:"],
      bullets: [
        { text: "These Terms are concluded solely between you and Wrelik Brands LLC, and not with Apple Inc. Apple is not responsible for the App or its content." },
        { text: "The license granted to you is limited to a non-transferable license to use the App on Apple-branded products running iOS/iPadOS that you own or control, per Apple Media Services Terms." },
        { text: "Apple has no obligation whatsoever to furnish any maintenance or support services with respect to the App." },
        { text: "In the event of any failure of the App to conform to any applicable warranty, you may notify Apple, and Apple will refund the purchase price (if any); Apple has no other warranty obligation." },
        { text: "Wrelik, not Apple, is responsible for addressing any claims relating to the App, including product liability, legal compliance, and intellectual property infringement." },
        { text: "Apple and its subsidiaries are third-party beneficiaries of these Terms, and upon your acceptance, Apple will have the right to enforce these Terms against you." },
      ],
    },
    {
      title: "17. Severability and modifications",
      paragraphs: [
        "If any provision of these Terms is determined to be unlawful, void, or unenforceable, that provision shall be deemed severable and shall not affect the validity and enforceability of remaining provisions.",
        "We reserve the right to revise these Terms at any time. Changes will be posted to this page with an updated 'Effective Date'. Continued use of Kouchd after changes take effect constitutes your agreement to the modified Terms.",
      ],
    },
    {
      title: "18. Contact information",
      paragraphs: [
        "For questions or notices regarding these Terms & Conditions, please contact:",
        `Wrelik Brands LLC\nAttn: Legal Affairs\n${legalMeta.address}\nEmail: ${legalMeta.email}\nSupport: ${legalMeta.supportEmail} / ${legalMeta.wrelikSupportEmail}\nWebsite: ${legalMeta.siteUrl}`,
      ],
    },
  ],
  addendum: [
    {
      title: "Terms Addendum — Kouchd",
      paragraphs: [
        "This Addendum provides supplemental terms specific to Kouchd, operated by Wrelik Brands LLC.",
      ],
      numbered: [
        {
          label: "Collaborative living agreement tool",
          text: "Kouchd is a communication and record-keeping tool for temporary couch stays, roommate arrangements, and shared household living. It does not replace local leases or statutory notices.",
        },
        {
          label: "Informational ledger only",
          text: "The financial ledger in Kouchd is strictly for record-keeping and mutual reconciliation. Kouchd does not process payments, collect tenant rent, hold deposits, or execute bank transfers. All money exchanges are handled independently between users.",
        },
        {
          label: "Bilateral guest confidentiality",
          text: "Each guest's rates, discounts, financial obligations, and payment records are private between that guest and the host. Hosts agree to respect this bilateral confidentiality and not share a guest's financial ledger with third parties or other stay guests.",
        },
        {
          label: "SMS 10DLC compliance",
          text: "Our messaging system adheres to all CTIA and carrier 10DLC guidelines. Opt-in is voluntary and never required to access basic non-SMS web features. Reply STOP to cancel at any time.",
        },
      ],
    },
  ],
};

export const cookiePolicy: LegalDocumentData = {
  eyebrow: "Wrelik legal",
  title: "Cookie & Tracking Policy",
  summary:
    "This Cookie Policy explains how Wrelik Brands LLC uses cookies, local storage, and similar technologies on Kouchd (kouchd.com).",
  sections: [
    {
      title: "1. What are cookies and local storage?",
      paragraphs: [
        "Cookies are small text files placed on your device by websites that you visit. Local storage is a modern web browser mechanism that stores data locally on your device with no expiration date unless cleared.",
        "Kouchd uses cookies and local browser storage to provide secure authentication, maintain your session, protect against fraudulent activity, remember interface preferences, and understand aggregate application performance.",
      ],
    },
    {
      title: "2. Categories of cookies we use",
      paragraphs: ["We classify cookies and storage technologies into the following categories:"],
      bullets: [
        {
          label: "Strictly necessary (Essential)",
          text: "These technologies are required for Kouchd to function securely. They include authentication session cookies (provided via Clerk), CSRF protection tokens, and cryptographic security cookies. You cannot disable essential cookies without breaking core application login and security.",
        },
        {
          label: "Functionality and preferences",
          text: "These store your display preferences, active household context, theme settings, and sidebar states so you don't have to reconfigure them each time you visit.",
        },
        {
          label: "Performance and diagnostics",
          text: "We use privacy-friendly diagnostic tools (such as Sentry for crash tracking and PostHog for privacy-preserving product telemetry) to identify bugs, monitor load times, and improve usability. These tools do not track you across third-party websites.",
        },
      ],
    },
    {
      title: "3. Third-party technologies",
      paragraphs: [
        "We do not allow third-party advertising networks to place tracking cookies on Kouchd for targeted advertising or cross-context behavioral profiling. Third-party technologies deployed on Kouchd are strictly service providers acting on our behalf, including Clerk (authentication), Convex (real-time data sync), and Sentry (error diagnostics).",
      ],
    },
    {
      title: "4. Managing your cookie preferences",
      paragraphs: [
        "Most web browsers allow you to control cookies through their browser settings. You can set your browser to refuse cookies, alert you when a cookie is placed, or delete existing cookies. Note that if you block essential cookies, you will not be able to log in to your Kouchd account or maintain an active session.",
        "To learn more about cookies, visit www.allaboutcookies.org or www.aboutcookies.org.",
      ],
    },
    {
      title: "5. Contact",
      paragraphs: [
        `If you have questions about our Cookie Policy, contact us at ${legalMeta.email} or by mail at:\nWrelik Brands LLC\nAttn: Cookie Policy & Privacy\n${legalMeta.address}`,
      ],
    },
  ],
  addendum: [],
};

export const acceptableUsePolicy: LegalDocumentData = {
  eyebrow: "Wrelik legal",
  title: "Acceptable Use Policy",
  summary:
    "This Acceptable Use Policy defines the standards and prohibited activities for users of Kouchd and Wrelik Services.",
  sections: [
    {
      title: "1. Purpose and scope",
      paragraphs: [
        "This Acceptable Use Policy ('AUP') governs all users of Kouchd (operated by Wrelik Brands LLC). By accessing or using Kouchd, you agree to comply with this policy in full. We maintain this policy to foster a safe, respectful, transparent, and legally compliant environment for shared living coordination.",
      ],
    },
    {
      title: "2. Prohibited activities",
      paragraphs: ["When using Kouchd, you may not engage in any of the following activities:"],
      bullets: [
        {
          label: "Illegal or fraudulent activity",
          text: "Violating any local, state, national, or international law or regulation, including housing codes, fair housing laws, anti-discrimination statutes, and consumer fraud regulations.",
        },
        {
          label: "Harassment, abuse, and discrimination",
          text: "Threatening, stalking, defaming, harassing, or intimidating any host, guest, or platform user. Discriminating against individuals based on race, color, religion, sex, national origin, familial status, disability, sexual orientation, or gender identity.",
        },
        {
          label: "Deceptive or misleading records",
          text: "Fabricating stay records, falsely claiming payments or contributions that did not occur, misrepresenting property availability or amenities, or creating dummy accounts to manipulate stay ratings or ledger histories.",
        },
        {
          label: "Security violations and interference",
          text: "Attempting to probe, scan, or test the vulnerability of our systems; breaching or circumventing authentication or security controls; introducing viruses, worms, or malicious code; or launching denial-of-service attacks.",
        },
        {
          label: "Spam and unauthorized messaging",
          text: "Sending unsolicited mass messages, chain letters, commercial advertisements, or deceptive SMS texts to stay members or external phone numbers.",
        },
        {
          label: "Infringement of intellectual property",
          text: "Uploading or distributing photos, agreements, logos, or content that infringe the copyrights, trademarks, or privacy rights of third parties.",
        },
      ],
    },
    {
      title: "3. Enforcement and reporting",
      paragraphs: [
        "Wrelik Brands LLC reserves the right to investigate any suspected violation of this policy. If we determine that a user has violated the AUP, we may issue warnings, remove offending content, suspend access, terminate accounts permanently, or report severe violations to law enforcement authorities.",
        `If you encounter content or behavior that violates this policy, please report it immediately to our safety and compliance team at support@kouchd.com or legal@wrelik.com.`,
      ],
    },
  ],
  addendum: [],
};

export const legalLinks = {
  privacy: "Privacy Policy",
  terms: "Terms & Conditions",
  cookies: "Cookie Policy",
  acceptableUse: "Acceptable Use",
  smsOptIn: "SMS Acceptance",
  support: "Support",
  returnToApp: "Back to App",
};
