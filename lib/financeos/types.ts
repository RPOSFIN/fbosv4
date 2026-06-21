export type Family = {
  id: string;
  name: string;
  created_at: string | null;
  owner_user_id: string | null;
};

export type FamilyMember = {
  id: string;
  family_id: string | null;
  name: string;
  relationship: string | null;
  role: string | null;
  occupation: string | null;
  is_active: boolean | null;
};

export type Investment = {
  id: string;
  family_id: string | null;
  investment_type: string | null;
  investment_name: string | null;
  invested_amount: number | null;
  current_value: number | null;
};

export type Borrowing = {
  id: string;
  family_id: string | null;
  loan_type: string | null;
  loan_name: string | null;
  outstanding: number | null;
  emi: number | null;
  interest_rate: number | null;
  remaining_months: number | null;
};

export type FinanceOsSnapshot = {
  family: Family | null;
  members: FamilyMember[];
  investments: Investment[];
  borrowings: Borrowing[];
  totals: {
    invested: number;
    currentAssets: number;
    liabilities: number;
    netWorth: number;
    monthlyEmi: number;
  };
};
