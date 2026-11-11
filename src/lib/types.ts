// Request and response shapes of the server's Ops API, mirroring its views. Dates arrive as ISO strings.
// `api()` returns the `data` of the `/admin/*` envelope, so these are the shapes inside it.

export type AdminRole = 'superadmin' | 'ops' | 'intern';
export interface Session { token: string; role: AdminRole; name: string }

// --- Offers: models/offer.model.ts, repository/offer.repository.ts, services/venue/offer.service.ts

export type OfferStatus = 'active' | 'paused' | 'ended';
export type OfferFundedBy = 'brand' | 'tazmify';
export type RequirementPlatform = 'instagram' | 'youtube';
export type RequirementMetric = 'followers' | 'engagementRate';
/** services/venue/eligibility.ts. `min` is a follower count or an engagement rate in percent. */
export interface OfferRequirement { platform: RequirementPlatform; metric: RequirementMetric; min: number }
/** GeoJSON point: `coordinates` is [lng, lat]. */
export interface GeoPoint { type: 'Point'; coordinates: [number, number] }
/** The brand, as the list (populated `name city`) and `GET /admin/offers/:id` attach it. A brand without a name has none. */
export interface OfferVenue { _id: string; name?: string; city?: string }

/** An offer as `POST /admin/offers` and `PATCH /admin/offers/:id` return it: the stored document, no `venue`. */
export interface SavedOffer {
  _id: string;
  brandId: string;
  title: string;
  description: string;
  terms: string;
  deliverables: string;
  address: string;
  location: GeoPoint;
  discountInr: number;
  connectsCost: number;
  totalCoupons: number;
  remainingCoupons: number;
  requirements: OfferRequirement[];
  fundedBy: OfferFundedBy;
  voucherValidityDays: number;
  startsAt: string;
  endsAt: string;
  /** Nothing moves an offer to `ended` when `endsAt` passes: an `active` offer can be past its end. */
  status: OfferStatus;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}
/** An offer as the list and `GET /admin/offers/:id` return it. */
export interface Offer extends SavedOffer { venue: OfferVenue }

/** `GET /admin/offers?status=&page=&limit=`. `limit` defaults to 50; `status` is optional. */
export interface OfferPage { results: Offer[]; total: number; page: number; totalPages: number }
/** `GET /admin/offers/:id` */
export interface OfferResponse { offer: Offer }
/** `POST /admin/offers` (201) and `PATCH /admin/offers/:id` */
export interface SavedOfferResponse { offer: SavedOffer }

/**
 * `POST /admin/offers` body (routes/admin.route.ts createValidator). Dates are ISO strings; `lat`/`lng` become the
 * offer's `location`. Lengths: title 3-80, description 1-1000, terms 1-1000, deliverables up to 500, address 5-200.
 * Whole numbers: discountInr 1-100000, connectsCost 1-100000, totalCoupons 1-10000, voucherValidityDays 1-60.
 * requirements: up to 4, each `min` 0 or more. `endsAt` must be after `startsAt`.
 */
export interface CreateOfferInput {
  brandId: string;
  title: string;
  description: string;
  terms: string;
  deliverables?: string;
  address: string;
  lat: number;
  lng: number;
  discountInr: number;
  connectsCost: number;
  totalCoupons: number;
  requirements: OfferRequirement[];
  fundedBy: OfferFundedBy;
  voucherValidityDays?: number;
  startsAt: string;
  endsAt: string;
}
/**
 * `PATCH /admin/offers/:id` body: any of these. `lat` and `lng` go together; `startsAt`, the money and the funder
 * can't change; `addCoupons` is 1-10000. An ended offer refuses every PATCH ('This offer has ended').
 */
export type UpdateOfferInput = Partial<Pick<CreateOfferInput,
  'title' | 'description' | 'terms' | 'deliverables' | 'address' | 'lat' | 'lng' | 'requirements' | 'endsAt' | 'voucherValidityDays'>>
  & { status?: OfferStatus; addCoupons?: number };

/** `GET /admin/budget`: Tazmify-funded Connects used in the IST month `month` ('YYYY-MM'), against the cap. */
export interface Budget { month: string; usedConnects: number; capConnects: number }

/** `GET /admin/brands?q=` (q: 2-100 characters, matched against name, username, phone and email; up to 20). */
export interface Venue {
  _id: string;
  name?: string;
  username?: string;
  city?: string;
  phoneNumber?: string;
  location: { lat: number; lng: number } | null;
}
export interface VenueSearchResponse { brands: Venue[] }

// --- Vouchers: services/venue/voucher.service.ts AdminVoucherView

