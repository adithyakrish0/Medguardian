"""
Enhanced Medication Interaction Checker with 50+ Drug Interactions
Knowledge Graph-based risk scoring system for MedGuardian

Categories covered:
- Blood Thinners/Anticoagulants
- Cardiac Medications
- Pain & NSAIDs
- Diabetes Medications
- CNS/Psychiatric
- Antibiotics
- Gastrointestinal
- Thyroid
- Respiratory
"""
import logging
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class Severity(Enum):
    """Interaction severity levels with associated risk weights"""
    CRITICAL = ("critical", 40)
    MAJOR = ("major", 25)
    MODERATE = ("moderate", 10)
    MINOR = ("minor", 3)
    
    @property
    def label(self) -> str:
        return self.value[0]
    
    @property
    def weight(self) -> int:
        return self.value[1]


# =============================================================================
# COMPREHENSIVE DRUG INTERACTION DATABASE (50+ Interactions)
# Curated from FDA, DrugBank, and clinical guidelines
# =============================================================================

DRUG_INTERACTIONS = [
    # -------------------------------------------------------------------------
    # CATEGORY: BLOOD THINNERS / ANTICOAGULANTS (10 interactions)
    # -------------------------------------------------------------------------
    {
        'medication1': 'Warfarin',
        'medication2': 'Aspirin',
        'severity': 'critical',
        'category': 'blood_thinners',
        'description': 'Both medications increase bleeding risk. Aspirin enhances the anticoagulant effect of warfarin, significantly increasing risk of major hemorrhage.',
        'recommendation': 'AVOID combination. If absolutely necessary, use lowest aspirin dose (81mg) with frequent INR monitoring. Seek immediate medical attention for any signs of bleeding.',
        'source': 'FDA',
        'risk_factors': ['elderly', 'liver_disease', 'renal_impairment', 'history_of_bleeding']
    },
    {
        'medication1': 'Warfarin',
        'medication2': 'Ibuprofen',
        'severity': 'critical',
        'category': 'blood_thinners',
        'description': 'Ibuprofen inhibits platelet function and can cause GI bleeding. Combined with warfarin, bleeding risk is dramatically increased.',
        'recommendation': 'AVOID NSAIDs with warfarin. Use acetaminophen for pain relief. If NSAID necessary, use shortest duration with PPI protection.',
        'source': 'FDA',
        'risk_factors': ['elderly', 'high_dosage', 'chronic_use']
    },
    {
        'medication1': 'Warfarin',
        'medication2': 'Omeprazole',
        'severity': 'moderate',
        'category': 'blood_thinners',
        'description': 'Omeprazole can inhibit CYP2C19 metabolism of warfarin, potentially increasing warfarin levels and bleeding risk.',
        'recommendation': 'Monitor INR closely when starting or stopping omeprazole. Consider using pantoprazole as safer alternative.',
        'source': 'DrugBank',
        'risk_factors': ['high_warfarin_dose']
    },
    {
        'medication1': 'Rivaroxaban',
        'medication2': 'Aspirin',
        'severity': 'major',
        'category': 'blood_thinners',
        'description': 'Dual antiplatelet/anticoagulant therapy significantly increases bleeding risk, including intracranial hemorrhage.',
        'recommendation': 'Combination requires cardiology oversight. Regular bleeding risk assessment. Report any unusual bruising or bleeding immediately.',
        'source': 'FDA',
        'risk_factors': ['elderly', 'renal_impairment', 'low_body_weight']
    },
    {
        'medication1': 'Apixaban',
        'medication2': 'Ketoconazole',
        'severity': 'major',
        'category': 'blood_thinners',
        'description': 'Ketoconazole strongly inhibits CYP3A4 and P-gp, dramatically increasing apixaban levels and bleeding risk.',
        'recommendation': 'AVOID combination. If unavoidable, reduce apixaban dose by 50%. Monitor closely for bleeding.',
        'source': 'FDA',
        'risk_factors': ['renal_impairment']
    },
    {
        'medication1': 'Clopidogrel',
        'medication2': 'Omeprazole',
        'severity': 'major',
        'category': 'blood_thinners',
        'description': 'Omeprazole inhibits CYP2C19, reducing conversion of clopidogrel to its active metabolite, decreasing antiplatelet effect.',
        'recommendation': 'Use pantoprazole instead of omeprazole. Monitor for cardiovascular events. Consider platelet function testing.',
        'source': 'FDA',
        'risk_factors': ['cardiac_stent', 'recent_mi']
    },
    {
        'medication1': 'Heparin',
        'medication2': 'Aspirin',
        'severity': 'major',
        'category': 'blood_thinners',
        'description': 'Additive anticoagulant effects increase risk of hemorrhage.',
        'recommendation': 'Use only under close medical supervision with frequent aPTT monitoring.',
        'source': 'Clinical Guidelines',
        'risk_factors': ['surgery', 'trauma']
    },
    {
        'medication1': 'Warfarin',
        'medication2': 'Vitamin K',
        'severity': 'major',
        'category': 'blood_thinners',
        'description': 'Vitamin K directly antagonizes warfarin effect, reducing anticoagulation.',
        'recommendation': 'Maintain consistent vitamin K intake. Avoid sudden changes in leafy green vegetable consumption.',
        'source': 'Clinical Guidelines',
        'risk_factors': ['dietary_changes']
    },
    {
        'medication1': 'Dabigatran',
        'medication2': 'Rifampin',
        'severity': 'major',
        'category': 'blood_thinners',
        'description': 'Rifampin is a strong P-gp inducer that significantly reduces dabigatran levels, risking thromboembolic events.',
        'recommendation': 'AVOID combination. Consider alternative antibiotic or anticoagulant.',
        'source': 'FDA',
        'risk_factors': ['atrial_fibrillation', 'dvt']
    },
    {
        'medication1': 'Enoxaparin',
        'medication2': 'Ibuprofen',
        'severity': 'major',
        'category': 'blood_thinners',
        'description': 'NSAIDs increase bleeding risk with low molecular weight heparins.',
        'recommendation': 'Avoid NSAIDs during enoxaparin therapy. Use acetaminophen for pain.',
        'source': 'Clinical Guidelines',
        'risk_factors': ['elderly', 'renal_impairment']
    },
    
    # -------------------------------------------------------------------------
    # CATEGORY: CARDIAC MEDICATIONS (10 interactions)
    # -------------------------------------------------------------------------
    {
        'medication1': 'Metoprolol',
        'medication2': 'Verapamil',
        'severity': 'critical',
        'category': 'cardiac',
        'description': 'Both drugs slow heart rate and conduction. Combined use can cause severe bradycardia, heart block, or cardiac arrest.',
        'recommendation': 'AVOID combination unless under cardiologist supervision with continuous monitoring. Watch for dizziness, syncope.',
        'source': 'FDA',
        'risk_factors': ['heart_disease', 'elderly', 'renal_impairment']
    },
    {
        'medication1': 'Digoxin',
        'medication2': 'Amiodarone',
        'severity': 'critical',
        'category': 'cardiac',
        'description': 'Amiodarone increases digoxin levels by 70-100%, risking life-threatening digoxin toxicity with arrhythmias.',
        'recommendation': 'Reduce digoxin dose by 50% when starting amiodarone. Monitor digoxin levels and ECG frequently.',
        'source': 'FDA',
        'risk_factors': ['renal_impairment', 'elderly', 'hypokalemia']
    },
    {
        'medication1': 'Lisinopril',
        'medication2': 'Potassium supplements',
        'severity': 'major',
        'category': 'cardiac',
        'description': 'ACE inhibitors reduce potassium excretion. Additional potassium supplementation can cause dangerous hyperkalemia.',
        'recommendation': 'Avoid potassium supplements unless prescribed for documented deficiency. Monitor serum potassium regularly.',
        'source': 'DrugBank',
        'risk_factors': ['diabetes', 'kidney_disease', 'elderly']
    },
    {
        'medication1': 'Lisinopril',
        'medication2': 'Spironolactone',
        'severity': 'major',
        'category': 'cardiac',
        'description': 'Both drugs increase potassium levels. Combination significantly increases hyperkalemia risk.',
        'recommendation': 'Monitor potassium levels closely. Start with low doses of spironolactone. Educate on signs of hyperkalemia.',
        'source': 'Clinical Guidelines',
        'risk_factors': ['renal_impairment', 'diabetes', 'elderly']
    },
    {
        'medication1': 'Amlodipine',
        'medication2': 'Simvastatin',
        'severity': 'major',
        'category': 'cardiac',
        'description': 'Amlodipine inhibits CYP3A4, increasing simvastatin levels and risk of rhabdomyolysis.',
        'recommendation': 'Limit simvastatin to 20mg/day when combined with amlodipine. Monitor for muscle pain or weakness.',
        'source': 'FDA',
        'risk_factors': ['elderly', 'hypothyroidism', 'renal_impairment']
    },
    {
        'medication1': 'Atenolol',
        'medication2': 'Clonidine',
        'severity': 'major',
        'category': 'cardiac',
        'description': 'Abrupt discontinuation of either drug with the other can cause severe rebound hypertension.',
        'recommendation': 'Never abruptly stop either medication. Taper beta-blocker first if discontinuing both.',
        'source': 'Clinical Guidelines',
        'risk_factors': ['hypertension']
    },
    {
        'medication1': 'Diltiazem',
        'medication2': 'Metoprolol',
        'severity': 'major',
        'category': 'cardiac',
        'description': 'Both drugs have negative inotropic and chronotropic effects. Combined use risks severe bradycardia.',
        'recommendation': 'Use with caution under cardiology guidance. Monitor heart rate and blood pressure closely.',
        'source': 'DrugBank',
        'risk_factors': ['heart_failure', 'elderly']
    },
    {
        'medication1': 'Furosemide',
        'medication2': 'Digoxin',
        'severity': 'moderate',
        'category': 'cardiac',
        'description': 'Furosemide-induced hypokalemia increases sensitivity to digoxin toxicity.',
        'recommendation': 'Monitor potassium levels. Consider potassium supplementation or potassium-sparing diuretic.',
        'source': 'Clinical Guidelines',
        'risk_factors': ['poor_dietary_intake', 'diarrhea']
    },
    {
        'medication1': 'Losartan',
        'medication2': 'Lithium',
        'severity': 'major',
        'category': 'cardiac',
        'description': 'ARBs reduce lithium excretion, increasing lithium levels and toxicity risk.',
        'recommendation': 'Monitor lithium levels closely when starting, stopping, or changing losartan dose.',
        'source': 'DrugBank',
        'risk_factors': ['elderly', 'dehydration']
    },
    {
        'medication1': 'Nitroglycerin',
        'medication2': 'Sildenafil',
        'severity': 'critical',
        'category': 'cardiac',
        'description': 'Combined use causes severe, potentially fatal hypotension due to additive vasodilatory effects.',
        'recommendation': 'ABSOLUTELY CONTRAINDICATED. Wait at least 24-48 hours between these medications.',
        'source': 'FDA',
        'risk_factors': ['coronary_artery_disease']
    },
    
    # -------------------------------------------------------------------------
    # CATEGORY: PAIN & NSAIDs (8 interactions)
    # -------------------------------------------------------------------------
    {
        'medication1': 'Aspirin',
        'medication2': 'Ibuprofen',
        'severity': 'major',
        'category': 'pain_nsaids',
        'description': 'Both are NSAIDs that increase risk of gastrointestinal bleeding and ulcers. Ibuprofen may also reduce aspirin\'s cardioprotective effect.',
        'recommendation': 'Avoid concurrent use. Space at least 2-4 hours apart if both are necessary. Take aspirin 30 min before ibuprofen.',
        'source': 'FDA',
        'risk_factors': ['elderly', 'history_of_stomach_issues', 'high_dosage']
    },
    {
        'medication1': 'Prednisone',
        'medication2': 'Ibuprofen',
        'severity': 'major',
        'category': 'pain_nsaids',
        'description': 'Both medications increase risk of GI bleeding and peptic ulcers through different mechanisms.',
        'recommendation': 'Use GI protection (PPI) if combination is necessary. Take with food. Watch for black stools or abdominal pain.',
        'source': 'NIH',
        'risk_factors': ['elderly', 'high_dosage', 'long_term_use', 'history_of_ulcers']
    },
    {
        'medication1': 'Naproxen',
        'medication2': 'Lisinopril',
        'severity': 'moderate',
        'category': 'pain_nsaids',
        'description': 'NSAIDs can reduce the antihypertensive effect of ACE inhibitors and may worsen renal function.',
        'recommendation': 'Monitor blood pressure and kidney function. Use lowest NSAID dose for shortest duration.',
        'source': 'DrugBank',
        'risk_factors': ['renal_impairment', 'heart_failure']
    },
    {
        'medication1': 'Celecoxib',
        'medication2': 'Warfarin',
        'severity': 'major',
        'category': 'pain_nsaids',
        'description': 'COX-2 inhibitors increase bleeding risk and may elevate INR when combined with warfarin.',
        'recommendation': 'Monitor INR closely. Use lowest effective dose. Consider alternative pain management.',
        'source': 'FDA',
        'risk_factors': ['elderly']
    },
    {
        'medication1': 'Tramadol',
        'medication2': 'Sertraline',
        'severity': 'critical',
        'category': 'pain_nsaids',
        'description': 'Both drugs increase serotonin levels. Combined use risks serotonin syndrome - a potentially life-threatening condition.',
        'recommendation': 'Use with extreme caution. Watch for agitation, hyperthermia, rapid heartbeat, muscle rigidity. Seek emergency care if symptoms occur.',
        'source': 'FDA',
        'risk_factors': ['high_dosage', 'other_serotonergic_drugs']
    },
    {
        'medication1': 'Morphine',
        'medication2': 'Diazepam',
        'severity': 'critical',
        'category': 'pain_nsaids',
        'description': 'Opioids and benzodiazepines both cause CNS depression. Combined use dramatically increases risk of respiratory depression and death.',
        'recommendation': 'FDA BLACK BOX WARNING. Avoid combination. If necessary, use lowest doses with close monitoring.',
        'source': 'FDA',
        'risk_factors': ['elderly', 'respiratory_disease', 'sleep_apnea']
    },
    {
        'medication1': 'Oxycodone',
        'medication2': 'Alprazolam',
        'severity': 'critical',
        'category': 'pain_nsaids',
        'description': 'Concurrent opioid and benzodiazepine use is the leading cause of overdose deaths.',
        'recommendation': 'FDA BLACK BOX WARNING. Avoid if possible. If used together, limit dose and duration.',
        'source': 'FDA',
        'risk_factors': ['substance_abuse', 'elderly', 'respiratory_conditions']
    },
    {
        'medication1': 'Hydrocodone',
        'medication2': 'Gabapentin',
        'severity': 'major',
        'category': 'pain_nsaids',
        'description': 'Gabapentinoids increase opioid-related respiratory depression risk.',
        'recommendation': 'FDA warning issued. Use lowest effective doses. Monitor for sedation and respiratory depression.',
        'source': 'FDA',
        'risk_factors': ['elderly', 'renal_impairment', 'other_cns_depressants']
    },
    
    # -------------------------------------------------------------------------
    # CATEGORY: DIABETES MEDICATIONS (7 interactions)
    # -------------------------------------------------------------------------
    {
        'medication1': 'Metformin',
        'medication2': 'Iodinated contrast dye',
        'severity': 'critical',
        'category': 'diabetes',
        'description': 'Contrast dye can cause acute kidney injury, preventing metformin excretion and risking life-threatening lactic acidosis.',
        'recommendation': 'STOP metformin 48 hours before contrast procedures. Resume only after kidney function is confirmed normal.',
        'source': 'FDA',
        'risk_factors': ['renal_impairment', 'dehydration', 'elderly']
    },
    {
        'medication1': 'Metformin',
        'medication2': 'Alcohol',
        'severity': 'major',
        'category': 'diabetes',
        'description': 'Both metformin and alcohol increase lactic acid production. Combined use significantly increases lactic acidosis risk.',
        'recommendation': 'Limit alcohol consumption. Avoid binge drinking. Monitor for symptoms: muscle pain, weakness, unusual fatigue.',
        'source': 'FDA',
        'risk_factors': ['liver_disease', 'binge_drinking']
    },
    {
        'medication1': 'Insulin',
        'medication2': 'Metoprolol',
        'severity': 'moderate',
        'category': 'diabetes',
        'description': 'Beta-blockers can mask hypoglycemia symptoms (tachycardia, tremor) and delay glucose recovery.',
        'recommendation': 'More frequent glucose monitoring. Educate patient on atypical hypoglycemia symptoms (sweating, confusion).',
        'source': 'Clinical Guidelines',
        'risk_factors': ['tight_glucose_control', 'hypoglycemia_unawareness']
    },
    {
        'medication1': 'Glipizide',
        'medication2': 'Fluconazole',
        'severity': 'major',
        'category': 'diabetes',
        'description': 'Fluconazole inhibits CYP2C9, increasing glipizide levels and causing prolonged, severe hypoglycemia.',
        'recommendation': 'Monitor glucose closely. Consider reducing glipizide dose by 50% during fluconazole therapy.',
        'source': 'DrugBank',
        'risk_factors': ['elderly', 'renal_impairment']
    },
    {
        'medication1': 'Pioglitazone',
        'medication2': 'Furosemide',
        'severity': 'moderate',
        'category': 'diabetes',
        'description': 'Thiazolidinediones cause fluid retention. Combination with diuretics may indicate or worsen heart failure.',
        'recommendation': 'Monitor for edema and weight gain. Hold pioglitazone if heart failure symptoms develop.',
        'source': 'FDA',
        'risk_factors': ['heart_failure_history']
    },
    {
        'medication1': 'Metformin',
        'medication2': 'Topiramate',
        'severity': 'moderate',
        'category': 'diabetes',
        'description': 'Topiramate increases metformin levels and may increase risk of lactic acidosis.',
        'recommendation': 'Monitor for lactic acidosis symptoms. Consider dose adjustment.',
        'source': 'DrugBank',
        'risk_factors': ['renal_impairment']
    },
    {
        'medication1': 'Glyburide',
        'medication2': 'Ciprofloxacin',
        'severity': 'major',
        'category': 'diabetes',
        'description': 'Fluoroquinolones can cause severe hypoglycemia or hyperglycemia unpredictably.',
        'recommendation': 'Close glucose monitoring during and after antibiotic course.',
        'source': 'FDA',
        'risk_factors': ['elderly', 'renal_impairment']
    },
    
    # -------------------------------------------------------------------------
    # CATEGORY: CNS / PSYCHIATRIC (8 interactions)
    # -------------------------------------------------------------------------
    {
        'medication1': 'Fluoxetine',
        'medication2': 'Tramadol',
        'severity': 'critical',
        'category': 'cns_psychiatric',
        'description': 'Both increase serotonin. High risk of serotonin syndrome - potentially fatal with hyperthermia and seizures.',
        'recommendation': 'AVOID combination. If necessary, use lowest doses with close monitoring. Stop immediately if symptoms occur.',
        'source': 'FDA',
        'risk_factors': ['other_serotonergic_drugs']
    },
    {
        'medication1': 'Sertraline',
        'medication2': 'MAO inhibitors',
        'severity': 'critical',
        'category': 'cns_psychiatric',
        'description': 'CONTRAINDICATED. Causes severe, often fatal serotonin syndrome.',
        'recommendation': 'NEVER combine. Allow 14-day washout period between stopping MAOI and starting SSRI.',
        'source': 'FDA',
        'risk_factors': []
    },
    {
        'medication1': 'Lithium',
        'medication2': 'Ibuprofen',
        'severity': 'major',
        'category': 'cns_psychiatric',
        'description': 'NSAIDs reduce lithium excretion, increasing lithium levels and toxicity risk.',
        'recommendation': 'Avoid NSAIDs if possible. If needed, monitor lithium levels closely. Use acetaminophen instead.',
        'source': 'DrugBank',
        'risk_factors': ['dehydration', 'elderly']
    },
    {
        'medication1': 'Quetiapine',
        'medication2': 'Ketoconazole',
        'severity': 'major',
        'category': 'cns_psychiatric',
        'description': 'Ketoconazole inhibits CYP3A4, significantly increasing quetiapine levels and side effect risk.',
        'recommendation': 'Reduce quetiapine dose to 1/6th when combined with strong CYP3A4 inhibitors.',
        'source': 'FDA',
        'risk_factors': []
    },
    {
        'medication1': 'Carbamazepine',
        'medication2': 'Oral contraceptives',
        'severity': 'major',
        'category': 'cns_psychiatric',
        'description': 'Carbamazepine induces metabolism of contraceptives, significantly reducing their effectiveness.',
        'recommendation': 'Use alternative contraception (IUD, higher-dose pills). Counsel on pregnancy prevention.',
        'source': 'FDA',
        'risk_factors': ['female_of_childbearing_age']
    },
    {
        'medication1': 'Escitalopram',
        'medication2': 'Ondansetron',
        'severity': 'major',
        'category': 'cns_psychiatric',
        'description': 'Both drugs prolong QT interval. Combined use increases risk of dangerous arrhythmias.',
        'recommendation': 'Avoid combination if possible. If needed, obtain baseline ECG and monitor.',
        'source': 'FDA',
        'risk_factors': ['heart_disease', 'electrolyte_imbalance']
    },
    {
        'medication1': 'Alprazolam',
        'medication2': 'Alcohol',
        'severity': 'critical',
        'category': 'cns_psychiatric',
        'description': 'Additive CNS depression causing profound sedation, respiratory depression, coma, or death.',
        'recommendation': 'AVOID alcohol completely while taking benzodiazepines.',
        'source': 'FDA',
        'risk_factors': ['elderly', 'respiratory_disease']
    },
    {
        'medication1': 'Duloxetine',
        'medication2': 'Linezolid',
        'severity': 'critical',
        'category': 'cns_psychiatric',
        'description': 'Linezolid is a weak MAOI. Combined with SNRIs causes serotonin syndrome.',
        'recommendation': 'CONTRAINDICATED. Stop duloxetine before linezolid therapy if possible.',
        'source': 'FDA',
        'risk_factors': []
    },
    
    # -------------------------------------------------------------------------
    # CATEGORY: ANTIBIOTICS (6 interactions)
    # -------------------------------------------------------------------------
    {
        'medication1': 'Ciprofloxacin',
        'medication2': 'Theophylline',
        'severity': 'major',
        'category': 'antibiotics',
        'description': 'Ciprofloxacin inhibits theophylline metabolism, increasing levels and toxicity risk (seizures, arrhythmias).',
        'recommendation': 'Avoid combination if possible. If used, reduce theophylline dose by 30-50% and monitor levels.',
        'source': 'FDA',
        'risk_factors': ['elderly', 'liver_disease']
    },
    {
        'medication1': 'Metronidazole',
        'medication2': 'Alcohol',
        'severity': 'major',
        'category': 'antibiotics',
        'description': 'Disulfiram-like reaction causing severe nausea, vomiting, flushing, tachycardia.',
        'recommendation': 'AVOID alcohol during and 48 hours after metronidazole. Check for alcohol in medications.',
        'source': 'FDA',
        'risk_factors': []
    },
    {
        'medication1': 'Erythromycin',
        'medication2': 'Simvastatin',
        'severity': 'critical',
        'category': 'antibiotics',
        'description': 'Erythromycin inhibits CYP3A4, dramatically increasing simvastatin levels and rhabdomyolysis risk.',
        'recommendation': 'CONTRAINDICATED. Temporarily stop simvastatin during erythromycin course.',
        'source': 'FDA',
        'risk_factors': ['elderly', 'high_statin_dose']
    },
    {
        'medication1': 'Tetracycline',
        'medication2': 'Calcium supplements',
        'severity': 'moderate',
        'category': 'antibiotics',
        'description': 'Calcium chelates tetracycline, dramatically reducing antibiotic absorption and effectiveness.',
        'recommendation': 'Take tetracycline 2 hours before or 4 hours after calcium products.',
        'source': 'DrugBank',
        'risk_factors': []
    },
    {
        'medication1': 'Clarithromycin',
        'medication2': 'Colchicine',
        'severity': 'critical',
        'category': 'antibiotics',
        'description': 'Clarithromycin inhibits colchicine metabolism, causing life-threatening colchicine toxicity.',
        'recommendation': 'AVOID combination, especially in renal/hepatic impairment. Fatalities reported.',
        'source': 'FDA',
        'risk_factors': ['renal_impairment', 'liver_disease']
    },
    {
        'medication1': 'Rifampin',
        'medication2': 'Oral contraceptives',
        'severity': 'major',
        'category': 'antibiotics',
        'description': 'Rifampin is a potent enzyme inducer that dramatically reduces contraceptive effectiveness.',
        'recommendation': 'Use alternative non-hormonal contraception during rifampin therapy.',
        'source': 'FDA',
        'risk_factors': ['female_of_childbearing_age']
    },
    
    # -------------------------------------------------------------------------
    # CATEGORY: GASTROINTESTINAL (4 interactions)
    # -------------------------------------------------------------------------
    {
        'medication1': 'Simvastatin',
        'medication2': 'Grapefruit juice',
        'severity': 'major',
        'category': 'gastrointestinal',
        'description': 'Grapefruit inhibits CYP3A4, increasing simvastatin levels 10-15x and causing rhabdomyolysis.',
        'recommendation': 'AVOID grapefruit and grapefruit juice completely while on simvastatin.',
        'source': 'FDA',
        'risk_factors': ['high_statin_dose', 'elderly']
    },
    {
        'medication1': 'Antacids',
        'medication2': 'Levothyroxine',
        'severity': 'moderate',
        'category': 'gastrointestinal',
        'description': 'Antacids reduce levothyroxine absorption, leading to inadequate thyroid hormone levels.',
        'recommendation': 'Take levothyroxine 4 hours apart from antacids.',
        'source': 'DrugBank',
        'risk_factors': ['hypothyroidism']
    },
    {
        'medication1': 'Sucralfate',
        'medication2': 'Ciprofloxacin',
        'severity': 'major',
        'category': 'gastrointestinal',
        'description': 'Sucralfate contains aluminum which chelates ciprofloxacin, reducing absorption by 90%.',
        'recommendation': 'Take ciprofloxacin 2 hours before or 6 hours after sucralfate.',
        'source': 'DrugBank',
        'risk_factors': ['active_infection']
    },
    {
        'medication1': 'Metoclopramide',
        'medication2': 'Levodopa',
        'severity': 'major',
        'category': 'gastrointestinal',
        'description': 'Metoclopramide blocks dopamine receptors, directly antagonizing levodopa\'s effect on Parkinson\'s.',
        'recommendation': 'AVOID metoclopramide in Parkinson\'s patients. Use domperidone if available.',
        'source': 'Clinical Guidelines',
        'risk_factors': ['parkinsons_disease']
    },
    
    # -------------------------------------------------------------------------
    # CATEGORY: THYROID (3 interactions)
    # -------------------------------------------------------------------------
    {
        'medication1': 'Levothyroxine',
        'medication2': 'Calcium supplements',
        'severity': 'moderate',
        'category': 'thyroid',
        'description': 'Calcium binds to levothyroxine in GI tract, reducing absorption by up to 20-25%.',
        'recommendation': 'Take levothyroxine at least 4 hours before or after calcium products.',
        'source': 'DrugBank',
        'risk_factors': ['hypothyroidism']
    },
    {
        'medication1': 'Levothyroxine',
        'medication2': 'Iron supplements',
        'severity': 'moderate',
        'category': 'thyroid',
        'description': 'Iron forms insoluble complex with levothyroxine, significantly reducing absorption.',
        'recommendation': 'Separate doses by at least 4 hours. Take levothyroxine on empty stomach.',
        'source': 'DrugBank',
        'risk_factors': ['anemia']
    },
    {
        'medication1': 'Amiodarone',
        'medication2': 'Levothyroxine',
        'severity': 'major',
        'category': 'thyroid',
        'description': 'Amiodarone contains high iodine content and affects thyroid function unpredictably.',
        'recommendation': 'Monitor thyroid function tests every 3 months during amiodarone therapy.',
        'source': 'FDA',
        'risk_factors': ['pre_existing_thyroid_disease']
    },
    
    # -------------------------------------------------------------------------
    # CATEGORY: RESPIRATORY (4 interactions)
    # -------------------------------------------------------------------------
    {
        'medication1': 'Albuterol',
        'medication2': 'Propranolol',
        'severity': 'major',
        'category': 'respiratory',
        'description': 'Non-selective beta-blockers antagonize bronchodilator effect and can trigger bronchospasm.',
        'recommendation': 'Use cardioselective beta-blockers (metoprolol) if beta-blocker needed in asthma/COPD.',
        'source': 'Clinical Guidelines',
        'risk_factors': ['asthma', 'copd']
    },
    {
        'medication1': 'Theophylline',
        'medication2': 'Erythromycin',
        'severity': 'major',
        'category': 'respiratory',
        'description': 'Erythromycin inhibits theophylline metabolism, increasing levels and causing toxicity.',
        'recommendation': 'Monitor theophylline levels. Consider dose reduction or alternative antibiotic.',
        'source': 'FDA',
        'risk_factors': ['liver_disease']
    },
    {
        'medication1': 'Fluticasone',
        'medication2': 'Ritonavir',
        'severity': 'major',
        'category': 'respiratory',
        'description': 'Ritonavir inhibits CYP3A4, dramatically increasing fluticasone levels and causing Cushing syndrome.',
        'recommendation': 'Use alternative corticosteroid (beclomethasone) or alternative HIV therapy.',
        'source': 'FDA',
        'risk_factors': ['hiv_infection']
    },
    {
        'medication1': 'Montelukast',
        'medication2': 'Phenobarbital',
        'severity': 'moderate',
        'category': 'respiratory',
        'description': 'Phenobarbital induces CYP enzymes, reducing montelukast levels and effectiveness.',
        'recommendation': 'Monitor asthma control. May need alternative asthma therapy.',
        'source': 'DrugBank',
        'risk_factors': ['epilepsy']
    },
]


