// --- CONSTANTS ---
const ADMIN_PASSWORD = "admin";
const GAME_OVER_TEXT = "GAME OVER";
// プルダウン生成用の配列
const DAYS = ["月", "火", "水", "木", "金", "土", "日", "他"];
const PERIODS = [1, 2, 3, 4, 5, 6];

// State
let courses = [];
let terms = []; 
let pendingAction = null;
let currentDate = new Date();

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    
    // Login Handling
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-screen').classList.remove('hidden');
        
        await fetchCourses();
        await fetchTerms(); 
    });

    // Reset Button
    document.getElementById('reset-btn').addEventListener('click', openResetModal);
    document.getElementById('reset-cancel').addEventListener('click', closeResetModal);
    document.getElementById('reset-confirm-btn').addEventListener('click', executeReset);

    // Other UI Listeners
    document.getElementById('add-course-btn').addEventListener('click', () => openModal(null));
    document.getElementById('close-modal-btn').addEventListener('click', closeModal);
    document.getElementById('save-course-btn').addEventListener('click', saveCourse);
    document.getElementById('confirm-cancel').addEventListener('click', closeConfirm);
    document.getElementById('confirm-ok').addEventListener('click', executeConfirm);

    // 学期設定保存ボタン
    document.getElementById('save-terms-btn').addEventListener('click', saveTerms);

    // 【追加】授業時間行の追加ボタン
    const addScheduleBtn = document.getElementById('add-schedule-row-btn');
    if(addScheduleBtn) {
        addScheduleBtn.addEventListener('click', () => addScheduleRow());
    }

    // Range input listeners
    document.getElementById('edit-rating-fun').addEventListener('input', (e) => document.getElementById('val-fun').innerText = e.target.value);
    document.getElementById('edit-rating-strictness').addEventListener('input', (e) => document.getElementById('val-strict').innerText = e.target.value);
});

// --- API INTERACTIONS ---
async function fetchCourses() {
    try {
        const res = await fetch('/api/courses');
        courses = await res.json();
        renderDashboard();
    } catch (e) {
        console.error("Failed to fetch courses", e);
    }
}

async function fetchTerms() {
    try {
        const res = await fetch('/api/terms');
        terms = await res.json();

        if (terms.length === 0) {
            openTermModal();
        } else {
            renderTermCheckboxes(); 
            renderCalendar();       
        }
    } catch (e) {
        console.error("Failed to fetch terms", e);
    }
}

async function saveTerms() {
    const inputs = [];
    for(let i=1; i<=4; i++) {
        const startVal = document.getElementById(`term-start-${i}`).value;
        const endVal = document.getElementById(`term-end-${i}`).value;
        inputs.push({
            id: i,
            name: `${i}学期`,
            start: startVal,
            end: endVal
        });
    }

    if(inputs.some(t => !t.start || !t.end)) {
        alert("全ての学期の開始日と終了日を入力してください。");
        return;
    }

    await fetch('/api/terms', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(inputs)
    });

    document.getElementById('term-modal').classList.add('hidden');
    fetchTerms(); 
}

