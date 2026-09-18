import { useStore } from './store';
import { hashPassword } from './auth';
import { Team, Zone, Question, Resource, StoreItem, Round2Wave, User, Wallet } from '@/types';
import { standardQuestions } from './questions';

import { officialZones } from './zones';

export async function initializeDemoData(force = false) {
  const store = useStore.getState();

  // Upgrade or refresh zones if fewer than 25 zones are loaded
  if (store.zones.length < 25 || store.zones[0]?.name === 'Neo Tokyo Industrial District') {
    const existingZoneMap = new Map(store.zones.map((z) => [z.id, z]));
    useStore.setState({
      zones: officialZones.map((oz) => {
        const existing = existingZoneMap.get(oz.id);
        if (existing && existing.owner_team_id) {
          return {
            ...oz,
            owner_team_id: existing.owner_team_id,
            status: existing.status,
            purchase_price: existing.purchase_price,
            winning_bid: existing.winning_bid,
          };
        }
        return { ...oz };
      }),
    });
  }
  
  // Ensure all 25 teams exist if partially initialized
  if (!force && store.teams.length > 0 && store.teams.length < 25) {
    const startIdx = store.teams.length + 1;
    for (let i = startIdx; i <= 25; i++) {
      const teamId = `team_${String(i).padStart(2, '0')}`;
      const username = `ARKK${String(i).padStart(2, '0')}`;
      const password = await hashPassword('team123');

      if (!store.users.some((u) => u.username === username)) {
        store.users.push({
          id: `user_${teamId}`,
          username,
          password_hash: password,
          role: 'participant',
          team_id: teamId,
        });
      }

      if (!store.teams.some((t) => t.id === teamId)) {
        store.teams.push({
          id: teamId,
          team_number: i,
          team_name: `Team ${String(i).padStart(2, '0')}`,
          active: true,
          eliminated: false,
          current_round: 0,
          intro_video_seen: false,
          created_at: new Date().toISOString(),
        });
      }

      if (!store.wallets.some((w) => w.team_id === teamId)) {
        store.wallets.push({
          team_id: teamId,
          usable_balance: 200000,
          frozen_balance: 50000,
        });
      }
    }
    useStore.setState({
      users: [...store.users],
      teams: [...store.teams],
      wallets: [...store.wallets],
    });
  }

  // Check if data already exists
  if (!force && store.teams.length >= 25 && store.questions.length > 0) {
    console.log('Demo data already initialized with 25 teams');
    return;
  }

  if (force) {
    store.users.length = 0;
    store.teams.length = 0;
    store.wallets.length = 0;
    store.zones.length = 0;
    store.questions.length = 0;
    store.resources.length = 0;
    store.storeItems.length = 0;
    store.round2Waves.length = 0;
  }
  
  // Create Admin User
  const adminPassword = await hashPassword('admin123');
  const adminUser: User = {
    id: 'admin_001',
    username: 'admin',
    password_hash: adminPassword,
    role: 'admin',
  };
  store.users.push(adminUser);
  
  // Create 25 Teams
  const teams: Team[] = [];
  for (let i = 1; i <= 25; i++) {
    const teamId = `team_${String(i).padStart(2, '0')}`;
    const username = `ARKK${String(i).padStart(2, '0')}`;
    const password = await hashPassword('team123');
    
    const user: User = {
      id: `user_${teamId}`,
      username,
      password_hash: password,
      role: 'participant',
      team_id: teamId,
    };
    store.users.push(user);
    
    const team: Team = {
      id: teamId,
      team_number: i,
      team_name: `Team ${String(i).padStart(2, '0')}`,
      active: true,
      eliminated: false,
      current_round: 0,
      intro_video_seen: false,
      created_at: new Date().toISOString(),
    };
    teams.push(team);
    
    // Create wallet for each team (Starting balance: 2,00,000 ARK, Frozen: 50,000 ARK)
    const wallet: Wallet = {
      team_id: teamId,
      usable_balance: 200000,
      frozen_balance: 50000,
    };
    store.wallets.push(wallet);
  }
  store.teams.push(...teams);
  
  // Load official 20 Zones from the Word document
  store.zones.push(...officialZones.map((z) => ({ ...z })));
  
  // Load 40 Standard Questions
  const questions: Question[] = standardQuestions.map((q) => ({ ...q }));
  store.questions.push(...questions);
  
  // Create Resources
  const resources: Resource[] = [
    { id: 'res_01', name: 'Water', quantity: 10000, type: 'Essential' },
    { id: 'res_02', name: 'Food', quantity: 5000, type: 'Essential' },
    { id: 'res_03', name: 'Metal', quantity: 3000, type: 'Raw Material' },
    { id: 'res_04', name: 'Glass', quantity: 2000, type: 'Raw Material' },
    { id: 'res_05', name: 'Plastic', quantity: 2500, type: 'Raw Material' },
    { id: 'res_06', name: 'Power', quantity: 8000, type: 'Energy' },
    { id: 'res_07', name: 'Chemicals', quantity: 1500, type: 'Industrial' },
    { id: 'res_08', name: 'Medicine', quantity: 1000, type: 'Essential' },
  ];
  
  store.resources.push(...resources);
  
  // Create Store Items
  const storeItems: StoreItem[] = [
    { id: 'item_01', name: 'Raw Materials Package', description: 'Basic raw materials for production', cost: 10000, effect: '+500 Metal, +300 Glass', quantity: 50, availability: 50 },
    { id: 'item_02', name: 'Advanced Machinery', description: 'High-efficiency production equipment', cost: 25000, effect: '+200% Production', quantity: 20, availability: 20 },
    { id: 'item_03', name: 'Skilled Labor Force', description: 'Trained workers for operations', cost: 15000, effect: '+50% Efficiency', quantity: 30, availability: 30 },
    { id: 'item_04', name: 'Infrastructure Upgrade', description: 'Modern facilities and utilities', cost: 30000, effect: '+100% Capacity', quantity: 15, availability: 15 },
    { id: 'item_05', name: 'Repair Kit', description: 'Emergency equipment repairs', cost: 5000, effect: 'Fix broken machinery', quantity: 100, availability: 100 },
    { id: 'item_06', name: 'Technology License', description: 'Advanced production technology', cost: 40000, effect: '+New Product Types', quantity: 10, availability: 10 },
    { id: 'item_07', name: 'Energy Generator', description: 'Independent power production', cost: 20000, effect: '+1000 Power/day', quantity: 25, availability: 25 },
    { id: 'item_08', name: 'Water Purification System', description: 'Clean water production', cost: 12000, effect: '+500 Water/day', quantity: 40, availability: 40 },
  ];
  
  store.storeItems.push(...storeItems);
  
  // Create Round 2 Waves
  const round2Waves: Round2Wave[] = [
    {
      id: 'wave_01',
      wave_number: 1,
      question: 'Analyze your zone\'s primary production challenge. What is the bottleneck?',
      instructions: 'Provide a detailed analysis of the main production constraint in your zone. Consider infrastructure, resources, and workforce.',
      active: false,
      time_limit: 600,
      max_marks: 50,
    },
    {
      id: 'wave_02',
      wave_number: 2,
      question: 'Identify the market demand for your zone\'s potential products.',
      instructions: 'Research and describe the current market needs for products your zone can produce. Include demand projections.',
      active: false,
      time_limit: 600,
      max_marks: 50,
    },
    {
      id: 'wave_03',
      wave_number: 3,
      question: 'Propose a strategic partnership opportunity.',
      instructions: 'Identify a potential partner (another zone or external entity) and explain how collaboration could benefit both parties.',
      active: false,
      time_limit: 600,
      max_marks: 50,
    },
  ];
  
  store.round2Waves.push(...round2Waves);
  
  useStore.setState({
    users: [...store.users],
    teams: [...store.teams],
    wallets: [...store.wallets],
    zones: [...store.zones],
    questions: [...store.questions],
    storeItems: [...store.storeItems],
    resources: [...store.resources],
    round2Waves: [...store.round2Waves],
  });
  
  console.log('Demo data initialized successfully');
}

