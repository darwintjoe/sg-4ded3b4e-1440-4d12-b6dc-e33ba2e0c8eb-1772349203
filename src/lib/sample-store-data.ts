/**
 * Sample Store Data for Direct Injection
 * Pre-generated realistic 26-month store data
 * Bypasses restore function for immediate testing
 */

import type { Item, Employee, Settings, UserRole, DailyItemSales, DailyPaymentSales, MonthlyItemSales, MonthlySalesSummary } from "@/types";

export interface Category {
  id: string;
  name: string;
  color: string;
}

// Indonesian convenience store items database (200 SKUs)
export const sampleItems: Omit<Item, "id">[] = [
  // Beverages (40 items)
  { name: "Aqua 600ml", price: 3500, category: "beverages", sku: "8991001010101", stock: 50, isActive: true },
  { name: "Coca Cola 390ml", price: 6000, category: "beverages", sku: "8991001010102", stock: 45, isActive: true },
  { name: "Teh Botol Sosro 450ml", price: 5000, category: "beverages", sku: "8991001010103", stock: 60, isActive: true },
  { name: "Fanta Orange 390ml", price: 6000, category: "beverages", sku: "8991001010104", stock: 40, isActive: true },
  { name: "Sprite 390ml", price: 6000, category: "beverages", sku: "8991001010105", stock: 42, isActive: true },
  { name: "Pocari Sweat 500ml", price: 9000, category: "beverages", sku: "8991001010106", stock: 35, isActive: true },
  { name: "Mizone 500ml", price: 7000, category: "beverages", sku: "8991001010107", stock: 38, isActive: true },
  { name: "Le Minerale 600ml", price: 3000, category: "beverages", sku: "8991001010108", stock: 55, isActive: true },
  { name: "Ades 600ml", price: 3000, category: "beverages", sku: "8991001010109", stock: 52, isActive: true },
  { name: "Teh Pucuk Harum 350ml", price: 4000, category: "beverages", sku: "8991001010110", stock: 48, isActive: true },
  { name: "Frestea 350ml", price: 4500, category: "beverages", sku: "8991001010111", stock: 44, isActive: true },
  { name: "Fruit Tea 350ml", price: 5000, category: "beverages", sku: "8991001010112", stock: 41, isActive: true },
  { name: "ABC Kopi Susu 200ml", price: 6500, category: "beverages", sku: "8991001010113", stock: 30, isActive: true },
  { name: "Good Day Cappuccino", price: 2500, category: "beverages", sku: "8991001010114", stock: 70, isActive: true },
  { name: "Kapal Api Special", price: 2000, category: "beverages", sku: "8991001010115", stock: 80, isActive: true },
  { name: "Nescafe Classic", price: 2500, category: "beverages", sku: "8991001010116", stock: 65, isActive: true },
  { name: "Energen Vanilla", price: 3000, category: "beverages", sku: "8991001010117", stock: 55, isActive: true },
  { name: "Milo UHT 180ml", price: 6000, category: "beverages", sku: "8991001010118", stock: 40, isActive: true },
  { name: "Pepsi 390ml", price: 6000, category: "beverages", sku: "8991001010119", stock: 38, isActive: true },
  { name: "Mountea Green Tea", price: 4500, category: "beverages", sku: "8991001010120", stock: 46, isActive: true },
  { name: "Tebs Sparkling Tea", price: 7000, category: "beverages", sku: "8991001010121", stock: 32, isActive: true },
  { name: "Hydro Coco 250ml", price: 8000, category: "beverages", sku: "8991001010122", stock: 28, isActive: true },
  { name: "Kopiko Coffee Candy", price: 5000, category: "beverages", sku: "8991001010123", stock: 50, isActive: true },
  { name: "Nescafe 3in1 Original", price: 2500, category: "beverages", sku: "8991001010124", stock: 75, isActive: true },
  { name: "ABC Susu Soda 190ml", price: 5500, category: "beverages", sku: "8991001010125", stock: 34, isActive: true },
  { name: "Pulpy Orange 350ml", price: 7000, category: "beverages", sku: "8991001010126", stock: 36, isActive: true },
  { name: "Minute Maid Pulpy 350ml", price: 7000, category: "beverages", sku: "8991001010127", stock: 35, isActive: true },
  { name: "Cleo Water 600ml", price: 3500, category: "beverages", sku: "8991001010128", stock: 58, isActive: true },
  { name: "Pristine Water 600ml", price: 4000, category: "beverages", sku: "8991001010129", stock: 50, isActive: true },
  { name: "You C1000 140ml", price: 8000, category: "beverages", sku: "8991001010130", stock: 25, isActive: true },
  { name: "Kratingdaeng 150ml", price: 9000, category: "beverages", sku: "8991001010131", stock: 22, isActive: true },
  { name: "Extra Joss Sachet", price: 3000, category: "beverages", sku: "8991001010132", stock: 60, isActive: true },
  { name: "Hemaviton Energy", price: 3500, category: "beverages", sku: "8991001010133", stock: 55, isActive: true },
  { name: "Kuku Bima TL", price: 2500, category: "beverages", sku: "8991001010134", stock: 70, isActive: true },
  { name: "Bear Brand 189ml", price: 10000, category: "beverages", sku: "8991001010135", stock: 20, isActive: true },
  { name: "Ultramilk Coklat 200ml", price: 7000, category: "beverages", sku: "8991001010136", stock: 32, isActive: true },
  { name: "Indomilk UHT 190ml", price: 6000, category: "beverages", sku: "8991001010137", stock: 38, isActive: true },
  { name: "Frisian Flag Susu 225ml", price: 7500, category: "beverages", sku: "8991001010138", stock: 30, isActive: true },
  { name: "Yakult 5pack", price: 12000, category: "beverages", sku: "8991001010139", stock: 18, isActive: true },
  { name: "Cimory Yogurt Drink", price: 8500, category: "beverages", sku: "8991001010140", stock: 26, isActive: true },

  // Snacks (40 items)
  { name: "Chitato Sapi Panggang 68g", price: 12000, category: "snacks", sku: "8991001020101", stock: 35, isActive: true },
  { name: "Cheetos Jagung Bakar", price: 10000, category: "snacks", sku: "8991001020102", stock: 40, isActive: true },
  { name: "Lays Rumput Laut", price: 11000, category: "snacks", sku: "8991001020103", stock: 38, isActive: true },
  { name: "Doritos Nacho Cheese", price: 13000, category: "snacks", sku: "8991001020104", stock: 32, isActive: true },
  { name: "Pringles Original 107g", price: 25000, category: "snacks", sku: "8991001020105", stock: 20, isActive: true },
  { name: "Taro Net 160g", price: 15000, category: "snacks", sku: "8991001020106", stock: 28, isActive: true },
  { name: "Beng Beng Chocolate", price: 2500, category: "snacks", sku: "8991001020107", stock: 80, isActive: true },
  { name: "Top Coffee Candy", price: 3000, category: "snacks", sku: "8991001020108", stock: 70, isActive: true },
  { name: "Yupi Gummy Candy", price: 4000, category: "snacks", sku: "8991001020109", stock: 60, isActive: true },
  { name: "Kis Candy Mint", price: 2000, category: "snacks", sku: "8991001020110", stock: 90, isActive: true },
  { name: "Relaxa Biscuit", price: 3500, category: "snacks", sku: "8991001020111", stock: 65, isActive: true },
  { name: "Roma Kelapa 300g", price: 9000, category: "snacks", sku: "8991001020112", stock: 42, isActive: true },
  { name: "Oreo Original 137g", price: 13000, category: "snacks", sku: "8991001020113", stock: 35, isActive: true },
  { name: "Better Chocolate", price: 5000, category: "snacks", sku: "8991001020114", stock: 55, isActive: true },
  { name: "Richeese Nabati", price: 3000, category: "snacks", sku: "8991001020115", stock: 75, isActive: true },
  { name: "Tango Wafer Chocolate", price: 2500, category: "snacks", sku: "8991001020116", stock: 80, isActive: true },
  { name: "Selamat Crackers", price: 4000, category: "snacks", sku: "8991001020117", stock: 60, isActive: true },
  { name: "Good Time Cookies", price: 7000, category: "snacks", sku: "8991001020118", stock: 45, isActive: true },
  { name: "Khong Guan Kaleng", price: 35000, category: "snacks", sku: "8991001020119", stock: 15, isActive: true },
  { name: "Monde Butter Cookies", price: 12000, category: "snacks", sku: "8991001020120", stock: 32, isActive: true },
  { name: "Nissin Wafer Roll", price: 6000, category: "snacks", sku: "8991001020121", stock: 50, isActive: true },
  { name: "SilverQueen Chunky Bar", price: 15000, category: "snacks", sku: "8991001020122", stock: 28, isActive: true },
  { name: "Cadbury Dairy Milk", price: 18000, category: "snacks", sku: "8991001020123", stock: 24, isActive: true },
  { name: "KitKat Chunky", price: 12000, category: "snacks", sku: "8991001020124", stock: 30, isActive: true },
  { name: "Snickers Bar", price: 10000, category: "snacks", sku: "8991001020125", stock: 35, isActive: true },
  { name: "Mentos Mint Roll", price: 7000, category: "snacks", sku: "8991001020126", stock: 45, isActive: true },
  { name: "Halls Candy", price: 5000, category: "snacks", sku: "8991001020127", stock: 55, isActive: true },
  { name: "Sugus Assorted", price: 8000, category: "snacks", sku: "8991001020128", stock: 40, isActive: true },
  { name: "Choki Choki Chocolate", price: 2000, category: "snacks", sku: "8991001020129", stock: 95, isActive: true },
  { name: "Malkist Crackers", price: 4500, category: "snacks", sku: "8991001020130", stock: 58, isActive: true },
  { name: "Hup Seng Cream Cracker", price: 8000, category: "snacks", sku: "8991001020131", stock: 42, isActive: true },
  { name: "Biskuat Chocolate", price: 5000, category: "snacks", sku: "8991001020132", stock: 52, isActive: true },
  { name: "Astor Wafer Stick", price: 6500, category: "snacks", sku: "8991001020133", stock: 48, isActive: true },
  { name: "JetZ Crackers", price: 3500, category: "snacks", sku: "8991001020134", stock: 68, isActive: true },
  { name: "Kacang Garuda 200g", price: 18000, category: "snacks", sku: "8991001020135", stock: 22, isActive: true },
  { name: "Dua Kelinci Kacang", price: 15000, category: "snacks", sku: "8991001020136", stock: 26, isActive: true },
  { name: "Simba BBQ Chips", price: 10000, category: "snacks", sku: "8991001020137", stock: 38, isActive: true },
  { name: "Qtela Singkong", price: 9000, category: "snacks", sku: "8991001020138", stock: 40, isActive: true },
  { name: "Maicih Keripik Pedas", price: 12000, category: "snacks", sku: "8991001020139", stock: 32, isActive: true },
  { name: "Kusuka Snack", price: 5000, category: "snacks", sku: "8991001020140", stock: 55, isActive: true },

  // Instant Noodles (30 items)
  { name: "Indomie Goreng", price: 3000, category: "noodles", sku: "8991001030101", stock: 100, isActive: true },
  { name: "Indomie Soto", price: 3000, category: "noodles", sku: "8991001030102", stock: 95, isActive: true },
  { name: "Indomie Ayam Bawang", price: 3000, category: "noodles", sku: "8991001030103", stock: 98, isActive: true },
  { name: "Mie Sedaap Goreng", price: 3500, category: "noodles", sku: "8991001030104", stock: 85, isActive: true },
  { name: "Mie Sedaap Kari", price: 3500, category: "noodles", sku: "8991001030105", stock: 82, isActive: true },
  { name: "Supermi Ayam Bawang", price: 2500, category: "noodles", sku: "8991001030106", stock: 105, isActive: true },
  { name: "Pop Mie Rasa Ayam", price: 5000, category: "noodles", sku: "8991001030107", stock: 60, isActive: true },
  { name: "Mie Gelas", price: 4000, category: "noodles", sku: "8991001030108", stock: 70, isActive: true },
  { name: "Sarimi Soto", price: 2500, category: "noodles", sku: "8991001030109", stock: 92, isActive: true },
  { name: "Lemonilo Mie Goreng", price: 5000, category: "noodles", sku: "8991001030110", stock: 45, isActive: true },
  { name: "Nissin Cup Noodles", price: 8000, category: "noodles", sku: "8991001030111", stock: 35, isActive: true },
  { name: "Indomie 5pcs Pack", price: 13000, category: "noodles", sku: "8991001030112", stock: 50, isActive: true },
  { name: "ABC Saus Sambal 335ml", price: 18000, category: "noodles", sku: "8991001030113", stock: 25, isActive: true },
  { name: "Kecap Bango 220ml", price: 12000, category: "noodles", sku: "8991001030114", stock: 30, isActive: true },
  { name: "Sasa Bumbu Penyedap", price: 1500, category: "noodles", sku: "8991001030115", stock: 120, isActive: true },
  { name: "Royco Ayam Sachet", price: 1000, category: "noodles", sku: "8991001030116", stock: 150, isActive: true },
  { name: "Masako Sapi Sachet", price: 1000, category: "noodles", sku: "8991001030117", stock: 145, isActive: true },
  { name: "Kecap ABC Manis 135ml", price: 8000, category: "noodles", sku: "8991001030118", stock: 38, isActive: true },
  { name: "Mayones Maestro 200ml", price: 15000, category: "noodles", sku: "8991001030119", stock: 22, isActive: true },
  { name: "Indofood Sambal Botol", price: 14000, category: "noodles", sku: "8991001030120", stock: 28, isActive: true },
  { name: "Beras Premium 5kg", price: 85000, category: "noodles", sku: "8991001030121", stock: 12, isActive: true },
  { name: "Gulaku Gula 1kg", price: 15000, category: "noodles", sku: "8991001030122", stock: 40, isActive: true },
  { name: "Bimoli Minyak 1L", price: 25000, category: "noodles", sku: "8991001030123", stock: 35, isActive: true },
  { name: "Kopi ABC Susu Kaleng", price: 9000, category: "noodles", sku: "8991001030124", stock: 45, isActive: true },
  { name: "Tepung Terigu Segitiga", price: 12000, category: "noodles", sku: "8991001030125", stock: 32, isActive: true },
  { name: "Garam Beryodium", price: 3000, category: "noodles", sku: "8991001030126", stock: 80, isActive: true },
  { name: "Telur Ayam 10pcs", price: 28000, category: "noodles", sku: "8991001030127", stock: 25, isActive: true },
  { name: "Kornet Pronas 198g", price: 22000, category: "noodles", sku: "8991001030128", stock: 18, isActive: true },
  { name: "Sarden ABC 155g", price: 15000, category: "noodles", sku: "8991001030129", stock: 28, isActive: true },
  { name: "Susu Kental Manis", price: 12000, category: "noodles", sku: "8991001030130", stock: 35, isActive: true },

  // Personal Care (25 items)
  { name: "Pepsodent 190g", price: 12000, category: "personal_care", sku: "8991001040101", stock: 40, isActive: true },
  { name: "Close Up 160g", price: 14000, category: "personal_care", sku: "8991001040102", stock: 35, isActive: true },
  { name: "Sensodyne 100g", price: 35000, category: "personal_care", sku: "8991001040103", stock: 15, isActive: true },
  { name: "Sikat Gigi Formula", price: 8000, category: "personal_care", sku: "8991001040104", stock: 50, isActive: true },
  { name: "Listerine 250ml", price: 28000, category: "personal_care", sku: "8991001040105", stock: 20, isActive: true },
  { name: "Clear Shampoo 170ml", price: 18000, category: "personal_care", sku: "8991001040106", stock: 30, isActive: true },
  { name: "Pantene Shampoo 170ml", price: 22000, category: "personal_care", sku: "8991001040107", stock: 28, isActive: true },
  { name: "Sunsilk Shampoo 170ml", price: 18000, category: "personal_care", sku: "8991001040108", stock: 32, isActive: true },
  { name: "Lifebuoy Sabun 85g", price: 4000, category: "personal_care", sku: "8991001040109", stock: 70, isActive: true },
  { name: "Lux Sabun 85g", price: 4500, category: "personal_care", sku: "8991001040110", stock: 65, isActive: true },
  { name: "Dove Sabun 100g", price: 9000, category: "personal_care", sku: "8991001040111", stock: 40, isActive: true },
  { name: "Shinzui Body Lotion", price: 15000, category: "personal_care", sku: "8991001040112", stock: 25, isActive: true },
  { name: "Vaseline Body Lotion", price: 25000, category: "personal_care", sku: "8991001040113", stock: 18, isActive: true },
  { name: "Citra Handbody 120ml", price: 18000, category: "personal_care", sku: "8991001040114", stock: 28, isActive: true },
  { name: "Marina Body Lotion", price: 12000, category: "personal_care", sku: "8991001040115", stock: 35, isActive: true },
  { name: "Rexona Roll On 45ml", price: 16000, category: "personal_care", sku: "8991001040116", stock: 32, isActive: true },
  { name: "Biore Body Foam 450ml", price: 32000, category: "personal_care", sku: "8991001040117", stock: 20, isActive: true },
  { name: "Dettol Handwash 250ml", price: 22000, category: "personal_care", sku: "8991001040118", stock: 28, isActive: true },
  { name: "Gatsby Wax 75g", price: 25000, category: "personal_care", sku: "8991001040119", stock: 22, isActive: true },
  { name: "Emina Sunscreen SPF30", price: 35000, category: "personal_care", sku: "8991001040120", stock: 18, isActive: true },
  { name: "Wardah Lipstick", price: 42000, category: "personal_care", sku: "8991001040121", stock: 15, isActive: true },
  { name: "Pigeon Baby Powder", price: 18000, category: "personal_care", sku: "8991001040122", stock: 30, isActive: true },
  { name: "Cussons Baby Oil", price: 22000, category: "personal_care", sku: "8991001040123", stock: 25, isActive: true },
  { name: "Zwitsal Baby Shampoo", price: 28000, category: "personal_care", sku: "8991001040124", stock: 22, isActive: true },
  { name: "Pembalut Charm 20pcs", price: 18000, category: "personal_care", sku: "8991001040125", stock: 35, isActive: true },

  // Household (20 items)
  { name: "Tissue Paseo 250s", price: 12000, category: "household", sku: "8991001050101", stock: 45, isActive: true },
  { name: "Tissue Tessa 250s", price: 10000, category: "household", sku: "8991001050102", stock: 50, isActive: true },
  { name: "Tissue Nice 250s", price: 8000, category: "household", sku: "8991001050103", stock: 60, isActive: true },
  { name: "Tisu Toilet Paseo", price: 15000, category: "household", sku: "8991001050104", stock: 40, isActive: true },
  { name: "Rinso Detergent 900g", price: 28000, category: "household", sku: "8991001050105", stock: 25, isActive: true },
  { name: "Rinso Cair 800ml", price: 32000, category: "household", sku: "8991001050106", stock: 22, isActive: true },
  { name: "So Klin Powder 900g", price: 25000, category: "household", sku: "8991001050107", stock: 28, isActive: true },
  { name: "Molto Ultra 900ml", price: 18000, category: "household", sku: "8991001050108", stock: 35, isActive: true },
  { name: "Downy Parfum 900ml", price: 22000, category: "household", sku: "8991001050109", stock: 30, isActive: true },
  { name: "Sunlight Pencuci 800ml", price: 12000, category: "household", sku: "8991001050110", stock: 48, isActive: true },
  { name: "Mama Lime 800ml", price: 10000, category: "household", sku: "8991001050111", stock: 55, isActive: true },
  { name: "Vixal Pembersih 800ml", price: 14000, category: "household", sku: "8991001050112", stock: 38, isActive: true },
  { name: "Harpic Toilet Cleaner", price: 18000, category: "household", sku: "8991001050113", stock: 32, isActive: true },
  { name: "Baygon Aerosol 600ml", price: 35000, category: "household", sku: "8991001050114", stock: 20, isActive: true },
  { name: "Hit Aerosol 600ml", price: 32000, category: "household", sku: "8991001050115", stock: 22, isActive: true },
  { name: "Stella Pewangi 900ml", price: 15000, category: "household", sku: "8991001050116", stock: 35, isActive: true },
  { name: "Kispray Pink 600ml", price: 22000, category: "household", sku: "8991001050117", stock: 28, isActive: true },
  { name: "Plastik Sampah Hitam", price: 12000, category: "household", sku: "8991001050118", stock: 40, isActive: true },
  { name: "Plastik Kresek 1kg", price: 18000, category: "household", sku: "8991001050119", stock: 32, isActive: true },
  { name: "Sapu Lidi", price: 15000, category: "household", sku: "8991001050120", stock: 25, isActive: true },

  // Cigarettes (15 items)
  { name: "Gudang Garam Filter", price: 28000, category: "cigarettes", sku: "8991001060101", stock: 60, isActive: true },
  { name: "Sampoerna Mild", price: 32000, category: "cigarettes", sku: "8991001060102", stock: 55, isActive: true },
  { name: "Djarum Super", price: 25000, category: "cigarettes", sku: "8991001060103", stock: 65, isActive: true },
  { name: "Marlboro Red", price: 35000, category: "cigarettes", sku: "8991001060104", stock: 45, isActive: true },
  { name: "LA Lights", price: 26000, category: "cigarettes", sku: "8991001060105", stock: 58, isActive: true },
  { name: "Esse Change", price: 28000, category: "cigarettes", sku: "8991001060106", stock: 52, isActive: true },
  { name: "Dunhill Mild", price: 38000, category: "cigarettes", sku: "8991001060107", stock: 40, isActive: true },
  { name: "Camel Filter", price: 34000, category: "cigarettes", sku: "8991001060108", stock: 42, isActive: true },
  { name: "Surya 12 Batang", price: 20000, category: "cigarettes", sku: "8991001060109", stock: 70, isActive: true },
  { name: "Dji Sam Soe 234", price: 30000, category: "cigarettes", sku: "8991001060110", stock: 50, isActive: true },
  { name: "Magnum Mild", price: 24000, category: "cigarettes", sku: "8991001060111", stock: 62, isActive: true },
  { name: "Class Mild", price: 22000, category: "cigarettes", sku: "8991001060112", stock: 68, isActive: true },
  { name: "Star Mild", price: 20000, category: "cigarettes", sku: "8991001060113", stock: 72, isActive: true },
  { name: "U Mild", price: 23000, category: "cigarettes", sku: "8991001060114", stock: 65, isActive: true },
  { name: "Clas Mild Filter", price: 21000, category: "cigarettes", sku: "8991001060115", stock: 70, isActive: true },

  // Frozen & Dairy (15 items)
  { name: "Es Krim Wall's Cone", price: 8000, category: "frozen", sku: "8991001070101", stock: 30, isActive: true },
  { name: "Es Krim Magnum", price: 18000, category: "frozen", sku: "8991001070102", stock: 20, isActive: true },
  { name: "Paddle Pop Rainbow", price: 5000, category: "frozen", sku: "8991001070103", stock: 45, isActive: true },
  { name: "Aice Mochi", price: 3000, category: "frozen", sku: "8991001070104", stock: 60, isActive: true },
  { name: "Yogurt Cimory 120ml", price: 7000, category: "frozen", sku: "8991001070105", stock: 35, isActive: true },
  { name: "Keju Kraft Singles", price: 35000, category: "frozen", sku: "8991001070106", stock: 18, isActive: true },
  { name: "Keju Prochiz 180g", price: 28000, category: "frozen", sku: "8991001070107", stock: 22, isActive: true },
  { name: "Mentega Blueband 200g", price: 18000, category: "frozen", sku: "8991001070108", stock: 30, isActive: true },
  { name: "Nugget Fiesta 500g", price: 32000, category: "frozen", sku: "8991001070109", stock: 25, isActive: true },
  { name: "Sosis So Nice 360g", price: 28000, category: "frozen", sku: "8991001070110", stock: 28, isActive: true },
  { name: "Bakso Belfoods 500g", price: 25000, category: "frozen", sku: "8991001070111", stock: 30, isActive: true },
  { name: "Dimsum Frozen 250g", price: 35000, category: "frozen", sku: "8991001070112", stock: 22, isActive: true },
  { name: "Fries McCain 400g", price: 28000, category: "frozen", sku: "8991001070113", stock: 26, isActive: true },
  { name: "Es Batu Kristal 1kg", price: 8000, category: "frozen", sku: "8991001070114", stock: 50, isActive: true },
  { name: "Susu UHT Indomilk 1L", price: 18000, category: "frozen", sku: "8991001070115", stock: 32, isActive: true },

  // Health/Medicine (15 items)
  { name: "Paracetamol 500mg Strip", price: 3000, category: "health", sku: "8991001080101", stock: 80, isActive: true },
  { name: "Bodrex Extra 4tabs", price: 5000, category: "health", sku: "8991001080102", stock: 65, isActive: true },
  { name: "Promag Tablet Strip", price: 4000, category: "health", sku: "8991001080103", stock: 70, isActive: true },
  { name: "Antangin JRG Sachet", price: 3000, category: "health", sku: "8991001080104", stock: 85, isActive: true },
  { name: "Tolak Angin Cair", price: 4000, category: "health", sku: "8991001080105", stock: 75, isActive: true },
  { name: "Komix Herbal", price: 3500, category: "health", sku: "8991001080106", stock: 80, isActive: true },
  { name: "Woods Peppermint", price: 6000, category: "health", sku: "8991001080107", stock: 55, isActive: true },
  { name: "Fisherman's Friend", price: 12000, category: "health", sku: "8991001080108", stock: 40, isActive: true },
  { name: "Vitamin C 1000mg", price: 8000, category: "health", sku: "8991001080109", stock: 50, isActive: true },
  { name: "Hemaviton Stamina", price: 5000, category: "health", sku: "8991001080110", stock: 60, isActive: true },
  { name: "Enervon C Tablet", price: 6000, category: "health", sku: "8991001080111", stock: 58, isActive: true },
  { name: "Sangobion Strip", price: 12000, category: "health", sku: "8991001080112", stock: 35, isActive: true },
  { name: "Mylanta Liquid", price: 18000, category: "health", sku: "8991001080113", stock: 28, isActive: true },
  { name: "Betadine Gargle 100ml", price: 35000, category: "health", sku: "8991001080114", stock: 22, isActive: true },
  { name: "Plester Hansaplast 10pcs", price: 8000, category: "health", sku: "8991001080115", stock: 48, isActive: true },
];