async function apiAddCourse(data) {
    await fetch('/api/courses', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
    fetchCourses();
}

async function apiUpdateCourse(id, data) {
    await fetch(`/api/courses/${id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
    fetchCourses();
}

async function apiResetData() {
    await fetch('/api/reset', { method: 'POST' });
    fetchCourses();
}

// --- RESET LOGIC ---
function openResetModal() {
    document.getElementById('reset-password').value = '';
    document.getElementById('reset-error').classList.add('hidden');
    document.getElementById('reset-modal').classList.remove('hidden');
}

function closeResetModal() {
    document.getElementById('reset-modal').classList.add('hidden');
}

function executeReset() {
    const input = document.getElementById('reset-password').value;
    if (input === ADMIN_PASSWORD) {
        apiResetData();
        closeResetModal();
    } else {
        document.getElementById('reset-error').classList.remove('hidden');
        const inputEl = document.getElementById('reset-password');
        inputEl.classList.add('animate-shake');
        setTimeout(() => inputEl.classList.remove('animate-shake'), 500);
    }
}

// --- UI UTILS & NAVIGATION ---
function switchTab(tabName) {
    const dashboardView = document.getElementById('view-dashboard');
    const calendarView = document.getElementById('view-calendar');
    const navDashboard = document.getElementById('nav-dashboard');
    const navCalendar = document.getElementById('nav-calendar');
    const addBtn = document.getElementById('add-course-btn');

    if (tabName === 'dashboard') {
        dashboardView.classList.remove('hidden');
        calendarView.classList.add('hidden');
        addBtn.classList.remove('hidden');
        
        navDashboard.classList.add('active');
        navCalendar.classList.remove('active');
        
        document.getElementById('nav-indicator-dash').classList.add('active');
        document.getElementById('nav-indicator-cal').classList.remove('active');
    } else {
        dashboardView.classList.add('hidden');
        calendarView.classList.remove('hidden');
        addBtn.classList.add('hidden'); 
        
        navDashboard.classList.remove('active');
        navCalendar.classList.add('active');
        
        document.getElementById('nav-indicator-dash').classList.remove('active');
        document.getElementById('nav-indicator-cal').classList.add('active');
        renderCalendar(); 
    }
}

// --- CALENDAR LOGIC ---
function changeMonth(delta) {
    currentDate.setMonth(currentDate.getMonth() + delta);
    renderCalendar();
}

function renderCalendar() {
    if (!terms.length) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const monthNames = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
    document.getElementById('calendar-month-display').innerHTML = `${monthNames[month]} <span class="text-blue">${year}</span>`;

    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';

    const dayChars = ['日', '月', '火', '水', '木', '金', '土'];
    
    for (let i = 0; i < startingDay; i++) {
        grid.innerHTML += `<div class="calendar-cell" style="opacity:0.3; cursor:default;"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, month, day);
        const dayOfWeek = dateObj.getDay();
        const dayChar = dayChars[dayOfWeek];
        const isToday = new Date().toDateString() === dateObj.toDateString();
        
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;

        const dayCourses = courses.filter(c => {
            // 1. 曜日チェック（文字列に含まれているか）
            if (!c.day || !c.day.includes(dayChar)) return false;

            // 2. 学期チェック
            const courseTermIds = (c.termIds || "1,2,3,4").split(',').map(Number);
            const isInTerm = courseTermIds.some(tid => {
                const term = terms.find(t => t.id === tid);
                if (!term) return false;
                return dateStr >= term.start && dateStr <= term.end;
            });
            return isInTerm;
        });

        let dotsHtml = '<div style="position:absolute; bottom:2px; right:2px; display:flex; flex-wrap:wrap; justify-content:flex-end; gap:2px; width:100%; padding:0 2px;">';
        dayCourses.forEach(c => {
            const rem = c.absentLimit - (c.absentCount + Math.floor(c.lateCount/c.lateToAbsentRatio));
            let colorCode = 'var(--led-blue)';
            if (rem < 0) colorCode = 'var(--matte-600)'; 
            else if (rem <= 1) colorCode = 'var(--led-red)';
            else if (rem === 2) colorCode = 'var(--led-yellow)';
            
            dotsHtml += `<div class="calendar-dot" style="background-color: ${colorCode}; box-shadow: 0 0 4px ${colorCode};"></div>`;
        });
        dotsHtml += '</div>';

        const cell = document.createElement('div');
        cell.className = `calendar-cell ${isToday ? 'today' : ''}`;
        cell.innerHTML = `<span style="position:absolute; top:2px; left:2px; font-size:0.6rem; font-weight:bold; color:${isToday?'white':'var(--text-muted)'}">${day}</span>${dotsHtml}`;
        cell.onclick = () => showDailyDetail(day, dayCourses);
        grid.appendChild(cell);
    }
}

