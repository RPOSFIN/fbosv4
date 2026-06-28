/** Order → assigned vendor (source: OPS sheet / manual) */
const orderVendorMap: Record<string, string> = {
  "FFT/26-27/01": "Vendor A — Print House",
  "FFT/26-27/02": "Vendor B — Cylinder Works",
  "FFT/26-27/03": "Vendor A — Print House",
};

export type VendorCheckResult = {
  allowed: boolean;
  orderId: string;
  assignedVendor: string | null;
  requestedVendor: string;
  message: string;
  checklist: string[];
};

const BASE_CHECKLIST = [
  "Order exists in Order Master (02_Order_Master)",
  "Assigned vendor matches OPS_VENDORS tab",
  "Artwork status = DONE or APPROVED",
  "Cylinder status verified for vendor",
  "Payment terms cleared in finance queue",
  "Order placed ONLY via FBOS (not WhatsApp direct)",
];

export function getOrderVendor(orderId: string): string | null {
  return orderVendorMap[orderId.trim()] ?? null;
}

export function assignOrderVendor(orderId: string, vendor: string) {
  orderVendorMap[orderId.trim()] = vendor.trim();
}

export function validateVendorPlacement(
  orderId: string,
  requestedVendor: string
): VendorCheckResult {
  const assigned = getOrderVendor(orderId);
  const checklist = [...BASE_CHECKLIST];

  if (!assigned) {
    checklist.push("⚠ No vendor assigned yet — assign in Operations first");
    return {
      allowed: false,
      orderId,
      assignedVendor: null,
      requestedVendor,
      message: `Order ${orderId} ka vendor assign nahi hai. Pehle FBOS mein vendor set karo.`,
      checklist,
    };
  }

  const match =
    assigned.toLowerCase().includes(requestedVendor.toLowerCase().slice(0, 8)) ||
    requestedVendor.toLowerCase().includes(assigned.toLowerCase().slice(0, 8));

  if (!match) {
    return {
      allowed: false,
      orderId,
      assignedVendor: assigned,
      requestedVendor,
      message: `BLOCKED: Order ${orderId} already assigned to "${assigned}". "${requestedVendor}" par place nahi kar sakte.`,
      checklist: [
        ...checklist,
        `❌ Vendor mismatch: assigned=${assigned}`,
        "Contact ops lead before re-routing",
      ],
    };
  }

  return {
    allowed: true,
    orderId,
    assignedVendor: assigned,
    requestedVendor,
    message: `OK: Order ${orderId} vendor "${assigned}" verified.`,
    checklist: [...checklist, "✅ Vendor match confirmed"],
  };
}

export function listOrderVendors() {
  return Object.entries(orderVendorMap).map(([orderId, vendor]) => ({ orderId, vendor }));
}
