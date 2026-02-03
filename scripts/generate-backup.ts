/**
 * Generate Realistic Backup Data for SellMore Mart
 * 26 months of operation data for UAT testing
 */

import pako from "pako";

interface BackupMetadata {
  version: string;
  timestamp: string;
  deviceId: string;
  dataSize: number;
  checksum: string;
  status: "verified";
  itemCount: number;
  employeeCount: number;
}

interface Item {
  id: string;
  name: string;
  nameId: string;
  nameZh: string;
  price: number;
  categoryId: string;
  barcode: string;
  stock: number;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Employee {
  id: string;
  name: string;
  pin: string;
  role: "cashier" | "helper";
  isActive: boolean;
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  nameId: string;
  nameZh: string;
  color: string;
}

interface Settings {
  id: number;
  storeName: string;
  currency: string;
  tax1Name: string;
  tax1Rate: number;
  tax1Inclusive: boolean;
  tax2Name: string;
  tax2Rate: number;
  tax2Inclusive: boolean;
  language: string;
  receiptFooter: string;
  enableBluetooth: boolean;
  printerName: string;
}

// Generate realistic Indonesian names
const generateName = (role: "cashier" | "helper", index: number): string => {
  const cashierNames = ["Budi Santoso", "Siti Nurhaliza"];
  const helperNames = [
    "Ahmad Fauzi",
    "Dewi Lestari",
    "Eko Prasetyo",
    "Fitri Handayani",
    "Gunawan Wijaya",
    "Hendra Kusuma"
  ];
  return role === "cashier" ? cashierNames[index] : helperNames[index];
};

// Generate random PIN
const generatePin = (): string => {
  const length = Math.random() > 0.5 ? 4 : 6;
  return Math.floor(Math.random() * (10 ** length)).toString().padStart(length, "0");
};

// Indonesian convenience store items database
const storeItems = [
  // Beverages (40 items)
  { name: "Aqua 600ml", nameId: "Aqua 600ml", nameZh: "Aqua矿泉水600ml", price: 3500, category: "beverages", barcode: "8991001010101" },
  { name: "Coca Cola 390ml", nameId: "Coca Cola 390ml", nameZh: "可口可乐390ml", price: 6000, category: "beverages", barcode: "8991001010102" },
  { name: "Teh Botol Sosro 450ml", nameId: "Teh Botol Sosro 450ml", nameZh: "Sosro茶450ml", price: 5000, category: "beverages", barcode: "8991001010103" },
  { name: "Fanta Orange 390ml", nameId: "Fanta Orange 390ml", nameZh: "芬达橙汁390ml", price: 6000, category: "beverages", barcode: "8991001010104" },
  { name: "Sprite 390ml", nameId: "Sprite 390ml", nameZh: "雪碧390ml", price: 6000, category: "beverages", barcode: "8991001010105" },
  { name: "Pocari Sweat 500ml", nameId: "Pocari Sweat 500ml", nameZh: "宝矿力500ml", price: 9000, category: "beverages", barcode: "8991001010106" },
  { name: "Mizone 500ml", nameId: "Mizone 500ml", nameZh: "脉动500ml", price: 7000, category: "beverages", barcode: "8991001010107" },
  { name: "Le Minerale 600ml", nameId: "Le Minerale 600ml", nameZh: "Le Minerale矿泉水", price: 3000, category: "beverages", barcode: "8991001010108" },
  { name: "Ades 600ml", nameId: "Ades 600ml", nameZh: "Ades矿泉水", price: 3000, category: "beverages", barcode: "8991001010109" },
  { name: "Teh Pucuk Harum 350ml", nameId: "Teh Pucuk Harum 350ml", nameZh: "茶叶香350ml", price: 4000, category: "beverages", barcode: "8991001010110" },
  { name: "Frestea 350ml", nameId: "Frestea 350ml", nameZh: "Frestea茶350ml", price: 4500, category: "beverages", barcode: "8991001010111" },
  { name: "Fruit Tea 350ml", nameId: "Fruit Tea 350ml", nameZh: "水果茶350ml", price: 5000, category: "beverages", barcode: "8991001010112" },
  { name: "ABC Kopi Susu 200ml", nameId: "ABC Kopi Susu 200ml", nameZh: "ABC咖啡牛奶", price: 6500, category: "beverages", barcode: "8991001010113" },
  { name: "Good Day Cappuccino", nameId: "Good Day Cappuccino", nameZh: "好日子卡布奇诺", price: 2500, category: "beverages", barcode: "8991001010114" },
  { name: "Kapal Api Special", nameId: "Kapal Api Special", nameZh: "船牌咖啡", price: 2000, category: "beverages", barcode: "8991001010115" },
  { name: "Nescafe Classic", nameId: "Nescafe Classic", nameZh: "雀巢咖啡", price: 2500, category: "beverages", barcode: "8991001010116" },
  { name: "Energen Vanilla", nameId: "Energen Vanilla", nameZh: "Energen香草", price: 3000, category: "beverages", barcode: "8991001010117" },
  { name: "Milo UHT 180ml", nameId: "Milo UHT 180ml", nameZh: "美禄180ml", price: 6000, category: "beverages", barcode: "8991001010118" },
  { name: "Pepsi 390ml", nameId: "Pepsi 390ml", nameZh: "百事可乐390ml", price: 6000, category: "beverages", barcode: "8991001010119" },
  { name: "Mountea Green Tea", nameId: "Mountea Green Tea", nameZh: "绿茶", price: 4500, category: "beverages", barcode: "8991001010120" },
  { name: "Tebs Sparkling Tea", nameId: "Tebs Sparkling Tea", nameZh: "气泡茶", price: 7000, category: "beverages", barcode: "8991001010121" },
  { name: "Hydro Coco 250ml", nameId: "Hydro Coco 250ml", nameZh: "椰子水250ml", price: 8000, category: "beverages", barcode: "8991001010122" },
  { name: "Kopiko Coffee Candy", nameId: "Kopiko Coffee Candy", nameZh: "咖啡糖", price: 5000, category: "beverages", barcode: "8991001010123" },
  { name: "Nescafe 3in1 Original", nameId: "Nescafe 3in1 Original", nameZh: "雀巢三合一", price: 2500, category: "beverages", barcode: "8991001010124" },
  { name: "ABC Susu Soda 190ml", nameId: "ABC Susu Soda 190ml", nameZh: "ABC苏打奶", price: 5500, category: "beverages", barcode: "8991001010125" },
  { name: "Pulpy Orange 350ml", nameId: "Pulpy Orange 350ml", nameZh: "果粒橙350ml", price: 7000, category: "beverages", barcode: "8991001010126" },
  { name: "Minute Maid Pulpy 350ml", nameId: "Minute Maid Pulpy 350ml", nameZh: "美汁源350ml", price: 7000, category: "beverages", barcode: "8991001010127" },
  { name: "Cleo Water 600ml", nameId: "Cleo Water 600ml", nameZh: "Cleo矿泉水", price: 3500, category: "beverages", barcode: "8991001010128" },
  { name: "Pristine Water 600ml", nameId: "Pristine Water 600ml", nameZh: "Pristine矿泉水", price: 4000, category: "beverages", barcode: "8991001010129" },
  { name: "You C1000 140ml", nameId: "You C1000 140ml", nameZh: "维生素C饮料", price: 8000, category: "beverages", barcode: "8991001010130" },
  { name: "Kratingdaeng 150ml", nameId: "Kratingdaeng 150ml", nameZh: "红牛150ml", price: 9000, category: "beverages", barcode: "8991001010131" },
  { name: "Extra Joss Sachet", nameId: "Extra Joss Sachet", nameZh: "能量饮料包", price: 3000, category: "beverages", barcode: "8991001010132" },
  { name: "Hemaviton Energy", nameId: "Hemaviton Energy", nameZh: "能量饮料", price: 3500, category: "beverages", barcode: "8991001010133" },
  { name: "Kuku Bima TL", nameId: "Kuku Bima TL", nameZh: "Kuku Bima能量", price: 2500, category: "beverages", barcode: "8991001010134" },
  { name: "Bear Brand 189ml", nameId: "Bear Brand 189ml", nameZh: "熊牌牛奶189ml", price: 10000, category: "beverages", barcode: "8991001010135" },
  { name: "Ultramilk Coklat 200ml", nameId: "Ultramilk Coklat 200ml", nameZh: "巧克力奶200ml", price: 7000, category: "beverages", barcode: "8991001010136" },
  { name: "Indomilk UHT 190ml", nameId: "Indomilk UHT 190ml", nameZh: "印尼牛奶190ml", price: 6000, category: "beverages", barcode: "8991001010137" },
  { name: "Frisian Flag Susu 225ml", nameId: "Frisian Flag Susu 225ml", nameZh: "荷兰牛奶225ml", price: 7500, category: "beverages", barcode: "8991001010138" },
  { name: "Yakult 5pack", nameId: "Yakult 5pack", nameZh: "养乐多5瓶", price: 12000, category: "beverages", barcode: "8991001010139" },
  { name: "Cimory Yogurt Drink", nameId: "Cimory Yogurt Drink", nameZh: "酸奶饮料", price: 8500, category: "beverages", barcode: "8991001010140" },

  // Snacks (40 items)
  { name: "Chitato Sapi Panggang 68g", nameId: "Chitato Sapi Panggang 68g", nameZh: "奇多烤牛肉味68g", price: 12000, category: "snacks", barcode: "8991001020101" },
  { name: "Cheetos Jagung Bakar", nameId: "Cheetos Jagung Bakar", nameZh: "奇多烤玉米", price: 10000, category: "snacks", barcode: "8991001020102" },
  { name: "Lays Rumput Laut", nameId: "Lays Rumput Laut", nameZh: "乐事海苔味", price: 11000, category: "snacks", barcode: "8991001020103" },
  { name: "Doritos Nacho Cheese", nameId: "Doritos Nacho Cheese", nameZh: "多力多滋芝士味", price: 13000, category: "snacks", barcode: "8991001020104" },
  { name: "Pringles Original 107g", nameId: "Pringles Original 107g", nameZh: "品客原味107g", price: 25000, category: "snacks", barcode: "8991001020105" },
  { name: "Taro Net 160g", nameId: "Taro Net 160g", nameZh: "太郎薯片160g", price: 15000, category: "snacks", barcode: "8991001020106" },
  { name: "Beng Beng Chocolate", nameId: "Beng Beng Chocolate", nameZh: "Beng Beng巧克力", price: 2500, category: "snacks", barcode: "8991001020107" },
  { name: "Top Coffee Candy", nameId: "Top Coffee Candy", nameZh: "Top咖啡糖", price: 3000, category: "snacks", barcode: "8991001020108" },
  { name: "Yupi Gummy Candy", nameId: "Yupi Gummy Candy", nameZh: "Yupi软糖", price: 4000, category: "snacks", barcode: "8991001020109" },
  { name: "Kis Candy Mint", nameId: "Kis Candy Mint", nameZh: "Kis薄荷糖", price: 2000, category: "snacks", barcode: "8991001020110" },
  { name: "Relaxa Biscuit", nameId: "Relaxa Biscuit", nameZh: "Relaxa饼干", price: 3500, category: "snacks", barcode: "8991001020111" },
  { name: "Roma Kelapa 300g", nameId: "Roma Kelapa 300g", nameZh: "Roma椰子饼300g", price: 9000, category: "snacks", barcode: "8991001020112" },
  { name: "Oreo Original 137g", nameId: "Oreo Original 137g", nameZh: "奥利奥原味137g", price: 13000, category: "snacks", barcode: "8991001020113" },
  { name: "Better Chocolate", nameId: "Better Chocolate", nameZh: "Better巧克力", price: 5000, category: "snacks", barcode: "8991001020114" },
  { name: "Richeese Nabati", nameId: "Richeese Nabati", nameZh: "Richeese芝士", price: 3000, category: "snacks", barcode: "8991001020115" },
  { name: "Tango Wafer Chocolate", nameId: "Tango Wafer Chocolate", nameZh: "探戈威化巧克力", price: 2500, category: "snacks", barcode: "8991001020116" },
  { name: "Selamat Crackers", nameId: "Selamat Crackers", nameZh: "Selamat饼干", price: 4000, category: "snacks", barcode: "8991001020117" },
  { name: "Good Time Cookies", nameId: "Good Time Cookies", nameZh: "好时光曲奇", price: 7000, category: "snacks", barcode: "8991001020118" },
  { name: "Khong Guan Kaleng", nameId: "Khong Guan Kaleng", nameZh: "康元饼干罐", price: 35000, category: "snacks", barcode: "8991001020119" },
  { name: "Monde Butter Cookies", nameId: "Monde Butter Cookies", nameZh: "Monde黄油饼干", price: 12000, category: "snacks", barcode: "8991001020120" },
  { name: "Nissin Wafer Roll", nameId: "Nissin Wafer Roll", nameZh: "日清威化卷", price: 6000, category: "snacks", barcode: "8991001020121" },
  { name: "SilverQueen Chunky Bar", nameId: "SilverQueen Chunky Bar", nameZh: "银皇后巧克力", price: 15000, category: "snacks", barcode: "8991001020122" },
  { name: "Cadbury Dairy Milk", nameId: "Cadbury Dairy Milk", nameZh: "吉百利牛奶巧克力", price: 18000, category: "snacks", barcode: "8991001020123" },
  { name: "KitKat Chunky", nameId: "KitKat Chunky", nameZh: "奇巧巧克力", price: 12000, category: "snacks", barcode: "8991001020124" },
  { name: "Snickers Bar", nameId: "Snickers Bar", nameZh: "士力架", price: 10000, category: "snacks", barcode: "8991001020125" },
  { name: "Mentos Mint Roll", nameId: "Mentos Mint Roll", nameZh: "曼妥思薄荷糖", price: 7000, category: "snacks", barcode: "8991001020126" },
  { name: "Halls Candy", nameId: "Halls Candy", nameZh: "Halls糖", price: 5000, category: "snacks", barcode: "8991001020127" },
  { name: "Sugus Assorted", nameId: "Sugus Assorted", nameZh: "瑞士糖", price: 8000, category: "snacks", barcode: "8991001020128" },
  { name: "Choki Choki Chocolate", nameId: "Choki Choki Chocolate", nameZh: "Choki Choki巧克力", price: 2000, category: "snacks", barcode: "8991001020129" },
  { name: "Malkist Crackers", nameId: "Malkist Crackers", nameZh: "Malkist饼干", price: 4500, category: "snacks", barcode: "8991001020130" },
  { name: "Hup Seng Cream Cracker", nameId: "Hup Seng Cream Cracker", nameZh: "合成奶油饼干", price: 8000, category: "snacks", barcode: "8991001020131" },
  { name: "Biskuat Chocolate", nameId: "Biskuat Chocolate", nameZh: "Biskuat巧克力", price: 5000, category: "snacks", barcode: "8991001020132" },
  { name: "Astor Wafer Stick", nameId: "Astor Wafer Stick", nameZh: "Astor威化棒", price: 6500, category: "snacks", barcode: "8991001020133" },
  { name: "JetZ Crackers", nameId: "JetZ Crackers", nameZh: "JetZ饼干", price: 3500, category: "snacks", barcode: "8991001020134" },
  { name: "Kacang Garuda 200g", nameId: "Kacang Garuda 200g", nameZh: "鹰牌花生200g", price: 18000, category: "snacks", barcode: "8991001020135" },
  { name: "Dua Kelinci Kacang", nameId: "Dua Kelinci Kacang", nameZh: "双兔花生", price: 15000, category: "snacks", barcode: "8991001020136" },
  { name: "Simba BBQ Chips", nameId: "Simba BBQ Chips", nameZh: "Simba烧烤薯片", price: 10000, category: "snacks", barcode: "8991001020137" },
  { name: "Qtela Singkong", nameId: "Qtela Singkong", nameZh: "木薯片", price: 9000, category: "snacks", barcode: "8991001020138" },
  { name: "Maicih Keripik Pedas", nameId: "Maicih Keripik Pedas", nameZh: "辣味薯片", price: 12000, category: "snacks", barcode: "8991001020139" },
  { name: "Kusuka Snack", nameId: "Kusuka Snack", nameZh: "Kusuka零食", price: 5000, category: "snacks", barcode: "8991001020140" },

  // Instant Noodles & Food (30 items)
  { name: "Indomie Goreng", nameId: "Indomie Goreng", nameZh: "营多捞面", price: 3000, category: "noodles", barcode: "8991001030101" },
  { name: "Indomie Soto", nameId: "Indomie Soto", nameZh: "营多汤面", price: 3000, category: "noodles", barcode: "8991001030102" },
  { name: "Indomie Ayam Bawang", nameId: "Indomie Ayam Bawang", nameZh: "营多鸡肉面", price: 3000, category: "noodles", barcode: "8991001030103" },
  { name: "Mie Sedaap Goreng", nameId: "Mie Sedaap Goreng", nameZh: "Sedaap捞面", price: 3500, category: "noodles", barcode: "8991001030104" },
  { name: "Mie Sedaap Kari", nameId: "Mie Sedaap Kari", nameZh: "Sedaap咖喱面", price: 3500, category: "noodles", barcode: "8991001030105" },
  { name: "Supermi Ayam Bawang", nameId: "Supermi Ayam Bawang", nameZh: "超级鸡肉面", price: 2500, category: "noodles", barcode: "8991001030106" },
  { name: "Pop Mie Rasa Ayam", nameId: "Pop Mie Rasa Ayam", nameZh: "Pop Mie鸡肉杯面", price: 5000, category: "noodles", barcode: "8991001030107" },
  { name: "Mie Gelas", nameId: "Mie Gelas", nameZh: "杯面", price: 4000, category: "noodles", barcode: "8991001030108" },
  { name: "Sarimi Soto", nameId: "Sarimi Soto", nameZh: "Sarimi汤面", price: 2500, category: "noodles", barcode: "8991001030109" },
  { name: "Lemonilo Mie Goreng", nameId: "Lemonilo Mie Goreng", nameZh: "健康捞面", price: 5000, category: "noodles", barcode: "8991001030110" },
  { name: "Nissin Cup Noodles", nameId: "Nissin Cup Noodles", nameZh: "日清杯面", price: 8000, category: "noodles", barcode: "8991001030111" },
  { name: "Indomie 5pcs Pack", nameId: "Indomie 5pcs Pack", nameZh: "营多5包装", price: 13000, category: "noodles", barcode: "8991001030112" },
  { name: "ABC Saus Sambal 335ml", nameId: "ABC Saus Sambal 335ml", nameZh: "ABC辣椒酱335ml", price: 18000, category: "noodles", barcode: "8991001030113" },
  { name: "Kecap Bango 220ml", nameId: "Kecap Bango 220ml", nameZh: "甜酱油220ml", price: 12000, category: "noodles", barcode: "8991001030114" },
  { name: "Sasa Bumbu Penyedap", nameId: "Sasa Bumbu Penyedap", nameZh: "调味料", price: 1500, category: "noodles", barcode: "8991001030115" },
  { name: "Royco Ayam Sachet", nameId: "Royco Ayam Sachet", nameZh: "鸡肉调料包", price: 1000, category: "noodles", barcode: "8991001030116" },
  { name: "Masako Sapi Sachet", nameId: "Masako Sapi Sachet", nameZh: "牛肉调料包", price: 1000, category: "noodles", barcode: "8991001030117" },
  { name: "Kecap ABC Manis 135ml", nameId: "Kecap ABC Manis 135ml", nameZh: "ABC甜酱油135ml", price: 8000, category: "noodles", barcode: "8991001030118" },
  { name: "Mayones Maestro 200ml", nameId: "Mayones Maestro 200ml", nameZh: "美乃滋200ml", price: 15000, category: "noodles", barcode: "8991001030119" },
  { name: "Indofood Sambal Botol", nameId: "Indofood Sambal Botol", nameZh: "印尼辣椒酱", price: 14000, category: "noodles", barcode: "8991001030120" },
  { name: "Beras Premium 5kg", nameId: "Beras Premium 5kg", nameZh: "优质大米5公斤", price: 85000, category: "noodles", barcode: "8991001030121" },
  { name: "Gulaku Gula 1kg", nameId: "Gulaku Gula 1kg", nameZh: "白糖1公斤", price: 15000, category: "noodles", barcode: "8991001030122" },
  { name: "Bimoli Minyak 1L", nameId: "Bimoli Minyak 1L", nameZh: "食用油1升", price: 25000, category: "noodles", barcode: "8991001030123" },
  { name: "Kopi ABC Susu Kaleng", nameId: "Kopi ABC Susu Kaleng", nameZh: "ABC咖啡牛奶罐装", price: 9000, category: "noodles", barcode: "8991001030124" },
  { name: "Tepung Terigu Segitiga", nameId: "Tepung Terigu Segitiga", nameZh: "三角面粉", price: 12000, category: "noodles", barcode: "8991001030125" },
  { name: "Garam Beryodium", nameId: "Garam Beryodium", nameZh: "碘盐", price: 3000, category: "noodles", barcode: "8991001030126" },
  { name: "Telur Ayam 10pcs", nameId: "Telur Ayam 10pcs", nameZh: "鸡蛋10个", price: 28000, category: "noodles", barcode: "8991001030127" },
  { name: "Kornet Pronas 198g", nameId: "Kornet Pronas 198g", nameZh: "罐头牛肉198g", price: 22000, category: "noodles", barcode: "8991001030128" },
  { name: "Sarden ABC 155g", nameId: "Sarden ABC 155g", nameZh: "ABC沙丁鱼155g", price: 15000, category: "noodles", barcode: "8991001030129" },
  { name: "Susu Kental Manis", nameId: "Susu Kental Manis", nameZh: "炼乳", price: 12000, category: "noodles", barcode: "8991001030130" },

  // Personal Care (25 items)
  { name: "Pepsodent 190g", nameId: "Pepsodent 190g", nameZh: "Pepsodent牙膏190g", price: 12000, category: "personal_care", barcode: "8991001040101" },
  { name: "Close Up 160g", nameId: "Close Up 160g", nameZh: "Close Up牙膏160g", price: 14000, category: "personal_care", barcode: "8991001040102" },
  { name: "Sensodyne 100g", nameId: "Sensodyne 100g", nameZh: "舒适达牙膏100g", price: 35000, category: "personal_care", barcode: "8991001040103" },
  { name: "Sikat Gigi Formula", nameId: "Sikat Gigi Formula", nameZh: "牙刷", price: 8000, category: "personal_care", barcode: "8991001040104" },
  { name: "Listerine 250ml", nameId: "Listerine 250ml", nameZh: "李施德林250ml", price: 28000, category: "personal_care", barcode: "8991001040105" },
  { name: "Clear Shampoo 170ml", nameId: "Clear Shampoo 170ml", nameZh: "清扬洗发水170ml", price: 18000, category: "personal_care", barcode: "8991001040106" },
  { name: "Pantene Shampoo 170ml", nameId: "Pantene Shampoo 170ml", nameZh: "潘婷洗发水170ml", price: 22000, category: "personal_care", barcode: "8991001040107" },
  { name: "Sunsilk Shampoo 170ml", nameId: "Sunsilk Shampoo 170ml", nameZh: "夏士莲洗发水170ml", price: 18000, category: "personal_care", barcode: "8991001040108" },
  { name: "Lifebuoy Sabun 85g", nameId: "Lifebuoy Sabun 85g", nameZh: "卫宝香皂85g", price: 4000, category: "personal_care", barcode: "8991001040109" },
  { name: "Lux Sabun 85g", nameId: "Lux Sabun 85g", nameZh: "力士香皂85g", price: 4500, category: "personal_care", barcode: "8991001040110" },
  { name: "Dove Sabun 100g", nameId: "Dove Sabun 100g", nameZh: "多芬香皂100g", price: 9000, category: "personal_care", barcode: "8991001040111" },
  { name: "Shinzui Body Lotion", nameId: "Shinzui Body Lotion", nameZh: "身体乳", price: 15000, category: "personal_care", barcode: "8991001040112" },
  { name: "Vaseline Body Lotion", nameId: "Vaseline Body Lotion", nameZh: "凡士林身体乳", price: 25000, category: "personal_care", barcode: "8991001040113" },
  { name: "Citra Handbody 120ml", nameId: "Citra Handbody 120ml", nameZh: "Citra身体乳120ml", price: 18000, category: "personal_care", barcode: "8991001040114" },
  { name: "Marina Body Lotion", nameId: "Marina Body Lotion", nameZh: "Marina身体乳", price: 12000, category: "personal_care", barcode: "8991001040115" },
  { name: "Rexona Roll On 45ml", nameId: "Rexona Roll On 45ml", nameZh: "Rexona止汗露45ml", price: 16000, category: "personal_care", barcode: "8991001040116" },
  { name: "Biore Body Foam 450ml", nameId: "Biore Body Foam 450ml", nameZh: "碧柔沐浴露450ml", price: 32000, category: "personal_care", barcode: "8991001040117" },
  { name: "Dettol Handwash 250ml", nameId: "Dettol Handwash 250ml", nameZh: "滴露洗手液250ml", price: 22000, category: "personal_care", barcode: "8991001040118" },
  { name: "Gatsby Wax 75g", nameId: "Gatsby Wax 75g", nameZh: "发蜡75g", price: 25000, category: "personal_care", barcode: "8991001040119" },
  { name: "Emina Sunscreen SPF30", nameId: "Emina Sunscreen SPF30", nameZh: "防晒霜SPF30", price: 35000, category: "personal_care", barcode: "8991001040120" },
  { name: "Wardah Lipstick", nameId: "Wardah Lipstick", nameZh: "口红", price: 42000, category: "personal_care", barcode: "8991001040121" },
  { name: "Pigeon Baby Powder", nameId: "Pigeon Baby Powder", nameZh: "婴儿爽身粉", price: 18000, category: "personal_care", barcode: "8991001040122" },
  { name: "Cussons Baby Oil", nameId: "Cussons Baby Oil", nameZh: "婴儿油", price: 22000, category: "personal_care", barcode: "8991001040123" },
  { name: "Zwitsal Baby Shampoo", nameId: "Zwitsal Baby Shampoo", nameZh: "婴儿洗发水", price: 28000, category: "personal_care", barcode: "8991001040124" },
  { name: "Pembalut Charm 20pcs", nameId: "Pembalut Charm 20pcs", nameZh: "卫生巾20片", price: 18000, category: "personal_care", barcode: "8991001040125" },

  // Household (20 items)
  { name: "Tissue Paseo 250s", nameId: "Tissue Paseo 250s", nameZh: "纸巾250张", price: 12000, category: "household", barcode: "8991001050101" },
  { name: "Tissue Tessa 250s", nameId: "Tissue Tessa 250s", nameZh: "Tessa纸巾250张", price: 10000, category: "household", barcode: "8991001050102" },
  { name: "Tissue Nice 250s", nameId: "Tissue Nice 250s", nameZh: "Nice纸巾250张", price: 8000, category: "household", barcode: "8991001050103" },
  { name: "Tisu Toilet Paseo", nameId: "Tisu Toilet Paseo", nameZh: "卷纸", price: 15000, category: "household", barcode: "8991001050104" },
  { name: "Rinso Detergent 900g", nameId: "Rinso Detergent 900g", nameZh: "奥妙洗衣粉900g", price: 28000, category: "household", barcode: "8991001050105" },
  { name: "Rinso Cair 800ml", nameId: "Rinso Cair 800ml", nameZh: "奥妙洗衣液800ml", price: 32000, category: "household", barcode: "8991001050106" },
  { name: "So Klin Powder 900g", nameId: "So Klin Powder 900g", nameZh: "洗衣粉900g", price: 25000, category: "household", barcode: "8991001050107" },
  { name: "Molto Ultra 900ml", nameId: "Molto Ultra 900ml", nameZh: "柔顺剂900ml", price: 18000, category: "household", barcode: "8991001050108" },
  { name: "Downy Parfum 900ml", nameId: "Downy Parfum 900ml", nameZh: "当妮柔顺剂900ml", price: 22000, category: "household", barcode: "8991001050109" },
  { name: "Sunlight Pencuci 800ml", nameId: "Sunlight Pencuci 800ml", nameZh: "洗洁精800ml", price: 12000, category: "household", barcode: "8991001050110" },
  { name: "Mama Lime 800ml", nameId: "Mama Lime 800ml", nameZh: "Mama Lime洗洁精", price: 10000, category: "household", barcode: "8991001050111" },
  { name: "Vixal Pembersih 800ml", nameId: "Vixal Pembersih 800ml", nameZh: "清洁剂800ml", price: 14000, category: "household", barcode: "8991001050112" },
  { name: "Harpic Toilet Cleaner", nameId: "Harpic Toilet Cleaner", nameZh: "马桶清洁剂", price: 18000, category: "household", barcode: "8991001050113" },
  { name: "Baygon Aerosol 600ml", nameId: "Baygon Aerosol 600ml", nameZh: "拜耳杀虫剂600ml", price: 35000, category: "household", barcode: "8991001050114" },
  { name: "Hit Aerosol 600ml", nameId: "Hit Aerosol 600ml", nameZh: "Hit杀虫剂600ml", price: 32000, category: "household", barcode: "8991001050115" },
  { name: "Stella Pewangi 900ml", nameId: "Stella Pewangi 900ml", nameZh: "空气清新剂900ml", price: 15000, category: "household", barcode: "8991001050116" },
  { name: "Kispray Pink 600ml", nameId: "Kispray Pink 600ml", nameZh: "空气清新喷雾600ml", price: 22000, category: "household", barcode: "8991001050117" },
  { name: "Plastik Sampah Hitam", nameId: "Plastik Sampah Hitam", nameZh: "黑色垃圾袋", price: 12000, category: "household", barcode: "8991001050118" },
  { name: "Plastik Kresek 1kg", nameId: "Plastik Kresek 1kg", nameZh: "塑料袋1公斤", price: 18000, category: "household", barcode: "8991001050119" },
  { name: "Sapu Lidi", nameId: "Sapu Lidi", nameZh: "扫帚", price: 15000, category: "household", barcode: "8991001050120" },

  // Cigarettes (15 items)
  { name: "Gudang Garam Filter", nameId: "Gudang Garam Filter", nameZh: "盐仓香烟过滤嘴", price: 28000, category: "cigarettes", barcode: "8991001060101" },
  { name: "Sampoerna Mild", nameId: "Sampoerna Mild", nameZh: "三宝麟淡味", price: 32000, category: "cigarettes", barcode: "8991001060102" },
  { name: "Djarum Super", nameId: "Djarum Super", nameZh: "针标超级", price: 25000, category: "cigarettes", barcode: "8991001060103" },
  { name: "Marlboro Red", nameId: "Marlboro Red", nameZh: "万宝路红", price: 35000, category: "cigarettes", barcode: "8991001060104" },
  { name: "LA Lights", nameId: "LA Lights", nameZh: "LA Lights香烟", price: 26000, category: "cigarettes", barcode: "8991001060105" },
  { name: "Esse Change", nameId: "Esse Change", nameZh: "爱喜香烟", price: 28000, category: "cigarettes", barcode: "8991001060106" },
  { name: "Dunhill Mild", nameId: "Dunhill Mild", nameZh: "登喜路淡味", price: 38000, category: "cigarettes", barcode: "8991001060107" },
  { name: "Camel Filter", nameId: "Camel Filter", nameZh: "骆驼过滤嘴", price: 34000, category: "cigarettes", barcode: "8991001060108" },
  { name: "Surya 12 Batang", nameId: "Surya 12 Batang", nameZh: "太阳12支", price: 20000, category: "cigarettes", barcode: "8991001060109" },
  { name: "Dji Sam Soe 234", nameId: "Dji Sam Soe 234", nameZh: "叔公234", price: 30000, category: "cigarettes", barcode: "8991001060110" },
  { name: "Magnum Mild", nameId: "Magnum Mild", nameZh: "万能淡味", price: 24000, category: "cigarettes", barcode: "8991001060111" },
  { name: "Class Mild", nameId: "Class Mild", nameZh: "Class淡味", price: 22000, category: "cigarettes", barcode: "8991001060112" },
  { name: "Star Mild", nameId: "Star Mild", nameZh: "Star淡味", price: 20000, category: "cigarettes", barcode: "8991001060113" },
  { name: "U Mild", nameId: "U Mild", nameZh: "U淡味", price: 23000, category: "cigarettes", barcode: "8991001060114" },
  { name: "Clas Mild Filter", nameId: "Clas Mild Filter", nameZh: "Clas过滤嘴", price: 21000, category: "cigarettes", barcode: "8991001060115" },

  // Dairy & Frozen (15 items)
  { name: "Es Krim Wall's Cone", nameId: "Es Krim Wall's Cone", nameZh: "和路雪蛋筒", price: 8000, category: "frozen", barcode: "8991001070101" },
  { name: "Es Krim Magnum", nameId: "Es Krim Magnum", nameZh: "梦龙冰淇淋", price: 18000, category: "frozen", barcode: "8991001070102" },
  { name: "Paddle Pop Rainbow", nameId: "Paddle Pop Rainbow", nameZh: "彩虹冰棒", price: 5000, category: "frozen", barcode: "8991001070103" },
  { name: "Aice Mochi", nameId: "Aice Mochi", nameZh: "Aice麻薯冰淇淋", price: 3000, category: "frozen", barcode: "8991001070104" },
  { name: "Yogurt Cimory 120ml", nameId: "Yogurt Cimory 120ml", nameZh: "酸奶120ml", price: 7000, category: "frozen", barcode: "8991001070105" },
  { name: "Keju Kraft Singles", nameId: "Keju Kraft Singles", nameZh: "芝士片", price: 35000, category: "frozen", barcode: "8991001070106" },
  { name: "Keju Prochiz 180g", nameId: "Keju Prochiz 180g", nameZh: "奶酪180g", price: 28000, category: "frozen", barcode: "8991001070107" },
  { name: "Mentega Blueband 200g", nameId: "Mentega Blueband 200g", nameZh: "黄油200g", price: 18000, category: "frozen", barcode: "8991001070108" },
  { name: "Nugget Fiesta 500g", nameId: "Nugget Fiesta 500g", nameZh: "鸡块500g", price: 32000, category: "frozen", barcode: "8991001070109" },
  { name: "Sosis So Nice 360g", nameId: "Sosis So Nice 360g", nameZh: "香肠360g", price: 28000, category: "frozen", barcode: "8991001070110" },
  { name: "Bakso Belfoods 500g", nameId: "Bakso Belfoods 500g", nameZh: "肉丸500g", price: 25000, category: "frozen", barcode: "8991001070111" },
  { name: "Dimsum Frozen 250g", nameId: "Dimsum Frozen 250g", nameZh: "冷冻点心250g", price: 35000, category: "frozen", barcode: "8991001070112" },
  { name: "Fries McCain 400g", nameId: "Fries McCain 400g", nameZh: "薯条400g", price: 28000, category: "frozen", barcode: "8991001070113" },
  { name: "Es Batu Kristal 1kg", nameId: "Es Batu Kristal 1kg", nameZh: "冰块1公斤", price: 8000, category: "frozen", barcode: "8991001070114" },
  { name: "Susu UHT Indomilk 1L", nameId: "Susu UHT Indomilk 1L", nameZh: "UHT牛奶1升", price: 18000, category: "frozen", barcode: "8991001070115" },

  // Medicine/Health (15 items)
  { name: "Paracetamol 500mg Strip", nameId: "Paracetamol 500mg Strip", nameZh: "扑热息痛500mg", price: 3000, category: "health", barcode: "8991001080101" },
  { name: "Bodrex Extra 4tabs", nameId: "Bodrex Extra 4tabs", nameZh: "Bodrex止痛药4片", price: 5000, category: "health", barcode: "8991001080102" },
  { name: "Promag Tablet Strip", nameId: "Promag Tablet Strip", nameZh: "胃药片", price: 4000, category: "health", barcode: "8991001080103" },
  { name: "Antangin JRG Sachet", nameId: "Antangin JRG Sachet", nameZh: "草药包", price: 3000, category: "health", barcode: "8991001080104" },
  { name: "Tolak Angin Cair", nameId: "Tolak Angin Cair", nameZh: "草药液", price: 4000, category: "health", barcode: "8991001080105" },
  { name: "Komix Herbal", nameId: "Komix Herbal", nameZh: "草药冲剂", price: 3500, category: "health", barcode: "8991001080106" },
  { name: "Woods Peppermint", nameId: "Woods Peppermint", nameZh: "薄荷糖", price: 6000, category: "health", barcode: "8991001080107" },
  { name: "Fisherman's Friend", nameId: "Fisherman's Friend", nameZh: "渔夫之宝", price: 12000, category: "health", barcode: "8991001080108" },
  { name: "Vitamin C 1000mg", nameId: "Vitamin C 1000mg", nameZh: "维生素C 1000mg", price: 8000, category: "health", barcode: "8991001080109" },
  { name: "Hemaviton Stamina", nameId: "Hemaviton Stamina", nameZh: "维生素补充剂", price: 5000, category: "health", barcode: "8991001080110" },
  { name: "Enervon C Tablet", nameId: "Enervon C Tablet", nameZh: "维生素C片", price: 6000, category: "health", barcode: "8991001080111" },
  { name: "Sangobion Strip", nameId: "Sangobion Strip", nameZh: "补血片", price: 12000, category: "health", barcode: "8991001080112" },
  { name: "Mylanta Liquid", nameId: "Mylanta Liquid", nameZh: "胃药液", price: 18000, category: "health", barcode: "8991001080113" },
  { name: "Betadine Gargle 100ml", nameId: "Betadine Gargle 100ml", nameZh: "漱口水100ml", price: 35000, category: "health", barcode: "8991001080114" },
  { name: "Plester Hansaplast 10pcs", nameId: "Plester Hansaplast 10pcs", nameZh: "创可贴10片", price: 8000, category: "health", barcode: "8991001080115" },
];

// Categories
const categories: Category[] = [
  { id: "beverages", name: "Beverages", nameId: "Minuman", nameZh: "饮料", color: "#3B82F6" },
  { id: "snacks", name: "Snacks", nameId: "Makanan Ringan", nameZh: "零食", color: "#F59E0B" },
  { id: "noodles", name: "Noodles & Food", nameId: "Mie & Makanan", nameZh: "面条和食品", color: "#EF4444" },
  { id: "personal_care", name: "Personal Care", nameId: "Perawatan Pribadi", nameZh: "个人护理", color: "#8B5CF6" },
  { id: "household", name: "Household", nameId: "Kebutuhan Rumah", nameZh: "家居用品", color: "#10B981" },
  { id: "cigarettes", name: "Cigarettes", nameId: "Rokok", nameZh: "香烟", color: "#6B7280" },
  { id: "frozen", name: "Frozen & Dairy", nameId: "Beku & Susu", nameZh: "冷冻和乳制品", color: "#06B6D4" },
  { id: "health", name: "Health", nameId: "Kesehatan", nameZh: "保健", color: "#EC4899" },
];

// Generate items with IDs
function generateItems(): Item[] {
  return storeItems.map((item, index) => ({
    id: `item_${(index + 1).toString().padStart(3, "0")}`,
    name: item.name,
    nameId: item.nameId,
    nameZh: item.nameZh,
    price: item.price,
    categoryId: item.category,
    barcode: item.barcode,
    stock: Math.floor(Math.random() * 100) + 20, // 20-120 stock
    imageUrl: undefined,
    isActive: true,
    createdAt: "2023-12-01T00:00:00.000Z",
    updatedAt: new Date().toISOString(),
  }));
}

// Generate employees
function generateEmployees(): Employee[] {
  const employees: Employee[] = [];
  
  // 2 Cashiers
  for (let i = 0; i < 2; i++) {
    employees.push({
      id: `emp_${(i + 1).toString().padStart(3, "0")}`,
      name: generateName("cashier", i),
      pin: generatePin(),
      role: "cashier",
      isActive: true,
      createdAt: "2023-12-01T00:00:00.000Z",
    });
  }
  
  // 6 Helpers
  for (let i = 0; i < 6; i++) {
    employees.push({
      id: `emp_${(i + 3).toString().padStart(3, "0")}`,
      name: generateName("helper", i),
      pin: generatePin(),
      role: "helper",
      isActive: true,
      createdAt: "2023-12-01T00:00:00.000Z",
    });
  }
  
  return employees;
}

// Settings
const settings: Settings = {
  id: 1,
  storeName: "SellMore Mart",
  currency: "IDR",
  tax1Name: "PPN",
  tax1Rate: 10,
  tax1Inclusive: true,
  tax2Name: "",
  tax2Rate: 0,
  tax2Inclusive: false,
  language: "id",
  receiptFooter: "Terima kasih atas kunjungan Anda!\nSelamat berbelanja kembali 🙏",
  enableBluetooth: false,
  printerName: "",
};

// Helper functions for date manipulation
function getDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function isClosedDay(date: Date): boolean {
  // Closed on: Nyepi (some day in March), Christmas, New Year
  const dateStr = getDateString(date);
  const closedDays = [
    "2024-03-11", // Nyepi 2024
    "2024-12-25", // Christmas 2024
    "2025-01-01", // New Year 2025
    "2025-03-29", // Nyepi 2025
    "2025-12-25", // Christmas 2025
    "2026-01-01", // New Year 2026
  ];
  return closedDays.includes(dateStr);
}

function getTransactionCount(date: Date): number {
  const day = date.getDay();
  const baseCount = 120;
  
  // Weekend boost
  if (day === 0 || day === 6) {
    return Math.floor(baseCount * (1.3 + Math.random() * 0.2)); // 130-150%
  }
  
  // Monday slower
  if (day === 1) {
    return Math.floor(baseCount * (0.7 + Math.random() * 0.2)); // 70-90%
  }
  
  // Regular variance
  return Math.floor(baseCount * (0.85 + Math.random() * 0.3)); // 85-115%
}

// Generate summary data
function generateSummaryData(startDate: Date, endDate: Date, items: Item[], employees: Employee[]) {
  const dailyItemSales: any[] = [];
  const dailyPaymentSales: any[] = [];
  const dailyAttendance: any[] = [];
  const monthlyItemSales: any[] = [];
  const monthlySalesSummary: any[] = [];
  const monthlyAttendanceSummary: any[] = [];
  const shifts: any[] = [];

  // Track monthly aggregates
  const monthlyAggregates: Map<string, any> = new Map();
  
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dateStr = getDateString(currentDate);
    const monthKey = dateStr.substring(0, 7); // YYYY-MM
    
    if (isClosedDay(currentDate)) {
      currentDate = addDays(currentDate, 1);
      continue;
    }
    
    const txCount = getTransactionCount(currentDate);
    const avgTxAmount = 85000;
    const totalRevenue = txCount * avgTxAmount;
    
    // Payment split: 60% QRIS, 40% Cash
    const qrisAmount = totalRevenue * 0.6;
    const cashAmount = totalRevenue * 0.4;
    
    // Daily payment sales
    dailyPaymentSales.push({
      id: `dps_${dateStr}_qris`,
      date: dateStr,
      paymentMethod: "QRIS",
      totalAmount: Math.round(qrisAmount),
      transactionCount: Math.round(txCount * 0.6),
    });
    
    dailyPaymentSales.push({
      id: `dps_${dateStr}_cash`,
      date: dateStr,
      paymentMethod: "Cash",
      totalAmount: Math.round(cashAmount),
      transactionCount: Math.round(txCount * 0.4),
    });
    
    // Daily item sales (top 50 items per day for size)
    const topItems = items.slice(0, 50);
    topItems.forEach((item, idx) => {
      const salesFrequency = 1 / (idx + 1); // Zipf distribution
      const quantity = Math.max(1, Math.floor(txCount * salesFrequency * (0.1 + Math.random() * 0.05)));
      const revenue = quantity * item.price;
      
      if (quantity > 0) {
        dailyItemSales.push({
          id: `dis_${dateStr}_${item.id}`,
          date: dateStr,
          itemId: item.id,
          itemName: item.name,
          quantity,
          revenue: Math.round(revenue),
        });
      }
    });
    
    // Employee attendance (2 shifts per day)
    const shift1Employees = [employees[0], employees[2], employees[3], employees[4]]; // 1 cashier + 3 helpers
    const shift2Employees = [employees[1], employees[5], employees[6], employees[7]]; // 1 cashier + 3 helpers
    
    // Shift 1: 06:00-14:00
    const shift1Id = `shift_${dateStr}_1`;
    const shift1Start = new Date(`${dateStr}T06:00:00`);
    const shift1End = new Date(`${dateStr}T14:00:00`);
    
    shifts.push({
      id: shift1Id,
      shiftStart: shift1Start.toISOString(),
      shiftEnd: shift1End.toISOString(),
      employeeId: employees[0].id,
      employeeName: employees[0].name,
      totalSales: Math.round(totalRevenue * 0.45),
      transactionCount: Math.round(txCount * 0.45),
    });
    
    shift1Employees.forEach(emp => {
      const isLate = Math.random() < 0.05; // 5% late
      const clockIn = isLate 
        ? new Date(`${dateStr}T${6 + Math.floor(Math.random() * 1)}:${Math.floor(Math.random() * 60).toString().padStart(2, "0")}:00`)
        : new Date(`${dateStr}T06:00:00`);
      const clockOut = new Date(`${dateStr}T14:00:00`);
      const hoursWorked = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
      
      dailyAttendance.push({
        id: `att_${dateStr}_${emp.id}_1`,
        date: dateStr,
        employeeId: emp.id,
        employeeName: emp.name,
        shiftName: "Morning",
        clockIn: clockIn.toISOString(),
        clockOut: clockOut.toISOString(),
        hoursWorked: Math.round(hoursWorked * 100) / 100,
        isLate,
      });
    });
    
    // Shift 2: 14:00-22:00
    const shift2Id = `shift_${dateStr}_2`;
    const shift2Start = new Date(`${dateStr}T14:00:00`);
    const shift2End = new Date(`${dateStr}T22:00:00`);
    
    shifts.push({
      id: shift2Id,
      shiftStart: shift2Start.toISOString(),
      shiftEnd: shift2End.toISOString(),
      employeeId: employees[1].id,
      employeeName: employees[1].name,
      totalSales: Math.round(totalRevenue * 0.55),
      transactionCount: Math.round(txCount * 0.55),
    });
    
    shift2Employees.forEach(emp => {
      const isLate = Math.random() < 0.05;
      const clockIn = isLate 
        ? new Date(`${dateStr}T${14 + Math.floor(Math.random() * 1)}:${Math.floor(Math.random() * 60).toString().padStart(2, "0")}:00`)
        : new Date(`${dateStr}T14:00:00`);
      const clockOut = new Date(`${dateStr}T22:00:00`);
      const hoursWorked = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
      
      dailyAttendance.push({
        id: `att_${dateStr}_${emp.id}_2`,
        date: dateStr,
        employeeId: emp.id,
        employeeName: emp.name,
        shiftName: "Evening",
        clockIn: clockIn.toISOString(),
        clockOut: clockOut.toISOString(),
        hoursWorked: Math.round(hoursWorked * 100) / 100,
        isLate,
      });
    });
    
    // Aggregate monthly data
    if (!monthlyAggregates.has(monthKey)) {
      monthlyAggregates.set(monthKey, {
        totalRevenue: 0,
        transactionCount: 0,
        cashAmount: 0,
        qrisAmount: 0,
        itemSales: new Map<string, { quantity: number; revenue: number }>(),
        employeeHours: new Map<string, { hours: number; lateCount: number }>(),
      });
    }
    
    const monthData = monthlyAggregates.get(monthKey)!;
    monthData.totalRevenue += totalRevenue;
    monthData.transactionCount += txCount;
    monthData.cashAmount += cashAmount;
    monthData.qrisAmount += qrisAmount;
    
    // Aggregate item sales
    topItems.forEach((item, idx) => {
      const salesFrequency = 1 / (idx + 1);
      const quantity = Math.max(1, Math.floor(txCount * salesFrequency * (0.1 + Math.random() * 0.05)));
      const revenue = quantity * item.price;
      
      if (!monthData.itemSales.has(item.id)) {
        monthData.itemSales.set(item.id, { quantity: 0, revenue: 0 });
      }
      const itemData = monthData.itemSales.get(item.id)!;
      itemData.quantity += quantity;
      itemData.revenue += revenue;
    });
    
    // Aggregate employee hours
    [...shift1Employees, ...shift2Employees].forEach(emp => {
      if (!monthData.employeeHours.has(emp.id)) {
        monthData.employeeHours.set(emp.id, { hours: 0, lateCount: 0 });
      }
      const empData = monthData.employeeHours.get(emp.id)!;
      empData.hours += 8;
      if (Math.random() < 0.05) empData.lateCount += 1;
    });
    
    currentDate = addDays(currentDate, 1);
  }
  
