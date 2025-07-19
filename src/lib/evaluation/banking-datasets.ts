import { Client } from 'langsmith'

export interface BankingEvaluationDatapoint {
  inputs: {
    question: string
    context?: Record<string, any>
    queryType?: 'general' | 'compliance' | 'loan_calculation'
  }
  outputs: {
    expected_answer: string
    expected_confidence_min: number
    expected_sources_min: number
    evaluation_criteria: string[]
  }
  metadata: {
    category: string
    difficulty: 'easy' | 'medium' | 'hard'
    banking_domain: string[]
    requires_calculation: boolean
    regulatory_refs?: string[]
  }
}

// Loan Products Dataset (50 questions)
export const loanProductsDataset: BankingEvaluationDatapoint[] = [
  {
    inputs: {
      question: "What is the minimum age requirement for a mortgage application?",
      queryType: "general"
    },
    outputs: {
      expected_answer: "18 years old",
      expected_confidence_min: 80,
      expected_sources_min: 1,
      evaluation_criteria: ["contains_age_requirement", "references_mortgage_policy"]
    },
    metadata: {
      category: "loan_eligibility",
      difficulty: "easy",
      banking_domain: ["mortgages", "age_requirements"],
      requires_calculation: false
    }
  },
  {
    inputs: {
      question: "What is the maximum age at the end of a mortgage term?",
      queryType: "general"
    },
    outputs: {
      expected_answer: "70 years old or retirement age, whichever is sooner",
      expected_confidence_min: 75,
      expected_sources_min: 1,
      evaluation_criteria: ["contains_max_age", "mentions_retirement_age_alternative"]
    },
    metadata: {
      category: "loan_eligibility",
      difficulty: "medium",
      banking_domain: ["mortgages", "age_limits"],
      requires_calculation: false
    }
  },
  {
    inputs: {
      question: "Calculate monthly payment for a $250,000 loan over 30 years",
      queryType: "loan_calculation",
      context: { loanAmount: 250000, loanTerm: 360, loanType: "conventional_mortgage" }
    },
    outputs: {
      expected_answer: "Monthly payment calculation with current interest rate",
      expected_confidence_min: 70,
      expected_sources_min: 1,
      evaluation_criteria: ["contains_monthly_payment", "shows_calculation_method", "includes_interest_rate"]
    },
    metadata: {
      category: "loan_calculation",
      difficulty: "hard",
      banking_domain: ["mortgages", "calculations"],
      requires_calculation: true
    }
  },
  {
    inputs: {
      question: "What are the current fixed mortgage rates for Premier customers?",
      queryType: "general"
    },
    outputs: {
      expected_answer: "Current Premier fixed mortgage rates with specific percentages",
      expected_confidence_min: 75,
      expected_sources_min: 1,
      evaluation_criteria: ["contains_specific_rates", "mentions_premier_products", "includes_effective_dates"]
    },
    metadata: {
      category: "interest_rates",
      difficulty: "medium",
      banking_domain: ["mortgages", "premier_banking", "rates"],
      requires_calculation: false
    }
  },
  {
    inputs: {
      question: "What is the minimum and maximum loan amount for Premier Exclusive products?",
      queryType: "general"
    },
    outputs: {
      expected_answer: "Minimum £5,000, Maximum £2,000,000",
      expected_confidence_min: 85,
      expected_sources_min: 1,
      evaluation_criteria: ["contains_minimum_amount", "contains_maximum_amount", "mentions_premier_exclusive"]
    },
    metadata: {
      category: "loan_limits",
      difficulty: "easy",
      banking_domain: ["mortgages", "premier_banking"],
      requires_calculation: false
    }
  }
  // Additional 45 loan product questions would be added here...
]

// Regulatory Compliance Dataset (30 questions)
export const regulatoryComplianceDataset: BankingEvaluationDatapoint[] = [
  {
    inputs: {
      question: "Are mortgages available for business purposes?",
      queryType: "compliance",
      context: { regulations: ["mortgage_regulations", "business_lending"] }
    },
    outputs: {
      expected_answer: "No, mortgages are not available for business purposes",
      expected_confidence_min: 90,
      expected_sources_min: 1,
      evaluation_criteria: ["explicitly_states_not_available", "references_business_purpose_restriction"]
    },
    metadata: {
      category: "mortgage_compliance",
      difficulty: "easy",
      banking_domain: ["mortgages", "business_lending"],
      requires_calculation: false,
      regulatory_refs: ["mortgage_regulations"]
    }
  },
  {
    inputs: {
      question: "What security is required for mortgage lending?",
      queryType: "compliance"
    },
    outputs: {
      expected_answer: "A first charge over the property is required as security",
      expected_confidence_min: 85,
      expected_sources_min: 1,
      evaluation_criteria: ["mentions_first_charge", "references_property_security"]
    },
    metadata: {
      category: "security_requirements",
      difficulty: "medium",
      banking_domain: ["mortgages", "security"],
      requires_calculation: false,
      regulatory_refs: ["lending_security"]
    }
  },
  {
    inputs: {
      question: "What documentation is required for Buy-to-Let affordability assessment?",
      queryType: "compliance"
    },
    outputs: {
      expected_answer: "ICR calculation or detailed affordability assessment considering personal and rental income",
      expected_confidence_min: 75,
      expected_sources_min: 1,
      evaluation_criteria: ["mentions_ICR", "mentions_affordability_assessment", "references_rental_income"]
    },
    metadata: {
      category: "btl_compliance",
      difficulty: "hard",
      banking_domain: ["buy_to_let", "affordability"],
      requires_calculation: false,
      regulatory_refs: ["BTL_regulations"]
    }
  }
  // Additional 27 compliance questions would be added here...
]

