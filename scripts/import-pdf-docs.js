const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const documentTypes = [
  {
    documentKey: 'doc_governmentIssuedPhotoId',
    name: 'Government-Issued Photo ID',
    category: 'Client Identity',
    description: 'Unexpired driver’s license, state ID, or similar government-issued photo identification used to verify identity.',
    typicalAccountTypes: 'IND, JNT, IRA-T, IRA-R, IRA-I, TRT, EST, ENT, MIN, ANN, ALT',
    critical: true,
    active: true,
    notes: 'Core CIP/KYC evidence. FINRA requires customer-account information, and public account applications require government-issued ID details.',
    displayOrder: 1
  },
  {
    documentKey: 'doc_passportOrPermanentResidentCardSupport',
    name: 'Passport or Permanent Resident Card Support',
    category: 'Client Identity',
    description: 'Passport, permanent resident card, or comparable nationality/residency evidence used when standard domestic ID is insufficient or foreign-status issues are in play.',
    typicalAccountTypes: 'IND, JNT, IRA-I, TRT, ENT, ANN, ALT',
    critical: true,
    active: true,
    notes: 'Common for non-U.S. persons or where passport-level evidence is specifically called for. Fidelity’s trust application explicitly references passport and permanent resident card as acceptable government ID evidence.',
    displayOrder: 2
  },
  {
    documentKey: 'doc_formW9OrEquivalentTinCertification',
    name: 'Form W-9 or Equivalent TIN Certification',
    category: 'Client Identity',
    description: 'IRS taxpayer certification used to provide and certify a U.S. SSN, ITIN, or EIN.',
    typicalAccountTypes: 'IND, JNT, IRA-T, IRA-R, IRA-I, TRT, EST, ENT, MIN, ANN, ALT',
    critical: true,
    active: true,
    notes: 'Required whenever the account owner or legal entity is U.S. tax-reportable and the custodian cannot rely solely on existing verified tax records.',
    displayOrder: 3
  },
  {
    documentKey: 'doc_formW8BEN',
    name: 'Form W-8BEN',
    category: 'Client Identity',
    description: 'IRS foreign-status certificate for a non-U.S. individual.',
    typicalAccountTypes: 'IND, JNT, IRA-I, ANN, ALT',
    critical: true,
    active: true,
    notes: 'Used to establish foreign status and, if applicable, treaty claims. Brokerage and inherited-account paperwork often references it when foreign status exists.',
    displayOrder: 4
  },
  {
    documentKey: 'doc_formW8BENE',
    name: 'Form W-8BEN-E',
    category: 'Client Identity',
    description: 'IRS foreign-status certificate for a non-U.S. entity.',
    typicalAccountTypes: 'TRT, EST, ENT, ALT',
    critical: true,
    active: true,
    notes: 'Used for foreign legal entities and withholding/reporting treatment.',
    displayOrder: 5
  },
  {
    documentKey: 'doc_trustedContactPersonRecord',
    name: 'Trusted Contact Person Record',
    category: 'Client Identity',
    description: 'Record of trusted contact name and contact information for a non-institutional client.',
    typicalAccountTypes: 'IND, JNT, IRA-T, IRA-R, IRA-I, MIN',
    critical: false,
    active: true,
    notes: 'FINRA requires firms to make a reasonable effort to obtain this for non-institutional accounts, but refusal usually does not stop opening or transfer.',
    displayOrder: 6
  },
  {
    documentKey: 'doc_proofOfResidentialAddress',
    name: 'Proof of Residential Address',
    category: 'Client Identity',
    description: 'Utility bill, bank statement, voter card, or comparable evidence used to support a legal address.',
    typicalAccountTypes: 'IND, JNT, IRA-T, IRA-R, IRA-I, TRT, ENT, MIN, ANN',
    critical: true,
    active: true,
    notes: 'Often becomes critical when legal and mailing addresses differ, when moving from non-U.S. to U.S. address status, or when CIP cannot verify automatically.',
    displayOrder: 7
  },
  {
    documentKey: 'doc_legalNameChangeDocument',
    name: 'Legal Name Change Document',
    category: 'Client Identity',
    description: 'Marriage certificate, divorce decree, court order, or updated government ID evidencing a legal name change.',
    typicalAccountTypes: 'IND, JNT, IRA-T, IRA-R, IRA-I, TRT, ENT, MIN, ANN',
    critical: true,
    active: true,
    notes: 'Public custodian forms explicitly require documentary proof before registrations can be updated.',
    displayOrder: 8
  },
  {
    documentKey: 'doc_achOrEftAuthorization',
    name: 'ACH or EFT Authorization',
    category: 'Banking',
    description: 'Authorization to link a bank account for ACH debits or credits.',
    typicalAccountTypes: 'IND, JNT, IRA-T, IRA-R, IRA-I, TRT, EST, ENT, MIN',
    critical: true,
    active: true,
    notes: 'Required whenever bank movement is part of funding or post-transfer cash management. Fidelity publicly lists bank-linking for EFT and wire use.',
    displayOrder: 9
  },
  {
    documentKey: 'doc_wireInstructionsAuthorization',
    name: 'Wire Instructions Authorization',
    category: 'Banking',
    description: 'Written bank wire instructions for incoming or outgoing funds.',
    typicalAccountTypes: 'IND, JNT, IRA-T, IRA-R, IRA-I, TRT, EST, ENT, ANN',
    critical: true,
    active: true,
    notes: 'Required when wiring funds; usually distinct from EFT authorization because verification and fraud controls are tighter.',
    displayOrder: 10
  },
  {
    documentKey: 'doc_voidedCheckOrBankLetter',
    name: 'Voided Check or Bank Letter',
    category: 'Banking',
    description: 'Supporting bank evidence used to validate ownership of the linked external account.',
    typicalAccountTypes: 'IND, JNT, IRA-T, IRA-R, IRA-I, TRT, EST, ENT',
    critical: false,
    active: true,
    notes: 'Common attachment for manual ACH/EFT setup or address-account verification; sometimes replaceable by digital verification.',
    displayOrder: 11
  },
  {
    documentKey: 'doc_standingLetterOfAuthorization',
    name: 'Standing Letter of Authorization',
    category: 'Banking',
    description: 'Standing instructions that permit recurring or on-demand transfer requests to an authorized destination.',
    typicalAccountTypes: 'IND, JNT, TRT, ENT',
    critical: true,
    active: true,
    notes: 'High-risk control point. SEC no-action relief and Pershing guidance treat SLOAs as a defined supervisory category.',
    displayOrder: 12
  },
  {
    documentKey: 'doc_cashManagementOrCheckwritingOrDebitEnrollment',
    name: 'Cash Management or Checkwriting or Debit Enrollment',
    category: 'Banking',
    description: 'Enrollment form for checks, debit card, or cash-management features linked to the investment account.',
    typicalAccountTypes: 'IND, JNT, TRT, ENT, IRA-T',
    critical: false,
    active: true,
    notes: 'Useful for transition completeness because new household operating habits often depend on these features, but not every transition needs them.',
    displayOrder: 13
  },
  {
    documentKey: 'doc_fullTrustAgreement',
    name: 'Full Trust Agreement',
    category: 'Trust',
    description: 'Complete trust instrument, including signature pages and governing provisions, used when summary evidence is insufficient.',
    typicalAccountTypes: 'TRT, IRA-I, EST, ALT',
    critical: true,
    active: true,
    notes: 'Often required for complex trusts, inherited accounts to trusts, or when a certificate alone does not establish powers.',
    displayOrder: 14
  },
  {
    documentKey: 'doc_certificationOfTrustOrTrustCertificate',
    name: 'Certification of Trust or Trust Certificate',
    category: 'Trust',
    description: 'Certificate or abstract confirming trust existence, trustee identity, date, and authority without exposing the full document in many cases.',
    typicalAccountTypes: 'TRT, IRA-I',
    critical: true,
    active: true,
    notes: 'Common frontline validation document for opening or updating trust accounts.',
    displayOrder: 15
  },
  {
    documentKey: 'doc_trustAmendmentOrRestatement',
    name: 'Trust Amendment or Restatement',
    category: 'Trust',
    description: 'Amendment, restatement, or other change document updating trust powers or trustee structure.',
    typicalAccountTypes: 'TRT, IRA-I',
    critical: true,
    active: true,
    notes: 'Required whenever the operative trust terms changed after the original instrument or certificate on file.',
    displayOrder: 16
  },
  {
    documentKey: 'doc_trusteeCertificationOrAcceptance',
    name: 'Trustee Certification or Acceptance',
    category: 'Trust',
    description: 'Trustee-signed certification that the acting trustee accepts office and possesses the relevant powers.',
    typicalAccountTypes: 'TRT, IRA-I',
    critical: true,
    active: true,
    notes: 'Important when the trust document does not clearly show current acting fiduciaries or when operational authority needs confirmation.',
    displayOrder: 17
  },
  {
    documentKey: 'doc_successorTrusteeAppointmentOrResignationDocumentation',
    name: 'Successor Trustee Appointment or Resignation Documentation',
    category: 'Trust',
    description: 'Documentation showing removal, resignation, incapacity, or appointment of successor trustees.',
    typicalAccountTypes: 'TRT, IRA-I',
    critical: true,
    active: true,
    notes: 'Necessary whenever the acting trustee differs from the trustee last on file.',
    displayOrder: 18
  },
  {
    documentKey: 'doc_beneficialOwnershipForTrustsForm',
    name: 'Beneficial Ownership for Trusts Form',
    category: 'Trust',
    description: 'Form capturing beneficial-owner or control-person information for trust relationships where the custodian requires it.',
    typicalAccountTypes: 'TRT',
    critical: true,
    active: true,
    notes: 'Fidelity’s trust application expressly requires a separate beneficial ownership form when the beneficial owner is an entity.',
    displayOrder: 19
  },
  {
    documentKey: 'doc_certifiedDeathCertificate',
    name: 'Certified Death Certificate',
    category: 'Estate',
    description: 'Certified evidence of the account owner’s death.',
    typicalAccountTypes: 'EST, IRA-I, TRT, IND, JNT',
    critical: true,
    active: true,
    notes: 'Public death-processing materials from Schwab and LPL treat death-certificate evidence as a starting gate for inheritance and beneficiary processing.',
    displayOrder: 20
  },
  {
    documentKey: 'doc_lettersTestamentaryOrLettersOfAdministration',
    name: 'Letters Testamentary or Letters of Administration',
    category: 'Estate',
    description: 'Court-issued authority appointing the executor or personal representative.',
    typicalAccountTypes: 'EST, IRA-I, TRT',
    critical: true,
    active: true,
    notes: 'Required whenever assets are moving through the estate rather than directly by beneficiary designation.',
    displayOrder: 21
  },
  {
    documentKey: 'doc_courtAppointmentOrderForFiduciary',
    name: 'Court Appointment Order for Fiduciary',
    category: 'Estate',
    description: 'Order appointing a fiduciary, guardian, conservator, or other court-recognized representative.',
    typicalAccountTypes: 'EST, MIN, TRT, IRA-I',
    critical: true,
    active: true,
    notes: 'Becomes critical when probate, guardianship, or estate administration powers arise from court authority rather than account titling alone.',
    displayOrder: 22
  },
  {
    documentKey: 'doc_affidavitOfDomicile',
    name: 'Affidavit of Domicile',
    category: 'Estate',
    description: 'Sworn statement regarding the decedent’s legal domicile used to support transfer of assets after death.',
    typicalAccountTypes: 'EST',
    critical: false,
    active: true,
    notes: 'Common estate-support document for securities transfer and post-death processing, especially when domicile affects legal entitlement or tax handling.',
    displayOrder: 23
  },
  {
    documentKey: 'doc_estateDistributionOrExecutorInstructionLetter',
    name: 'Estate Distribution or Executor Instruction Letter',
    category: 'Estate',
    description: 'Written allocation or transfer instructions signed by the executor or authorized estate fiduciary.',
    typicalAccountTypes: 'EST, IRA-I',
    critical: false,
    active: true,
    notes: 'Operationally useful after legal authority is established; some firms specifically require executor instructions for proper distribution.',
    displayOrder: 24
  },
  {
    documentKey: 'doc_articlesOfIncorporationOrCertificateOfFormation',
    name: 'Articles of Incorporation or Certificate of Formation',
    category: 'Entity',
    description: 'Foundational state formation document for a corporation, LLC, or similar legal entity.',
    typicalAccountTypes: 'ENT, TRT',
    critical: true,
    active: true,
    notes: 'Formation evidence is repeatedly referenced in public entity and trust-account documentation.',
    displayOrder: 25
  },
  {
    documentKey: 'doc_bylaws',
    name: 'Bylaws',
    category: 'Entity',
    description: 'Corporate governance document identifying officer structure, voting authority, and internal rules.',
    typicalAccountTypes: 'ENT',
    critical: false,
    active: true,
    notes: 'Usually supporting rather than standalone, but highly useful when authority is unclear or resolution language is thin.',
    displayOrder: 26
  },
  {
    documentKey: 'doc_corporateResolution',
    name: 'Corporate Resolution',
    category: 'Entity',
    description: 'Resolution authorizing account opening, transacting authority, and the named officers or agents who may act.',
    typicalAccountTypes: 'ENT',
    critical: true,
    active: true,
    notes: 'Explicitly required in public corporate account documentation and remains a frequent transition blocker when entity authority is stale.',
    displayOrder: 27
  },
  {
    documentKey: 'doc_llcOperatingAgreement',
    name: 'LLC Operating Agreement',
    category: 'Entity',
    description: 'Agreement showing managers, members, authority structure, and operating rules for the LLC.',
    typicalAccountTypes: 'ENT, ALT',
    critical: true,
    active: true,
    notes: 'Critical when formation docs alone do not identify who may act or bind the entity.',
    displayOrder: 28
  },
  {
    documentKey: 'doc_partnershipAgreement',
    name: 'Partnership Agreement',
    category: 'Entity',
    description: 'Governing agreement for general, limited, or other partnerships.',
    typicalAccountTypes: 'ENT, ALT',
    critical: true,
    active: true,
    notes: 'Required whenever partnership authority, ownership, or transfer permissions need to be substantiated.',
    displayOrder: 29
  },
  {
    documentKey: 'doc_einConfirmationOrSs4Support',
    name: 'EIN Confirmation or SS-4 Support',
    category: 'Entity',
    description: 'IRS EIN assignment evidence, SS-4 filing support, or comparable TIN documentation for an entity, estate, or trust.',
    typicalAccountTypes: 'ENT, EST, TRT',
    critical: true,
    active: true,
    notes: 'Needed whenever the registration uses an entity or estate TIN instead of an individual SSN.',
    displayOrder: 30
  },
  {
    documentKey: 'doc_incumbencyOrSecretaryCertificate',
    name: 'Incumbency or Secretary Certificate',
    category: 'Entity',
    description: 'Officer certification identifying who currently holds office and may execute documents.',
    typicalAccountTypes: 'ENT',
    critical: true,
    active: true,
    notes: 'Often needed when the resolution is dated, the signers changed, or the custodian needs a current officer attestation.',
    displayOrder: 31
  },
  {
    documentKey: 'doc_beneficialOwnershipCertificationForEntities',
    name: 'Beneficial Ownership Certification for Entities',
    category: 'Entity',
    description: 'Certification identifying beneficial owners and control persons of legal-entity customers.',
    typicalAccountTypes: 'ENT',
    critical: true,
    active: true,
    notes: 'FinCEN’s CDD framework and Pershing’s disclosure language make beneficial-owner identification a core legal-entity control point.',
    displayOrder: 32
  },
  {
    documentKey: 'doc_durablePowerOfAttorney',
    name: 'Durable Power of Attorney',
    category: 'Powers',
    description: 'Legal document authorizing an agent to act on behalf of the principal.',
    typicalAccountTypes: 'IND, JNT, IRA-T, IRA-R, TRT, ANN',
    critical: true,
    active: true,
    notes: 'Commonly required before an attorney-in-fact can transact, especially for aging or incapacitated clients.',
    displayOrder: 33
  },
  {
    documentKey: 'doc_poaCertificationOrAffidavitOfEffectiveness',
    name: 'POA Certification or Affidavit of Effectiveness',
    category: 'Powers',
    description: 'Supplemental certification confirming that an existing POA remains in force and effective.',
    typicalAccountTypes: 'IND, JNT, IRA-T, IRA-R, TRT, ANN',
    critical: true,
    active: true,
    notes: 'LPL and BNY publicly reference POA validation documents where age or form of the POA creates extra review.',
    displayOrder: 34
  },
  {
    documentKey: 'doc_guardianshipOrConservatorshipOrder',
    name: 'Guardianship or Conservatorship Order',
    category: 'Powers',
    description: 'Court order establishing a guardian or conservator with authority to act for the protected person.',
    typicalAccountTypes: 'MIN, IND, IRA-I, TRT',
    critical: true,
    active: true,
    notes: 'Required when a person lacks legal capacity or a minor beneficiary needs a court-recognized fiduciary.',
    displayOrder: 35
  },
  {
    documentKey: 'doc_authorizedAgentOrLimitedTradingAuthorization',
    name: 'Authorized Agent or Limited Trading Authorization',
    category: 'Powers',
    description: 'Limited authority document giving a named third party authority to view, trade, or otherwise act at a defined level.',
    typicalAccountTypes: 'IND, JNT, IRA-T, IRA-R, ANN',
    critical: false,
    active: true,
    notes: 'Schwab and Fidelity both provide distinct authority forms; useful for multi-generational households and transition support teams.',
    displayOrder: 36
  },
  {
    documentKey: 'doc_traditionalIraApplicationOrCustodialAgreement',
    name: 'Traditional IRA Application or Custodial Agreement',
    category: 'Retirement',
    description: 'Application and governing custodial agreement for a Traditional or Rollover IRA.',
    typicalAccountTypes: 'IRA-T',
    critical: true,
    active: true,
    notes: 'Foundational opening document for a Traditional or Rollover IRA relationship.',
    displayOrder: 37
  },
  {
    documentKey: 'doc_rothIraApplicationOrCustodialAgreement',
    name: 'Roth IRA Application or Custodial Agreement',
    category: 'Retirement',
    description: 'Application and governing custodial agreement for a Roth IRA.',
    typicalAccountTypes: 'IRA-R',
    critical: true,
    active: true,
    notes: 'Foundational opening document for a Roth IRA relationship.',
    displayOrder: 38
  },
  {
    documentKey: 'doc_sepIraAdoptionAgreement',
    name: 'SEP IRA Adoption Agreement',
    category: 'Retirement',
    description: 'Employer or self-employed plan setup document establishing a SEP IRA arrangement.',
    typicalAccountTypes: 'IRA-T, ENT, PLAN',
    critical: true,
    active: true,
    notes: 'Required when the household or practice practice transition includes SEP assets or ongoing SEP funding.',
    displayOrder: 39
  },
  {
    documentKey: 'doc_simpleIraPlanAdoptionAgreement',
    name: 'SIMPLE IRA Plan Adoption Agreement',
    category: 'Retirement',
    description: 'Employer document establishing a SIMPLE IRA plan.',
    typicalAccountTypes: 'IRA-T, ENT, PLAN',
    critical: true,
    active: true,
    notes: 'IRS recognizes Forms 5304-SIMPLE and 5305-SIMPLE as model SIMPLE documents.',
    displayOrder: 40
  },
  {
    documentKey: 'doc_ownersOnly401kAdoptionAgreement',
    name: 'Owners-Only 401(k) Adoption Agreement',
    category: 'Retirement',
    description: 'Adoption agreement for an individual or owners-only 401(k).',
    typicalAccountTypes: 'PLAN',
    critical: true,
    active: true,
    notes: 'Necessary when the advisor is transitioning plan assets tied to a solo-practice or owner-only plan.',
    displayOrder: 41
  },
  {
    documentKey: 'doc_directRolloverOrQualifiedPlanDistributionForm',
    name: 'Direct Rollover or Qualified Plan Distribution Form',
    category: 'Retirement',
    description: 'Plan-level paperwork directing a rollover from a qualified plan to an IRA or successor account.',
    typicalAccountTypes: 'PLAN, IRA-T, IRA-R',
    critical: true,
    active: true,
    notes: 'Public transfer materials note that employer plans often require their own rollover paperwork outside the standard brokerage TOA process.',
    displayOrder: 42
  },
  {
    documentKey: 'doc_inheritedIraApplication',
    name: 'Inherited IRA Application',
    category: 'Retirement',
    description: 'Application used to open a beneficiary IRA after death.',
    typicalAccountTypes: 'IRA-I',
    critical: true,
    active: true,
    notes: 'Fidelity and Schwab both publish specific inherited IRA application paths, including trust and estate variants.',
    displayOrder: 43
  },
  {
    documentKey: 'doc_iraBeneficiaryClaimOrDistributionElection',
    name: 'IRA Beneficiary Claim or Distribution Election',
    category: 'Retirement',
    description: 'Beneficiary claim/disclaim or inherited-account election form after the original account owner’s death.',
    typicalAccountTypes: 'IRA-I',
    critical: true,
    active: true,
    notes: 'Public LPL and BNY forms treat this as a separate post-death control document, distinct from the inherited IRA application itself.',
    displayOrder: 44
  },
  {
    documentKey: 'doc_todOrPodOrNonRetirementBeneficiaryDesignationForm',
    name: 'TOD or POD or Non-Retirement Beneficiary Designation Form',
    category: 'Beneficiary',
    description: 'Form naming beneficiaries for a taxable individual or joint account using TOD/POD or similar non-retirement registration.',
    typicalAccountTypes: 'IND, JNT',
    critical: false,
    active: true,
    notes: 'Estate-planning important, but not universally required for account opening. Transition methodology should still track it because it materially affects death-processing readiness.',
    displayOrder: 45
  },
  {
    documentKey: 'doc_iraOrRetirementBeneficiaryDesignationForm',
    name: 'IRA or Retirement Beneficiary Designation Form',
    category: 'Beneficiary',
    description: 'Form naming primary and contingent beneficiaries for IRAs and other retirement accounts.',
    typicalAccountTypes: 'IRA-T, IRA-R, IRA-I, PLAN',
    critical: false,
    active: true,
    notes: 'Public custodian materials and retirement guidance consistently treat beneficiary designations as separate plan/account records.',
    displayOrder: 46
  },
  {
    documentKey: 'doc_spousalConsentForBeneficiaryElection',
    name: 'Spousal Consent for Beneficiary Election',
    category: 'Beneficiary',
    description: 'Spouse’s notarized or plan-witnessed consent when the participant names someone other than the spouse where plan or law requires it.',
    typicalAccountTypes: 'PLAN, some IRA contexts',
    critical: true,
    active: true,
    notes: 'Fidelity’s qualified-plan beneficiary material expressly requires spousal consent in plans where spouse default rights apply.',
    displayOrder: 47
  },
  {
    documentKey: 'doc_customBeneficiaryAddendumOrPerStirpesInstructions',
    name: 'Custom Beneficiary Addendum or Per Stirpes Instructions',
    category: 'Beneficiary',
    description: 'Separate addendum or custom designation language used for complex beneficiary structures, additional beneficiaries, or per stirpes/per capita instructions.',
    typicalAccountTypes: 'IND, JNT, IRA-T, IRA-R, PLAN, TRT',
    critical: false,
    active: true,
    notes: 'Public Schwab and Fidelity materials allow additional or more complex beneficiary language outside a simple default grid.',
    displayOrder: 48
  },
  {
    documentKey: 'doc_advisoryAgreementOrInvestmentManagementAgreement',
    name: 'Advisory Agreement or Investment Management Agreement',
    category: 'Advisory',
    description: 'Core client contract for investment advisory services, including scope, authority, and fee terms.',
    typicalAccountTypes: 'IND, JNT, TRT, ENT, IRA-T, IRA-R',
    critical: true,
    active: true,
    notes: 'SEC brochure rules and advisory program agreements make the advisory agreement a foundational document for the advisory relationship.',
    displayOrder: 49
  },
  {
    documentKey: 'doc_managedAccountOrAdvisoryProgramEnrollment',
    name: 'Managed Account or Advisory Program Enrollment',
    category: 'Advisory',
    description: 'Enrollment form placing the account into a specific advisory or wrap program.',
    typicalAccountTypes: 'IND, JNT, TRT, ENT, IRA-T, IRA-R',
    critical: true,
    active: true,
    notes: 'Public Schwab advisory agreement materials distinguish standard custody from advisory program enrollment.',
    displayOrder: 50
  },
  {
    documentKey: 'doc_investmentPolicyStatement',
    name: 'Investment Policy Statement',
    category: 'Advisory',
    description: 'Written portfolio-governance and implementation document specifying objectives, constraints, and monitoring expectations.',
    typicalAccountTypes: 'IND, JNT, TRT, ENT, PLAN',
    critical: false,
    active: true,
    notes: 'Not universally required, but a strong transition-readiness record because it stabilizes portfolio conversion and post-move implementation. Fidelity and Schwab both discuss IPS use in advisory/plan contexts.',
    displayOrder: 51
  },
  {
    documentKey: 'doc_riskToleranceOrInvestorProfileQuestionnaire',
    name: 'Risk Tolerance or Investor Profile Questionnaire',
    category: 'Advisory',
    description: 'Client profile document capturing goals, time horizon, risk tolerance, and related suitability inputs.',
    typicalAccountTypes: 'IND, JNT, TRT, ENT, IRA-T, IRA-R, PLAN',
    critical: false,
    active: true,
    notes: 'Commonly embedded in advisory onboarding and ongoing suitability review. Public Schwab and Fidelity materials explicitly reference investor profile and risk data.',
    displayOrder: 52
  },
  {
    documentKey: 'doc_discretionaryTradingAuthorization',
    name: 'Discretionary Trading Authorization',
    category: 'Advisory',
    description: 'Document granting the advisor discretion to place trades within the agreed mandate.',
    typicalAccountTypes: 'IND, JNT, TRT, ENT, IRA-T, IRA-R',
    critical: true,
    active: true,
    notes: 'Critical whenever the destination relationship is discretionary rather than client-directed.',
    displayOrder: 53
  },
  {
    documentKey: 'doc_advisoryFeeBillingAuthorization',
    name: 'Advisory Fee Billing Authorization',
    category: 'Advisory',
    description: 'Separate fee-debit or billing authorization used when not fully embedded in the advisory contract.',
    typicalAccountTypes: 'IND, JNT, TRT, ENT, IRA-T, IRA-R',
    critical: false,
    active: true,
    notes: 'Operationally important for clean fee debits and billing continuity, though some programs bake this into the main agreement.',
    displayOrder: 54
  },
  {
    documentKey: 'doc_formAdvOrFormCrsDeliveryRecord',
    name: 'Form ADV or Form CRS Delivery Record',
    category: 'Compliance',
    description: 'Record that the client received required advisory disclosures and relationship summary.',
    typicalAccountTypes: 'IND, JNT, TRT, ENT, IRA-T, IRA-R',
    critical: false,
    active: true,
    notes: 'Compliance-critical for the firm and advisor, but usually system-captured rather than a transfer hard stop.',
    displayOrder: 55
  },
  {
    documentKey: 'doc_amlOrSourceOfFundsQuestionnaire',
    name: 'AML or Source-of-Funds Questionnaire',
    category: 'Compliance',
    description: 'Additional due-diligence questionnaire used to understand the nature and purpose of the relationship and, where warranted, source of funds or source of wealth.',
    typicalAccountTypes: 'IND, JNT, TRT, ENT, ANN, ALT',
    critical: false,
    active: true,
    notes: 'Heightened-review document rather than a universal opening item, but important for flagged clients and private/alternative flows.',
    displayOrder: 56
  },
  {
    documentKey: 'doc_pepOrSanctionsOrForeignAffiliationAttestation',
    name: 'PEP or Sanctions or Foreign Affiliation Attestation',
    category: 'Compliance',
    description: 'Additional attestation used to identify politically exposed persons, sanctioned-party exposure, or foreign affiliation risk.',
    typicalAccountTypes: 'IND, JNT, TRT, ENT, ANN, ALT',
    critical: false,
    active: true,
    notes: 'Triggered by risk profile rather than every household; OFAC and FINRA materials support this as a due-diligence domain.',
    displayOrder: 57
  },
  {
    documentKey: 'doc_alternateCipDocumentationOrExceptionRequest',
    name: 'Alternate CIP Documentation or Exception Request',
    category: 'Compliance',
    description: 'Exception form or alternative-document request used when standard government ID is unavailable or cannot be verified in the normal way.',
    typicalAccountTypes: 'IND, JNT, MIN, EST',
    critical: false,
    active: true,
    notes: 'LPL publicly lists a specific request to accept alternative documentation for CIP, which is precisely the type of edge-case document that delays transitions if absent.',
    displayOrder: 58
  },
  {
    documentKey: 'doc_individualOrJointBrokerageApplication',
    name: 'Individual or Joint Brokerage Application',
    category: 'Custodial',
    description: 'Core application used to open a taxable brokerage account for one or more individual owners.',
    typicalAccountTypes: 'IND, JNT',
    critical: true,
    active: true,
    notes: 'Front-door document for destination-custodian onboarding. Schwab, Fidelity, and LPL all publish direct account-opening forms or online equivalents.',
    displayOrder: 59
  },
  {
    documentKey: 'doc_trustAccountApplication',
    name: 'Trust Account Application',
    category: 'Custodial',
    description: 'Custodian account-opening document specific to trust registrations.',
    typicalAccountTypes: 'TRT',
    critical: true,
    active: true,
    notes: 'Separate from the trust agreement itself; this is the receiving-account setup document.',
    displayOrder: 60
  },
  {
    documentKey: 'doc_entityOrBusinessAccountApplication',
    name: 'Entity or Business Account Application',
    category: 'Custodial',
    description: 'Custodian setup document for corporations, LLCs, partnerships, and other legal entities.',
    typicalAccountTypes: 'ENT',
    critical: true,
    active: true,
    notes: 'Distinct from entity evidence documents and necessary for destination-account creation.',
    displayOrder: 61
  },
  {
    documentKey: 'doc_retirementAccountApplication',
    name: 'Retirement Account Application',
    category: 'Custodial',
    description: 'Receiving-custodian application for a retirement account where the destination account itself must be opened before assets move.',
    typicalAccountTypes: 'IRA-T, IRA-R, IRA-I, PLAN',
    critical: true,
    active: true,
    notes: 'Separate from plan adoption or beneficiary forms; needed to establish the receiving retirement registration.',
    displayOrder: 62
  },
  {
    documentKey: 'doc_transferOfAssetsOrAcatsForm',
    name: 'Transfer of Assets or ACATS Form',
    category: 'Custodial',
    description: 'Standard customer account transfer instruction for ACATS-eligible assets moving broker-to-broker.',
    typicalAccountTypes: 'IND, JNT, IRA-T, IRA-R, TRT, ENT',
    critical: true,
    active: true,
    notes: 'FINRA Rule 11870 and ACATS govern this core transfer path. Custodians and clearing firms publish dedicated TOA or transfer forms.',
    displayOrder: 63
  },
  {
    documentKey: 'doc_nonAcatTransferOrInsuranceOrMutualFundTransferForm',
    name: 'Non-ACAT Transfer or Insurance or Mutual Fund Transfer Form',
    category: 'Custodial',
    description: 'Transfer instruction used when assets are not ACATS eligible, including mutual-fund, insurance, or certain retirement product transfers.',
    typicalAccountTypes: 'IND, JNT, IRA-T, IRA-R, ANN, ALT',
    critical: true,
    active: true,
    notes: 'Necessary for assets outside the standard ACATS lane; Schwab and Fidelity both distinguish these from plain brokerage transfers.',
    displayOrder: 64
  },
  {
    documentKey: 'doc_changeOfRegistrationOrOwnershipForm',
    name: 'Change of Registration or Ownership Form',
    category: 'Custodial',
    description: 'Form changing account title, ownership, or registration without a standard broker-to-broker transfer.',
    typicalAccountTypes: 'IND, JNT, TRT, EST, ENT',
    critical: true,
    active: true,
    notes: 'Public Fidelity forms specifically separate change of registration from address and beneficiary updates.',
    displayOrder: 65
  },
  {
    documentKey: 'doc_marginAgreement',
    name: 'Margin Agreement',
    category: 'Custodial',
    description: 'Contract and related risk disclosures permitting margin borrowing in eligible accounts.',
    typicalAccountTypes: 'IND, JNT, ENT',
    critical: true,
    active: true,
    notes: 'Required if the account must preserve or reopen margin functionality. Public materials from LPL, Pershing, Raymond James, and Fidelity all treat this as a distinct permission set.',
    displayOrder: 66
  },
  {
    documentKey: 'doc_optionsApplicationOrOptionsAgreement',
    name: 'Options Application or Options Agreement',
    category: 'Custodial',
    description: 'Approval package for options trading, including strategy level and customer suitability information.',
    typicalAccountTypes: 'IND, JNT, IRA-T, IRA-R, ENT',
    critical: true,
    active: true,
    notes: 'FINRA reminds firms that options approval requires due diligence and specific supervisory handling. Public custodian materials provide separate options applications or approvals.',
    displayOrder: 67
  },
  {
    documentKey: 'doc_federalOrStateTaxWithholdingElection',
    name: 'Federal or State Tax Withholding Election',
    category: 'Tax',
    description: 'Election form for withholding on retirement or beneficiary distributions and certain reportable payments.',
    typicalAccountTypes: 'IRA-T, IRA-R, IRA-I, EST, ANN',
    critical: false,
    active: true,
    notes: 'Not always required because defaults may apply, but operationally important whenever the transfer includes distributions.',
    displayOrder: 68
  },
  {
    documentKey: 'doc_irsForm56',
    name: 'IRS Form 56',
    category: 'Tax',
    description: 'IRS notice concerning creation or termination of a fiduciary relationship.',
    typicalAccountTypes: 'EST, TRT',
    critical: false,
    active: true,
    notes: 'Important for estates and fiduciary tax administration, though usually outside the custodian-opening gate itself.',
    displayOrder: 69
  },
  {
    documentKey: 'doc_costBasisTransferStatementOrLotHistory',
    name: 'Cost Basis Transfer Statement or Lot History',
    category: 'Tax',
    description: 'Supporting cost-basis record or lot-level history used to preserve accurate tax reporting after transfer.',
    typicalAccountTypes: 'IND, JNT, ENT, TRT',
    critical: false,
    active: true,
    notes: 'Not always a transfer blocker, but a major post-transition risk area. Fidelity and Schwab both discuss basis accuracy and updates; statements and transfer support should preserve lot history where possible.',
    displayOrder: 70
  },
  {
    documentKey: 'doc_averageCostOrCostBasisElection',
    name: 'Average Cost or Cost Basis Election',
    category: 'Tax',
    description: 'Written election selecting or changing the cost-basis method for eligible positions.',
    typicalAccountTypes: 'IND, JNT, ENT, TRT',
    critical: false,
    active: true,
    notes: 'Public LPL and BNY materials explicitly treat average-cost selection as a written election.',
    displayOrder: 71
  },
  {
    documentKey: 'doc_subscriptionAgreement',
    name: 'Subscription Agreement',
    category: 'Alternative Assets',
    description: 'Issuer-level subscription document for a private fund, limited partnership, private credit, or other alternative investment.',
    typicalAccountTypes: 'ALT, ENT, TRT, IND',
    critical: true,
    active: true,
    notes: 'Core issuer document for private-placement and alternative holdings. Fidelity’s alternative investment profile explicitly requires issuer documents.',
    displayOrder: 72
  },
  {
    documentKey: 'doc_privatePlacementMemorandumReceiptOrAcknowledgment',
    name: 'Private Placement Memorandum Receipt or Acknowledgment',
    category: 'Alternative Assets',
    description: 'Investor acknowledgment that the offering memorandum or equivalent disclosure set was received and reviewed.',
    typicalAccountTypes: 'ALT',
    critical: true,
    active: true,
    notes: 'Commonly sponsor-required in private offerings and necessary for evidencing offering-package delivery in alternative accounts. This is a standard inference from the issuer-document requirement and qualified-investor alternative access structure.',
    displayOrder: 73
  },
  {
    documentKey: 'doc_accreditedInvestorQuestionnaire',
    name: 'Accredited Investor Questionnaire',
    category: 'Alternative Assets',
    description: 'Questionnaire or certification establishing accredited-investor eligibility where the offering requires it.',
    typicalAccountTypes: 'ALT, IND, JNT, TRT, ENT',
    critical: true,
    active: true,
    notes: 'Typically sponsor- or platform-required for private offerings available only to qualified investors. This is an inference supported by public alternative investment materials describing access restrictions and issuer-document intake.',
    displayOrder: 74
  },
  {
    documentKey: 'doc_qualifiedPurchaserOrQualifiedClientQuestionnaire',
    name: 'Qualified Purchaser or Qualified Client Questionnaire',
    category: 'Alternative Assets',
    description: 'Additional eligibility questionnaire for offerings requiring qualified purchaser or qualified client status beyond basic accreditation.',
    typicalAccountTypes: 'ALT, IND, JNT, TRT, ENT',
    critical: true,
    active: true,
    notes: 'Needed for higher-threshold private offerings and should be treated separately from basic accredited-investor evidence. This is an inference from issuer-document intake plus qualified-investor access controls in alternative platforms.',
    displayOrder: 75
  },
  {
    documentKey: 'doc_sponsorTransferOrAssignmentConsent',
    name: 'Sponsor Transfer or Assignment Consent',
    category: 'Alternative Assets',
    description: 'Sponsor, GP, manager, or transfer-agent consent needed to re-register or transfer an alternative holding.',
    typicalAccountTypes: 'ALT, TRT, ENT, EST',
    critical: true,
    active: true,
    notes: 'Especially important for non-ACAT direct-held alternatives, LP interests, and sponsor-controlled records.',
    displayOrder: 76
  },
  {
    documentKey: 'doc_insurancePolicyOrAnnuityContractCopy',
    name: 'Insurance Policy or Annuity Contract Copy',
    category: 'Insurance',
    description: 'Copy of the existing insurance policy or annuity contract used to verify owner, beneficiary, rider, surrender, and transfer details.',
    typicalAccountTypes: 'ANN',
    critical: true,
    active: true,
    notes: 'Insurance and annuity products are contract-based; review cannot be done cleanly without the contract or policy evidence.',
    displayOrder: 77
  },
  {
    documentKey: 'doc_1035ExchangeForm',
    name: '1035 Exchange Form',
    category: 'Insurance',
    description: 'Transfer/exchange paperwork used when replacing one annuity or insurance contract with another under Section 1035 rules.',
    typicalAccountTypes: 'ANN',
    critical: true,
    active: true,
    notes: 'Public Schwab and Fidelity materials explicitly reference 1035 exchange handling for annuity transitions.',
    displayOrder: 78
  },
  {
    documentKey: 'doc_insuranceOrAnnuityReplacementOrSuitabilityForm',
    name: 'Insurance or Annuity Replacement or Suitability Form',
    category: 'Insurance',
    description: 'Replacement disclosure, suitability profile, or comparable insurer paperwork used when rolling from one annuity/policy to another.',
    typicalAccountTypes: 'ANN',
    critical: true,
    active: true,
    notes: 'This is a standard insurance-operational requirement; insurer forms and annuity guidance show that suitability review is a defined paperwork set, not a verbal-only process.',
    displayOrder: 79
  },
  {
    documentKey: 'doc_mostRecentOutsideAccountStatement',
    name: 'Most Recent Outside Account Statement',
    category: 'Other',
    description: 'Latest statement from the delivering firm or company, used to validate registration, position details, and transfer instructions.',
    typicalAccountTypes: 'IND, JNT, IRA-T, IRA-R, TRT, ENT, ANN, ALT',
    critical: true,
    active: true,
    notes: 'Public transfer forms from LPL and Pershing explicitly require an attached recent statement for processing.',
    displayOrder: 80
  },
  {
    documentKey: 'doc_medallionSignatureGuaranteeOrNotarialCertification',
    name: 'Medallion Signature Guarantee or Notarial Certification',
    category: 'Other',
    description: 'Signature authentication or notarization evidence used for sensitive ownership, authority, or security-transfer requests.',
    typicalAccountTypes: 'IND, JNT, TRT, EST, ENT, ANN',
    critical: true,
    active: true,
    notes: 'Some transactions specifically require a medallion rather than a notary; Fidelity and BNY all make that distinction explicit.',
    displayOrder: 81
  },
  {
    documentKey: 'doc_physicalCertificateDepositOrStockOrBondPower',
    name: 'Physical Certificate Deposit or Stock or Bond Power',
    category: 'Other',
    description: 'Stock power, bond power, or certificate-deposit paperwork used to transfer physical certificates into street name or into the destination account.',
    typicalAccountTypes: 'IND, JNT, ENT, EST, TRT',
    critical: true,
    active: true,
    notes: 'Still relevant whenever legacy physical certificates appear in a household. Schwab, Fidelity, and BNY all publish specific stock/bond power materials.',
    displayOrder: 82
  }
];

