/**
 * Dhruto — High-performance streaming RFC-4180 CSV & TSV parser
 * with intelligent column alias detection and phone normalization.
 */

export interface ParsedCsv {
  headers: string[];
  rows: Array<Record<string, string>>;
  errors: string[];
  delimiter: string;
}

/** Detects whether input uses comma, tab, or semicolon delimiters. */
export function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/)[0] || "";
  const commas = (firstLine.match(/,/g) || []).length;
  const tabs = (firstLine.match(/\t/g) || []).length;
  const semicolons = (firstLine.match(/;/g) || []).length;

  if (tabs > commas && tabs > semicolons) return "\t";
  if (semicolons > commas && semicolons > tabs) return ";";
  return ",";
}

/** Parses standard RFC-4180 CSV, TSV, or semicolon-delimited files. */
export function parseCsv(text: string, customDelimiter?: string): ParsedCsv {
  const errors: string[] = [];
  const records: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  const clean = text.replace(/^\uFEFF/, "");
  const delimiter = customDelimiter || detectDelimiter(clean);

  for (let i = 0; i < clean.length; i += 1) {
    const ch = clean[i];

    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && clean[i + 1] === "\n") i += 1;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") records.push(row);
      row = [];
    } else {
      field += ch;
    }
  }

  if (inQuotes) {
    errors.push("Unterminated quoted field in CSV/spreadsheet");
    return { headers: [], rows: [], errors, delimiter };
  }

  row.push(field);
  if (row.length > 1 || row[0] !== "") records.push(row);

  if (records.length === 0) {
    return { headers: [], rows: [], errors: ["Spreadsheet file is empty"], delimiter };
  }

  const headers = (records[0] as string[]).map((h) => h.trim());
  return {
    headers,
    rows: (records.slice(1) as string[][]).map((cells) => {
      const record: Record<string, string> = {};
      headers.forEach((h, idx) => {
        record[h] = (cells[idx] ?? "").trim();
      });
      return record;
    }),
    errors,
    delimiter,
  };
}

export const TARGET_FIELDS = [
  { key: "recipientName", label: "Recipient Name", required: true },
  { key: "recipientPhone", label: "Recipient Phone", required: true },
  { key: "deliveryAddress", label: "Delivery Address", required: true },
  { key: "district", label: "District", required: true },
  { key: "thana", label: "Thana / Upazila", required: false },
  { key: "codAmount", label: "COD Amount (৳)", required: true },
  { key: "weight", label: "Weight (KG)", required: false },
  { key: "parcelDescription", label: "Item / Notes", required: false },
] as const;

export type TargetFieldKey = (typeof TARGET_FIELDS)[number]["key"];

const FIELD_ALIASES: Record<TargetFieldKey, string[]> = {
  recipientName: [
    "recipientname",
    "recipient",
    "name",
    "customername",
    "customer",
    "fullname",
    "buyer",
    "client",
    "contactname",
    "receiver",
    "receivername",
  ],
  recipientPhone: [
    "recipientphone",
    "phone",
    "phonenumber",
    "mobile",
    "mobilenumber",
    "contact",
    "contactphone",
    "cell",
    "cellphone",
    "telephone",
    "receiverphone",
    "custphone",
  ],
  deliveryAddress: [
    "deliveryaddress",
    "address",
    "shippingaddress",
    "street",
    "streetaddress",
    "location",
    "fulladdress",
    "dest_address",
    "destinationaddress",
    "destination",
  ],
  district: ["district", "city", "state", "region", "division", "districtname"],
  thana: ["thana", "upazila", "area", "police_station", "policestation", "subdistrict", "zone", "locality"],
  codAmount: [
    "codamount",
    "cod",
    "amount",
    "price",
    "collection",
    "cash",
    "total",
    "payable",
    "collectionamount",
    "cashamount",
    "orderamount",
    "value",
  ],
  weight: ["weight", "weightkg", "kg", "parcelweight", "itemweight", "mass"],
  parcelDescription: [
    "parceldescription",
    "description",
    "item",
    "items",
    "product",
    "products",
    "notes",
    "instructions",
    "specialinstructions",
    "remark",
    "remarks",
    "details",
  ],
};