// Table Cross-References Dataset (25 questions)
export const tableCrossReferencesDataset: BankingEvaluationDatapoint[] = [
  {
    inputs: {
      question: "What are the Early Repayment Charges mentioned in the rate table?",
      queryType: "general"
    },
    outputs: {
      expected_answer: "Specific ERC percentages and conditions from rate table",
      expected_confidence_min: 80,
      expected_sources_min: 1,
      evaluation_criteria: ["contains_specific_percentages", "references_table_data", "mentions_conditions"]
    },
    metadata: {
      category: "table_reference",
      difficulty: "medium",
      banking_domain: ["charges", "tables"],
      requires_calculation: false
    }
  },
  {
    inputs: {
      question: "Compare the 2-year and 3-year fixed rate products",
      queryType: "general"
    },
    outputs: {
      expected_answer: "Comparison showing rates, terms, and features for both products",
      expected_confidence_min: 75,
      expected_sources_min: 2,
      evaluation_criteria: ["compares_both_products", "shows_rate_differences", "references_multiple_tables"]
    },
    metadata: {
      category: "table_comparison",
      difficulty: "hard",
      banking_domain: ["fixed_rates", "product_comparison"],
      requires_calculation: false
    }
  }
  // Additional 23 table cross-reference questions would be added here...
]

// Complete evaluation dataset
export const completeBankingDataset: BankingEvaluationDatapoint[] = [
  ...loanProductsDataset,
  ...regulatoryComplianceDataset,
  ...tableCrossReferencesDataset
]

// Dataset creation utility
export const createLangSmithDataset = async (
  datasetName: string,
  dataset: BankingEvaluationDatapoint[]
) => {
  const client = new Client({
    apiKey: process.env.LANGSMITH_API_KEY,
    apiUrl: process.env.LANGSMITH_ENDPOINT || 'https://api.smith.langchain.com'
  })

  try {
    // Create the dataset
    const createdDataset = await client.createDataset(datasetName, {
      description: `Banking RAG evaluation dataset for ${datasetName}`,
      metadata: {
        domain: 'banking',
        evaluation_type: 'rag_accuracy',
        total_questions: dataset.length
      }
    })

    // Add examples to the dataset
    for (const example of dataset) {
      await client.createExample(
        example.inputs,
        example.outputs,
        {
          datasetId: createdDataset.id,
          metadata: example.metadata
        }
      )
    }

    console.log(`Created dataset ${datasetName} with ${dataset.length} examples`)
    return createdDataset
  } catch (error) {
    console.error(`Failed to create dataset ${datasetName}:`, error)
    throw error
  }
}

// Dataset statistics
export const getDatasetStats = () => {
  return {
    loan_products: {
      total: loanProductsDataset.length,
      by_difficulty: {
        easy: loanProductsDataset.filter(d => d.metadata.difficulty === 'easy').length,
        medium: loanProductsDataset.filter(d => d.metadata.difficulty === 'medium').length,
        hard: loanProductsDataset.filter(d => d.metadata.difficulty === 'hard').length
      },
      requires_calculation: loanProductsDataset.filter(d => d.metadata.requires_calculation).length
    },
    regulatory_compliance: {
      total: regulatoryComplianceDataset.length,
      by_difficulty: {
        easy: regulatoryComplianceDataset.filter(d => d.metadata.difficulty === 'easy').length,
        medium: regulatoryComplianceDataset.filter(d => d.metadata.difficulty === 'medium').length,
        hard: regulatoryComplianceDataset.filter(d => d.metadata.difficulty === 'hard').length
      }
    },
    table_cross_references: {
      total: tableCrossReferencesDataset.length,
      by_difficulty: {
        easy: tableCrossReferencesDataset.filter(d => d.metadata.difficulty === 'easy').length,
        medium: tableCrossReferencesDataset.filter(d => d.metadata.difficulty === 'medium').length,
        hard: tableCrossReferencesDataset.filter(d => d.metadata.difficulty === 'hard').length
      }
    },
    total: completeBankingDataset.length
  }
} 