/**
 * Work Calendar & Task Tracker (Trello-Style Labels)
 * Full-featured offline-ready vanilla JS application
 */

(function () {
  'use strict';

  // --- Initial Default Data (matches user's screenshot) ---
  const DEFAULT_LABELS = [
    { id: 'lbl-1', title: 'สั่งป้ายแล้ว', color: '#216e4e', pattern: 'stripes' },
    { id: 'lbl-2', title: 'ยังไม่ได้สั่งป้าย', color: '#7f5f01', pattern: 'snake' },
    { id: 'lbl-3', title: 'รอออกใบขอ', color: '#a54800', pattern: 'bars' },
    { id: 'lbl-4', title: 'กำลังสั่งป้าย', color: '#ae2e24', pattern: 'dots' },
    { id: 'lbl-5', title: 'รอผู้ตรวจ', color: '#5e4db2', pattern: 'zigzag' },
    { id: 'lbl-6', title: 'กำลังออกแบบ', color: '#943d73', pattern: 'steps' },
    { id: 'lbl-7', title: 'กำลังติดต่อ', color: '#0055cc', pattern: 'lines' }
  ];

  const COLOR_PALETTE = [
    '#216e4e', '#4bce97', '#1f845a',
    '#7f5f01', '#e2b203', '#946f00',
    '#a54800', '#faa53d', '#c25e00',
    '#ae2e24', '#f87168', '#c9372c',
    '#5e4db2', '#9f8fef', '#6e5dc6',
    '#943d73', '#e774bb', '#ae4787',
    '#0055cc', '#579dff', '#0c66e4',
    '#206a83', '#60c6d2', '#287d97',
    '#44546f', '#8590a2', '#626f86'
  ];

  const PATTERN_SVGS = {
    stripes: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="4" y1="20" x2="20" y2="4"></line><line x1="4" y1="12" x2="12" y2="4"></line><line x1="12" y1="20" x2="20" y2="12"></line></svg>`,
    snake: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M4 16c2-4 6-4 8 0s6 4 8 0"></path><path d="M4 8c2-4 6-4 8 0s6 4 8 0"></path></svg>`,
    bars: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="7" y1="4" x2="7" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line><line x1="17" y1="4" x2="17" y2="20"></line></svg>`,
    dots: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="6" r="2.5"></circle><circle cx="18" cy="6" r="2.5"></circle><circle cx="12" cy="12" r="2.5"></circle><circle cx="6" cy="18" r="2.5"></circle><circle cx="18" cy="18" r="2.5"></circle></svg>`,
    zigzag: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 8 10 14 14 10 20 16"></polyline></svg>`,
    steps: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18h5v-5h5V8h6"></path></svg>`,
    lines: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="4" y1="7" x2="20" y2="7"></line><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="17" x2="20" y2="17"></line></svg>`
  };

  const THAI_MONTHS = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const THAI_DAYS = [
    'วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'
  ];

  // --- State Variables ---
  let state = {
    labels: [],
    tasks: {}, // Key: "YYYY-MM-DD" => Array of task objects { id, title, desc, done, tags: [labelId, ...] }
    holidays: {}, // Key: "YYYY-MM-DD" => true (กำหนดเป็นวันหยุด)
    currentDate: new Date(),
    viewYear: new Date().getFullYear(),
    viewMonth: new Date().getMonth(),
    activeModalDate: null,
    dayTaskFilter: 'all', // 'all', 'pending', 'done'
    tagFilter: 'all', // 'all' or labelId
    colorblindMode: true,
    theme: 'dark',
    
    // Label popover context
    labelPickerMode: 'task', // 'newTask', 'editTaskLabels', or 'global'
    labelPickerTaskId: null,
    labelPickerDate: null,
    newTaskSelectedTagIds: [],
    
    // Label editor context
    editingLabelId: null,
    selectedEditorColor: '#0055cc',

    // Cloud Sync State
    cloudUser: null,
    cloudSyncStatus: 'offline', // 'offline', 'connected', 'syncing', 'error'
    isSyncingFromRemote: false,
    authMode: 'pin', // 'pin', 'login', 'register'
    firebaseApp: null,
    firebaseDb: null,
    firebaseAuth: null,
    lastSyncTimestamp: null,
    undoStack: [],
    newTaskAttachments: [],
    editingTaskAttachments: [],
    googleAccessToken: sessionStorage.getItem('work_tracker_gdrive_token') || null
  };

  // --- Storage Helper Functions ---
  function loadFromStorage() {
    try {
      const savedLabels = localStorage.getItem('work_tracker_labels');
      state.labels = savedLabels ? JSON.parse(savedLabels) : DEFAULT_LABELS;

      const savedTasks = localStorage.getItem('work_tracker_tasks');
      const parsedTasks = savedTasks ? JSON.parse(savedTasks) : null;
      if (!parsedTasks || Object.keys(parsedTasks).length === 0) {
        state.tasks = getInitialDemoTasks();
      } else {
        state.tasks = parsedTasks;
      }

      const savedColorblind = localStorage.getItem('work_tracker_colorblind');
      state.colorblindMode = savedColorblind !== null ? JSON.parse(savedColorblind) : true;

      const savedHolidays = localStorage.getItem('work_tracker_holidays');
      state.holidays = savedHolidays ? JSON.parse(savedHolidays) : {};

      const savedTheme = localStorage.getItem('work_tracker_theme');
      state.theme = savedTheme || 'dark';
    } catch (e) {
      console.warn('Could not load storage, using default values', e);
      state.labels = DEFAULT_LABELS;
      state.tasks = getInitialDemoTasks();
    }
  }

  // ============================================================
  // Undo System (บันทึกประวัติการกระทำ & ย้อนกลับด้วย Ctrl+Z หรือปุ่ม Undo)
  // ============================================================
  let undoTimerId = null;

  function recordUndo(desc) {
    if (!state.undoStack) state.undoStack = [];
    state.undoStack.push({
      desc: desc || 'ทำรายการแล้ว',
      tasks: JSON.parse(JSON.stringify(state.tasks)),
      holidays: JSON.parse(JSON.stringify(state.holidays || {}))
    });

    if (state.undoStack.length > 30) {
      state.undoStack.shift();
    }

    showUndoPopup(desc);
  }

  function showUndoPopup(desc) {
    if (!el.undoPopup) return;
    if (el.undoActionDesc) {
      el.undoActionDesc.textContent = desc || 'ทำรายการแล้ว';
    }

    if (undoTimerId) clearTimeout(undoTimerId);

    if (el.undoTimerProgress) {
      el.undoTimerProgress.style.transition = 'none';
      el.undoTimerProgress.style.width = '100%';
      void el.undoTimerProgress.offsetWidth;
      el.undoTimerProgress.style.transition = 'width 6s linear';
      el.undoTimerProgress.style.width = '0%';
    }

    el.undoPopup.classList.add('active');

    undoTimerId = setTimeout(() => {
      hideUndoPopup();
    }, 6000);
  }

  function hideUndoPopup() {
    if (undoTimerId) {
      clearTimeout(undoTimerId);
      undoTimerId = null;
    }
    if (el.undoPopup) {
      el.undoPopup.classList.remove('active');
    }
  }

  function performUndo() {
    if (!state.undoStack || state.undoStack.length === 0) {
      showToast('ไม่มีรายการย้อนกลับ');
      return;
    }

    hideUndoPopup();

    const previous = state.undoStack.pop();
    state.tasks = previous.tasks || {};
    if (previous.holidays !== undefined) {
      state.holidays = previous.holidays;
      saveHolidays();
    }

    saveTasks();
    renderCalendar();
    if (state.activeModalDate) {
      renderDayTasks();
      updateHolidayButtonUI();
    }

    showToast(`↩️ ย้อนกลับ: ${previous.desc} เรียบร้อยแล้ว`);
  }

  function saveLabels() {
    localStorage.setItem('work_tracker_labels', JSON.stringify(state.labels));
    pushToCloud();
  }

  function saveTasks() {
    localStorage.setItem('work_tracker_tasks', JSON.stringify(state.tasks));
    pushToCloud();
  }

  function saveHolidays() {
    localStorage.setItem('work_tracker_holidays', JSON.stringify(state.holidays || {}));
    pushToCloud();
  }

  function saveSettings() {
    localStorage.setItem('work_tracker_colorblind', JSON.stringify(state.colorblindMode));
    localStorage.setItem('work_tracker_theme', state.theme);
    pushToCloud();
  }

  function getInitialDemoTasks() {
    // ตารางงานเริ่มต้นว่างเปล่า พร้อมให้ผู้ใช้งานบันทึกงานใหม่
    return {};
  }

  // --- Format Date Helpers ---
  function formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function parseDateKey(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function formatThaiFullDate(date) {
    const dayName = THAI_DAYS[date.getDay()];
    const dateNum = date.getDate();
    const monthName = THAI_MONTHS[date.getMonth()];
    const year = date.getFullYear();
    return `${dayName}ที่ ${dateNum} ${monthName} ${year}`;
  }

  function formatThaiShortDate(date) {
    const d = date.getDate();
    const m = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][date.getMonth()];
    const y = date.getFullYear();
    return `${d} ${m} ${y}`;
  }

  // --- DOM Elements Cache ---
  const el = {
    // Month controls
    currentMonthYear: document.getElementById('currentMonthYear'),
    btnPrevMonth: document.getElementById('btnPrevMonth'),
    btnNextMonth: document.getElementById('btnNextMonth'),
    btnToday: document.getElementById('btnToday'),
    calendarGrid: document.getElementById('calendarGrid'),
    tagFilterSelect: document.getElementById('tagFilterSelect'),

    // Month Stats
    statMonthTotal: document.getElementById('statMonthTotal'),
    statMonthDone: document.getElementById('statMonthDone'),
    statMonthPending: document.getElementById('statMonthPending'),
    statProgressBar: document.getElementById('statProgressBar'),
    statProgressPercent: document.getElementById('statProgressPercent'),

    // Day Modal
    dayModal: document.getElementById('dayModal'),
    btnCloseDayModal: document.getElementById('btnCloseDayModal'),
    modalDateTitle: document.getElementById('modalDateTitle'),
    modalDateSubtitle: document.getElementById('modalDateSubtitle'),
    addTaskForm: document.getElementById('addTaskForm'),
    taskTitleInput: document.getElementById('taskTitleInput'),
    taskDescInput: document.getElementById('taskDescInput'),
    btnOpenNewTaskLabels: document.getElementById('btnOpenNewTaskLabels'),
    newTaskSelectedTagsPills: document.getElementById('newTaskSelectedTagsPills'),
    dayTaskList: document.getElementById('dayTaskList'),
    dayTasksCount: document.getElementById('dayTasksCount'),
    btnCopyDayToTomorrow: document.getElementById('btnCopyDayToTomorrow'),
    btnToggleHoliday: document.getElementById('btnToggleHoliday'),
    holidayBtnIcon: document.getElementById('holidayBtnIcon'),
    holidayBtnText: document.getElementById('holidayBtnText'),

    // Edit Task Modal
    editTaskModal: document.getElementById('editTaskModal'),
    btnCloseEditTaskModal: document.getElementById('btnCloseEditTaskModal'),
    btnCancelEditTask: document.getElementById('btnCancelEditTask'),
    editTaskForm: document.getElementById('editTaskForm'),
    editTaskId: document.getElementById('editTaskId'),
    editTaskDate: document.getElementById('editTaskDate'),
    editTaskTitle: document.getElementById('editTaskTitle'),
    editTaskDesc: document.getElementById('editTaskDesc'),

    // Trello Label Picker Modal
    labelPickerModal: document.getElementById('labelPickerModal'),
    btnCloseLabelPicker: document.getElementById('btnCloseLabelPicker'),
    labelListView: document.getElementById('labelListView'),
    labelSearchInput: document.getElementById('labelSearchInput'),
    labelsContainer: document.getElementById('labelsContainer'),
    btnGoToCreateLabel: document.getElementById('btnGoToCreateLabel'),
    btnToggleColorblind: document.getElementById('btnToggleColorblind'),
    colorblindText: document.getElementById('colorblindText'),

    // Label Editor View
    labelEditView: document.getElementById('labelEditView'),
    btnBackToLabelList: document.getElementById('btnBackToLabelList'),
    btnCloseLabelEditor: document.getElementById('btnCloseLabelEditor'),
    labelEditorTitle: document.getElementById('labelEditorTitle'),
    labelTitleInput: document.getElementById('labelTitleInput'),
    colorPaletteGrid: document.getElementById('colorPaletteGrid'),
    customColorPicker: document.getElementById('customColorPicker'),
    customColorHex: document.getElementById('customColorHex'),
    labelLivePreview: document.getElementById('labelLivePreview'),
    previewLabelText: document.getElementById('previewLabelText'),
    btnSaveLabel: document.getElementById('btnSaveLabel'),
    btnDeleteLabel: document.getElementById('btnDeleteLabel'),

    // Backup & Theme
    btnManageLabels: document.getElementById('btnManageLabels'),
    btnBackup: document.getElementById('btnBackup'),
    backupModal: document.getElementById('backupModal'),
    btnCloseBackupModal: document.getElementById('btnCloseBackupModal'),
    btnExportJSON: document.getElementById('btnExportJSON'),
    btnImportJSON: document.getElementById('btnImportJSON'),
    importFileInput: document.getElementById('importFileInput'),
    btnThemeToggle: document.getElementById('btnThemeToggle'),
    themeIcon: document.getElementById('themeIcon'),
    toastContainer: document.getElementById('toastContainer'),

    // Drag & Drop Task Across Days Modal
    dragDropActionModal: document.getElementById('dragDropActionModal'),
    btnCloseDragDropModal: document.getElementById('btnCloseDragDropModal'),
    btnCancelDragDrop: document.getElementById('btnCancelDragDrop'),
    dragTaskPreviewCard: document.getElementById('dragTaskPreviewCard'),
    dragFromDateTxt: document.getElementById('dragFromDateTxt'),
    dragToDateTxt: document.getElementById('dragToDateTxt'),
    btnChoiceCopyTask: document.getElementById('btnChoiceCopyTask'),
    btnChoiceCopyPending: document.getElementById('btnChoiceCopyPending'),
    btnChoiceMoveTask: document.getElementById('btnChoiceMoveTask'),
    btnChoiceCopyTitle: document.getElementById('btnChoiceCopyTitle'),
    btnChoiceCopyDesc: document.getElementById('btnChoiceCopyDesc'),
    btnChoicePendingTitle: document.getElementById('btnChoicePendingTitle'),
    btnChoicePendingDesc: document.getElementById('btnChoicePendingDesc'),
    btnChoiceMoveTitle: document.getElementById('btnChoiceMoveTitle'),
    btnChoiceMoveDesc: document.getElementById('btnChoiceMoveDesc'),

    // Cloud Sync Elements
    btnCloudSync: document.getElementById('btnCloudSync'),
    cloudStatusText: document.getElementById('cloudStatusText'),
    cloudStatusDot: document.getElementById('cloudStatusDot'),
    cloudSyncModal: document.getElementById('cloudSyncModal'),
    btnCloseCloudSyncModal: document.getElementById('btnCloseCloudSyncModal'),
    cloudStatusBanner: document.getElementById('cloudStatusBanner'),
    cloudStatusIcon: document.getElementById('cloudStatusIcon'),
    cloudStatusTitle: document.getElementById('cloudStatusTitle'),
    cloudStatusSubtitle: document.getElementById('cloudStatusSubtitle'),
    tabBtnAccount: document.getElementById('tabBtnAccount'),
    tabBtnConfig: document.getElementById('tabBtnConfig'),
    panelAccount: document.getElementById('panelAccount'),
    panelConfig: document.getElementById('panelConfig'),
    viewLoggedIn: document.getElementById('viewLoggedIn'),
    viewLoggedOut: document.getElementById('viewLoggedOut'),
    userEmailDisplay: document.getElementById('userEmailDisplay'),
    lastSyncTimeTxt: document.getElementById('lastSyncTimeTxt'),
    btnForceSyncNow: document.getElementById('btnForceSyncNow'),
    btnLogoutCloud: document.getElementById('btnLogoutCloud'),
    btnModePIN: document.getElementById('btnModePIN'),
    btnModeLogin: document.getElementById('btnModeLogin'),
    btnModeRegister: document.getElementById('btnModeRegister'),
    formPINGroup: document.getElementById('formPINGroup'),
    cloudPINInput: document.getElementById('cloudPINInput'),
    formEmailPasswordGroup: document.getElementById('formEmailPasswordGroup'),
    cloudEmailInput: document.getElementById('cloudEmailInput'),
    cloudPasswordInput: document.getElementById('cloudPasswordInput'),
    chkUploadLocalTasks: document.getElementById('chkUploadLocalTasks'),
    btnGoogleSignIn: document.getElementById('btnGoogleSignIn'),
    btnSubmitAuth: document.getElementById('btnSubmitAuth'),
    authErrorMsg: document.getElementById('authErrorMsg'),
    firebaseConfigTextarea: document.getElementById('firebaseConfigTextarea'),
    btnSaveFirebaseConfig: document.getElementById('btnSaveFirebaseConfig'),
    btnResetFirebaseConfig: document.getElementById('btnResetFirebaseConfig'),

    // Undo Elements
    undoPopup: document.getElementById('undoPopup'),
    undoActionDesc: document.getElementById('undoActionDesc'),
    btnUndoAction: document.getElementById('btnUndoAction'),
    btnCloseUndoPopup: document.getElementById('btnCloseUndoPopup'),
    undoTimerProgress: document.getElementById('undoTimerProgress'),

    // File Attachments & Preview Elements
    btnAttachNewTaskFiles: document.getElementById('btnAttachNewTaskFiles'),
    newTaskFileInput: document.getElementById('newTaskFileInput'),
    newTaskAttachmentsPreview: document.getElementById('newTaskAttachmentsPreview'),
    btnAttachEditTaskFiles: document.getElementById('btnAttachEditTaskFiles'),
    editTaskFileInput: document.getElementById('editTaskFileInput'),
    editTaskAttachmentsList: document.getElementById('editTaskAttachmentsList'),
    filePreviewTooltip: document.getElementById('filePreviewTooltip'),
    filePreviewImageContainer: document.getElementById('filePreviewImageContainer'),
    filePreviewImage: document.getElementById('filePreviewImage'),
    filePreviewPdfContainer: document.getElementById('filePreviewPdfContainer'),
    filePreviewName: document.getElementById('filePreviewName'),
    filePreviewSize: document.getElementById('filePreviewSize'),
    filePreviewStorageBadge: document.getElementById('filePreviewStorageBadge'),
    btnQuickDriveLogin: document.getElementById('btnQuickDriveLogin'),
    btnQuickDriveLoginEdit: document.getElementById('btnQuickDriveLoginEdit'),
    btnTooltipUploadDrive: document.getElementById('btnTooltipUploadDrive')
  };

  let calendarDragData = null;
  let isCalendarPillDragging = false;

  // --- Toast Notification Helper ---
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✓' : 'ℹ️'}</span><span>${message}</span>`;
    el.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 2800);
  }

  // --- Theme Management ---
  function applyTheme() {
    if (state.theme === 'light') {
      document.body.classList.remove('theme-dark');
      document.body.classList.add('theme-light');
      el.themeIcon.textContent = '🌙';
    } else {
      document.body.classList.remove('theme-light');
      document.body.classList.add('theme-dark');
      el.themeIcon.textContent = '☀️';
    }
  }

  function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    saveSettings();
    applyTheme();
    showToast(`เปลี่ยนเป็นโหมด ${state.theme === 'dark' ? 'มืด (Dark)' : 'สว่าง (Light)'}`);
  }

  // ============================================================
  // Cloud Sync Module (Firebase Realtime Database & Auth)
  // ============================================================
  let cloudPushTimeout = null;
  let remoteSyncUnsubscribe = null;

  function getStoredFirebaseConfig() {
    let cfg = null;
    // 1. ตรวจสอบค่าตั้งต้นจากไฟล์ firebase-config.js ก่อนเป็นอันดับแรก (พร้อมใช้งานทันทีทุกเครื่อง/มือถือ)
    if (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey && window.FIREBASE_CONFIG.apiKey.trim() !== '') {
      cfg = Object.assign({}, window.FIREBASE_CONFIG);
    } else {
      // 2. ตรวจสอบจาก LocalStorage ที่บันทึกผ่าน UI
      try {
        const raw = localStorage.getItem('work_tracker_firebase_config');
        if (raw) cfg = JSON.parse(raw);
      } catch (e) {
        console.warn('Invalid stored Firebase config', e);
      }
    }

    if (cfg) {
      // fallback databaseURL หากไม่ได้ระบุมาโดยตรง แต่มี projectId
      if (!cfg.databaseURL && cfg.projectId) {
        cfg.databaseURL = `https://${cfg.projectId}-default-rtdb.asia-southeast1.firebasedatabase.app`;
      }
    }

    return cfg;
  }

  function initFirebase() {
    if (!window.firebase) {
      console.log('Firebase SDK not loaded, running in pure local mode');
      updateCloudUI();
      return;
    }

    const config = getStoredFirebaseConfig();
    if (!config || !config.apiKey) {
      console.log('Firebase config not set, running in pure local mode');
      updateCloudUI();
      return;
    }

    try {
      if (!firebase.apps.length) {
        state.firebaseApp = firebase.initializeApp(config);
      } else {
        state.firebaseApp = firebase.app();
      }

      state.firebaseAuth = firebase.auth();
      state.firebaseDb = firebase.database();

      // Check redirect result for mobile Google Login
      state.firebaseAuth.getRedirectResult().then((result) => {
        if (result && result.user) {
          if (result.credential && result.credential.accessToken) {
            state.googleAccessToken = result.credential.accessToken;
            sessionStorage.setItem('work_tracker_gdrive_token', state.googleAccessToken);
          }
          showToast(`🎉 ยินดีต้อนรับ ${result.user.displayName || result.user.email}!`);
          pushToCloud(true);
        }
      }).catch((err) => {
        console.error('Redirect auth error:', err);
        if (err.code === 'auth/unauthorized-domain') {
          showAuthError(`⚠️ โดเมนยังไม่ได้รับอนุญาต: กรุณาเพิ่ม "${window.location.hostname || 'โดเมนของคุณ'}" ใน Firebase Console > Authentication > Settings > Authorized domains`);
        }
      });

      // Listen for connection state (online/offline)
      state.firebaseDb.ref('.info/connected').on('value', (snap) => {
        const isOnline = snap.val() === true;
        if (state.cloudUser) {
          setCloudStatus(isOnline ? 'online' : 'offline');
        }
      });

      // Listen for Auth changes
      state.firebaseAuth.onAuthStateChanged((user) => {
        handleAuthStateChange(user);
      });

    } catch (err) {
      console.error('Failed to init Firebase:', err);
      setCloudStatus('error', err.message);
    }
  }

  function setCloudStatus(status, detail) {
    state.cloudSyncStatus = status;
    if (!el.cloudStatusDot || !el.cloudStatusText) return;

    el.cloudStatusDot.className = 'status-dot';
    if (status === 'online') {
      el.cloudStatusDot.classList.add('dot-online');
      el.cloudStatusText.textContent = 'ออนไลน์';
      if (el.cloudStatusIcon) el.cloudStatusIcon.textContent = '🟢';
      if (el.cloudStatusTitle) el.cloudStatusTitle.textContent = 'เชื่อมต่อ Cloud แล้ว (ซิงก์เรียลไทม์)';
      if (el.cloudStatusBanner) {
        el.cloudStatusBanner.className = 'cloud-status-banner banner-online';
      }
    } else if (status === 'syncing') {
      el.cloudStatusDot.classList.add('dot-syncing');
      el.cloudStatusText.textContent = 'กำลังซิงก์...';
    } else if (status === 'error') {
      el.cloudStatusDot.classList.add('dot-offline');
      el.cloudStatusText.textContent = 'ข้อผิดพลาด';
      if (el.cloudStatusIcon) el.cloudStatusIcon.textContent = '🔴';
      if (el.cloudStatusTitle) el.cloudStatusTitle.textContent = 'เกิดข้อผิดพลาดในการเชื่อมต่อ';
      if (el.cloudStatusSubtitle && detail) el.cloudStatusSubtitle.textContent = detail;
    } else {
      // offline / local
      el.cloudStatusDot.classList.add('dot-offline');
      el.cloudStatusText.textContent = state.firebaseApp ? 'ออฟไลน์' : 'โหมดในเครื่อง';
      if (el.cloudStatusIcon) el.cloudStatusIcon.textContent = '🟡';
      if (el.cloudStatusTitle) el.cloudStatusTitle.textContent = 'โหมดในเครื่อง (Local Storage)';
      if (el.cloudStatusSubtitle) {
        el.cloudStatusSubtitle.textContent = state.cloudUser 
          ? 'หลุดการเชื่อมต่ออินเทอร์เน็ต ชั่วคราว' 
          : 'บันทึกข้อมูลในเครื่องนี้เท่านั้น ยังไม่ได้เชื่อมต่อ Cloud';
      }
      if (el.cloudStatusBanner) {
        el.cloudStatusBanner.className = 'cloud-status-banner banner-local';
      }
    }
  }

  function handleAuthStateChange(user) {
    state.cloudUser = user;
    updateDriveStatusUI();

    if (user) {
      setCloudStatus('online');
      if (el.viewLoggedIn) el.viewLoggedIn.style.display = 'block';
      if (el.viewLoggedOut) el.viewLoggedOut.style.display = 'none';

      let displayName = user.displayName || user.email;
      if (!displayName && user.isAnonymous) {
        displayName = 'ผู้ใช้รหัส PIN ส่วนตัว';
      } else if (displayName && displayName.startsWith('pin_') && displayName.endsWith('@worktracker.internal')) {
        const pinOnly = displayName.replace('pin_', '').replace('@worktracker.internal', '');
        displayName = `รหัส PIN: ${pinOnly}`;
      } else if (!displayName) {
        displayName = user.uid.substring(0, 8);
      }

      if (el.userEmailDisplay) el.userEmailDisplay.textContent = displayName;
      const avatarEl = document.getElementById('userAvatarIcon');
      if (avatarEl) {
        if (user.photoURL) {
          avatarEl.innerHTML = `<img src="${user.photoURL}" alt="" style="width: 32px; height: 32px; border-radius: 50%; vertical-align: middle;">`;
        } else {
          avatarEl.textContent = '👤';
        }
      }
      if (el.cloudStatusSubtitle) {
        el.cloudStatusSubtitle.textContent = `เชื่อมต่อบัญชี: ${displayName}`;
      }

      listenToRemoteData(user.uid);

    } else {
      setCloudStatus('offline');
      if (el.viewLoggedIn) el.viewLoggedIn.style.display = 'none';
      if (el.viewLoggedOut) el.viewLoggedOut.style.display = 'block';

      if (remoteSyncUnsubscribe) {
        remoteSyncUnsubscribe();
        remoteSyncUnsubscribe = null;
      }
    }
  }

  function listenToRemoteData(uid) {
    if (!state.firebaseDb) return;

    const dataRef = state.firebaseDb.ref('users/' + uid + '/data');
    dataRef.on('value', (snapshot) => {
      const val = snapshot.val();
      if (!val) {
        // If empty on cloud, push local to cloud
        if (state.tasks && Object.keys(state.tasks).length > 0) {
          pushToCloud(true);
        }
        return;
      }

      // Avoid looping if change came from local push
      if (state.lastSyncTimestamp && val.updatedAt && Math.abs(val.updatedAt - state.lastSyncTimestamp.getTime()) < 2000) {
        return;
      }

      state.isSyncingFromRemote = true;
      try {
        if (val.tasks) state.tasks = val.tasks;
        if (val.labels) state.labels = val.labels;
        if (val.holidays) state.holidays = val.holidays;
        if (val.colorblindMode !== undefined) state.colorblindMode = val.colorblindMode;

        localStorage.setItem('work_tracker_tasks', JSON.stringify(state.tasks));
        localStorage.setItem('work_tracker_labels', JSON.stringify(state.labels));
        localStorage.setItem('work_tracker_holidays', JSON.stringify(state.holidays || {}));
        localStorage.setItem('work_tracker_colorblind', JSON.stringify(state.colorblindMode));

        state.lastSyncTimestamp = new Date(val.updatedAt || Date.now());
        updateSyncTimestampDisplay();

        renderCalendar();
        updateTagFilterSelect();
        if (state.activeModalDate) renderDayTasks();

        showToast('🔄 ซิงก์ข้อมูลงานล่าสุดเรียบร้อย');
      } finally {
        state.isSyncingFromRemote = false;
      }
    });

    remoteSyncUnsubscribe = () => dataRef.off('value');
  }

  function pushToCloud(immediate = false) {
    if (state.isSyncingFromRemote || !state.cloudUser || !state.firebaseDb) return;

    if (cloudPushTimeout) clearTimeout(cloudPushTimeout);

    const doPush = () => {
      setCloudStatus('syncing');
      const uid = state.cloudUser.uid;
      const payload = {
        tasks: state.tasks,
        labels: state.labels,
        holidays: state.holidays || {},
        colorblindMode: state.colorblindMode,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
      };

      // Safety timeout: ถ้าผ่านไป 8 วินาทีแล้วฐานข้อมูลยังไม่ตอบสนอง ให้แจ้งเตือนเรื่อง databaseURL
      const timeoutId = setTimeout(() => {
        if (state.cloudSyncStatus === 'syncing') {
          console.warn('Firebase set() timed out - databaseURL might be incorrect');
          setCloudStatus('error', 'เชื่อมต่อฐานข้อมูลไม่สำเร็จ (อาจใส่ databaseURL ผิด หรือยังไม่ได้กด Create Database)');
          showToast('⚠️ เชื่อมต่อ Realtime Database ไม่สำเร็จ กรุณาตรวจสอบ URL ใน Firebase Console');
        }
      }, 8000);

      state.firebaseDb.ref('users/' + uid + '/data').set(payload)
        .then(() => {
          clearTimeout(timeoutId);
          setCloudStatus('online');
          state.lastSyncTimestamp = new Date();
          updateSyncTimestampDisplay();
        })
        .catch((err) => {
          clearTimeout(timeoutId);
          console.error('Cloud save failed:', err);
          setCloudStatus('error', err.message);
        });
    };

    if (immediate) {
      doPush();
    } else {
      cloudPushTimeout = setTimeout(doPush, 400);
    }
  }

  function updateSyncTimestampDisplay() {
    if (!el.lastSyncTimeTxt) return;
    if (!state.lastSyncTimestamp) {
      el.lastSyncTimeTxt.textContent = 'ซิงก์ล่าสุด: ยังไม่มีการบันทึก';
      return;
    }
    const t = state.lastSyncTimestamp;
    const timeStr = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}:${String(t.getSeconds()).padStart(2, '0')}`;
    el.lastSyncTimeTxt.textContent = `ซิงก์ล่าสุด: ${timeStr} น.`;
  }

  function updateCloudUI() {
    const config = getStoredFirebaseConfig();
    if (el.firebaseConfigTextarea && config) {
      el.firebaseConfigTextarea.value = JSON.stringify(config, null, 2);
    }
    setCloudStatus(state.cloudUser ? 'online' : 'offline');
  }

  function openCloudSyncModal() {
    updateCloudUI();
    if (el.authErrorMsg) {
      el.authErrorMsg.style.display = 'none';
      el.authErrorMsg.textContent = '';
    }
    el.cloudSyncModal.classList.add('active');
  }

  function closeCloudSyncModal() {
    el.cloudSyncModal.classList.remove('active');
  }

  function setAuthMode(mode) {
    state.authMode = mode;
    el.btnModePIN.classList.toggle('active', mode === 'pin');
    el.btnModeLogin.classList.toggle('active', mode === 'login');
    el.btnModeRegister.classList.toggle('active', mode === 'register');

    if (mode === 'pin') {
      el.formPINGroup.style.display = 'block';
      el.formEmailPasswordGroup.style.display = 'none';
      el.btnSubmitAuth.textContent = '🚀 ซิงก์ด้วยรหัส PIN ด่วน';
    } else if (mode === 'login') {
      el.formPINGroup.style.display = 'none';
      el.formEmailPasswordGroup.style.display = 'block';
      el.btnSubmitAuth.textContent = '🔑 เข้าสู่ระบบ (Login)';
    } else {
      el.formPINGroup.style.display = 'none';
      el.formEmailPasswordGroup.style.display = 'block';
      el.btnSubmitAuth.textContent = '✨ สมัครใช้งานใหม่ (Register)';
    }

    if (el.authErrorMsg) el.authErrorMsg.style.display = 'none';
  }

  function handleGoogleSignIn() {
    if (!state.firebaseAuth) {
      showAuthError('ยังไม่ได้ตั้งค่า Firebase! กรุณาตรวจสอบการตั้งค่า Firebase');
      return;
    }

    const uploadLocal = el.chkUploadLocalTasks ? el.chkUploadLocalTasks.checked : true;
    if (el.authErrorMsg) el.authErrorMsg.style.display = 'none';

    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    provider.setCustomParameters({ prompt: 'select_account' });

    // On mobile devices, popup is often blocked by mobile browsers (Safari / Chrome mobile)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      state.firebaseAuth.signInWithRedirect(provider);
      return;
    }

    state.firebaseAuth.signInWithPopup(provider)
      .then((result) => {
        if (result.credential && result.credential.accessToken) {
          state.googleAccessToken = result.credential.accessToken;
          sessionStorage.setItem('work_tracker_gdrive_token', state.googleAccessToken);
        }
        updateDriveStatusUI();
        if (uploadLocal) {
          pushToCloud(true);
        }
        const name = result.user.displayName || result.user.email;
        showToast(`🎉 ยินดีต้อนรับ ${name}! เชื่อมต่อ Cloud สำเร็จ`);
      })
      .catch((err) => {
        console.error('Google Sign-in error:', err);
        let msg = err.message || 'เกิดข้อผิดพลาดในการลงชื่อเข้าใช้ด้วย Google';
        if (err.code === 'auth/unauthorized-domain') {
          msg = `⚠️ โดเมนยังไม่ได้รับอนุญาต: กรุณาเพิ่ม "${window.location.hostname || 'โดเมนของคุณ'}" ใน Firebase Console > Authentication > Settings > Authorized domains`;
        } else if (err.code === 'auth/popup-blocked') {
          // Fallback to redirect
          state.firebaseAuth.signInWithRedirect(provider);
          return;
        } else if (err.code === 'auth/popup-closed-by-user') {
          msg = 'หน้าต่างเข้าสู่ระบบถูกปิดก่อนทำรายการเสร็จ';
        } else if (err.code === 'auth/operation-not-supported-in-this-environment') {
          msg = '💡 Google Login ต้องรันผ่านเว็บ (เช่น GitHub Pages หรือ http://) ไม่สามารถรันบน file:/// ในเครื่องได้โดยตรง';
        }
        showAuthError(msg);
      });
  }

  function handleAuthSubmit() {
    if (!state.firebaseAuth) {
      showAuthError('ยังไม่ได้ตั้งค่า Firebase! กรุณาไปที่แท็บ "⚙️ ตั้งค่า Firebase" ก่อน');
      return;
    }

    const uploadLocal = el.chkUploadLocalTasks.checked;
    el.btnSubmitAuth.disabled = true;
    el.btnSubmitAuth.textContent = 'กำลังดำเนินการ...';
    if (el.authErrorMsg) el.authErrorMsg.style.display = 'none';

    const onAuthSuccess = () => {
      el.btnSubmitAuth.disabled = false;
      setAuthMode(state.authMode);
      if (uploadLocal) {
        pushToCloud(true);
      }
      showToast('🎉 เชื่อมต่อ Cloud สำเร็จแล้ว!');
    };

    const onAuthFail = (err) => {
      el.btnSubmitAuth.disabled = false;
      setAuthMode(state.authMode);
      let msg = err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ';
      if (err.code === 'auth/wrong-password') msg = 'รหัสผ่านไม่ถูกต้อง';
      if (err.code === 'auth/user-not-found') msg = 'ไม่พบบัญชีนี้ กรุณาเลือกแท็บ "สมัครใหม่"';
      if (err.code === 'auth/email-already-in-use') msg = 'อีเมลนี้ถูกใช้งานแล้ว กรุณากด "เข้าสู่ระบบ"';
      if (err.code === 'auth/weak-password') msg = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
      if (err.code === 'auth/invalid-email') msg = 'รูปแบบอีเมลไม่ถูกต้อง';
      showAuthError(msg);
    };

    if (state.authMode === 'pin') {
      const pin = el.cloudPINInput.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
      if (!pin || pin.length < 4) {
        el.btnSubmitAuth.disabled = false;
        setAuthMode('pin');
        showAuthError('กรุณากรอกรหัส PIN อย่างน้อย 4 ตัวอักษร (เช่น 1234 หรือเบอร์โทร)');
        return;
      }

      const syntheticEmail = `pin_${pin}@worktracker.internal`;
      const syntheticPwd = `pin_secure_${pin}_2026`;

      state.firebaseAuth.signInWithEmailAndPassword(syntheticEmail, syntheticPwd)
        .then(onAuthSuccess)
        .catch((err) => {
          if (err.code === 'auth/user-not-found') {
            state.firebaseAuth.createUserWithEmailAndPassword(syntheticEmail, syntheticPwd)
              .then(onAuthSuccess)
              .catch(onAuthFail);
          } else {
            onAuthFail(err);
          }
        });

    } else if (state.authMode === 'login') {
      const email = el.cloudEmailInput.value.trim();
      const pwd = el.cloudPasswordInput.value;
      if (!email || !pwd) {
        el.btnSubmitAuth.disabled = false;
        setAuthMode('login');
        showAuthError('กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน');
        return;
      }
      state.firebaseAuth.signInWithEmailAndPassword(email, pwd)
        .then(onAuthSuccess)
        .catch(onAuthFail);

    } else {
      const email = el.cloudEmailInput.value.trim();
      const pwd = el.cloudPasswordInput.value;
      if (!email || !pwd) {
        el.btnSubmitAuth.disabled = false;
        setAuthMode('register');
        showAuthError('กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน');
        return;
      }
      state.firebaseAuth.createUserWithEmailAndPassword(email, pwd)
        .then(onAuthSuccess)
        .catch(onAuthFail);
    }
  }

  function showAuthError(msg) {
    if (!el.authErrorMsg) return;
    el.authErrorMsg.textContent = msg;
    el.authErrorMsg.style.display = 'block';
  }

  function handleLogoutCloud() {
    if (!state.firebaseAuth) return;
    state.firebaseAuth.signOut().then(() => {
      state.googleAccessToken = null;
      sessionStorage.removeItem('work_tracker_gdrive_token');
      updateDriveStatusUI();
      showToast('ออกจากระบบ Cloud แล้ว (กลับสู่โหมดในเครื่อง)');
    });
  }

  function handleSaveFirebaseConfig() {
    const rawInput = el.firebaseConfigTextarea.value.trim();
    if (!rawInput) {
      showToast('⚠️ กรุณากรอกการตั้งค่า Firebase');
      return;
    }

    try {
      let configObj = null;

      if (rawInput.startsWith('{') && rawInput.endsWith('}')) {
        try {
          configObj = JSON.parse(rawInput);
        } catch (e) {
          configObj = new Function('return (' + rawInput + ')')();
        }
      } else {
        const start = rawInput.indexOf('{');
        const end = rawInput.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
          const inner = rawInput.substring(start, end + 1);
          configObj = new Function('return (' + inner + ')')();
        }
      }

      if (!configObj || !configObj.apiKey) {
        throw new Error('ไม่พบค่า apiKey ในการตั้งค่า');
      }

      localStorage.setItem('work_tracker_firebase_config', JSON.stringify(configObj));
      showToast('💾 บันทึกการตั้งค่า Firebase เรียบร้อย กำลังเริ่มระบบใหม่...');

      setTimeout(() => {
        initFirebase();
        el.tabBtnAccount.click();
      }, 500);

    } catch (err) {
      alert('รูปแบบการตั้งค่าไม่ถูกต้อง: ' + err.message + '\n\nกรุณาคัดลอกเฉพาะก้อน { ... } จาก Firebase Console');
    }
  }

  function handleResetFirebaseConfig() {
    if (confirm('คุณต้องการล้างการตั้งค่า Firebase ในเครื่องนี้ใช่หรือไม่?')) {
      localStorage.removeItem('work_tracker_firebase_config');
      if (el.firebaseConfigTextarea) el.firebaseConfigTextarea.value = '';
      if (state.firebaseAuth) state.firebaseAuth.signOut();
      state.firebaseApp = null;
      state.firebaseDb = null;
      state.firebaseAuth = null;
      setCloudStatus('offline');
      showToast('ล้างการตั้งค่า Firebase เรียบร้อย');
    }
  }

  // --- Calendar Rendering ---
  function renderCalendar() {
    const year = state.viewYear;
    const month = state.viewMonth;

    // Set Header Month Title
    el.currentMonthYear.textContent = `${THAI_MONTHS[month]} ${year}`;

    // Update Filter Select Options
    updateTagFilterSelect();

    // Clear calendar grid
    el.calendarGrid.innerHTML = '';

    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon ...
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const todayKey = formatDateKey(new Date());

    let monthTotalTasks = 0;
    let monthDoneTasks = 0;

    // Previous month filler days
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, daysInPrevMonth - i);
      const cell = createDayCell(prevDate, true, todayKey);
      el.calendarGrid.appendChild(cell);
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateKey = formatDateKey(date);
      const tasks = state.tasks[dateKey] || [];

      // Check stats
      tasks.forEach(t => {
        monthTotalTasks++;
        if (t.done) monthDoneTasks++;
      });

      const cell = createDayCell(date, false, todayKey);
      el.calendarGrid.appendChild(cell);
    }

    // Next month filler days (fill out remaining grid up to 35 or 42 cells)
    const totalRendered = firstDayOfMonth + daysInMonth;
    const nextDaysNeeded = totalRendered <= 35 ? (35 - totalRendered) : (42 - totalRendered);
    for (let day = 1; day <= nextDaysNeeded; day++) {
      const nextDate = new Date(year, month + 1, day);
      const cell = createDayCell(nextDate, true, todayKey);
      el.calendarGrid.appendChild(cell);
    }

    // Update Month Stats
    const monthPending = monthTotalTasks - monthDoneTasks;
    const percent = monthTotalTasks > 0 ? Math.round((monthDoneTasks / monthTotalTasks) * 100) : 0;

    el.statMonthTotal.textContent = monthTotalTasks;
    el.statMonthDone.textContent = monthDoneTasks;
    el.statMonthPending.textContent = monthPending;
    el.statProgressBar.style.width = `${percent}%`;
    el.statProgressPercent.textContent = `${percent}%`;
  }

  function createDayCell(date, isOtherMonth, todayKey) {
    const dateKey = formatDateKey(date);
    const tasks = state.tasks[dateKey] || [];
    const isToday = dateKey === todayKey;
    const isHoliday = !!state.holidays[dateKey];

    const cell = document.createElement('div');
    cell.className = 'day-cell';
    if (isOtherMonth) cell.classList.add('other-month');
    if (isToday) cell.classList.add('is-today');
    if (isHoliday) cell.classList.add('is-holiday');

    // Filter check
    let filteredTasks = tasks;
    if (state.tagFilter !== 'all') {
      filteredTasks = tasks.filter(t => t.tags && t.tags.includes(state.tagFilter));
    }

    const totalTasks = tasks.length;
    const doneTasks = tasks.filter(t => t.done).length;

    if (totalTasks > 0) {
      cell.classList.add('has-tasks');
      if (doneTasks === totalTasks) {
        cell.classList.add('all-done');
      }
    }

    // Header (Date number & badge)
    const header = document.createElement('div');
    header.className = 'day-cell-header';

    const numSpan = document.createElement('span');
    numSpan.className = 'day-number';
    numSpan.textContent = date.getDate();
    header.appendChild(numSpan);

    if (isHoliday) {
      const holBadge = document.createElement('span');
      holBadge.className = 'holiday-badge';
      holBadge.title = 'วันหยุดพักผ่อน (คลิกขวาเพื่อสลับวันหยุด)';
      holBadge.innerHTML = '🏖️ วันหยุด';
      header.appendChild(holBadge);
    }

    if (totalTasks > 0) {
      const badge = document.createElement('span');
      badge.className = `day-task-count-badge ${doneTasks === totalTasks ? 'done' : ''}`;
      badge.setAttribute('draggable', 'true');
      badge.title = `คลิกลากป้ายนี้เพื่อย้ายหรือคัดลอกทั้ง ${totalTasks} งานไปวันอื่น`;
      badge.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="9" cy="6" r="1.5"></circle><circle cx="15" cy="6" r="1.5"></circle><circle cx="9" cy="12" r="1.5"></circle><circle cx="15" cy="12" r="1.5"></circle><circle cx="9" cy="18" r="1.5"></circle><circle cx="15" cy="18" r="1.5"></circle></svg> <span>${doneTasks}/${totalTasks}</span>`;

      // Entire day drag from badge
      badge.addEventListener('dragstart', (e) => {
        isCalendarPillDragging = true;
        calendarDragData = { type: 'all_day', fromDateKey: dateKey, totalTasks, doneTasks };
        e.dataTransfer.setData('text/plain', JSON.stringify(calendarDragData));
        e.dataTransfer.effectAllowed = 'copyMove';
        setTimeout(() => badge.classList.add('is-dragging'), 0);
      });

      badge.addEventListener('dragend', () => {
        badge.classList.remove('is-dragging');
        document.querySelectorAll('.day-cell').forEach(c => c.classList.remove('day-cell-drop-target'));
        setTimeout(() => {
          isCalendarPillDragging = false;
          calendarDragData = null;
        }, 120);
      });

      header.appendChild(badge);
    }

    cell.appendChild(header);

    // Mini tasks previews
    const previewContainer = document.createElement('div');
    previewContainer.className = 'day-cell-tasks-preview';

    const maxDisplay = 3;
    const displayList = filteredTasks.slice(0, maxDisplay);

    displayList.forEach(task => {
      const pill = document.createElement('div');
      pill.className = `mini-task-pill ${task.done ? 'is-done' : ''}`;
      pill.setAttribute('draggable', 'true');
      pill.title = 'คลิกลากไปใส่วันอื่นเพื่อทำงานต่อเนื่องหรือย้ายวัน';

      // Pick first tag color if available
      let tagColor = '#738496';
      if (task.tags && task.tags.length > 0) {
        const firstLabel = state.labels.find(l => l.id === task.tags[0]);
        if (firstLabel) tagColor = firstLabel.color;
      }
      pill.style.borderLeftColor = tagColor;

      const dot = document.createElement('span');
      dot.className = 'status-dot';
      dot.style.backgroundColor = task.done ? 'var(--success-color)' : tagColor;

      const titleSpan = document.createElement('span');
      titleSpan.textContent = task.title;

      pill.appendChild(dot);
      pill.appendChild(titleSpan);

      if (task.attachments && task.attachments.length > 0) {
        const attIcon = document.createElement('span');
        attIcon.className = 'cell-task-attachment-icon';
        attIcon.textContent = `📎${task.attachments.length > 1 ? task.attachments.length : ''}`;
        attIcon.title = `มี ${task.attachments.length} ไฟล์แนบ`;
        pill.appendChild(attIcon);
      }

      // Pill Drag events on Calendar
      pill.addEventListener('dragstart', (e) => {
        isCalendarPillDragging = true;
        calendarDragData = { type: 'single_task', taskId: task.id, fromDateKey: dateKey };
        e.dataTransfer.setData('text/plain', JSON.stringify(calendarDragData));
        e.dataTransfer.effectAllowed = 'copyMove';
        setTimeout(() => pill.classList.add('is-dragging'), 0);
      });

      pill.addEventListener('dragend', () => {
        pill.classList.remove('is-dragging');
        document.querySelectorAll('.day-cell').forEach(c => c.classList.remove('day-cell-drop-target'));
        setTimeout(() => {
          isCalendarPillDragging = false;
          calendarDragData = null;
        }, 120);
      });

      previewContainer.appendChild(pill);
    });

    if (filteredTasks.length > maxDisplay) {
      const more = document.createElement('div');
      more.className = 'more-tasks-indicator';
      more.setAttribute('draggable', 'true');
      more.title = `คลิกลากเพื่อย้าย/คัดลอกทั้ง ${totalTasks} งานของวันนี้ไปวันอื่น`;
      more.textContent = `+ อีก ${filteredTasks.length - maxDisplay} งาน (ลากทั้งวันได้)`;

      more.addEventListener('dragstart', (e) => {
        isCalendarPillDragging = true;
        calendarDragData = { type: 'all_day', fromDateKey: dateKey, totalTasks, doneTasks };
        e.dataTransfer.setData('text/plain', JSON.stringify(calendarDragData));
        e.dataTransfer.effectAllowed = 'copyMove';
        setTimeout(() => more.classList.add('is-dragging'), 0);
      });

      more.addEventListener('dragend', () => {
        more.classList.remove('is-dragging');
        document.querySelectorAll('.day-cell').forEach(c => c.classList.remove('day-cell-drop-target'));
        setTimeout(() => {
          isCalendarPillDragging = false;
          calendarDragData = null;
        }, 120);
      });

      previewContainer.appendChild(more);
    }

    if (filteredTasks.length === 0 && isHoliday) {
      const holEmpty = document.createElement('div');
      holEmpty.className = 'holiday-empty-banner';
      holEmpty.textContent = '🏖️ วันหยุดพักผ่อน';
      cell.appendChild(holEmpty);
    }

    cell.appendChild(previewContainer);

    // Cell Dragover & Drop events for receiving dragged tasks
    cell.addEventListener('dragover', (e) => {
      if (calendarDragData && calendarDragData.fromDateKey !== dateKey) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        cell.classList.add('day-cell-drop-target');
      }
    });

    cell.addEventListener('dragleave', (e) => {
      if (!cell.contains(e.relatedTarget)) {
        cell.classList.remove('day-cell-drop-target');
      }
    });

    cell.addEventListener('drop', (e) => {
      if (calendarDragData && calendarDragData.fromDateKey !== dateKey) {
        e.preventDefault();
        cell.classList.remove('day-cell-drop-target');
        promptCalendarTaskDrop(calendarDragData, dateKey);
      }
    });

    // Right-click on cell quickly toggles holiday!
    cell.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      toggleHoliday(dateKey);
    });

    // Click handler to open day detail
    cell.addEventListener('click', () => {
      if (isCalendarPillDragging) return;
      openDayModal(dateKey);
    });

    return cell;
  }

  // --- Calendar Drag & Drop Across Days Controller ---
  let pendingDropData = null;

  function promptCalendarTaskDrop(dragData, toDateKey) {
    const fromDateKey = dragData.fromDateKey;
    const fromDate = parseDateKey(fromDateKey);
    const toDate = parseDateKey(toDateKey);

    const fromTasks = state.tasks[fromDateKey] || [];
    if (fromTasks.length === 0) return;

    pendingDropData = { dragData, fromDateKey, toDateKey, fromTasks };

    el.dragFromDateTxt.textContent = `จาก: ${formatThaiShortDate(fromDate)}`;
    el.dragToDateTxt.textContent = `ไปยัง: ${formatThaiShortDate(toDate)}`;

    if (dragData.type === 'all_day') {
      // Dragging entire day
      const totalCount = fromTasks.length;
      const doneCount = fromTasks.filter(t => t.done).length;
      const pendingCount = totalCount - doneCount;

      document.getElementById('dragDropModalHeader').textContent = `📅 จัดการงานทั้งหมดของวัน (${totalCount} งาน)`;
      
      // Preview card showing list of all tasks in that day
      el.dragTaskPreviewCard.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 4px; width: 100%;">
          <div style="font-weight: 600; font-size: 0.92rem; color: var(--accent-primary);">
            งานทั้งหมด ${totalCount} งาน (${doneCount > 0 ? `เสร็จแล้ว ${doneCount}, ` : ''}ค้างอยู่ ${pendingCount} งาน)
          </div>
          <div style="font-size: 0.78rem; color: var(--text-secondary); max-height: 80px; overflow-y: auto;">
            ${fromTasks.map(t => `<div>• ${t.title} ${t.done ? '<span style="color:var(--success-color);">(เสร็จแล้ว)</span>' : ''}</div>`).join('')}
          </div>
        </div>
      `;

      el.btnChoiceCopyTitle.textContent = `คัดลอกทั้งวันไปทำต่อ (ทั้ง ${totalCount} งาน)`;
      el.btnChoiceCopyDesc.textContent = `สร้างงานทั้ง ${totalCount} งานในวันใหม่เพื่อทำต่อ โดยคงข้อมูล Tags และรายละเอียดไว้ครบถ้วน`;

      // If some tasks are done and some are pending, offer copy pending only
      if (pendingCount > 0 && doneCount > 0) {
        el.btnChoiceCopyPending.style.display = 'flex';
        el.btnChoicePendingTitle.textContent = `คัดลอกเฉพาะงานที่ยังไม่เสร็จ (${pendingCount} งาน)`;
        el.btnChoicePendingDesc.textContent = `คัดลอกเฉพาะงานที่ยังค้างอยู่ไปทำต่อในวันถัดไป (งานที่เสร็จแล้ว ${doneCount} งานจะคงอยู่ที่เดิม)`;
      } else {
        el.btnChoiceCopyPending.style.display = 'none';
      }

      el.btnChoiceMoveTitle.textContent = `ย้ายงานทั้งวันไปวันใหม่ (ทั้ง ${totalCount} งาน)`;
      el.btnChoiceMoveDesc.textContent = `ย้ายงานทั้งหมดจากวันเดิมไปอยู่วันใหม่แทน (ลบออกจากวันเดิม)`;

    } else {
      // Single task drag
      const task = fromTasks.find(t => t.id === dragData.taskId);
      if (!task) return;

      document.getElementById('dragDropModalHeader').textContent = `📅 จัดการงานต่อเนื่องข้ามวัน`;

      el.dragTaskPreviewCard.innerHTML = `
        <div class="drag-task-preview-title">${task.title}</div>
        <div id="dragTaskTagsRow" class="task-tags-row"></div>
      `;

      const tagsRow = el.dragTaskPreviewCard.querySelector('#dragTaskTagsRow');
      if (task.tags && task.tags.length > 0) {
        task.tags.forEach(tid => {
          const lbl = state.labels.find(l => l.id === tid);
          if (lbl) {
            tagsRow.appendChild(createTagBadge(lbl));
          }
        });
      }

      el.btnChoiceCopyTitle.textContent = `คัดลอกเพื่อทำงานต่อเนื่อง`;
      el.btnChoiceCopyDesc.textContent = `สร้างงานนี้ในวันใหม่เพื่อทำต่อ (โดยคงงานในวันเดิมไว้ด้วย)`;
      el.btnChoiceCopyPending.style.display = 'none';

      el.btnChoiceMoveTitle.textContent = `ย้ายงานไปวันใหม่`;
      el.btnChoiceMoveDesc.textContent = `ย้ายงานนี้จากวันเดิมไปอยู่วันใหม่แทน (ลบออกจากวันเดิม)`;
    }

    el.dragDropActionModal.classList.add('active');
  }

  function closeDragDropModal() {
    el.dragDropActionModal.classList.remove('active');
    pendingDropData = null;
  }

  function handleConfirmCopyTask() {
    if (!pendingDropData) return;
    const { dragData, fromTasks, toDateKey } = pendingDropData;

    recordUndo('คัดลอกงานไปวันใหม่');

    if (!state.tasks[toDateKey]) {
      state.tasks[toDateKey] = [];
    }

    const toDate = parseDateKey(toDateKey);

    if (dragData.type === 'all_day') {
      // Copy all tasks of the day
      fromTasks.forEach(task => {
        const newTask = {
          id: 'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          title: task.title,
          desc: task.desc || '',
          done: false, // Reset done for continuous work
          tags: [...(task.tags || [])]
        };
        state.tasks[toDateKey].push(newTask);
      });

      saveTasks();
      renderCalendar();
      if (state.activeModalDate === toDateKey) renderDayTasks();

      showToast(`คัดลอกทั้ง ${fromTasks.length} งานไปทำต่อใน ${formatThaiShortDate(toDate)} สำเร็จ 🎉`);
    } else {
      // Single task copy
      const task = fromTasks.find(t => t.id === dragData.taskId);
      if (task) {
        const newTask = {
          id: 'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          title: task.title,
          desc: task.desc || '',
          done: false,
          tags: [...(task.tags || [])]
        };
        state.tasks[toDateKey].push(newTask);
        saveTasks();
        renderCalendar();
        if (state.activeModalDate === toDateKey) renderDayTasks();
        showToast(`คัดลอกงานไปทำต่อใน ${formatThaiShortDate(toDate)} สำเร็จ 🎉`);
      }
    }

    closeDragDropModal();
  }

  function handleConfirmCopyPending() {
    if (!pendingDropData) return;
    const { fromTasks, toDateKey } = pendingDropData;

    const pendingTasks = fromTasks.filter(t => !t.done);
    if (pendingTasks.length === 0) return;

    recordUndo('คัดลอกเฉพาะงานค้างไปวันใหม่');

    if (!state.tasks[toDateKey]) {
      state.tasks[toDateKey] = [];
    }

    pendingTasks.forEach(task => {
      const newTask = {
        id: 'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        title: task.title,
        desc: task.desc || '',
        done: false,
        tags: [...(task.tags || [])]
      };
      state.tasks[toDateKey].push(newTask);
    });

    saveTasks();
    renderCalendar();
    if (state.activeModalDate === toDateKey) renderDayTasks();

    const toDate = parseDateKey(toDateKey);
    showToast(`คัดลอกเฉพาะงานค้าง ${pendingTasks.length} งานไปทำต่อใน ${formatThaiShortDate(toDate)} สำเร็จ 🎉`);
    closeDragDropModal();
  }

  function handleConfirmMoveTask() {
    if (!pendingDropData) return;
    const { dragData, fromDateKey, fromTasks, toDateKey } = pendingDropData;
    const toDate = parseDateKey(toDateKey);

    recordUndo('ย้ายงานไปวันใหม่');

    if (!state.tasks[toDateKey]) {
      state.tasks[toDateKey] = [];
    }

    if (dragData.type === 'all_day') {
      // Move all tasks of the day
      fromTasks.forEach(t => state.tasks[toDateKey].push(t));
      delete state.tasks[fromDateKey];

      saveTasks();
      renderCalendar();
      if (state.activeModalDate === fromDateKey || state.activeModalDate === toDateKey) {
        renderDayTasks();
      }
      showToast(`ย้ายทั้ง ${fromTasks.length} งานไปยัง ${formatThaiShortDate(toDate)} สำเร็จ`);
    } else {
      // Single task move
      const task = fromTasks.find(t => t.id === dragData.taskId);
      if (task) {
        state.tasks[fromDateKey] = state.tasks[fromDateKey].filter(t => t.id !== task.id);
        if (state.tasks[fromDateKey].length === 0) {
          delete state.tasks[fromDateKey];
        }
        state.tasks[toDateKey].push(task);

        saveTasks();
        renderCalendar();
        if (state.activeModalDate === fromDateKey || state.activeModalDate === toDateKey) {
          renderDayTasks();
        }
        showToast(`ย้ายงานไปยัง ${formatThaiShortDate(toDate)} สำเร็จ`);
      }
    }

    closeDragDropModal();
  }

  function updateTagFilterSelect() {
    const currentVal = el.tagFilterSelect.value;
    el.tagFilterSelect.innerHTML = `<option value="all">🏷️ ทุก Tags (${state.labels.length})</option>`;
    state.labels.forEach(lbl => {
      const opt = document.createElement('option');
      opt.value = lbl.id;
      opt.textContent = `● ${lbl.title}`;
      el.tagFilterSelect.appendChild(opt);
    });
    el.tagFilterSelect.value = state.labels.some(l => l.id === currentVal) ? currentVal : 'all';
  }

  // --- Holiday Management ---
  function updateHolidayButtonUI() {
    if (!state.activeModalDate) return;
    const isHoliday = !!state.holidays[state.activeModalDate];
    if (el.btnToggleHoliday) {
      el.btnToggleHoliday.classList.toggle('active', isHoliday);
      if (el.holidayBtnText) {
        el.holidayBtnText.textContent = isHoliday ? 'เป็นวันหยุดแล้ว (คลิกเพื่อยกเลิก)' : 'กำหนดเป็นวันหยุด';
      }
      if (el.holidayBtnIcon) {
        el.holidayBtnIcon.textContent = isHoliday ? '✅🏖️' : '🏖️';
      }
    }
  }

  function toggleHoliday(dateKey) {
    if (!dateKey) dateKey = state.activeModalDate;
    if (!dateKey) return;

    const wasHoliday = !!state.holidays[dateKey];
    const date = parseDateKey(dateKey);
    const dateStr = formatThaiShortDate(date);

    recordUndo(wasHoliday ? `ยกเลิกวันหยุดวันที่ ${dateStr}` : `กำหนดให้ ${dateStr} เป็นวันหยุด`);

    if (wasHoliday) {
      delete state.holidays[dateKey];
      showToast(`ยกเลิกวันหยุดวันที่ ${dateStr} แล้ว`);
    } else {
      state.holidays[dateKey] = true;
      showToast(`🏖️ กำหนดให้วันที่ ${dateStr} เป็นวันหยุดแล้ว`);
    }

    saveHolidays();
    updateHolidayButtonUI();
    renderCalendar();
    if (state.activeModalDate) {
      renderDayTasks();
    }
  }

  // --- Day Detail Modal ---
  function openDayModal(dateKey) {
    state.activeModalDate = dateKey;
    const date = parseDateKey(dateKey);

    el.modalDateTitle.textContent = formatThaiFullDate(date);
    state.newTaskSelectedTagIds = [];
    renderNewTaskSelectedTags();
    state.newTaskAttachments = [];
    renderNewTaskAttachments();
    el.taskTitleInput.value = '';
    el.taskDescInput.value = '';

    updateHolidayButtonUI();
    renderDayTasks();
    el.dayModal.classList.add('active');
  }

  function closeDayModal() {
    el.dayModal.classList.remove('active');
    state.activeModalDate = null;
    renderCalendar();
  }

  function renderDayTasks() {
    if (!state.activeModalDate) return;
    const dateKey = state.activeModalDate;
    const tasks = state.tasks[dateKey] || [];

    const total = tasks.length;
    const doneCount = tasks.filter(t => t.done).length;
    const pendingCount = total - doneCount;
    const percent = total > 0 ? Math.round((doneCount / total) * 100) : 0;

    const isHoliday = !!state.holidays[dateKey];
    const holidayPrefix = isHoliday ? '🏖️ วันหยุด | ' : '';
    el.modalDateSubtitle.textContent = `${holidayPrefix}${total} งาน (เสร็จแล้ว ${doneCount} งาน, เหลือ ${pendingCount} งาน)`;
    el.dayTasksCount.textContent = total;

    // Update Day Sidebar Stats
    const dayProgressFill = document.getElementById('dayProgressBar');
    const dayProgressTxt = document.getElementById('dayProgressPercent');
    if (dayProgressFill) dayProgressFill.style.width = `${percent}%`;
    if (dayProgressTxt) dayProgressTxt.textContent = `${percent}%`;

    const countAll = document.getElementById('countTabAll');
    const countPending = document.getElementById('countTabPending');
    const countDone = document.getElementById('countTabDone');
    if (countAll) countAll.textContent = total;
    if (countPending) countPending.textContent = pendingCount;
    if (countDone) countDone.textContent = doneCount;

    // Filter by tab
    let displayTasks = tasks;
    if (state.dayTaskFilter === 'pending') {
      displayTasks = tasks.filter(t => !t.done);
    } else if (state.dayTaskFilter === 'done') {
      displayTasks = tasks.filter(t => t.done);
    }

    el.dayTaskList.innerHTML = '';

    if (displayTasks.length === 0) {
      el.dayTaskList.innerHTML = `
        <div class="empty-state">
          <div class="icon">📝</div>
          <p>${total === 0 ? 'ยังไม่มีงานที่บันทึกในวันนี้' : 'ไม่มีงานที่ตรงกับตัวกรอง'}</p>
        </div>
      `;
      return;
    }

    let draggedTaskId = null;

    displayTasks.forEach((task, index) => {
      const item = document.createElement('div');
      item.className = `task-item ${task.done ? 'is-completed' : ''}`;
      item.setAttribute('draggable', 'true');
      item.dataset.taskId = task.id;

      // Drag Handle
      const dragHandle = document.createElement('div');
      dragHandle.className = 'task-drag-handle';
      dragHandle.title = 'คลิกลากเพื่อจัดลำดับงาน';
      dragHandle.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="8" cy="6" r="1.5"></circle><circle cx="16" cy="6" r="1.5"></circle><circle cx="8" cy="12" r="1.5"></circle><circle cx="16" cy="12" r="1.5"></circle><circle cx="8" cy="18" r="1.5"></circle><circle cx="16" cy="18" r="1.5"></circle></svg>`;

      // Checkbox
      const checkContainer = document.createElement('div');
      checkContainer.className = 'task-checkbox-container';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'custom-checkbox';
      checkbox.checked = !!task.done;
      checkbox.title = task.done ? 'คลิกเพื่อเปลี่ยนเป็นยังไม่เสร็จ' : 'คลิกเมื่อสำเร็จงานนี้';
      checkbox.addEventListener('change', () => {
        recordUndo(checkbox.checked ? `ติ๊กสำเร็จงาน "${task.title}"` : `ยกเลิกสำเร็จงาน "${task.title}"`);
        task.done = checkbox.checked;
        saveTasks();
        renderDayTasks();
        renderCalendar();
        showToast(task.done ? 'งานสำเร็จเรียบร้อยแล้ว 🎉' : 'ปรับสถานะเป็นกำลังดำเนินการ');
      });
      checkContainer.appendChild(checkbox);

      // Content
      const content = document.createElement('div');
      content.className = 'task-content';

      const titleWrap = document.createElement('div');
      titleWrap.className = 'task-title-wrap';

      const title = document.createElement('div');
      title.className = 'task-title';
      title.textContent = task.title;
      titleWrap.appendChild(title);

      if (task.desc && task.desc.trim()) {
        const desc = document.createElement('div');
        desc.className = 'task-desc';
        desc.textContent = task.desc;
        titleWrap.appendChild(desc);
      }
      content.appendChild(titleWrap);

      // Tags Badges
      const tagsRow = document.createElement('div');
      tagsRow.className = 'task-tags-row';

      if (task.tags && task.tags.length > 0) {
        task.tags.forEach(tagId => {
          const label = state.labels.find(l => l.id === tagId);
          if (label) {
            const badge = createTagBadge(label);
            tagsRow.appendChild(badge);
          }
        });
      }

      // Quick Tag Add Button
      const addTagBtn = document.createElement('button');
      addTagBtn.type = 'button';
      addTagBtn.className = 'btn btn-sm btn-outline';
      addTagBtn.style.padding = '1px 6px';
      addTagBtn.style.fontSize = '0.72rem';
      addTagBtn.innerHTML = `+ Tag`;
      addTagBtn.title = 'จัดการ Tags สำหรับงานนี้';
      addTagBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openLabelPickerForTask(task.id, dateKey);
      });
      tagsRow.appendChild(addTagBtn);

      content.appendChild(tagsRow);

      // Attachments Row
      if (task.attachments && task.attachments.length > 0) {
        const attRow = document.createElement('div');
        attRow.className = 'task-attachments-row';
        task.attachments.forEach(att => {
          const chip = createAttachmentChip(att, false);
          attRow.appendChild(chip);
        });
        content.appendChild(attRow);
      }

      // Actions (Move Up/Down, Edit, Delete)
      const actions = document.createElement('div');
      actions.className = 'task-actions';

      // Move Up Button
      if (index > 0) {
        const upBtn = document.createElement('button');
        upBtn.type = 'button';
        upBtn.className = 'btn-icon move-btn';
        upBtn.title = 'เลื่อนขึ้น';
        upBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg>`;
        upBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          moveTaskOffset(task.id, -1);
        });
        actions.appendChild(upBtn);
      }

      // Move Down Button
      if (index < displayTasks.length - 1) {
        const downBtn = document.createElement('button');
        downBtn.type = 'button';
        downBtn.className = 'btn-icon move-btn';
        downBtn.title = 'เลื่อนลง';
        downBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
        downBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          moveTaskOffset(task.id, 1);
        });
        actions.appendChild(downBtn);
      }

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn-icon';
      editBtn.title = 'แก้ไขข้อความงาน';
      editBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
      editBtn.addEventListener('click', () => {
        openEditTaskModal(task, dateKey);
      });

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn-icon';
      delBtn.title = 'ลบงานนี้';
      delBtn.style.color = 'var(--danger-color)';
      delBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
      delBtn.addEventListener('click', () => {
        if (confirm(`คุณต้องการลบงาน "${task.title}" ใช่หรือไม่?`)) {
          deleteTask(task.id, dateKey);
        }
      });

      // Prevent drag on interactive buttons
      [checkbox, addTagBtn, editBtn, delBtn].forEach(el => {
        if (el) el.addEventListener('mousedown', (e) => e.stopPropagation());
      });

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      item.appendChild(dragHandle);
      item.appendChild(checkContainer);
      item.appendChild(content);
      item.appendChild(actions);

      // Drag and Drop Events
      item.addEventListener('dragstart', (e) => {
        draggedTaskId = task.id;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', task.id);
        setTimeout(() => item.classList.add('is-dragging'), 0);
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('is-dragging');
        document.querySelectorAll('.task-item').forEach(el => {
          el.classList.remove('drag-over-top', 'drag-over-bottom');
        });
        draggedTaskId = null;
      });

      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!draggedTaskId || draggedTaskId === task.id) return;
        e.dataTransfer.dropEffect = 'move';

        const rect = item.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (e.clientY < midY) {
          item.classList.add('drag-over-top');
          item.classList.remove('drag-over-bottom');
        } else {
          item.classList.add('drag-over-bottom');
          item.classList.remove('drag-over-top');
        }
      });

      item.addEventListener('dragleave', () => {
        item.classList.remove('drag-over-top', 'drag-over-bottom');
      });

      item.addEventListener('drop', (e) => {
        e.preventDefault();
        const sourceId = e.dataTransfer.getData('text/plain') || draggedTaskId;
        const isTop = item.classList.contains('drag-over-top');
        item.classList.remove('drag-over-top', 'drag-over-bottom');

        if (sourceId && sourceId !== task.id) {
          reorderTask(sourceId, task.id, isTop);
        }
      });

      el.dayTaskList.appendChild(item);
    });
  }

  function reorderTask(sourceId, targetId, insertBefore) {
    const dateKey = state.activeModalDate;
    if (!dateKey || !state.tasks[dateKey]) return;
    const list = state.tasks[dateKey];

    const fromIdx = list.findIndex(t => t.id === sourceId);
    const toIdx = list.findIndex(t => t.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    recordUndo('จัดลำดับงาน');

    const [movedItem] = list.splice(fromIdx, 1);
    let newIdx = list.findIndex(t => t.id === targetId);
    if (!insertBefore) {
      newIdx += 1;
    }
    list.splice(newIdx, 0, movedItem);

    saveTasks();
    renderDayTasks();
    renderCalendar();
    showToast('จัดลำดับงานเรียบร้อยแล้ว');
  }

  function moveTaskOffset(taskId, offset) {
    const dateKey = state.activeModalDate;
    if (!dateKey || !state.tasks[dateKey]) return;
    const list = state.tasks[dateKey];

    const curIdx = list.findIndex(t => t.id === taskId);
    if (curIdx === -1) return;
    const targetIdx = curIdx + offset;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    recordUndo('สลับลำดับงาน');

    const [item] = list.splice(curIdx, 1);
    list.splice(targetIdx, 0, item);

    saveTasks();
    renderDayTasks();
    renderCalendar();
  }

  function createTagBadge(label, removable = false, onRemove = null) {
    const badge = document.createElement('span');
    badge.className = `tag-badge ${removable ? 'tag-badge-removable' : ''}`;
    badge.style.backgroundColor = label.color;

    if (state.colorblindMode && label.pattern && PATTERN_SVGS[label.pattern]) {
      const patternSpan = document.createElement('span');
      patternSpan.className = 'label-pattern';
      patternSpan.innerHTML = PATTERN_SVGS[label.pattern];
      badge.appendChild(patternSpan);
    }

    const textSpan = document.createElement('span');
    textSpan.textContent = label.title;
    badge.appendChild(textSpan);

    if (removable && onRemove) {
      const closeSpan = document.createElement('span');
      closeSpan.innerHTML = ' &times;';
      closeSpan.style.marginLeft = '4px';
      closeSpan.style.fontWeight = 'bold';
      badge.appendChild(closeSpan);
      badge.addEventListener('click', onRemove);
    }

    return badge;
  }

  function renderNewTaskSelectedTags() {
    el.newTaskSelectedTagsPills.innerHTML = '';
    state.newTaskSelectedTagIds.forEach(id => {
      const label = state.labels.find(l => l.id === id);
      if (label) {
        const badge = createTagBadge(label, true, () => {
          state.newTaskSelectedTagIds = state.newTaskSelectedTagIds.filter(tid => tid !== id);
          renderNewTaskSelectedTags();
        });
        el.newTaskSelectedTagsPills.appendChild(badge);
      }
    });
  }

  function handleAddNewTask(e) {
    e.preventDefault();
    const title = el.taskTitleInput.value.trim();
    if (!title) return;

    const desc = el.taskDescInput.value.trim();
    const dateKey = state.activeModalDate;
    if (!dateKey) return;

    recordUndo(`เพิ่มงาน "${title}"`);

    if (!state.tasks[dateKey]) {
      state.tasks[dateKey] = [];
    }

    const newTask = {
      id: 'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      title: title,
      desc: desc,
      done: false,
      tags: [...state.newTaskSelectedTagIds],
      attachments: [...state.newTaskAttachments]
    };

    state.tasks[dateKey].unshift(newTask);
    saveTasks();

    // Reset inputs
    el.taskTitleInput.value = '';
    el.taskDescInput.value = '';
    state.newTaskSelectedTagIds = [];
    renderNewTaskSelectedTags();
    state.newTaskAttachments = [];
    renderNewTaskAttachments();

    renderDayTasks();
    renderCalendar();
    showToast('เพิ่มงานใหม่เรียบร้อยแล้ว');
  }

  function deleteTask(taskId, dateKey) {
    if (!state.tasks[dateKey]) return;
    const taskToDelete = state.tasks[dateKey].find(t => t.id === taskId);
    recordUndo(`ลบงาน "${taskToDelete ? taskToDelete.title : ''}"`);

    state.tasks[dateKey] = state.tasks[dateKey].filter(t => t.id !== taskId);
    if (state.tasks[dateKey].length === 0) {
      delete state.tasks[dateKey];
    }
    saveTasks();
    renderDayTasks();
    renderCalendar();
    showToast('ลบงานเรียบร้อยแล้ว');
  }

  // --- Edit Task Modal ---
  function openEditTaskModal(task, dateKey) {
    el.editTaskId.value = task.id;
    el.editTaskDate.value = dateKey;
    el.editTaskTitle.value = task.title;
    el.editTaskDesc.value = task.desc || '';
    state.editingTaskAttachments = task.attachments ? JSON.parse(JSON.stringify(task.attachments)) : [];
    renderEditTaskAttachments();
    el.editTaskModal.classList.add('active');
  }

  function closeEditTaskModal() {
    el.editTaskModal.classList.remove('active');
    state.editingTaskAttachments = [];
    hideAttachmentPreview();
  }

  function handleSaveEditTask(e) {
    e.preventDefault();
    const taskId = el.editTaskId.value;
    const dateKey = el.editTaskDate.value;
    const title = el.editTaskTitle.value.trim();
    const desc = el.editTaskDesc.value.trim();

    if (!title || !dateKey || !state.tasks[dateKey]) return;

    const task = state.tasks[dateKey].find(t => t.id === taskId);
    if (task) {
      recordUndo(`แก้ไขงาน "${title}"`);
      task.title = title;
      task.desc = desc;
      task.attachments = [...state.editingTaskAttachments];
      saveTasks();
      renderDayTasks();
      renderCalendar();
      closeEditTaskModal();
      showToast('แก้ไขข้อมูลงานสำเร็จ');
    }
  }

  // ============================================================
  // File Attachments & Google Drive Management Module
  // ============================================================
  const GOOGLE_DRIVE_FOLDER_ID = window.GOOGLE_DRIVE_FOLDER_ID || '1xF51wwGdvrCjMzzYC3CR84xMr5VZQC9K';
  const IDB_NAME = 'WorkTrackerFilesDB';
  const IDB_STORE = 'attachments';

  function openFilesDB() {
    return new Promise((resolve) => {
      if (!window.indexedDB) {
        resolve(null);
        return;
      }
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(IDB_STORE)) {
          req.result.createObjectStore(IDB_STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  }

  async function saveFileToIndexedDB(id, dataUrl) {
    try {
      const db = await openFilesDB();
      if (!db) return;
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put({ id, data: dataUrl, updatedAt: Date.now() });
    } catch (e) {
      console.warn('IndexedDB save failed', e);
    }
  }

  async function getFileFromIndexedDB(id) {
    try {
      const db = await openFilesDB();
      if (!db) return null;
      return new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get(id);
        req.onsuccess = () => resolve(req.result ? req.result.data : null);
        req.onerror = () => resolve(null);
      });
    } catch (e) {
      return null;
    }
  }

  function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  }

  function createThumbnail(file, maxDimension = 300, quality = 0.7) {
    return new Promise((resolve) => {
      if (!file.type || !file.type.startsWith('image/')) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDimension) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(null);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }

  async function uploadFileToGoogleDrive(file, accessToken) {
    if (!accessToken) throw new Error('No Google Access Token');
    const folderId = GOOGLE_DRIVE_FOLDER_ID;

    const metadata = {
      name: file.name,
      parents: [folderId],
      mimeType: file.type || 'application/octet-stream'
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,thumbnailLink', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: form
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ? err.error.message : `Drive upload error: ${res.status}`);
    }

    const driveFile = await res.json();
    return driveFile;
  }

  async function handleFilesSelected(files, targetArray, renderCallback) {
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const attId = 'att-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
      const isImg = file.type && file.type.startsWith('image/');

      const newAtt = {
        id: attId,
        name: file.name,
        size: file.size,
        type: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'),
        thumbnail: null,
        dataUrl: null,
        driveId: null,
        driveLink: null,
        driveThumbnail: null,
        uploadedToDrive: false,
        isUploading: !!state.googleAccessToken
      };

      targetArray.push(newAtt);
      if (renderCallback) renderCallback();

      // Read & thumbnail
      try {
        if (isImg) {
          const thumb = await createThumbnail(file, 280, 0.7);
          newAtt.thumbnail = thumb;
        }
        const dataUrl = await readFileAsDataUrl(file);
        await saveFileToIndexedDB(attId, dataUrl);
        if (file.size < 120000) {
          newAtt.dataUrl = dataUrl;
        }
      } catch (err) {
        console.warn('File read error', err);
      }

      // Upload to Google Drive if access token available
      if (state.googleAccessToken) {
        try {
          const driveData = await uploadFileToGoogleDrive(file, state.googleAccessToken);
          newAtt.driveId = driveData.id;
          newAtt.driveLink = driveData.webViewLink;
          newAtt.driveThumbnail = driveData.thumbnailLink;
          newAtt.uploadedToDrive = true;
          newAtt.isUploading = false;
          showToast(`☁️ อัปโหลด "${file.name}" ขึ้น Google Drive เรียบร้อย`);
        } catch (driveErr) {
          console.warn('Google Drive upload failed, file stored locally', driveErr);
          newAtt.isUploading = false;
          newAtt.uploadedToDrive = false;
          showToast(`💾 บันทึก "${file.name}" ในเครื่อง (Google Drive ต้องล็อกอินใหม่)`, 'info');
        }
      } else {
        newAtt.isUploading = false;
        showToast(`💾 บันทึก "${file.name}" ในเครื่อง (ล็อกอิน Google เพื่อขึ้น Drive)`, 'info');
      }

      if (renderCallback) renderCallback();
    }
  }

  function renderNewTaskAttachments() {
    if (!el.newTaskAttachmentsPreview) return;
    el.newTaskAttachmentsPreview.innerHTML = '';
    if (!state.newTaskAttachments || state.newTaskAttachments.length === 0) return;

    state.newTaskAttachments.forEach(att => {
      const chip = createAttachmentChip(att, true, (toRemove) => {
        state.newTaskAttachments = state.newTaskAttachments.filter(a => a.id !== toRemove.id);
        renderNewTaskAttachments();
      });
      el.newTaskAttachmentsPreview.appendChild(chip);
    });
  }

  function renderEditTaskAttachments() {
    if (!el.editTaskAttachmentsList) return;
    el.editTaskAttachmentsList.innerHTML = '';
    if (!state.editingTaskAttachments || state.editingTaskAttachments.length === 0) {
      el.editTaskAttachmentsList.innerHTML = '<span style="font-size: 0.75rem; color: #8b949e;">ไม่มีไฟล์แนบ</span>';
      return;
    }

    state.editingTaskAttachments.forEach(att => {
      const chip = createAttachmentChip(att, true, (toRemove) => {
        state.editingTaskAttachments = state.editingTaskAttachments.filter(a => a.id !== toRemove.id);
        renderEditTaskAttachments();
      });
      el.editTaskAttachmentsList.appendChild(chip);
    });
  }

  function createAttachmentChip(att, canRemove = false, onRemove = null) {
    const chip = document.createElement('div');
    chip.className = `attachment-chip ${att.isUploading ? 'uploading' : ''}`;

    const isImg = (att.type && att.type.startsWith('image/')) || (att.name && /\.(jpg|jpeg|png|gif|webp)$/i.test(att.name));
    const iconSpan = document.createElement('span');
    iconSpan.className = 'chip-icon';
    iconSpan.textContent = isImg ? '🖼️' : '📄';
    chip.appendChild(iconSpan);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'chip-name';
    nameSpan.textContent = att.name;
    chip.appendChild(nameSpan);

    const badgeSpan = document.createElement('span');
    badgeSpan.className = `chip-badge ${att.uploadedToDrive ? '' : 'local'}`;
    badgeSpan.textContent = att.isUploading ? '☁️ กำลังอัป...' : (att.uploadedToDrive ? '☁️ Drive' : '💾');
    chip.appendChild(badgeSpan);

    if (canRemove && onRemove) {
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'chip-remove-btn';
      removeBtn.innerHTML = '&times;';
      removeBtn.title = 'ลบไฟล์นี้';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        hideAttachmentPreview();
        onRemove(att);
      });
      chip.appendChild(removeBtn);
    }

    if (!att.uploadedToDrive) {
      badgeSpan.title = 'คลิกที่นี่เพื่ออัปโหลดไฟล์นี้ขึ้น Google Drive';
      badgeSpan.style.cursor = 'pointer';
      badgeSpan.addEventListener('click', (e) => {
        e.stopPropagation();
        hideAttachmentPreview();
        uploadExistingAttachmentToDrive(att);
      });
    }

    // Hover Preview Listener
    chip.addEventListener('mouseenter', () => {
      cancelHideAttachmentPreview();
      showAttachmentPreview(att, chip);
    });

    chip.addEventListener('mouseleave', () => {
      scheduleHideAttachmentPreview();
    });

    // Click to Open File
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      openAttachmentFile(att);
    });

    return chip;
  }

  let previewHideTimer = null;

  function scheduleHideAttachmentPreview() {
    if (previewHideTimer) clearTimeout(previewHideTimer);
    previewHideTimer = setTimeout(() => {
      hideAttachmentPreview();
    }, 300);
  }

  function cancelHideAttachmentPreview() {
    if (previewHideTimer) {
      clearTimeout(previewHideTimer);
      previewHideTimer = null;
    }
  }

  function showAttachmentPreview(att, targetEl) {
    if (!el.filePreviewTooltip || !att) return;

    el.filePreviewName.textContent = att.name || 'ไฟล์แนบ';
    el.filePreviewSize.textContent = formatFileSize(att.size);

    if (att.uploadedToDrive && att.driveLink) {
      el.filePreviewStorageBadge.textContent = '☁️ Google Drive';
      el.filePreviewStorageBadge.className = 'preview-storage-badge';
    } else {
      el.filePreviewStorageBadge.textContent = '💾 ไฟล์ในเครื่อง';
      el.filePreviewStorageBadge.className = 'preview-storage-badge badge-local';
    }

    const isImage = (att.type && att.type.startsWith('image/')) || (att.name && /\.(jpg|jpeg|png|gif|webp)$/i.test(att.name));
    if (isImage && (att.thumbnail || att.driveThumbnail || att.dataUrl)) {
      el.filePreviewImage.src = att.thumbnail || att.driveThumbnail || att.dataUrl;
      el.filePreviewImageContainer.style.display = 'flex';
      el.filePreviewPdfContainer.style.display = 'none';
    } else {
      el.filePreviewImageContainer.style.display = 'none';
      el.filePreviewPdfContainer.style.display = 'flex';
    }

    const rect = targetEl.getBoundingClientRect();
    const tooltipX = rect.left + (rect.width / 2);
    let tooltipY = rect.top;

    // Boundary check so tooltip does not go above screen
    if (tooltipY < 220) {
      tooltipY = rect.bottom + 20;
      el.filePreviewTooltip.style.transform = 'translate(-50%, 0)';
    } else {
      el.filePreviewTooltip.style.transform = 'translate(-50%, -100%)';
    }

    if (el.btnTooltipUploadDrive) {
      if (!att.uploadedToDrive) {
        el.btnTooltipUploadDrive.style.display = 'block';
        el.btnTooltipUploadDrive.onclick = (e) => {
          e.stopPropagation();
          hideAttachmentPreview();
          uploadExistingAttachmentToDrive(att);
        };
      } else {
        el.btnTooltipUploadDrive.style.display = 'none';
      }
    }

    el.filePreviewTooltip.style.left = `${Math.max(130, Math.min(window.innerWidth - 130, tooltipX))}px`;
    el.filePreviewTooltip.style.top = `${tooltipY}px`;
    el.filePreviewTooltip.classList.add('active');
  }

  function hideAttachmentPreview() {
    cancelHideAttachmentPreview();
    if (el.filePreviewTooltip) {
      el.filePreviewTooltip.classList.remove('active');
    }
  }

  function dataUrlToBlob(dataUrl) {
    if (!dataUrl) return null;
    const parts = dataUrl.split(',');
    if (parts.length < 2) return null;
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }

  async function openAttachmentFile(att) {
    if (att.driveLink) {
      window.open(att.driveLink, '_blank');
      return;
    }

    let fileData = att.dataUrl;
    if (!fileData) {
      fileData = await getFileFromIndexedDB(att.id);
    }

    if (fileData) {
      try {
        const blob = dataUrlToBlob(fileData);
        if (blob) {
          const blobUrl = URL.createObjectURL(blob);
          const newWin = window.open(blobUrl, '_blank');
          if (!newWin) {
            const a = document.createElement('a');
            a.href = blobUrl;
            a.target = '_blank';
            a.download = att.name || 'document';
            document.body.appendChild(a);
            a.click();
            a.remove();
          }
          setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
          return;
        }
      } catch (e) {
        console.error('Failed to open blob URL', e);
      }
    }

    showToast('⚠️ ไม่พบข้อมูลไฟล์ในเครื่อง', 'info');
  }

  async function uploadExistingAttachmentToDrive(att, renderCallback) {
    if (!state.googleAccessToken) {
      if (state.firebaseAuth) {
        showToast('กรุณาเข้าสู่ระบบ Google เพื่อเปิดสิทธิ์บันทึกไฟล์ลง Drive...', 'info');
        handleGoogleSignIn();
      } else {
        openCloudSyncModal();
        showToast('⚠️ กรุณาเข้าสู่ระบบ Firebase/Google ก่อนอัปโหลดขึ้น Drive', 'warning');
      }
      return;
    }

    let fileData = att.dataUrl;
    if (!fileData) {
      fileData = await getFileFromIndexedDB(att.id);
    }
    if (!fileData) {
      showToast('⚠️ ไม่พบข้อมูลไฟล์ที่จะอัปโหลด', 'error');
      return;
    }

    att.isUploading = true;
    if (renderCallback) renderCallback();
    renderDayTasks();
    showToast(`☁️ กำลังอัปโหลด "${att.name}" ขึ้น Google Drive...`, 'info');

    try {
      const blob = dataUrlToBlob(fileData);
      const fileObj = new File([blob], att.name, { type: att.type });
      const driveData = await uploadFileToGoogleDrive(fileObj, state.googleAccessToken);
      att.driveId = driveData.id;
      att.driveLink = driveData.webViewLink;
      att.driveThumbnail = driveData.thumbnailLink;
      att.uploadedToDrive = true;
      att.isUploading = false;
      saveTasks();
      renderDayTasks();
      renderCalendar();
      if (renderCallback) renderCallback();
      showToast(`🎉 อัปโหลด "${att.name}" ขึ้น Google Drive สำเร็จ!`);
    } catch (err) {
      console.error('Drive upload failed', err);
      att.isUploading = false;
      if (renderCallback) renderCallback();
      renderDayTasks();
      showToast(`⚠️ อัปโหลดไม่สำเร็จ: ${err.message}`, 'error');
    }
  }

  function updateDriveStatusUI() {
    const isConnected = !!state.googleAccessToken;
    [el.btnQuickDriveLogin, el.btnQuickDriveLoginEdit].forEach(btn => {
      if (!btn) return;
      if (isConnected) {
        btn.innerHTML = '<span>🟢 Drive พร้อม</span>';
        btn.classList.add('drive-connected');
        btn.title = 'Google Drive เชื่อมต่อแล้ว (คลิกเพื่อเปิดโฟลเดอร์)';
      } else {
        btn.innerHTML = '<span>☁️ ล็อกอิน Drive</span>';
        btn.classList.remove('drive-connected');
        btn.title = 'คลิกเพื่อเข้าสู่ระบบ Google เพื่ออัปโหลดไฟล์ขึ้น Google Drive อัตโนมัติ';
      }
    });
  }

  // --- ========================================== ---
  // --- TRELLO-STYLE LABELS POPOVER CONTROLLER ---
  // --- ========================================== ---

  function openLabelPickerForNewTask() {
    state.labelPickerMode = 'newTask';
    state.labelPickerTaskId = null;
    showLabelListView();
    renderLabelList();
    el.labelPickerModal.classList.add('active');
  }

  function openLabelPickerForTask(taskId, dateKey) {
    state.labelPickerMode = 'editTaskLabels';
    state.labelPickerTaskId = taskId;
    state.labelPickerDate = dateKey;
    showLabelListView();
    renderLabelList();
    el.labelPickerModal.classList.add('active');
  }

  function openGlobalLabelManager() {
    state.labelPickerMode = 'global';
    state.labelPickerTaskId = null;
    showLabelListView();
    renderLabelList();
    el.labelPickerModal.classList.add('active');
  }

  function closeLabelPicker() {
    el.labelPickerModal.classList.remove('active');
    // If we were editing tags for new task, update preview
    if (state.labelPickerMode === 'newTask') {
      renderNewTaskSelectedTags();
    }
    renderCalendar();
  }

  function showLabelListView() {
    el.labelListView.classList.add('active');
    el.labelEditView.classList.remove('active');
    el.labelSearchInput.value = '';
  }

  function showLabelEditView(labelId = null) {
    el.labelListView.classList.remove('active');
    el.labelEditView.classList.add('active');

    state.editingLabelId = labelId;
    renderColorPalette();

    if (labelId) {
      // Editing existing label
      const label = state.labels.find(l => l.id === labelId);
      el.labelEditorTitle.textContent = 'Edit label';
      el.labelTitleInput.value = label ? label.title : '';
      state.selectedEditorColor = label ? label.color : '#0055cc';
      el.btnDeleteLabel.style.display = 'inline-flex';
    } else {
      // Creating new label
      el.labelEditorTitle.textContent = 'Create label';
      el.labelTitleInput.value = '';
      state.selectedEditorColor = COLOR_PALETTE[0];
      el.btnDeleteLabel.style.display = 'none';
    }

    el.customColorPicker.value = state.selectedEditorColor;
    el.customColorHex.textContent = state.selectedEditorColor;
    updateLivePreview();
  }

  function renderLabelList() {
    const searchTerm = el.labelSearchInput.value.toLowerCase().trim();
    el.labelsContainer.innerHTML = '';

    // Determine which tags are currently active for checkbox checkmark
    let activeTagIds = [];
    if (state.labelPickerMode === 'newTask') {
      activeTagIds = state.newTaskSelectedTagIds;
    } else if (state.labelPickerMode === 'editTaskLabels' && state.labelPickerTaskId && state.labelPickerDate) {
      const task = (state.tasks[state.labelPickerDate] || []).find(t => t.id === state.labelPickerTaskId);
      if (task && task.tags) {
        activeTagIds = task.tags;
      }
    }

    const filteredLabels = state.labels.filter(lbl => 
      !searchTerm || lbl.title.toLowerCase().includes(searchTerm)
    );

    filteredLabels.forEach(label => {
      const row = document.createElement('div');
      row.className = 'trello-label-row';

      // Checkbox
      const isChecked = activeTagIds.includes(label.id);
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'trello-label-checkbox';
      checkbox.checked = isChecked;

      checkbox.addEventListener('change', () => {
        toggleLabelSelection(label.id);
      });

      // Colored Label Pill
      const pill = document.createElement('div');
      pill.className = 'trello-label-pill';
      pill.style.backgroundColor = label.color;

      if (state.colorblindMode && label.pattern && PATTERN_SVGS[label.pattern]) {
        const patternSpan = document.createElement('span');
        patternSpan.className = 'label-pattern';
        patternSpan.innerHTML = PATTERN_SVGS[label.pattern];
        pill.appendChild(patternSpan);
      }

      const textSpan = document.createElement('span');
      textSpan.className = 'label-text';
      textSpan.textContent = label.title;
      pill.appendChild(textSpan);

      // Clicking pill also toggles checkbox
      pill.addEventListener('click', () => {
        toggleLabelSelection(label.id);
      });

      // Edit Button (Pencil Icon)
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'trello-label-edit-btn';
      editBtn.title = 'Edit label';
      editBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showLabelEditView(label.id);
      });

      row.appendChild(checkbox);
      row.appendChild(pill);
      row.appendChild(editBtn);

      el.labelsContainer.appendChild(row);
    });

    if (filteredLabels.length === 0) {
      el.labelsContainer.innerHTML = `<div style="padding: 12px; text-align: center; color: #9fadbc; font-size: 0.85rem;">No labels found</div>`;
    }

    // Colorblind toggle text
    el.colorblindText.textContent = state.colorblindMode ? 'Disable colorblind friendly mode' : 'Enable colorblind friendly mode';
  }

  function toggleLabelSelection(labelId) {
    if (state.labelPickerMode === 'newTask') {
      if (state.newTaskSelectedTagIds.includes(labelId)) {
        state.newTaskSelectedTagIds = state.newTaskSelectedTagIds.filter(id => id !== labelId);
      } else {
        state.newTaskSelectedTagIds.push(labelId);
      }
      renderLabelList();
      renderNewTaskSelectedTags();
    } else if (state.labelPickerMode === 'editTaskLabels') {
      const task = (state.tasks[state.labelPickerDate] || []).find(t => t.id === state.labelPickerTaskId);
      if (task) {
        if (!task.tags) task.tags = [];
        if (task.tags.includes(labelId)) {
          task.tags = task.tags.filter(id => id !== labelId);
        } else {
          task.tags.push(labelId);
        }
        saveTasks();
        renderLabelList();
        renderDayTasks();
        renderCalendar();
      }
    }
  }

  // --- Label Editor (Create / Edit) ---
  function renderColorPalette() {
    el.colorPaletteGrid.innerHTML = '';
    COLOR_PALETTE.forEach(hex => {
      const swatch = document.createElement('div');
      swatch.className = `color-swatch ${state.selectedEditorColor.toLowerCase() === hex.toLowerCase() ? 'selected' : ''}`;
      swatch.style.backgroundColor = hex;
      swatch.addEventListener('click', () => {
        state.selectedEditorColor = hex;
        el.customColorPicker.value = hex;
        el.customColorHex.textContent = hex;
        renderColorPalette();
        updateLivePreview();
      });
      el.colorPaletteGrid.appendChild(swatch);
    });
  }

  function updateLivePreview() {
    const text = el.labelTitleInput.value.trim() || 'Label Preview';
    el.previewLabelText.textContent = text;
    el.labelLivePreview.style.backgroundColor = state.selectedEditorColor;
  }

  function handleSaveLabel() {
    const title = el.labelTitleInput.value.trim();
    if (!title) {
      alert('กรุณาระบุชื่อ Label');
      return;
    }

    const color = state.selectedEditorColor;

    if (state.editingLabelId) {
      // Update existing
      const label = state.labels.find(l => l.id === state.editingLabelId);
      if (label) {
        label.title = title;
        label.color = color;
        showToast(`แก้ไข Tag "${title}" เรียบร้อยแล้ว`);
      }
    } else {
      // Create new
      const patternKeys = Object.keys(PATTERN_SVGS);
      const randomPattern = patternKeys[state.labels.length % patternKeys.length];
      const newLabel = {
        id: 'lbl-' + Date.now(),
        title: title,
        color: color,
        pattern: randomPattern
      };
      state.labels.push(newLabel);
      showToast(`สร้าง Tag ใหม่ "${title}" เรียบร้อยแล้ว`);
    }

    saveLabels();
    updateTagFilterSelect();
    showLabelListView();
    renderLabelList();
    renderNewTaskSelectedTags();
    renderDayTasks();
    renderCalendar();
  }

  function handleDeleteLabel() {
    if (!state.editingLabelId) return;
    const label = state.labels.find(l => l.id === state.editingLabelId);
    if (!label) return;

    if (confirm(`คุณต้องการลบ Tag "${label.title}" ใช่หรือไม่? (Tag นี้จะถูกนำออกจากทุกงาน)`)) {
      state.labels = state.labels.filter(l => l.id !== state.editingLabelId);
      // Remove this label from all tasks
      Object.keys(state.tasks).forEach(dKey => {
        state.tasks[dKey].forEach(t => {
          if (t.tags) {
            t.tags = t.tags.filter(tid => tid !== state.editingLabelId);
          }
        });
      });
      state.newTaskSelectedTagIds = state.newTaskSelectedTagIds.filter(id => id !== state.editingLabelId);

      saveLabels();
      saveTasks();
      updateTagFilterSelect();
      showLabelListView();
      renderLabelList();
      renderNewTaskSelectedTags();
      renderDayTasks();
      renderCalendar();
      showToast('ลบ Tag เรียบร้อยแล้ว');
    }
  }

  // --- Export & Import ---
  function exportData() {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      labels: state.labels,
      tasks: state.tasks,
      holidays: state.holidays || {},
      colorblindMode: state.colorblindMode,
      theme: state.theme
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `work_tracker_backup_${formatDateKey(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('ดาวน์โหลดไฟล์ Backup สำเร็จ');
  }

  function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      try {
        const data = JSON.parse(event.target.result);
        if (data.labels && data.tasks) {
          state.labels = data.labels;
          state.tasks = data.tasks;
          if (data.holidays) state.holidays = data.holidays;
          if (data.colorblindMode !== undefined) state.colorblindMode = data.colorblindMode;
          if (data.theme) state.theme = data.theme;

          saveLabels();
          saveTasks();
          saveHolidays();
          saveSettings();
          applyTheme();
          renderCalendar();
          if (state.activeModalDate) renderDayTasks();

          el.backupModal.classList.remove('active');
          showToast('กู้คืนข้อมูลสำเร็จเรียบร้อย 🎉');
        } else {
          alert('รูปแบบไฟล์ JSON ไม่ถูกต้อง');
        }
      } catch (err) {
        alert('เกิดข้อผิดพลาดในการอ่านไฟล์: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset file input
  }

  // --- Event Listeners Initialization ---
  function initEventListeners() {
    // Month navigation
    el.btnPrevMonth.addEventListener('click', () => {
      state.viewMonth--;
      if (state.viewMonth < 0) {
        state.viewMonth = 11;
        state.viewYear--;
      }
      renderCalendar();
    });

    el.btnNextMonth.addEventListener('click', () => {
      state.viewMonth++;
      if (state.viewMonth > 11) {
        state.viewMonth = 0;
        state.viewYear++;
      }
      renderCalendar();
    });

    el.btnToday.addEventListener('click', () => {
      const now = new Date();
      state.viewYear = now.getFullYear();
      state.viewMonth = now.getMonth();
      renderCalendar();
    });

    // Tag filter select
    el.tagFilterSelect.addEventListener('change', (e) => {
      state.tagFilter = e.target.value;
      renderCalendar();
    });

    // Day modal controls
    el.btnCloseDayModal.addEventListener('click', closeDayModal);
    el.addTaskForm.addEventListener('submit', handleAddNewTask);

    if (el.btnCopyDayToTomorrow) {
      el.btnCopyDayToTomorrow.addEventListener('click', () => {
        if (!state.activeModalDate) return;
        const curDate = parseDateKey(state.activeModalDate);
        const tomorrow = new Date(curDate.getFullYear(), curDate.getMonth(), curDate.getDate() + 1);
        const tomorrowKey = formatDateKey(tomorrow);
        const activeDateKey = state.activeModalDate;
        closeDayModal();
        promptCalendarTaskDrop({ type: 'all_day', fromDateKey: activeDateKey }, tomorrowKey);
      });
    }

    // Toggle Holiday button
    if (el.btnToggleHoliday) {
      el.btnToggleHoliday.addEventListener('click', () => {
        toggleHoliday(state.activeModalDate);
      });
    }

    // Quick filter tabs in Day modal
    document.querySelectorAll('.btn-filter-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-filter-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.dayTaskFilter = btn.dataset.filter;
        renderDayTasks();
      });
    });

    // Label Picker Modal controls
    el.btnOpenNewTaskLabels.addEventListener('click', openLabelPickerForNewTask);
    el.btnManageLabels.addEventListener('click', openGlobalLabelManager);
    el.btnCloseLabelPicker.addEventListener('click', closeLabelPicker);

    el.labelSearchInput.addEventListener('input', renderLabelList);
    el.btnGoToCreateLabel.addEventListener('click', () => showLabelEditView(null));
    el.btnToggleColorblind.addEventListener('click', () => {
      state.colorblindMode = !state.colorblindMode;
      saveSettings();
      renderLabelList();
      renderNewTaskSelectedTags();
      renderDayTasks();
      renderCalendar();
    });

    // Label Edit View controls
    el.btnBackToLabelList.addEventListener('click', showLabelListView);
    el.btnCloseLabelEditor.addEventListener('click', closeLabelPicker);
    el.labelTitleInput.addEventListener('input', updateLivePreview);

    el.customColorPicker.addEventListener('input', (e) => {
      state.selectedEditorColor = e.target.value;
      el.customColorHex.textContent = e.target.value;
      renderColorPalette();
      updateLivePreview();
    });

    el.btnSaveLabel.addEventListener('click', handleSaveLabel);
    el.btnDeleteLabel.addEventListener('click', handleDeleteLabel);

    // Edit Task Modal controls
    el.btnCloseEditTaskModal.addEventListener('click', closeEditTaskModal);
    el.btnCancelEditTask.addEventListener('click', closeEditTaskModal);
    el.editTaskForm.addEventListener('submit', handleSaveEditTask);

    // Backup & Restore
    el.btnBackup.addEventListener('click', () => el.backupModal.classList.add('active'));
    el.btnCloseBackupModal.addEventListener('click', () => el.backupModal.classList.remove('active'));
    el.btnExportJSON.addEventListener('click', exportData);
    el.btnImportJSON.addEventListener('click', () => el.importFileInput.click());
    el.importFileInput.addEventListener('change', importData);

    // Theme toggle
    el.btnThemeToggle.addEventListener('click', toggleTheme);

    // Drag & Drop across days modal
    el.btnCloseDragDropModal.addEventListener('click', closeDragDropModal);
    el.btnCancelDragDrop.addEventListener('click', closeDragDropModal);
    el.btnChoiceCopyTask.addEventListener('click', handleConfirmCopyTask);
    el.btnChoiceCopyPending.addEventListener('click', handleConfirmCopyPending);
    el.btnChoiceMoveTask.addEventListener('click', handleConfirmMoveTask);

    // Cloud Sync Modal controls
    if (el.btnCloudSync) el.btnCloudSync.addEventListener('click', openCloudSyncModal);
    if (el.btnCloseCloudSyncModal) el.btnCloseCloudSyncModal.addEventListener('click', closeCloudSyncModal);
    if (el.tabBtnAccount) {
      el.tabBtnAccount.addEventListener('click', () => {
        el.tabBtnAccount.classList.add('active');
        el.tabBtnConfig.classList.remove('active');
        el.panelAccount.style.display = 'block';
        el.panelConfig.style.display = 'none';
      });
    }
    if (el.tabBtnConfig) {
      el.tabBtnConfig.addEventListener('click', () => {
        el.tabBtnConfig.classList.add('active');
        el.tabBtnAccount.classList.remove('active');
        el.panelConfig.style.display = 'block';
        el.panelAccount.style.display = 'none';
        const cfg = getStoredFirebaseConfig();
        if (cfg && el.firebaseConfigTextarea) {
          el.firebaseConfigTextarea.value = JSON.stringify(cfg, null, 2);
        }
      });
    }

    if (el.btnModePIN) el.btnModePIN.addEventListener('click', () => setAuthMode('pin'));
    if (el.btnModeLogin) el.btnModeLogin.addEventListener('click', () => setAuthMode('login'));
    if (el.btnModeRegister) el.btnModeRegister.addEventListener('click', () => setAuthMode('register'));

    if (el.btnGoogleSignIn) el.btnGoogleSignIn.addEventListener('click', handleGoogleSignIn);
    if (el.btnSubmitAuth) el.btnSubmitAuth.addEventListener('click', handleAuthSubmit);
    if (el.btnForceSyncNow) {
      el.btnForceSyncNow.addEventListener('click', () => {
        pushToCloud(true);
        showToast('กำลังส่งข้อมูลไปยัง Cloud...');
      });
    }
    if (el.btnLogoutCloud) el.btnLogoutCloud.addEventListener('click', handleLogoutCloud);
    if (el.btnSaveFirebaseConfig) el.btnSaveFirebaseConfig.addEventListener('click', handleSaveFirebaseConfig);
    if (el.btnResetFirebaseConfig) el.btnResetFirebaseConfig.addEventListener('click', handleResetFirebaseConfig);

    // Undo Popup controls
    if (el.btnUndoAction) el.btnUndoAction.addEventListener('click', performUndo);
    if (el.btnCloseUndoPopup) el.btnCloseUndoPopup.addEventListener('click', hideUndoPopup);

    // File Attachment Event Listeners
    if (el.btnAttachNewTaskFiles && el.newTaskFileInput) {
      el.btnAttachNewTaskFiles.addEventListener('click', () => el.newTaskFileInput.click());
      el.newTaskFileInput.addEventListener('change', (e) => {
        handleFilesSelected(e.target.files, state.newTaskAttachments, renderNewTaskAttachments);
        e.target.value = '';
      });
    }

    if (el.btnAttachEditTaskFiles && el.editTaskFileInput) {
      el.btnAttachEditTaskFiles.addEventListener('click', () => el.editTaskFileInput.click());
      el.editTaskFileInput.addEventListener('change', (e) => {
        handleFilesSelected(e.target.files, state.editingTaskAttachments, renderEditTaskAttachments);
        e.target.value = '';
      });
    }

    const handleDriveLoginClick = () => {
      if (state.googleAccessToken) {
        const folderId = window.GOOGLE_DRIVE_FOLDER_ID || '1xF51wwGdvrCjMzzYC3CR84xMr5VZQC9K';
        window.open(`https://drive.google.com/drive/folders/${folderId}`, '_blank');
      } else {
        if (state.firebaseAuth) {
          handleGoogleSignIn();
        } else {
          openCloudSyncModal();
          showToast('💡 กรุณาตั้งค่า Firebase เพื่อเข้าสู่ระบบและซิงก์ Google Drive', 'info');
        }
      }
    };

    if (el.btnQuickDriveLogin) el.btnQuickDriveLogin.addEventListener('click', handleDriveLoginClick);
    if (el.btnQuickDriveLoginEdit) el.btnQuickDriveLoginEdit.addEventListener('click', handleDriveLoginClick);

    // Tooltip hover bridge listeners
    if (el.filePreviewTooltip) {
      el.filePreviewTooltip.addEventListener('mouseenter', cancelHideAttachmentPreview);
      el.filePreviewTooltip.addEventListener('mouseleave', scheduleHideAttachmentPreview);
    }

    // Close modals on clicking backdrop
    window.addEventListener('click', (e) => {
      if (e.target === el.dayModal) closeDayModal();
      if (e.target === el.editTaskModal) closeEditTaskModal();
      if (e.target === el.labelPickerModal) closeLabelPicker();
      if (e.target === el.backupModal) el.backupModal.classList.remove('active');
      if (e.target === el.dragDropActionModal) closeDragDropModal();
      if (e.target === el.cloudSyncModal) closeCloudSyncModal();
    });

    // Keyboard shortcuts (Escape to close, Ctrl+Z to Undo)
    window.addEventListener('keydown', (e) => {
      // Ctrl+Z or Cmd+Z to Undo (รองรับทั้งคีย์บอร์ดภาษาอังกฤษและภาษาไทย)
      const isZ = e.code === 'KeyZ' || 
                  (e.key && (e.key.toLowerCase() === 'z' || e.key === 'ผ' || e.key === 'ฉ')) || 
                  e.keyCode === 90 || 
                  e.which === 90;

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && isZ) {
        const activeEl = document.activeElement;
        const isTextInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);
        // หากกำลังพิมพ์ข้อความในช่องกรอกและมีตัวอักษรอยู่ ให้ native browser undo จัดการตัวอักษร
        // แต่หากช่องกรอกว่างเปล่า (เช่น เพิ่งเพิ่มงานเสร็จ) หรือโฟกัสอยู่นอกช่อง ให้ Undo รายการงาน
        if (isTextInput && activeEl.value && activeEl.value.length > 0) {
          return;
        }
        e.preventDefault();
        performUndo();
        return;
      }

      if (e.key === 'Escape') {
        if (el.labelPickerModal && el.labelPickerModal.classList.contains('active')) closeLabelPicker();
        else if (el.editTaskModal && el.editTaskModal.classList.contains('active')) closeEditTaskModal();
        else if (el.dayModal && el.dayModal.classList.contains('active')) closeDayModal();
        else if (el.backupModal && el.backupModal.classList.contains('active')) el.backupModal.classList.remove('active');
        else if (el.dragDropActionModal && el.dragDropActionModal.classList.contains('active')) closeDragDropModal();
        else if (el.cloudSyncModal && el.cloudSyncModal.classList.contains('active')) closeCloudSyncModal();
      }
    });
  }

  // --- App Initialization ---
  function init() {
    loadFromStorage();
    applyTheme();
    initEventListeners();
    initFirebase();
    updateDriveStatusUI();
    renderCalendar();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
