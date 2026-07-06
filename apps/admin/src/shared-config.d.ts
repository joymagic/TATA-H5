declare module "@tata/shared-config/coupons" {
  export type CouponStatus = "available" | "reserved" | "redeemed";

  export interface CouponRecord {
    id: string;
    code: string;
    amount: number;
    status: CouponStatus;
    batchId: string;
    createdAt: string;
  }

  export const COUPON_BATCH: {
    batchId: string;
    createdAt: string;
    total: number;
  };

  export const COUPON_SUMMARY: Array<{
    amount: number;
    count: number;
  }>;

  export const COUPONS: CouponRecord[];
}