export type VoucherStatus = 'active' | 'redeemed' | 'expired' | 'cancelled';
export interface AdminVoucher {
  _id: string;
  /** 'TV' + 8 characters */
  number: string;
  status: VoucherStatus;
  offerId: string;
  offerTitle: string;
  venueName: string;
  connectsCost: number;
  discountInr: number;
  fundedBy: OfferFundedBy;
  /** When it was claimed. */
  createdAt: string;
  expiresAt: string;
  redeemedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  /** `name` is '' when the creator is gone. */
  creator: { _id: string; name: string; username?: string };
}
/** `GET /admin/offers/:id/vouchers` */
export interface OfferVouchersResponse { vouchers: AdminVoucher[] }
/**
 * `GET /admin/vouchers?number=` (the server trims and uppercases it) and `POST /admin/vouchers/:id/cancel`.
 * Cancel takes `{ reason }` (3-300 characters) and works on `active` and `redeemed` vouchers. A 500 'Voucher cancelled
 * but not fully refunded — see the server log' means it IS cancelled.
 */
export interface VoucherResponse { voucher: AdminVoucher }
export interface CancelVoucherInput { reason: string }

// --- Reports: services/venue/report.service.ts

export interface ReportRow { venueId: string; venueName: string; city: string; fundedBy: OfferFundedBy; vouchers: number; connects: number; valueInr: number }
/** `GET /admin/reports/redemptions?month=YYYY-MM`. Add `&format=csv` for the CSV (a Blob, via `apiBlob`). */
export interface RedemptionReport { month: string; rows: ReportRow[] }

// --- Admin accounts (superadmin only): services/admin-accounts.service.ts AdminView

export interface AdminAccount { _id: string; name: string; email: string; role: AdminRole; disabled: boolean; createdAt: string }
/** `GET /admin/admins` */
export interface AdminListResponse { admins: AdminAccount[] }
/** `POST /admin/admins` body: name 2-80, a valid email, password 12-200. Answers 201 `AdminResponse`. */
export interface CreateAdminInput { name: string; email: string; role: AdminRole; password: string }
/** `PATCH /admin/admins/:id` body. Refused on yourself: 'You can't change your own role or disable yourself'. */
export interface UpdateAdminInput { role?: AdminRole; disabled?: boolean }
export interface AdminResponse { admin: AdminAccount }
/** `POST /admin/admins/:id/reset-password` body (12-200). Answers an empty `data`. */
export interface ResetPasswordInput { password: string }

// --- Creators and brands: services/admin/accounts.service.ts

export type AccountStatus = 'active' | 'suspended' | 'deleted';
export interface AccountRow { _id: string; name?: string; username?: string; email?: string; phoneNumber?: string; createdAt: string; status: AccountStatus }
export interface CreatorRow extends AccountRow { profilePicture?: string; totalFollowers?: number; connectsBalance?: number }
export interface BrandRow extends AccountRow { city?: string; verified?: boolean }
/** `GET /admin/accounts/{creators|brands}?q=&status=&page=&limit=` */
export interface AccountPage<T> { results: T[]; total: number; page: number; totalPages: number }

export interface SocialView { platform: string; username?: string; profileLink?: string; followers: number; engagementRate: number; tokenExpired: boolean }
export interface SuspensionView { admin: { by: { _id: string; name: string } | null; reason: string; at: string } | null; reportId: string | null }
export interface AccountReportRow { _id: string; reason: string; status: string; resolution?: string; targetType: string; createdAt: string }
/** services/admin/admin-actions.service.ts. `admin` is null when that admin is gone. */
export interface AdminActionView { _id: string; action: string; details?: string | null; createdAt: string; admin: { _id: string; name: string } | null }
export interface AccountProfile {
  _id: string; name?: string; username?: string; email?: string; phoneNumber?: string; profilePicture?: string; bio?: string; city?: string;
  niches?: string[]; verified?: boolean; onboardingComplete?: boolean; createdAt: string; deletedAccount?: boolean; moderationSuspended?: boolean;
}
export interface CreatorProfile extends AccountProfile { totalFollowers?: number; connectsBalance?: number }
export interface CreatorDetail {
  creator: CreatorProfile; socials: SocialView[]; counts: { applications: number; jobs: number };
  reports: AccountReportRow[]; history: AdminActionView[]; suspension: SuspensionView;
}
export interface BrandDetail {
  brand: AccountProfile;
  campaigns: { _id: string; title: string; status: string; createdAt: string }[];
  reviews: { count: number; average: number; latest: { _id: string; overallRating: number; comment?: string; reviewerRole?: string; createdAt: string }[] };
  reports: AccountReportRow[]; history: AdminActionView[]; suspension: SuspensionView;
}
export interface LedgerRow { _id: string; type: string; amount: number; balanceAfter: number; reason?: string; createdAt: string }
/** `POST …/connects` body: `amount` is a whole number from -100000 to 100000, not 0; reason 3-200; note up to 1000. */
export interface AdjustConnectsInput { amount: number; reason: string; note?: string }

