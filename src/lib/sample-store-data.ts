import { 
  Item, 
  Employee, 
  Transaction, 
  Settings, 
  DailyPaymentSales, 
  MonthlyPaymentSales, 
  MonthlySalesSummary,
  CartItem,
  UserRole,
  DailyItemSales,
  MonthlyItemSales,
  DailyAttendance,
  MonthlyAttendanceSummary
} from "@/types";

/**
 * Generate comprehensive sample data for new users
 * Following Two-Tier Summary Architecture:
 * - Transactions: Last 60 days only
 * - Daily summaries: Last 60 days only
 * - Monthly summaries: Full 26 months (2023-12 to 2026-01)
 * 
 * Total: ~10,000 records (optimized for performance)
 */

// Convenience store item categories with realistic products
export const SAMPLE_ITEMS_DATA = {
  "Snacks": [
    { name: "Chitato BBQ", price: 12000, barcode: "8992760221011" },
    { name: "Lays Original", price: 15000, barcode: "8991002100015" },
    { name: "Cheetos Cheese", price: 10000, barcode: "8992760221028" },
    { name: "Doritos Nacho", price: 13000, barcode: "8991002100022" },
    { name: "Pringles Original", price: 25000, barcode: "8992760221035" },
    { name: "Oreo Original", price: 8000, barcode: "8991002100039" },
    { name: "Biskuat Choco", price: 5000, barcode: "8992760221042" },
    { name: "Better Chocolate", price: 7000, barcode: "8991002100046" },
    { name: "Ritz Crackers", price: 9000, barcode: "8992760221059" },
    { name: "Pocky Chocolate", price: 6000, barcode: "8992760221066" },
    { name: "Selamat Kacang", price: 4000, barcode: "8991002100060" },
    { name: "Beng Beng", price: 2500, barcode: "8992760221073" },
    { name: "SilverQueen", price: 11000, barcode: "8991002100077" },
    { name: "Cadbury Dairy Milk", price: 18000, barcode: "8992760221080" },
    { name: "KitKat", price: 5000, barcode: "8991002100084" },
    { name: "Snickers", price: 7000, barcode: "8992760221097" },
    { name: "M&Ms", price: 12000, barcode: "8991002100091" },
    { name: "Twix", price: 8000, barcode: "8992760221103" },
    { name: "Mentos Mint", price: 3000, barcode: "8991002100107" },
  ],
  "Beverages": [
    { name: "Aqua 600ml", price: 4000, barcode: "8991001100014" },
    { name: "Coca Cola 330ml", price: 6000, barcode: "8991001100021" },
    { name: "Pepsi 330ml", price: 6000, barcode: "8991001100038" },
    { name: "Fanta Orange", price: 6000, barcode: "8991001100045" },
    { name: "Sprite 330ml", price: 6000, barcode: "8991001100052" },
    { name: "Teh Botol Sosro", price: 5000, barcode: "8991001100069" },
    { name: "Fruit Tea", price: 5000, barcode: "8991001100076" },
    { name: "Pocari Sweat", price: 7000, barcode: "8991001100083" },
    { name: "Mizone", price: 6000, barcode: "8991001100090" },
    { name: "Le Minerale", price: 3500, barcode: "8991001100106" },
    { name: "Teh Pucuk", price: 4000, barcode: "8991001100113" },
    { name: "Ale Ale", price: 3000, barcode: "8991001100120" },
    { name: "Kopiko Coffee", price: 6000, barcode: "8991001100137" },
    { name: "ABC Coffee", price: 8000, barcode: "8991001100144" },
    { name: "Nescafe Classic", price: 10000, barcode: "8991001100151" },
    { name: "Yakult", price: 12000, barcode: "8991001100168" },
    { name: "Cimory Yogurt", price: 15000, barcode: "8991001100175" },
    { name: "Ultra Milk", price: 9000, barcode: "8991001100182" },
    { name: "Indomilk", price: 8000, barcode: "8991001100199" },
    { name: "Bear Brand", price: 11000, barcode: "8991001100205" },
    { name: "Red Bull", price: 20000, barcode: "8991001100212" },
    { name: "Kratingdaeng", price: 8000, barcode: "8991001100229" },
    { name: "Extra Joss", price: 2000, barcode: "8991001100236" },
    { name: "Good Day Cappuccino", price: 12000, barcode: "8991001100243" },
    { name: "ABC Heinz Ketchup", price: 15000, barcode: "8991001100250" },
  ],
  "Instant Food": [
    { name: "Indomie Goreng", price: 3500, barcode: "8992760100012" },
    { name: "Indomie Soto", price: 3500, barcode: "8992760100029" },
    { name: "Indomie Ayam Bawang", price: 3500, barcode: "8992760100036" },
    { name: "Mie Sedaap Goreng", price: 3000, barcode: "8992760100043" },
    { name: "Mie Gelas", price: 5000, barcode: "8992760100050" },
    { name: "Pop Mie", price: 6000, barcode: "8992760100067" },
    { name: "Sarimi Isi 2", price: 4000, barcode: "8992760100074" },
    { name: "Supermie", price: 3000, barcode: "8992760100081" },
    { name: "Lemonilo", price: 7000, barcode: "8992760100098" },
    { name: "Indofood Bumbu Racik", price: 2000, barcode: "8992760100104" },
    { name: "Kecap Bango", price: 8000, barcode: "8992760100111" },
    { name: "Saus Sambal ABC", price: 10000, barcode: "8992760100128" },
    { name: "Royco Ayam", price: 6000, barcode: "8992760100135" },
    { name: "Masako Sapi", price: 6000, barcode: "8992760100142" },
    { name: "Sunlight 800ml", price: 15000, barcode: "8992760100159" },
  ],
  "Personal Care": [
    { name: "Pepsodent", price: 8000, barcode: "8993560100013" },
    { name: "Close Up", price: 9000, barcode: "8993560100020" },
    { name: "Sikat Gigi Formula", price: 5000, barcode: "8993560100037" },
    { name: "Lifebouy Sabun", price: 4000, barcode: "8993560100044" },
    { name: "Dettol Soap", price: 6000, barcode: "8993560100051" },
    { name: "Pantene Shampoo", price: 2000, barcode: "8993560100068" },
    { name: "Clear Shampoo", price: 2500, barcode: "8993560100075" },
    { name: "Sunsilk Shampoo", price: 2000, barcode: "8993560100082" },
    { name: "Dove Shampoo", price: 3000, barcode: "8993560100099" },
    { name: "Rejoice Shampoo", price: 2000, barcode: "8993560100105" },
    { name: "Vaseline Lotion", price: 15000, barcode: "8993560100112" },
    { name: "Citra Lotion", price: 12000, barcode: "8993560100129" },
    { name: "Marina Lotion", price: 8000, barcode: "8993560100136" },
    { name: "Tissue Paseo", price: 6000, barcode: "8993560100143" },
    { name: "Charm Pembalut", price: 10000, barcode: "8993560100150" },
    { name: "Softex Pembalut", price: 9000, barcode: "8993560100167" },
    { name: "Diapers Merries", price: 45000, barcode: "8993560100174" },
    { name: "Mamy Poko", price: 35000, barcode: "8993560100181" },
    { name: "Baby Oil", price: 18000, barcode: "8993560100198" },
    { name: "Bedak Bayi", price: 12000, barcode: "8993560100204" },
  ],
  "Household": [
    { name: "Beras 1kg", price: 15000, barcode: "8994560100011" },
    { name: "Minyak Goreng 1L", price: 18000, barcode: "8994560100028" },
    { name: "Gula Pasir 1kg", price: 14000, barcode: "8994560100035" },
    { name: "Garam 250g", price: 3000, barcode: "8994560100042" },
    { name: "Telur 1/4kg", price: 8000, barcode: "8994560100059" },
    { name: "Kopi Kapal Api", price: 12000, barcode: "8994560100066" },
    { name: "Teh Celup Sariwangi", price: 7000, barcode: "8994560100073" },
    { name: "Susu Kental Manis", price: 9000, barcode: "8994560100080" },
    { name: "Tepung Terigu", price: 10000, barcode: "8994560100097" },
    { name: "Sabun Cuci Piring", price: 12000, barcode: "8994560100103" },
    { name: "Molto Pelembut", price: 8000, barcode: "8994560100110" },
    { name: "Rinso Detergen", price: 20000, barcode: "8994560100127" },
    { name: "Baygon Spray", price: 25000, barcode: "8994560100134" },
    { name: "Stella Pengharum", price: 8000, barcode: "8994560100141" },
    { name: "Kamper Anti Nyamuk", price: 15000, barcode: "8994560100158" },
  ],
  "Cigarettes": [
    { name: "Gudang Garam Filter", price: 25000, barcode: "8995560100010" },
    { name: "Sampoerna Mild", price: 28000, barcode: "8995560100027" },
    { name: "Djarum Super", price: 24000, barcode: "8995560100034" },
    { name: "LA Lights", price: 20000, barcode: "8995560100041" },
    { name: "Marlboro Merah", price: 35000, barcode: "8995560100058" },
    { name: "Surya 16", price: 18000, barcode: "8995560100065" },
    { name: "Esse", price: 22000, barcode: "8995560100072" },
    { name: "U Mild", price: 23000, barcode: "8995560100089" },
  ],
  "Ice Cream": [
    { name: "Magnum Classic", price: 15000, barcode: "8996560100019" },
    { name: "Walls Feast", price: 12000, barcode: "8996560100026" },
    { name: "Paddle Pop", price: 5000, barcode: "8996560100033" },
    { name: "Campina", price: 8000, barcode: "8996560100040" },
    { name: "Cornetto", price: 10000, barcode: "8996560100057" },
  ],
  "Frozen Food": [
    { name: "Nugget Fiesta", price: 18000, barcode: "8997560100018" },
    { name: "Sosis So Nice", price: 15000, barcode: "8997560100025" },
    { name: "Bakso Sapi", price: 20000, barcode: "8997560100032" },
    { name: "French Fries", price: 12000, barcode: "8997560100049" },
    { name: "Dimsum Frozen", price: 25000, barcode: "8997560100056" },
  ],
  "Bread & Bakery": [
    { name: "Roti Tawar Sari Roti", price: 12000, barcode: "8998560100017" },
    { name: "Roti Sobek", price: 8000, barcode: "8998560100024" },
    { name: "Roti Aoka", price: 5000, barcode: "8998560100031" },
    { name: "Roti Sisir", price: 6000, barcode: "8998560100048" },
    { name: "Roti Isi Coklat", price: 4000, barcode: "8998560100055" },
  ],
  "Stationery": [
    { name: "Pulpen Standard", price: 3000, barcode: "8999560100016" },
    { name: "Pulpen Pilot", price: 8000, barcode: "8999560100017" },
    { name: "Pensil 2B Faber", price: 5000, barcode: "8999560100023" },
    { name: "Pensil Mekanik", price: 12000, barcode: "8999560100024" },
    { name: "Spidol Permanent", price: 6000, barcode: "8999560100025" },
    { name: "Spidol Whiteboard", price: 8000, barcode: "8999560100026" },
    { name: "Highlighter Set", price: 15000, barcode: "8999560100027" },
    { name: "Tinta Printer", price: 45000, barcode: "8999560100028" },
  ],
  "Phone Accessories": [
    { name: "Kabel Data Micro USB", price: 20000, barcode: "8990560100015" },
    { name: "Kabel Data Type C", price: 25000, barcode: "8990560100022" },
    { name: "Earphone", price: 30000, barcode: "8990560100039" },
    { name: "Powerbank 10000mAh", price: 150000, barcode: "8990560100046" },
    { name: "Tempered Glass", price: 35000, barcode: "8990560100053" },
    { name: "Case HP", price: 25000, barcode: "8990560100060" },
    { name: "Pulsa 10k", price: 11000, barcode: "8990560100077" },
    { name: "Pulsa 25k", price: 26000, barcode: "8990560100084" },
    { name: "Pulsa 50k", price: 51000, barcode: "8990560100091" },
    { name: "Pulsa 100k", price: 101000, barcode: "8990560100107" },
  ],
};

