/**
 * Realistic Bangladeshi fixture data for e2e suites.
 *
 * Suites run against the dev database, so every record they create must
 * look like a real customer, merchant or parcel — never "Test Rider",
 * "Probe" or "E2E" names. Values are random so repeated runs do not collide.
 */
const FIRST = [
  "Md. Arif", "Nusrat", "Tanvir", "Farzana", "Sabbir", "Mehjabin", "Rakibul", "Sumaiya",
  "Imran", "Tasnim", "Shahriar", "Nadia", "Mahmud", "Ruksana", "Fahim", "Jannatul",
  "Asif", "Sharmin", "Rezaul", "Afroza", "Kamrul", "Lamia", "Habib", "Tahmina",
  "Shakil", "Moushumi", "Zahid", "Ishrat", "Sohel", "Anika",
];
const LAST = [
  "Hossain", "Rahman", "Ahmed", "Islam", "Chowdhury", "Akter", "Khan", "Uddin",
  "Sarker", "Begum", "Mia", "Talukder", "Bhuiyan", "Siddique", "Karim", "Haque",
  "Mollah", "Sheikh", "Majumder", "Alam",
];
const AREAS: Record<string, string[]> = {
  Dhaka: ["Mirpur", "Dhanmondi", "Gulshan", "Uttara", "Mohammadpur", "Badda", "Banani"],
  Chittagong: ["Panchlaish", "Halishahar", "Double Mooring", "Kotwali"],
  Sylhet: ["Zindabazar", "Ambarkhana", "Shahjalal Upashahar"],
  Rajshahi: ["Boalia", "Shaheb Bazar"],
  Khulna: ["Sonadanga", "Khalishpur"],
};
const PRODUCTS = [
  "Cotton three-piece", "Leather wallet", "Bluetooth earbuds", "Jamdani saree", "Kids school bag",
  "Ceramic dinner set", "Skincare combo pack", "Men's panjabi", "Wireless mouse", "Handmade nakshi kantha",
  "Organic honey (1 kg)", "Running shoes", "Phone back cover", "Wall clock", "Prayer mat",
];
const SHOP_SUFFIX = ["Fashion House", "Gadget Point", "Handicrafts", "Online Shop", "Bazar", "Collection"];

const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)]!;
const digits = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");

export const realisticName = (): string => `${pick(FIRST)} ${pick(LAST)}`;

/** Valid BD mobile format (01[3-9]XXXXXXXX). Dev SMS safe mode diverts real sends. */
export const realisticPhone = (): string => `01${pick(["3", "4", "5", "6", "7", "8", "9"])}${digits(8)}`;

export const realisticThana = (district = "Dhaka"): string => pick(AREAS[district] ?? AREAS.Dhaka!);

export const realisticAddress = (district = "Dhaka", thana = realisticThana(district)): string =>
  `House ${1 + Math.floor(Math.random() * 120)}, Road ${1 + Math.floor(Math.random() * 30)}, ${thana}, ${district}`;

export const realisticProduct = (): string => pick(PRODUCTS);

export const realisticShop = (): string => `${pick(LAST)} ${pick(SHOP_SUFFIX)}`;

/** Safe, non-routable mailbox with a realistic local part. */
export const realisticEmail = (name = realisticName()): string =>
  `${name.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "")}.${digits(5)}@example.com`;
