/**
 * Andhra Pradesh Locations
 * All Districts and Mandals (Sub-districts) in AP
 */

export const AP_LOCATIONS = {
  "Visakhapatnam": [
    "Visakhapatnam", "Anakapalle", "Araku Valley", "Chodavaram",
    "Chintapalli", "G. Madugula", "Gajapati Nellore", "Kinjarikona",
    "Narsipatnam", "Paderu", "Pandanallur", "Payakaraopet",
    "Rambilli", "Bheemunipatnam", "Tuni"
  ],
  "Vizianagaram": [
    "Vizianagaram", "Bobbili", "Cheepurupalli", "Nellimarla",
    "Palakonda", "Pusapati Palem", "Salur", "Srungavarapukota"
  ],
  "Srikakulam": [
    "Srikakulam", "Amalapuram", "Ichchapuram", "Kuppili",
    "Mandasa", "Palasa Kasibugga", "Ponduru", "Sompeta",
    "Narasannapeta", "Tekkali"
  ],
  "Kakinada": [
    "Kakinada", "Amalapuram", "Jaggampeta", "Kakinada (Rural)",
    "Kirlampudi", "Marripudi", "Peddapalli", "Pithapuram",
    "Praksasai", "Samalkota", "Tuni", "Vegavati"
  ],
  "East Godavari": [
    "Rajahmundry", "Amalapuram", "Annavaram", "Aswaraopet",
    "Chips", "Jaggampeta", "Kakinada", "Maranadu",
    "Marripudi", "Mandavalli", "Peddapuram", "Rajahmundry",
    "Samalkota", "Tuni", "Tallapudi"
  ],
  "West Godavari": [
    "Tadepalligudem", "Amalapuram", "Bhimavaram", "Dwaraka",
    "Eluru", "Gopalapuram", "Jangareddygudem", "Kukkadapalli",
    "Mandapeta", "Nidadavole", "Palakollu", "Pedapalli",
    "Peddapuram", "Tadepalligudem", "Tanuku", "Unguturu", "Velerupadu"
  ],
  "Krishna": [
    "Vijayawada", "Chandarlapadu", "Gammanpet", "Gudivada",
    "Machilipatnam", "Mandal Vijayawada", "Mudinepalli", "Nagayalanka",
    "Pattisam", "Vijayawada", "Vuyyuru", "Zeera Bazaar"
  ],
  "Guntur": [
    "Guntur", "Amarthapatnam", "Bapatla", "Chebrolu",
    "Chilakaluripet", "Dupadu", "Etukur", "Guntur",
    "Kakani", "Kalamkuru", "Kalakada", "Narasaraopet",
    "Ongole", "Pedagantyada", "Ponnur", "Repalle", "Sattenapalli", "Tenali", "Vatticherukuru"
  ],
  "Prakasam": [
    "Ongole", "Addanki", "Chirala", "Darsi",
    "Giddalur", "Kandukur", "Markapur", "Ongole",
    "Renigunta", "Tangutur", "Tharlipalli"
  ],
  "Nellore": [
    "Nellore", "Chittoor", "Gudur", "Kavali",
    "Kandukur", "Kavali", "Nellore", "Samudram", "Sullurpeta"
  ],
  "Chittoor": [
    "Chittoor", "Chandragiri", "Chittoor", "Kuppam",
    "Madanapalle", "Nagari", "Palamaner", "Palamaneri",
    "Punganur", "Satyavedu", "Srikalahasti"
  ],
  "Kadapa": [
    "Kadapa", "Brodipet", "Cheyyar", "Duvvur",
    "Gaidolvaripalem", "Jammalamadugu", "Kadapa", "Kamalpur",
    "Kasepalli", "Koduru", "Kolimigundla", "Kotapalle",
    "Mydukur", "Naravaripalle", "Rayachoti", "Siddavattam"
  ],
  "Anantapur": [
    "Anantapur", "Adoni", "Amaravathi Puram", "Anantapur",
    "Dhone", "Guntakal", "Hindupur", "Kalyanadorg",
    "Kanaganapalli", "Kodumur", "Lepakshi", "Mudhol", "Rayadurg", "Talikota"
  ],
  "Kurnool": [
    "Kurnool", "Adhoni", "Allagadda", "Aspari",
    "Blunderghat", "Dhone", "Halaharvi", "Kurnool",
    "Mahaboob Nagar", "Nandial", "Orvakal", "Pattikonda",
    "Shamshabad", "Veerapur", "Yemmiganur"
  ],
  "Hyderabad": [
    "Hyderabad", "Dilsukhnagar", "Charminar", "Khairatabad",
    "Uppal", "Kukatpalli", "Malakajgiri", "Secunderabad",
    "Telangana", "Tolichowki"
  ],
  "Warangal": [
    "Warangal", "Bhupalpalli", "Hajipur", "Jaipur",
    "Karimnagar", "Kasipet", "Khanapur", "Korutla",
    "Parkal", "Karimnagar", "Talikota", "Warangal"
  ],
  "Khammam": [
    "Khammam", "Bhadrachalam", "Chandrashekarpet", "Dummugudem",
    "Kasipet", "Khammam", "Tandur", "Tanduru"
  ],
  "Suryapet": [
    "Suryapet", "Atmakur", "Choutuppal", "Jangaon",
    "Narayanpet", "Parigi", "Suryapet", "Tandur"
  ]
};

/**
 * Get all unique mandals from AP
 */
export const getAllAPMandals = () => {
  const mandals = new Set();
  Object.values(AP_LOCATIONS).forEach(districtMandals => {
    districtMandals.forEach(mandal => mandals.add(mandal));
  });
  return Array.from(mandals).sort();
};

/**
 * Get all unique districts
 */
export const getAllAPDistricts = () => {
  return Object.keys(AP_LOCATIONS).sort();
};

/**
 * Format location for display
 */
export const formatLocation = (location) => {
  if (!location) return "";
  // Capitalize first letter of each word
  return location
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export default AP_LOCATIONS;