function showDailyDetail(day, dayCourses) {
    const panel = document.getElementById('daily-detail-panel');
    const list = document.getElementById('detail-list');
    const dateSpan = document.getElementById('detail-date');
    
    const month = currentDate.getMonth() + 1;
    dateSpan.textContent = `${month}月${day}日`;
    
    list.innerHTML = '';
    if (dayCourses.length === 0) {
        list.innerHTML = '<p class="text-muted" style="font-size:0.75rem; font-family:var(--font-mono);">授業なし</p>';
    } else {
        dayCourses.forEach(c => {
            const rem = c.absentLimit - (c.absentCount + Math.floor(c.lateCount/c.lateToAbsentRatio));
            let statusColorClass = 'text-blue';
            let borderColor = 'var(--led-blue)';
            
            if(rem < 0) { statusColorClass = 'text-muted'; borderColor = 'var(--matte-600)'; }
            else if(rem <= 1) { statusColorClass = 'text-red'; borderColor = 'var(--led-red)'; }
            else if(rem === 2) { statusColorClass = 'text-yellow'; borderColor = 'var(--led-yellow)'; }

            list.innerHTML += `
                <div class="detail-item" style="border-left-color: ${borderColor};">
                    <div>
                        <div class="text-muted" style="font-size:0.6rem; font-weight:bold;">${c.day}</div>
                        <div style="font-weight:bold; font-size:0.875rem;">${c.name}</div>
                    </div>
                    <div class="text-center">
                        <div class="text-muted" style="font-size:0.6rem; font-weight:bold;">残り</div>
                        <div class="${statusColorClass}" style="font-family:var(--font-mono); font-weight:bold;">${rem < 0 ? '落単' : rem}</div>
                    </div>
                </div>
            `;
        });
    }
    panel.classList.remove('hidden');
}

// --- DASHBOARD LOGIC ---
function calculateRemaining(course) {
    const penaltyFromLates = Math.floor(course.lateCount / course.lateToAbsentRatio);
    return course.absentLimit - (course.absentCount + penaltyFromLates);
}

function getStatusInfo(remaining) {
    if (remaining < 0) return { cardClass: 'status-failed', textClass: 'text-muted glitch-text', label: '落単', badgeClass: 'badge-gray', btnClass: 'btn-base' };
    if (remaining <= 1) return { cardClass: 'status-critical', textClass: 'text-red text-glow', label: '危険', badgeClass: 'badge-red', btnClass: 'btn-grad-red' };
    if (remaining === 2) return { cardClass: 'status-warning', textClass: 'text-yellow text-glow', label: '注意', badgeClass: 'badge-yellow', btnClass: 'btn-grad-yellow' };
    return { cardClass: 'status-active', textClass: 'text-blue', label: '履修中', badgeClass: 'badge-blue', btnClass: 'btn-base' };
}

