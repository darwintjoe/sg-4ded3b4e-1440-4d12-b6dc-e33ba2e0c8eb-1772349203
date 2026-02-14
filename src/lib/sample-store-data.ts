/**
 * Sample Store Data for Direct Injection
 * Pre-generated realistic 26-month store data
 * Bypasses restore function for immediate testing
 */

import type { Item, Employee, Category, Settings } from "@/types";

// Indonesian convenience store items database (200 SKUs)
export const sampleItems: Omit<Item, "id">[] = [
  // Beverages (40 items)
  { name: "Aqua 600ml", nameId: "Aqua 600ml", nameZh: "Aqua矿泉水600ml", price: 3500, categoryId: "beverages", sku: "8991001010101", stock: 50, imageUrl: undefined, isActive: true },
  { name: "Coca Cola 390ml", nameId: "Coca Cola 390ml", nameZh: "可口可乐390ml", price: 6000, categoryId: "beverages", sku: "8991001010102", stock: 45, imageUrl: undefined, isActive: true },
  { name: "Teh Botol Sosro 450ml", nameId: "Teh Botol Sosro 450ml", nameZh: "Sosro茶450ml", price: 5000, categoryId: "beverages", sku: "8991001010103", stock: 60, imageUrl: undefined, isActive: true },
  { name: "Fanta Orange 390ml", nameId: "Fanta Orange 390ml", nameZh: "芬达橙汁390ml", price: 6000, categoryId: "beverages", sku: "8991001010104", stock: 40, imageUrl: undefined, isActive: true },
  { name: "Sprite 390ml", nameId: "Sprite 390ml", nameZh: "雪碧390ml", price: 6000, categoryId: "beverages", sku: "8991001010105", stock: 42, imageUrl: undefined, isActive: true },
  { name: "Pocari Sweat 500ml", nameId: "Pocari Sweat 500ml", nameZh: "宝矿力500ml", price: 9000, categoryId: "beverages", sku: "8991001010106", stock: 35, imageUrl: undefined, isActive: true },
  { name: "Mizone 500ml", nameId: "Mizone 500ml", nameZh: "脉动500ml", price: 7000, categoryId: "beverages", sku: "8991001010107", stock: 38, imageUrl: undefined, isActive: true },
  { name: "Le Minerale 600ml", nameId: "Le Minerale 600ml", nameZh: "Le Minerale矿泉水", price: 3000, categoryId: "beverages", sku: "8991001010108", stock: 55, imageUrl: undefined, isActive: true },
  { name: "Ades 600ml", nameId: "Ades 600ml", nameZh: "Ades矿泉水", price: 3000, categoryId: "beverages", sku: "8991001010109", stock: 52, imageUrl: undefined, isActive: true },
  { name: "Teh Pucuk Harum 350ml", nameId: "Teh Pucuk Harum 350ml", nameZh: "茶叶香350ml", price: 4000, categoryId: "beverages", sku: "8991001010110", stock: 48, imageUrl: undefined, isActive: true },
  { name: "Frestea 350ml", nameId: "Frestea 350ml", nameZh: "Frestea茶350ml", price: 4500, categoryId: "beverages", sku: "8991001010111", stock: 44, imageUrl: undefined, isActive: true },
  { name: "Fruit Tea 350ml", nameId: "Fruit Tea 350ml", nameZh: "水果茶350ml", price: 5000, categoryId: "beverages", sku: "8991001010112", stock: 41, imageUrl: undefined, isActive: true },
  { name: "ABC Kopi Susu 200ml", nameId: "ABC Kopi Susu 200ml", nameZh: "ABC咖啡牛奶", price: 6500, categoryId: "beverages", sku: "8991001010113", stock: 30, imageUrl: undefined, isActive: true },
  { name: "Good Day Cappuccino", nameId: "Good Day Cappuccino", nameZh: "好日子卡布奇诺", price: 2500, categoryId: "beverages", sku: "8991001010114", stock: 70, imageUrl: undefined, isActive: true },
  { name: "Kapal Api Special", nameId: "Kapal Api Special", nameZh: "船牌咖啡", price: 2000, categoryId: "beverages", sku: "8991001010115", stock: 80, imageUrl: undefined, isActive: true },
  { name: "Nescafe Classic", nameId: "Nescafe Classic", nameZh: "雀巢咖啡", price: 2500, categoryId: "beverages", sku: "8991001010116", stock: 65, imageUrl: undefined, isActive: true },
  { name: "Energen Vanilla", nameId: "Energen Vanilla", nameZh: "Energen香草", price: 3000, categoryId: "beverages", sku: "8991001010117", stock: 55, imageUrl: undefined, isActive: true },
  { name: "Milo UHT 180ml", nameId: "Milo UHT 180ml", nameZh: "美禄180ml", price: 6000, categoryId: "beverages", sku: "8991001010118", stock: 40, imageUrl: undefined, isActive: true },
  { name: "Pepsi 390ml", nameId: "Pepsi 390ml", nameZh: "百事可乐390ml", price: 6000, categoryId: "beverages", sku: "8991001010119", stock: 38, imageUrl: undefined, isActive: true },
  { name: "Mountea Green Tea", nameId: "Mountea Green Tea", nameZh: "绿茶", price: 4500, categoryId: "beverages", sku: "8991001010120", stock: 46, imageUrl: undefined, isActive: true },
  { name: "Tebs Sparkling Tea", nameId: "Tebs Sparkling Tea", nameZh: "气泡茶", price: 7000, categoryId: "beverages", sku: "8991001010121", stock: 32, imageUrl: undefined, isActive: true },
  { name: "Hydro Coco 250ml", nameId: "Hydro Coco 250ml", nameZh: "椰子水250ml", price: 8000, categoryId: "beverages", sku: "8991001010122", stock: 28, imageUrl: undefined, isActive: true },
  { name: "Kopiko Coffee Candy", nameId: "Kopiko Coffee Candy", nameZh: "咖啡糖", price: 5000, categoryId: "beverages", sku: "8991001010123", stock: 50, imageUrl: undefined, isActive: true },
  { name: "Nescafe 3in1 Original", nameId: "Nescafe 3in1 Original", nameZh: "雀巢三合一", price: 2500, categoryId: "beverages", sku: "8991001010124", stock: 75, imageUrl: undefined, isActive: true },
  { name: "ABC Susu Soda 190ml", nameId: "ABC Susu Soda 190ml", nameZh: "ABC苏打奶", price: 5500, categoryId: "beverages", sku: "8991001010125", stock: 34, imageUrl: undefined, isActive: true },
  { name: "Pulpy Orange 350ml", nameId: "Pulpy Orange 350ml", nameZh: "果粒橙350ml", price: 7000, categoryId: "beverages", sku: "8991001010126", stock: 36, imageUrl: undefined, isActive: true },
  { name: "Minute Maid Pulpy 350ml", nameId: "Minute Maid Pulpy 350ml", nameZh: "美汁源350ml", price: 7000, categoryId: "beverages", sku: "8991001010127", stock: 35, imageUrl: undefined, isActive: true },
  { name: "Cleo Water 600ml", nameId: "Cleo Water 600ml", nameZh: "Cleo矿泉水", price: 3500, categoryId: "beverages", sku: "8991001010128", stock: 58, imageUrl: undefined, isActive: true },
  { name: "Pristine Water 600ml", nameId: "Pristine Water 600ml", nameZh: "Pristine矿泉水", price: 4000, categoryId: "beverages", sku: "8991001010129", stock: 50, imageUrl: undefined, isActive: true },
  { name: "You C1000 140ml", nameId: "You C1000 140ml", nameZh: "维生素C饮料", price: 8000, categoryId: "beverages", sku: "8991001010130", stock: 25, imageUrl: undefined, isActive: true },
  { name: "Kratingdaeng 150ml", nameId: "Kratingdaeng 150ml", nameZh: "红牛150ml", price: 9000, categoryId: "beverages", sku: "8991001010131", stock: 22, imageUrl: undefined, isActive: true },
  { name: "Extra Joss Sachet", nameId: "Extra Joss Sachet", nameZh: "能量饮料包", price: 3000, categoryId: "beverages", sku: "8991001010132", stock: 60, imageUrl: undefined, isActive: true },
  { name: "Hemaviton Energy", nameId: "Hemaviton Energy", nameZh: "能量饮料", price: 3500, categoryId: "beverages", sku: "8991001010133", stock: 55, imageUrl: undefined, isActive: true },
  { name: "Kuku Bima TL", nameId: "Kuku Bima TL", nameZh: "Kuku Bima能量", price: 2500, categoryId: "beverages", sku: "8991001010134", stock: 70, imageUrl: undefined, isActive: true },
  { name: "Bear Brand 189ml", nameId: "Bear Brand 189ml", nameZh: "熊牌牛奶189ml", price: 10000, categoryId: "beverages", sku: "8991001010135", stock: 20, imageUrl: undefined, isActive: true },
  { name: "Ultramilk Coklat 200ml", nameId: "Ultramilk Coklat 200ml", nameZh: "巧克力奶200ml", price: 7000, categoryId: "beverages", sku: "8991001010136", stock: 32, imageUrl: undefined, isActive: true },
  { name: "Indomilk UHT 190ml", nameId: "Indomilk UHT 190ml", nameZh: "印尼牛奶190ml", price: 6000, categoryId: "beverages", sku: "8991001010137", stock: 38, imageUrl: undefined, isActive: true },
  { name: "Frisian Flag Susu 225ml", nameId: "Frisian Flag Susu 225ml", nameZh: "荷兰牛奶225ml", price: 7500, categoryId: "beverages", sku: "8991001010138", stock: 30, imageUrl: undefined, isActive: true },
  { name: "Yakult 5pack", nameId: "Yakult 5pack", nameZh: "养乐多5瓶", price: 12000, categoryId: "beverages", sku: "8991001010139", stock: 18, imageUrl: undefined, isActive: true },
  { name: "Cimory Yogurt Drink", nameId: "Cimory Yogurt Drink", nameZh: "酸奶饮料", price: 8500, categoryId: "beverages", sku: "8991001010140", stock: 26, imageUrl: undefined, isActive: true },

  // Snacks (40 items)
  { name: "Chitato Sapi Panggang 68g", nameId: "Chitato Sapi Panggang 68g", nameZh: "奇多烤牛肉味68g", price: 12000, categoryId: "snacks", sku: "8991001020101", stock: 35, imageUrl: undefined, isActive: true },
  { name: "Cheetos Jagung Bakar", nameId: "Cheetos Jagung Bakar", nameZh: "奇多烤玉米", price: 10000, categoryId: "snacks", sku: "8991001020102", stock: 40, imageUrl: undefined, isActive: true },
  { name: "Lays Rumput Laut", nameId: "Lays Rumput Laut", nameZh: "乐事海苔味", price: 11000, categoryId: "snacks", sku: "8991001020103", stock: 38, imageUrl: undefined, isActive: true },
  { name: "Doritos Nacho Cheese", nameId: "Doritos Nacho Cheese", nameZh: "多力多滋芝士味", price: 13000, categoryId: "snacks", sku: "8991001020104", stock: 32, imageUrl: undefined, isActive: true },
  { name: "Pringles Original 107g", nameId: "Pringles Original 107g", nameZh: "品客原味107g", price: 25000, categoryId: "snacks", sku: "8991001020105", stock: 20, imageUrl: undefined, isActive: true },
  { name: "Taro Net 160g", nameId: "Taro Net 160g", nameZh: "太郎薯片160g", price: 15000, categoryId: "snacks", sku: "8991001020106", stock: 28, imageUrl: undefined, isActive: true },
  { name: "Beng Beng Chocolate", nameId: "Beng Beng Chocolate", nameZh: "Beng Beng巧克力", price: 2500, categoryId: "snacks", sku: "8991001020107", stock: 80, imageUrl: undefined, isActive: true },
  { name: "Top Coffee Candy", nameId: "Top Coffee Candy", nameZh: "Top咖啡糖", price: 3000, categoryId: "snacks", sku: "8991001020108", stock: 70, imageUrl: undefined, isActive: true },
  { name: "Yupi Gummy Candy", nameId: "Yupi Gummy Candy", nameZh: "Yupi软糖", price: 4000, categoryId: "snacks", sku: "8991001020109", stock: 60, imageUrl: undefined, isActive: true },
  { name: "Kis Candy Mint", nameId: "Kis Candy Mint", nameZh: "Kis薄荷糖", price: 2000, categoryId: "snacks", sku: "8991001020110", stock: 90, imageUrl: undefined, isActive: true },
  { name: "Relaxa Biscuit", nameId: "Relaxa Biscuit", nameZh: "Relaxa饼干", price: 3500, categoryId: "snacks", sku: "8991001020111", stock: 65, imageUrl: undefined, isActive: true },
  { name: "Roma Kelapa 300g", nameId: "Roma Kelapa 300g", nameZh: "Roma椰子饼300g", price: 9000, categoryId: "snacks", sku: "8991001020112", stock: 42, imageUrl: undefined, isActive: true },
  { name: "Oreo Original 137g", nameId: "Oreo Original 137g", nameZh: "奥利奥原味137g", price: 13000, categoryId: "snacks", sku: "8991001020113", stock: 35, imageUrl: undefined, isActive: true },
  { name: "Better Chocolate", nameId: "Better Chocolate", nameZh: "Better巧克力", price: 5000, categoryId: "snacks", sku: "8991001020114", stock: 55, imageUrl: undefined, isActive: true },
  { name: "Richeese Nabati", nameId: "Richeese Nabati", nameZh: "Richeese芝士", price: 3000, categoryId: "snacks", sku: "8991001020115", stock: 75, imageUrl: undefined, isActive: true },
  { name: "Tango Wafer Chocolate", nameId: "Tango Wafer Chocolate", nameZh: "探戈威化巧克力", price: 2500, categoryId: "snacks", sku: "8991001020116", stock: 80, imageUrl: undefined, isActive: true },
  { name: "Selamat Crackers", nameId: "Selamat Crackers", nameZh: "Selamat饼干", price: 4000, categoryId: "snacks", sku: "8991001020117", stock: 60, imageUrl: undefined, isActive: true },
  { name: "Good Time Cookies", nameId: "Good Time Cookies", nameZh: "好时光曲奇", price: 7000, categoryId: "snacks", sku: "8991001020118", stock: 45, imageUrl: undefined, isActive: true },
  { name: "Khong Guan Kaleng", nameId: "Khong Guan Kaleng", nameZh: "康元饼干罐", price: 35000, categoryId: "snacks", sku: "8991001020119", stock: 15, imageUrl: undefined, isActive: true },
  { name: "Monde Butter Cookies", nameId: "Monde Butter Cookies", nameZh: "Monde黄油饼干", price: 12000, categoryId: "snacks", sku: "8991001020120", stock: 32, imageUrl: undefined, isActive: true },
  { name: "Nissin Wafer Roll", nameId: "Nissin Wafer Roll", nameZh: "日清威化卷", price: 6000, categoryId: "snacks", sku: "8991001020121", stock: 50, imageUrl: undefined, isActive: true },
  { name: "SilverQueen Chunky Bar", nameId: "SilverQueen Chunky Bar", nameZh: "银皇后巧克力", price: 15000, categoryId: "snacks", sku: "8991001020122", stock: 28, imageUrl: undefined, isActive: true },
  { name: "Cadbury Dairy Milk", nameId: "Cadbury Dairy Milk", nameZh: "吉百利牛奶巧克力", price: 18000, categoryId: "snacks", sku: "8991001020123", stock: 24, imageUrl: undefined, isActive: true },
  { name: "KitKat Chunky", nameId: "KitKat Chunky", nameZh: "奇巧巧克力", price: 12000, categoryId: "snacks", sku: "8991001020124", stock: 30, imageUrl: undefined, isActive: true },
  { name: "Snickers Bar", nameId: "Snickers Bar", nameZh: "士力架", price: 10000, categoryId: "snacks", sku: "8991001020125", stock: 35, imageUrl: undefined, isActive: true },
  { name: "Mentos Mint Roll", nameId: "Mentos Mint Roll", nameZh: "曼妥思薄荷糖", price: 7000, categoryId: "snacks", sku: "8991001020126", stock: 45, imageUrl: undefined, isActive: true },
  { name: "Halls Candy", nameId: "Halls Candy", nameZh: "Halls糖", price: 5000, categoryId: "snacks", sku: "8991001020127", stock: 55, imageUrl: undefined, isActive: true },
  { name: "Sugus Assorted", nameId: "Sugus Assorted", nameZh: "瑞士糖", price: 8000, categoryId: "snacks", sku: "8991001020128", stock: 40, imageUrl: undefined, isActive: true },
  { name: "Choki Choki Chocolate", nameId: "Choki Choki Chocolate", nameZh: "Choki Choki巧克力", price: 2000, categoryId: "snacks", sku: "8991001020129", stock: 95, imageUrl: undefined, isActive: true },
  { name: "Malkist Crackers", nameId: "Malkist Crackers", nameZh: "Malkist饼干", price: 4500, categoryId: "snacks", sku: "8991001020130", stock: 58, imageUrl: undefined, isActive: true },
  { name: "Hup Seng Cream Cracker", nameId: "Hup Seng Cream Cracker", nameZh: "合成奶油饼干", price: 8000, categoryId: "snacks", sku: "8991001020131", stock: 42, imageUrl: undefined, isActive: true },
  { name: "Biskuat Chocolate", nameId: "Biskuat Chocolate", nameZh: "Biskuat巧克力", price: 5000, categoryId: "snacks", sku: "8991001020132", stock: 52, imageUrl: undefined, isActive: true },
  { name: "Astor Wafer Stick", nameId: "Astor Wafer Stick", nameZh: "Astor威化棒", price: 6500, categoryId: "snacks", sku: "8991001020133", stock: 48, imageUrl: undefined, isActive: true },
  { name: "JetZ Crackers", nameId: "JetZ Crackers", nameZh: "JetZ饼干", price: 3500, categoryId: "snacks", sku: "8991001020134", stock: 68, imageUrl: undefined, isActive: true },
  { name: "Kacang Garuda 200g", nameId: "Kacang Garuda 200g", nameZh: "鹰牌花生200g", price: 18000, categoryId: "snacks", sku: "8991001020135", stock: 22, imageUrl: undefined, isActive: true },
  { name: "Dua Kelinci Kacang", nameId: "Dua Kelinci Kacang", nameZh: "双兔花生", price: 15000, categoryId: "snacks", sku: "8991001020136", stock: 26, imageUrl: undefined, isActive: true },
  { name: "Simba BBQ Chips", nameId: "Simba BBQ Chips", nameZh: "Simba烧烤薯片", price: 10000, categoryId: "snacks", sku: "8991001020137", stock: 38, imageUrl: undefined, isActive: true },
  { name: "Qtela Singkong", nameId: "Qtela Singkong", nameZh: "木薯片", price: 9000, categoryId: "snacks", sku: "8991001020138", stock: 40, imageUrl: undefined, isActive: true },
  { name: "Maicih Keripik Pedas", nameId: "Maicih Keripik Pedas", nameZh: "辣味薯片", price: 12000, categoryId: "snacks", sku: "8991001020139", stock: 32, imageUrl: undefined, isActive: true },
  { name: "Kusuka Snack", nameId: "Kusuka Snack", nameZh: "Kusuka零食", price: 5000, categoryId: "snacks", sku: "8991001020140", stock: 55, imageUrl: undefined, isActive: true },

  // Instant Noodles (30 items)
  { name: "Indomie Goreng", nameId: "Indomie Goreng", nameZh: "营多捞面", price: 3000, categoryId: "noodles", sku: "8991001030101", stock: 100, imageUrl: undefined, isActive: true },
  { name: "Indomie Soto", nameId: "Indomie Soto", nameZh: "营多汤面", price: 3000, categoryId: "noodles", sku: "8991001030102", stock: 95, imageUrl: undefined, isActive: true },
  { name: "Indomie Ayam Bawang", nameId: "Indomie Ayam Bawang", nameZh: "营多鸡肉面", price: 3000, categoryId: "noodles", sku: "8991001030103", stock: 98, imageUrl: undefined, isActive: true },
  { name: "Mie Sedaap Goreng", nameId: "Mie Sedaap Goreng", nameZh: "Sedaap捞面", price: 3500, categoryId: "noodles", sku: "8991001030104", stock: 85, imageUrl: undefined, isActive: true },
  { name: "Mie Sedaap Kari", nameId: "Mie Sedaap Kari", nameZh: "Sedaap咖喱面", price: 3500, categoryId: "noodles", sku: "8991001030105", stock: 82, imageUrl: undefined, isActive: true },
  { name: "Supermi Ayam Bawang", nameId: "Supermi Ayam Bawang", nameZh: "超级鸡肉面", price: 2500, categoryId: "noodles", sku: "8991001030106", stock: 105, imageUrl: undefined, isActive: true },
  { name: "Pop Mie Rasa Ayam", nameId: "Pop Mie Rasa Ayam", nameZh: "Pop Mie鸡肉杯面", price: 5000, categoryId: "noodles", sku: "8991001030107", stock: 60, imageUrl: undefined, isActive: true },
  { name: "Mie Gelas", nameId: "Mie Gelas", nameZh: "杯面", price: 4000, categoryId: "noodles", sku: "8991001030108", stock: 70, imageUrl: undefined, isActive: true },
  { name: "Sarimi Soto", nameId: "Sarimi Soto", nameZh: "Sarimi汤面", price: 2500, categoryId: "noodles", sku: "8991001030109", stock: 92, imageUrl: undefined, isActive: true },
  { name: "Lemonilo Mie Goreng", nameId: "Lemonilo Mie Goreng", nameZh: "健康捞面", price: 5000, categoryId: "noodles", sku: "8991001030110", stock: 45, imageUrl: undefined, isActive: true },
  { name: "Nissin Cup Noodles", nameId: "Nissin Cup Noodles", nameZh: "日清杯面", price: 8000, categoryId: "noodles", sku: "8991001030111", stock: 35, imageUrl: undefined, isActive: true },
  { name: "Indomie 5pcs Pack", nameId: "Indomie 5pcs Pack", nameZh: "营多5包装", price: 13000, categoryId: "noodles", sku: "8991001030112", stock: 50, imageUrl: undefined, isActive: true },
  { name: "ABC Saus Sambal 335ml", nameId: "ABC Saus Sambal 335ml", nameZh: "ABC辣椒酱335ml", price: 18000, categoryId: "noodles", sku: "8991001030113", stock: 25, imageUrl: undefined, isActive: true },
  { name: "Kecap Bango 220ml", nameId: "Kecap Bango 220ml", nameZh: "甜酱油220ml", price: 12000, categoryId: "noodles", sku: "8991001030114", stock: 30, imageUrl: undefined, isActive: true },
  { name: "Sasa Bumbu Penyedap", nameId: "Sasa Bumbu Penyedap", nameZh: "调味料", price: 1500, categoryId: "noodles", sku: "8991001030115", stock: 120, imageUrl: undefined, isActive: true },
  { name: "Royco Ayam Sachet", nameId: "Royco Ayam Sachet", nameZh: "鸡肉调料包", price: 1000, categoryId: "noodles", sku: "8991001030116", stock: 150, imageUrl: undefined, isActive: true },
  { name: "Masako Sapi Sachet", nameId: "Masako Sapi Sachet", nameZh: "牛肉调料包", price: 1000, categoryId: "noodles", sku: "8991001030117", stock: 145, imageUrl: undefined, isActive: true },
  { name: "Kecap ABC Manis 135ml", nameId: "Kecap ABC Manis 135ml", nameZh: "ABC甜酱油135ml", price: 8000, categoryId: "noodles", sku: "8991001030118", stock: 38, imageUrl: undefined, isActive: true },
  { name: "Mayones Maestro 200ml", nameId: "Mayones Maestro 200ml", nameZh: "美乃滋200ml", price: 15000, categoryId: "noodles", sku: "8991001030119", stock: 22, imageUrl: undefined, isActive: true },
  { name: "Indofood Sambal Botol", nameId: "Indofood Sambal Botol", nameZh: "印尼辣椒酱", price: 14000, categoryId: "noodles", sku: "8991001030120", stock: 28, imageUrl: undefined, isActive: true },
  { name: "Beras Premium 5kg", nameId: "Beras Premium 5kg", nameZh: "优质大米5公斤", price: 85000, categoryId: "noodles", sku: "8991001030121", stock: 12, imageUrl: undefined, isActive: true },
  { name: "Gulaku Gula 1kg", nameId: "Gulaku Gula 1kg", nameZh: "白糖1公斤", price: 15000, categoryId: "noodles", sku: "8991001030122", stock: 40, imageUrl: undefined, isActive: true },
  { name: "Bimoli Minyak 1L", nameId: "Bimoli Minyak 1L", nameZh: "食用油1升", price: 25000, categoryId: "noodles", sku: "8991001030123", stock: 35, imageUrl: undefined, isActive: true },
  { name: "Kopi ABC Susu Kaleng", nameId: "Kopi ABC Susu Kaleng", nameZh: "ABC咖啡牛奶罐装", price: 9000, categoryId: "noodles", sku: "8991001030124", stock: 45, imageUrl: undefined, isActive: true },
  { name: "Tepung Terigu Segitiga", nameId: "Tepung Terigu Segitiga", nameZh: "三角面粉", price: 12000, categoryId: "noodles", sku: "8991001030125", stock: 32, imageUrl: undefined, isActive: true },
  { name: "Garam Beryodium", nameId: "Garam Beryodium", nameZh: "碘盐", price: 3000, categoryId: "noodles", sku: "8991001030126", stock: 80, imageUrl: undefined, isActive: true },
  { name: "Telur Ayam 10pcs", nameId: "Telur Ayam 10pcs", nameZh: "鸡蛋10个", price: 28000, categoryId: "noodles", sku: "8991001030127", stock: 25, imageUrl: undefined, isActive: true },
  { name: "Kornet Pronas 198g", nameId: "Kornet Pronas 198g", nameZh: "罐头牛肉198g", price: 22000, categoryId: "noodles", sku: "8991001030128", stock: 18, imageUrl: undefined, isActive: true },
  { name: "Sarden ABC 155g", nameId: "Sarden ABC 155g", nameZh: "ABC沙丁鱼155g", price: 15000, categoryId: "noodles", sku: "8991001030129", stock: 28, imageUrl: undefined, isActive: true },
  { name: "Susu Kental Manis", nameId: "Susu Kental Manis", nameZh: "炼乳", price: 12000, categoryId: "noodles", sku: "8991001030130", stock: 35, imageUrl: undefined, isActive: true },

  // Personal Care (25 items)
  { name: "Pepsodent 190g", nameId: "Pepsodent 190g", nameZh: "Pepsodent牙膏190g", price: 12000, categoryId: "personal_care", sku: "8991001040101", stock: 40, imageUrl: undefined, isActive: true },
  { name: "Close Up 160g", nameId: "Close Up 160g", nameZh: "Close Up牙膏160g", price: 14000, categoryId: "personal_care", sku: "8991001040102", stock: 35, imageUrl: undefined, isActive: true },
  { name: "Sensodyne 100g", nameId: "Sensodyne 100g", nameZh: "舒适达牙膏100g", price: 35000, categoryId: "personal_care", sku: "8991001040103", stock: 15, imageUrl: undefined, isActive: true },
  { name: "Sikat Gigi Formula", nameId: "Sikat Gigi Formula", nameZh: "牙刷", price: 8000, categoryId: "personal_care", sku: "8991001040104", stock: 50, imageUrl: undefined, isActive: true },
  { name: "Listerine 250ml", nameId: "Listerine 250ml", nameZh: "李施德林250ml", price: 28000, categoryId: "personal_care", sku: "8991001040105", stock: 20, imageUrl: undefined, isActive: true },
  { name: "Clear Shampoo 170ml", nameId: "Clear Shampoo 170ml", nameZh: "清扬洗发水170ml", price: 18000, categoryId: "personal_care", sku: "8991001040106", stock: 30, imageUrl: undefined, isActive: true },
  { name: "Pantene Shampoo 170ml", nameId: "Pantene Shampoo 170ml", nameZh: "潘婷洗发水170ml", price: 22000, categoryId: "personal_care", sku: "8991001040107", stock: 28, imageUrl: undefined, isActive: true },
  { name: "Sunsilk Shampoo 170ml", nameId: "Sunsilk Shampoo 170ml", nameZh: "夏士莲洗发水170ml", price: 18000, categoryId: "personal_care", sku: "8991001040108", stock: 32, imageUrl: undefined, isActive: true },
  { name: "Lifebuoy Sabun 85g", nameId: "Lifebuoy Sabun 85g", nameZh: "卫宝香皂85g", price: 4000, categoryId: "personal_care", sku: "8991001040109", stock: 70, imageUrl: undefined, isActive: true },
  { name: "Lux Sabun 85g", nameId: "Lux Sabun 85g", nameZh: "力士香皂85g", price: 4500, categoryId: "personal_care", sku: "8991001040110", stock: 65, imageUrl: undefined, isActive: true },
  { name: "Dove Sabun 100g", nameId: "Dove Sabun 100g", nameZh: "多芬香皂100g", price: 9000, categoryId: "personal_care", sku: "8991001040111", stock: 40, imageUrl: undefined, isActive: true },
  { name: "Shinzui Body Lotion", nameId: "Shinzui Body Lotion", nameZh: "身体乳", price: 15000, categoryId: "personal_care", sku: "8991001040112", stock: 25, imageUrl: undefined, isActive: true },
  { name: "Vaseline Body Lotion", nameId: "Vaseline Body Lotion", nameZh: "凡士林身体乳", price: 25000, categoryId: "personal_care", sku: "8991001040113", stock: 18, imageUrl: undefined, isActive: true },
  { name: "Citra Handbody 120ml", nameId: "Citra Handbody 120ml", nameZh: "Citra身体乳120ml", price: 18000, categoryId: "personal_care", sku: "8991001040114", stock: 28, imageUrl: undefined, isActive: true },
  { name: "Marina Body Lotion", nameId: "Marina Body Lotion", nameZh: "Marina身体乳", price: 12000, categoryId: "personal_care", sku: "8991001040115", stock: 35, imageUrl: undefined, isActive: true },
  { name: "Rexona Roll On 45ml", nameId: "Rexona Roll On 45ml", nameZh: "Rexona止汗露45ml", price: 16000, categoryId: "personal_care", sku: "8991001040116", stock: 32, imageUrl: undefined, isActive: true },
  { name: "Biore Body Foam 450ml", nameId: "Biore Body Foam 450ml", nameZh: "碧柔沐浴露450ml", price: 32000, categoryId: "personal_care", sku: "8991001040117", stock: 20, imageUrl: undefined, isActive: true },
  { name: "Dettol Handwash 250ml", nameId: "Dettol Handwash 250ml", nameZh: "滴露洗手液250ml", price: 22000, categoryId: "personal_care", sku: "8991001040118", stock: 28, imageUrl: undefined, isActive: true },
  { name: "Gatsby Wax 75g", nameId: "Gatsby Wax 75g", nameZh: "发蜡75g", price: 25000, categoryId: "personal_care", sku: "8991001040119", stock: 22, imageUrl: undefined, isActive: true },
  { name: "Emina Sunscreen SPF30", nameId: "Emina Sunscreen SPF30", nameZh: "防晒霜SPF30", price: 35000, categoryId: "personal_care", sku: "8991001040120", stock: 18, imageUrl: undefined, isActive: true },
  { name: "Wardah Lipstick", nameId: "Wardah Lipstick", nameZh: "口红", price: 42000, categoryId: "personal_care", sku: "8991001040121", stock: 15, imageUrl: undefined, isActive: true },
  { name: "Pigeon Baby Powder", nameId: "Pigeon Baby Powder", nameZh: "婴儿爽身粉", price: 18000, categoryId: "personal_care", sku: "8991001040122", stock: 30, imageUrl: undefined, isActive: true },
  { name: "Cussons Baby Oil", nameId: "Cussons Baby Oil", nameZh: "婴儿油", price: 22000, categoryId: "personal_care", sku: "8991001040123", stock: 25, imageUrl: undefined, isActive: true },
  { name: "Zwitsal Baby Shampoo", nameId: "Zwitsal Baby Shampoo", nameZh: "婴儿洗发水", price: 28000, categoryId: "personal_care", sku: "8991001040124", stock: 22, imageUrl: undefined, isActive: true },
  { name: "Pembalut Charm 20pcs", nameId: "Pembalut Charm 20pcs", nameZh: "卫生巾20片", price: 18000, categoryId: "personal_care", sku: "8991001040125", stock: 35, imageUrl: undefined, isActive: true },

  // Household (20 items)
  { name: "Tissue Paseo 250s", nameId: "Tissue Paseo 250s", nameZh: "纸巾250张", price: 12000, categoryId: "household", sku: "8991001050101", stock: 45, imageUrl: undefined, isActive: true },
  { name: "Tissue Tessa 250s", nameId: "Tissue Tessa 250s", nameZh: "Tessa纸巾250张", price: 10000, categoryId: "household", sku: "8991001050102", stock: 50, imageUrl: undefined, isActive: true },
  { name: "Tissue Nice 250s", nameId: "Tissue Nice 250s", nameZh: "Nice纸巾250张", price: 8000, categoryId: "household", sku: "8991001050103", stock: 60, imageUrl: undefined, isActive: true },
  { name: "Tisu Toilet Paseo", nameId: "Tisu Toilet Paseo", nameZh: "卷纸", price: 15000, categoryId: "household", sku: "8991001050104", stock: 40, imageUrl: undefined, isActive: true },
  { name: "Rinso Detergent 900g", nameId: "Rinso Detergent 900g", nameZh: "奥妙洗衣粉900g", price: 28000, categoryId: "household", sku: "8991001050105", stock: 25, imageUrl: undefined, isActive: true },
  { name: "Rinso Cair 800ml", nameId: "Rinso Cair 800ml", nameZh: "奥妙洗衣液800ml", price: 32000, categoryId: "household", sku: "8991001050106", stock: 22, imageUrl: undefined, isActive: true },
  { name: "So Klin Powder 900g", nameId: "So Klin Powder 900g", nameZh: "洗衣粉900g", price: 25000, categoryId: "household", sku: "8991001050107", stock: 28, imageUrl: undefined, isActive: true },
  { name: "Molto Ultra 900ml", nameId: "Molto Ultra 900ml", nameZh: "柔顺剂900ml", price: 18000, categoryId: "household", sku: "8991001050108", stock: 35, imageUrl: undefined, isActive: true },
  { name: "Downy Parfum 900ml", nameId: "Downy Parfum 900ml", nameZh: "当妮柔顺剂900ml", price: 22000, categoryId: "household", sku: "8991001050109", stock: 30, imageUrl: undefined, isActive: true },
  { name: "Sunlight Pencuci 800ml", nameId: "Sunlight Pencuci 800ml", nameZh: "洗洁精800ml", price: 12000, categoryId: "household", sku: "8991001050110", stock: 48, imageUrl: undefined, isActive: true },
  { name: "Mama Lime 800ml", nameId: "Mama Lime 800ml", nameZh: "Mama Lime洗洁精", price: 10000, categoryId: "household", sku: "8991001050111", stock: 55, imageUrl: undefined, isActive: true },
  { name: "Vixal Pembersih 800ml", nameId: "Vixal Pembersih 800ml", nameZh: "清洁剂800ml", price: 14000, categoryId: "household", sku: "8991001050112", stock: 38, imageUrl: undefined, isActive: true },
  { name: "Harpic Toilet Cleaner", nameId: "Harpic Toilet Cleaner", nameZh: "马桶清洁剂", price: 18000, categoryId: "household", sku: "8991001050113", stock: 32, imageUrl: undefined, isActive: true },
  { name: "Baygon Aerosol 600ml", nameId: "Baygon Aerosol 600ml", nameZh: "拜耳杀虫剂600ml", price: 35000, categoryId: "household", sku: "8991001050114", stock: 20, imageUrl: undefined, isActive: true },
  { name: "Hit Aerosol 600ml", nameId: "Hit Aerosol 600ml", nameZh: "Hit杀虫剂600ml", price: 32000, categoryId: "household", sku: "8991001050115", stock: 22, imageUrl: undefined, isActive: true },
  { name: "Stella Pewangi 900ml", nameId: "Stella Pewangi 900ml", nameZh: "空气清新剂900ml", price: 15000, categoryId: "household", sku: "8991001050116", stock: 35, imageUrl: undefined, isActive: true },
  { name: "Kispray Pink 600ml", nameId: "Kispray Pink 600ml", nameZh: "空气清新喷雾600ml", price: 22000, categoryId: "household", sku: "8991001050117", stock: 28, imageUrl: undefined, isActive: true },
  { name: "Plastik Sampah Hitam", nameId: "Plastik Sampah Hitam", nameZh: "黑色垃圾袋", price: 12000, categoryId: "household", sku: "8991001050118", stock: 40, imageUrl: undefined, isActive: true },
  { name: "Plastik Kresek 1kg", nameId: "Plastik Kresek 1kg", nameZh: "塑料袋1公斤", price: 18000, categoryId: "household", sku: "8991001050119", stock: 32, imageUrl: undefined, isActive: true },
  { name: "Sapu Lidi", nameId: "Sapu Lidi", nameZh: "扫帚", price: 15000, categoryId: "household", sku: "8991001050120", stock: 25, imageUrl: undefined, isActive: true },

  // Cigarettes (15 items)
  { name: "Gudang Garam Filter", nameId: "Gudang Garam Filter", nameZh: "盐仓香烟过滤嘴", price: 28000, categoryId: "cigarettes", sku: "8991001060101", stock: 60, imageUrl: undefined, isActive: true },
  { name: "Sampoerna Mild", nameId: "Sampoerna Mild", nameZh: "三宝麟淡味", price: 32000, categoryId: "cigarettes", sku: "8991001060102", stock: 55, imageUrl: undefined, isActive: true },
  { name: "Djarum Super", nameId: "Djarum Super", nameZh: "针标超级", price: 25000, categoryId: "cigarettes", sku: "8991001060103", stock: 65, imageUrl: undefined, isActive: true },
  { name: "Marlboro Red", nameId: "Marlboro Red", nameZh: "万宝路红", price: 35000, categoryId: "cigarettes", sku: "8991001060104", stock: 45, imageUrl: undefined, isActive: true },
  { name: "LA Lights", nameId: "LA Lights", nameZh: "LA Lights香烟", price: 26000, categoryId: "cigarettes", sku: "8991001060105", stock: 58, imageUrl: undefined, isActive: true },
  { name: "Esse Change", nameId: "Esse Change", nameZh: "爱喜香烟", price: 28000, categoryId: "cigarettes", sku: "8991001060106", stock: 52, imageUrl: undefined, isActive: true },
  { name: "Dunhill Mild", nameId: "Dunhill Mild", nameZh: "登喜路淡味", price: 38000, categoryId: "cigarettes", sku: "8991001060107", stock: 40, imageUrl: undefined, isActive: true },
  { name: "Camel Filter", nameId: "Camel Filter", nameZh: "骆驼过滤嘴", price: 34000, categoryId: "cigarettes", sku: "8991001060108", stock: 42, imageUrl: undefined, isActive: true },
  { name: "Surya 12 Batang", nameId: "Surya 12 Batang", nameZh: "太阳12支", price: 20000, categoryId: "cigarettes", sku: "8991001060109", stock: 70, imageUrl: undefined, isActive: true },
  { name: "Dji Sam Soe 234", nameId: "Dji Sam Soe 234", nameZh: "叔公234", price: 30000, categoryId: "cigarettes", sku: "8991001060110", stock: 50, imageUrl: undefined, isActive: true },
  { name: "Magnum Mild", nameId: "Magnum Mild", nameZh: "万能淡味", price: 24000, categoryId: "cigarettes", sku: "8991001060111", stock: 62, imageUrl: undefined, isActive: true },
  { name: "Class Mild", nameId: "Class Mild", nameZh: "Class淡味", price: 22000, categoryId: "cigarettes", sku: "8991001060112", stock: 68, imageUrl: undefined, isActive: true },
  { name: "Star Mild", nameId: "Star Mild", nameZh: "Star淡味", price: 20000, categoryId: "cigarettes", sku: "8991001060113", stock: 72, imageUrl: undefined, isActive: true },
  { name: "U Mild", nameId: "U Mild", nameZh: "U淡味", price: 23000, categoryId: "cigarettes", sku: "8991001060114", stock: 65, imageUrl: undefined, isActive: true },
  { name: "Clas Mild Filter", nameId: "Clas Mild Filter", nameZh: "Clas过滤嘴", price: 21000, categoryId: "cigarettes", sku: "8991001060115", stock: 70, imageUrl: undefined, isActive: true },

  // Frozen & Dairy (15 items)
  { name: "Es Krim Wall's Cone", nameId: "Es Krim Wall's Cone", nameZh: "和路雪蛋筒", price: 8000, categoryId: "frozen", sku: "8991001070101", stock: 30, imageUrl: undefined, isActive: true },
  { name: "Es Krim Magnum", nameId: "Es Krim Magnum", nameZh: "梦龙冰淇淋", price: 18000, categoryId: "frozen", sku: "8991001070102", stock: 20, imageUrl: undefined, isActive: true },
  { name: "Paddle Pop Rainbow", nameId: "Paddle Pop Rainbow", nameZh: "彩虹冰棒", price: 5000, categoryId: "frozen", sku: "8991001070103", stock: 45, imageUrl: undefined, isActive: true },
  { name: "Aice Mochi", nameId: "Aice Mochi", nameZh: "Aice麻薯冰淇淋", price: 3000, categoryId: "frozen", sku: "8991001070104", stock: 60, imageUrl: undefined, isActive: true },
  { name: "Yogurt Cimory 120ml", nameId: "Yogurt Cimory 120ml", nameZh: "酸奶120ml", price: 7000, categoryId: "frozen", sku: "8991001070105", stock: 35, imageUrl: undefined, isActive: true },
  { name: "Keju Kraft Singles", nameId: "Keju Kraft Singles", nameZh: "芝士片", price: 35000, categoryId: "frozen", sku: "8991001070106", stock: 18, imageUrl: undefined, isActive: true },
  { name: "Keju Prochiz 180g", nameId: "Keju Prochiz 180g", nameZh: "奶酪180g", price: 28000, categoryId: "frozen", sku: "8991001070107", stock: 22, imageUrl: undefined, isActive: true },
  { name: "Mentega Blueband 200g", nameId: "Mentega Blueband 200g", nameZh: "黄油200g", price: 18000, categoryId: "frozen", sku: "8991001070108", stock: 30, imageUrl: undefined, isActive: true },
  { name: "Nugget Fiesta 500g", nameId: "Nugget Fiesta 500g", nameZh: "鸡块500g", price: 32000, categoryId: "frozen", sku: "8991001070109", stock: 25, imageUrl: undefined, isActive: true },
  { name: "Sosis So Nice 360g", nameId: "Sosis So Nice 360g", nameZh: "香肠360g", price: 28000, categoryId: "frozen", sku: "8991001070110", stock: 28, imageUrl: undefined, isActive: true },
  { name: "Bakso Belfoods 500g", nameId: "Bakso Belfoods 500g", nameZh: "肉丸500g", price: 25000, categoryId: "frozen", sku: "8991001070111", stock: 30, imageUrl: undefined, isActive: true },
  { name: "Dimsum Frozen 250g", nameId: "Dimsum Frozen 250g", nameZh: "冷冻点心250g", price: 35000, categoryId: "frozen", sku: "8991001070112", stock: 22, imageUrl: undefined, isActive: true },
  { name: "Fries McCain 400g", nameId: "Fries McCain 400g", nameZh: "薯条400g", price: 28000, categoryId: "frozen", sku: "8991001070113", stock: 26, imageUrl: undefined, isActive: true },
  { name: "Es Batu Kristal 1kg", nameId: "Es Batu Kristal 1kg", nameZh: "冰块1公斤", price: 8000, categoryId: "frozen", sku: "8991001070114", stock: 50, imageUrl: undefined, isActive: true },
  { name: "Susu UHT Indomilk 1L", nameId: "Susu UHT Indomilk 1L", nameZh: "UHT牛奶1升", price: 18000, categoryId: "frozen", sku: "8991001070115", stock: 32, imageUrl: undefined, isActive: true },

  // Health/Medicine (15 items)
  { name: "Paracetamol 500mg Strip", nameId: "Paracetamol 500mg Strip", nameZh: "扑热息痛500mg", price: 3000, categoryId: "health", sku: "8991001080101", stock: 80, imageUrl: undefined, isActive: true },
  { name: "Bodrex Extra 4tabs", nameId: "Bodrex Extra 4tabs", nameZh: "Bodrex止痛药4片", price: 5000, categoryId: "health", sku: "8991001080102", stock: 65, imageUrl: undefined, isActive: true },
  { name: "Promag Tablet Strip", nameId: "Promag Tablet Strip", nameZh: "胃药片", price: 4000, categoryId: "health", sku: "8991001080103", stock: 70, imageUrl: undefined, isActive: true },
  { name: "Antangin JRG Sachet", nameId: "Antangin JRG Sachet", nameZh: "草药包", price: 3000, categoryId: "health", sku: "8991001080104", stock: 85, imageUrl: undefined, isActive: true },
  { name: "Tolak Angin Cair", nameId: "Tolak Angin Cair", nameZh: "草药液", price: 4000, categoryId: "health", sku: "8991001080105", stock: 75, imageUrl: undefined, isActive: true },
  { name: "Komix Herbal", nameId: "Komix Herbal", nameZh: "草药冲剂", price: 3500, categoryId: "health", sku: "8991001080106", stock: 80, imageUrl: undefined, isActive: true },
  { name: "Woods Peppermint", nameId: "Woods Peppermint", nameZh: "薄荷糖", price: 6000, categoryId: "health", sku: "8991001080107", stock: 55, imageUrl: undefined, isActive: true },
  { name: "Fisherman's Friend", nameId: "Fisherman's Friend", nameZh: "渔夫之宝", price: 12000, categoryId: "health", sku: "8991001080108", stock: 40, imageUrl: undefined, isActive: true },
  { name: "Vitamin C 1000mg", nameId: "Vitamin C 1000mg", nameZh: "维生素C 1000mg", price: 8000, categoryId: "health", sku: "8991001080109", stock: 50, imageUrl: undefined, isActive: true },
  { name: "Hemaviton Stamina", nameId: "Hemaviton Stamina", nameZh: "维生素补充剂", price: 5000, categoryId: "health", sku: "8991001080110", stock: 60, imageUrl: undefined, isActive: true },
  { name: "Enervon C Tablet", nameId: "Enervon C Tablet", nameZh: "维生素C片", price: 6000, categoryId: "health", sku: "8991001080111", stock: 58, imageUrl: undefined, isActive: true },
  { name: "Sangobion Strip", nameId: "Sangobion Strip", nameZh: "补血片", price: 12000, categoryId: "health", sku: "8991001080112", stock: 35, imageUrl: undefined, isActive: true },
  { name: "Mylanta Liquid", nameId: "Mylanta Liquid", nameZh: "胃药液", price: 18000, categoryId: "health", sku: "8991001080113", stock: 28, imageUrl: undefined, isActive: true },
  { name: "Betadine Gargle 100ml", nameId: "Betadine Gargle 100ml", nameZh: "漱口水100ml", price: 35000, categoryId: "health", sku: "8991001080114", stock: 22, imageUrl: undefined, isActive: true },
  { name: "Plester Hansaplast 10pcs", nameId: "Plester Hansaplast 10pcs", nameZh: "创可贴10片", price: 8000, categoryId: "health", sku: "8991001080115", stock: 48, imageUrl: undefined, isActive: true },
];

