-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Read Only',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLogin" TIMESTAMP(3),
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Advisor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "firmName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "currentFirm" TEXT,
    "currentCustodian" TEXT,
    "futureCustodian" TEXT,
    "businessModel" TEXT NOT NULL DEFAULT 'Unknown',
    "protocolStatus" TEXT NOT NULL DEFAULT 'Unsure',
    "totalAum" DOUBLE PRECISION,
    "annualRevenue" DOUBLE PRECISION,
    "households" INTEGER,
    "accounts" INTEGER,
    "staffCount" INTEGER,
    "crm" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "Advisor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "advisorId" TEXT NOT NULL,
    "contactType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "company" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "mobilePhone" TEXT,
    "preferredContactMethod" TEXT NOT NULL DEFAULT 'Email',
    "roleInTransition" TEXT,
    "notes" TEXT,
    "primaryContact" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "advisorId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "emailCompletenessPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "phoneCompletenessPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "addressCompletenessPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "householdingQualityScore" INTEGER NOT NULL DEFAULT 1,
    "duplicateRecordRiskScore" INTEGER NOT NULL DEFAULT 1,
    "clientNotesQualityScore" INTEGER NOT NULL DEFAULT 1,
    "kycUpdateFrequency" TEXT NOT NULL DEFAULT 'Ad-hoc',
    "trustedContactCompletenessPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "beneficiaryReviewStatus" TEXT NOT NULL DEFAULT 'None',
    "riskToleranceCurrentPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "investmentObjectiveCurrentPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "missingSignatureRiskScore" INTEGER NOT NULL DEFAULT 1,
    "documentStorageQualityScore" INTEGER NOT NULL DEFAULT 1,
    "percentIraAccounts" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "percentTrustAccounts" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "percentEntityAccounts" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "percentAnnuityAltAccounts" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "directBusinessAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "heldAwayAssetsNotes" TEXT,
    "transferComplexityScore" INTEGER NOT NULL DEFAULT 1,
    "staffCapacityScore" INTEGER NOT NULL DEFAULT 1,
    "crmExportQualityScore" INTEGER NOT NULL DEFAULT 1,
    "taskManagementScore" INTEGER NOT NULL DEFAULT 1,
    "digitalSignatureReadinessScore" INTEGER NOT NULL DEFAULT 1,
    "communicationPlanScore" INTEGER NOT NULL DEFAULT 1,
    "employmentAgreementReviewed" BOOLEAN NOT NULL DEFAULT false,
    "nonSolicitNonCompeteConcerns" BOOLEAN NOT NULL DEFAULT false,
    "legalReviewStatus" TEXT NOT NULL DEFAULT 'None',
    "complianceRiskNotes" TEXT,
    "overallReadinessScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "clientDataScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "kycDocumentationScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "transferComplexityScoreVal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "operationalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "complianceProtocolScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "communicationScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdByUserId" TEXT,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "advisorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "entryType" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "detailedNotes" TEXT,
    "confidential" BOOLEAN NOT NULL DEFAULT false,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Finding" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "impact" TEXT,
    "recommendation" TEXT,
    "owner" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reviewerNotes" TEXT,
    "evidenceSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "priority" TEXT,
    "assignedTo" TEXT,
    "dueDate" TIMESTAMP(3),
    "resolutionNotes" TEXT,
    "householdId" TEXT,
    "accountId" TEXT,
    "checklistItemId" TEXT,

    CONSTRAINT "Finding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Household" (
    "id" TEXT NOT NULL,
    "advisorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "primaryClientName" TEXT NOT NULL,
    "secondaryClientName" TEXT,
    "totalAum" DOUBLE PRECISION,
    "revenue" DOUBLE PRECISION,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "assignedConsultant" TEXT,
    "notes" TEXT,
    "readinessStatus" TEXT NOT NULL DEFAULT 'Not Reviewed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "custodian" TEXT,
    "registration" TEXT,
    "notes" TEXT,
    "readinessStatus" TEXT NOT NULL DEFAULT 'Not Reviewed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountChecklistItem" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Not Applicable',
    "notes" TEXT NOT NULL DEFAULT '',
    "verifiedBy" TEXT NOT NULL DEFAULT '',
    "verifiedDate" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "requirementId" TEXT,

    CONSTRAINT "AccountChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "documentKey" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "typicalAccountTypes" TEXT NOT NULL DEFAULT 'All',
    "critical" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequirementLibrary" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "appliesToAccountTypes" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "critical" BOOLEAN NOT NULL DEFAULT false,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequirementLibrary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequirementProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequirementProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileRequirement" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'Required',
    "overrideWeight" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmMapping" (
    "id" TEXT NOT NULL,
    "crmType" TEXT NOT NULL,
    "mapping" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_DocumentTypeToRequirementLibrary" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DocumentTypeToRequirementLibrary_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AccountChecklistItem_accountId_itemKey_key" ON "AccountChecklistItem"("accountId", "itemKey");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentType_name_key" ON "DocumentType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentType_documentKey_key" ON "DocumentType"("documentKey");

-- CreateIndex
CREATE UNIQUE INDEX "RequirementProfile_name_key" ON "RequirementProfile"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileRequirement_profileId_requirementId_key" ON "ProfileRequirement"("profileId", "requirementId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountType_name_key" ON "AccountType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CrmMapping_crmType_key" ON "CrmMapping"("crmType");

-- CreateIndex
CREATE INDEX "_DocumentTypeToRequirementLibrary_B_index" ON "_DocumentTypeToRequirementLibrary"("B");

-- AddForeignKey
ALTER TABLE "Advisor" ADD CONSTRAINT "Advisor_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "Advisor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "Advisor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "Advisor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "AccountChecklistItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Household" ADD CONSTRAINT "Household_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "Advisor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountChecklistItem" ADD CONSTRAINT "AccountChecklistItem_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountChecklistItem" ADD CONSTRAINT "AccountChecklistItem_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "RequirementLibrary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileRequirement" ADD CONSTRAINT "ProfileRequirement_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "RequirementProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileRequirement" ADD CONSTRAINT "ProfileRequirement_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "RequirementLibrary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DocumentTypeToRequirementLibrary" ADD CONSTRAINT "_DocumentTypeToRequirementLibrary_A_fkey" FOREIGN KEY ("A") REFERENCES "DocumentType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DocumentTypeToRequirementLibrary" ADD CONSTRAINT "_DocumentTypeToRequirementLibrary_B_fkey" FOREIGN KEY ("B") REFERENCES "RequirementLibrary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