function renderDashboard() {
    const container = document.getElementById('course-list');
    container.innerHTML = '';
    courses.forEach(course => {
        const remaining = calculateRemaining(course);
        const status = getStatusInfo(remaining);
        const mainDisplayText = remaining < 0 ? GAME_OVER_TEXT : remaining;
        
        const card = document.createElement('div');
        card.className = `course-card ${status.cardClass}`;
        card.innerHTML = `
            <div class="card-header">
                <div>
                    <div class="card-badges">
                        <span class="badge ${status.badgeClass}">${status.label}</span>
                        <span class="card-day">${course.day}</span>
                    </div>
                    <h3 class="card-title ${status.textClass}">${course.name}</h3>
                    <p class="card-info">${course.room || '教室未設定'} // ${course.professor || '教員未設定'}</p>
                </div>
                <button class="btn-icon-sm edit-btn" onclick="openModal(${course.id})">
                    <i data-lucide="settings-2"></i>
                </button>
            </div>
            <div class="card-display">
                <div class="display-main">
                    <p class="display-label">残りライフ</p>
                    <div class="display-value ${status.textClass}" data-text="${mainDisplayText}">
                        ${mainDisplayText}
                    </div>
                </div>
                <div class="display-sub">
                    <div class="display-label">遅刻換算</div>
                    <div class="display-sub-val"><span>${course.lateToAbsentRatio}</span> 遅刻 = 1 欠席</div>
                    <div class="display-label" style="margin-top:0.5rem;">上限</div>
                    <div class="display-sub-val"><span>${course.absentLimit}</span> 回</div>
                </div>
            </div>
            <div class="card-controls" style="padding:1rem; display:flex; justify-content:space-between; gap:1rem; background-color:var(--matte-900);">
                <div class="control-group" style="flex:1;">
                    <div class="control-header" style="display:flex; justify-content:space-between; font-size:0.65rem; color:var(--text-muted); margin-bottom:0.25rem;">
                        <span class="text-red" style="font-weight:bold;">欠席</span>
                        <span style="font-family:var(--font-mono);">${course.absentCount}</span>
                    </div>
                    <div class="btn-group" style="display:flex;">
                        <button class="btn btn-secondary count-btn" style="flex:1; border-radius:2px 0 0 2px;" data-id="${course.id}" data-type="absent" data-delta="-1"><i data-lucide="minus" style="width:12px;"></i></button>
                        <button class="btn btn-red count-btn" style="flex:1; border-radius:0 2px 2px 0;" data-id="${course.id}" data-type="absent" data-delta="1"><i data-lucide="plus" style="width:12px;"></i></button>
                    </div>
                </div>
                <div class="control-group" style="flex:1;">
                    <div class="control-header" style="display:flex; justify-content:space-between; font-size:0.65rem; color:var(--text-muted); margin-bottom:0.25rem;">
                        <span class="text-yellow" style="font-weight:bold;">遅刻</span>
                        <span style="font-family:var(--font-mono);">${course.lateCount}</span>
                    </div>
                    <div class="btn-group" style="display:flex;">
                        <button class="btn btn-secondary count-btn" style="flex:1; border-radius:2px 0 0 2px;" data-id="${course.id}" data-type="late" data-delta="-1"><i data-lucide="minus" style="width:12px;"></i></button>
                        <button class="btn btn-yellow count-btn" style="flex:1; border-radius:0 2px 2px 0;" data-id="${course.id}" data-type="late" data-delta="1"><i data-lucide="plus" style="width:12px;"></i></button>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
    
    // イベントリスナー再登録（HTMLを書き換えたため）
    lucide.createIcons();
    attachEventListeners();
}

function triggerDamageEffect() {
    document.body.classList.add('animate-shake');
    const overlay = document.getElementById('damage-overlay');
    if(overlay) {
        overlay.classList.add('active');
        setTimeout(() => {
            document.body.classList.remove('animate-shake');
            overlay.classList.remove('active');
        }, 500);
    }
}

function attachEventListeners() {
    document.querySelectorAll('.count-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // アイコンをクリックした場合も考慮して closest を使う
            const target = e.target.closest('.count-btn');
            if(!target) return;

            const id = parseInt(target.dataset.id);
            const type = target.dataset.type;
            const delta = parseInt(target.dataset.delta);
            const msg = delta > 0 ? (type === 'absent' ? '欠席を記録しますか？' : '遅刻を記録しますか？') : '記録を取り消しますか？';
            
            showConfirm(msg, () => {
                const course = courses.find(c => c.id === id);
                if (!course) return;

                const currentRem = calculateRemaining(course);
                
                // Optimistic Update
                if(type === 'absent') course.absentCount = Math.max(0, course.absentCount + delta);
                else course.lateCount = Math.max(0, course.lateCount + delta);
                
                // Check death
                const newRem = calculateRemaining(course);
                if (currentRem >= 0 && newRem < 0) triggerDamageEffect();

                apiUpdateCourse(id, {
                    absentCount: course.absentCount,
                    lateCount: course.lateCount
                });
            });
        });
    });
}

// --- COMMON UI LOGIC ---
function showConfirm(message, callback) {
    // 汎用確認ダイアログを使う場合
    // 今回は簡易的にHTML内のconfirm-modalを再利用
    const title = document.getElementById('confirm-title');
    const msg = document.getElementById('confirm-msg');
    
    if (title) title.innerText = "確認";
    if (msg) msg.innerText = message;
    
    document.getElementById('confirm-modal').classList.remove('hidden');
    pendingAction = callback;
}
function closeConfirm() {
    document.getElementById('confirm-modal').classList.add('hidden');
    pendingAction = null;
}
function executeConfirm() {
    if (pendingAction) pendingAction();
    closeConfirm();
}

// --- MODAL HELPERS (NEW) ---

// Helper: Add Schedule Row
function addScheduleRow(initialDay = '月', initialPeriod = 1) {
    const container = document.getElementById('schedule-container');
    const row = document.createElement('div');
    row.className = 'schedule-row';

    // Day Select
    const daySelect = document.createElement('select');
    daySelect.className = 'schedule-select day-select';
    DAYS.forEach(d => {
        const option = document.createElement('option');
        option.value = d;
        option.text = d + "曜";
        if (d === initialDay) option.selected = true;
        daySelect.appendChild(option);
    });

    // Period Select
    const periodSelect = document.createElement('select');
    periodSelect.className = 'schedule-select period-select';
    PERIODS.forEach(p => {
        const option = document.createElement('option');
        option.value = p;
        option.text = p + "限";
        if (p == initialPeriod) option.selected = true;
        periodSelect.appendChild(option);
    });

    // Remove Button
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-icon-remove';
    removeBtn.innerHTML = `<i data-lucide="x"></i>`;
    removeBtn.onclick = () => row.remove();

    row.appendChild(daySelect);
    row.appendChild(periodSelect);
    row.appendChild(removeBtn);

    container.appendChild(row);
    lucide.createIcons();
}

// Open Edit/Create Modal (UPDATED)
function openModal(id) {
    const modal = document.getElementById('edit-modal');
    const title = document.getElementById('modal-title-text');
    const container = document.getElementById('schedule-container');
    
    // Clear and Reset
    container.innerHTML = '';
    document.getElementById('edit-name-error').classList.add('hidden');

    if (id === null) {
        // Create Mode
        title.innerText = "新規授業登録";
        document.getElementById('edit-id').value = '';
        document.getElementById('edit-name').value = '';
        document.getElementById('edit-professor').value = '';
        document.getElementById('edit-room').value = '';
        
        // Default 1 row
        addScheduleRow('月', 1);
        
        document.getElementById('edit-absentLimit').value = 5;
        document.getElementById('edit-lateToAbsentRatio').value = 3;
        document.getElementById('edit-memo').value = '';
        
        // Reset Sliders
        document.getElementById('edit-rating-fun').value = 3;
        document.getElementById('val-fun').innerText = 3;
        document.getElementById('edit-rating-strictness').value = 3;
        document.getElementById('val-strict').innerText = 3; // HTMLのIDと合わせる
        
        // Checkboxes reset
        document.querySelectorAll('.term-check').forEach(cb => cb.checked = true); // 新規はデフォルト全チェック

        pendingAction = 'create';
    } else {
        // Edit Mode
        const course = courses.find(c => c.id == id);
        if (!course) return;

        title.innerText = "授業設定";
        document.getElementById('edit-id').value = course.id;
        document.getElementById('edit-name').value = course.name;
        document.getElementById('edit-professor').value = course.professor || '';
        document.getElementById('edit-room').value = course.room || '';

        // Parse Schedule String (e.g., "月1 / 水3")
        if (course.day) {
            const slots = course.day.split(/[\s,\/]+/); 
            let hasValidSlot = false;
            slots.forEach(slot => {
                const dayMatch = slot.match(/([月火水木金土日他])/);
                const periodMatch = slot.match(/(\d+)/);
                if (dayMatch && periodMatch) {
                    addScheduleRow(dayMatch[1], periodMatch[1]);
                    hasValidSlot = true;
                }
            });
            if (!hasValidSlot) addScheduleRow('月', 1); // fallback
        } else {
            addScheduleRow('月', 1);
        }

        document.getElementById('edit-absentLimit').value = course.absentLimit;
        document.getElementById('edit-lateToAbsentRatio').value = course.lateToAbsentRatio;
        document.getElementById('edit-memo').value = course.memo || '';
        
        document.getElementById('edit-rating-fun').value = course.ratings.fun || 3;
        document.getElementById('val-fun').innerText = course.ratings.fun || 3;
        
        document.getElementById('edit-rating-strictness').value = course.ratings.strictness || 3;
        document.getElementById('val-strict').innerText = course.ratings.strictness || 3;

        const termIds = course.termIds ? course.termIds.split(',') : [];
        document.querySelectorAll('.term-check').forEach(cb => {
            cb.checked = termIds.includes(cb.value);
        });

        pendingAction = 'update';
    }

    modal.classList.remove('hidden');
}

// Save Course (UPDATED)
function saveCourse() {
    const idValue = document.getElementById('edit-id').value;
    const isNew = idValue === '';
    
    // Validation
    const nameInput = document.getElementById('edit-name');
    if (!nameInput.value.trim()) {
        document.getElementById('edit-name-error').classList.remove('hidden');
        return;
    }

    // Collect Schedules
    const rows = document.querySelectorAll('.schedule-row');
    let dayParts = [];
    rows.forEach(row => {
        const d = row.querySelector('.day-select').value;
        const p = row.querySelector('.period-select').value;
        dayParts.push(`${d}${p}`);
    });
    const dayString = dayParts.length > 0 ? dayParts.join(' / ') : '未定';

    // Collect Terms
    const selectedTerms = Array.from(document.querySelectorAll('.term-check:checked'))
        .map(cb => cb.value)
        .join(',');

    const data = {
        name: nameInput.value,
        professor: document.getElementById('edit-professor').value,
        room: document.getElementById('edit-room').value,
        day: dayString, // 生成した文字列を送信
        absentLimit: parseInt(document.getElementById('edit-absentLimit').value) || 0,
        lateToAbsentRatio: parseInt(document.getElementById('edit-lateToAbsentRatio').value) || 3,
        memo: document.getElementById('edit-memo').value,
        ratings: { 
            fun: parseInt(document.getElementById('edit-rating-fun').value), 
            strictness: parseInt(document.getElementById('edit-rating-strictness').value) 
        },
        termIds: selectedTerms
    };
    
    if (isNew) {
        apiAddCourse(data);
    } else {
        apiUpdateCourse(idValue, data);
    }
    closeModal();
}

function closeModal() {
    document.getElementById('edit-modal').classList.add('hidden');
    pendingAction = null;
}

// --- TERM MODAL HELPERS ---
function openTermModal() {
    const container = document.getElementById('term-inputs-container');
    container.innerHTML = '';
    const currentYear = new Date().getFullYear();
    const defaultDates = [
        {s: `${currentYear}-04-01`, e: `${currentYear}-06-01`}, 
        {s: `${currentYear}-06-02`, e: `${currentYear}-08-01`}, 
        {s: `${currentYear}-09-20`, e: `${currentYear}-11-20`}, 
        {s: `${currentYear}-11-21`, e: `${currentYear+1}-01-31`} 
    ];

    for(let i=1; i<=4; i++) {
        container.innerHTML += `
            <div class="form-group" style="margin-bottom:1rem; border-bottom:1px solid #333; padding-bottom:1rem;">
                <label class="text-blue">${i}学期 (Q${i})</label>
                <div class="grid-2" style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem;">
                    <div>
                        <span class="text-muted" style="font-size:0.6rem;">開始</span>
                        <input type="date" id="term-start-${i}" value="${defaultDates[i-1].s}" class="input-sm" style="background:#111; color:white; border:1px solid #333; padding:0.5rem; width:100%;">
                    </div>
                    <div>
                        <span class="text-muted" style="font-size:0.6rem;">終了</span>
                        <input type="date" id="term-end-${i}" value="${defaultDates[i-1].e}" class="input-sm" style="background:#111; color:white; border:1px solid #333; padding:0.5rem; width:100%;">
                    </div>
                </div>
            </div>
        `;
    }
    document.getElementById('term-modal').classList.remove('hidden');
}

function renderTermCheckboxes() {
    const container = document.getElementById('term-checkboxes');
    container.innerHTML = terms.map(t => `
        <label style="display:flex; align-items:center; gap:0.25rem; font-size:0.75rem; cursor:pointer; color:var(--text-muted);">
            <input type="checkbox" class="term-check" value="${t.id}" style="width:auto; height:auto; margin:0;">
            <span>${t.name}</span>
        </label>
    `).join('');
}