// Sample employees (2 cashiers + 6 helpers)
export const sampleEmployees: Omit<Employee, "id">[] = [
  { name: "Budi Santoso", pin: "1234", role: "cashier", isActive: true },
  { name: "Siti Nurhaliza", pin: "5678", role: "cashier", isActive: true },
  { name: "Ahmad Fauzi", pin: "2468", role: "helper", isActive: true },
  { name: "Dewi Lestari", pin: "1357", role: "helper", isActive: true },
  { name: "Eko Prasetyo", pin: "9753", role: "helper", isActive: true },
  { name: "Fitri Handayani", pin: "8642", role: "helper", isActive: true },
  { name: "Gunawan Wijaya", pin: "3141", role: "helper", isActive: true },
  { name: "Hendra Kusuma", pin: "2718", role: "helper", isActive: true },
];

// Categories
export const sampleCategories: Category[] = [
  { id: "beverages", name: "Beverages", nameId: "Minuman", nameZh: "饮料", color: "#3B82F6" },
  { id: "snacks", name: "Snacks", nameId: "Makanan Ringan", nameZh: "零食", color: "#F59E0B" },
  { id: "noodles", name: "Noodles & Food", nameId: "Mie & Makanan", nameZh: "面条和食品", color: "#EF4444" },
  { id: "personal_care", name: "Personal Care", nameId: "Perawatan Pribadi", nameZh: "个人护理", color: "#8B5CF6" },
  { id: "household", name: "Household", nameId: "Kebutuhan Rumah", nameZh: "家居用品", color: "#10B981" },
  { id: "cigarettes", name: "Cigarettes", nameId: "Rokok", nameZh: "香烟", color: "#6B7280" },
  { id: "frozen", name: "Frozen & Dairy", nameId: "Beku & Susu", nameZh: "冷冻和乳制品", color: "#06B6D4" },
  { id: "health", name: "Health", nameId: "Kesehatan", nameZh: "保健", color: "#EC4899" },
];