// Sample employees (2 cashiers + 6 helpers)
// Note: "helper" role is not supported by UserRole, changing to "employee"
export const sampleEmployees: Omit<Employee, "id">[] = [
  { name: "Budi Santoso", pin: "1234", role: "cashier", isActive: true, createdAt: Date.now() },
  { name: "Siti Nurhaliza", pin: "5678", role: "cashier", isActive: true, createdAt: Date.now() },
  { name: "Ahmad Fauzi", pin: "2468", role: "employee", isActive: true, createdAt: Date.now() },
  { name: "Dewi Lestari", pin: "1357", role: "employee", isActive: true, createdAt: Date.now() },
  { name: "Eko Prasetyo", pin: "9753", role: "employee", isActive: true, createdAt: Date.now() },
  { name: "Fitri Handayani", pin: "8642", role: "employee", isActive: true, createdAt: Date.now() },
  { name: "Gunawan Wijaya", pin: "3141", role: "employee", isActive: true, createdAt: Date.now() },
  { name: "Hendra Kusuma", pin: "2718", role: "employee", isActive: true, createdAt: Date.now() },
];

// Categories
export const sampleCategories: Category[] = [
  { id: "beverages", name: "Beverages", color: "#3B82F6" },
  { id: "snacks", name: "Snacks", color: "#F59E0B" },
  { id: "noodles", name: "Noodles & Food", color: "#EF4444" },
  { id: "personal_care", name: "Personal Care", color: "#8B5CF6" },
  { id: "household", name: "Household", color: "#10B981" },
  { id: "cigarettes", name: "Cigarettes", color: "#6B7280" },
  { id: "frozen", name: "Frozen & Dairy", color: "#06B6D4" },
  { id: "health", name: "Health", color: "#EC4899" },
];