// Business Type for sample data generation
export type BusinessType = 
  | "convenience-store"
  | "stationery"
  | "toys"
  | "electronics"
  | "warung-padang"
  | "noodle-tea"
  | "building-materials"
  | "pharmacy";

// Business-specific item catalogs
export const BUSINESS_CATALOGS: Record<BusinessType, Record<string, Array<{name: string; price: number; barcode: string}>>> = {
  "convenience-store": SAMPLE_ITEMS_DATA,
  
  "stationery": {
    "Writing": [
      { name: "Pulpen Standard", price: 3000, barcode: "8999560100016" },
      { name: "Pulpen Pilot", price: 8000, barcode: "8999560100017" },
      { name: "Pensil 2B Faber", price: 5000, barcode: "8999560100023" },
      { name: "Pensil Mekanik", price: 12000, barcode: "8999560100024" },
      { name: "Spidol Permanent", price: 6000, barcode: "8999560100025" },
      { name: "Spidol Whiteboard", price: 8000, barcode: "8999560100026" },
      { name: "Highlighter Set", price: 15000, barcode: "8999560100027" },
      { name: "Tinta Printer", price: 45000, barcode: "8999560100028" },
    ],
    "Paper": [
      { name: "Buku Tulis 58", price: 5000, barcode: "8999560100047" },
      { name: "Buku Tulis 42", price: 4000, barcode: "8999560100048" },
      { name: "Kertas A4 70gsm", price: 45000, barcode: "8999560100049" },
      { name: "Kertas A4 80gsm", price: 55000, barcode: "8999560100050" },
      { name: "Sticky Notes", price: 8000, barcode: "8999560100051" },
      { name: "Index Card", price: 6000, barcode: "8999560100052" },
      { name: "Kertas Foto", price: 25000, barcode: "8999560100053" },
      { name: "Amplop Besar", price: 3000, barcode: "8999560100054" },
    ],
    "Office Supplies": [
      { name: "Map Folder A4", price: 4000, barcode: "8999560100062" },
      { name: "Map Folder Folio", price: 5000, barcode: "8999560100063" },
      { name: "Binder 2 Ring", price: 15000, barcode: "8999560100064" },
      { name: "Binder 4 Ring", price: 20000, barcode: "8999560100065" },
      { name: "Kalkulator", price: 45000, barcode: "8999560100066" },
      { name: "Stapler Besar", price: 25000, barcode: "8999560100085" },
      { name: "Staples Isi", price: 5000, barcode: "8999560100086" },
      { name: "Punch Hole", price: 18000, barcode: "8999560100087" },
    ],
    "Art Supplies": [
      { name: "Pensil Warna 12", price: 25000, barcode: "8999560100070" },
      { name: "Pensil Warna 24", price: 45000, barcode: "8999560100071" },
      { name: "Crayon 12 Warna", price: 18000, barcode: "8999560100072" },
      { name: "Crayon 24 Warna", price: 32000, barcode: "8999560100073" },
      { name: "Cat Air Set", price: 35000, barcode: "8999560100074" },
      { name: "Kuas Cat Set", price: 22000, barcode: "8999560100075" },
      { name: "Kanvas Kecil", price: 15000, barcode: "8999560100076" },
    ],
  },
  
  "toys": {
    "Action Figures": [
      { name: "Robot Transformer", price: 125000, barcode: "8990660100001" },
      { name: "Avengers Figure", price: 95000, barcode: "8990660100002" },
      { name: "Spiderman Figure", price: 85000, barcode: "8990660100003" },
      { name: "Dinosaurus Figure", price: 75000, barcode: "8990660100004" },
      { name: "Polisi Set", price: 65000, barcode: "8990660100005" },
    ],
    "Board Games": [
      { name: "UNO Cards", price: 25000, barcode: "8990660100010" },
      { name: "Monopoly", price: 180000, barcode: "8990660100011" },
      { name: "Catur", price: 45000, barcode: "8990660100012" },
      { name: "Ular Tangga", price: 35000, barcode: "8990660100013" },
      { name: "Ludo", price: 28000, barcode: "8990660100014" },
    ],
    "Remote Control": [
      { name: "RC Car", price: 150000, barcode: "8990660100020" },
      { name: "RC Drone Mini", price: 280000, barcode: "8990660100021" },
      { name: "RC Boat", price: 120000, barcode: "8990660100022" },
      { name: "RC Helicopter", price: 175000, barcode: "8990660100023" },
    ],
    "Plush Toys": [
      { name: "Boneka Beruang", price: 85000, barcode: "8990660100030" },
      { name: "Boneka Kelinci", price: 65000, barcode: "8990660100031" },
      { name: "Boneka Panda", price: 75000, barcode: "8990660100032" },
      { name: "Bantal Boneka", price: 55000, barcode: "8990660100033" },
    ],
    "Educational": [
      { name: "Lego Classic", price: 195000, barcode: "8990660100040" },
      { name: "Blok Bangunan", price: 65000, barcode: "8990660100041" },
      { name: "Puzzle 100 pcs", price: 45000, barcode: "8990660100042" },
      { name: "Puzzle 500 pcs", price: 85000, barcode: "8990660100043" },
      { name: "Mainan Musik", price: 55000, barcode: "8990660100044" },
    ],
  },
  
  "electronics": {
    "Cables & Chargers": [
      { name: "Kabel Data Micro USB", price: 25000, barcode: "8990560100015" },
      { name: "Kabel Data Type C", price: 35000, barcode: "8990560100022" },
      { name: "Kabel Lightning", price: 45000, barcode: "8990560100150" },
      { name: "Charger Fast 18W", price: 75000, barcode: "8990560100151" },
      { name: "Charger Fast 30W", price: 120000, barcode: "8990560100152" },
      { name: "Wireless Charger", price: 95000, barcode: "8990560100153" },
    ],
    "Audio": [
      { name: "Earphone Basic", price: 35000, barcode: "8990560100039" },
      { name: "Earphone Premium", price: 75000, barcode: "8990560100160" },
      { name: "Headphone Bluetooth", price: 185000, barcode: "8990560100161" },
      { name: "Speaker Mini", price: 95000, barcode: "8990560100162" },
      { name: "Speaker Bluetooth", price: 225000, barcode: "8990560100163" },
    ],
    "Accessories": [
      { name: "Tempered Glass", price: 35000, barcode: "8990560100053" },
      { name: "Case HP Premium", price: 45000, barcode: "8990560100060" },
      { name: "Ring Holder", price: 15000, barcode: "8990560100170" },
      { name: "Selfie Stick", price: 55000, barcode: "8990560100171" },
      { name: "Tripod Mini", price: 65000, barcode: "8990560100172" },
      { name: "Powerbank 10000mAh", price: 150000, barcode: "8990560100046" },
      { name: "Powerbank 20000mAh", price: 250000, barcode: "8990560100173" },
    ],
    "Storage": [
      { name: "USB Flash 16GB", price: 65000, barcode: "8990560100180" },
      { name: "USB Flash 32GB", price: 85000, barcode: "8990560100181" },
      { name: "USB Flash 64GB", price: 125000, barcode: "8990560100182" },
      { name: "Memory Card 32GB", price: 55000, barcode: "8990560100183" },
      { name: "Memory Card 64GB", price: 85000, barcode: "8990560100184" },
      { name: "Harddisk Eksternal 1TB", price: 650000, barcode: "8990560100185" },
    ],
  },
  
  "warung-padang": {
    "Nasi & Lauk": [
      { name: "Nasi Padang", price: 12000, barcode: "8991660100001" },
      { name: "Nasi Rendang", price: 25000, barcode: "8991660100002" },
      { name: "Rendang Sapi", price: 18000, barcode: "8991660100003" },
      { name: "Ayam Pop", price: 15000, barcode: "8991660100004" },
      { name: "Ayam Gulai", price: 14000, barcode: "8991660100005" },
      { name: "Dendeng Balado", price: 20000, barcode: "8991660100006" },
      { name: "Ikan Bilih", price: 12000, barcode: "8991660100007" },
      { name: "Gulai Kepala Ikan", price: 22000, barcode: "8991660100008" },
    ],
    "Sayur & Sambal": [
      { name: "Sayur Nangka", price: 8000, barcode: "8991660100010" },
      { name: "Sayur Daun Singkong", price: 7000, barcode: "8991660100011" },
      { name: "Sambal Ijo", price: 5000, barcode: "8991660100012" },
      { name: "Sambal Merah", price: 5000, barcode: "8991660100013" },
      { name: "Gulai Pakis", price: 9000, barcode: "8991660100014" },
      { name: "Terong Balado", price: 8000, barcode: "8991660100015" },
    ],
    "Minuman": [
      { name: "Es Teh Manis", price: 5000, barcode: "8991660100020" },
      { name: "Es Teh Tawar", price: 3000, barcode: "8991660100021" },
      { name: "Kopi Susu", price: 8000, barcode: "8991660100022" },
      { name: "Kopi Hitam", price: 6000, barcode: "8991660100023" },
      { name: "Es Jeruk", price: 8000, barcode: "8991660100024" },
      { name: "Air Mineral", price: 4000, barcode: "8991660100025" },
    ],
    "Lauk Tambahan": [
      { name: "Telur Dadar", price: 7000, barcode: "8991660100030" },
      { name: "Telur Balado", price: 8000, barcode: "8991660100031" },
      { name: "Perkedel", price: 5000, barcode: "8991660100032" },
      { name: "Kerupuk", price: 3000, barcode: "8991660100033" },
      { name: "Sambal Goreng Kentang", price: 9000, barcode: "8991660100034" },
    ],
  },
  
  "noodle-tea": {
    "Mie": [
      { name: "Mie Ayam Original", price: 18000, barcode: "8992660100001" },
      { name: "Mie Ayam Bakso", price: 22000, barcode: "8992660100002" },
      { name: "Mie Ayam Pangsit", price: 24000, barcode: "8992660100003" },
      { name: "Mie Ayam Jamur", price: 20000, barcode: "8992660100004" },
      { name: "Mie Yamin", price: 19000, barcode: "8992660100005" },
      { name: "Mie Goreng", price: 19000, barcode: "8992660100006" },
      { name: "Kwetiau Goreng", price: 22000, barcode: "8992660100007" },
      { name: "Bakso Urat", price: 18000, barcode: "8992660100008" },
    ],
    "Topping": [
      { name: "Extra Bakso", price: 7000, barcode: "8992660100010" },
      { name: "Extra Pangsit", price: 6000, barcode: "8992660100011" },
      { name: "Extra Ayam", price: 8000, barcode: "8992660100012" },
      { name: "Extra Jamur", price: 5000, barcode: "8992660100013" },
      { name: "Telur Mata Sapi", price: 4000, barcode: "8992660100014" },
      { name: "Kerupuk Pangsit", price: 3000, barcode: "8992660100015" },
    ],
    "Tea Series": [
      { name: "Thai Tea", price: 12000, barcode: "8992660100020" },
      { name: "Green Tea", price: 10000, barcode: "8992660100021" },
      { name: "Lemon Tea", price: 11000, barcode: "8992660100022" },
      { name: "Milk Tea", price: 13000, barcode: "8992660100023" },
      { name: "Chocolate", price: 12000, barcode: "8992660100024" },
      { name: "Taro", price: 13000, barcode: "8992660100025" },
    ],
    "Coffee & Others": [
      { name: "Kopi Susu", price: 12000, barcode: "8992660100030" },
      { name: "Kopi Hitam", price: 10000, barcode: "8992660100031" },
      { name: "Americano", price: 14000, barcode: "8992660100032" },
      { name: "Cappuccino", price: 16000, barcode: "8992660100033" },
      { name: "Milo", price: 12000, barcode: "8992660100034" },
      { name: "Es Jeruk", price: 10000, barcode: "8992660100035" },
    ],
  },
  
  "building-materials": {
    "Semen & Pasir": [
      { name: "Semen Tiga Roda 50kg", price: 70000, barcode: "8993660100001" },
      { name: "Semen Holcim 50kg", price: 72000, barcode: "8993660100002" },
      { name: "Semen Gresik 50kg", price: 75000, barcode: "8993660100003" },
      { name: "Pasir 1m3", price: 350000, barcode: "8993660100004" },
      { name: "Batu Split 1m3", price: 280000, barcode: "8993660100005" },
    ],
    "Bata & Blok": [
      { name: "Bata Merah 1.000 pcs", price: 650000, barcode: "8993660100010" },
      { name: "Batako Besar", price: 3500, barcode: "8993660100011" },
      { name: "Batako Kecil", price: 2800, barcode: "8993660100012" },
      { name: "Hebel Block", price: 12000, barcode: "8993660100013" },
      { name: "Bata Ringan", price: 8000, barcode: "8993660100014" },
    ],
    "Besi & Baja": [
      { name: "Besi Beton 10mm", price: 85000, barcode: "8993660100020" },
      { name: "Besi Beton 12mm", price: 120000, barcode: "8993660100021" },
      { name: "Wiremesh M6", price: 450000, barcode: "8993660100022" },
      { name: "Wiremesh M8", price: 650000, barcode: "8993660100023" },
      { name: "Hollow 2x4 0.8mm", price: 55000, barcode: "8993660100024" },
    ],
    "Cat & Pelapis": [
      { name: "Cat Dulux 5kg", price: 285000, barcode: "8993660100030" },
      { name: "Cat Nippon Paint 5kg", price: 245000, barcode: "8993660100031" },
      { name: "Cat Avian 5kg", price: 165000, barcode: "8993660100032" },
      { name: "Thinner 1L", price: 35000, barcode: "8993660100033" },
      { name: "Kuas Set", price: 45000, barcode: "8993660100034" },
    ],
    "Keramik & Sanitair": [
      { name: "Keramik 30x30 box", price: 85000, barcode: "8993660100040" },
      { name: "Keramik 40x40 box", price: 115000, barcode: "8993660100041" },
      { name: "Keramik 60x60 box", price: 185000, barcode: "8993660100042" },
      { name: "Toilet Duduk", price: 750000, barcode: "8993660100043" },
      { name: "Wastafel Set", price: 450000, barcode: "8993660100044" },
    ],
  },
  
  "pharmacy": {
    "Obat Bebas": [
      { name: "Panadol Extra", price: 12500, barcode: "8994660100001" },
      { name: "Bodrex", price: 9500, barcode: "8994660100002" },
      { name: "Paramex", price: 8500, barcode: "8994660100003" },
      { name: "Neozep Forte", price: 10500, barcode: "8994660100004" },
      { name: "Decolgen", price: 9500, barcode: "8994660100005" },
      { name: "Promag", price: 8500, barcode: "8994660100006" },
      { name: "Polysilane", price: 11000, barcode: "8994660100007" },
      { name: "Antangin", price: 6500, barcode: "8994660100008" },
    ],
    "Vitamin & Suplemen": [
      { name: "Centrum", price: 125000, barcode: "8994660100010" },
      { name: "Enervon C", price: 45000, barcode: "8994660100011" },
      { name: "Sakatonik ABC", price: 28000, barcode: "8994660100012" },
      { name: "Hemaviton", price: 35000, barcode: "8994660100013" },
      { name: "Imboost", price: 65000, barcode: "8994660100014" },
      { name: "Blackmores", price: 185000, barcode: "8994660100015" },
    ],
    "Perawatan Kulit": [
      { name: "Betadine 30ml", price: 18000, barcode: "8994660100020" },
      { name: "Alkohol 70% 100ml", price: 12000, barcode: "8994660100021" },
      { name: "Hansaplast", price: 8500, barcode: "8994660100022" },
      { name: "Salep Kulit", price: 15000, barcode: "8994660100023" },
      { name: "Bedak Salicyl", price: 12000, barcode: "8994660100024" },
      { name: "Minyak Kayu Putih", price: 18000, barcode: "8994660100025" },
    ],
    "Alat Kesehatan": [
      { name: "Masker 1 Box", price: 25000, barcode: "8994660100030" },
      { name: "Thermometer Digital", price: 85000, barcode: "8994660100031" },
      { name: "Tensimeter", price: 185000, barcode: "8994660100032" },
      { name: "Sarung Tangan Medis", price: 35000, barcode: "8994660100033" },
      { name: "Cotton Bud", price: 8500, barcode: "8994660100034" },
    ],
    "Bayi & Ibu": [
      { name: "Pampers M 24pcs", price: 45000, barcode: "8994660100040" },
      { name: "Pampers L 20pcs", price: 55000, barcode: "8994660100041" },
      { name: "Susu Formula 400g", price: 85000, barcode: "8994660100042" },
      { name: "Bedak Bayi", price: 12000, barcode: "8994660100043" },
      { name: "Minyak Telon", price: 15000, barcode: "8994660100044" },
    ],
  },
};

