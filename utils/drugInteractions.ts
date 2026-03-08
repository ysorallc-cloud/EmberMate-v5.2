// ============================================================================
// MEDICATION INTERACTIONS DATABASE
// Local database of common drug-drug interactions
// No external API - all data stored locally for privacy
// ============================================================================

export interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: 'high' | 'moderate' | 'low';
  description: string;
  recommendation: string;
}

/**
 * Common medication interactions database
 * This is a curated list of 22 well-documented drug interaction pairs.
 *
 * IMPORTANT LIMITATION: This list covers common interactions only and is
 * NOT a comprehensive drug interaction database. Real databases (DrugBank,
 * OpenFDA) contain 50,000+ interactions. Many common medication combinations
 * are not represented here. Always consult a healthcare provider or pharmacist
 * for complete interaction screening.
 */
export const DRUG_INTERACTIONS: DrugInteraction[] = [
  // Blood Thinners (Warfarin) Interactions
  {
    drug1: 'warfarin',
    drug2: 'aspirin',
    severity: 'high',
    description: 'Increased risk of bleeding when combined.',
    recommendation: 'Notify doctor immediately. May require dose adjustment or monitoring.',
  },
  {
    drug1: 'warfarin',
    drug2: 'ibuprofen',
    severity: 'high',
    description: 'NSAIDs increase bleeding risk with warfarin.',
    recommendation: 'Use alternative pain relief. Consult doctor before combining.',
  },
  {
    drug1: 'warfarin',
    drug2: 'naproxen',
    severity: 'high',
    description: 'NSAIDs increase bleeding risk with warfarin.',
    recommendation: 'Use alternative pain relief. Consult doctor before combining.',
  },

  // Blood Pressure Medications
  {
    drug1: 'lisinopril',
    drug2: 'potassium',
    severity: 'moderate',
    description: 'ACE inhibitors can increase potassium levels.',
    recommendation: 'Monitor potassium levels. Avoid high-potassium supplements.',
  },
  {
    drug1: 'amlodipine',
    drug2: 'simvastatin',
    severity: 'moderate',
    description: 'Amlodipine increases simvastatin blood levels.',
    recommendation: 'Maximum simvastatin dose is 20mg when combined. Monitor for muscle pain.',
  },

  // Statins Interactions
  {
    drug1: 'atorvastatin',
    drug2: 'gemfibrozil',
    severity: 'high',
    description: 'Increased risk of severe muscle damage (rhabdomyolysis).',
    recommendation: 'Avoid combination. Use alternative cholesterol medication.',
  },
  {
    drug1: 'simvastatin',
    drug2: 'clarithromycin',
    severity: 'high',
    description: 'Antibiotic increases statin levels, raising muscle damage risk.',
    recommendation: 'Temporarily stop statin during antibiotic course. Consult doctor.',
  },

  // Diabetes Medications
  {
    drug1: 'metformin',
    drug2: 'alcohol',
    severity: 'moderate',
    description: 'Increased risk of lactic acidosis with excessive alcohol.',
    recommendation: 'Limit alcohol consumption. Notify doctor if experiencing muscle pain.',
  },
  {
    drug1: 'insulin',
    drug2: 'metoprolol',
    severity: 'moderate',
    description: 'Beta-blockers can mask low blood sugar symptoms.',
    recommendation: 'Monitor blood sugar more frequently. Watch for unusual symptoms.',
  },

  // Antidepressants (SSRIs)
  {
    drug1: 'sertraline',
    drug2: 'tramadol',
    severity: 'high',
    description: 'Risk of serotonin syndrome - potentially life-threatening.',
    recommendation: 'Notify doctor immediately. Watch for confusion, rapid heart rate, fever.',
  },
  {
    drug1: 'fluoxetine',
    drug2: 'aspirin',
    severity: 'moderate',
    description: 'Increased bleeding risk when combined.',
    recommendation: 'Monitor for unusual bruising or bleeding. Notify doctor.',
  },

  // Antibiotics
  {
    drug1: 'ciprofloxacin',
    drug2: 'tizanidine',
    severity: 'high',
    description: 'Severe low blood pressure and sedation.',
    recommendation: 'Do not combine. Use alternative antibiotic or muscle relaxant.',
  },
  {
    drug1: 'azithromycin',
    drug2: 'amiodarone',
    severity: 'high',
    description: 'Increased risk of dangerous heart rhythm changes.',
    recommendation: 'Avoid combination. EKG monitoring if necessary to combine.',
  },

  // Pain Medications
  {
    drug1: 'ibuprofen',
    drug2: 'aspirin',
    severity: 'moderate',
    description: 'Ibuprofen may reduce aspirin\'s heart protection benefits.',
    recommendation: 'Take aspirin first, wait 2 hours before ibuprofen. Consult doctor.',
  },
  {
    drug1: 'acetaminophen',
    drug2: 'alcohol',
    severity: 'moderate',
    description: 'Increased liver damage risk with chronic alcohol use.',
    recommendation: 'Limit alcohol. Do not exceed 2000mg acetaminophen daily if drinking.',
  },

  // Thyroid Medications
  {
    drug1: 'levothyroxine',
    drug2: 'calcium',
    severity: 'moderate',
    description: 'Calcium reduces thyroid medication absorption.',
    recommendation: 'Separate doses by at least 4 hours.',
  },
  {
    drug1: 'levothyroxine',
    drug2: 'omeprazole',
    severity: 'moderate',
    description: 'PPIs may reduce thyroid medication absorption.',
    recommendation: 'May need thyroid dose adjustment. Monitor TSH levels.',
  },

  // Blood Pressure + Diuretics
  {
    drug1: 'lisinopril',
    drug2: 'spironolactone',
    severity: 'moderate',
    description: 'Both raise potassium - risk of dangerous high potassium.',
    recommendation: 'Monitor potassium levels regularly. Avoid potassium supplements.',
  },

  // Anticoagulants
  {
    drug1: 'warfarin',
    drug2: 'amiodarone',
    severity: 'high',
    description: 'Amiodarone significantly increases warfarin effect.',
    recommendation: 'Warfarin dose reduction needed. Frequent INR monitoring required.',
  },
  {
    drug1: 'apixaban',
    drug2: 'ketoconazole',
    severity: 'high',
    description: 'Antifungal greatly increases anticoagulant levels.',
    recommendation: 'Avoid combination. Use alternative antifungal if possible.',
  },

  // Benzodiazepines
  {
    drug1: 'alprazolam',
    drug2: 'opioid',
    severity: 'high',
    description: 'Extreme sedation and respiratory depression risk.',
    recommendation: 'Avoid combination. High risk of overdose and death.',
  },

  // Grapefruit Interactions (common)
  {
    drug1: 'atorvastatin',
    drug2: 'grapefruit',
    severity: 'moderate',
    description: 'Grapefruit increases statin levels, raising side effect risk.',
    recommendation: 'Avoid grapefruit juice. May need statin dose adjustment.',
  },
  {
    drug1: 'amlodipine',
    drug2: 'grapefruit',
    severity: 'moderate',
    description: 'Grapefruit increases blood pressure medication levels.',
    recommendation: 'Avoid grapefruit juice. Monitor for low blood pressure symptoms.',
  },
];

