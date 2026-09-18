import { Question } from '@/types';

export interface QuestionData {
  text: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  options: [string, string, string, string];
  correct_answer: string;
  explanation: string;
}

export const questionBank: QuestionData[] = [
  // Q1 — HARD (Answer: C)
  {
    text: "A retailer's revenue increases by 18%, but receivables increase by 40% and inventory by 30%. Operating cash flow declines. What should management examine first?",
    category: 'Finance & Working Capital',
    difficulty: 'hard',
    points: 15,
    options: [
      'A. Profitability efficiency',
      'B. Asset utilization efficiency',
      'C. Working-capital efficiency',
      'D. Revenue recognition efficiency',
    ],
    correct_answer: 'C. Working-capital efficiency',
    explanation: 'When receivables and inventory grow significantly faster than sales, cash becomes locked in working capital, causing operating cash flow to deteriorate.',
  },

  // Q2 — EASY (Answer: A)
  {
    text: 'A customer scans a QR code and transfers ₹500 directly from a bank account in India. Which system is primarily involved?',
    category: 'Technology, AI & FinTech',
    difficulty: 'easy',
    points: 5,
    options: [
      'A. UPI',
      'B. IMPS',
      'C. NEFT',
      'D. RTGS',
    ],
    correct_answer: 'A. UPI',
    explanation: 'Unified Payments Interface (UPI) powers instant, QR-code based direct bank-to-bank mobile transfers in India.',
  },

  // Q3 — HARD (Answer: B)
  {
    text: 'Two smartphone companies have similar technology, but one has a much stronger distribution network. What could represent its strategic advantage?',
    category: 'Corporate World & Strategy',
    difficulty: 'hard',
    points: 15,
    options: [
      'A. Valuable operational capability',
      'B. Valuable distribution capability',
      'C. Valuable administrative capability',
      'D. Valuable infrastructure capability',
    ],
    correct_answer: 'B. Valuable distribution capability',
    explanation: 'A superior distribution capability ensures wider market penetration, higher product accessibility, and sustainable competitive advantage.',
  },

  // Q4 — MEDIUM (Answer: D)
  {
    text: 'A ₹1,500 shirt is displayed next to a ₹4,000 shirt, making a ₹2,500 shirt appear reasonably priced. Which concept explains this?',
    category: 'Marketing & Consumer Behaviour',
    difficulty: 'medium',
    points: 10,
    options: [
      'A. Reference pricing',
      'B. Decoy pricing',
      'C. Comparative pricing',
      'D. Anchoring effect',
    ],
    correct_answer: 'D. Anchoring effect',
    explanation: 'The anchoring effect is a cognitive bias where initial exposure to a high price point anchors consumer perceptions of subsequent prices.',
  },

  // Q5 — HARD (Answer: A)
  {
    text: 'A FinTech company depends on an external bank API. An API disruption causes customer transactions to fail. Which issue becomes especially important?',
    category: 'Technology, AI & FinTech',
    difficulty: 'hard',
    points: 15,
    options: [
      'A. Third-party and operational risk management',
      'B. Credit and market risk management',
      'C. Compliance and regulatory risk management',
      'D. Strategic and reputational risk management',
    ],
    correct_answer: 'A. Third-party and operational risk management',
    explanation: 'Dependency on external technology partners introduces third-party dependency risks and operational vulnerability requiring robust risk governance.',
  },

  // Q6 — EASY (Answer: C)
  {
    text: "An employee's salary increases by 10%, while everyday prices increase by 12%. What happens to purchasing power?",
    category: 'Economy & Finance',
    difficulty: 'easy',
    points: 5,
    options: [
      'A. It increases because income increased',
      'B. It remains unchanged because both changed',
      'C. It decreases because prices rose faster',
      'D. It cannot change because salary increased',
    ],
    correct_answer: 'C. It decreases because prices rose faster',
    explanation: 'Purchasing power decreases because inflation (12%) outpaces nominal wage growth (10%), eroding real income.',
  },

  // Q7 — HARD (Answer: C)
  {
    text: 'A company reports ₹20 crore accounting profit but has negative operating cash flow. What is the most appropriate interpretation?',
    category: 'Economy & Finance',
    difficulty: 'hard',
    points: 15,
    options: [
      'A. The company has no operating profitability',
      'B. The company has an immediate solvency problem',
      'C. Profitability and cash generation can differ',
      'D. Accounting profit has no financial significance',
    ],
    correct_answer: 'C. Profitability and cash generation can differ',
    explanation: 'Accrual accounting records revenues when earned and expenses when incurred, meaning net profit and cash flow from operations frequently diverge.',
  },

  // Q8 — MEDIUM (Answer: A)
  {
    text: 'A food-delivery app remembers previous orders and recommends similar restaurants. What is the key resource enabling this activity?',
    category: 'Technology, AI & FinTech',
    difficulty: 'medium',
    points: 10,
    options: [
      'A. Customer data',
      'B. Customer inventory',
      'C. Customer infrastructure',
      'D. Customer distribution',
    ],
    correct_answer: 'A. Customer data',
    explanation: 'Historical customer data and behavioral patterns provide the essential training inputs for algorithmic recommendation engines.',
  },

  // Q9 — HARD (Answer: B)
  {
    text: 'A company develops a strong distribution capability, but competitors can reproduce a similar network within a short period. What does this suggest?',
    category: 'Corporate World & Strategy',
    difficulty: 'hard',
    points: 15,
    options: [
      'A. The capability guarantees a permanent advantage',
      'B. The capability may provide only a temporary advantage',
      'C. The capability has no strategic relevance',
      'D. The capability automatically eliminates competition',
    ],
    correct_answer: 'B. The capability may provide only a temporary advantage',
    explanation: 'Under the VRIO framework, easily imitable capabilities cannot yield a sustained competitive advantage, providing only transient benefit.',
  },

  // Q10 — EASY (Answer: D)
  {
    text: 'A company enters a completely different industry because growth in its existing industry has slowed. This strategy is:',
    category: 'Corporate World & Strategy',
    difficulty: 'easy',
    points: 5,
    options: [
      'A. Market development',
      'B. Product development',
      'C. Market penetration',
      'D. Diversification',
    ],
    correct_answer: 'D. Diversification',
    explanation: 'Venturing into an unfamiliar industry with new products represents a diversification strategy on Ansoff’s matrix.',
  },

  // Q11 — HARD (Answer: D)
  {
    text: 'An AI system processes millions of records, but management is concerned about biased outputs, privacy and incorrect decisions. What is most important?',
    category: 'Technology, AI & FinTech',
    difficulty: 'hard',
    points: 15,
    options: [
      'A. AI scalability and automation',
      'B. AI processing and integration',
      'C. AI performance and efficiency',
      'D. AI governance and responsible AI',
    ],
    correct_answer: 'D. AI governance and responsible AI',
    explanation: 'Responsible AI and AI governance frameworks establish policies, auditing, fairness metrics, and accountability mechanisms.',
  },

  // Q12 — MEDIUM (Answer: A)
  {
    text: 'A new company enters a highly competitive market with a relatively low price to attract customers quickly. What is the likely strategic objective?',
    category: 'Marketing & Consumer Behaviour',
    difficulty: 'medium',
    points: 10,
    options: [
      'A. Building market share',
      'B. Establishing premium positioning',
      'C. Increasing product exclusivity',
      'D. Reducing customer accessibility',
    ],
    correct_answer: 'A. Building market share',
    explanation: 'Penetration pricing leverages aggressive, lower price points to incentivize customer trial and secure market share rapidly.',
  },

  // Q13 — HARD (Answer: B)
  {
    text: 'A company has strong sales but repeatedly delays supplier payments because cash remains tied up in inventory and receivables. Which area requires the closest attention?',
    category: 'Finance & Working Capital',
    difficulty: 'hard',
    points: 15,
    options: [
      'A. Revenue generation management',
      'B. Working-capital management',
      'C. Market expansion management',
      'D. Product portfolio management',
    ],
    correct_answer: 'B. Working-capital management',
    explanation: 'Optimizing the cash conversion cycle (inventory days and debtor collection days) is vital to release liquidity and meet short-term obligations.',
  },

  // Q14 — EASY (Answer: D)
  {
    text: 'Thousands of positive online reviews make customers more willing to purchase a product. Which concept is most relevant?',
    category: 'Marketing & Consumer Behaviour',
    difficulty: 'easy',
    points: 5,
    options: [
      'A. Customer validation',
      'B. Reference influence',
      'C. Purchase reinforcement',
      'D. Social proof',
    ],
    correct_answer: 'D. Social proof',
    explanation: 'Social proof describes the psychological tendency of buyers to rely on positive collective behavior and customer testimonials.',
  },

  // Q15 — MEDIUM (Answer: C)
  {
    text: 'When interest rates remain high, which company is directly more exposed to increased financing costs?',
    category: 'Economy & Finance',
    difficulty: 'medium',
    points: 10,
    options: [
      'A. A company with substantial cash reserves',
      'B. A company with limited external financing',
      'C. A highly debt-funded company',
      'D. A company with minimal financial obligations',
    ],
    correct_answer: 'C. A highly debt-funded company',
    explanation: 'Companies with high leverage face escalating borrowing and debt-servicing burdens when benchmark interest rates remain elevated.',
  },

  // Q16 — HARD (Answer: B)
  {
    text: "A company copies a competitor's product and advertising almost completely, giving customers little reason to choose it. What strategic problem is most evident?",
    category: 'Corporate World & Strategy',
    difficulty: 'hard',
    points: 15,
    options: [
      'A. Lack of competitive positioning',
      'B. Lack of differentiation',
      'C. Lack of brand distinctiveness',
      'D. Lack of value-chain integration',
    ],
    correct_answer: 'B. Lack of differentiation',
    explanation: 'Failing to establish distinct product features or brand identity results in a lack of differentiation and leaves customers indifferent.',
  },

  // Q17 — EASY (Answer: D)
  {
    text: 'A company changes its advertising and packaging to appeal specifically to teenagers while keeping the basic product similar. What is it primarily doing?',
    category: 'Marketing & Consumer Behaviour',
    difficulty: 'easy',
    points: 5,
    options: [
      'A. Repositioning the brand',
      'B. Expanding market coverage',
      'C. Differentiating the product line',
      'D. Targeting a specific market segment',
    ],
    correct_answer: 'D. Targeting a specific market segment',
    explanation: 'Directing tailored messaging, visual styling, and packaging toward an identified age demographic is targeting a specific market segment.',
  },

  // Q18 — HARD (Answer: C)
  {
    text: 'An AI system analyzes thousands of complaints and identifies that two issues frequently appear together. What should management understand before making a decision?',
    category: 'Technology, AI & FinTech',
    difficulty: 'hard',
    points: 15,
    options: [
      'A. A detected pattern guarantees a causal relationship',
      'B. A detected pattern automatically guarantees profitability',
      'C. A detected pattern identifies an association, not necessarily causation',
      'D. A detected pattern eliminates the need for managerial judgment',
    ],
    correct_answer: 'C. A detected pattern identifies an association, not necessarily causation',
    explanation: 'Statistical correlation between two variables does not prove that one causes the other; root causes must be verified.',
  },

  // Q19 — MEDIUM (Answer: B)
  {
    text: 'A company adopts manufacturing in India while continuing production in other countries. What is the most relevant business objective?',
    category: 'Supply Chain & Operations',
    difficulty: 'medium',
    points: 10,
    options: [
      'A. Manufacturing diversification',
      'B. Supply-chain diversification',
      'C. Market diversification',
      'D. Production centralization',
    ],
    correct_answer: 'B. Supply-chain diversification',
    explanation: 'Operating manufacturing nodes across multiple countries builds supply-chain diversification, protecting against regional disruptions.',
  },

  // Q20 — HARD (Answer: A)
  {
    text: 'A smartphone company produces its own chips even though external suppliers may offer lower unit costs because of greater scale. What strategic trade-off is involved?',
    category: 'Corporate World & Strategy',
    difficulty: 'hard',
    points: 15,
    options: [
      'A. Greater control versus external cost efficiency',
      'B. Greater cost efficiency versus higher control',
      'C. Greater scale versus lower flexibility',
      'D. Greater customization versus higher investment',
    ],
    correct_answer: 'A. Greater control versus external cost efficiency',
    explanation: 'In-house chip production gives greater architectural control and IP protection, trading off the scale-driven cost savings of merchant suppliers.',
  },

  // Q21 — EASY (Answer: D)
  {
    text: 'A company has ₹10 lakh and chooses to open a new store instead of upgrading its existing store. The value of the next-best alternative represents:',
    category: 'Economy & Finance',
    difficulty: 'easy',
    points: 5,
    options: [
      'A. Strategic trade-off',
      'B. Investment sacrifice',
      'C. Resource allocation',
      'D. Opportunity cost',
    ],
    correct_answer: 'D. Opportunity cost',
    explanation: 'Opportunity cost quantifies the foregone benefit that could have been realized by selecting the best alternative investment option.',
  },

  // Q22 — HARD (Answer: C)
  {
    text: 'A highly debt-funded company faces persistently high interest rates. Which financial pressure is most immediate?',
    category: 'Economy & Finance',
    difficulty: 'hard',
    points: 15,
    options: [
      'A. Increased working-capital requirement',
      'B. Reduced profit margin',
      'C. Higher financing costs',
      'D. Lower asset utilization',
    ],
    correct_answer: 'C. Higher financing costs',
    explanation: 'High interest rates directly translate into immediate spikes in debt servicing expenses and financing costs on corporate balance sheets.',
  },

  // Q23 — MEDIUM (Answer: A)
  {
    text: 'A CEO claims there are no competitors because nobody sells exactly the same product. What is the strongest management response?',
    category: 'Corporate World & Strategy',
    difficulty: 'medium',
    points: 10,
    options: [
      'A. Substitutes can also create competition',
      'B. Competition requires identical products',
      'C. Competition depends only on direct rivals',
      'D. Competition exists only among large firms',
    ],
    correct_answer: 'A. Substitutes can also create competition',
    explanation: 'Substitute products addressing identical customer needs create substantial competitive pressure even without identical feature sets.',
  },

  // Q24 — HARD (Answer: D)
  {
    text: 'A product has Basic, Standard and Premium versions, and most customers select the Standard option. Which concept best explains this behaviour?',
    category: 'Marketing & Consumer Behaviour',
    difficulty: 'hard',
    points: 15,
    options: [
      'A. Relative price positioning',
      'B. Product-line expansion',
      'C. Choice-set simplification',
      'D. Reference-point anchoring',
    ],
    correct_answer: 'D. Reference-point anchoring',
    explanation: 'Framing products with high and low tiers establishes reference-point anchoring (compromise effect), making the middle tier most appealing.',
  },

  // Q25 — EASY (Answer: A)
  {
    text: 'A company uses AI to analyze thousands of customer complaints within minutes. What is the most direct benefit?',
    category: 'Technology, AI & FinTech',
    difficulty: 'easy',
    points: 5,
    options: [
      'A. Faster identification of patterns',
      'B. Faster resolution of customer complaints',
      'C. Faster improvement in profitability',
      'D. Faster reduction of business risk',
    ],
    correct_answer: 'A. Faster identification of patterns',
    explanation: 'AI NLP pipelines rapidly ingest and cluster large volumes of text data to spot common complaint patterns within minutes.',
  },

  // Q26 — HARD (Answer: B)
  {
    text: 'A company reports high accounting profits, but customers take several months to pay their invoices. What problem may arise?',
    category: 'Finance & Working Capital',
    difficulty: 'hard',
    points: 15,
    options: [
      'A. Profit margin pressure',
      'B. Liquidity pressure',
      'C. Revenue recognition pressure',
      'D. Market valuation pressure',
    ],
    correct_answer: 'B. Liquidity pressure',
    explanation: 'Extended debtor repayment timelines deplete liquid cash, creating liquidity pressure despite strong accounting profit figures.',
  },

  // Q27 — MEDIUM (Answer: B)
  {
    text: "A FinTech company uses another financial institution's banking infrastructure and APIs to provide services. This is an example of:",
    category: 'Technology, AI & FinTech',
    difficulty: 'medium',
    points: 10,
    options: [
      'A. Digital banking integration',
      'B. Banking-as-a-Service',
      'C. Financial platform sharing',
      'D. Open financial infrastructure',
    ],
    correct_answer: 'B. Banking-as-a-Service',
    explanation: 'Banking-as-a-Service (BaaS) enables FinTechs and platforms to integrate regulated financial capabilities via partner banking APIs.',
  },

  // Q28 — EASY (Answer: C)
  {
    text: 'An investor purchases shares expecting their market value to increase. The expected gain is known as:',
    category: 'Economy & Finance',
    difficulty: 'easy',
    points: 5,
    options: [
      'A. Investment yield',
      'B. Dividend income',
      'C. Capital appreciation',
      'D. Financial return',
    ],
    correct_answer: 'C. Capital appreciation',
    explanation: 'Capital appreciation refers specifically to the growth in the market price of an asset over its original purchase price.',
  },

  // Q29 — HARD (Answer: C)
  {
    text: 'A manufacturer wants to reduce dependence on one country for critical components. Which action directly addresses this concern?',
    category: 'Supply Chain & Operations',
    difficulty: 'hard',
    points: 15,
    options: [
      'A. Consolidate sourcing with a single supplier',
      'B. Increase inventory buffer stock',
      'C. Diversify sourcing locations',
      'D. Negotiate long-term single-supplier contracts',
    ],
    correct_answer: 'C. Diversify sourcing locations',
    explanation: 'Diversifying supplier geographies across multiple countries reduces geographic and geopolitical concentration risk.',
  },

  // Q30 — MEDIUM (Answer: A)
  {
    text: 'A restaurant is consistently crowded and customers wait 40 minutes for their food. Which management issue is most directly involved?',
    category: 'Supply Chain & Operations',
    difficulty: 'medium',
    points: 10,
    options: [
      'A. Capacity and process management',
      'B. Customer experience management',
      'C. Service quality management',
      'D. Demand and queue management',
    ],
    correct_answer: 'A. Capacity and process management',
    explanation: 'Bottlenecks in kitchen throughput, preparation staging, and capacity utilization are core challenges of capacity and process management.',
  },

  // Q31 — HARD (Answer: D)
  {
    text: 'Two products have similar prices and features, but one receives significantly more purchases because customers see thousands of positive reviews. Which factor is most directly influencing the decision?',
    category: 'Marketing & Consumer Behaviour',
    difficulty: 'hard',
    points: 15,
    options: [
      'A. Reference-price comparison',
      'B. Perceived quality signaling',
      'C. Brand loyalty effect',
      'D. Social proof',
    ],
    correct_answer: 'D. Social proof',
    explanation: 'High review counts and ratings provide credible social proof, reassuring prospective buyers and driving purchasing decisions.',
  },

  // Q32 — MEDIUM (Answer: A)
  {
    text: 'A company reports strong sales growth but struggles to pay suppliers and employees on time. What does this situation demonstrate?',
    category: 'Finance & Working Capital',
    difficulty: 'medium',
    points: 10,
    options: [
      'A. Revenue growth and cash availability are different',
      'B. Revenue growth automatically improves liquidity',
      'C. Higher sales directly increase cash reserves',
      'D. Market growth determines short-term liquidity',
    ],
    correct_answer: 'A. Revenue growth and cash availability are different',
    explanation: 'Sales growth does not guarantee cash flow; without disciplined cash collection, aggressive growth can trigger severe cash crunches.',
  },

  // Q33 — EASY (Answer: D)
  {
    text: 'A major driver of demand for advanced computing chips is:',
    category: 'Technology, AI & FinTech',
    difficulty: 'easy',
    points: 5,
    options: [
      'A. Digital communication',
      'B. Industrial automation',
      'C. Consumer electronics',
      'D. Artificial intelligence',
    ],
    correct_answer: 'D. Artificial intelligence',
    explanation: 'The computational intensity required for training and deploying AI deep learning models is the primary driver of advanced semiconductor demand.',
  },

  // Q34 — HARD (Answer: A)
  {
    text: 'A company has valuable customer information and uses it to identify customer preferences, but management wants to create personalized offers. What capability is most directly involved?',
    category: 'Marketing & Consumer Behaviour',
    difficulty: 'hard',
    points: 15,
    options: [
      'A. Customer data utilization',
      'B. Customer segmentation planning',
      'C. Customer acquisition expansion',
      'D. Customer infrastructure optimization',
    ],
    correct_answer: 'A. Customer data utilization',
    explanation: 'Translating rich customer behavioral insights into customized, real-time product offers relies directly on customer data utilization.',
  },

  // Q35 — MEDIUM (Answer: C)
  {
    text: 'The expansion of systems such as UPI has contributed most directly to the wider use of:',
    category: 'Technology, AI & FinTech',
    difficulty: 'medium',
    points: 10,
    options: [
      'A. Electronic accounting',
      'B. Digital banking',
      'C. Digital payments',
      'D. Online financial reporting',
    ],
    correct_answer: 'C. Digital payments',
    explanation: 'UPI has been the primary technological catalyst expanding consumer and merchant adoption of frictionless digital payments.',
  },

  // Q36 — HARD (Answer: C)
  {
    text: 'A company experiences strong revenue growth while receivables and inventory rise faster than sales. Which conclusion requires the most attention?',
    category: 'Finance & Working Capital',
    difficulty: 'hard',
    points: 15,
    options: [
      'A. Sales growth automatically improves liquidity',
      'B. Higher revenue always indicates stronger cash generation',
      'C. Growth may be creating additional working-capital pressure',
      'D. Increased inventory automatically improves profitability',
    ],
    correct_answer: 'C. Growth may be creating additional working-capital pressure',
    explanation: 'When working capital commitments outgrow revenue, the company consumes more cash than it produces, threatening financial stability.',
  },

  // Q37 — MEDIUM (Answer: B)
  {
    text: 'A company begins producing its own chips instead of purchasing them from suppliers. This is an example of:',
    category: 'Corporate World & Strategy',
    difficulty: 'medium',
    points: 10,
    options: [
      'A. Supply-chain expansion',
      'B. Vertical integration',
      'C. Production diversification',
      'D. Internal market development',
    ],
    correct_answer: 'B. Vertical integration',
    explanation: 'Taking upstream control of essential component manufacturing is an example of backward vertical integration.',
  },

  // Q38 — HARD (Answer: D)
  {
    text: 'An AI chatbot provides incorrect financial guidance to customers. Which response is most appropriate?',
    category: 'Technology, AI & FinTech',
    difficulty: 'hard',
    points: 15,
    options: [
      'A. Increase customer interaction and automation',
      'B. Expand chatbot functionality and accessibility',
      'C. Increase digital marketing and customer engagement',
      'D. Strengthen AI governance and quality control',
    ],
    correct_answer: 'D. Strengthen AI governance and quality control',
    explanation: 'Misinformation in regulated financial advisory demands stringent model validation, auditability, and robust AI governance controls.',
  },

  // Q39 — MEDIUM (Answer: C)
  {
    text: 'A company has high-volume customers who are not necessarily its most profitable customers. What should management analyze?',
    category: 'Finance & Working Capital',
    difficulty: 'medium',
    points: 10,
    options: [
      'A. Customer acquisition efficiency',
      'B. Customer retention performance',
      'C. Customer profitability',
      'D. Customer purchase frequency',
    ],
    correct_answer: 'C. Customer profitability',
    explanation: 'Customer profitability analysis distinguishes high-revenue accounts from truly high-margin accounts after deducting service costs and concessions.',
  },

  // Q40 — HARD (Answer: D)
  {
    text: 'A company obtains components from several countries and distributes production across multiple regions. What business objective is most directly supported?',
    category: 'Supply Chain & Operations',
    difficulty: 'hard',
    points: 15,
    options: [
      'A. Production consolidation in one region',
      'B. Market specialization strategy',
      'C. Customer-segment concentration',
      'D. Supply-chain diversification',
    ],
    correct_answer: 'D. Supply-chain diversification',
    explanation: 'Sourcing inputs from multiple countries and decentralizing manufacturing directly fosters supply-chain diversification.',
  },
];

export function generateQuestionText(index: number, difficulty: string): string {
  const item = questionBank[index % questionBank.length];
  return item ? item.text : `Question ${index + 1}`;
}

export function getDefaultQuestions(): Question[] {
  return questionBank.map((data, idx) => ({
    id: `q_${String(idx + 1).padStart(2, '0')}`,
    question_text: data.text,
    category: data.category,
    difficulty: data.difficulty,
    points: data.points,
    options: [...data.options],
    correct_answer: data.correct_answer,
    explanation: data.explanation,
    status: 'pending',
  }));
}

export const standardQuestions = getDefaultQuestions();
