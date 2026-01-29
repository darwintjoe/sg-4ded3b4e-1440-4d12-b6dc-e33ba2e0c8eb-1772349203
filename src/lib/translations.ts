import { Language } from "@/types";

export const translations: Record<Language, Record<string, string>> = {
  en: {
    // Login & Auth
    "login.title": "SELL MORE",
    "login.subtitle": "Enter your PIN to continue",
    "login.button": "Login",
    "login.clockIn": "Clock In",
    "login.clockOut": "Clock Out",
    "login.invalid": "Invalid PIN",
    "login.success": "Login successful",
    
    // Attendance
    "attendance.clockedIn": "Clocked In Successfully",
    "attendance.clockedOut": "Clocked Out Successfully",
    "attendance.alreadyClockedIn": "Already clocked in today",
    "attendance.notClockedIn": "Not clocked in yet",
    
    // POS Screen
    "pos.search": "Search items or scan barcode...",
    "pos.cart": "Cart",
    "pos.empty": "Cart is empty",
    "pos.subtotal": "Subtotal",
    "pos.tax": "Tax",
    "pos.total": "TOTAL",
    "pos.pause": "Pause",
    "pos.logout": "Logout",
    "pos.payment": "Payment",
    "pos.clear": "Clear",
    "pos.mode.retail": "Retail",
    "pos.mode.cafe": "Cafe",
    
    // Payment
    "payment.title": "Payment",
    "payment.amount": "Amount to Pay",
    "payment.cash": "Cash",
    "payment.qrisStatic": "QRIS (Static)",
    "payment.qrisDynamic": "QRIS (Dynamic)",
    "payment.voucher": "Voucher",
    "payment.paid": "Paid",
    "payment.remaining": "Remaining",
    "payment.change": "Change",
    "payment.complete": "Complete Sale",
    "payment.cancel": "Cancel",
    
    // Settings
    "settings.title": "Settings",
    "settings.language": "Language",
    "settings.mode": "POS Mode",
    "settings.printer": "Printer Width",
    "settings.googleDrive": "Google Drive",
    "settings.link": "Link Account",
    "settings.linked": "Linked",
    
    // Reports
    "reports.title": "Reports",
    "reports.query": "Ask anything about your sales...",
    "reports.examples": "Examples: total sales today, cash vs QRIS breakdown, employee attendance",
    
    // Common
    "common.loading": "Loading...",
    "common.error": "Error",
    "common.success": "Success",
    "common.cancel": "Cancel",
    "common.confirm": "Confirm",
    "common.save": "Save",
    "common.delete": "Delete",
  },
  
  id: {
    // Login & Auth
    "login.title": "SELL MORE",
    "login.subtitle": "Masukkan PIN Anda untuk melanjutkan",
    "login.button": "Masuk",
    "login.clockIn": "Absen Masuk",
    "login.clockOut": "Absen Keluar",
    "login.invalid": "PIN tidak valid",
    "login.success": "Login berhasil",
    
    // Attendance
    "attendance.clockedIn": "Absen Masuk Berhasil",
    "attendance.clockedOut": "Absen Keluar Berhasil",
    "attendance.alreadyClockedIn": "Sudah absen masuk hari ini",
    "attendance.notClockedIn": "Belum absen masuk",
    
    // POS Screen
    "pos.search": "Cari barang atau scan barcode...",
    "pos.cart": "Keranjang",
    "pos.empty": "Keranjang kosong",
    "pos.subtotal": "Subtotal",
    "pos.tax": "Pajak",
    "pos.total": "TOTAL",
    "pos.pause": "Jeda",
    "pos.logout": "Keluar",
    "pos.payment": "Pembayaran",
    "pos.clear": "Hapus",
    "pos.mode.retail": "Retail",
    "pos.mode.cafe": "Kafe",
    
    // Payment
    "payment.title": "Pembayaran",
    "payment.amount": "Jumlah yang Harus Dibayar",
    "payment.cash": "Tunai",
    "payment.qrisStatic": "QRIS (Statis)",
    "payment.qrisDynamic": "QRIS (Dinamis)",
    "payment.voucher": "Voucher",
    "payment.paid": "Dibayar",
    "payment.remaining": "Sisa",
    "payment.change": "Kembalian",
    "payment.complete": "Selesaikan Penjualan",
    "payment.cancel": "Batal",
    
    // Settings
    "settings.title": "Pengaturan",
    "settings.language": "Bahasa",
    "settings.mode": "Mode POS",
    "settings.printer": "Lebar Printer",
    "settings.googleDrive": "Google Drive",
    "settings.link": "Hubungkan Akun",
    "settings.linked": "Terhubung",
    
    // Reports
    "reports.title": "Laporan",
    "reports.query": "Tanyakan apa saja tentang penjualan Anda...",
    "reports.examples": "Contoh: total penjualan hari ini, breakdown tunai vs QRIS, absensi karyawan",
    
    // Common
    "common.loading": "Memuat...",
    "common.error": "Kesalahan",
    "common.success": "Berhasil",
    "common.cancel": "Batal",
    "common.confirm": "Konfirmasi",
    "common.save": "Simpan",
    "common.delete": "Hapus",
  },
  
  zh: {
    // Login & Auth
    "login.title": "SELL MORE",
    "login.subtitle": "输入您的 PIN 码以继续",
    "login.button": "登录",
    "login.clockIn": "打卡上班",
    "login.clockOut": "打卡下班",
    "login.invalid": "PIN 码无效",
    "login.success": "登录成功",
    
    // Attendance
    "attendance.clockedIn": "打卡上班成功",
    "attendance.clockedOut": "打卡下班成功",
    "attendance.alreadyClockedIn": "今天已经打卡上班",
    "attendance.notClockedIn": "尚未打卡上班",
    
    // POS Screen
    "pos.search": "搜索商品或扫描条形码...",
    "pos.cart": "购物车",
    "pos.empty": "购物车为空",
    "pos.subtotal": "小计",
    "pos.tax": "税",
    "pos.total": "总计",
    "pos.pause": "暂停",
    "pos.logout": "登出",
    "pos.payment": "付款",
    "pos.clear": "清空",
    "pos.mode.retail": "零售",
    "pos.mode.cafe": "咖啡厅",
    
    // Payment
    "payment.title": "付款",
    "payment.amount": "应付金额",
    "payment.cash": "现金",
    "payment.qrisStatic": "QRIS（静态）",
    "payment.qrisDynamic": "QRIS（动态）",
    "payment.voucher": "优惠券",
    "payment.paid": "已付",
    "payment.remaining": "剩余",
    "payment.change": "找零",
    "payment.complete": "完成销售",
    "payment.cancel": "取消",
    
    // Settings
    "settings.title": "设置",
    "settings.language": "语言",
    "settings.mode": "POS 模式",
    "settings.printer": "打印机宽度",
    "settings.googleDrive": "Google 云端硬盘",
    "settings.link": "链接账户",
    "settings.linked": "已链接",
    
    // Reports
    "reports.title": "报告",
    "reports.query": "询问有关您的销售的任何信息...",
    "reports.examples": "示例：今天的总销售额，现金与 QRIS 细分，员工考勤",
    
    // Common
    "common.loading": "加载中...",
    "common.error": "错误",
    "common.success": "成功",
    "common.cancel": "取消",
    "common.confirm": "确认",
    "common.save": "保存",
    "common.delete": "删除",
  }
};

export function translate(key: string, language: Language): string {
  return translations[language][key] || key;
}