const SAMPLE_EMPLOYEES = [
  { name: "Ahmad", pin: "1111", role: "cashier" as const, shift: "shift1" },
  { name: "Siti", pin: "2222", role: "cashier" as const, shift: "shift1" },
  { name: "Budi", pin: "3333", role: "cashier" as const, shift: "shift2" },
  { name: "Dewi", pin: "4444", role: "cashier" as const, shift: "shift2" },
  { name: "Rudi", pin: "5555", role: "cashier" as const, shift: "shift3" },
  { name: "Maya", pin: "6666", role: "cashier" as const, shift: "shift3" },
  { name: "Andi", pin: "7777", role: "admin" as const, shift: "shift1" },
  { name: "Linda", pin: "8888", role: "admin" as const, shift: "shift2" },
];

export function generateSampleItems(businessType: BusinessType = "convenience-store"): Item[] {
  const items: Item[] = [];
  let itemId = 1;
  const catalog = BUSINESS_CATALOGS[businessType];

  for (const [category, products] of Object.entries(catalog)) {
    for (const product of products) {
      items.push({
        id: itemId,
        name: product.name,
        price: product.price,
        category,
        sku: product.barcode,
        stock: Math.floor(Math.random() * 100) + 20,
        isActive: true,
      });
      itemId++;
    }
  }

  return items;
}

