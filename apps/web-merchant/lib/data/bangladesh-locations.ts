import { DeliveryZone } from "@dhruto/contracts";

/** Geography dataset version + provenance for this file. */
export const GEO_DATASET_VERSION = "bd-geo-2026-10" as const;
export const GEO_DATASET_SOURCE =
  "BBS administrative hierarchy (compiled comprehensive reference - 64 districts, 590 thanas/upazilas)" as const;

export interface DistrictInfo {
  name: string;
  nameBn: string;
  aliases: string[];
  zone: DeliveryZone;
  /** Administrative division (e.g. "Dhaka"). Additive — old callers ignore it. */
  division?: string;
  /** Stable canonical code (e.g. "BD-DH-DHK"). Additive. */
  code?: string;
  thanas: Array<{
    name: string;
    nameBn: string;
    aliases?: string[];
    postalCode?: string;
  }>;
}

export const BANGLADESH_DISTRICTS: DistrictInfo[] = [
  {
    "name": "Dhaka",
    "nameBn": "ঢাকা",
    "aliases": [
      "dhaka",
      "dhka",
      "dhk",
      "ঢাকা",
      "ঢাকায়"
    ],
    zone: DeliveryZone.INSIDE_DHAKA,
    "division": "Dhaka",
    "code": "BD-DH-DHK",
    "thanas": [
      {
        "name": "Adabor",
        "nameBn": "আদাবর",
        "aliases": [
          "adabor",
          "আদাবর"
        ]
      },
      {
        "name": "Airport",
        "nameBn": "বিমানবন্দর",
        "aliases": [
          "airport",
          "বিমানবন্দর"
        ]
      },
      {
        "name": "Badda",
        "nameBn": "বাড্ডা",
        "aliases": [
          "badda",
          "বাড্ডা"
        ],
        "postalCode": "1212"
      },
      {
        "name": "Banani",
        "nameBn": "বনানী",
        "aliases": [
          "banani",
          "বনানী"
        ],
        "postalCode": "1213"
      },
      {
        "name": "Bangshal",
        "nameBn": "বংশাল",
        "aliases": [
          "bangshal",
          "বংশাল"
        ]
      },
      {
        "name": "Bhashantek",
        "nameBn": "ভাষানটেক",
        "aliases": [
          "bhashantek",
          "ভাষানটেক"
        ]
      },
      {
        "name": "Cantonment",
        "nameBn": "ক্যান্টনমেন্ট",
        "aliases": [
          "cantonment",
          "ক্যান্টনমেন্ট"
        ]
      },
      {
        "name": "Chawkbazar",
        "nameBn": "চকবাজার",
        "aliases": [
          "chawkbazar",
          "চকবাজার"
        ]
      },
      {
        "name": "Dakshinkhan",
        "nameBn": "দক্ষিণখান",
        "aliases": [
          "dakshinkhan",
          "দক্ষিণখান"
        ]
      },
      {
        "name": "Darus Salam",
        "nameBn": "দারুস সালাম",
        "aliases": [
          "darus salam",
          "দারুস সালাম"
        ]
      },
      {
        "name": "Demra",
        "nameBn": "ডেমরা",
        "aliases": [
          "demra",
          "ডেমরা"
        ],
        "postalCode": "1360"
      },
      {
        "name": "Dhamrai",
        "nameBn": "ধামরাই",
        "aliases": [
          "dhamrai",
          "ধামরাই"
        ],
        "postalCode": "1350"
      },
      {
        "name": "Dhanmondi",
        "nameBn": "ধানমন্ডি",
        "aliases": [
          "dhanmondi",
          "dhanmandi",
          "ধানমন্ডি"
        ],
        "postalCode": "1205"
      },
      {
        "name": "Dohar",
        "nameBn": "দোহার",
        "aliases": [
          "dohar",
          "দোহার"
        ],
        "postalCode": "1330"
      },
      {
        "name": "Gendaria",
        "nameBn": "গেন্ডারিয়া",
        "aliases": [
          "gendaria",
          "গেন্ডারিয়া"
        ]
      },
      {
        "name": "Gulshan",
        "nameBn": "গুলশান",
        "aliases": [
          "gulshan",
          "গুলশান"
        ],
        "postalCode": "1212"
      },
      {
        "name": "Hatirjheel",
        "nameBn": "হাতিরঝিল",
        "aliases": [
          "hatirjheel",
          "হাতিরঝিল"
        ]
      },
      {
        "name": "Hazaribagh",
        "nameBn": "হাজারীবাগ",
        "aliases": [
          "hazaribagh",
          "হাজারীবাগ"
        ]
      },
      {
        "name": "Jatrabari",
        "nameBn": "যাত্রাবাড়ী",
        "aliases": [
          "jatrabari",
          "যাত্রাবাড়ী",
          "যাত্রাবাড়ি"
        ],
        "postalCode": "1204"
      },
      {
        "name": "Kadamtali",
        "nameBn": "কদমতলী",
        "aliases": [
          "kadamtali",
          "কদমতলী"
        ]
      },
      {
        "name": "Kafrul",
        "nameBn": "কাফরুল",
        "aliases": [
          "kafrul",
          "কাফরুল"
        ]
      },
      {
        "name": "Kalabagan",
        "nameBn": "কলাবাগান",
        "aliases": [
          "kalabagan",
          "কলাবাগান"
        ]
      },
      {
        "name": "Kamrangirchar",
        "nameBn": "কামরাঙ্গীরচর",
        "aliases": [
          "kamrangirchar",
          "কামরাঙ্গীরচর"
        ]
      },
      {
        "name": "Keraniganj",
        "nameBn": "কেরানীগঞ্জ",
        "aliases": [
          "keraniganj",
          "কেরানীগঞ্জ"
        ],
        "postalCode": "1310"
      },
      {
        "name": "Khilgaon",
        "nameBn": "খিলগাঁও",
        "aliases": [
          "khilgaon",
          "খিলগাঁও"
        ],
        "postalCode": "1219"
      },
      {
        "name": "Khilkhet",
        "nameBn": "খিলক্ষেত",
        "aliases": [
          "khilkhet",
          "খিলক্ষেত"
        ]
      },
      {
        "name": "Kotwali",
        "nameBn": "কোতোয়ালী",
        "aliases": [
          "kotwali",
          "কোতোয়ালী"
        ]
      },
      {
        "name": "Lalbagh",
        "nameBn": "লালবাগ",
        "aliases": [
          "lalbagh",
          "lalbag",
          "লালবাগ"
        ],
        "postalCode": "1211"
      },
      {
        "name": "Mirpur",
        "nameBn": "মিরপুর",
        "aliases": [
          "mirpur",
          "meerpur",
          "মিরপুর"
        ],
        "postalCode": "1216"
      },
      {
        "name": "Mohammadpur",
        "nameBn": "মোহাম্মদপুর",
        "aliases": [
          "mohammadpur",
          "mohammodpur",
          "মোহাম্মদপুর"
        ],
        "postalCode": "1207"
      },
      {
        "name": "Motijheel",
        "nameBn": "মতিঝিল",
        "aliases": [
          "motijheel",
          "motijhil",
          "মতিঝিল"
        ],
        "postalCode": "1000"
      },
      {
        "name": "Mugda",
        "nameBn": "মুগদা",
        "aliases": [
          "mugda",
          "মুগদা"
        ]
      },
      {
        "name": "Nawabganj",
        "nameBn": "নবাবগঞ্জ",
        "aliases": [
          "nawabganj",
          "নবাবগঞ্জ"
        ],
        "postalCode": "1320"
      },
      {
        "name": "New Market",
        "nameBn": "নিউ মার্কেট",
        "aliases": [
          "new market",
          "নিউ মার্কেট"
        ]
      },
      {
        "name": "Pallabi",
        "nameBn": "পল্লবী",
        "aliases": [
          "pallabi",
          "পল্লবী"
        ]
      },
      {
        "name": "Paltan",
        "nameBn": "পল্টন",
        "aliases": [
          "paltan",
          "পল্টন"
        ],
        "postalCode": "1000"
      },
      {
        "name": "Ramna",
        "nameBn": "রমনা",
        "aliases": [
          "ramna",
          "রমনা"
        ]
      },
      {
        "name": "Rampura",
        "nameBn": "রামপুরা",
        "aliases": [
          "rampura",
          "রামপুরা"
        ],
        "postalCode": "1219"
      },
      {
        "name": "Rupnagar",
        "nameBn": "রূপনগর",
        "aliases": [
          "rupnagar",
          "রূপনগর"
        ]
      },
      {
        "name": "Sabujbagh",
        "nameBn": "সবুজবাগ",
        "aliases": [
          "sabujbagh",
          "সবুজবাগ"
        ]
      },
      {
        "name": "Savar",
        "nameBn": "সাভার",
        "aliases": [
          "savar",
          "shavar",
          "সাভার"
        ],
        "postalCode": "1340"
      },
      {
        "name": "Shah Ali",
        "nameBn": "শাহ আলী",
        "aliases": [
          "shah ali",
          "শাহ আলী"
        ]
      },
      {
        "name": "Shahbagh",
        "nameBn": "শাহবাগ",
        "aliases": [
          "shahbagh",
          "shahbag",
          "শাহবাগ"
        ],
        "postalCode": "1000"
      },
      {
        "name": "Sher-e-Bangla Nagar",
        "nameBn": "শেরেবাংলা নগর",
        "aliases": [
          "sher-e-bangla nagar",
          "শেরেবাংলা নগর"
        ]
      },
      {
        "name": "Shyampur",
        "nameBn": "শ্যামপুর",
        "aliases": [
          "shyampur",
          "শ্যামপুর"
        ]
      },
      {
        "name": "Sutrapur",
        "nameBn": "সূত্রাপুর",
        "aliases": [
          "sutrapur",
          "সূত্রাপুর"
        ]
      },
      {
        "name": "Tejgaon",
        "nameBn": "তেজগাঁও",
        "aliases": [
          "tejgaon",
          "তেজগাঁও"
        ],
        "postalCode": "1208"
      },
      {
        "name": "Turag",
        "nameBn": "তুরাগ",
        "aliases": [
          "turag",
          "তুরাগ"
        ]
      },
      {
        "name": "Uttara",
        "nameBn": "উত্তরা",
        "aliases": [
          "uttara",
          "utora",
          "উত্তরা"
        ],
        "postalCode": "1230"
      },
      {
        "name": "Uttarkhan",
        "nameBn": "উত্তরখান",
        "aliases": [
          "uttarkhan",
          "উত্তরখান"
        ]
      },
      {
        "name": "Vatara",
        "nameBn": "ভাটারা",
        "aliases": [
          "vatara",
          "ভাটারা"
        ]
      },
      {
        "name": "Wari",
        "nameBn": "ওয়ারী",
        "aliases": [
          "wari",
          "ওয়ারী"
        ]
      }
    ]
  },
  {
    "name": "Gazipur",
    "nameBn": "গাজীপুর",
    "aliases": [
      "gazipur",
      "gajipur",
      "গাজীপুর"
    ],
    zone: DeliveryZone.DHAKA_SUBURBS,
    "division": "Dhaka",
    "code": "BD-DH-GAZ",
    "thanas": [
      {
        "name": "Gazipur Sadar",
        "nameBn": "গাজীপুর সদর",
        "aliases": [
          "sadar",
          "joydebpur",
          "জয়দেবপুর"
        ],
        "postalCode": "1700"
      },
      {
        "name": "Kaliakair",
        "nameBn": "কালিয়াকৈর",
        "aliases": [
          "kaliakair",
          "কালিয়াকৈর"
        ],
        "postalCode": "1750"
      },
      {
        "name": "Kaliganj",
        "nameBn": "কালীগঞ্জ",
        "aliases": [
          "kaliganj",
          "কালীগঞ্জ"
        ]
      },
      {
        "name": "Kapasia",
        "nameBn": "কাপাসিয়া",
        "aliases": [
          "kapasia",
          "কাপাসিয়া"
        ],
        "postalCode": "1730"
      },
      {
        "name": "Sreepur",
        "nameBn": "শ্রীপুর",
        "aliases": [
          "sreepur",
          "shreepur",
          "শ্রীপুর"
        ],
        "postalCode": "1740"
      },
      {
        "name": "Tongi",
        "nameBn": "টঙ্গী",
        "aliases": [
          "tongi",
          "টঙ্গী"
        ],
        "postalCode": "1710"
      }
    ]
  },
  {
    "name": "Narayanganj",
    "nameBn": "নারায়ণগঞ্জ",
    "aliases": [
      "narayanganj",
      "narayangonj",
      "নারায়ণগঞ্জ"
    ],
    zone: DeliveryZone.DHAKA_SUBURBS,
    "division": "Dhaka",
    "code": "BD-DH-NGJ",
    "thanas": [
      {
        "name": "Araihazar",
        "nameBn": "আড়াইহাজার",
        "aliases": [
          "araihazar",
          "আড়াইহাজার"
        ],
        "postalCode": "1450"
      },
      {
        "name": "Bandar",
        "nameBn": "বন্দর",
        "aliases": [
          "bandar",
          "বন্দর"
        ],
        "postalCode": "1410"
      },
      {
        "name": "Fatullah",
        "nameBn": "ফতুল্লা",
        "aliases": [
          "fatullah",
          "fatulla",
          "ফতুল্লা"
        ],
        "postalCode": "1420"
      },
      {
        "name": "Narayanganj Sadar",
        "nameBn": "নারায়ণগঞ্জ সদর",
        "aliases": [
          "sadar",
          "শহর"
        ],
        "postalCode": "1400"
      },
      {
        "name": "Rupganj",
        "nameBn": "রূপগঞ্জ",
        "aliases": [
          "rupganj",
          "রূপগঞ্জ"
        ],
        "postalCode": "1460"
      },
      {
        "name": "Siddhirganj",
        "nameBn": "সিদ্ধিরগঞ্জ",
        "aliases": [
          "siddhirganj",
          "সিদ্ধিরগঞ্জ"
        ],
        "postalCode": "1430"
      },
      {
        "name": "Sonargaon",
        "nameBn": "সোনারগাঁও",
        "aliases": [
          "sonargaon",
          "সোনারগাঁও"
        ],
        "postalCode": "1440"
      }
    ]
  },
  {
    "name": "Chittagong",
    "nameBn": "চট্টগ্রাম",
    "aliases": [
      "chittagong",
      "chattogram",
      "ctg",
      "চট্টগ্রাম"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Chattogram",
    "code": "BD-CH-CTG",
    "thanas": [
      {
        "name": "Agrabad",
        "nameBn": "আগ্রাবাদ",
        "aliases": [
          "agrabad",
          "আগ্রাবাদ"
        ],
        "postalCode": "4100"
      },
      {
        "name": "Anwara",
        "nameBn": "আনোয়ারা",
        "aliases": [
          "anwara",
          "আনোয়ারা"
        ]
      },
      {
        "name": "Bakalia",
        "nameBn": "বাকলিয়া",
        "aliases": [
          "bakalia",
          "বাকলিয়া"
        ],
        "postalCode": "4218"
      },
      {
        "name": "Banshkhali",
        "nameBn": "বাঁশখালী",
        "aliases": [
          "banshkhali",
          "বাঁশখালী"
        ]
      },
      {
        "name": "Boalkhali",
        "nameBn": "বোয়ালখালী",
        "aliases": [
          "boalkhali",
          "বোয়ালখালী"
        ]
      },
      {
        "name": "Chandanaish",
        "nameBn": "চন্দনাইশ",
        "aliases": [
          "chandanaish",
          "চন্দনাইশ"
        ]
      },
      {
        "name": "Double Mooring",
        "nameBn": "ডবলমুরিং",
        "aliases": [
          "double mooring",
          "ডবলমুরিং"
        ],
        "postalCode": "4100"
      },
      {
        "name": "Fatikchhari",
        "nameBn": "ফটিকছড়ি",
        "aliases": [
          "fatikchhari",
          "ফটিকছড়ি"
        ]
      },
      {
        "name": "Halishahar",
        "nameBn": "হালিশহর",
        "aliases": [
          "halishahar",
          "হালিশহর"
        ],
        "postalCode": "4216"
      },
      {
        "name": "Hathazari",
        "nameBn": "হাটহাজারী",
        "aliases": [
          "hathazari",
          "হাটহাজারী"
        ],
        "postalCode": "4330"
      },
      {
        "name": "Karnaphuli",
        "nameBn": "কর্ণফুলী",
        "aliases": [
          "karnaphuli",
          "কর্ণফুলী"
        ]
      },
      {
        "name": "Khulshi",
        "nameBn": "খুলশী",
        "aliases": [
          "khulshi",
          "খুলশী"
        ],
        "postalCode": "4225"
      },
      {
        "name": "Kotwali",
        "nameBn": "কোতোয়ালী",
        "aliases": [
          "kotwali",
          "কোতোয়ালী"
        ],
        "postalCode": "4000"
      },
      {
        "name": "Lohagara",
        "nameBn": "লোহাগাড়া",
        "aliases": [
          "lohagara",
          "লোহাগাড়া"
        ]
      },
      {
        "name": "Mirsarai",
        "nameBn": "মীরসরাই",
        "aliases": [
          "mirsarai",
          "মীরসরাই"
        ]
      },
      {
        "name": "Panchlaish",
        "nameBn": "পাঁচলাইশ",
        "aliases": [
          "panchlaish",
          "পাঁচলাইশ"
        ],
        "postalCode": "4203"
      },
      {
        "name": "Patiya",
        "nameBn": "পটিয়া",
        "aliases": [
          "patiya",
          "পটিয়া"
        ],
        "postalCode": "4370"
      },
      {
        "name": "Rangunia",
        "nameBn": "রাঙ্গুনিয়া",
        "aliases": [
          "rangunia",
          "রাঙ্গুনিয়া"
        ]
      },
      {
        "name": "Raozan",
        "nameBn": "রাউজান",
        "aliases": [
          "raozan",
          "রাউজান"
        ]
      },
      {
        "name": "Sandwip",
        "nameBn": "সন্দ্বীপ",
        "aliases": [
          "sandwip",
          "সন্দ্বীপ"
        ]
      },
      {
        "name": "Satkania",
        "nameBn": "সাতকানিয়া",
        "aliases": [
          "satkania",
          "সাতকানিয়া"
        ]
      },
      {
        "name": "Sitakunda",
        "nameBn": "সীতাকুণ্ড",
        "aliases": [
          "sitakunda",
          "sitakund",
          "সীতাকুণ্ড"
        ],
        "postalCode": "4310"
      }
    ]
  },
  {
    "name": "Sylhet",
    "nameBn": "সিলেট",
    "aliases": [
      "sylhet",
      "silhet",
      "সিলেট"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Sylhet",
    "code": "BD-SY-SYL",
    "thanas": [
      {
        "name": "Balaganj",
        "nameBn": "বালাগঞ্জ",
        "aliases": [
          "balaganj",
          "বালাগঞ্জ"
        ]
      },
      {
        "name": "Beanibazar",
        "nameBn": "বিয়ানীবাজার",
        "aliases": [
          "beanibazar",
          "বিয়ানীবাজার"
        ],
        "postalCode": "3170"
      },
      {
        "name": "Bishwanath",
        "nameBn": "বিশ্বনাথ",
        "aliases": [
          "bishwanath",
          "বিশ্বনাথ"
        ]
      },
      {
        "name": "Companiganj",
        "nameBn": "কোম্পানীগঞ্জ",
        "aliases": [
          "companiganj",
          "কোম্পানীগঞ্জ"
        ]
      },
      {
        "name": "Dakkhin Surma",
        "nameBn": "দক্ষিণ সুরমা",
        "aliases": [
          "dakkhin surma",
          "দক্ষিণ সুরমা"
        ]
      },
      {
        "name": "Fenchuganj",
        "nameBn": "ফেঞ্চুগঞ্জ",
        "aliases": [
          "fenchuganj",
          "ফেঞ্চুগঞ্জ"
        ]
      },
      {
        "name": "Golapganj",
        "nameBn": "গোলাপগঞ্জ",
        "aliases": [
          "golapganj",
          "গোলাপগঞ্জ"
        ],
        "postalCode": "3160"
      },
      {
        "name": "Gowainghat",
        "nameBn": "গোয়াইনঘাট",
        "aliases": [
          "gowainghat",
          "গোয়াইনঘাট"
        ]
      },
      {
        "name": "Jaintapur",
        "nameBn": "জৈন্তাপুর",
        "aliases": [
          "jaintapur",
          "জৈন্তাপুর"
        ]
      },
      {
        "name": "Kanaighat",
        "nameBn": "কানাইঘাট",
        "aliases": [
          "kanaighat",
          "কানাইঘাট"
        ]
      },
      {
        "name": "Osmaninagar",
        "nameBn": "ওসমানী নগর",
        "aliases": [
          "osmaninagar",
          "ওসমানী নগর"
        ]
      },
      {
        "name": "Shah Paran",
        "nameBn": "শাহপরাণ",
        "aliases": [
          "shah paran",
          "শাহপরাণ"
        ],
        "postalCode": "3104"
      },
      {
        "name": "South Surma",
        "nameBn": "দক্ষিণ সুরমা",
        "aliases": [
          "south surma",
          "দক্ষিণ সুরমা"
        ],
        "postalCode": "3111"
      },
      {
        "name": "Sylhet Sadar",
        "nameBn": "সিলেট সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "3100"
      },
      {
        "name": "Zakiganj",
        "nameBn": "জকিগঞ্জ",
        "aliases": [
          "zakiganj",
          "জকিগঞ্জ"
        ]
      },
      {
        "name": "Zindabazar",
        "nameBn": "জিন্দাবাজার",
        "aliases": [
          "zindabazar",
          "জিন্দাবাজার"
        ],
        "postalCode": "3100"
      }
    ]
  },
  {
    "name": "Rajshahi",
    "nameBn": "রাজশাহী",
    "aliases": [
      "rajshahi",
      "রাজশাহী"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Rajshahi",
    "code": "BD-RJ-RAJ",
    "thanas": [
      {
        "name": "Bagha",
        "nameBn": "বাঘা",
        "aliases": [
          "bagha",
          "বাঘা"
        ]
      },
      {
        "name": "Bagmara",
        "nameBn": "বাগমারা",
        "aliases": [
          "bagmara",
          "বাগমারা"
        ]
      },
      {
        "name": "Boalia",
        "nameBn": "বোয়ালিয়া",
        "aliases": [
          "boalia",
          "বোয়ালিয়া"
        ],
        "postalCode": "6000"
      },
      {
        "name": "Charghat",
        "nameBn": "চারঘাট",
        "aliases": [
          "charghat",
          "চারঘাট"
        ]
      },
      {
        "name": "Durgapur",
        "nameBn": "দুর্গাপুর",
        "aliases": [
          "durgapur",
          "দুর্গাপুর"
        ]
      },
      {
        "name": "Godagari",
        "nameBn": "গোদাগাড়ী",
        "aliases": [
          "godagari",
          "গোদাগাড়ী"
        ]
      },
      {
        "name": "Mohanpur",
        "nameBn": "মোহনপুর",
        "aliases": [
          "mohanpur",
          "মোহনপুর"
        ]
      },
      {
        "name": "Motihar",
        "nameBn": "মতিহার",
        "aliases": [
          "motihar",
          "মতিহার"
        ],
        "postalCode": "6204"
      },
      {
        "name": "Paba",
        "nameBn": "পবা",
        "aliases": [
          "paba",
          "পবা"
        ],
        "postalCode": "6210"
      },
      {
        "name": "Puthia",
        "nameBn": "পুঠিয়া",
        "aliases": [
          "puthia",
          "পুঠিয়া"
        ]
      },
      {
        "name": "Rajpara",
        "nameBn": "রাজপাড়া",
        "aliases": [
          "rajpara",
          "রাজপাড়া"
        ],
        "postalCode": "6000"
      },
      {
        "name": "Shah Makhdum",
        "nameBn": "শাহ মখদুম",
        "aliases": [
          "shah makhdum",
          "শাহ মখদুম"
        ],
        "postalCode": "6207"
      },
      {
        "name": "Tanore",
        "nameBn": "তানোর",
        "aliases": [
          "tanore",
          "তানোর"
        ]
      }
    ]
  },
  {
    "name": "Khulna",
    "nameBn": "খুলনা",
    "aliases": [
      "khulna",
      "খুলনা"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Khulna",
    "code": "BD-KH-KHU",
    "thanas": [
      {
        "name": "Batiaghata",
        "nameBn": "বটিয়াঘাটা",
        "aliases": [
          "batiaghata",
          "বটিয়াঘাটা"
        ]
      },
      {
        "name": "Dacope",
        "nameBn": "দাকোপ",
        "aliases": [
          "dacope",
          "দাকোপ"
        ]
      },
      {
        "name": "Daulatpur",
        "nameBn": "দৌলতপুর",
        "aliases": [
          "daulatpur",
          "দৌলতপুর"
        ],
        "postalCode": "9202"
      },
      {
        "name": "Dighalia",
        "nameBn": "দিঘলিয়া",
        "aliases": [
          "dighalia",
          "দিঘলিয়া"
        ]
      },
      {
        "name": "Dumuria",
        "nameBn": "ডুমুরিয়া",
        "aliases": [
          "dumuria",
          "ডুমুরিয়া"
        ]
      },
      {
        "name": "Khalishpur",
        "nameBn": "খালিশপুর",
        "aliases": [
          "khalishpur",
          "খালিশপুর"
        ],
        "postalCode": "9000"
      },
      {
        "name": "Khulna Sadar",
        "nameBn": "খুলনা সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "9100"
      },
      {
        "name": "Koyra",
        "nameBn": "কয়রা",
        "aliases": [
          "koyra",
          "কয়রা"
        ]
      },
      {
        "name": "Paikgachha",
        "nameBn": "পাইকগাছা",
        "aliases": [
          "paikgachha",
          "পাইকগাছা"
        ]
      },
      {
        "name": "Phultala",
        "nameBn": "ফুলতলা",
        "aliases": [
          "phultala",
          "ফুলতলা"
        ]
      },
      {
        "name": "Rupsa",
        "nameBn": "রূপসা",
        "aliases": [
          "rupsa",
          "রূপসা"
        ]
      },
      {
        "name": "Rupsha",
        "nameBn": "রূপসা",
        "aliases": [
          "rupsha",
          "রূপসা"
        ],
        "postalCode": "9240"
      },
      {
        "name": "Sonadanga",
        "nameBn": "সোনাডাঙ্গা",
        "aliases": [
          "sonadanga",
          "সোনাডাঙ্গা"
        ],
        "postalCode": "9000"
      },
      {
        "name": "Terokhada",
        "nameBn": "তেরখাদা",
        "aliases": [
          "terokhada",
          "তেরখাদা"
        ]
      }
    ]
  },
  {
    "name": "Barisal",
    "nameBn": "বরিশাল",
    "aliases": [
      "barisal",
      "barishal",
      "borishal",
      "বরিশাল"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Barishal",
    "code": "BD-BA-BSL",
    "thanas": [
      {
        "name": "Agailjhara",
        "nameBn": "আগৈলঝাড়া",
        "aliases": [
          "agailjhara",
          "আগৈলঝাড়া"
        ]
      },
      {
        "name": "Airport",
        "nameBn": "বিমানবন্দর",
        "aliases": [
          "airport",
          "এয়ারপোর্ট"
        ],
        "postalCode": "8200"
      },
      {
        "name": "Babuganj",
        "nameBn": "বাবুগঞ্জ",
        "aliases": [
          "babuganj",
          "বাবুগঞ্জ"
        ],
        "postalCode": "8210"
      },
      {
        "name": "Bakerganj",
        "nameBn": "বাকেরগঞ্জ",
        "aliases": [
          "bakerganj",
          "বাকেরগঞ্জ"
        ],
        "postalCode": "8280"
      },
      {
        "name": "Banaripara",
        "nameBn": "বানারীপাড়া",
        "aliases": [
          "banaripara",
          "বানারীপাড়া"
        ]
      },
      {
        "name": "Barisal Sadar",
        "nameBn": "বরিশাল সদর",
        "aliases": [
          "sadar",
          "কোতোয়ালী"
        ],
        "postalCode": "8200"
      },
      {
        "name": "Barishal Sadar (Kotwali)",
        "nameBn": "বরিশাল সদর",
        "aliases": [
          "barishal sadar (kotwali)",
          "বরিশাল সদর"
        ]
      },
      {
        "name": "Gaurnadi",
        "nameBn": "গৌরনদী",
        "aliases": [
          "gaurnadi",
          "গৌরনদী"
        ]
      },
      {
        "name": "Hijla",
        "nameBn": "হিজলা",
        "aliases": [
          "hijla",
          "হিজলা"
        ]
      },
      {
        "name": "Mehendiganj",
        "nameBn": "মেহেন্দিগঞ্জ",
        "aliases": [
          "mehendiganj",
          "মেহেন্দিগঞ্জ"
        ]
      },
      {
        "name": "Muladi",
        "nameBn": "মুলাদী",
        "aliases": [
          "muladi",
          "মুলাদী"
        ]
      },
      {
        "name": "Ujirpur",
        "nameBn": "উজিরপুর",
        "aliases": [
          "ujirpur",
          "উজিরপুর"
        ]
      }
    ]
  },
  {
    "name": "Rangpur",
    "nameBn": "রংপুর",
    "aliases": [
      "rangpur",
      "রংপুর"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Rangpur",
    "code": "BD-RG-RGP",
    "thanas": [
      {
        "name": "Badarganj",
        "nameBn": "বদরগঞ্জ",
        "aliases": [
          "badarganj",
          "বদরগঞ্জ"
        ]
      },
      {
        "name": "Gangachara",
        "nameBn": "গংগাচড়া",
        "aliases": [
          "gangachara",
          "গংগাচড়া"
        ]
      },
      {
        "name": "Kaunia",
        "nameBn": "কাউনিয়া",
        "aliases": [
          "kaunia",
          "কাউনিয়া"
        ]
      },
      {
        "name": "Kotwali",
        "nameBn": "কোতোয়ালী",
        "aliases": [
          "kotwali",
          "কোতোয়ালী"
        ],
        "postalCode": "5400"
      },
      {
        "name": "Mithapukur",
        "nameBn": "মিঠাপুকুর",
        "aliases": [
          "mithapukur",
          "মিঠাপুকুর"
        ],
        "postalCode": "5460"
      },
      {
        "name": "Pirgachha",
        "nameBn": "পীরগাছা",
        "aliases": [
          "pirgachha",
          "পীরগাছা"
        ]
      },
      {
        "name": "Pirganj",
        "nameBn": "পীরগঞ্জ",
        "aliases": [
          "pirganj",
          "পীরগঞ্জ"
        ],
        "postalCode": "5470"
      },
      {
        "name": "Rangpur Sadar",
        "nameBn": "রংপুর সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "5400"
      },
      {
        "name": "Tajhat",
        "nameBn": "তাজহাট",
        "aliases": [
          "tajhat",
          "তাজহাট"
        ],
        "postalCode": "5404"
      },
      {
        "name": "Taraganj",
        "nameBn": "তারাগঞ্জ",
        "aliases": [
          "taraganj",
          "তারাগঞ্জ"
        ]
      }
    ]
  },
  {
    "name": "Mymensingh",
    "nameBn": "ময়মনসিংহ",
    "aliases": [
      "mymensingh",
      "ময়মনসিংহ"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Mymensingh",
    "code": "BD-MY-MYM",
    "thanas": [
      {
        "name": "Bhaluka",
        "nameBn": "ভালুকা",
        "aliases": [
          "bhaluka",
          "ভালুকা"
        ],
        "postalCode": "2240"
      },
      {
        "name": "Dhobaura",
        "nameBn": "ধোবাউড়া",
        "aliases": [
          "dhobaura",
          "ধোবাউড়া"
        ]
      },
      {
        "name": "Fulbaria",
        "nameBn": "ফুলবাড়ীয়া",
        "aliases": [
          "fulbaria",
          "ফুলবাড়ীয়া"
        ]
      },
      {
        "name": "Fulpur",
        "nameBn": "ফুলপুর",
        "aliases": [
          "fulpur",
          "ফুলপুর"
        ]
      },
      {
        "name": "Gafargaon",
        "nameBn": "গফরগাঁও",
        "aliases": [
          "gafargaon",
          "গফরগাঁও"
        ]
      },
      {
        "name": "Gouripur",
        "nameBn": "গৌরীপুর",
        "aliases": [
          "gouripur",
          "গৌরীপুর"
        ]
      },
      {
        "name": "Haluaghat",
        "nameBn": "হালুয়াঘাট",
        "aliases": [
          "haluaghat",
          "হালুয়াঘাট"
        ]
      },
      {
        "name": "Ishwarganj",
        "nameBn": "ঈশ্বরগঞ্জ",
        "aliases": [
          "ishwarganj",
          "ঈশ্বরগঞ্জ"
        ]
      },
      {
        "name": "Kotwali",
        "nameBn": "কোতোয়ালী",
        "aliases": [
          "kotwali",
          "সদর"
        ],
        "postalCode": "2200"
      },
      {
        "name": "Muktagacha",
        "nameBn": "মুক্তাগাছা",
        "aliases": [
          "muktagacha",
          "মুক্তাগাছা"
        ],
        "postalCode": "2210"
      },
      {
        "name": "Muktagachha",
        "nameBn": "মুক্তাগাছা",
        "aliases": [
          "muktagachha",
          "মুক্তাগাছা"
        ]
      },
      {
        "name": "Mymensingh Sadar",
        "nameBn": "ময়মনসিংহ সদর",
        "aliases": [
          "mymensingh sadar",
          "ময়মনসিংহ সদর"
        ]
      },
      {
        "name": "Nandail",
        "nameBn": "নান্দাইল",
        "aliases": [
          "nandail",
          "নান্দাইল"
        ]
      },
      {
        "name": "Tarakanda",
        "nameBn": "তারাকান্দা",
        "aliases": [
          "tarakanda",
          "তারাকান্দা"
        ]
      },
      {
        "name": "Trishal",
        "nameBn": "ত্রিশাল",
        "aliases": [
          "trishal",
          "ত্রিশাল"
        ],
        "postalCode": "2220"
      }
    ]
  },
  {
    "name": "Cumilla",
    "nameBn": "কুমিল্লা",
    "aliases": [
      "cumilla",
      "comilla",
      "কুমিল্লা"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Chattogram",
    "code": "BD-CH-COM",
    "thanas": [
      {
        "name": "Adarsha Sadar",
        "nameBn": "কুমিল্লা আদর্শ সদর",
        "aliases": [
          "adarsha sadar",
          "কুমিল্লা আদর্শ সদর"
        ]
      },
      {
        "name": "Barura",
        "nameBn": "বরুড়া",
        "aliases": [
          "barura",
          "বরুড়া"
        ]
      },
      {
        "name": "Brahmanpara",
        "nameBn": "ব্রাহ্মণপাড়া",
        "aliases": [
          "brahmanpara",
          "ব্রাহ্মণপাড়া"
        ]
      },
      {
        "name": "Burichang",
        "nameBn": "বুড়িচং",
        "aliases": [
          "burichang",
          "বুড়িচং"
        ]
      },
      {
        "name": "Chandina",
        "nameBn": "চান্দিনা",
        "aliases": [
          "chandina",
          "চান্দিনা"
        ]
      },
      {
        "name": "Chauddagram",
        "nameBn": "চৌদ্দগ্রাম",
        "aliases": [
          "chauddagram",
          "চৌদ্দগ্রাম"
        ]
      },
      {
        "name": "Cumilla Adarsha Sadar",
        "nameBn": "কুমিল্লা আদর্শ সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "3500"
      },
      {
        "name": "Cumilla Sadar Dakshin",
        "nameBn": "কুমিল্লা সদর দক্ষিণ",
        "aliases": [
          "sadar south"
        ],
        "postalCode": "3500"
      },
      {
        "name": "Daudkandi",
        "nameBn": "দাউদকান্দি",
        "aliases": [
          "daudkandi",
          "দাউদকান্দি"
        ],
        "postalCode": "3516"
      },
      {
        "name": "Debidwar",
        "nameBn": "দেবিদ্বার",
        "aliases": [
          "debidwar",
          "দেবিদ্বার"
        ]
      },
      {
        "name": "Homna",
        "nameBn": "হোমনা",
        "aliases": [
          "homna",
          "হোমনা"
        ]
      },
      {
        "name": "Laksam",
        "nameBn": "লাকসাম",
        "aliases": [
          "laksam",
          "লাকসাম"
        ],
        "postalCode": "3570"
      },
      {
        "name": "Lalmai",
        "nameBn": "লালমাই",
        "aliases": [
          "lalmai",
          "লালমাই"
        ]
      },
      {
        "name": "Manoharganj",
        "nameBn": "মনোহরগঞ্জ",
        "aliases": [
          "manoharganj",
          "মনোহরগঞ্জ"
        ]
      },
      {
        "name": "Meghna",
        "nameBn": "মেঘনা",
        "aliases": [
          "meghna",
          "মেঘনা"
        ]
      },
      {
        "name": "Muradnagar",
        "nameBn": "মুরাদনগর",
        "aliases": [
          "muradnagar",
          "মুরাদনগর"
        ]
      },
      {
        "name": "Nangalkot",
        "nameBn": "নাঙ্গলকোট",
        "aliases": [
          "nangalkot",
          "নাঙ্গলকোট"
        ]
      },
      {
        "name": "Sadar Dakkhin",
        "nameBn": "সদর দক্ষিণ",
        "aliases": [
          "sadar dakkhin",
          "সদর দক্ষিণ"
        ]
      },
      {
        "name": "Titas",
        "nameBn": "তিতাস",
        "aliases": [
          "titas",
          "তিতাস"
        ]
      }
    ]
  },
  {
    "name": "Bogura",
    "nameBn": "বগুড়া",
    "aliases": [
      "bogura",
      "bogra",
      "বগুড়া",
      "বগুড়া"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Rajshahi",
    "code": "BD-RJ-BOG",
    "thanas": [
      {
        "name": "Adamdighi",
        "nameBn": "আদমদিঘি",
        "aliases": [
          "adamdighi",
          "আদমদিঘি"
        ]
      },
      {
        "name": "Bogura Sadar",
        "nameBn": "বগুড়া সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "5800"
      },
      {
        "name": "Dhunat",
        "nameBn": "ধুনট",
        "aliases": [
          "dhunat",
          "ধুনট"
        ]
      },
      {
        "name": "Dupchachia",
        "nameBn": "দুপচাচিঁয়া",
        "aliases": [
          "dupchachia",
          "দুপচাচিঁয়া"
        ]
      },
      {
        "name": "Gabtali",
        "nameBn": "গাবতলী",
        "aliases": [
          "gabtali",
          "গাবতলী"
        ]
      },
      {
        "name": "Kahaloo",
        "nameBn": "কাহালু",
        "aliases": [
          "kahaloo",
          "কাহালু"
        ]
      },
      {
        "name": "Nandigram",
        "nameBn": "নন্দিগ্রাম",
        "aliases": [
          "nandigram",
          "নন্দিগ্রাম"
        ]
      },
      {
        "name": "Sariakandi",
        "nameBn": "সারিয়াকান্দি",
        "aliases": [
          "sariakandi",
          "সারিয়াকান্দি"
        ]
      },
      {
        "name": "Shajahanpur",
        "nameBn": "শাজাহানপুর",
        "aliases": [
          "shajahanpur",
          "শাজাহানপুর"
        ],
        "postalCode": "5801"
      },
      {
        "name": "Sherpur",
        "nameBn": "শেরপুর",
        "aliases": [
          "sherpur",
          "শেরপুর"
        ],
        "postalCode": "5840"
      },
      {
        "name": "Shibganj",
        "nameBn": "শিবগঞ্জ",
        "aliases": [
          "shibganj",
          "শিবগঞ্জ"
        ]
      },
      {
        "name": "Sonatala",
        "nameBn": "সোনাতলা",
        "aliases": [
          "sonatala",
          "সোনাতলা"
        ]
      }
    ]
  },
  {
    "name": "Cox's Bazar",
    "nameBn": "কক্সবাজার",
    "aliases": [
      "cox's bazar",
      "coxs bazar",
      "coxsbazar",
      "কক্সবাজার"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Chattogram",
    "code": "BD-CH-COX",
    "thanas": [
      {
        "name": "Chakaria",
        "nameBn": "চকোরিয়া",
        "aliases": [
          "chakaria",
          "চকোরিয়া"
        ],
        "postalCode": "4740"
      },
      {
        "name": "Cox's Bazar Sadar",
        "nameBn": "কক্সবাজার সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "4700"
      },
      {
        "name": "Coxs Bazar Sadar",
        "nameBn": "কক্সবাজার সদর",
        "aliases": [
          "coxs bazar sadar",
          "কক্সবাজার সদর"
        ]
      },
      {
        "name": "Eidgaon",
        "nameBn": "ঈদগাঁও",
        "aliases": [
          "eidgaon",
          "ঈদগাঁও"
        ]
      },
      {
        "name": "Kutubdia",
        "nameBn": "কুতুবদিয়া",
        "aliases": [
          "kutubdia",
          "কুতুবদিয়া"
        ]
      },
      {
        "name": "Maheshkhali",
        "nameBn": "মহেশখালী",
        "aliases": [
          "maheshkhali",
          "মহেশখালী"
        ]
      },
      {
        "name": "Pekua",
        "nameBn": "পেকুয়া",
        "aliases": [
          "pekua",
          "পেকুয়া"
        ]
      },
      {
        "name": "Ramu",
        "nameBn": "রামু",
        "aliases": [
          "ramu",
          "রামু"
        ],
        "postalCode": "4730"
      },
      {
        "name": "Teknaf",
        "nameBn": "টেকনাফ",
        "aliases": [
          "teknaf",
          "টেকনাফ"
        ],
        "postalCode": "4760"
      },
      {
        "name": "Ukhia",
        "nameBn": "উখিয়া",
        "aliases": [
          "ukhia",
          "উখিয়া"
        ]
      }
    ]
  },
  {
    "name": "Jessore",
    "nameBn": "যশোর",
    "aliases": [
      "jessore",
      "jashore",
      "যশোর"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Khulna",
    "code": "BD-KH-JES",
    "thanas": [
      {
        "name": "Abhaynagar",
        "nameBn": "অভয়নগর",
        "aliases": [
          "abhaynagar",
          "অভয়নগর"
        ]
      },
      {
        "name": "Bagharpara",
        "nameBn": "বাঘারপাড়া",
        "aliases": [
          "bagharpara",
          "বাঘারপাড়া"
        ]
      },
      {
        "name": "Benapole",
        "nameBn": "বেনাপোল",
        "aliases": [
          "benapole",
          "বেনাপোল"
        ],
        "postalCode": "7431"
      },
      {
        "name": "Chaugachha",
        "nameBn": "চৌগাছা",
        "aliases": [
          "chaugachha",
          "চৌগাছা"
        ]
      },
      {
        "name": "Jashore Sadar",
        "nameBn": "যশোর সদর",
        "aliases": [
          "jashore sadar",
          "যশোর সদর"
        ]
      },
      {
        "name": "Jhikargachha",
        "nameBn": "ঝিকরগাছা",
        "aliases": [
          "jhikargachha",
          "ঝিকরগাছা"
        ],
        "postalCode": "7420"
      },
      {
        "name": "Keshabpur",
        "nameBn": "কেশবপুর",
        "aliases": [
          "keshabpur",
          "কেশবপুর"
        ]
      },
      {
        "name": "Kotwali",
        "nameBn": "কোতোয়ালী",
        "aliases": [
          "kotwali",
          "সদর"
        ],
        "postalCode": "7400"
      },
      {
        "name": "Manirampur",
        "nameBn": "মণিরামপুর",
        "aliases": [
          "manirampur",
          "মণিরামপুর"
        ]
      },
      {
        "name": "Sharsha",
        "nameBn": "শার্শা",
        "aliases": [
          "sharsha",
          "শার্শা"
        ]
      }
    ]
  },
  {
    "name": "Munshiganj",
    "nameBn": "মুন্সীগঞ্জ",
    "aliases": [
      "munshiganj",
      "munshigonj",
      "মুন্সীগঞ্জ"
    ],
    zone: DeliveryZone.DHAKA_SUBURBS,
    "division": "Dhaka",
    "code": "BD-DH-MUN",
    "thanas": [
      {
        "name": "Gajaria",
        "nameBn": "গজারিয়া",
        "aliases": [
          "gajaria",
          "গজারিয়া"
        ],
        "postalCode": "1510"
      },
      {
        "name": "Gazaria",
        "nameBn": "গজারিয়া",
        "aliases": [
          "gazaria",
          "গজারিয়া"
        ]
      },
      {
        "name": "Lohajang",
        "nameBn": "লৌহজং",
        "aliases": [
          "lohajang",
          "লৌহজং"
        ],
        "postalCode": "1530"
      },
      {
        "name": "Louhajang",
        "nameBn": "লৌহজং",
        "aliases": [
          "louhajang",
          "লৌহজং"
        ]
      },
      {
        "name": "Munshiganj Sadar",
        "nameBn": "মুন্সীগঞ্জ সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "1500"
      },
      {
        "name": "Sirajdikhan",
        "nameBn": "সিরাজদিখান",
        "aliases": [
          "sirajdikhan",
          "সিরাজদিখান"
        ]
      },
      {
        "name": "Sreenagar",
        "nameBn": "শ্রীনগর",
        "aliases": [
          "sreenagar",
          "শ্রীনগর"
        ]
      },
      {
        "name": "Srinagar",
        "nameBn": "শ্রীনগর",
        "aliases": [
          "srinagar",
          "শ্রীনগর"
        ],
        "postalCode": "1550"
      },
      {
        "name": "Tongibari",
        "nameBn": "টংগীবাড়ি",
        "aliases": [
          "tongibari",
          "টংগীবাড়ি"
        ]
      }
    ]
  },
  {
    "name": "Manikganj",
    "nameBn": "মানিকগঞ্জ",
    "aliases": [
      "manikganj",
      "মানিকগঞ্জ"
    ],
    zone: DeliveryZone.DHAKA_SUBURBS,
    "division": "Dhaka",
    "code": "BD-DH-MAN",
    "thanas": [
      {
        "name": "Daulatpur",
        "nameBn": "দৌলতপুর",
        "aliases": [
          "daulatpur",
          "দৌলতপুর"
        ]
      },
      {
        "name": "Ghior",
        "nameBn": "ঘিওর",
        "aliases": [
          "ghior",
          "ঘিওর"
        ]
      },
      {
        "name": "Harirampur",
        "nameBn": "হরিরামপুর",
        "aliases": [
          "harirampur",
          "হরিরামপুর"
        ]
      },
      {
        "name": "Manikganj Sadar",
        "nameBn": "মানিকগঞ্জ সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "1800"
      },
      {
        "name": "Saturia",
        "nameBn": "সাটুরিয়া",
        "aliases": [
          "saturia",
          "সাটুরিয়া"
        ],
        "postalCode": "1810"
      },
      {
        "name": "Shibalay",
        "nameBn": "শিবালয়",
        "aliases": [
          "shibalay",
          "শিবালয়"
        ]
      },
      {
        "name": "Singair",
        "nameBn": "সিংগাইর",
        "aliases": [
          "singair",
          "সিংগাইর"
        ],
        "postalCode": "1820"
      }
    ]
  },
  {
    "name": "Narsingdi",
    "nameBn": "নরসিংদী",
    "aliases": [
      "narsingdi",
      "norshingdi",
      "নরসিংদী"
    ],
    zone: DeliveryZone.DHAKA_SUBURBS,
    "division": "Dhaka",
    "code": "BD-DH-NAR",
    "thanas": [
      {
        "name": "Belabo",
        "nameBn": "বেলাবো",
        "aliases": [
          "belabo",
          "বেলাবো"
        ]
      },
      {
        "name": "Manohardi",
        "nameBn": "মনোহরদী",
        "aliases": [
          "manohardi",
          "মনোহরদী"
        ]
      },
      {
        "name": "Narsingdi Sadar",
        "nameBn": "নরসিংদী সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "1600"
      },
      {
        "name": "Palash",
        "nameBn": "পলাশ",
        "aliases": [
          "palash",
          "পলাশ"
        ],
        "postalCode": "1610"
      },
      {
        "name": "Raipura",
        "nameBn": "রায়পুরা",
        "aliases": [
          "raipura",
          "রায়পুরা"
        ],
        "postalCode": "1630"
      },
      {
        "name": "Shibpur",
        "nameBn": "শিবপুর",
        "aliases": [
          "shibpur",
          "শিবপুর"
        ]
      }
    ]
  },
  {
    "name": "Tangail",
    "nameBn": "টাঙ্গাইল",
    "aliases": [
      "tangail",
      "টাঙ্গাইল"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Dhaka",
    "code": "BD-DH-TAN",
    "thanas": [
      {
        "name": "Basail",
        "nameBn": "বাসাইল",
        "aliases": [
          "basail",
          "বাসাইল"
        ]
      },
      {
        "name": "Bhuanpur",
        "nameBn": "ভুয়াপুর",
        "aliases": [
          "bhuanpur",
          "ভুয়াপুর"
        ]
      },
      {
        "name": "Delduar",
        "nameBn": "দেলদুয়ার",
        "aliases": [
          "delduar",
          "দেলদুয়ার"
        ]
      },
      {
        "name": "Dhanbari",
        "nameBn": "ধনবাড়ী",
        "aliases": [
          "dhanbari",
          "ধনবাড়ী"
        ]
      },
      {
        "name": "Ghatail",
        "nameBn": "ঘাটাইল",
        "aliases": [
          "ghatail",
          "ঘাটাইল"
        ]
      },
      {
        "name": "Gopalpur",
        "nameBn": "গোপালপুর",
        "aliases": [
          "gopalpur",
          "গোপালপুর"
        ]
      },
      {
        "name": "Kalihati",
        "nameBn": "কালিহাতী",
        "aliases": [
          "kalihati",
          "কালিহাতী"
        ],
        "postalCode": "1970"
      },
      {
        "name": "Madhupur",
        "nameBn": "মধুপুর",
        "aliases": [
          "madhupur",
          "মধুপুর"
        ]
      },
      {
        "name": "Mirzapur",
        "nameBn": "মির্জাপুর",
        "aliases": [
          "mirzapur",
          "মির্জাপুর"
        ],
        "postalCode": "1940"
      },
      {
        "name": "Nagarpur",
        "nameBn": "নাগরপুর",
        "aliases": [
          "nagarpur",
          "নাগরপুর"
        ]
      },
      {
        "name": "Sakhipur",
        "nameBn": "সখীপুর",
        "aliases": [
          "sakhipur",
          "সখীপুর"
        ],
        "postalCode": "1950"
      },
      {
        "name": "Tangail Sadar",
        "nameBn": "টাঙ্গাইল সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "1900"
      }
    ]
  },
  {
    "name": "Kishoreganj",
    "nameBn": "কিশোরগঞ্জ",
    "aliases": [
      "kishoreganj",
      "kishoregonj",
      "কিশোরগঞ্জ"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Dhaka",
    "code": "BD-DH-KIS",
    "thanas": [
      {
        "name": "Austagram",
        "nameBn": "অষ্টগ্রাম",
        "aliases": [
          "austagram",
          "অষ্টগ্রাম"
        ]
      },
      {
        "name": "Bajitpur",
        "nameBn": "বাজিতপুর",
        "aliases": [
          "bajitpur",
          "বাজিতপুর"
        ]
      },
      {
        "name": "Bhairab",
        "nameBn": "ভৈরব",
        "aliases": [
          "bhairab",
          "ভৈরব"
        ],
        "postalCode": "2350"
      },
      {
        "name": "Hossainpur",
        "nameBn": "হোসেনপুর",
        "aliases": [
          "hossainpur",
          "হোসেনপুর"
        ]
      },
      {
        "name": "Itna",
        "nameBn": "ইটনা",
        "aliases": [
          "itna",
          "ইটনা"
        ]
      },
      {
        "name": "Karimganj",
        "nameBn": "করিমগঞ্জ",
        "aliases": [
          "karimganj",
          "করিমগঞ্জ"
        ]
      },
      {
        "name": "Katiadi",
        "nameBn": "কটিয়াদী",
        "aliases": [
          "katiadi",
          "কটিয়াদী"
        ]
      },
      {
        "name": "Kishoreganj Sadar",
        "nameBn": "কিশোরগঞ্জ সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "2300"
      },
      {
        "name": "Kuliarchar",
        "nameBn": "কুলিয়ারচর",
        "aliases": [
          "kuliarchar",
          "কুলিয়ারচর"
        ],
        "postalCode": "2340"
      },
      {
        "name": "Mithamain",
        "nameBn": "মিঠামইন",
        "aliases": [
          "mithamain",
          "মিঠামইন"
        ]
      },
      {
        "name": "Nikli",
        "nameBn": "নিকলী",
        "aliases": [
          "nikli",
          "নিকলী"
        ]
      },
      {
        "name": "Pakundia",
        "nameBn": "পাকুন্দিয়া",
        "aliases": [
          "pakundia",
          "পাকুন্দিয়া"
        ]
      },
      {
        "name": "Tarail",
        "nameBn": "তাড়াইল",
        "aliases": [
          "tarail",
          "তাড়াইল"
        ]
      }
    ]
  },
  {
    "name": "Faridpur",
    "nameBn": "ফরিদপুর",
    "aliases": [
      "faridpur",
      "ফরিদপুর"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Dhaka",
    "code": "BD-DH-FAR",
    "thanas": [
      {
        "name": "Alfadanga",
        "nameBn": "আলফাডাঙ্গা",
        "aliases": [
          "alfadanga",
          "আলফাডাঙ্গা"
        ],
        "postalCode": "7870"
      },
      {
        "name": "Bhanga",
        "nameBn": "ভাঙ্গা",
        "aliases": [
          "bhanga",
          "ভাঙ্গা"
        ],
        "postalCode": "7830"
      },
      {
        "name": "Boalmari",
        "nameBn": "বোয়ালমারী",
        "aliases": [
          "boalmari",
          "বোয়ালমারী"
        ]
      },
      {
        "name": "Char Bhadrasan",
        "nameBn": "চরভদ্রাসন",
        "aliases": [
          "char bhadrasan",
          "চরভদ্রাসন"
        ]
      },
      {
        "name": "Faridpur Sadar",
        "nameBn": "ফরিদপুর সদর",
        "aliases": [
          "kotwali",
          "sadar",
          "সদর"
        ],
        "postalCode": "7800"
      },
      {
        "name": "Madhukhali",
        "nameBn": "মধুখালী",
        "aliases": [
          "madhukhali",
          "মধুখালী"
        ]
      },
      {
        "name": "Nagarkanda",
        "nameBn": "নগরকান্দা",
        "aliases": [
          "nagarkanda",
          "নগরকান্দা"
        ]
      },
      {
        "name": "Sadarpur",
        "nameBn": "সদরপুর",
        "aliases": [
          "sadarpur",
          "সদরপুর"
        ]
      },
      {
        "name": "Saltha",
        "nameBn": "সালথা",
        "aliases": [
          "saltha",
          "সালথা"
        ]
      }
    ]
  },
  {
    "name": "Gopalganj",
    "nameBn": "গোপালগঞ্জ",
    "aliases": [
      "gopalganj",
      "gopalgonj",
      "গোপালগঞ্জ"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Dhaka",
    "code": "BD-DH-GOP",
    "thanas": [
      {
        "name": "Gopalganj Sadar",
        "nameBn": "গোপালগঞ্জ সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "8100"
      },
      {
        "name": "Kashiani",
        "nameBn": "কাশিয়ানী",
        "aliases": [
          "kashiani",
          "কাশিয়ানী"
        ]
      },
      {
        "name": "Kotalipara",
        "nameBn": "কোটালীপাড়া",
        "aliases": [
          "kotalipara",
          "কোটালীপাড়া"
        ],
        "postalCode": "8110"
      },
      {
        "name": "Muksudpur",
        "nameBn": "মুকসুদপুর",
        "aliases": [
          "muksudpur",
          "মুকসুদপুর"
        ]
      },
      {
        "name": "Tungipara",
        "nameBn": "টুঙ্গিপাড়া",
        "aliases": [
          "tungipara",
          "টুঙ্গিপাড়া"
        ],
        "postalCode": "8120"
      }
    ]
  },
  {
    "name": "Madaripur",
    "nameBn": "মাদারীপুর",
    "aliases": [
      "madaripur",
      "মাদারীপুর"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Dhaka",
    "code": "BD-DH-MAD",
    "thanas": [
      {
        "name": "Dasar",
        "nameBn": "ডাসার",
        "aliases": [
          "dasar",
          "ডাসার"
        ]
      },
      {
        "name": "Kalkini",
        "nameBn": "কালকিনি",
        "aliases": [
          "kalkini",
          "কালকিনি"
        ],
        "postalCode": "7920"
      },
      {
        "name": "Madaripur Sadar",
        "nameBn": "মাদারীপুর সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "7900"
      },
      {
        "name": "Rajoir",
        "nameBn": "রাজৈর",
        "aliases": [
          "rajoir",
          "রাজৈর"
        ]
      },
      {
        "name": "Shibchar",
        "nameBn": "শিবচর",
        "aliases": [
          "shibchar",
          "শিবচর"
        ],
        "postalCode": "7930"
      }
    ]
  },
  {
    "name": "Rajbari",
    "nameBn": "রাজবাড়ী",
    "aliases": [
      "rajbari",
      "রাজবাড়ী"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Dhaka",
    "code": "BD-DH-RAJ",
    "thanas": [
      {
        "name": "Baliakandi",
        "nameBn": "বালিয়াকান্দি",
        "aliases": [
          "baliakandi",
          "বালিয়াকান্দি"
        ]
      },
      {
        "name": "Goalanda",
        "nameBn": "গোয়ালন্দ",
        "aliases": [
          "goalanda",
          "গোয়ালন্দ"
        ],
        "postalCode": "7710"
      },
      {
        "name": "Kalukhali",
        "nameBn": "কালুখালী",
        "aliases": [
          "kalukhali",
          "কালুখালী"
        ]
      },
      {
        "name": "Pangsha",
        "nameBn": "পাংশা",
        "aliases": [
          "pangsha",
          "পাংশা"
        ],
        "postalCode": "7720"
      },
      {
        "name": "Rajbari Sadar",
        "nameBn": "রাজবাড়ী সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "7700"
      }
    ]
  },
  {
    "name": "Shariatpur",
    "nameBn": "শরীয়তপুর",
    "aliases": [
      "shariatpur",
      "শরীয়তপুর"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Dhaka",
    "code": "BD-DH-SHA",
    "thanas": [
      {
        "name": "Bhedarganj",
        "nameBn": "ভেদরগঞ্জ",
        "aliases": [
          "bhedarganj",
          "ভেদরগঞ্জ"
        ]
      },
      {
        "name": "Damudya",
        "nameBn": "ডামুড্যা",
        "aliases": [
          "damudya",
          "ডামুড্যা"
        ]
      },
      {
        "name": "Gosairhat",
        "nameBn": "গোসাইরহাট",
        "aliases": [
          "gosairhat",
          "গোসাইরহাট"
        ]
      },
      {
        "name": "Naria",
        "nameBn": "নড়িয়া",
        "aliases": [
          "naria",
          "নড়িয়া"
        ],
        "postalCode": "8020"
      },
      {
        "name": "Shariatpur Sadar",
        "nameBn": "শরীয়তপুর সদর",
        "aliases": [
          "palong",
          "sadar",
          "সদর"
        ],
        "postalCode": "8000"
      },
      {
        "name": "Zajira",
        "nameBn": "জাজিরা",
        "aliases": [
          "zajira",
          "জাজিরা"
        ],
        "postalCode": "8010"
      }
    ]
  },
  {
    "name": "Noakhali",
    "nameBn": "নোয়াখালী",
    "aliases": [
      "noakhali",
      "নোয়াখালী"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Chattogram",
    "code": "BD-CH-NOA",
    "thanas": [
      {
        "name": "Begumganj",
        "nameBn": "বেগমগঞ্জ",
        "aliases": [
          "begumganj",
          "বেগমগঞ্জ"
        ],
        "postalCode": "3820"
      },
      {
        "name": "Chatkhil",
        "nameBn": "চাটখিল",
        "aliases": [
          "chatkhil",
          "চাটখিল"
        ]
      },
      {
        "name": "Companiganj",
        "nameBn": "কোম্পানীগঞ্জ",
        "aliases": [
          "companiganj",
          "কোম্পানীগঞ্জ"
        ]
      },
      {
        "name": "Hatiya",
        "nameBn": "হাতিয়া",
        "aliases": [
          "hatiya",
          "হাতিয়া"
        ],
        "postalCode": "3890"
      },
      {
        "name": "Kabirhat",
        "nameBn": "কবিরহাট",
        "aliases": [
          "kabirhat",
          "কবিরহাট"
        ]
      },
      {
        "name": "Noakhali Sadar",
        "nameBn": "নোয়াখালী সদর",
        "aliases": [
          "sudharam",
          "sadar",
          "সদর"
        ],
        "postalCode": "3800"
      },
      {
        "name": "Senbag",
        "nameBn": "সেনবাগ",
        "aliases": [
          "senbag",
          "সেনবাগ"
        ]
      },
      {
        "name": "Senbagh",
        "nameBn": "সেনবাগ",
        "aliases": [
          "senbagh",
          "সেনবাগ"
        ],
        "postalCode": "3830"
      },
      {
        "name": "Sonaimuri",
        "nameBn": "সোনাইমুড়ী",
        "aliases": [
          "sonaimuri",
          "সোনাইমুড়ী"
        ]
      },
      {
        "name": "Subarnachar",
        "nameBn": "সুবর্ণচর",
        "aliases": [
          "subarnachar",
          "সুবর্ণচর"
        ]
      }
    ]
  },
  {
    "name": "Feni",
    "nameBn": "ফেনী",
    "aliases": [
      "feni",
      "ফেনী"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Chattogram",
    "code": "BD-CH-FEN",
    "thanas": [
      {
        "name": "Chhagalnaiya",
        "nameBn": "ছাগলনাইয়া",
        "aliases": [
          "chhagalnaiya",
          "ছাগলনাইয়া"
        ]
      },
      {
        "name": "Daganbhuiyan",
        "nameBn": "দাগনভূঞা",
        "aliases": [
          "daganbhuiyan",
          "দাগনভূঞা"
        ],
        "postalCode": "3920"
      },
      {
        "name": "Feni Sadar",
        "nameBn": "ফেনী সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "3900"
      },
      {
        "name": "Fulgazi",
        "nameBn": "ফুলগাজী",
        "aliases": [
          "fulgazi",
          "ফুলগাজী"
        ]
      },
      {
        "name": "Parashuram",
        "nameBn": "পরশুরাম",
        "aliases": [
          "parashuram",
          "পরশুরাম"
        ]
      },
      {
        "name": "Sonagazi",
        "nameBn": "সোনাগাজী",
        "aliases": [
          "sonagazi",
          "সোনাগাজী"
        ],
        "postalCode": "3930"
      }
    ]
  },
  {
    "name": "Lakshmipur",
    "nameBn": "লক্ষ্মীপুর",
    "aliases": [
      "lakshmipur",
      "laxmipur",
      "লক্ষ্মীপুর"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Chattogram",
    "code": "BD-CH-LAK",
    "thanas": [
      {
        "name": "Kamalnagar",
        "nameBn": "কমলনগর",
        "aliases": [
          "kamalnagar",
          "কমলনগর"
        ]
      },
      {
        "name": "Lakshmipur Sadar",
        "nameBn": "লক্ষ্মীপুর সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "3700"
      },
      {
        "name": "Raipur",
        "nameBn": "রায়পুর",
        "aliases": [
          "raipur",
          "রায়পুর"
        ],
        "postalCode": "3710"
      },
      {
        "name": "Ramganj",
        "nameBn": "রামগঞ্জ",
        "aliases": [
          "ramganj",
          "রামগঞ্জ"
        ],
        "postalCode": "3720"
      },
      {
        "name": "Ramgati",
        "nameBn": "রামগতি",
        "aliases": [
          "ramgati",
          "রামগতি"
        ]
      }
    ]
  },
  {
    "name": "Chandpur",
    "nameBn": "চাঁদপুর",
    "aliases": [
      "chandpur",
      "চাঁদপুর"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Chattogram",
    "code": "BD-CH-CHA",
    "thanas": [
      {
        "name": "Chandpur Sadar",
        "nameBn": "চাঁদপুর সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "3600"
      },
      {
        "name": "Faridganj",
        "nameBn": "ফরিদগঞ্জ",
        "aliases": [
          "faridganj",
          "ফরিদগঞ্জ"
        ]
      },
      {
        "name": "Haimchar",
        "nameBn": "হাইমচর",
        "aliases": [
          "haimchar",
          "হাইমচর"
        ]
      },
      {
        "name": "Hajiganj",
        "nameBn": "হাজীগঞ্জ",
        "aliases": [
          "hajiganj",
          "হাজীগঞ্জ"
        ],
        "postalCode": "3610"
      },
      {
        "name": "Kachua",
        "nameBn": "কচুয়া",
        "aliases": [
          "kachua",
          "কচুয়া"
        ]
      },
      {
        "name": "Matlab Dakkhin",
        "nameBn": "মতলব দক্ষিণ",
        "aliases": [
          "matlab dakkhin",
          "মতলব দক্ষিণ"
        ]
      },
      {
        "name": "Matlab Dakshin",
        "nameBn": "মতলব দক্ষিণ",
        "aliases": [
          "matlab",
          "মতলব"
        ],
        "postalCode": "3640"
      },
      {
        "name": "Matlab Uttar",
        "nameBn": "মতলব উত্তর",
        "aliases": [
          "matlab uttar",
          "মতলব উত্তর"
        ]
      },
      {
        "name": "Shahrasti",
        "nameBn": "শাহরাস্তি\t",
        "aliases": [
          "shahrasti",
          "শাহরাস্তি\t"
        ]
      }
    ]
  },
  {
    "name": "Brahmanbaria",
    "nameBn": "ব্রাহ্মণবাড়িয়া",
    "aliases": [
      "brahmanbaria",
      "bbaria",
      "ব্রাহ্মণবাড়িয়া"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Chattogram",
    "code": "BD-CH-BRA",
    "thanas": [
      {
        "name": "Akhaura",
        "nameBn": "আখাউড়া",
        "aliases": [
          "akhaura",
          "আখাউড়া"
        ]
      },
      {
        "name": "Ashuganj",
        "nameBn": "আশুগঞ্জ",
        "aliases": [
          "ashuganj",
          "আশুগঞ্জ"
        ],
        "postalCode": "3410"
      },
      {
        "name": "Banchharampur",
        "nameBn": "বাঞ্ছারামপুর",
        "aliases": [
          "banchharampur",
          "বাঞ্ছারামপুর"
        ]
      },
      {
        "name": "Bijoynagar",
        "nameBn": "বিজয়নগর",
        "aliases": [
          "bijoynagar",
          "বিজয়নগর"
        ]
      },
      {
        "name": "Brahmanbaria Sadar",
        "nameBn": "ব্রাহ্মণবাড়িয়া সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "3400"
      },
      {
        "name": "Kasba",
        "nameBn": "কসবা",
        "aliases": [
          "kasba",
          "কসবা"
        ]
      },
      {
        "name": "Nabinagar",
        "nameBn": "নবীনগর",
        "aliases": [
          "nabinagar",
          "নবীনগর"
        ],
        "postalCode": "3430"
      },
      {
        "name": "Nasirnagar",
        "nameBn": "নাসিরনগর",
        "aliases": [
          "nasirnagar",
          "নাসিরনগর"
        ]
      },
      {
        "name": "Sarail",
        "nameBn": "সরাইল",
        "aliases": [
          "sarail",
          "সরাইল"
        ]
      }
    ]
  },
  {
    "name": "Khagrachhari",
    "nameBn": "খাগড়াছড়ি",
    "aliases": [
      "khagrachhari",
      "khagrachari",
      "খাগড়াছড়ি"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Chattogram",
    "code": "BD-CH-KHA",
    "thanas": [
      {
        "name": "Dighinala",
        "nameBn": "দীঘিনালা",
        "aliases": [
          "dighinala",
          "দীঘিনালা"
        ],
        "postalCode": "4420"
      },
      {
        "name": "Guimara",
        "nameBn": "গুইমারা",
        "aliases": [
          "guimara",
          "গুইমারা"
        ]
      },
      {
        "name": "Khagrachhari Sadar",
        "nameBn": "খাগড়াছড়ি সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "4400"
      },
      {
        "name": "Lakkhichhari",
        "nameBn": "লক্ষীছড়ি",
        "aliases": [
          "lakkhichhari",
          "লক্ষীছড়ি"
        ]
      },
      {
        "name": "Mahalchhari",
        "nameBn": "মহালছড়ি",
        "aliases": [
          "mahalchhari",
          "মহালছড়ি"
        ]
      },
      {
        "name": "Manikchhari",
        "nameBn": "মানিকছড়ি",
        "aliases": [
          "manikchhari",
          "মানিকছড়ি"
        ]
      },
      {
        "name": "Matiranga",
        "nameBn": "মাটিরাঙ্গা",
        "aliases": [
          "matiranga",
          "মাটিরাঙ্গা"
        ],
        "postalCode": "4450"
      },
      {
        "name": "Panchhari",
        "nameBn": "পানছড়ি",
        "aliases": [
          "panchhari",
          "পানছড়ি"
        ]
      },
      {
        "name": "Ramgarh",
        "nameBn": "রামগড়",
        "aliases": [
          "ramgarh",
          "রামগড়"
        ]
      }
    ]
  },
  {
    "name": "Rangamati",
    "nameBn": "রাঙ্গামাটি",
    "aliases": [
      "rangamati",
      "রাঙ্গামাটি"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Chattogram",
    "code": "BD-CH-RAN",
    "thanas": [
      {
        "name": "Baghaichhari",
        "nameBn": "বাঘাইছড়ি",
        "aliases": [
          "baghaichhari",
          "বাঘাইছড়ি"
        ],
        "postalCode": "4570"
      },
      {
        "name": "Barkal",
        "nameBn": "বরকল",
        "aliases": [
          "barkal",
          "বরকল"
        ]
      },
      {
        "name": "Belaichhari",
        "nameBn": "বিলাইছড়ি",
        "aliases": [
          "belaichhari",
          "বিলাইছড়ি"
        ]
      },
      {
        "name": "Jurachhari",
        "nameBn": "জুরাছড়ি",
        "aliases": [
          "jurachhari",
          "জুরাছড়ি"
        ]
      },
      {
        "name": "Kaptai",
        "nameBn": "কাপ্তাই",
        "aliases": [
          "kaptai",
          "কাপ্তাই"
        ],
        "postalCode": "4530"
      },
      {
        "name": "Kawkhali",
        "nameBn": "কাউখালী",
        "aliases": [
          "kawkhali",
          "কাউখালী"
        ]
      },
      {
        "name": "Langadu",
        "nameBn": "লংগদু",
        "aliases": [
          "langadu",
          "লংগদু"
        ]
      },
      {
        "name": "Naniarchar",
        "nameBn": "নানিয়ারচর",
        "aliases": [
          "naniarchar",
          "নানিয়ারচর"
        ]
      },
      {
        "name": "Rajasthali",
        "nameBn": "রাজস্থলী",
        "aliases": [
          "rajasthali",
          "রাজস্থলী"
        ]
      },
      {
        "name": "Rangamati Sadar",
        "nameBn": "রাঙ্গামাটি সদর",
        "aliases": [
          "kotwali",
          "sadar",
          "সদর"
        ],
        "postalCode": "4500"
      }
    ]
  },
  {
    "name": "Bandarban",
    "nameBn": "বান্দরবান",
    "aliases": [
      "bandarban",
      "বান্দরবান"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Chattogram",
    "code": "BD-CH-BAN",
    "thanas": [
      {
        "name": "Alikadam",
        "nameBn": "আলীকদম",
        "aliases": [
          "alikadam",
          "আলীকদম"
        ],
        "postalCode": "4650"
      },
      {
        "name": "Bandarban Sadar",
        "nameBn": "বান্দরবান সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "4600"
      },
      {
        "name": "Lama",
        "nameBn": "লামা",
        "aliases": [
          "lama",
          "লামা"
        ],
        "postalCode": "4640"
      },
      {
        "name": "Naikkhongchhari",
        "nameBn": "নাইক্ষ্যংছড়ি",
        "aliases": [
          "naikkhongchhari",
          "নাইক্ষ্যংছড়ি"
        ]
      },
      {
        "name": "Rowangchhari",
        "nameBn": "রোয়াংছড়ি",
        "aliases": [
          "rowangchhari",
          "রোয়াংছড়ি"
        ]
      },
      {
        "name": "Ruma",
        "nameBn": "রুমা",
        "aliases": [
          "ruma",
          "রুমা"
        ]
      },
      {
        "name": "Thanchi",
        "nameBn": "থানচি",
        "aliases": [
          "thanchi",
          "থানচি"
        ]
      }
    ]
  },
  {
    "name": "Pabna",
    "nameBn": "পাবনা",
    "aliases": [
      "pabna",
      "পাবনা"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Rajshahi",
    "code": "BD-RJ-PAB",
    "thanas": [
      {
        "name": "Atgharia",
        "nameBn": "আটঘরিয়া",
        "aliases": [
          "atgharia",
          "আটঘরিয়া"
        ]
      },
      {
        "name": "Bera",
        "nameBn": "বেড়া",
        "aliases": [
          "bera",
          "বেড়া"
        ],
        "postalCode": "6640"
      },
      {
        "name": "Bhangura",
        "nameBn": "ভাঙ্গুড়া",
        "aliases": [
          "bhangura",
          "ভাঙ্গুড়া"
        ]
      },
      {
        "name": "Chatmohar",
        "nameBn": "চাটমোহর",
        "aliases": [
          "chatmohar",
          "চাটমোহর"
        ]
      },
      {
        "name": "Faridpur",
        "nameBn": "ফরিদপুর",
        "aliases": [
          "faridpur",
          "ফরিদপুর"
        ]
      },
      {
        "name": "Ishwardi",
        "nameBn": "ঈশ্বরদী",
        "aliases": [
          "ishwardi",
          "ঈশ্বরদী"
        ],
        "postalCode": "6620"
      },
      {
        "name": "Pabna Sadar",
        "nameBn": "পাবনা সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "6600"
      },
      {
        "name": "Santhia",
        "nameBn": "সাঁথিয়া",
        "aliases": [
          "santhia",
          "সাঁথিয়া"
        ]
      },
      {
        "name": "Sujanagar",
        "nameBn": "সুজানগর",
        "aliases": [
          "sujanagar",
          "সুজানগর"
        ]
      }
    ]
  },
  {
    "name": "Natore",
    "nameBn": "নাটোর",
    "aliases": [
      "natore",
      "নাটোর"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Rajshahi",
    "code": "BD-RJ-NAT",
    "thanas": [
      {
        "name": "Bagatipara",
        "nameBn": "বাগাতিপাড়া",
        "aliases": [
          "bagatipara",
          "বাগাতিপাড়া"
        ]
      },
      {
        "name": "Baraigram",
        "nameBn": "বড়াইগ্রাম",
        "aliases": [
          "baraigram",
          "বড়াইগ্রাম"
        ],
        "postalCode": "6430"
      },
      {
        "name": "Gurudaspur",
        "nameBn": "গুরুদাসপুর",
        "aliases": [
          "gurudaspur",
          "গুরুদাসপুর"
        ]
      },
      {
        "name": "Lalpur",
        "nameBn": "লালপুর",
        "aliases": [
          "lalpur",
          "লালপুর"
        ]
      },
      {
        "name": "Naldanga",
        "nameBn": "নলডাঙ্গা",
        "aliases": [
          "naldanga",
          "নলডাঙ্গা"
        ]
      },
      {
        "name": "Natore Sadar",
        "nameBn": "নাটোর সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "6400"
      },
      {
        "name": "Singra",
        "nameBn": "সিংড়া",
        "aliases": [
          "singra",
          "সিংড়া"
        ],
        "postalCode": "6450"
      }
    ]
  },
  {
    "name": "Naogaon",
    "nameBn": "নওগাঁ",
    "aliases": [
      "naogaon",
      "নওগাঁ"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Rajshahi",
    "code": "BD-RJ-NAO",
    "thanas": [
      {
        "name": "Atrai",
        "nameBn": "আত্রাই",
        "aliases": [
          "atrai",
          "আত্রাই"
        ]
      },
      {
        "name": "Badalgachhi",
        "nameBn": "বদলগাছী",
        "aliases": [
          "badalgachhi",
          "বদলগাছী"
        ]
      },
      {
        "name": "Dhamoirhat",
        "nameBn": "ধামইরহাট",
        "aliases": [
          "dhamoirhat",
          "ধামইরহাট"
        ]
      },
      {
        "name": "Mahadebpur",
        "nameBn": "মহাদেবপুর",
        "aliases": [
          "mahadebpur",
          "মহাদেবপুর"
        ]
      },
      {
        "name": "Manda",
        "nameBn": "মান্দা",
        "aliases": [
          "manda",
          "মান্দা"
        ],
        "postalCode": "6510"
      },
      {
        "name": "Naogaon Sadar",
        "nameBn": "নওগাঁ সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "6500"
      },
      {
        "name": "Niamatpur",
        "nameBn": "নিয়ামতপুর",
        "aliases": [
          "niamatpur",
          "নিয়ামতপুর"
        ]
      },
      {
        "name": "Patnitala",
        "nameBn": "পত্নিতলা",
        "aliases": [
          "patnitala",
          "পত্নিতলা"
        ]
      },
      {
        "name": "Porsha",
        "nameBn": "পোরশা",
        "aliases": [
          "porsha",
          "পোরশা"
        ]
      },
      {
        "name": "Raninagar",
        "nameBn": "রাণীনগর",
        "aliases": [
          "raninagar",
          "রাণীনগর"
        ]
      },
      {
        "name": "Sapahar",
        "nameBn": "সাপাহার",
        "aliases": [
          "sapahar",
          "সাপাহার"
        ],
        "postalCode": "6570"
      }
    ]
  },
  {
    "name": "Chapai Nawabganj",
    "nameBn": "চাঁপাইনবাবগঞ্জ",
    "aliases": [
      "chapai nawabganj",
      "chapainawabganj",
      "nawabganj",
      "চাঁপাইনবাবগঞ্জ"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Rajshahi",
    "code": "BD-RJ-CHA",
    "thanas": [
      {
        "name": "Bholahat",
        "nameBn": "ভোলাহাট",
        "aliases": [
          "bholahat",
          "ভোলাহাট"
        ]
      },
      {
        "name": "Chapai Nawabganj Sadar",
        "nameBn": "চাঁপাইনবাবগঞ্জ সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "6300"
      },
      {
        "name": "Chapainawabganj Sadar",
        "nameBn": "চাঁপাইনবাবগঞ্জ সদর",
        "aliases": [
          "chapainawabganj sadar",
          "চাঁপাইনবাবগঞ্জ সদর"
        ]
      },
      {
        "name": "Gomastapur",
        "nameBn": "গোমস্তাপুর",
        "aliases": [
          "gomastapur",
          "গোমস্তাপুর"
        ],
        "postalCode": "6320"
      },
      {
        "name": "Nachole",
        "nameBn": "নাচোল",
        "aliases": [
          "nachole",
          "নাচোল"
        ]
      },
      {
        "name": "Shibganj",
        "nameBn": "শিবগঞ্জ",
        "aliases": [
          "shibganj",
          "শিবগঞ্জ"
        ],
        "postalCode": "6340"
      }
    ]
  },
  {
    "name": "Sirajganj",
    "nameBn": "সিরাজগঞ্জ",
    "aliases": [
      "sirajganj",
      "সিরাজগঞ্জ"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Rajshahi",
    "code": "BD-RJ-SIR",
    "thanas": [
      {
        "name": "Belkuchi",
        "nameBn": "বেলকুচি",
        "aliases": [
          "belkuchi",
          "বেলকুচি"
        ]
      },
      {
        "name": "Chouhali",
        "nameBn": "চৌহালি",
        "aliases": [
          "chouhali",
          "চৌহালি"
        ]
      },
      {
        "name": "Kamarkhanda",
        "nameBn": "কামারখন্দ",
        "aliases": [
          "kamarkhanda",
          "কামারখন্দ"
        ]
      },
      {
        "name": "Kazipur",
        "nameBn": "কাজীপুর",
        "aliases": [
          "kazipur",
          "কাজীপুর"
        ]
      },
      {
        "name": "Rayganj",
        "nameBn": "রায়গঞ্জ",
        "aliases": [
          "rayganj",
          "রায়গঞ্জ"
        ]
      },
      {
        "name": "Shahjadpur",
        "nameBn": "শাহজাদপুর",
        "aliases": [
          "shahjadpur",
          "শাহজাদপুর"
        ],
        "postalCode": "6770"
      },
      {
        "name": "Sirajganj Sadar",
        "nameBn": "সিরাজগঞ্জ সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "6700"
      },
      {
        "name": "Tarash",
        "nameBn": "তাড়াশ",
        "aliases": [
          "tarash",
          "তাড়াশ"
        ]
      },
      {
        "name": "Ullapara",
        "nameBn": "উল্লাপাড়া",
        "aliases": [
          "ullapara",
          "উল্লাপাড়া"
        ],
        "postalCode": "6760"
      }
    ]
  },
  {
    "name": "Joypurhat",
    "nameBn": "জয়পুরহাট",
    "aliases": [
      "joypurhat",
      "জয়পুরহাট"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Rajshahi",
    "code": "BD-RJ-JOY",
    "thanas": [
      {
        "name": "Akkelpur",
        "nameBn": "আক্কেলপুর",
        "aliases": [
          "akkelpur",
          "আক্কেলপুর"
        ],
        "postalCode": "5940"
      },
      {
        "name": "Joypurhat Sadar",
        "nameBn": "জয়পুরহাট সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "5900"
      },
      {
        "name": "Kalai",
        "nameBn": "কালাই",
        "aliases": [
          "kalai",
          "কালাই"
        ]
      },
      {
        "name": "Khetlal",
        "nameBn": "ক্ষেতলাল",
        "aliases": [
          "khetlal",
          "ক্ষেতলাল"
        ]
      },
      {
        "name": "Panchbibi",
        "nameBn": "পাঁচবিবি",
        "aliases": [
          "panchbibi",
          "পাঁচবিবি"
        ],
        "postalCode": "5910"
      }
    ]
  },
  {
    "name": "Satkhira",
    "nameBn": "সাতক্ষীরা",
    "aliases": [
      "satkhira",
      "সাতক্ষীরা"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Khulna",
    "code": "BD-KH-SAT",
    "thanas": [
      {
        "name": "Ashashuni",
        "nameBn": "আশাশুনি",
        "aliases": [
          "ashashuni",
          "আশাশুনি"
        ]
      },
      {
        "name": "Debhata",
        "nameBn": "দেবহাটা",
        "aliases": [
          "debhata",
          "দেবহাটা"
        ]
      },
      {
        "name": "Kalaroa",
        "nameBn": "কলারোয়া",
        "aliases": [
          "kalaroa",
          "কলারোয়া"
        ],
        "postalCode": "9410"
      },
      {
        "name": "Kaliganj",
        "nameBn": "কালিগঞ্জ",
        "aliases": [
          "kaliganj",
          "কালিগঞ্জ"
        ]
      },
      {
        "name": "Satkhira Sadar",
        "nameBn": "সাতক্ষীরা সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "9400"
      },
      {
        "name": "Shyamnagar",
        "nameBn": "শ্যামনগর",
        "aliases": [
          "shyamnagar",
          "শ্যামনগর"
        ]
      },
      {
        "name": "Tala",
        "nameBn": "তালা",
        "aliases": [
          "tala",
          "তালা"
        ],
        "postalCode": "9430"
      }
    ]
  },
  {
    "name": "Bagerhat",
    "nameBn": "বাগেরহাট",
    "aliases": [
      "bagerhat",
      "বাগেরহাট"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Khulna",
    "code": "BD-KH-BAG",
    "thanas": [
      {
        "name": "Bagerhat Sadar",
        "nameBn": "বাগেরহাট সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "9300"
      },
      {
        "name": "Chitalmari",
        "nameBn": "চিতলমারী",
        "aliases": [
          "chitalmari",
          "চিতলমারী"
        ]
      },
      {
        "name": "Fakirhat",
        "nameBn": "ফকিরহাট",
        "aliases": [
          "fakirhat",
          "ফকিরহাট"
        ]
      },
      {
        "name": "Kachua",
        "nameBn": "কচুয়া",
        "aliases": [
          "kachua",
          "কচুয়া"
        ]
      },
      {
        "name": "Mollahat",
        "nameBn": "মোল্লাহাট",
        "aliases": [
          "mollahat",
          "মোল্লাহাট"
        ]
      },
      {
        "name": "Mongla",
        "nameBn": "মোংলা",
        "aliases": [
          "mongla",
          "মোংলা"
        ],
        "postalCode": "9350"
      },
      {
        "name": "Morelganj",
        "nameBn": "মোড়েলগঞ্জ",
        "aliases": [
          "morelganj",
          "মোড়েলগঞ্জ"
        ]
      },
      {
        "name": "Morrelganj",
        "nameBn": "মোড়েলগঞ্জ",
        "aliases": [
          "morrelganj",
          "মোড়েলগঞ্জ"
        ],
        "postalCode": "9320"
      },
      {
        "name": "Rampal",
        "nameBn": "রামপাল",
        "aliases": [
          "rampal",
          "রামপাল"
        ]
      },
      {
        "name": "Sharankhola",
        "nameBn": "শরণখোলা",
        "aliases": [
          "sharankhola",
          "শরণখোলা"
        ]
      }
    ]
  },
  {
    "name": "Kushtia",
    "nameBn": "কুষ্টিয়া",
    "aliases": [
      "kushtia",
      "কুষ্টিয়া"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Khulna",
    "code": "BD-KH-KUS",
    "thanas": [
      {
        "name": "Bheramara",
        "nameBn": "ভেড়ামারা",
        "aliases": [
          "bheramara",
          "ভেড়ামারা"
        ],
        "postalCode": "7040"
      },
      {
        "name": "Daulatpur",
        "nameBn": "দৌলতপুর",
        "aliases": [
          "daulatpur",
          "দৌলতপুর"
        ]
      },
      {
        "name": "Khoksa",
        "nameBn": "খোকসা",
        "aliases": [
          "khoksa",
          "খোকসা"
        ]
      },
      {
        "name": "Kumarkhali",
        "nameBn": "কুমারখালী",
        "aliases": [
          "kumarkhali",
          "কুমারখালী"
        ],
        "postalCode": "7010"
      },
      {
        "name": "Kushtia Sadar",
        "nameBn": "কুষ্টিয়া সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "7000"
      },
      {
        "name": "Mirpur",
        "nameBn": "মিরপুর",
        "aliases": [
          "mirpur",
          "মিরপুর"
        ]
      }
    ]
  },
  {
    "name": "Jhenaidah",
    "nameBn": "ঝিনাইদহ",
    "aliases": [
      "jhenaidah",
      "jhenidah",
      "ঝিনাইদহ"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Khulna",
    "code": "BD-KH-JHE",
    "thanas": [
      {
        "name": "Harinakundu",
        "nameBn": "হরিণাকুন্ডু",
        "aliases": [
          "harinakundu",
          "হরিণাকুন্ডু"
        ]
      },
      {
        "name": "Jhenaidah Sadar",
        "nameBn": "ঝিনাইদহ সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "7300"
      },
      {
        "name": "Kaliganj",
        "nameBn": "কালীগঞ্জ",
        "aliases": [
          "kaliganj",
          "কালীগঞ্জ"
        ],
        "postalCode": "7350"
      },
      {
        "name": "Kotchandpur",
        "nameBn": "কোটচাঁদপুর",
        "aliases": [
          "kotchandpur",
          "কোটচাঁদপুর"
        ]
      },
      {
        "name": "Maheshpur",
        "nameBn": "মহেশপুর",
        "aliases": [
          "maheshpur",
          "মহেশপুর"
        ]
      },
      {
        "name": "Shailkupa",
        "nameBn": "শৈলকুপা",
        "aliases": [
          "shailkupa",
          "শৈলকুপা"
        ],
        "postalCode": "7320"
      }
    ]
  },
  {
    "name": "Magura",
    "nameBn": "মাগুরা",
    "aliases": [
      "magura",
      "মাগুরা"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Khulna",
    "code": "BD-KH-MAG",
    "thanas": [
      {
        "name": "Magura Sadar",
        "nameBn": "মাগুরা সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "7600"
      },
      {
        "name": "Mohammadpur",
        "nameBn": "মহম্মদপুর",
        "aliases": [
          "mohammadpur",
          "মহম্মদপুর"
        ],
        "postalCode": "7630"
      },
      {
        "name": "Shalikha",
        "nameBn": "শালিখা",
        "aliases": [
          "shalikha",
          "শালিখা"
        ]
      },
      {
        "name": "Sreepur",
        "nameBn": "শ্রীপুর",
        "aliases": [
          "sreepur",
          "শ্রীপুর"
        ],
        "postalCode": "7620"
      }
    ]
  },
  {
    "name": "Narail",
    "nameBn": "নড়াইল",
    "aliases": [
      "narail",
      "নড়াইল"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Khulna",
    "code": "BD-KH-NAR",
    "thanas": [
      {
        "name": "Kalia",
        "nameBn": "কালিয়া",
        "aliases": [
          "kalia",
          "কালিয়া"
        ],
        "postalCode": "7520"
      },
      {
        "name": "Lohagara",
        "nameBn": "লোহাগড়া",
        "aliases": [
          "lohagara",
          "লোহাগড়া"
        ],
        "postalCode": "7510"
      },
      {
        "name": "Narail Sadar",
        "nameBn": "নড়াইল সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "7500"
      }
    ]
  },
  {
    "name": "Meherpur",
    "nameBn": "মেহেরপুর",
    "aliases": [
      "meherpur",
      "মেহেরপুর"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Khulna",
    "code": "BD-KH-MEH",
    "thanas": [
      {
        "name": "Gangni",
        "nameBn": "গাংনী",
        "aliases": [
          "gangni",
          "গাংনী"
        ],
        "postalCode": "7110"
      },
      {
        "name": "Meherpur Sadar",
        "nameBn": "মেহেরপুর সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "7100"
      },
      {
        "name": "Mujibnagar",
        "nameBn": "মুজিবনগর",
        "aliases": [
          "mujibnagar",
          "মুজিবনগর"
        ],
        "postalCode": "7120"
      }
    ]
  },
  {
    "name": "Chuadanga",
    "nameBn": "চুয়াডাঙ্গা",
    "aliases": [
      "chuadanga",
      "চুয়াডাঙ্গা"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Khulna",
    "code": "BD-KH-CHU",
    "thanas": [
      {
        "name": "Alamdanga",
        "nameBn": "আলমডাঙ্গা",
        "aliases": [
          "alamdanga",
          "আলমডাঙ্গা"
        ],
        "postalCode": "7210"
      },
      {
        "name": "Chuadanga Sadar",
        "nameBn": "চুয়াডাঙ্গা সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "7200"
      },
      {
        "name": "Damurhuda",
        "nameBn": "দামুড়হুদা",
        "aliases": [
          "damurhuda",
          "দামুড়হুদা"
        ],
        "postalCode": "7220"
      },
      {
        "name": "Jibannagar",
        "nameBn": "জীবননগর",
        "aliases": [
          "jibannagar",
          "জীবননগর"
        ]
      }
    ]
  },
  {
    "name": "Bhola",
    "nameBn": "ভোলা",
    "aliases": [
      "bhola",
      "ভোলা"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Barishal",
    "code": "BD-BA-BHO",
    "thanas": [
      {
        "name": "Bhola Sadar",
        "nameBn": "ভোলা সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "8300"
      },
      {
        "name": "Borhanuddin",
        "nameBn": "বোরহানউদ্দিন",
        "aliases": [
          "borhanuddin",
          "বোরহানউদ্দিন"
        ],
        "postalCode": "8320"
      },
      {
        "name": "Char Fasson",
        "nameBn": "চরফ্যাশন",
        "aliases": [
          "char fasson",
          "charfasson",
          "চরফ্যাশন"
        ],
        "postalCode": "8340"
      },
      {
        "name": "Charfasson",
        "nameBn": "চরফ্যাশন",
        "aliases": [
          "charfasson",
          "চরফ্যাশন"
        ]
      },
      {
        "name": "Daulatkhan",
        "nameBn": "দৌলতখান",
        "aliases": [
          "daulatkhan",
          "দৌলতখান"
        ]
      },
      {
        "name": "Lalmohan",
        "nameBn": "লালমোহন",
        "aliases": [
          "lalmohan",
          "লালমোহন"
        ],
        "postalCode": "8330"
      },
      {
        "name": "Monpura",
        "nameBn": "মনপুরা",
        "aliases": [
          "monpura",
          "মনপুরা"
        ]
      },
      {
        "name": "Tazumuddin",
        "nameBn": "তজুমদ্দিন",
        "aliases": [
          "tazumuddin",
          "তজুমদ্দিন"
        ]
      }
    ]
  },
  {
    "name": "Patuakhali",
    "nameBn": "পটুয়াখালী",
    "aliases": [
      "patuakhali",
      "পটুয়াখালী"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Barishal",
    "code": "BD-BA-PAT",
    "thanas": [
      {
        "name": "Bauphal",
        "nameBn": "বাউফল",
        "aliases": [
          "bauphal",
          "বাউফল"
        ]
      },
      {
        "name": "Dashmina",
        "nameBn": "দশমিনা",
        "aliases": [
          "dashmina",
          "দশমিনা"
        ]
      },
      {
        "name": "Dumki",
        "nameBn": "দুমকি",
        "aliases": [
          "dumki",
          "দুমকি"
        ]
      },
      {
        "name": "Galachipa",
        "nameBn": "গলাচিপা",
        "aliases": [
          "galachipa",
          "গলাচিপা"
        ],
        "postalCode": "8640"
      },
      {
        "name": "Kalapara",
        "nameBn": "কলাপাড়া",
        "aliases": [
          "kalapara",
          "কলাপাড়া",
          "kuakata",
          "কুয়াকাটা"
        ],
        "postalCode": "8630"
      },
      {
        "name": "Mirzaganj",
        "nameBn": "মির্জাগঞ্জ",
        "aliases": [
          "mirzaganj",
          "মির্জাগঞ্জ"
        ]
      },
      {
        "name": "Patuakhali Sadar",
        "nameBn": "পটুয়াখালী সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "8600"
      },
      {
        "name": "Rangabali",
        "nameBn": "রাঙ্গাবালী",
        "aliases": [
          "rangabali",
          "রাঙ্গাবালী"
        ]
      }
    ]
  },
  {
    "name": "Pirojpur",
    "nameBn": "পিরোজপুর",
    "aliases": [
      "pirojpur",
      "পিরোজপুর"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Barishal",
    "code": "BD-BA-PIR",
    "thanas": [
      {
        "name": "Bhandaria",
        "nameBn": "ভান্ডারিয়া",
        "aliases": [
          "bhandaria",
          "ভান্ডারিয়া"
        ],
        "postalCode": "8530"
      },
      {
        "name": "Indurkani",
        "nameBn": "ইন্দুরকানী",
        "aliases": [
          "indurkani",
          "ইন্দুরকানী"
        ]
      },
      {
        "name": "Kawkhali",
        "nameBn": "কাউখালী",
        "aliases": [
          "kawkhali",
          "কাউখালী"
        ]
      },
      {
        "name": "Mathbaria",
        "nameBn": "মঠবাড়িয়া",
        "aliases": [
          "mathbaria",
          "মঠবাড়িয়া"
        ],
        "postalCode": "8560"
      },
      {
        "name": "Nazirpur",
        "nameBn": "নাজিরপুর",
        "aliases": [
          "nazirpur",
          "নাজিরপুর"
        ]
      },
      {
        "name": "Nesarabad (Swarupkathi)",
        "nameBn": "নেছারাবাদ",
        "aliases": [
          "nesarabad (swarupkathi)",
          "নেছারাবাদ"
        ]
      },
      {
        "name": "Pirojpur Sadar",
        "nameBn": "পিরোজপুর সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "8500"
      }
    ]
  },
  {
    "name": "Barguna",
    "nameBn": "বরগুনা",
    "aliases": [
      "barguna",
      "বরগুনা"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Barishal",
    "code": "BD-BA-BAR",
    "thanas": [
      {
        "name": "Amtali",
        "nameBn": "আমতলী",
        "aliases": [
          "amtali",
          "আমতলী"
        ],
        "postalCode": "8710"
      },
      {
        "name": "Bamna",
        "nameBn": "বামনা",
        "aliases": [
          "bamna",
          "বামনা"
        ]
      },
      {
        "name": "Barguna Sadar",
        "nameBn": "বরগুনা সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "8700"
      },
      {
        "name": "Betagi",
        "nameBn": "বেতাগী",
        "aliases": [
          "betagi",
          "বেতাগী"
        ]
      },
      {
        "name": "Patharghata",
        "nameBn": "পাথরঘাটা",
        "aliases": [
          "patharghata",
          "পাথরঘাটা"
        ],
        "postalCode": "8720"
      },
      {
        "name": "Taltali",
        "nameBn": "তালতলি",
        "aliases": [
          "taltali",
          "তালতলি"
        ]
      }
    ]
  },
  {
    "name": "Jhalokati",
    "nameBn": "ঝালকাঠি",
    "aliases": [
      "jhalokati",
      "ঝালকাঠি"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Barishal",
    "code": "BD-BA-JHA",
    "thanas": [
      {
        "name": "Jhalokathi Sadar",
        "nameBn": "ঝালকাঠি সদর",
        "aliases": [
          "jhalokathi sadar",
          "ঝালকাঠি সদর"
        ]
      },
      {
        "name": "Jhalokati Sadar",
        "nameBn": "ঝালকাঠি সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "8400"
      },
      {
        "name": "Kanthalia",
        "nameBn": "কাঠালিয়া",
        "aliases": [
          "kanthalia",
          "কাঠালিয়া"
        ]
      },
      {
        "name": "Nalchhity",
        "nameBn": "নলছিটি",
        "aliases": [
          "nalchhity",
          "নলছিটি"
        ]
      },
      {
        "name": "Nalchity",
        "nameBn": "নলছিটি",
        "aliases": [
          "nalchity",
          "নলছিটি"
        ],
        "postalCode": "8410"
      },
      {
        "name": "Rajapur",
        "nameBn": "রাজাপুর",
        "aliases": [
          "rajapur",
          "রাজাপুর"
        ],
        "postalCode": "8420"
      }
    ]
  },
  {
    "name": "Moulvibazar",
    "nameBn": "মৌলভীবাজার",
    "aliases": [
      "moulvibazar",
      "moulvibajar",
      "মৌলভীবাজার"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Sylhet",
    "code": "BD-SY-MOU",
    "thanas": [
      {
        "name": "Baralekha",
        "nameBn": "বড়লেখা",
        "aliases": [
          "baralekha",
          "বড়লেখা"
        ]
      },
      {
        "name": "Juri",
        "nameBn": "জুড়ী",
        "aliases": [
          "juri",
          "জুড়ী"
        ]
      },
      {
        "name": "Kamalganj",
        "nameBn": "কমলগঞ্জ",
        "aliases": [
          "kamalganj",
          "কমলগঞ্জ"
        ]
      },
      {
        "name": "Kulaura",
        "nameBn": "কুলাউড়া",
        "aliases": [
          "kulaura",
          "কুলাউড়া"
        ],
        "postalCode": "3230"
      },
      {
        "name": "Moulvibazar Sadar",
        "nameBn": "মৌলভীবাজার সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "3200"
      },
      {
        "name": "Rajnagar",
        "nameBn": "রাজনগর",
        "aliases": [
          "rajnagar",
          "রাজনগর"
        ]
      },
      {
        "name": "Sreemangal",
        "nameBn": "শ্রীমঙ্গল",
        "aliases": [
          "sreemangal",
          "srimangal",
          "শ্রীমঙ্গল"
        ],
        "postalCode": "3210"
      }
    ]
  },
  {
    "name": "Habiganj",
    "nameBn": "হবিগঞ্জ",
    "aliases": [
      "habiganj",
      "hobiganj",
      "হবিগঞ্জ"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Sylhet",
    "code": "BD-SY-HAB",
    "thanas": [
      {
        "name": "Ajmiriganj",
        "nameBn": "আজমিরীগঞ্জ",
        "aliases": [
          "ajmiriganj",
          "আজমিরীগঞ্জ"
        ]
      },
      {
        "name": "Bahubal",
        "nameBn": "বাহুবল",
        "aliases": [
          "bahubal",
          "বাহুবল"
        ]
      },
      {
        "name": "Baniachong",
        "nameBn": "বানিয়াচং",
        "aliases": [
          "baniachong",
          "বানিয়াচং"
        ]
      },
      {
        "name": "Chunarughat",
        "nameBn": "চুনারুঘাট",
        "aliases": [
          "chunarughat",
          "চুনারুঘাট"
        ],
        "postalCode": "3320"
      },
      {
        "name": "Habiganj Sadar",
        "nameBn": "হবিগঞ্জ সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "3300"
      },
      {
        "name": "Lakhai",
        "nameBn": "লাখাই",
        "aliases": [
          "lakhai",
          "লাখাই"
        ]
      },
      {
        "name": "Madhabpur",
        "nameBn": "মাধবপুর",
        "aliases": [
          "madhabpur",
          "মাধবপুর"
        ],
        "postalCode": "3330"
      },
      {
        "name": "Nabiganj",
        "nameBn": "নবীগঞ্জ",
        "aliases": [
          "nabiganj",
          "নবীগঞ্জ"
        ]
      },
      {
        "name": "Shayestaganj",
        "nameBn": "শায়েস্তাগঞ্জ",
        "aliases": [
          "shayestaganj",
          "শায়েস্তাগঞ্জ"
        ]
      }
    ]
  },
  {
    "name": "Sunamganj",
    "nameBn": "সুনামগঞ্জ",
    "aliases": [
      "sunamganj",
      "সুনামগঞ্জ"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Sylhet",
    "code": "BD-SY-SUN",
    "thanas": [
      {
        "name": "Bishwambharpur",
        "nameBn": "বিশ্বম্ভরপুর",
        "aliases": [
          "bishwambharpur",
          "বিশ্বম্ভরপুর"
        ]
      },
      {
        "name": "Chhatak",
        "nameBn": "ছাতক",
        "aliases": [
          "chhatak",
          "ছাতক"
        ],
        "postalCode": "3080"
      },
      {
        "name": "Derai",
        "nameBn": "দিরাই",
        "aliases": [
          "derai",
          "দিরাই"
        ]
      },
      {
        "name": "Dharmapasha",
        "nameBn": "ধর্মপাশা",
        "aliases": [
          "dharmapasha",
          "ধর্মপাশা"
        ]
      },
      {
        "name": "Dowarabazar",
        "nameBn": "দোয়ারাবাজার",
        "aliases": [
          "dowarabazar",
          "দোয়ারাবাজার"
        ]
      },
      {
        "name": "Jagannathpur",
        "nameBn": "জগন্নাথপুর",
        "aliases": [
          "jagannathpur",
          "জগন্নাথপুর"
        ],
        "postalCode": "3060"
      },
      {
        "name": "Jamalganj",
        "nameBn": "জামালগঞ্জ",
        "aliases": [
          "jamalganj",
          "জামালগঞ্জ"
        ]
      },
      {
        "name": "Madhyanagar",
        "nameBn": "মধ্যনগর",
        "aliases": [
          "madhyanagar",
          "মধ্যনগর"
        ]
      },
      {
        "name": "Shalla",
        "nameBn": "শাল্লা",
        "aliases": [
          "shalla",
          "শাল্লা"
        ]
      },
      {
        "name": "Shantiganj",
        "nameBn": "শান্তিগঞ্জ",
        "aliases": [
          "shantiganj",
          "শান্তিগঞ্জ"
        ]
      },
      {
        "name": "Sunamganj Sadar",
        "nameBn": "সুনামগঞ্জ সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "3000"
      },
      {
        "name": "Tahirpur",
        "nameBn": "তাহিরপুর",
        "aliases": [
          "tahirpur",
          "তাহিরপুর"
        ]
      }
    ]
  },
  {
    "name": "Dinajpur",
    "nameBn": "দিনাজপুর",
    "aliases": [
      "dinajpur",
      "দিনাজপুর"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Rangpur",
    "code": "BD-RG-DIN",
    "thanas": [
      {
        "name": "Birampur",
        "nameBn": "বিরামপুর",
        "aliases": [
          "birampur",
          "বিরামপুর"
        ],
        "postalCode": "5260"
      },
      {
        "name": "Birganj",
        "nameBn": "বীরগঞ্জ",
        "aliases": [
          "birganj",
          "বীরগঞ্জ"
        ]
      },
      {
        "name": "Birol",
        "nameBn": "বিরল",
        "aliases": [
          "birol",
          "বিরল"
        ]
      },
      {
        "name": "Bochaganj",
        "nameBn": "বোচাগঞ্জ",
        "aliases": [
          "bochaganj",
          "বোচাগঞ্জ"
        ]
      },
      {
        "name": "Chirirbandar",
        "nameBn": "চিরিরবন্দর",
        "aliases": [
          "chirirbandar",
          "চিরিরবন্দর"
        ]
      },
      {
        "name": "Dinajpur Sadar",
        "nameBn": "দিনাজপুর সদর",
        "aliases": [
          "kotwali",
          "sadar",
          "সদর"
        ],
        "postalCode": "5200"
      },
      {
        "name": "Fulbari",
        "nameBn": "ফুলবাড়ী",
        "aliases": [
          "fulbari",
          "ফুলবাড়ী"
        ]
      },
      {
        "name": "Ghoraghat",
        "nameBn": "ঘোড়াঘাট",
        "aliases": [
          "ghoraghat",
          "ঘোড়াঘাট"
        ]
      },
      {
        "name": "Hakimpur",
        "nameBn": "হাকিমপুর",
        "aliases": [
          "hakimpur",
          "হাকিমপুর"
        ]
      },
      {
        "name": "Kaharole",
        "nameBn": "কাহারোল",
        "aliases": [
          "kaharole",
          "কাহারোল"
        ]
      },
      {
        "name": "Khansama",
        "nameBn": "খানসামা",
        "aliases": [
          "khansama",
          "খানসামা"
        ]
      },
      {
        "name": "Nababganj",
        "nameBn": "নবাবগঞ্জ",
        "aliases": [
          "nababganj",
          "নবাবগঞ্জ"
        ]
      },
      {
        "name": "Parbatipur",
        "nameBn": "পার্বতীপুর",
        "aliases": [
          "parbatipur",
          "পার্বতীপুর"
        ]
      },
      {
        "name": "Phulbari",
        "nameBn": "ফুলবাড়ী",
        "aliases": [
          "phulbari",
          "ফুলবাড়ী"
        ],
        "postalCode": "5270"
      }
    ]
  },
  {
    "name": "Kurigram",
    "nameBn": "কুড়িগ্রাম",
    "aliases": [
      "kurigram",
      "কুড়িগ্রাম"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Rangpur",
    "code": "BD-RG-KUR",
    "thanas": [
      {
        "name": "Bhurungamari",
        "nameBn": "ভুরুঙ্গামারী",
        "aliases": [
          "bhurungamari",
          "ভুরুঙ্গামারী"
        ]
      },
      {
        "name": "Chilmari",
        "nameBn": "চিলমারী",
        "aliases": [
          "chilmari",
          "চিলমারী"
        ]
      },
      {
        "name": "Kurigram Sadar",
        "nameBn": "কুড়িগ্রাম সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "5600"
      },
      {
        "name": "Nageshwari",
        "nameBn": "নাগেশ্বরী",
        "aliases": [
          "nageshwari",
          "নাগেশ্বরী"
        ],
        "postalCode": "5660"
      },
      {
        "name": "Phulbari",
        "nameBn": "ফুলবাড়ী",
        "aliases": [
          "phulbari",
          "ফুলবাড়ী"
        ]
      },
      {
        "name": "Rajarhat",
        "nameBn": "রাজারহাট",
        "aliases": [
          "rajarhat",
          "রাজারহাট"
        ]
      },
      {
        "name": "Rajibpur",
        "nameBn": "চর রাজিবপুর",
        "aliases": [
          "rajibpur",
          "চর রাজিবপুর"
        ]
      },
      {
        "name": "Roumari",
        "nameBn": "রৌমারী",
        "aliases": [
          "roumari",
          "রৌমারী"
        ]
      },
      {
        "name": "Ulipur",
        "nameBn": "উলিপুর",
        "aliases": [
          "ulipur",
          "উলিপুর"
        ],
        "postalCode": "5620"
      }
    ]
  },
  {
    "name": "Lalmonirhat",
    "nameBn": "লালমনিরহাট",
    "aliases": [
      "lalmonirhat",
      "লালমনিরহাট"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Rangpur",
    "code": "BD-RG-LAL",
    "thanas": [
      {
        "name": "Aditmari",
        "nameBn": "আদিতমারী",
        "aliases": [
          "aditmari",
          "আদিতমারী"
        ]
      },
      {
        "name": "Hatibandha",
        "nameBn": "হাতীবান্ধা",
        "aliases": [
          "hatibandha",
          "হাতীবান্ধা"
        ],
        "postalCode": "5530"
      },
      {
        "name": "Kaliganj",
        "nameBn": "কালীগঞ্জ",
        "aliases": [
          "kaliganj",
          "কালীগঞ্জ"
        ]
      },
      {
        "name": "Lalmonirhat Sadar",
        "nameBn": "লালমনিরহাট সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "5500"
      },
      {
        "name": "Patgram",
        "nameBn": "পাটগ্রাম",
        "aliases": [
          "patgram",
          "পাটগ্রাম"
        ],
        "postalCode": "5540"
      }
    ]
  },
  {
    "name": "Gaibandha",
    "nameBn": "গাইবান্ধা",
    "aliases": [
      "gaibandha",
      "গাইবান্ধা"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Rangpur",
    "code": "BD-RG-GAI",
    "thanas": [
      {
        "name": "Fulchhari",
        "nameBn": "ফুলছড়ি",
        "aliases": [
          "fulchhari",
          "ফুলছড়ি"
        ]
      },
      {
        "name": "Gaibandha Sadar",
        "nameBn": "গাইবান্ধা সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "5700"
      },
      {
        "name": "Gobindaganj",
        "nameBn": "গোবিন্দগঞ্জ",
        "aliases": [
          "gobindaganj",
          "গোবিন্দগঞ্জ"
        ],
        "postalCode": "5740"
      },
      {
        "name": "Palashbari",
        "nameBn": "পলাশবাড়ী",
        "aliases": [
          "palashbari",
          "পলাশবাড়ী"
        ]
      },
      {
        "name": "Sadullapur",
        "nameBn": "সাদুল্লাপুর",
        "aliases": [
          "sadullapur",
          "সাদুল্লাপুর"
        ]
      },
      {
        "name": "Saghata",
        "nameBn": "সাঘাটা",
        "aliases": [
          "saghata",
          "সাঘাটা"
        ]
      },
      {
        "name": "Sundarganj",
        "nameBn": "সুন্দরগঞ্জ",
        "aliases": [
          "sundarganj",
          "সুন্দরগঞ্জ"
        ],
        "postalCode": "5730"
      }
    ]
  },
  {
    "name": "Nilphamari",
    "nameBn": "নীলফামারী",
    "aliases": [
      "nilphamari",
      "নীলফামারী"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Rangpur",
    "code": "BD-RG-NIL",
    "thanas": [
      {
        "name": "Dimla",
        "nameBn": "ডিমলা",
        "aliases": [
          "dimla",
          "ডিমলা"
        ]
      },
      {
        "name": "Domar",
        "nameBn": "ডোমার",
        "aliases": [
          "domar",
          "ডোমার"
        ],
        "postalCode": "5340"
      },
      {
        "name": "Jaldhaka",
        "nameBn": "জলঢাকা",
        "aliases": [
          "jaldhaka",
          "জলঢাকা"
        ]
      },
      {
        "name": "Kishoreganj",
        "nameBn": "কিশোরগঞ্জ",
        "aliases": [
          "kishoreganj",
          "কিশোরগঞ্জ"
        ]
      },
      {
        "name": "Nilphamari Sadar",
        "nameBn": "নীলফামারী সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "5300"
      },
      {
        "name": "Saidpur",
        "nameBn": "সৈয়দপুর",
        "aliases": [
          "saidpur",
          "সৈয়দপুর"
        ],
        "postalCode": "5310"
      }
    ]
  },
  {
    "name": "Thakurgaon",
    "nameBn": "ঠাকুরগাঁও",
    "aliases": [
      "thakurgaon",
      "ঠাকুরগাঁও"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Rangpur",
    "code": "BD-RG-THA",
    "thanas": [
      {
        "name": "Baliadangi",
        "nameBn": "বালিয়াডাঙ্গী",
        "aliases": [
          "baliadangi",
          "বালিয়াডাঙ্গী"
        ]
      },
      {
        "name": "Haripur",
        "nameBn": "হরিপুর",
        "aliases": [
          "haripur",
          "হরিপুর"
        ]
      },
      {
        "name": "Pirganj",
        "nameBn": "পীরগঞ্জ",
        "aliases": [
          "pirganj",
          "পীরগঞ্জ"
        ],
        "postalCode": "5110"
      },
      {
        "name": "Ranisankail",
        "nameBn": "রাণীশংকৈল",
        "aliases": [
          "ranisankail",
          "রাণীশংকৈল"
        ],
        "postalCode": "5130"
      },
      {
        "name": "Ranishankail",
        "nameBn": "রাণীশংকৈল",
        "aliases": [
          "ranishankail",
          "রাণীশংকৈল"
        ]
      },
      {
        "name": "Thakurgaon Sadar",
        "nameBn": "ঠাকুরগাঁও সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "5100"
      }
    ]
  },
  {
    "name": "Panchagarh",
    "nameBn": "পঞ্চগড়",
    "aliases": [
      "panchagarh",
      "panchagar",
      "পঞ্চগড়",
      "পঞ্চগড়"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Rangpur",
    "code": "BD-RG-PAN",
    "thanas": [
      {
        "name": "Atowari",
        "nameBn": "আটোয়ারী",
        "aliases": [
          "atowari",
          "আটোয়ারী"
        ]
      },
      {
        "name": "Atwari",
        "nameBn": "আটোয়ারী",
        "aliases": [
          "atwari",
          "আটোয়ারী"
        ],
        "postalCode": "5040"
      },
      {
        "name": "Boda",
        "nameBn": "বোদা",
        "aliases": [
          "boda",
          "বোদা"
        ],
        "postalCode": "5010"
      },
      {
        "name": "Debiganj",
        "nameBn": "দেবীগঞ্জ",
        "aliases": [
          "debiganj",
          "debijanj",
          "দেবীগঞ্জ"
        ],
        "postalCode": "5020"
      },
      {
        "name": "Panchagarh Sadar",
        "nameBn": "পঞ্চগড় সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "5000"
      },
      {
        "name": "Tentulia",
        "nameBn": "তেতুলিয়া",
        "aliases": [
          "tentulia",
          "তেতুলিয়া"
        ]
      },
      {
        "name": "Tetulia",
        "nameBn": "তেঁতুলিয়া",
        "aliases": [
          "tetulia",
          "তেঁতুলিয়া"
        ],
        "postalCode": "5030"
      }
    ]
  },
  {
    "name": "Jamalpur",
    "nameBn": "জামালপুর",
    "aliases": [
      "jamalpur",
      "জামালপুর"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Mymensingh",
    "code": "BD-MY-JAM",
    "thanas": [
      {
        "name": "Bakshiganj",
        "nameBn": "বকশীগঞ্জ",
        "aliases": [
          "bakshiganj",
          "বকশীগঞ্জ"
        ]
      },
      {
        "name": "Dewanganj",
        "nameBn": "দেওয়ানগঞ্জ",
        "aliases": [
          "dewanganj",
          "দেওয়ানগঞ্জ"
        ]
      },
      {
        "name": "Islampur",
        "nameBn": "ইসলামপুর",
        "aliases": [
          "islampur",
          "ইসলামপুর"
        ],
        "postalCode": "2020"
      },
      {
        "name": "Jamalpur Sadar",
        "nameBn": "জামালপুর সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "2000"
      },
      {
        "name": "Madarganj",
        "nameBn": "মাদারগঞ্জ",
        "aliases": [
          "madarganj",
          "মাদারগঞ্জ"
        ]
      },
      {
        "name": "Melandaha",
        "nameBn": "মেলান্দহ",
        "aliases": [
          "melandaha",
          "মেলান্দহ"
        ]
      },
      {
        "name": "Sarishabari",
        "nameBn": "সরিষাবাড়ী",
        "aliases": [
          "sarishabari",
          "সরিষাবাড়ী"
        ],
        "postalCode": "2050"
      }
    ]
  },
  {
    "name": "Netrokona",
    "nameBn": "নেত্রকোণা",
    "aliases": [
      "netrokona",
      "netrakona",
      "নেত্রকোণা"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Mymensingh",
    "code": "BD-MY-NET",
    "thanas": [
      {
        "name": "Atpara",
        "nameBn": "আটপাড়া",
        "aliases": [
          "atpara",
          "আটপাড়া"
        ]
      },
      {
        "name": "Barhatta",
        "nameBn": "বারহাট্টা",
        "aliases": [
          "barhatta",
          "বারহাট্টা"
        ]
      },
      {
        "name": "Durgapur",
        "nameBn": "দুর্গাপুর",
        "aliases": [
          "durgapur",
          "দুর্গাপুর"
        ],
        "postalCode": "2420"
      },
      {
        "name": "Kalmakanda",
        "nameBn": "কলমাকান্দা",
        "aliases": [
          "kalmakanda",
          "কলমাকান্দা"
        ]
      },
      {
        "name": "Kendua",
        "nameBn": "কেন্দুয়া",
        "aliases": [
          "kendua",
          "কেন্দুয়া"
        ],
        "postalCode": "2420"
      },
      {
        "name": "Khaliajuri",
        "nameBn": "খালিয়াজুরী",
        "aliases": [
          "khaliajuri",
          "খালিয়াজুরী"
        ]
      },
      {
        "name": "Madan",
        "nameBn": "মদন",
        "aliases": [
          "madan",
          "মদন"
        ]
      },
      {
        "name": "Mohanganj",
        "nameBn": "মোহনগঞ্জ",
        "aliases": [
          "mohanganj",
          "মোহনগঞ্জ"
        ]
      },
      {
        "name": "Netrakona Sadar",
        "nameBn": "নেত্রকোণা সদর",
        "aliases": [
          "netrakona sadar",
          "নেত্রকোণা সদর"
        ]
      },
      {
        "name": "Netrokona Sadar",
        "nameBn": "নেত্রকোণা সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "2400"
      },
      {
        "name": "Purbadhala",
        "nameBn": "পূর্বধলা",
        "aliases": [
          "purbadhala",
          "পূর্বধলা"
        ]
      }
    ]
  },
  {
    "name": "Sherpur",
    "nameBn": "শেরপুর",
    "aliases": [
      "sherpur",
      "শেরপুর"
    ],
    zone: DeliveryZone.OUTSIDE_DHAKA,
    "division": "Mymensingh",
    "code": "BD-MY-SHE",
    "thanas": [
      {
        "name": "Jhenaigati",
        "nameBn": "ঝিনাইগাতী",
        "aliases": [
          "jhenaigati",
          "ঝিনাইগাতী"
        ]
      },
      {
        "name": "Nakla",
        "nameBn": "নকলা",
        "aliases": [
          "nakla",
          "নকলা"
        ],
        "postalCode": "2120"
      },
      {
        "name": "Nalitabari",
        "nameBn": "নালিতাবাড়ী",
        "aliases": [
          "nalitabari",
          "নালিতাবাড়ী"
        ],
        "postalCode": "2110"
      },
      {
        "name": "Sherpur Sadar",
        "nameBn": "শেরপুর সদর",
        "aliases": [
          "sadar",
          "সদর"
        ],
        "postalCode": "2100"
      },
      {
        "name": "Sreebardi",
        "nameBn": "শ্রীবরদী",
        "aliases": [
          "sreebardi",
          "শ্রীবরদী"
        ]
      }
    ]
  }
];

/** Return all 64 canonical districts. */
export function getAllDistricts(): DistrictInfo[] {
  return BANGLADESH_DISTRICTS;
}

/** Return districts grouped by their administrative division. */
export function getDistrictsByDivision(): Record<string, DistrictInfo[]> {
  const map: Record<string, DistrictInfo[]> = {};
  for (const dist of BANGLADESH_DISTRICTS) {
    const div = dist.division || "Other";
    if (!map[div]) {
      map[div] = [];
    }
    map[div].push(dist);
  }
  return map;
}

/** Get list of thanas/upazilas for a given district name (case-insensitive). */
export function getThanasForDistrict(
  districtName?: string | null,
): Array<{ name: string; nameBn: string; postalCode?: string }> {
  if (!districtName) return [];
  const normalized = districtName.trim().toLowerCase();
  const district = BANGLADESH_DISTRICTS.find(
    (d) =>
      d.name.toLowerCase() === normalized ||
      d.nameBn === districtName.trim() ||
      d.aliases.some((a) => a.toLowerCase() === normalized),
  );
  return district?.thanas ?? [];
}

/** Find a district info object by exact name, Bangla name, or alias. */
export function findDistrict(query?: string | null): DistrictInfo | undefined {
  if (!query) return undefined;
  const q = query.trim().toLowerCase();
  return BANGLADESH_DISTRICTS.find(
    (d) =>
      d.name.toLowerCase() === q ||
      d.nameBn === query.trim() ||
      d.aliases.some((a) => a.toLowerCase() === q),
  );
}

/** Resolve DeliveryZone from district and thana names. */
export function resolveDeliveryZone(
  districtName?: string | null,
  thanaName?: string | null,
): DeliveryZone {
  if (!districtName) return DeliveryZone.OUTSIDE_DHAKA;
  const d = findDistrict(districtName);
  if (!d) return DeliveryZone.OUTSIDE_DHAKA;

  // Suburb special cases within Dhaka district
  if (d.name.toLowerCase() === "dhaka" && thanaName) {
    const t = thanaName.trim().toLowerCase();
    if (["savar", "dhamrai", "keraniganj", "nawabganj", "dohar"].includes(t)) {
      return DeliveryZone.DHAKA_SUBURBS;
    }
    return DeliveryZone.INSIDE_DHAKA;
  }

  return d.zone;
}
