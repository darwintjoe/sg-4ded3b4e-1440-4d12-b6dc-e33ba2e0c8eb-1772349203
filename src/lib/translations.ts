import { Language } from "@/types";

export const translations: Record<Language, Record<string, string>> = {
  en: {
    // Login & Auth
    "login.title": "SELL MORE",
    "login.subtitle": "Enter your PIN to continue",
    "login.adminSubtitle": "Enter admin PIN to access dashboard",
    "login.invalid": "Invalid PIN",
    "login.clockIn": "Clock In",
    "login.clockOut": "Clock Out",
    
    // Attendance
    "attendance.title": "ATTENDANCE",
    "attendance.subtitle": "Select mode and enter your PIN",
    "attendance.clockedIn": "Clocked in successfully!",
    "attendance.clockedOut": "Clocked out successfully!",
    "attendance.alreadyClockedIn": "Already clocked in today",
    "attendance.notClockedIn": "Not clocked in yet",
    
    // Admin
    "admin.subtitle": "System configuration and management",
    "admin.settings": "Settings",
    "admin.items": "Item Master",
    "admin.employees": "Employees",
    "admin.reports": "Reports",
    "admin.backup": "Backup",

    // POS Screen
    "pos.search": "Search items or scan barcode...",
    "pos.cart": "Cart",
    "pos.empty": "Cart is empty",
    "pos.subtotal": "Subtotal",
    "pos.tax": "Tax",
    "pos.total": "Total",
    "pos.payment": "Payment",

    // Payment
    "payment.title": "Payment",
    "payment.method": "Payment Method",
    "payment.cash": "Cash",
    "payment.qrisStatic": "QRIS Static",
    "payment.qrisDynamic": "QRIS Dynamic",
    "payment.voucher": "Voucher",
    "payment.amount": "Amount",
    "payment.qrisRef": "QRIS Reference (optional)",
    "payment.add": "Add Payment",
    "payment.paid": "Paid",
    "payment.remaining": "Remaining",
    "payment.change": "Change",
    "payment.complete": "Complete Sale",
    "payment.success": "Transaction completed successfully!",

    // Settings
    "settings.mode": "POS Mode",
    "settings.language": "Language",
    "settings.printer": "Printer Width",

    // Reports
    "reports.title": "AI Reports",
    "reports.query": "Ask a question about your sales...",
    "reports.examples": "Examples: total sales today, cash vs QRIS breakdown, employee attendance",
    "reports.loading": "Generating report...",

    // Common
    "common.loading": "Loading...",
    "common.error": "Error",
    "common.success": "Success",
    "common.cancel": "Cancel",
    "common.confirm": "Confirm",
    "common.save": "Save",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.add": "Add",
    "common.logout": "Logout"
  },
  
  id: {
    // Login & Auth
    "login.title": "SELL MORE",
    "login.subtitle": "Masukkan PIN Anda untuk melanjutkan",
    "login.adminSubtitle": "Masukkan PIN admin untuk akses dashboard",
    "login.invalid": "PIN tidak valid",
    "login.clockIn": "Masuk",
    "login.clockOut": "Keluar",
    
    // Attendance
    "attendance.title": "ABSENSI",
    "attendance.subtitle": "Pilih mode dan masukkan PIN Anda",
    "attendance.clockedIn": "Berhasil absen masuk!",
    "attendance.clockedOut": "Berhasil absen keluar!",
    "attendance.alreadyClockedIn": "Sudah absen masuk hari ini",
    "attendance.notClockedIn": "Belum absen masuk",
    
    // Admin
    "admin.subtitle": "Konfigurasi dan manajemen sistem",
    "admin.settings": "Pengaturan",
    "admin.items": "Data Barang",
    "admin.employees": "Karyawan",
    "admin.reports": "Laporan",
    "admin.backup": "Cadangan",

    // POS Screen
    "pos.search": "Cari barang atau pindai barcode...",
    "pos.cart": "Keranjang",
    "pos.empty": "Keranjang kosong",
    "pos.subtotal": "Subtotal",
    "pos.tax": "Pajak",
    "pos.total": "Total",
    "pos.payment": "Pembayaran",

    // Payment
    "payment.title": "Pembayaran",
    "payment.method": "Metode Pembayaran",
    "payment.cash": "Tunai",
    "payment.qrisStatic": "QRIS Statis",
    "payment.qrisDynamic": "QRIS Dinamis",
    "payment.voucher": "Voucher",
    "payment.amount": "Jumlah",
    "payment.qrisRef": "Referensi QRIS (opsional)",
    "payment.add": "Tambah Pembayaran",
    "payment.paid": "Dibayar",
    "payment.remaining": "Sisa",
    "payment.change": "Kembalian",
    "payment.complete": "Selesaikan Transaksi",
    "payment.success": "Transaksi berhasil diselesaikan!",

    // Settings
    "settings.mode": "Mode POS",
    "settings.language": "Bahasa",
    "settings.printer": "Lebar Printer",

    // Reports
    "reports.title": "Laporan AI",
    "reports.query": "Tanyakan tentang penjualan Anda...",
    "reports.examples": "Contoh: total penjualan hari ini, tunai vs QRIS, absensi karyawan",
    "reports.loading": "Membuat laporan...",

    // Common
    "common.loading": "Memuat...",
    "common.error": "Kesalahan",
    "common.success": "Berhasil",
    "common.cancel": "Batal",
    "common.confirm": "Konfirmasi",
    "common.save": "Simpan",
    "common.delete": "Hapus",
    "common.edit": "Edit",
    "common.add": "Tambah",
    "common.logout": "Keluar"
  },
  
  zh: {
    // Login & Auth
    "login.title": "SELL MORE",
    "login.subtitle": "输入您的PIN码以继续",
    "login.adminSubtitle": "输入管理员PIN码访问仪表板",
    "login.invalid": "PIN码无效",
    "login.clockIn": "打卡上班",
    "login.clockOut": "打卡下班",
    
    // Attendance
    "attendance.title": "考勤",
    "attendance.subtitle": "选择模式并输入您的PIN码",
    "attendance.clockedIn": "打卡上班成功！",
    "attendance.clockedOut": "打卡下班成功！",
    "attendance.alreadyClockedIn": "今天已经打卡上班",
    "attendance.notClockedIn": "尚未打卡上班",
    
    // Admin
    "admin.subtitle": "系统配置和管理",
    "admin.settings": "设置",
    "admin.items": "商品管理",
    "admin.employees": "员工",
    "admin.reports": "报表",
    "admin.backup": "备份",

    // POS Screen
    "pos.search": "搜索商品或扫描条码...",
    "pos.cart": "购物车",
    "pos.empty": "购物车为空",
    "pos.subtotal": "小计",
    "pos.tax": "税",
    "pos.total": "总计",
    "pos.payment": "付款",

    // Payment
    "payment.title": "付款",
    "payment.method": "付款方式",
    "payment.cash": "现金",
    "payment.qrisStatic": "QRIS静态",
    "payment.qrisDynamic": "QRIS动态",
    "payment.voucher": "优惠券",
    "payment.amount": "金额",
    "payment.qrisRef": "QRIS参考号（可选）",
    "payment.add": "添加付款",
    "payment.paid": "已付",
    "payment.remaining": "剩余",
    "payment.change": "找零",
    "payment.complete": "完成交易",
    "payment.success": "交易成功完成！",

    // Settings
    "settings.mode": "POS模式",
    "settings.language": "语言",
    "settings.printer": "打印机宽度",

    // Reports
    "reports.title": "AI报表",
    "reports.query": "询问有关您销售的问题...",
    "reports.examples": "示例：今日总销售额，现金与QRIS对比，员工考勤",
    "reports.loading": "生成报表中...",

    // Common
    "common.loading": "加载中...",
    "common.error": "错误",
    "common.success": "成功",
    "common.cancel": "取消",
    "common.confirm": "确认",
    "common.save": "保存",
    "common.delete": "删除",
    "common.edit": "编辑",
    "common.add": "添加",
    "common.logout": "退出"
  }
};

export function translate(key: string, language: Language): string {
  return translations[language][key] || key;
}