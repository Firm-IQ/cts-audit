export interface AuditInput {
  emailCompletenessPercent: number;
  phoneCompletenessPercent: number;
  addressCompletenessPercent: number;
  householdingQualityScore: number;
  duplicateRecordRiskScore: number;
  clientNotesQualityScore: number;

  kycUpdateFrequency: string; // "Annual", "Triennial", "Ad-hoc"
  trustedContactCompletenessPercent: number;
  beneficiaryReviewStatus: string; // "Complete", "Incomplete", "None"
  riskToleranceCurrentPercent: number;
  investmentObjectiveCurrentPercent: number;
  missingSignatureRiskScore: number;
  documentStorageQualityScore: number;

  percentIraAccounts: number;
  percentTrustAccounts: number;
  percentEntityAccounts: number;
  percentAnnuityAltAccounts: number;
  directBusinessAmount: number;
  transferComplexityScore: number;

  staffCapacityScore: number;
  crmExportQualityScore: number;
  taskManagementScore: number;
  digitalSignatureReadinessScore: number;
  communicationPlanScore: number;

  protocolStatus: string; // "Yes", "No", "Unsure"
  employmentAgreementReviewed: boolean;
  nonSolicitNonCompeteConcerns: boolean;
  legalReviewStatus: string; // "Completed", "Pending", "None"
}

export interface CalculatedReadinessScores {
  clientDataScore: number;
  kycDocumentationScore: number;
  transferComplexityScoreVal: number;
  operationalScore: number;
  complianceProtocolScore: number;
  communicationScore: number;
  overallReadinessScore: number;
}