function getRandomStrength(): string {
  const strengths = [
    'Abundant natural resources',
    'Strategic geographic location',
    'Skilled workforce availability',
    'Advanced infrastructure',
    'Strong market access',
    'Government support programs',
    'Technology innovation potential',
    'Diverse industrial base',
  ];
  return strengths[Math.floor(Math.random() * strengths.length)];
}

function getRandomWeakness(): string {
  const weaknesses = [
    'Aging infrastructure',
    'Limited water access',
    'High energy costs',
    'Supply chain vulnerabilities',
    'Environmental regulations',
    'Labor shortages',
    'Market competition',
    'Transportation bottlenecks',
  ];
  return weaknesses[Math.floor(Math.random() * weaknesses.length)];
}

function getRandomProblem(): string {
  const problems = [
    'Production capacity at 40% due to equipment failures',
    'Critical shortage of skilled technicians',
    'Environmental contamination affecting output quality',
    'Logistical delays causing material shortages',
    'Energy grid instability disrupting operations',
    'Water scarcity limiting production cycles',
    'Market demand exceeding current capacity',
    'Regulatory compliance requiring major upgrades',
  ];
  return problems[Math.floor(Math.random() * problems.length)];
}

function getRandomProduction(): string {
  const productions = [
    'Electronics manufacturing',
    'Automotive assembly',
    'Chemical processing',
    'Food production',
    'Textile manufacturing',
    'Metal fabrication',
    'Pharmaceutical production',
    'Renewable energy equipment',
  ];
  return productions[Math.floor(Math.random() * productions.length)];
}