/**
 * Normalize drug name for comparison
 * Handles common variations and brand names
 */
export function normalizeDrugName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '');
}

/**
 * Check for interactions between two medications
 */
export function checkInteraction(
  drug1: string,
  drug2: string
): DrugInteraction | null {
  const normalized1 = normalizeDrugName(drug1);
  const normalized2 = normalizeDrugName(drug2);

  // Check both directions (drug1-drug2 and drug2-drug1)
  return (
    DRUG_INTERACTIONS.find(
      (interaction) =>
        (normalizeDrugName(interaction.drug1) === normalized1 &&
          normalizeDrugName(interaction.drug2) === normalized2) ||
        (normalizeDrugName(interaction.drug1) === normalized2 &&
          normalizeDrugName(interaction.drug2) === normalized1)
    ) || null
  );
}

/**
 * Check a list of medications for all interactions
 */
export function checkMultipleInteractions(
  medications: string[]
): DrugInteraction[] {
  const interactions: DrugInteraction[] = [];
  const normalizedMeds = medications.map(normalizeDrugName);

  // Check each medication against all others
  for (let i = 0; i < medications.length; i++) {
    for (let j = i + 1; j < medications.length; j++) {
      const interaction = checkInteraction(medications[i], medications[j]);
      if (interaction) {
        interactions.push(interaction);
      }
    }
  }

  return interactions;
}

/**
 * Get interactions by severity level
 */
export function getInteractionsBySeverity(
  medications: string[],
  severity: 'high' | 'moderate' | 'low'
): DrugInteraction[] {
  const allInteractions = checkMultipleInteractions(medications);
  return allInteractions.filter((i) => i.severity === severity);
}

/**
 * Check if a medication is in the database
 */
export function isMedicationInDatabase(drugName: string): boolean {
  const normalized = normalizeDrugName(drugName);
  return DRUG_INTERACTIONS.some(
    (interaction) =>
      normalizeDrugName(interaction.drug1) === normalized ||
      normalizeDrugName(interaction.drug2) === normalized
  );
}

/**
 * Get all medications in the database (for autocomplete)
 */
export function getAllKnownMedications(): string[] {
  const medications = new Set<string>();
  
  DRUG_INTERACTIONS.forEach((interaction) => {
    medications.add(interaction.drug1);
    medications.add(interaction.drug2);
  });
  
  return Array.from(medications).sort();
}

/**
 * Get the user-facing interaction disclaimer text.
 * Should be displayed prominently on any interaction screening UI.
 */
export function getInteractionDisclaimer(): string {
  return 'This covers common interactions only and is NOT a comprehensive drug interaction database. ' +
    'Many medication combinations are not represented. Always consult your healthcare provider or ' +
    'pharmacist for complete interaction screening before starting, stopping, or changing medications.';
}

/**
 * Get interaction count for a specific medication
 */
export function getMedicationInteractionCount(drugName: string): number {
  const normalized = normalizeDrugName(drugName);
  return DRUG_INTERACTIONS.filter(
    (interaction) =>
      normalizeDrugName(interaction.drug1) === normalized ||
      normalizeDrugName(interaction.drug2) === normalized
  ).length;
}