  // Generate monthly summaries
  monthlyAggregates.forEach((data, monthKey) => {
    monthlySalesSummary.push({
      id: `mss_${monthKey}`,
      month: monthKey,
      totalRevenue: Math.round(data.totalRevenue),
      transactionCount: data.transactionCount,
      cashAmount: Math.round(data.cashAmount),
      qrisAmount: Math.round(data.qrisAmount),
    });
    
    // Monthly item sales
    data.itemSales.forEach((itemData, itemId) => {
      const item = items.find(i => i.id === itemId);
      if (item) {
        monthlyItemSales.push({
          id: `mis_${monthKey}_${itemId}`,
          month: monthKey,
          itemId,
          itemName: item.name,
          quantity: itemData.quantity,
          revenue: Math.round(itemData.revenue),
        });
      }
    });
    
    // Monthly attendance summary
    data.employeeHours.forEach((empData, empId) => {
      const employee = employees.find(e => e.id === empId);
      if (employee) {
        monthlyAttendanceSummary.push({
          id: `mas_${monthKey}_${empId}`,
          month: monthKey,
          employeeId: empId,
          employeeName: employee.name,
          totalHours: empData.hours,
          lateCount: empData.lateCount,
        });
      }
    });
  });
  
  // Keep only last 60 days of shifts
  const sixtyDaysAgo = addDays(endDate, -60);
  const recentShifts = shifts.filter(s => new Date(s.shiftStart) >= sixtyDaysAgo);
  