export function calculateReadinessScores(data: AuditInput): CalculatedReadinessScores {
  // 1. Client Data Score (20% Weight)
  // Average of: email, phone, address, householding, (11-duplicateRecordRisk)*10, clientNotes*10
  const householdingVal = Math.min(10, Math.max(1, data.householdingQualityScore)) * 10;
  const duplicateRiskVal = (11 - Math.min(10, Math.max(1, data.duplicateRecordRiskScore))) * 10;
  const clientNotesVal = Math.min(10, Math.max(1, data.clientNotesQualityScore)) * 10;
  const clientDataScore = (
    data.emailCompletenessPercent +
    data.phoneCompletenessPercent +
    data.addressCompletenessPercent +
    householdingVal +
    duplicateRiskVal +
    clientNotesVal
  ) / 6;

  // 2. KYC / Documentation Score (25% Weight)
  // Average of: kyc frequency, trusted contact, beneficiary review, risk tolerance, investment objective, (11-missingSignatureRisk)*10, docStorage*10
  let kycFreqVal = 30;
  if (data.kycUpdateFrequency === "Annual") kycFreqVal = 100;
  else if (data.kycUpdateFrequency === "Triennial") kycFreqVal = 60;
  
  let benReviewVal = 0;
  if (data.beneficiaryReviewStatus === "Complete") benReviewVal = 100;
  else if (data.beneficiaryReviewStatus === "Incomplete") benReviewVal = 50;

  const missingSigRiskVal = (11 - Math.min(10, Math.max(1, data.missingSignatureRiskScore))) * 10;
  const docStorageVal = Math.min(10, Math.max(1, data.documentStorageQualityScore)) * 10;

  const kycDocumentationScore = (
    kycFreqVal +
    data.trustedContactCompletenessPercent +
    benReviewVal +
    data.riskToleranceCurrentPercent +
    data.investmentObjectiveCurrentPercent +
    missingSigRiskVal +
    docStorageVal
  ) / 7;

  // 3. Transfer Complexity ScoreVal (15% Weight)
  // Higher complexity = worse readiness. Base is (11 - complexityScore)*10.
  // We deduct 10 points if annuity/alt accounts percentage is > 20%
  const baseComplexityVal = (11 - Math.min(10, Math.max(1, data.transferComplexityScore))) * 10;
  let penalty = 0;
  if (data.percentAnnuityAltAccounts > 20) penalty += 10;
  if (data.directBusinessAmount > 1000000) penalty += 5; // Direct business > $1M has overhead
  const transferComplexityScoreVal = Math.max(0, baseComplexityVal - penalty);

  // 4. Operational Score (15% Weight)
  // Average of: staffCapacity*10, crmExport*10, taskManagement*10, digitalSignature*10
  const staffCapVal = Math.min(10, Math.max(1, data.staffCapacityScore)) * 10;
  const crmExportVal = Math.min(10, Math.max(1, data.crmExportQualityScore)) * 10;
  const taskMgmtVal = Math.min(10, Math.max(1, data.taskManagementScore)) * 10;
  const digSigVal = Math.min(10, Math.max(1, data.digitalSignatureReadinessScore)) * 10;
  const operationalScore = (staffCapVal + crmExportVal + taskMgmtVal + digSigVal) / 4;

  // 5. Compliance & Protocol Score (15% Weight)
  // Average of: protocolStatus (Yes=100, No=30, Unsure=50), employmentAgreementReviewed (True=100, False=30),
  // nonSolicitNonCompeteConcerns (True=20, False=100), legalReviewStatus (Completed=100, Pending=50, None=0)
  let protocolVal = 50;
  if (data.protocolStatus === "Yes") protocolVal = 100;
  else if (data.protocolStatus === "No") protocolVal = 30;

  const agreementVal = data.employmentAgreementReviewed ? 100 : 30;
  const nonSolicitVal = data.nonSolicitNonCompeteConcerns ? 20 : 100;

  let legalVal = 0;
  if (data.legalReviewStatus === "Completed") legalVal = 100;
  else if (data.legalReviewStatus === "Pending") legalVal = 50;

  const complianceProtocolScore = (protocolVal + agreementVal + nonSolicitVal + legalVal) / 4;

  // 6. Communication Score (10% Weight)
  // Derived directly from communicationPlanScore * 10
  const communicationScore = Math.min(10, Math.max(1, data.communicationPlanScore)) * 10;

  // Overall Know Your Book™ Index
  // Client Data 20%, KYC 25%, Transfer Complexity 15%, Operational 15%, Compliance 15%, Communication 10%
  const overallReadinessScore = (
    clientDataScore * 0.20 +
    kycDocumentationScore * 0.25 +
    transferComplexityScoreVal * 0.15 +
    operationalScore * 0.15 +
    complianceProtocolScore * 0.15 +
    communicationScore * 0.10
  );

  return {
    clientDataScore: Math.round(clientDataScore * 10) / 10,
    kycDocumentationScore: Math.round(kycDocumentationScore * 10) / 10,
    transferComplexityScoreVal: Math.round(transferComplexityScoreVal * 10) / 10,
    operationalScore: Math.round(operationalScore * 10) / 10,
    complianceProtocolScore: Math.round(complianceProtocolScore * 10) / 10,
    communicationScore: Math.round(communicationScore * 10) / 10,
    overallReadinessScore: Math.round(overallReadinessScore * 10) / 10,
  };
}

export function getScoreRating(score: number): { rating: "Green" | "Yellow" | "Red"; label: string; bgClass: string; textClass: string; borderClass: string } {
  if (score >= 80) {
    return { rating: "Green", label: "Ready / Low Risk", bgClass: "bg-emerald-950/40", textClass: "text-emerald-400", borderClass: "border-emerald-500/30" };
  } else if (score >= 60) {
    return { rating: "Yellow", label: "Advisory / Moderate Risk", bgClass: "bg-amber-950/40", textClass: "text-amber-400", borderClass: "border-amber-500/30" };
  } else {
    return { rating: "Red", label: "Critical / High Risk", bgClass: "bg-rose-950/40", textClass: "text-rose-400", borderClass: "border-rose-500/30" };
  }
}
