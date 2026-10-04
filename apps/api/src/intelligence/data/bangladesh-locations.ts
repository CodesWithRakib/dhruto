import { DeliveryZone } from "@dhruto/contracts";

export interface DistrictInfo {
  name: string;
  nameBn: string;
  aliases: string[];
  zone: DeliveryZone;
  thanas: Array<{
    name: string;
    nameBn: string;
    aliases?: string[];
    postalCode?: string;
  }>;
}

export const BANGLADESH_DISTRICTS: DistrictInfo[] = [
  {
    name: "Dhaka",
    nameBn: "ঢাকা",
    aliases: ["dhaka", "dhka", "dhk", "ঢাকা", "ঢাকায়"],
    zone: DeliveryZone.INSIDE_DHAKA,
    thanas: [
      { name: "Dhanmondi", nameBn: "ধানমন্ডি", aliases: ["dhanmondi", "dhanmandi", "ধানমন্ডি"], postalCode: "1205" },
      { name: "Gulshan", nameBn: "গুলশান", aliases: ["gulshan", "গুলশান"], postalCode: "1212" },
      { name: "Banani", nameBn: "বনানী", aliases: ["banani", "বনানী"], postalCode: "1213" },
      { name: "Uttara", nameBn: "উত্তরা", aliases: ["uttara", "utora", "উত্তরা"], postalCode: "1230" },
      { name: "Mirpur", nameBn: "মিরপুর", aliases: ["mirpur", "meerpur", "মিরপুর"], postalCode: "1216" },
      { name: "Mohammadpur", nameBn: "মোহাম্মদপুর", aliases: ["mohammadpur", "mohammodpur", "মোহাম্মদপুর"], postalCode: "1207" },
      { name: "Motijheel", nameBn: "মতিঝিল", aliases: ["motijheel", "motijhil", "মতিঝিল"], postalCode: "1000" },
      { name: "Badda", nameBn: "বাড্ডা", aliases: ["badda", "বাড্ডা"], postalCode: "1212" },
      { name: "Khilgaon", nameBn: "খিলগাঁও", aliases: ["khilgaon", "খিলগাঁও"], postalCode: "1219" },
      { name: "Rampura", nameBn: "রামপুরা", aliases: ["rampura", "রামপুরা"], postalCode: "1219" },
      { name: "Tejgaon", nameBn: "তেজগাঁও", aliases: ["tejgaon", "তেজগাঁও"], postalCode: "1208" },
      { name: "Lalbagh", nameBn: "লালবাগ", aliases: ["lalbagh", "lalbag", "লালবাগ"], postalCode: "1211" },
      { name: "Paltan", nameBn: "পল্টন", aliases: ["paltan", "পল্টন"], postalCode: "1000" },
      { name: "Shahbagh", nameBn: "শাহবাগ", aliases: ["shahbagh", "shahbag", "শাহবাগ"], postalCode: "1000" },
      { name: "Jatrabari", nameBn: "যাত্রাবাড়ী", aliases: ["jatrabari", "যাত্রাবাড়ী", "যাত্রাবাড়ি"], postalCode: "1204" },
      { name: "Demra", nameBn: "ডেমরা", aliases: ["demra", "ডেমরা"], postalCode: "1360" },
      { name: "Savar", nameBn: "সাভার", aliases: ["savar", "shavar", "সাভার"], postalCode: "1340" },
      { name: "Keraniganj", nameBn: "কেরানীগঞ্জ", aliases: ["keraniganj", "কেরানীগঞ্জ"], postalCode: "1310" },
      { name: "Dhamrai", nameBn: "ধামরাই", aliases: ["dhamrai", "ধামরাই"], postalCode: "1350" },
      { name: "Nawabganj", nameBn: "নবাবগঞ্জ", aliases: ["nawabganj", "নবাবগঞ্জ"], postalCode: "1320" },
      { name: "Dohar", nameBn: "দোহার", aliases: ["dohar", "দোহার"], postalCode: "1330" },
    ],
  },
  {
    name: "Gazipur",
    nameBn: "গাজীপুর",
    aliases: ["gazipur", "gajipur", "গাজীপুর"],
    zone: DeliveryZone.DHAKA_SUBURBS,
    thanas: [
      { name: "Gazipur Sadar", nameBn: "গাজীপুর সদর", aliases: ["sadar", "joydebpur", "জয়দেবপুর"], postalCode: "1700" },
      { name: "Tongi", nameBn: "টঙ্গী", aliases: ["tongi", "টঙ্গী"], postalCode: "1710" },
      { name: "Kaliakair", nameBn: "কালিয়াকৈর", aliases: ["kaliakair", "কালিয়াকৈর"], postalCode: "1750" },
      { name: "Kapasia", nameBn: "কাপাসিয়া", aliases: ["kapasia", "কাপাসিয়া"], postalCode: "1730" },
      { name: "Sreepur", nameBn: "শ্রীপুর", aliases: ["sreepur", "shreepur", "শ্রীপুর"], postalCode: "1740" },
    ],
  },
  {
    name: "Narayanganj",
    nameBn: "নারায়ণগঞ্জ",
    aliases: ["narayanganj", "narayangonj", "নারায়ণগঞ্জ"],
    zone: DeliveryZone.DHAKA_SUBURBS,
    thanas: [
      { name: "Narayanganj Sadar", nameBn: "নারায়ণগঞ্জ সদর", aliases: ["sadar", "শহর"], postalCode: "1400" },
      { name: "Fatullah", nameBn: "ফতুল্লা", aliases: ["fatullah", "fatulla", "ফতুল্লা"], postalCode: "1420" },
      { name: "Siddhirganj", nameBn: "সিদ্ধিরগঞ্জ", aliases: ["siddhirganj", "সিদ্ধিরগঞ্জ"], postalCode: "1430" },
      { name: "Bandar", nameBn: "বন্দর", aliases: ["bandar", "বন্দর"], postalCode: "1410" },
      { name: "Rupganj", nameBn: "রূপগঞ্জ", aliases: ["rupganj", "রূপগঞ্জ"], postalCode: "1460" },
      { name: "Araihazar", nameBn: "আড়াইহাজার", aliases: ["araihazar", "আড়াইহাজার"], postalCode: "1450" },
      { name: "Sonargaon", nameBn: "সোনারগাঁও", aliases: ["sonargaon", "সোনারগাঁও"], postalCode: "1440" },
    ],
  },
  {
    name: "Chittagong",
    nameBn: "চট্টগ্রাম",
    aliases: ["chittagong", "chattogram", "ctg", "চট্টগ্রাম"],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    thanas: [
      { name: "Agrabad", nameBn: "আগ্রাবাদ", aliases: ["agrabad", "আগ্রাবাদ"], postalCode: "4100" },
      { name: "Panchlaish", nameBn: "পাঁচলাইশ", aliases: ["panchlaish", "পাঁচলাইশ"], postalCode: "4203" },
      { name: "Kotwali", nameBn: "কোতোয়ালী", aliases: ["kotwali", "কোতোয়ালী"], postalCode: "4000" },
      { name: "Halishahar", nameBn: "হালিশহর", aliases: ["halishahar", "হালিশহর"], postalCode: "4216" },
      { name: "Khulshi", nameBn: "খুলশী", aliases: ["khulshi", "খুলশী"], postalCode: "4225" },
      { name: "Bakalia", nameBn: "বাকলিয়া", aliases: ["bakalia", "বাকলিয়া"], postalCode: "4218" },
      { name: "Double Mooring", nameBn: "ডবলমুরিং", aliases: ["double mooring", "ডবলমুরিং"], postalCode: "4100" },
      { name: "Hathazari", nameBn: "হাটহাজারী", aliases: ["hathazari", "হাটহাজারী"], postalCode: "4330" },
      { name: "Patiya", nameBn: "পটিয়া", aliases: ["patiya", "পটিয়া"], postalCode: "4370" },
      { name: "Sitakunda", nameBn: "সীতাকুণ্ড", aliases: ["sitakunda", "sitakund", "সীতাকুণ্ড"], postalCode: "4310" },
    ],
  },
  {
    name: "Sylhet",
    nameBn: "সিলেট",
    aliases: ["sylhet", "silhet", "সিলেট"],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    thanas: [
      { name: "Sylhet Sadar", nameBn: "সিলেট সদর", aliases: ["sadar", "সদর"], postalCode: "3100" },
      { name: "Zindabazar", nameBn: "জিন্দাবাজার", aliases: ["zindabazar", "জিন্দাবাজার"], postalCode: "3100" },
      { name: "Shah Paran", nameBn: "শাহপরাণ", aliases: ["shah paran", "শাহপরাণ"], postalCode: "3104" },
      { name: "Beanibazar", nameBn: "বিয়ানীবাজার", aliases: ["beanibazar", "বিয়ানীবাজার"], postalCode: "3170" },
      { name: "Golapganj", nameBn: "গোলাপগঞ্জ", aliases: ["golapganj", "গোলাপগঞ্জ"], postalCode: "3160" },
      { name: "South Surma", nameBn: "দক্ষিণ সুরমা", aliases: ["south surma", "দক্ষিণ সুরমা"], postalCode: "3111" },
    ],
  },
  {
    name: "Rajshahi",
    nameBn: "রাজশাহী",
    aliases: ["rajshahi", "রাজশাহী"],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    thanas: [
      { name: "Boalia", nameBn: "বোয়ালিয়া", aliases: ["boalia", "বোয়ালিয়া"], postalCode: "6000" },
      { name: "Motihar", nameBn: "মতিহার", aliases: ["motihar", "মতিহার"], postalCode: "6204" },
      { name: "Rajpara", nameBn: "রাজপাড়া", aliases: ["rajpara", "রাজপাড়া"], postalCode: "6000" },
      { name: "Shah Makhdum", nameBn: "শাহ মখদুম", aliases: ["shah makhdum", "শাহ মখদুম"], postalCode: "6207" },
      { name: "Paba", nameBn: "পবা", aliases: ["paba", "পবা"], postalCode: "6210" },
    ],
  },
  {
    name: "Khulna",
    nameBn: "খুলনা",
    aliases: ["khulna", "খুলনা"],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    thanas: [
      { name: "Khulna Sadar", nameBn: "খুলনা সদর", aliases: ["sadar", "সদর"], postalCode: "9100" },
      { name: "Sonadanga", nameBn: "সোনাডাঙ্গা", aliases: ["sonadanga", "সোনাডাঙ্গা"], postalCode: "9000" },
      { name: "Khalishpur", nameBn: "খালিশপুর", aliases: ["khalishpur", "খালিশপুর"], postalCode: "9000" },
      { name: "Daulatpur", nameBn: "দৌলতপুর", aliases: ["daulatpur", "দৌলতপুর"], postalCode: "9202" },
      { name: "Rupsha", nameBn: "রূপসা", aliases: ["rupsha", "রূপসা"], postalCode: "9240" },
    ],
  },
  {
    name: "Barisal",
    nameBn: "বরিশাল",
    aliases: ["barisal", "barishal", "বরিশাল"],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    thanas: [
      { name: "Barisal Sadar", nameBn: "বরিশাল সদর", aliases: ["sadar", "কোতোয়ালী"], postalCode: "8200" },
      { name: "Airport", nameBn: "বিমানবন্দর", aliases: ["airport", "এয়ারপোর্ট"], postalCode: "8200" },
      { name: "Bakerganj", nameBn: "বাকেরগঞ্জ", aliases: ["bakerganj", "বাকেরগঞ্জ"], postalCode: "8280" },
      { name: "Babuganj", nameBn: "বাবুগঞ্জ", aliases: ["babuganj", "বাবুগঞ্জ"], postalCode: "8210" },
    ],
  },
  {
    name: "Rangpur",
    nameBn: "রংপুর",
    aliases: ["rangpur", "রংপুর"],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    thanas: [
      { name: "Rangpur Sadar", nameBn: "রংপুর সদর", aliases: ["sadar", "সদর"], postalCode: "5400" },
      { name: "Kotwali", nameBn: "কোতোয়ালী", aliases: ["kotwali", "কোতোয়ালী"], postalCode: "5400" },
      { name: "Tajhat", nameBn: "তাজহাট", aliases: ["tajhat", "তাজহাট"], postalCode: "5404" },
      { name: "Mithapukur", nameBn: "মিঠাপুকুর", aliases: ["mithapukur", "মিঠাপুকুর"], postalCode: "5460" },
      { name: "Pirganj", nameBn: "পীরগঞ্জ", aliases: ["pirganj", "পীরগঞ্জ"], postalCode: "5470" },
    ],
  },
  {
    name: "Mymensingh",
    nameBn: "ময়মনসিংহ",
    aliases: ["mymensingh", "ময়মনসিংহ"],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    thanas: [
      { name: "Kotwali", nameBn: "কোতোয়ালী", aliases: ["kotwali", "সদর"], postalCode: "2200" },
      { name: "Muktagacha", nameBn: "মুক্তাগাছা", aliases: ["muktagacha", "মুক্তাগাছা"], postalCode: "2210" },
      { name: "Trishal", nameBn: "ত্রিশাল", aliases: ["trishal", "ত্রিশাল"], postalCode: "2220" },
      { name: "Bhaluka", nameBn: "ভালুকা", aliases: ["bhaluka", "ভালুকা"], postalCode: "2240" },
    ],
  },
  {
    name: "Cumilla",
    nameBn: "কুমিল্লা",
    aliases: ["cumilla", "comilla", "কুমিল্লা"],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    thanas: [
      { name: "Cumilla Adarsha Sadar", nameBn: "কুমিল্লা আদর্শ সদর", aliases: ["sadar", "সদর"], postalCode: "3500" },
      { name: "Cumilla Sadar Dakshin", nameBn: "কুমিল্লা সদর দক্ষিণ", aliases: ["sadar south"], postalCode: "3500" },
      { name: "Laksam", nameBn: "লাকসাম", aliases: ["laksam", "লাকসাম"], postalCode: "3570" },
      { name: "Daudkandi", nameBn: "দাউদকান্দি", aliases: ["daudkandi", "দাউদকান্দি"], postalCode: "3516" },
    ],
  },
  {
    name: "Bogura",
    nameBn: "বগুড়া",
    aliases: ["bogura", "bogra", "বগুড়া", "বগুড়া"],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    thanas: [
      { name: "Bogura Sadar", nameBn: "বগুড়া সদর", aliases: ["sadar", "সদর"], postalCode: "5800" },
      { name: "Shajahanpur", nameBn: "শাজাহানপুর", aliases: ["shajahanpur", "শাজাহানপুর"], postalCode: "5801" },
      { name: "Sherpur", nameBn: "শেরপুর", aliases: ["sherpur", "শেরপুর"], postalCode: "5840" },
    ],
  },
  {
    name: "Cox's Bazar",
    nameBn: "কক্সবাজার",
    aliases: ["cox's bazar", "coxs bazar", "coxsbazar", "কক্সবাজার"],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    thanas: [
      { name: "Cox's Bazar Sadar", nameBn: "কক্সবাজার সদর", aliases: ["sadar", "সদর"], postalCode: "4700" },
      { name: "Teknaf", nameBn: "টেকনাফ", aliases: ["teknaf", "টেকনাফ"], postalCode: "4760" },
      { name: "Ramu", nameBn: "রামু", aliases: ["ramu", "রামু"], postalCode: "4730" },
      { name: "Chakaria", nameBn: "চকোরিয়া", aliases: ["chakaria", "চকোরিয়া"], postalCode: "4740" },
    ],
  },
  {
    name: "Jessore",
    nameBn: "যশোর",
    aliases: ["jessore", "jashore", "যশোর"],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    thanas: [
      { name: "Kotwali", nameBn: "কোতোয়ালী", aliases: ["kotwali", "সদর"], postalCode: "7400" },
      { name: "Jhikargachha", nameBn: "ঝিকরগাছা", aliases: ["jhikargachha", "ঝিকরগাছা"], postalCode: "7420" },
      { name: "Benapole", nameBn: "বেনাপোল", aliases: ["benapole", "বেনাপোল"], postalCode: "7431" },
    ],
  },
];
