// Hand-written types matching supabase/migrations/*.sql.
// Regenerate against a real project later with:
//   npx supabase gen types typescript --project-id <id> > src/lib/supabase/database.types.ts
// and reconcile with the hand-written enums/helpers below.

export type MemberRole =
  | "ORGANIZATION_OWNER"
  | "ORGANIZATION_ADMIN"
  | "BRANCH_MANAGER"
  | "CASHIER";

export type OrganizationStatus = "TRIAL" | "ACTIVE" | "SUSPENDED";
export type ProgramType = "STAMPS" | "POINTS";
export type LedgerEntryType =
  | "PURCHASE"
  | "STAMP_EARN"
  | "POINTS_EARN"
  | "BONUS"
  | "ADJUSTMENT"
  | "REDEMPTION"
  | "EXPIRATION"
  | "REFUND";
export type TransactionStatus = "COMPLETED" | "VOIDED" | "REFUNDED";
export type RewardType =
  | "FREE_ITEM"
  | "DISCOUNT_FIXED"
  | "DISCOUNT_PERCENTAGE"
  | "CUSTOM";
export type RewardInstanceStatus =
  | "AVAILABLE"
  | "REDEEMED"
  | "EXPIRED"
  | "CANCELLED";
export type WalletPlatform = "APPLE" | "GOOGLE";
export type WalletProviderMode = "LIVE" | "MOCK";
export type WalletPassStatus = "ACTIVE" | "VOIDED";
export type CampaignType =
  | "PROMOTION"
  | "BIRTHDAY"
  | "WIN_BACK"
  | "BONUS_POINTS"
  | "DOUBLE_STAMPS"
  | "CUSTOM";
export type CampaignStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "SENDING"
  | "SENT"
  | "CANCELLED";
export type CampaignChannel = "EMAIL" | "WALLET";
export type DeliveryStatus = "QUEUED" | "SENT" | "FAILED" | "DELIVERED";
export type SubscriptionStatus =
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELED"
  | "INCOMPLETE";
