// ============================================================
// Firebase & Google Drive Configuration
// ============================================================
// ใส่การตั้งค่า Firebase ที่นี่หากต้องการเชื่อมต่อระบบ Cloud สำหรับทุกคนที่เปิดเว็บนี้
// หรือปล่อยว่างไว้เป็น "" เพื่อให้เป็นระบบออฟไลน์ส่วนตัว (บันทึกใน LocalStorage)
// และผู้ใช้งานสามารถนำ Config มากรอกเองในหน้าเว็บ (แท็บตั้งค่า Firebase) ได้อย่างปลอดภัย

window.FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  measurementId: ""
};

// โฟลเดอร์ Google Drive สำหรับจัดเก็บไฟล์เอกสารและรูปภาพ (ใส่ Folder ID หรือปล่อยว่างไว้)
window.GOOGLE_DRIVE_FOLDER_ID = "";