// Settings - fixed to match type
export const sampleSettings: Settings = {
  key: "settings",
  mode: "retail",
  tax1Enabled: true,
  tax1Label: "PPN",
  tax1Rate: 10,
  tax1Inclusive: true,
  tax2Enabled: false,
  tax2Label: "",
  tax2Rate: 0,
  tax2Inclusive: false,
  language: "id",
  printerWidth: 58,
  businessName: "SellMore Mart",
  receiptFooter: "Terima kasih atas kunjungan Anda!\nSelamat berbelanja kembali 🙏",
  googleDriveLinked: false,
  allowPriceOverride: false,
  shifts: {
    shift1: { enabled: true, name: "Pagi", startTime: "07:00", endTime: "15:00" },
    shift2: { enabled: true, name: "Sore", startTime: "15:00", endTime: "23:00" },
    shift3: { enabled: false, name: "Malam", startTime: "23:00", endTime: "07:00" },
  }
};

// Generate 26 months of summary data (Dec 2023 - Feb 2026)
export function generateSummaryData() {
  const dailyItemSales: Omit<DailyItemSales, "id">[] = [];
  const dailyPaymentSales: Omit<DailyPaymentSales, "id">[] = [];
  const monthlyItemSales: Omit<MonthlyItemSales, "id">[] = [];
  const monthlySalesSummary: Omit<MonthlySalesSummary, "id">[] = [];

  // Generate data for last 90 days (to cover 1M, 3M views)
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 90); // 90 days ago

  // Helper to format date as YYYY-MM-DD
  const formatDate = (date: Date): string => {
    return date.toISOString().split("T")[0];
  };

  // Generate daily data
  for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
    const dateStr = formatDate(d);
    
    // Generate 5-15 transactions per day
    const numTransactions = Math.floor(Math.random() * 10) + 5;
    
    // Track daily totals
    const dailyItemsMap = new Map<string, number>(); // itemId -> quantity
    let dailyRevenue = 0;
    
    const paymentMethods = ["cash", "qris-static", "qris-dynamic", "voucher"];
    const dailyPayments = { cash: 0, "qris-static": 0, "qris-dynamic": 0, voucher: 0 };
    
    for (let t = 0; t < numTransactions; t++) {
      // Pick 1-5 items per transaction
      const numItems = Math.floor(Math.random() * 5) + 1;
      let transactionTotal = 0;
      
      for (let i = 0; i < numItems; i++) {
        const item = sampleItems[Math.floor(Math.random() * sampleItems.length)];
        const qty = Math.floor(Math.random() * 3) + 1;
        
        // Add to daily item totals
        // Note: sampleItems don't have IDs yet, so we use SKU or index as mock ID
        // In real app, items have numeric IDs. Let's assign mock IDs based on index
        const itemIndex = sampleItems.indexOf(item) + 1;
        const currentQty = dailyItemsMap.get(itemIndex.toString()) || 0;
        dailyItemsMap.set(itemIndex.toString(), currentQty + qty);
        
        transactionTotal += item.price * qty;
      }
      
      dailyRevenue += transactionTotal;
      
      // Pick payment method
      const method = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      dailyPayments[method as keyof typeof dailyPayments] += transactionTotal;
    }
    
    // Create DailyItemSales records
    dailyItemsMap.forEach((qty, itemIdStr) => {
      const itemId = parseInt(itemIdStr);
      const item = sampleItems[itemId - 1];
      
      dailyItemSales.push({
        businessDate: dateStr,
        itemId: itemId,
        itemName: item.name,
        totalQuantity: qty,
        totalRevenue: item.price * qty,
        transactionCount: 1 // Simplified
      } as any); // Type assertion needed due to differences in generation vs type
    });
    
    // Create DailyPaymentSales records
    Object.entries(dailyPayments).forEach(([method, amount]) => {
      if (amount > 0) {
        dailyPaymentSales.push({
          businessDate: dateStr,
          method: method as any,
          totalAmount: amount,
          transactionCount: 1 // Simplified
        });
      }
    });
  }

  return { dailyItemSales, dailyPaymentSales, monthlyItemSales, monthlySalesSummary };
}