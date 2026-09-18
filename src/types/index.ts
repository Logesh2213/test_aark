// User & Authentication
export interface User {
  id: string;
  username: string;
  password_hash: string;
  role: 'admin' | 'participant';
  team_id?: string;
}

// Team
export interface Team {
  id: string;
  team_number: number;
  team_name: string;
  active: boolean;
  eliminated: boolean;
  current_round: number;
  intro_video_seen: boolean;
  created_at: string;
}

// Wallet
export interface Wallet {
  team_id: string;
  usable_balance: number;
  frozen_balance: number;
}

// Transaction
export interface Transaction {
  id: string;
  team_id: string;
  type: 'bid' | 'zone_purchase' | 'resource_purchase' | 'freeze_release' | 'deal' | 'manual_adjustment';
  amount: number;
  description: string;
  round: number;
  timestamp: string;
}

// Question
export interface Question {
  id: string;
  question_text: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  correct_answer: string;
  options?: string[];
  explanation?: string;
  status: 'pending' | 'active' | 'completed';
}

// Question Bid
export interface QuestionBid {
  id: string;
  question_id: string;
  team_id: string;
  team_name?: string;
  team_number?: number;
  bid_amount: number;
  winner?: boolean;
  timestamp: string;
  server_timestamp?: string;
}

// Zone Raw Material
export interface ZoneRawMaterial {
  name: string;
  quantity: number;
  unit: string;
  price: number;
  total_value: number;
}

// Zone
export interface Zone {
  id: string;
  zone_number: number;
  name: string;
  region: string;
  starting_price: number;
  tier?: 'Big' | 'Steady' | 'Small' | 'Empty' | string;
  next_to?: string;
  neighboring_zones?: string;
  terrain: string;
  description?: string;
  space?: number;
  stock?: string;
  used?: number;
  free?: number;
  free_text?: string;
  worth?: string;
  water_price?: number;
  food_price?: number;
  metal_price?: number;
  glass_price?: number;
  plastic_price?: number;
  power_price?: number;
  chemicals_price?: number;
  medicine_price?: number;
  zone_value?: number;
  deposits?: string;
  in_the_ground?: string;
  yield?: string;
  makes?: string;
  must_build?: string;
  must_build_cost?: string;
  goes_wrong?: string;
  has_and_needs?: string;
  round_5_material?: string;
  note?: string;
  strength?: string;
  weakness?: string;
  crisis?: string;
  problem?: string;
  fix_material?: string;
  fix_qty?: number;
  zone_has_it?: string;
  space_check?: string;
  if_not_fixed?: string;
  people?: string;
  budget?: string;
  trades?: string;
  split_a?: string;
  split_b?: string;
  wanted_by?: string;
  splits_once?: boolean;
  spoils?: boolean;
  advantages?: string;
  risks?: string;
  opportunities?: string;
  hidden_information?: string;
  production_capability?: string;
  potential_products?: string;
  raw_materials?: ZoneRawMaterial[];
  total_raw_material_value?: number;
  zone_total_value?: number;
  generation_output_value?: string;
  purchase_price?: number;
  final_value?: number;
  winning_bid?: number;
  gain_loss?: number;
  worth_per_arc?: number;
  status: 'available' | 'auction_active' | 'auctioned' | 'sold' | 'sealed';
  owner_team_id?: string;
  public_fields?: string[];
  sealed_fields?: string[];
}

// Zone Bid
export interface ZoneBid {
  id: string;
  zone_id: string;
  team_id: string;
  team_name: string;
  team_number: number;
  amount: number;
  sequence?: number;
  timestamp: string;
  server_timestamp?: string;
}

// Zone Transaction
export interface ZoneTransaction {
  id: string;
  zone_id: string;
  team_id: string;
  price: number;
  timestamp: string;
}

// Resource
export interface Resource {
  id: string;
  name: string;
  quantity: number;
  type: string;
}

// Team Resource
export interface TeamResource {
  team_id: string;
  resource_id: string;
  quantity: number;
}

// Store Item
export interface StoreItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  effect: string;
  quantity: number;
  availability: number;
}

// Purchase
export interface Purchase {
  id: string;
  team_id: string;
  item_id: string;
  quantity: number;
  amount: number;
  round: number;
  timestamp: string;
}

// Round 2 Wave
export interface Round2Wave {
  id: string;
  wave_number: number;
  question: string;
  instructions: string;
  active: boolean;
  time_limit?: number;
  max_marks?: number;
}

// Round 2 Submission
export interface Round2Submission {
  id: string;
  team_id: string;
  wave_id: string;
  response: string;
  submitted_at: string;
  score?: number;
}