function getRandomProducts(): string {
  const products = [
    'Consumer electronics, Industrial components',
    'Vehicles, Automotive parts',
    'Chemicals, Plastics, Fertilizers',
    'Processed foods, Beverages',
    'Clothing, Textiles',
    'Steel products, Machinery',
    'Medicines, Medical equipment',
    'Solar panels, Wind turbines',
  ];
  return products[Math.floor(Math.random() * products.length)];
}

function generateQuestionText(index: number, difficulty: string): string {
  const easyQuestions = [
    'What is the primary goal of supply chain management?',
    'Which financial ratio measures liquidity?',
    'What is the break-even point in business?',
    'What does SWOT analysis stand for?',
    'What is the purpose of a balance sheet?',
    'What is economies of scale?',
    'What is the time value of money?',
    'What is a monopoly in economics?',
    'What is the purpose of marketing?',
    'What is inventory turnover?',
  ];
  
  const mediumQuestions = [
    'Explain the difference between fixed and variable costs.',
    'How does inflation impact business decisions?',
    'What is the role of central banks in the economy?',
    'Explain the concept of opportunity cost.',
    'What is the difference between debt and equity financing?',
    'How does exchange rate risk affect international business?',
    'What is the purpose of a cash flow statement?',
    'Explain the concept of market segmentation.',
    'What is the difference between leadership and management?',
    'How does technology impact productivity?',
  ];
  
  const hardQuestions = [
    'Analyze the impact of supply chain disruptions on global trade.',
    'Evaluate the effectiveness of monetary policy in controlling inflation.',
    'How do geopolitical tensions affect international business strategy?',
    'Compare and contrast different economic systems.',
    'Analyze the relationship between interest rates and investment decisions.',
    'Evaluate the impact of automation on employment and wages.',
    'How does corporate social responsibility affect financial performance?',
    'Analyze the challenges of implementing sustainable business practices.',
    'Evaluate the role of innovation in economic growth.',
    'How does demographic change affect business strategy?',
  ];
  
  const questions = difficulty === 'easy' ? easyQuestions : difficulty === 'medium' ? mediumQuestions : hardQuestions;
  return questions[index % questions.length];
}