  return {
    dailyItemSales,
    dailyPaymentSales,
    dailyAttendance,
    monthlyItemSales,
    monthlySalesSummary,
    monthlyAttendanceSummary,
    shifts: recentShifts,
  };
}

// Calculate SHA-256 checksum
async function calculateChecksum(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Main generation function
async function generateBackup() {
  console.log("🚀 Starting backup generation...");
  
  // Generate master data
  const items = generateItems();
  const employees = generateEmployees();
  
  console.log(`✅ Generated ${items.length} items`);
  console.log(`✅ Generated ${employees.length} employees`);
  
  // Generate 26 months of data (Dec 2023 - Feb 2026)
  const startDate = new Date("2023-12-01");
  const endDate = new Date("2026-02-02");
  
  console.log("📊 Generating summary data for 26 months...");
  const summaryData = generateSummaryData(startDate, endDate, items, employees);
  
  console.log(`✅ Generated ${summaryData.dailyItemSales.length} daily item sales records`);
  console.log(`✅ Generated ${summaryData.dailyPaymentSales.length} daily payment records`);
  console.log(`✅ Generated ${summaryData.dailyAttendance.length} daily attendance records`);
  console.log(`✅ Generated ${summaryData.monthlyItemSales.length} monthly item sales records`);
  console.log(`✅ Generated ${summaryData.monthlySalesSummary.length} monthly summaries`);
  console.log(`✅ Generated ${summaryData.shifts.length} recent shifts (last 60 days)`);
  
  // Create backup data object
  const backupData = {
    items,
    employees,
    categories,
    settings,
    shifts: summaryData.shifts,
    dailyItemSales: summaryData.dailyItemSales,
    dailyPaymentSales: summaryData.dailyPaymentSales,
    dailyAttendance: summaryData.dailyAttendance,
    monthlyItemSales: summaryData.monthlyItemSales,
    monthlySalesSummary: summaryData.monthlySalesSummary,
    monthlyAttendanceSummary: summaryData.monthlyAttendanceSummary,
  };
  
  // Calculate checksum
  const jsonString = JSON.stringify(backupData);
  const checksum = await calculateChecksum(jsonString);
  
  // Create metadata
  const metadata: BackupMetadata = {
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    deviceId: "device_backup_generator",
    dataSize: jsonString.length,
    checksum,
    status: "verified",
    itemCount: items.length,
    employeeCount: employees.length,
  };
  
  // Final backup structure
  const finalBackup = {
    metadata,
    ...backupData,
  };
  
  console.log("💾 Creating downloadable file...");
  
  // Compress with gzip using pako
  const finalJsonString = JSON.stringify(finalBackup);
  const compressed = pako.gzip(finalJsonString);
  
  // Create blob and download
  const blob = new Blob([compressed], { type: "application/gzip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "backup_last_known_good.json.gz";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  console.log("✅ Backup file generated successfully!");
  console.log(`📦 Compressed size: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`📦 Original size: ${(finalJsonString.length / 1024 / 1024).toFixed(2)} MB`);
  console.log(`🔐 Checksum: ${checksum}`);
  
  return finalBackup;
}

// Export for use
export { generateBackup };