// Settings
export const sampleSettings: Settings = {
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

// Generate 26 months of summary data (Dec 2023 - Feb 2026)
export function generateSummaryData() {
  const dailyItemSales: any[] = [];
  const dailyPaymentSales: any[] = [];
  const monthlyItemSales: any[] = [];
  const monthlySalesSummary: any[] = [];

  const startDate = new Date("2023-12-01");
  const endDate = new Date("2026-02-02");
  
  const closedDays = [
    "2024-03-11", // Nyepi 2024
    "2024-12-25", // Christmas 2024
    "2025-01-01", // New Year 2025
    "2025-03-29", // Nyepi 2025
    "2025-12-25", // Christmas 2025
    "2026-01-01", // New Year 2026
  ];

  const monthlyAggregates = new Map<string, any>();
  
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split("T")[0];
    const monthKey = dateStr.substring(0, 7);
    
    if (closedDays.includes(dateStr)) {
      currentDate = new Date(currentDate.getTime() + 86400000);
      continue;
    }
    
    const day = currentDate.getDay();
    let baseCount = 120;
    
    // Weekend boost
    if (day === 0 || day === 6) {
      baseCount = Math.floor(baseCount * (1.3 + Math.random() * 0.2));
    } else if (day === 1) {
      baseCount = Math.floor(baseCount * (0.7 + Math.random() * 0.2));
    } else {
      baseCount = Math.floor(baseCount * (0.85 + Math.random() * 0.3));
    }
    
    const txCount = baseCount;
    const avgTxAmount = 85000;
    const totalRevenue = txCount * avgTxAmount;
    
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
    
    // Daily item sales (top 50 items)
    const topItems = sampleItems.slice(0, 50);
    topItems.forEach((item, idx) => {
      const salesFrequency = 1 / (idx + 1);
      const quantity = Math.max(1, Math.floor(txCount * salesFrequency * (0.1 + Math.random() * 0.05)));
      const revenue = quantity * item.price;
      
      if (quantity > 0) {
        dailyItemSales.push({
          id: `dis_${dateStr}_${idx}`,
          date: dateStr,
          itemId: `item_${(idx + 1).toString().padStart(3, "0")}`,
          itemName: item.name,
          quantity,
          revenue: Math.round(revenue),
        });
      }
    });
    
    // Monthly aggregates
    if (!monthlyAggregates.has(monthKey)) {
      monthlyAggregates.set(monthKey, {
        totalRevenue: 0,
        transactionCount: 0,
        cashAmount: 0,
        qrisAmount: 0,
        itemSales: new Map<string, { quantity: number; revenue: number }>(),
      });
    }
    
    const monthData = monthlyAggregates.get(monthKey)!;
    monthData.totalRevenue += totalRevenue;
    monthData.transactionCount += txCount;
    monthData.cashAmount += cashAmount;
    monthData.qrisAmount += qrisAmount;
    
    topItems.forEach((item, idx) => {
      const salesFrequency = 1 / (idx + 1);
      const quantity = Math.max(1, Math.floor(txCount * salesFrequency * (0.1 + Math.random() * 0.05)));
      const revenue = quantity * item.price;
      const itemId = `item_${(idx + 1).toString().padStart(3, "0")}`;
      
      if (!monthData.itemSales.has(itemId)) {
        monthData.itemSales.set(itemId, { quantity: 0, revenue: 0 });
      }
      const itemData = monthData.itemSales.get(itemId)!;
      itemData.quantity += quantity;
      itemData.revenue += revenue;
    });
    
    currentDate = new Date(currentDate.getTime() + 86400000);
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
    
    data.itemSales.forEach((itemData, itemId) => {
      const item = sampleItems.find((_, idx) => `item_${(idx + 1).toString().padStart(3, "0")}` === itemId);
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
  });
  
  return {
    dailyItemSales,
    dailyPaymentSales,
    monthlyItemSales,
    monthlySalesSummary,
  };
}