/** Normalizes Bangladeshi mobile numbers into standard 11-digit `01XXXXXXXXX` */
export function normalizeBdPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("880") && digits.length === 13) {
    return `0${digits.slice(3)}`;
  }
  if (digits.length === 10 && digits.startsWith("1")) {
    return `0${digits}`;
  }
  return digits;
}

/** Automatically maps uploaded file headers to required Dhruto fields. */
export function detectColumnMapping(headers: string[]): Record<TargetFieldKey, string | null> {
  const normalizedHeaders = headers.map((h) => ({
    original: h,
    clean: h.toLowerCase().replace(/[^a-z0-9]/g, ""),
  }));

  const mapping: Record<TargetFieldKey, string | null> = {
    recipientName: null,
    recipientPhone: null,
    deliveryAddress: null,
    district: null,
    thana: null,
    codAmount: null,
    weight: null,
    parcelDescription: null,
  };

  const usedOriginals = new Set<string>();

  for (const field of TARGET_FIELDS) {
    const aliases = FIELD_ALIASES[field.key];
    // Exact or alias match
    const match = normalizedHeaders.find((h) => !usedOriginals.has(h.original) && aliases.includes(h.clean));
    if (match) {
      mapping[field.key] = match.original;
      usedOriginals.add(match.original);
    }
  }

  return mapping;
}

export interface BulkBookingRow {
  recipientName: string;
  recipientPhone: string;
  district: string;
  thana: string;
  deliveryAddress: string;
  parcelDescription?: string;
  codAmount: number;
  weight: number;
}

/** Converts raw record using active column mapping to structured booking row. */
export function applyColumnMapping(
  record: Record<string, string>,
  mapping: Record<TargetFieldKey, string | null>,
): BulkBookingRow {
  const getVal = (key: TargetFieldKey): string => {
    const header = mapping[key];
    return header && record[header] !== undefined ? record[header].trim() : "";
  };

  const parseNum = (val: string, fallback: number): number => {
    if (!val) return fallback;
    const clean = val.replace(/[^0-9.-]/g, "");
    const n = Number(clean);
    return Number.isFinite(n) ? n : fallback;
  };

  const rawPhone = getVal("recipientPhone");
  const normalizedPhone = normalizeBdPhone(rawPhone);

  const row: BulkBookingRow = {
    recipientName: getVal("recipientName"),
    recipientPhone: normalizedPhone || rawPhone,
    deliveryAddress: getVal("deliveryAddress"),
    district: getVal("district"),
    thana: getVal("thana"),
    codAmount: parseNum(getVal("codAmount"), 0),
    weight: Math.max(0.1, parseNum(getVal("weight"), 0.5)),
  };

  const desc = getVal("parcelDescription");
  if (desc) {
    row.parcelDescription = desc;
  }

  return row;
}

/** Backwards-compatible toBulkRow */
export function toBulkRow(record: Record<string, string>): BulkBookingRow {
  const autoMapping = detectColumnMapping(Object.keys(record));
  return applyColumnMapping(record, autoMapping);
}

/** Generates a sample CSV template for instant merchant download. */
export function generateSampleCsv(): string {
  const sampleHeaders = [
    "Recipient Name",
    "Phone Number",
    "District",
    "Thana",
    "Delivery Address",
    "COD Amount",
    "Weight (KG)",
    "Item Description",
  ];

  const sampleRows = [
    [
      "Tanvir Hasan",
      "01711223344",
      "Dhaka",
      "Dhanmondi",
      "House 45, Road 9A, Flat 3B, Dhanmondi R/A",
      "1250",
      "0.5",
      "Casual Denim Shirt - M",
    ],
    [
      "Nadia Siddique",
      "01899998888",
      "Dhaka",
      "Mirpur",
      "House 10, Road 4, Section 10, Mirpur",
      "2400",
      "1.2",
      "Wireless Bluetooth Earbuds",
    ],
    [
      "Arif Chowdhury",
      "01912345678",
      "Chittagong",
      "Panchlaish",
      "House 14, Road 2, Panchlaish R/A",
      "950",
      "0.8",
      "Handcrafted Leather Wallet",
    ],
  ];

  return [
    sampleHeaders.join(","),
    ...sampleRows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")),
  ].join("\r\n");
}