export type CampaignStatus = 'draft' | 'active' | 'closed' | 'completed';
export type JobStatus = 'hired' | 'in_progress' | 'completion_pending' | 'completed' | 'cancelled';
export interface AdminClosed { reason: string; at: string }
/** `GET /admin/campaigns`. `brand` is null when that brand is deleted. */
export interface CampaignRow { _id: string; title: string; status: CampaignStatus; brand: { _id: string; name: string } | null; applications: number; createdAt: string; adminClosed: AdminClosed | null }
/** `GET /admin/jobs`, and `jobs` of a campaign. Each party is null when deleted. */
export interface JobRow { _id: string; status: JobStatus; campaign: { _id: string; title: string } | null; creator: { _id: string; name: string } | null; brand: { _id: string; name: string } | null; createdAt: string }
export interface CampaignDetail {
  campaign: { _id: string; title: string; niche?: string; about?: string; budgetMin?: number; budgetMax?: number; startDate?: string; endDate?: string; deliverables?: string[]; city?: string; pincode?: string; status: CampaignStatus; moderationHidden?: boolean; createdAt: string; adminClosed: AdminClosed | null };
  brand: { _id: string; name: string } | null;
  applicationCounts: { pending: number; accepted: number; rejected: number; hired: number };
  jobs: JobRow[]; reports: AccountReportRow[]; history: AdminActionView[];
}

export type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed';
export type ReportResolution = 'none' | 'hidden' | 'account_suspended' | 'warning';
export type ReportTargetType = 'profile' | 'campaign' | 'media' | 'review' | 'message';
export type ModerationAction = 'reviewing' | 'dismiss' | 'warn' | 'hide' | 'restore' | 'suspend' | 'unsuspend';
/** `reporter` / `subject` are null when that account is deleted. */
export interface ReportPerson { _id: string; role: 'creator' | 'brand'; name: string }
/** `GET /moderation/reports` (enveloped). `snapshot` is user-written text: render it as text only. */
export interface ModerationReport {
  _id: string; reason: string; details?: string; snapshot?: string; status: ReportStatus; resolution: ReportResolution;
  targetType: ReportTargetType; targetId: string; mediaUrl?: string; createdAt: string;
  reporter: ReportPerson | null; subject: ReportPerson | null;
}

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
/** `GET /admin/tickets`. `user` is null when that account is deleted. */
export interface TicketRow { _id: string; subject: string; status: TicketStatus; userRole: 'creator' | 'brand'; user: { _id: string; name: string } | null; createdAt: string; updatedAt: string }
export interface TicketView {
  _id: string; subject: string; description: string; attachments?: string[]; status: TicketStatus; userRole: 'creator' | 'brand'; createdAt: string;
  notes: { text: string; at: string; admin: { _id: string; name: string } | null }[];
}
/** `GET /admin/tickets/:id`. */
export interface TicketDetail {
  ticket: TicketView;
  user: { _id: string; role: 'creator' | 'brand'; name: string; email?: string; phoneNumber?: string } | null;
  history: AdminActionView[];
}

/** `GET /admin/settings/connects`: whole numbers 0-10000 (applicationCost and applicationCostFirst at least 1). */
export interface ConnectsConfig {
  applicationCost: number; applicationCostFirst: number; applicationCostFirstCount: number; signupGrant: number;
  instagramGrant: number; youtubeGrant: number; monthlyRefill: number; balanceCeiling: number;
}
export interface Niche { _id: string; name: string }
export type BroadcastAudience = 'everyone' | 'creators' | 'brands';
export type BroadcastStatus = 'queued' | 'sending' | 'sent' | 'failed';
/** `GET /admin/broadcasts`. `admin` is null when the sender is deleted. */
export interface BroadcastRow {
  _id: string; admin: { _id: string; name: string } | null; audience: BroadcastAudience; title: string; body: string;
  status: BroadcastStatus; recipients: number; delivered: number; createdAt: string;
}
/** `POST /admin/broadcasts` body: title up to 100, body up to 300, `clientKey` a UUID (one per form). */
export interface SendBroadcastInput { audience: BroadcastAudience; title: string; body: string; clientKey: string }