function generateCSV() {
  const csvRows = [];
  csvRows.push(['Document Key', 'Name', 'Category', 'Description', 'Typical Account Types', 'Critical', 'Active', 'Notes', 'Display Order'].join(','));
  
  documentTypes.forEach(doc => {
    const row = [
      `"${doc.documentKey}"`,
      `"${doc.name}"`,
      `"${doc.category}"`,
      `"${doc.description.replace(/"/g, '""')}"`,
      `"${doc.typicalAccountTypes}"`,
      doc.critical ? 'Yes' : 'No',
      doc.active ? 'Yes' : 'No',
      `"${doc.notes.replace(/"/g, '""')}"`,
      doc.displayOrder
    ];
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
}

async function main() {
  // 1. Write the library as CSV file in the root workspace directory
  const csvContent = generateCSV();
  const csvPath = path.join(__dirname, '../document_types_library.csv');
  fs.writeFileSync(csvPath, csvContent, 'utf-8');
  console.log(`Successfully generated document_types_library.csv at: ${csvPath}`);

  // 2. Clear out any old DocumentTypes and batch upsert the new ones
  console.log('Upserting canonical document types into the database...');
  for (const doc of documentTypes) {
    await prisma.documentType.upsert({
      where: { documentKey: doc.documentKey },
      update: {
        name: doc.name,
        category: doc.category,
        description: doc.description,
        typicalAccountTypes: doc.typicalAccountTypes,
        critical: doc.critical,
        active: doc.active,
        notes: doc.notes,
        displayOrder: doc.displayOrder
      },
      create: {
        documentKey: doc.documentKey,
        name: doc.name,
        category: doc.category,
        description: doc.description,
        typicalAccountTypes: doc.typicalAccountTypes,
        critical: doc.critical,
        active: doc.active,
        notes: doc.notes,
        displayOrder: doc.displayOrder
      }
    });
  }
  console.log(`Database import of ${documentTypes.length} document types completed successfully.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