export type InvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
export type ConsentType = "TERMS" | "MARKETING";
export type SegmentCode =
  | "NEW"
  | "ACTIVE"
  | "REPEAT"
  | "VIP"
  | "AT_RISK"
  | "INACTIVE_30"
  | "INACTIVE_60"
  | "BIRTHDAY_MONTH"
  | "NEAR_REWARD";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          phone: string | null;
          is_platform_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      Relationships: [];
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          legal_name: string | null;
          slug: string;
          category: string | null;
          country: string;
          currency: string;
          timezone: string;
          phone: string | null;
          email: string | null;
          website: string | null;
          logo_url: string | null;
          banner_url: string | null;
          brand_primary_color: string;
          brand_secondary_color: string;
          status: OrganizationStatus;
          trial_ends_at: string | null;
          is_demo: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["organizations"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["organizations"]["Row"]>;
      Relationships: [];
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: MemberRole;
          branch_ids: string[];
          invited_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["organization_members"]["Row"]
        >;
        Update: Partial<
          Database["public"]["Tables"]["organization_members"]["Row"]
        >;
        Relationships: [];
      };
      branches: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          address: string | null;
          latitude: number | null;
          longitude: number | null;
          phone: string | null;
          timezone: string | null;
          opening_hours: Record<string, unknown>;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["branches"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["branches"]["Row"]>;
      Relationships: [];
      };
      programs: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          slug: string;
          type: ProgramType;
          description: string | null;
          reward_headline: string | null;
          is_active: boolean;
          primary_color: string;
          secondary_color: string;
          logo_url: string | null;
          banner_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["programs"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["programs"]["Row"]>;
      Relationships: [];
      };
      program_rules: {
        Row: {
          id: string;
          program_id: string;
          organization_id: string;
          stamps_required: number | null;
          stamps_per_purchase: number;
          min_purchase_amount_cents: number;
          points_per_currency_unit: number | null;
          currency_unit_cents: number;
          points_expire_days: number | null;
          manual_points_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["program_rules"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["program_rules"]["Row"]>;
      Relationships: [];
      };
      rewards: {
        Row: {
          id: string;
          organization_id: string;
          program_id: string;
          name: string;
          description: string | null;
          type: RewardType;
          cost_stamps: number | null;
          cost_points: number | null;
          discount_amount_cents: number | null;
          discount_percentage: number | null;
          is_active: boolean;
          per_customer_limit: number | null;
          valid_from: string | null;
          valid_until: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["rewards"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["rewards"]["Row"]>;
      Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          organization_id: string;
          public_code: string;
          first_name: string;
          last_name: string | null;
          phone: string | null;
          email: string | null;
          birthdate: string | null;
          marketing_consent: boolean;
          terms_accepted_at: string | null;
          terms_version: string | null;
          consent_source: string | null;
          consent_ip: string | null;
          qr_token: string;
          status: "ACTIVE" | "BLOCKED";
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["customers"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["customers"]["Row"]>;
      Relationships: [];
      };
      customer_consents: {
        Row: {
          id: string;
          customer_id: string;
          organization_id: string;
          consent_type: ConsentType;
          granted: boolean;
          version: string | null;
          source: string | null;
          ip: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["customer_consents"]["Row"]
        >;
        Update: Partial<
          Database["public"]["Tables"]["customer_consents"]["Row"]
        >;
        Relationships: [];
      };
      customer_program_enrollments: {
        Row: {
          id: string;
          customer_id: string;
          program_id: string;
          organization_id: string;
          stamps_balance: number;
          points_balance: number;
          lifetime_stamps: number;
          lifetime_points: number;
          visits_count: number;
          total_spend_cents: number;
          last_visit_at: string | null;
          enrolled_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["customer_program_enrollments"]["Row"]
        >;
        Update: Partial<
          Database["public"]["Tables"]["customer_program_enrollments"]["Row"]
        >;
        Relationships: [];
      };
      purchase_transactions: {
        Row: {
          id: string;
          organization_id: string;
          branch_id: string;
          customer_id: string;
          program_id: string;
          staff_user_id: string | null;
          amount_cents: number;
          currency: string;
          stamps_earned: number;
          points_earned: number;
          external_reference: string | null;
          metadata: Record<string, unknown>;
          status: TransactionStatus;
          idempotency_key: string;
          created_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["purchase_transactions"]["Row"]
        >;
        Update: Partial<
          Database["public"]["Tables"]["purchase_transactions"]["Row"]
        >;
        Relationships: [];
      };
      loyalty_ledger: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string;
          program_id: string;
          branch_id: string | null;
          type: LedgerEntryType;
          stamps_delta: number;
          points_delta: number;
          purchase_transaction_id: string | null;
          reward_instance_id: string | null;
          staff_user_id: string | null;
          description: string | null;
          idempotency_key: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["loyalty_ledger"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["loyalty_ledger"]["Row"]>;
      Relationships: [];
      };
      customer_rewards: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string;
          program_id: string;
          reward_id: string;
          status: RewardInstanceStatus;
          redemption_code: string;
          unlocked_at: string;
          redeemed_at: string | null;
          redeemed_by_staff_id: string | null;
          redeemed_branch_id: string | null;
          redemption_transaction_id: string | null;
          expires_at: string | null;
          created_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["customer_rewards"]["Row"]
        >;
        Update: Partial<
          Database["public"]["Tables"]["customer_rewards"]["Row"]
        >;
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          organization_id: string | null;
          type: string;
          payload: Record<string, unknown>;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["events"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["events"]["Row"]>;
        Relationships: [];
      };
      wallet_passes: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string;
          program_id: string;
          platform: WalletPlatform;
          provider_mode: WalletProviderMode;
          serial_number: string;
          auth_token: string;
          pass_type_identifier: string | null;
          status: WalletPassStatus;
          last_pushed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["wallet_passes"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["wallet_passes"]["Row"]>;
      Relationships: [];
      };
      wallet_devices: {
        Row: {
          id: string;
          wallet_pass_id: string;
          device_library_identifier: string;
          push_token: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["wallet_devices"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["wallet_devices"]["Row"]>;
      Relationships: [];
      };
      invitations: {
        Row: {
          id: string;
          organization_id: string;
          email: string;
          role: MemberRole;
          branch_ids: string[];
          token: string;
          invited_by: string | null;
          status: InvitationStatus;
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["invitations"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["invitations"]["Row"]>;
      Relationships: [];
      };
      plans: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          price_monthly_cents: number;
          price_yearly_cents: number | null;
          currency: string;
          is_active: boolean;
          sort_order: number;
          stripe_price_id_monthly: string | null;
          stripe_price_id_yearly: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["plans"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["plans"]["Row"]>;
      Relationships: [];
      };
      plan_features: {
        Row: {
          id: string;
          plan_id: string;
          key: string;
          value: unknown;
        };
        Insert: Partial<Database["public"]["Tables"]["plan_features"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["plan_features"]["Row"]>;
      Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          organization_id: string;
          plan_id: string;
          billing_provider: string;
          provider_customer_id: string | null;
          provider_subscription_id: string | null;
          status: SubscriptionStatus;
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          trial_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["subscriptions"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["subscriptions"]["Row"]>;
      Relationships: [];
      };
      campaigns: {
        Row: {
          id: string;
          organization_id: string;
          program_id: string | null;
          name: string;
          type: CampaignType;
          status: CampaignStatus;
          channel: CampaignChannel;
          subject: string | null;
          message: string | null;
          audience_segment: string;
          scheduled_at: string | null;
          sent_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["campaigns"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["campaigns"]["Row"]>;
      Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          organization_id: string | null;
          actor_user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          before: unknown;
          after: unknown;
          ip: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["audit_logs"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_platform_admin: { Args: Record<string, never>; Returns: boolean };
      create_organization: {
        Args: {
          p_name: string;
          p_slug: string;
          p_category?: string | null;
          p_country?: string;
          p_currency?: string;
          p_timezone?: string;
          p_phone?: string | null;
          p_email?: string | null;
          p_website?: string | null;
        };
        Returns: Database["public"]["Tables"]["organizations"]["Row"];
      };
      accept_invitation: {
        Args: { p_token: string };
        Returns: Database["public"]["Tables"]["organization_members"]["Row"];
      };
      register_customer: {
        Args: {
          p_organization_id: string;
          p_program_id: string;
          p_first_name: string;
          p_last_name?: string | null;
          p_phone?: string | null;
          p_email?: string | null;
          p_birthdate?: string | null;
          p_marketing_consent?: boolean;
          p_terms_version?: string;
          p_source?: string;
        };
        Returns: Database["public"]["Tables"]["customers"]["Row"];
      };
      set_marketing_consent: {
        Args: { p_qr_token: string; p_granted: boolean };
        Returns: void;
      };
      submit_privacy_request: {
        Args: {
          p_organization_id?: string | null;
          p_request_type: string;
          p_contact_email?: string | null;
          p_contact_phone?: string | null;
          p_notes?: string | null;
        };
        Returns: { id: string };
      };
      record_purchase_transaction: {
        Args: {
          p_organization_id: string;
          p_branch_id: string;
          p_customer_id: string;
          p_program_id: string;
          p_amount_cents: number;
          p_idempotency_key: string;
          p_external_reference?: string | null;
          p_metadata?: Record<string, unknown>;
        };
        Returns: Database["public"]["Tables"]["purchase_transactions"]["Row"];
      };
      redeem_customer_reward: {
        Args: { p_customer_reward_id: string; p_branch_id: string };
        Returns: Database["public"]["Tables"]["customer_rewards"]["Row"];
      };
      refund_purchase_transaction: {
        Args: { p_transaction_id: string };
        Returns: Database["public"]["Tables"]["purchase_transactions"]["Row"];
      };
      adjust_customer_balance: {
        Args: {
          p_organization_id: string;
          p_customer_id: string;
          p_program_id: string;
          p_stamps_delta: number;
          p_points_delta: number;
          p_reason: string;
        };
        Returns: Database["public"]["Tables"]["customer_program_enrollments"]["Row"];
      };
      recompute_customer_balance: {
        Args: { p_customer_id: string; p_program_id: string };
        Returns: { stamps_balance: number; points_balance: number }[];
      };
      customer_segments: {
        Args: { p_customer_id: string; p_program_id: string };
        Returns: string[];
      };
      customers_in_segment: {
        Args: { p_organization_id: string; p_program_id: string; p_segment: string };
        Returns: Database["public"]["Tables"]["customers"]["Row"][];
      };
    };
    Enums: {
      member_role: MemberRole;
      organization_status: OrganizationStatus;
      program_type: ProgramType;
      ledger_entry_type: LedgerEntryType;
      transaction_status: TransactionStatus;
      reward_type: RewardType;
      reward_instance_status: RewardInstanceStatus;
      wallet_platform: WalletPlatform;
      wallet_provider_mode: WalletProviderMode;
      campaign_type: CampaignType;
      campaign_status: CampaignStatus;
      subscription_status: SubscriptionStatus;
      invitation_status: InvitationStatus;
      consent_type: ConsentType;
    };
    CompositeTypes: Record<string, never>;
  };
}