class InteractionChecker:
    """
    Enhanced interaction checker with knowledge graph representation.
    Uses rule-based scoring with NetworkX graph for visualization.
    """
    
    def __init__(self):
        self.interactions = DRUG_INTERACTIONS
        self._build_interaction_index()
    
    def _build_interaction_index(self):
        """Build fast lookup index for drug interactions"""
        self.interaction_index = {}
        for interaction in self.interactions:
            # Normalize drug names to lowercase
            drug1 = interaction['medication1'].lower()
            drug2 = interaction['medication2'].lower()
            
            # Store both directions for fast lookup
            if drug1 not in self.interaction_index:
                self.interaction_index[drug1] = {}
            self.interaction_index[drug1][drug2] = interaction
            
            if drug2 not in self.interaction_index:
                self.interaction_index[drug2] = {}
            self.interaction_index[drug2][drug1] = interaction
    
    def check_interactions(self, medication_names: List[str]) -> List[Dict]:
        """
        Check for interactions between a list of medications.
        
        Args:
            medication_names: List of medication names to check
            
        Returns:
            List of interaction dictionaries found
        """
        if not medication_names or len(medication_names) < 2:
            return []
        
        interactions_found = []
        seen_pairs = set()
        
        # Normalize names
        normalized_names = [name.lower().strip() for name in medication_names]
        
        # Check all pairs
        for i, drug1 in enumerate(normalized_names):
            for drug2 in normalized_names[i+1:]:
                # Create canonical pair key to avoid duplicates
                pair_key = tuple(sorted([drug1, drug2]))
                if pair_key in seen_pairs:
                    continue
                seen_pairs.add(pair_key)
                
                # Check for interaction
                interaction = self._find_interaction(drug1, drug2)
                if interaction:
                    interactions_found.append(interaction.copy())
        
        # Sort by severity (critical first)
        severity_order = {'critical': 0, 'major': 1, 'moderate': 2, 'minor': 3}
        interactions_found.sort(key=lambda x: severity_order.get(x['severity'], 4))
        
        return interactions_found
    
    def _find_interaction(self, drug1: str, drug2: str) -> Optional[Dict]:
        """Find interaction between two drugs using the index"""
        # Direct lookup
        if drug1 in self.interaction_index:
            if drug2 in self.interaction_index[drug1]:
                return self.interaction_index[drug1][drug2]
        
        # Partial matching for common variations
        for indexed_drug in self.interaction_index.keys():
            if indexed_drug in drug1 or drug1 in indexed_drug:
                for other_drug, interaction in self.interaction_index[indexed_drug].items():
                    if other_drug in drug2 or drug2 in other_drug:
                        return interaction
        
        return None
    
    def calculate_risk_score(self, interactions: List[Dict]) -> Tuple[int, str]:
        """
        Calculate overall risk score (0-100) based on interactions found.
        
        Args:
            interactions: List of interaction dictionaries
            
        Returns:
            Tuple of (risk_score, risk_level)
        """
        if not interactions:
            return 0, 'safe'
        
        # Severity weights
        weights = {
            'critical': Severity.CRITICAL.weight,  # 40
            'major': Severity.MAJOR.weight,        # 25
            'moderate': Severity.MODERATE.weight,  # 10
            'minor': Severity.MINOR.weight         # 3
        }
        
        # Calculate weighted score
        total_score = 0
        for interaction in interactions:
            severity = interaction.get('severity', 'minor')
            total_score += weights.get(severity, 3)
        
        # Cap at 100, apply diminishing returns for many interactions
        if len(interactions) > 1:
            # Multiple interactions compound the risk
            multiplier = min(1.5, 1 + (len(interactions) - 1) * 0.15)
            total_score = int(total_score * multiplier)
        
        risk_score = min(100, total_score)
        
        # Determine risk level
        if risk_score >= 70:
            risk_level = 'critical'
        elif risk_score >= 45:
            risk_level = 'high'
        elif risk_score >= 20:
            risk_level = 'moderate'
        elif risk_score > 0:
            risk_level = 'low'
        else:
            risk_level = 'safe'
        
        return risk_score, risk_level
    
    def get_interaction_summary(self, medication_names: List[str]) -> Dict:
        """
        Get comprehensive interaction analysis for a medication list.
        
        Args:
            medication_names: List of medication names
            
        Returns:
            Dictionary with risk score, level, interactions, and statistics
        """
        interactions = self.check_interactions(medication_names)
        risk_score, risk_level = self.calculate_risk_score(interactions)
        
        # Count by severity
        severity_counts = {'critical': 0, 'major': 0, 'moderate': 0, 'minor': 0}
        categories = set()
        
        for interaction in interactions:
            severity = interaction.get('severity', 'minor')
            severity_counts[severity] = severity_counts.get(severity, 0) + 1
            if 'category' in interaction:
                categories.add(interaction['category'])
        
        return {
            'risk_score': risk_score,
            'risk_level': risk_level,
            'total_interactions': len(interactions),
            'interactions': interactions,
            'severity_breakdown': severity_counts,
            'affected_categories': list(categories),
            'medications_checked': medication_names,
            'recommendation': self._generate_recommendation(risk_level, interactions)
        }
    
    def _generate_recommendation(self, risk_level: str, interactions: List[Dict]) -> str:
        """Generate overall recommendation based on risk analysis"""
        if risk_level == 'safe':
            return "✅ No drug interactions detected. Your medication regimen appears safe."
        
        recommendations = {
            'critical': "🚨 CRITICAL RISK: Contact your doctor or pharmacist IMMEDIATELY. Some of these interactions may be life-threatening.",
            'high': "⚠️ HIGH RISK: Schedule an urgent appointment with your healthcare provider to review your medications.",
            'moderate': "⚡ MODERATE RISK: Discuss these interactions with your doctor at your next visit. Monitor for any unusual symptoms.",
            'low': "ℹ️ LOW RISK: Minor interactions found. Be aware of possible effects but no immediate action needed."
        }
        
        base_rec = recommendations.get(risk_level, "Review with your healthcare provider.")
        
        # Add specific critical interaction warnings
        critical_interactions = [i for i in interactions if i.get('severity') == 'critical']
        if critical_interactions:
            base_rec += f"\n\n🔴 CRITICAL: {critical_interactions[0]['medication1']} + {critical_interactions[0]['medication2']}"
        
        return base_rec
    
    def get_graph_data(self, medication_names: List[str]) -> Dict:
        """
        Generate graph data for D3.js visualization.
        
        Returns nodes (medications) and edges (interactions) for rendering.
        """
        interactions = self.check_interactions(medication_names)
        
        # Create nodes for each medication
        nodes = []
        node_set = set()
        
        for name in medication_names:
            if name.lower() not in node_set:
                node_set.add(name.lower())
                nodes.append({
                    'id': name.lower(),
                    'label': name,
                    'hasInteraction': False
                })
        
        # Create edges for interactions and mark nodes
        edges = []
        for interaction in interactions:
            drug1 = interaction['medication1'].lower()
            drug2 = interaction['medication2'].lower()
            
            # Check if both drugs are in the patient's medication list
            drug1_in_list = any(drug1 in m.lower() or m.lower() in drug1 for m in medication_names)
            drug2_in_list = any(drug2 in m.lower() or m.lower() in drug2 for m in medication_names)
            
            if drug1_in_list and drug2_in_list:
                # Find matching node IDs
                source_id = next((n['id'] for n in nodes if drug1 in n['id'] or n['id'] in drug1), drug1)
                target_id = next((n['id'] for n in nodes if drug2 in n['id'] or n['id'] in drug2), drug2)
                
                edges.append({
                    'source': source_id,
                    'target': target_id,
                    'severity': interaction['severity'],
                    'description': interaction['description'][:100] + '...' if len(interaction['description']) > 100 else interaction['description']
                })
                
                # Mark nodes as having interactions
                for node in nodes:
                    if node['id'] == source_id or node['id'] == target_id:
                        node['hasInteraction'] = True
        
        return {
            'nodes': nodes,
            'edges': edges
        }
    
    def get_interaction_count(self) -> int:
        """Return total number of interactions in the database"""
        return len(self.interactions)
    
    def get_categories(self) -> List[str]:
        """Return list of interaction categories"""
        return list(set(i.get('category', 'other') for i in self.interactions))


# Global instance
interaction_checker = InteractionChecker()