// Proposal
export interface Proposal {
  id: string;
  team_id: string;
  problem: string;
  shortage: string;
  purchases: string;
  build_plan: string;
  timeline: string;
  financial_plan: string;
  submitted_at?: string;
}

// Video
export interface Video {
  id: string;
  team_id: string;
  file_url: string;
  uploaded_at: string;
  status: 'pending' | 'submitted' | 'late';
}

// Deal
export interface Deal {
  id: string;
  seller_team: string;
  buyer_team: string;
  resource: string;
  quantity: number;
  price: number;
  deadline: string;
  failure_condition: string;
  status: 'pending' | 'confirmed' | 'approved' | 'rejected' | 'failed';
  seller_confirmed: boolean;
  buyer_confirmed: boolean;
  created_at: string;
}

// Score
export interface Score {
  id: string;
  team_id: string;
  round: number;
  category: string;
  marks: number;
}

// Audit Log
export interface AuditLog {
  id: string;
  user_id: string;
  team_id?: string;
  action: string;
  previous_value?: string;
  new_value?: string;
  timestamp: string;
}

// Event State
export interface EventState {
  current_round: number;
  current_activity: string;
  timer_running: boolean;
  timer_duration: number;
  timer_remaining: number;
  leaderboard_visible: boolean;
  event_status: 'not_started' | 'in_progress' | 'paused' | 'completed';
}

// Round 1A State
export type Round1AStatus = 
  | 'ROUND_NOT_STARTED'
  | 'NOT_STARTED' 
  | 'ROUND_STARTED_WAITING'
  | 'WAITING_FOR_QUESTION' 
  | 'QUESTION_DISPLAYED'
  | 'PREPARATION_30_SEC'
  | 'BIDDING_OPEN_60_SEC'
  | 'BIDDING_CLOSED'
  | 'ADMIN_AWARDS_QUESTION'
  | 'ADMIN_SELECTS_TEAM'
  | 'ANSWERING_ACTIVE'
  | 'ANSWER_SUBMITTED'
  | 'WAITING_FOR_ADMIN_DECISION'
  | 'ADMIN_MARKS_CORRECT_OR_WRONG'
  | 'ANSWER_CORRECT'
  | 'ANSWER_WRONG'
  | 'TIMES_UP'
  | 'NEXT_QUESTION'
  | 'WAIT_FOR_ADMIN_NEXT_QUESTION'
  | 'ROUND_ENDED';

export interface Round1AState {
  active: boolean;
  status: Round1AStatus;
  current_question_index?: number;
  current_question_id?: string;
  current_question_text?: string;
  current_question_category?: string;
  current_question_difficulty?: 'easy' | 'medium' | 'hard';
  current_question_points?: number;
  question_start_time?: number;
  prep_end_time?: number;
  prep_timer_remaining?: number;
  bidding_end_time?: number;
  bidding_timer_remaining?: number;
  bidding_open: boolean;
  current_bid_amount?: number;
  current_bidder_id?: string;
  current_bidder_name?: string;
  current_bidder_number?: number;
  next_bid_amount?: number;
  base_bid?: number;
  bid_increment?: number;
  bids?: QuestionBid[];
  answering_team_id?: string;
  submitted_answer?: string;
  answer_timer_running: boolean;
  answer_timer_remaining: number;
  answer_timer_end_time?: number;
  award_amount?: number;
  evaluation_result?: 'correct' | 'wrong' | 'times_up';
}

// Round 1B State
export type AuctionStatus = 'idle' | 'bidding_active' | 'bidding_stopped' | 'zone_awarded';

export interface Round1BState {
  active: boolean;
  frozen_unlocked?: boolean;
  zone_study_mode: boolean;
  current_auction_zone_id?: string;
  auction_open: boolean;
  auction_status?: AuctionStatus;
  current_bid_amount?: number;
  current_bidder_id?: string;
  current_bidder_name?: string;
  current_bidder_number?: number;
  next_bid_amount?: number;
  bids?: ZoneBid[];
}

// Round 2 State
export interface Round2State {
  active: boolean;
  frozen_released: boolean;
  current_wave_id?: string;
  wave_active: boolean;
  store_open: boolean;
  proposal_submission_open: boolean;
}

// Round 3 State
export interface Round3State {
  active: boolean;
  upload_deadline: string;
  max_file_size: number;
}

// Round 4 State
export interface Round4State {
  active: boolean;
  scoring_open: boolean;
}

// Round 5 State
export interface Round5State {
  active: boolean;
  negotiation_open: boolean;
}

// Round 6 State
export interface Round6State {
  active: boolean;
  scoring_open: boolean;
}