export function generateSampleEmployees(): Employee[] {
  return SAMPLE_EMPLOYEES.map((emp, index) => ({
    id: index + 1,
    name: emp.name,
    pin: emp.pin,
    role: emp.role as UserRole,
    createdAt: Date.now(),
    isActive: true
  }));
}

/**
 * Generate sample data following Two-Tier Summary Architecture
 * - Transactions: Last 60 days only
 * - Daily summaries: Last 60 days only  
 * - Monthly summaries: Full 26 months (2023-12 to 2026-01)
 */
export function generateSampleTransactions(items: Item[], employees: Employee[], businessType: BusinessType = "convenience-store"): {
  transactions: Transaction[];
  dailySummaries: DailyPaymentSales[];
  dailyItemSales: DailyItemSales[];
  dailyAttendance: DailyAttendance[];
  monthlyItemSales: MonthlyItemSales[];
  monthlySummaries: { payments: MonthlyPaymentSales[]; summary: MonthlySalesSummary[] };
  monthlyAttendanceSummaries: MonthlyAttendanceSummary[];
} {
  const transactions: Transaction[] = [];
  const dailyMap = new Map<string, Map<string, number>>();
  const dailyItemMap = new Map<string, Map<number, { quantity: number; revenue: number; count: number; itemName: string; sku: string }>>();
  const dailyAttendanceMap = new Map<string, Map<number, { checkIn: number; checkOut: number | null; hoursWorked: number }>>();
  
  // Monthly maps for 26 months of synthetic data
  const monthlyItemMap = new Map<string, Map<number, { quantity: number; revenue: number; count: number; itemName: string; sku: string }>>();
  const monthlyPaymentMap = new Map<string, Map<string, number>>();
  const monthlyAttendanceMap = new Map<string, Map<number, { totalHours: number; daysWorked: number }>>();
  
  const paymentMethods = ["cash", "qris-static", "qris-dynamic", "voucher"];
  
  // Business-specific transaction patterns
  const businessPatterns: Record<BusinessType, { 
    baseTransactionsPerDay: number; 
    weekendMultiplier: number; 
    avgItemsPerTransaction: number;
    avgTransactionValue: number;
  }> = {
    "convenience-store": { baseTransactionsPerDay: 35, weekendMultiplier: 1.4, avgItemsPerTransaction: 3, avgTransactionValue: 80000 },
    "stationery": { baseTransactionsPerDay: 20, weekendMultiplier: 1.8, avgItemsPerTransaction: 4, avgTransactionValue: 45000 },
    "toys": { baseTransactionsPerDay: 15, weekendMultiplier: 2.5, avgItemsPerTransaction: 2, avgTransactionValue: 95000 },
    "electronics": { baseTransactionsPerDay: 12, weekendMultiplier: 1.6, avgItemsPerTransaction: 1.5, avgTransactionValue: 125000 },
    "warung-padang": { baseTransactionsPerDay: 80, weekendMultiplier: 1.2, avgItemsPerTransaction: 2, avgTransactionValue: 25000 },
    "noodle-tea": { baseTransactionsPerDay: 60, weekendMultiplier: 1.3, avgItemsPerTransaction: 1.8, avgTransactionValue: 22000 },
    "building-materials": { baseTransactionsPerDay: 8, weekendMultiplier: 1.0, avgItemsPerTransaction: 3, avgTransactionValue: 185000 },
    "pharmacy": { baseTransactionsPerDay: 45, weekendMultiplier: 1.1, avgItemsPerTransaction: 2, avgTransactionValue: 35000 },
  };
  
  const pattern = businessPatterns[businessType];
  
  // Generate transactions for LAST 60 DAYS ONLY
  const today = new Date();
  const sixtyDaysAgo = new Date(today);
  sixtyDaysAgo.setDate(today.getDate() - 59);
  
  let transactionId = 1;
  
  for (let d = new Date(sixtyDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    const multiplier = isWeekend ? pattern.weekendMultiplier : 1;
    const transactionsToday = Math.floor(pattern.baseTransactionsPerDay * multiplier + Math.random() * 10);
    
    for (let i = 0; i < transactionsToday; i++) {
      const hour = 7 + Math.floor(Math.random() * 15);
      const minute = Math.floor(Math.random() * 60);
      const timestamp = new Date(d);
      timestamp.setHours(hour, minute, 0, 0);
      
      const itemCount = Math.floor(Math.random() * pattern.avgItemsPerTransaction) + 1;
      const transactionItems: CartItem[] = [];
      let subtotal = 0;
      
      for (let j = 0; j < itemCount; j++) {
        const randomItem = items[Math.floor(Math.random() * items.length)];
        const quantity = Math.floor(Math.random() * 2) + 1;
        
        transactionItems.push({ 
          itemId: randomItem.id || 0,
          sku: randomItem.sku || "",
          name: randomItem.name,
          basePrice: randomItem.price,
          quantity: quantity,
          totalPrice: randomItem.price * quantity
        });
        subtotal += randomItem.price * quantity;
        
        // Track daily item sales
        if (!dailyItemMap.has(dateStr)) {
          dailyItemMap.set(dateStr, new Map());
        }
        const dayItemMap = dailyItemMap.get(dateStr)!;
        const itemStats = dayItemMap.get(randomItem.id || 0) || { 
          quantity: 0, 
          revenue: 0, 
          count: 0, 
          itemName: randomItem.name,
          sku: randomItem.sku || ""
        };
        itemStats.quantity += quantity;
        itemStats.revenue += randomItem.price * quantity;
        itemStats.count += 1;
        dayItemMap.set(randomItem.id || 0, itemStats);
      }
      
      const cashiers = employees.filter(e => e.role === "cashier");
      const employee = Math.random() < 0.9 
        ? cashiers[Math.floor(Math.random() * cashiers.length)]
        : employees[Math.floor(Math.random() * employees.length)];
      
      const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      
      const transaction: Transaction = {
        id: transactionId,
        timestamp: timestamp.getTime(),
        businessDate: dateStr,
        shiftId: "shift1",
        cashierId: employee.id || 0,
        cashierName: employee.name,
        mode: "retail",
        items: transactionItems,
        subtotal,
        tax: 0,
        total: subtotal,
        payments: [{
          method: paymentMethod as any,
          amount: subtotal
        }],
        change: 0,
      };
      
      transactions.push(transaction);
      transactionId++;
      
      // Track daily payment sales
      if (!dailyMap.has(dateStr)) {
        dailyMap.set(dateStr, new Map());
      }
      const dayMap = dailyMap.get(dateStr)!;
      dayMap.set(paymentMethod, (dayMap.get(paymentMethod) || 0) + subtotal);
    }
    
    // Track daily attendance
    if (!dailyAttendanceMap.has(dateStr)) {
      dailyAttendanceMap.set(dateStr, new Map());
    }
    const attendanceMap = dailyAttendanceMap.get(dateStr)!;
    
    const workingEmployees = [...employees]
      .sort(() => Math.random() - 0.5)
      .slice(0, 5 + Math.floor(Math.random() * 3));
    
    for (const emp of workingEmployees) {
      const checkInHour = 7 + Math.floor(Math.random() * 2);
      const checkIn = new Date(d);
      checkIn.setHours(checkInHour, Math.floor(Math.random() * 60), 0, 0);
      
      const workHours = 7 + Math.floor(Math.random() * 3);
      const checkOut = new Date(checkIn);
      checkOut.setHours(checkIn.getHours() + workHours);
      
      attendanceMap.set(emp.id || 0, {
        checkIn: checkIn.getTime(),
        checkOut: checkOut.getTime(),
        hoursWorked: workHours
      });
    }
  }
  
  // Generate SYNTHETIC monthly summaries using business-specific patterns
  const startMonth = new Date("2023-12-01");
  const endMonth = new Date("2026-01-31");
  
  for (let m = new Date(startMonth); m <= endMonth; m.setMonth(m.getMonth() + 1)) {
    const monthStr = m.toISOString().substring(0, 7);
    const daysInMonth = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    
    // Generate synthetic monthly item sales
    if (!monthlyItemMap.has(monthStr)) {
      monthlyItemMap.set(monthStr, new Map());
    }
    const monthItemMap = monthlyItemMap.get(monthStr)!;
    
    // Random 80-100 unique items sold per month
    const itemsThisMonth = [...items]
      .sort(() => Math.random() - 0.5)
      .slice(0, 80 + Math.floor(Math.random() * 21));
    
    for (const item of itemsThisMonth) {
      const avgDailyQty = Math.max(1, Math.floor(Math.random() * (pattern.avgItemsPerTransaction * 2)));
      const totalQty = avgDailyQty * daysInMonth;
      const revenue = totalQty * item.price;
      
      monthItemMap.set(item.id || 0, {
        quantity: totalQty,
        revenue,
        count: Math.floor(totalQty * 0.7), // Approximate transaction count
        itemName: item.name,
        sku: item.sku || ""
      });
    }
    
    // Generate synthetic monthly payment sales
    if (!monthlyPaymentMap.has(monthStr)) {
      monthlyPaymentMap.set(monthStr, new Map());
    }
    const monthPaymentMap = monthlyPaymentMap.get(monthStr)!;
    
    const baseTransactionsPerMonth = daysInMonth * pattern.baseTransactionsPerDay;
    const totalRevenue = Math.floor(baseTransactionsPerMonth * pattern.avgTransactionValue);
    
    monthPaymentMap.set("cash", Math.floor(totalRevenue * 0.45));
    monthPaymentMap.set("qris-static", Math.floor(totalRevenue * 0.30));
    monthPaymentMap.set("qris-dynamic", Math.floor(totalRevenue * 0.20));
    monthPaymentMap.set("voucher", Math.floor(totalRevenue * 0.05));
    
    // Generate synthetic monthly attendance
    if (!monthlyAttendanceMap.has(monthStr)) {
      monthlyAttendanceMap.set(monthStr, new Map());
    }
    const monthAttendanceMap = monthlyAttendanceMap.get(monthStr)!;
    
    for (const emp of employees) {
      const daysWorked = 20 + Math.floor(Math.random() * 6); // 20-25 days
      const avgHoursPerDay = 7 + Math.random() * 2;
      const totalHours = Math.floor(daysWorked * avgHoursPerDay);
      
      monthAttendanceMap.set(emp.id || 0, {
        totalHours,
        daysWorked
      });
    }
  }
  
  // Convert to output format
  const dailySummaries: DailyPaymentSales[] = [];
  for (const [date, paymentMap] of dailyMap.entries()) {
    for (const [method, total] of paymentMap.entries()) {
      dailySummaries.push({
        businessDate: date,
        method: method as any,
        totalAmount: total,
        transactionCount: 0
      });
    }
  }
  
  const dailyItemSales: DailyItemSales[] = [];
  for (const [date, itemMap] of dailyItemMap.entries()) {
    for (const [itemId, stats] of itemMap.entries()) {
      dailyItemSales.push({
        businessDate: date,
        itemId,
        sku: stats.sku,
        itemName: stats.itemName,
        totalQuantity: stats.quantity,
        totalRevenue: stats.revenue,
        transactionCount: stats.count
      });
    }
  }
  
  const dailyAttendance: DailyAttendance[] = [];
  for (const [date, attendanceMap] of dailyAttendanceMap.entries()) {
    for (const [employeeId, record] of attendanceMap.entries()) {
      const employee = employees.find(e => e.id === employeeId);
      if (employee) {
        dailyAttendance.push({
          date: date,
          employeeId,
          employeeName: employee.name,
          clockIn: record.checkIn,
          clockOut: record.checkOut || 0,
          hoursWorked: record.hoursWorked,
          isLate: false
        });
      }
    }
  }
  
  const monthlyItemSales: MonthlyItemSales[] = [];
  for (const [month, itemMap] of monthlyItemMap.entries()) {
    for (const [itemId, stats] of itemMap.entries()) {
      monthlyItemSales.push({
        yearMonth: month,
        itemId,
        sku: stats.sku,
        itemName: stats.itemName,
        totalQuantity: stats.quantity,
        totalRevenue: stats.revenue,
        transactionCount: stats.count
      });
    }
  }
  
  const monthlyPayments: MonthlyPaymentSales[] = [];
  const monthlySummary: MonthlySalesSummary[] = [];
  
  for (const [month, paymentMap] of monthlyPaymentMap.entries()) {
    let monthTotal = 0;
    let cashAmount = 0;
    let qrisStaticAmount = 0;
    let qrisDynamicAmount = 0;
    let voucherAmount = 0;

    for (const [method, total] of paymentMap.entries()) {
      monthlyPayments.push({
        yearMonth: month,
        method: method as any,
        totalAmount: total,
        transactionCount: 0
      });
      monthTotal += total;

      if (method === "cash") cashAmount = total;
      else if (method === "qris-static") qrisStaticAmount = total;
      else if (method === "qris-dynamic") qrisDynamicAmount = total;
      else if (method === "voucher") voucherAmount = total;
    }
    
    monthlySummary.push({
      yearMonth: month,
      totalRevenue: monthTotal,
      totalReceipts: Math.floor(monthTotal / pattern.avgTransactionValue),
      cashAmount,
      qrisStaticAmount,
      qrisDynamicAmount,
      voucherAmount
    });
  }
  
  const monthlyAttendanceSummaries: MonthlyAttendanceSummary[] = [];
  for (const [month, attendanceMap] of monthlyAttendanceMap.entries()) {
    for (const [employeeId, stats] of attendanceMap.entries()) {
      const employee = employees.find(e => e.id === employeeId);
      if (employee) {
        monthlyAttendanceSummaries.push({
          yearMonth: month,
          employeeId,
          employeeName: employee.name,
          totalHours: stats.totalHours,
          daysWorked: stats.daysWorked,
          lateCount: Math.floor(Math.random() * 3)
        });
      }
    }
  }
  
  return {
    transactions,
    dailySummaries,
    dailyItemSales,
    dailyAttendance,
    monthlyItemSales,
    monthlySummaries: {
      payments: monthlyPayments,
      summary: monthlySummary,
    },
    monthlyAttendanceSummaries
  };
}

/**
 * Get default settings for a new store
 */
export function getDefaultSettings(): Settings {
  return {
    key: "settings",
    mode: "retail",
    businessName: "Demo Store",
    storeAddress: "",
    storePhone: "",
    taxRate: 0,
    currency: "IDR",
    language: "id",
    theme: "light",
    printerEnabled: false,
    printerName: "",
    backupEnabled: true,
    lowStockThreshold: 10,
    showTax: false,
    printReceipt: true,
    autoBackup: false
  };
}

/**
 * Generate complete sample store data package
 * This is the main function that generates all sample data for a new store
 * 
 * @param businessType - Type of business to generate data for
 * @returns Complete sample data package with items, employees, transactions, and settings
 */
export function generateSampleStoreData(businessType: BusinessType = "convenience-store"): {
  items: Item[];
  employees: Employee[];
  transactions: Transaction[];
  dailyPaymentSales: DailyPaymentSales[];
  dailyItemSales: DailyItemSales[];
  dailyAttendance: DailyAttendance[];
  monthlyItemSales: MonthlyItemSales[];
  monthlyPaymentSales: MonthlyPaymentSales[];
  monthlySalesSummaries: MonthlySalesSummary[];
  monthlyAttendanceSummaries: MonthlyAttendanceSummary[];
  settings: Settings;
} {
  // Generate items based on business type
  const items = generateSampleItems(businessType);
  
  // Generate employees
  const employees = generateSampleEmployees();
  
  // Generate transactions and all summaries
  const transactionData = generateSampleTransactions(items, employees, businessType);
  
  return {
    items,
    employees,
    transactions: transactionData.transactions,
    dailyPaymentSales: transactionData.dailySummaries,
    dailyItemSales: transactionData.dailyItemSales,
    dailyAttendance: transactionData.dailyAttendance,
    monthlyItemSales: transactionData.monthlyItemSales,
    monthlyPaymentSales: transactionData.monthlySummaries.payments,
    monthlySalesSummaries: transactionData.monthlySummaries.summary,
    monthlyAttendanceSummaries: transactionData.monthlyAttendanceSummaries,
    settings: getDefaultSettings()
  };
}