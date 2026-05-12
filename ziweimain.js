const canvas = document.getElementById('ziweiCanvas');
const ctx = canvas.getContext('2d');
const size = 150;
let appData = null;
let currentChart = "";
let selectedLifePos = -1;
let isLocked = false;          // 是否鎖定命盤架構
let viewingPalacePos = -1;     // 鎖定後，目前正在點擊查看的宮位 Index
const palaceNames = ["命宮", "兄弟", "夫妻", "子女", "財帛", "疾厄", "遷移", "僕役", "官祿", "田宅", "福德", "父母"];
const branchMap = [
    { name: "子", i: 2, j: 3 }, { name: "丑", i: 1, j: 3 }, { name: "寅", i: 0, j: 3 },
    { name: "卯", i: 0, j: 2 }, { name: "辰", i: 0, j: 1 }, { name: "巳", i: 0, j: 0 },
    { name: "午", i: 1, j: 0 }, { name: "未", i: 2, j: 0 }, { name: "申", i: 3, j: 0 },
    { name: "酉", i: 3, j: 1 }, { name: "戌", i: 3, j: 2 }, { name: "亥", i: 3, j: 3 }
];

// 祿存位置表（根據年干 0=甲...9=癸）
const LU_CUN_POS = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0];

// 四化對照表（包含您的中州派版本）
const SI_HUA_TABLE = {
    "standard": [
        ["廉", "破", "武", "陽"], // 甲
        ["機", "梁", "紫", "陰"], // 乙
        ["同", "機", "昌", "廉"], // 丙
        ["陰", "同", "機", "巨"], // 丁
        ["貪", "陰", "右", "機"], // 戊
        ["武", "貪", "梁", "曲"], // 己
        ["陽", "武", "陰", "同"], // 庚
        ["巨", "陽", "曲", "昌"], // 辛
        ["梁", "紫", "左", "武"], // 壬 (標準/全真)
        ["破", "巨", "陰", "貪"]  // 癸
    ],
    "zhongzhou": [
        ["廉", "破", "武", "陽"], // 甲
        ["機", "梁", "紫", "陰"], // 乙
        ["同", "機", "昌", "廉"], // 丙
        ["陰", "同", "機", "巨"], // 丁
        ["貪", "陰", "右", "機"], // 戊
        ["武", "貪", "梁", "曲"], // 己
        ["陽", "武", "陰", "同"], // 庚
        ["巨", "陽", "曲", "昌"], // 辛
        ["梁", "紫", "府", "武"], // 壬 (您的版本：中州派)
        ["破", "巨", "陰", "貪"]  // 癸
    ]
};

// 儲存使用者選取的排星參數
let birthParams = {
    yearStem: 0,
    yearBranch: 0,
    month: 1,
    day: 1,        // 💡 新增：出生日期
    hour: 0,
    sihuaVersion: 'zhongzhou'
};

// 💡 記得在清單裡補上 'birthDay'
['yearStem', 'yearBranch', 'birthMonth', 'birthDay', 'birthHour', 'sihuaVersion'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('change', (e) => {
            const val = e.target.value;
            const parsedVal = isNaN(val) ? val : parseInt(val);

            if (id === 'yearStem') birthParams.yearStem = parsedVal;
            if (id === 'yearBranch') birthParams.yearBranch = parsedVal;
            if (id === 'birthMonth') birthParams.month = parsedVal;
            if (id === 'birthDay') birthParams.day = parsedVal; // 處理日期
            if (id === 'birthHour') birthParams.hour = parsedVal;
            if (id === 'sihuaVersion') birthParams.sihuaVersion = parsedVal;

            drawBoard();
        });
    }
});

// --- 動態載入專屬盤型資料庫 ---
document.getElementById('chartSelector').addEventListener('change', (e) => {
    currentChart = e.target.value;
    selectedLifePos = -1; // 更換盤型後重設命宮
    document.getElementById('noteArea').style.display = 'none';

    if (!currentChart) {
        appData = null; // 如果沒有選盤型，清空資料
        document.getElementById('status').innerText = "請選擇盤型...";
        drawBoard();
        return;
    }

    document.getElementById('status').innerText = `⏳ 正在載入 ${currentChart} 資料...`;
    document.getElementById('content').innerHTML = `<h3>命盤解說</h3><p>請點擊下方宮位設定命宮位置。</p>`;

    // 根據選單選擇的名稱，抓取對應的 JSON 檔案
    const targetJson = `ziwei_data_${currentChart}.json`;

    fetch(targetJson)
        .then(res => {
            if (!res.ok) throw new Error("找不到檔案");
            return res.json();
        })
        .then(data => {
            appData = data;
            document.getElementById('status').innerText = `✅ ${currentChart} 載入成功`;
            drawBoard(); // 資料載入完畢後畫星星
        })
        .catch(err => {
            document.getElementById('status').innerHTML = `<span style="color:red">❌ 載入失敗: ${targetJson}</span>`;
            console.error(err);
        });
});

// 網頁剛開啟時先畫出空白底盤
drawBoard();

function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#8b4513';
    ctx.lineWidth = 2;

    branchMap.forEach((p, index) => {
        const x = p.i * size;
        const y = p.j * size;
        if (index === selectedLifePos) {
            ctx.fillStyle = "#fff4e6";
            ctx.fillRect(x, y, size, size);
        }
        ctx.strokeRect(x, y, size, size);
        ctx.font = "14px Arial";
        ctx.fillStyle = "#8b4513";
        ctx.fillText(p.name, x + 130, y + 140);

        if (selectedLifePos !== -1) {
            const nameIndex = (selectedLifePos - index + 12) % 12;
            const pName = palaceNames[nameIndex];
            ctx.font = "bold 16px Microsoft JhengHei";
            ctx.fillStyle = pName === "命宮" ? "red" : "#555";
            ctx.fillText(pName, x + 10, y + 140);
        }
    });

    // --- 在畫星星之前，先畫三方四正輔助線 ---
    if (viewingPalacePos !== -1) {
        drawSanFangLines(viewingPalacePos);
    }
    // 確保 appData 真的載入完成後才畫星星
    if (currentChart && appData) drawStars();
}

// 計算受月、時影響的動態星曜位置
function getDynamicStars() {
    const p = birthParams;
    let dynamicStars = [];

    // --- 1. 祿存、擎羊、陀羅 (年干系) ---
    const luCunPos = LU_CUN_POS[p.yearStem];
    dynamicStars.push({ StarName: "祿存", pos: luCunPos, color: "#ffd700" }); // 金色
    dynamicStars.push({ StarName: "擎羊", pos: (luCunPos + 1) % 12, color: "#ff4500" }); // 煞星用深橘紅
    dynamicStars.push({ StarName: "陀羅", pos: (luCunPos - 1 + 12) % 12, color: "#ff4500" });

    // --- 2. 左右昌曲 (月、時系 - 保留之前的) ---
    dynamicStars.push({ StarName: "左輔", pos: (4 + p.month - 1) % 12, color: "#4682b4" });
    dynamicStars.push({ StarName: "右弼", pos: (10 - (p.month - 1) + 12) % 12, color: "#4682b4" });
    dynamicStars.push({ StarName: "文曲", pos: (4 + p.hour) % 12, color: "#2e8b57" });
    dynamicStars.push({ StarName: "文昌", pos: (10 - p.hour + 12) % 12, color: "#2e8b57" });

    // --- 3. 地空、地劫 (時辰系：從亥宮起子時) ---
    dynamicStars.push({ StarName: "地劫", pos: (11 + p.hour) % 12, color: "#708090" }); // 灰色
    dynamicStars.push({ StarName: "地空", pos: (11 - p.hour + 12) % 12, color: "#708090" });

    // --- 4. 火星、鈴星 (生年支 + 時辰) ---
    // 這裡使用查表決定起點，再順數時辰
    let huoStart, lingStart;
    const yb = p.yearBranch;
    if ([2, 6, 10].includes(yb)) { huoStart = 1; lingStart = 3; }      // 寅午戌
    else if ([8, 0, 4].includes(yb)) { huoStart = 2; lingStart = 10; } // 申子辰
    else if ([5, 9, 1].includes(yb)) { huoStart = 3; lingStart = 10; } // 巳酉丑
    else { huoStart = 9; lingStart = 10; }                             // 亥卯未

    dynamicStars.push({ StarName: "火星", pos: (huoStart + p.hour) % 12, color: "#ff4500" });
    dynamicStars.push({ StarName: "鈴星", pos: (lingStart + p.hour) % 12, color: "#ff4500" });

    // --- 5. 雜曜小星 (動態計算) ---
    const m = p.month;
    const ys = p.yearStem;
    const d = p.day;

    // 1. 紅鸞 (卯=3 起子逆行)
    const hongLuan = (3 - yb + 12) % 12;
    dynamicStars.push({ StarName: "紅鸞", pos: hongLuan, color: "#ff69b4" }); // 粉紅色

    // 2. 天喜 (永遠在紅鸞對宮)
    dynamicStars.push({ StarName: "天喜", pos: (hongLuan + 6) % 12, color: "#ff69b4" });

    // 3. 天馬 (依年支查表：申子辰在寅, 寅午戌在申...)
    const tianMaMap = {0:2, 1:11, 2:8, 3:5, 4:2, 5:11, 6:8, 7:5, 8:2, 9:11, 10:8, 11:5};
    dynamicStars.push({ StarName: "天馬", pos: tianMaMap[yb], color: "#1e90ff" }); // 亮藍色

    // 4. 截空 (依年干查表，這裡取正空：甲申, 乙午, 丙辰, 丁寅...)
    const jieKongMap = [8, 6, 4, 2, 0, 9, 7, 5, 3, 1];
    dynamicStars.push({ StarName: "截空", pos: jieKongMap[ys], color: "#808080" }); // 灰色

    // 5. 天哭 (午=6起子逆行)
    dynamicStars.push({ StarName: "天哭", pos: (6 - yb + 12) % 12, color: "#808080" });

    // 6. 天虛 (午=6起子順行)
    dynamicStars.push({ StarName: "天虛", pos: (6 + yb) % 12, color: "#808080" });

    // 7. 華蓋 (依年支查表：申子辰在辰...)
    const huaGaiMap = {0:4, 1:1, 2:10, 3:7, 4:4, 5:1, 6:10, 7:7, 8:4, 9:1, 10:10, 11:7};
    dynamicStars.push({ StarName: "華蓋", pos: huaGaiMap[yb], color: "#808080" });

    // 8. 陰煞 (依月份查表：正月=寅...)
    const yinShaMap = [2, 0, 10, 8, 6, 4, 2, 0, 10, 8, 6, 4];
    dynamicStars.push({ StarName: "陰煞", pos: yinShaMap[m - 1], color: "#808080" });

    // 9. 天貴 (借文曲起初一順行，退一宮)
    const wenQu = (4 + p.hour) % 12;
    const tianGui = (wenQu + d - 2 + 12) % 12;
    dynamicStars.push({ StarName: "天貴", pos: tianGui, color: "#da70d6" }); // 淺紫色

    // 💡 重要：將這些小星全部加上 isMinor 標記，這樣畫圖函數才知道要把它們縮小！
    dynamicStars.forEach(star => {
        if (["紅鸞", "天喜", "天馬", "截空", "天哭", "天虛", "華蓋", "陰煞", "天貴"].includes(star.StarName)) {
            star.isMinor = true;
        }
    });

    return dynamicStars;
}

function drawStars() {
    const chart = appData.base_charts.find(c => c.ChartName === currentChart);
    if (!chart) return;
    
    // 💡 關鍵修改：將計數器改為物件，分別記錄「大星(左)」與「小星(中)」的數量
    const palaceStarCounts = Array.from({length: 12}, () => ({ major: 0, minor: 0 }));

    // 1. 畫出原本的主星 (來自 JSON)
    appData.stars_info.forEach(star => {
        let targetPos = star.System === "紫微星系" ? (chart.ZiweiPos - star.Order + 12) % 12 : (chart.TianfuPos + star.Order) % 12;
        drawSingleStar(targetPos, star.StarName, "#d2691e", palaceStarCounts); // 橘色
    });

    // 2. 畫出動態計算的輔星
    const dynStars = getDynamicStars();
    dynStars.forEach(star => {
        drawSingleStar(star.pos, star.StarName, star.color, palaceStarCounts, star.isMinor);
    });
}

// 接收的 countsObj 已經變成 { major: 0, minor: 0 } 的格式了
function drawSingleStar(targetPos, starName, color, countsObj, isMinor = false) {
    const palace = branchMap[targetPos];
    
    let x, y;
    // 💡 雙排佈局邏輯
    if (isMinor) {
        // 中間排 (雜曜小星)
        x = palace.i * size + 85; // 往右推 85px，保留左側四化空間
        y = palace.j * size + 28 + (countsObj[targetPos].minor * 18); // 小星字體小，行距稍緊湊
        countsObj[targetPos].minor++; // 增加該宮位的小星計數
    } else {
        // 左側排 (主星、輔星、煞星)
        x = palace.i * size + 10;
        y = palace.j * size + 28 + (countsObj[targetPos].major * 20); // 大星行距 20
        countsObj[targetPos].major++; // 增加該宮位的大星計數
    }

    let displayName = starName;
    const sihuaList = SI_HUA_TABLE[birthParams.sihuaVersion][birthParams.yearStem];
    const sihuaLabels = ["(祿)", "(權)", "(科)", "(忌)"];

    sihuaList.forEach((target, index) => {
        if (starName.includes(target)) {
            displayName += sihuaLabels[index];
            if (index === 3) color = "red";
        }
    });

    ctx.fillStyle = color;
    ctx.font = isMinor ? "14px Microsoft JhengHei" : "bold 17px Microsoft JhengHei";
    ctx.fillText(displayName, x, y);

}

canvas.addEventListener('click', (e) => {
    if (!currentChart || !appData) return alert("請先選擇基本盤型並等待載入！");

    const i = Math.floor(e.offsetX / size);
    const j = Math.floor(e.offsetY / size);
    const clickedIndex = branchMap.findIndex(p => p.i === i && p.j === j);

    if (clickedIndex !== -1) {
        if (!isLocked) {
            // 模式 A：未鎖定，設定命宮
            selectedLifePos = clickedIndex;
            viewingPalacePos = clickedIndex;
        } else {
            // 模式 B：已鎖定，僅切換查看宮位
            viewingPalacePos = clickedIndex;
        }

        drawBoard();
        showInterpretation();
    }
});

// --- 顯示解釋與載入筆記 ---
function showInterpretation() {
    const info = appData.interpretations.find(item => item.ChartName === currentChart && item.LifePos === viewingPalacePos);
    // 💡 補上這兩行！計算目前點擊的宮位，相對於「命宮」是什麼宮
    const palaceNameIdx = (selectedLifePos - viewingPalacePos + 12) % 12;
    const currentPalaceName = palaceNames[palaceNameIdx];
    
    const contentDiv = document.getElementById('content');

    // 更新右側顯示內容，利用 CSS margin 控制精準間距，移除多餘的 <br>
    contentDiv.innerHTML = `
        <h3 style="color: #d2691e; border-bottom: 2px solid #deb887; padding-bottom: 5px; margin-top: 0; margin-bottom: 10px;">
            ${branchMap[viewingPalacePos].name}宮 - ${currentPalaceName}
        </h3>
        <p style="margin: 5px 0;"><strong>目前盤型：</strong>${currentChart}</p>
        <hr style="margin: 10px 0; border: 0; border-top: 1px dashed #ccc;">
        <p style="margin: 5px 0;"><strong>格局：</strong> ${info && info.Pattern ? info.Pattern : "基本格局"}</p>
        <p style="margin: 10px 0 5px 0;"><strong>教學解說：</strong></p>
        <div style="font-size:14px; color:#333; line-height: 1.6; margin-bottom: 15px;">
            ${info && info.Content ? info.Content : "暫無解說資料"}
        </div>
    `;

    // 顯示三方四正格局偵測
    const patterns = checkPatterns(viewingPalacePos);
    const noticeDiv = document.getElementById('patternNotice');
    const listDiv = document.getElementById('patternList');

    if (patterns.length > 0) {
        noticeDiv.style.display = 'block';
        listDiv.innerHTML = patterns.map(p => `• ${p}`).join('<br>');
    } else {
        noticeDiv.style.display = 'none';
    }
    
    // 顯示筆記區塊並載入舊筆記 (💡 這裡的 key 改綁定 viewingPalacePos)
    document.getElementById('noteArea').style.display = 'block';
    const storageKey = `note_${currentChart}_${viewingPalacePos}`;
    document.getElementById('userNote').value = localStorage.getItem(storageKey) || "";
}
// 取得宮位靠近中間空白區的「內側邊緣錨點」
function getPalaceAnchor(idx) {
    const p = branchMap[idx];
    
    // 先計算原本的宮位中心點
    let x = p.i * size + size / 2;
    let y = p.j * size + size / 2;

    // 將座標「吸附」到中間 2x2 空白區域的邊緣
    if (p.j === 0) y = size;          // 上排宮位，錨點貼齊底部 (y = 150)
    else if (p.j === 3) y = 3 * size; // 下排宮位，錨點貼齊頂部 (y = 450)

    if (p.i === 0) x = size;          // 左排宮位，錨點貼齊右側 (x = 150)
    else if (p.i === 3) x = 3 * size; // 右排宮位，錨點貼齊左側 (x = 450)

    return { x, y };
}
function drawSanFangLines(centerIdx) {
    if (centerIdx === -1) return;

    const sfsi = [
        centerIdx,                         // 本宮
        (centerIdx + 6) % 12,              // 對宮
        (centerIdx + 4) % 12,              // 合宮一
        (centerIdx + 8) % 12               // 合宮二
    ];

    const anchors = sfsi.map(idx => getPalaceAnchor(idx));

    ctx.save(); 
    ctx.beginPath();
    ctx.setLineDash([5, 5]); 
    // 顏色稍微調深一點點(0.6)，因為現在畫在全白的中宮，深一點比較清楚
    ctx.strokeStyle = "rgba(210, 105, 30, 0.6)"; 
    ctx.lineWidth = 2;

    // 1. 從本宮連到對宮 (把 centers 改成 anchors)
    ctx.moveTo(anchors[0].x, anchors[0].y);
    ctx.lineTo(anchors[1].x, anchors[1].y);

    // 2. 從本宮連到合宮一與合宮二 (把 centers 改成 anchors)
    ctx.moveTo(anchors[0].x, anchors[0].y);
    ctx.lineTo(anchors[2].x, anchors[2].y);
    ctx.lineTo(anchors[3].x, anchors[3].y);
    ctx.closePath(); 

    ctx.stroke();
    ctx.restore();
}

// --- 儲存筆記到本機 ---
function saveNote() {
    // 💡 這裡也改成 viewingPalacePos
    const storageKey = `note_${currentChart}_${viewingPalacePos}`;
    const noteText = document.getElementById('userNote').value;
    localStorage.setItem(storageKey, noteText);

    // 顯示「已儲存」提示
    const status = document.getElementById('saveStatus');
    status.style.display = 'inline';
    setTimeout(() => { status.style.display = 'none'; }, 2000);
}
function toggleLock() {
    if (!currentChart || !appData) return alert("請先選擇盤型並載入資料！");
    if (selectedLifePos === -1) return alert("請先在星盤上點擊一格設定「命宮」位置再鎖定。");

    isLocked = !isLocked;
    const btn = document.getElementById('lockBtn');

    if (isLocked) {
        btn.innerText = "🔓 解鎖 (切換命宮模式)";
        btn.style.background = "#d2691e"; // 鎖定後變色提醒
        viewingPalacePos = selectedLifePos; // 鎖定瞬間，查看目標預設為命宮
    } else {
        btn.innerText = "🔒 鎖定命盤架構";
        btn.style.background = "#555";
    }
}
function checkPatterns(centerIdx) {
    const sanFangSiZheng = [
        centerIdx,                         // 本宮
        (centerIdx + 6) % 12,              // 對宮 (遷移)
        (centerIdx + 4) % 12,              // 合宮 (財帛)
        (centerIdx + 8) % 12               // 合宮 (官祿)
    ];

    let foundPatterns = [];

    // 取得這四個宮位裡面的所有星曜名稱
    let allStarsInScope = [];

    // 1. 取得主星 (從 appData)
    const chart = appData.base_charts.find(c => c.ChartName === currentChart);
    appData.stars_info.forEach(star => {
        let pos = star.System === "紫微星系" ? (chart.ZiweiPos - star.Order + 12) % 12 : (chart.TianfuPos + star.Order) % 12;
        if (sanFangSiZheng.includes(pos)) allStarsInScope.push(star.StarName);
    });

    // 2. 取得輔星與煞星 (從 getDynamicStars)
    getDynamicStars().forEach(star => {
        if (sanFangSiZheng.includes(star.pos)) allStarsInScope.push(star.StarName);
    });

    // --- 開始比對邏輯 ---

    // 範例 1：偵測煞星過重
    const shars = ["羊", "陀", "火", "鈴", "空", "劫"]; // 簡稱匹配
    let sharCount = 0;
    allStarsInScope.forEach(s => {
        if (shars.some(sh => s.includes(sh))) sharCount++;
    });

    if (sharCount >= 3) {
        foundPatterns.push(`三方四正煞星會照 (${sharCount}顆)，重點觀察壓力來源。`);
    }

    // 範例 2：特定雙星組合 (例如火鈴)
    if (allStarsInScope.some(s => s.includes("火")) && allStarsInScope.some(s => s.includes("鈴"))) {
        foundPatterns.push("偵測到「火鈴」會照，性格較為剛烈或具爆發力。");
    }

    // 範例 3：四化連動 (例如化忌)
    if (allStarsInScope.some(s => s.includes("(忌)"))) {
        foundPatterns.push("三方四正有化忌星，該領域易有波折或需費心神。");
    }

    return foundPatterns;
}
function exportRecord() {
    if (!currentChart) return alert("請先選擇盤型！");

    // 1. 準備基礎參數
    let record = {
        currentChart,
        selectedLifePos,
        birthParams,
        notes: {}
    };

    // 2. 搜刮 12 個宮位的筆記
    for (let i = 0; i < 12; i++) {
        const key = `note_${currentChart}_${i}`;
        const note = localStorage.getItem(key);
        if (note) record.notes[i] = note;
    }

    // 3. 轉成 JSON 並下載
    const blob = new Blob([JSON.stringify(record, null, 4)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `紫微筆記_${currentChart}_${new Date().toLocaleDateString()}.json`;
    a.click();
}
function importRecord(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = JSON.parse(e.target.result);

        // 1. 還原變數
        currentChart = data.currentChart;
        selectedLifePos = data.selectedLifePos;
        birthParams = data.birthParams;
        isLocked = true; // 載入後自動鎖定，方便直接看筆記

        // 2. 還原筆記到 localStorage
        for (const [pos, text] of Object.entries(data.notes)) {
            localStorage.setItem(`note_${currentChart}_${pos}`, text);
        }

        // 3. 手動更新所有 UI 選單的顯示內容
        document.getElementById('chartSelector').value = currentChart;
        document.getElementById('yearStem').value = birthParams.yearStem;
        document.getElementById('yearBranch').value = birthParams.yearBranch;
        document.getElementById('birthMonth').value = birthParams.month;
        document.getElementById('birthHour').value = birthParams.hour;
        document.getElementById('sihuaVersion').value = birthParams.sihuaVersion;

        // 4. 更新鎖定按鈕樣式
        const btn = document.getElementById('lockBtn');
        btn.innerText = "🔓 解鎖 (切換命宮模式)";
        btn.style.background = "#d2691e";

        // 5. 重新觸發資料載入與繪圖
        // 這裡直接模擬一次選單變動的行為
        document.getElementById('chartSelector').dispatchEvent(new Event('change'));
        
        alert("紀錄載入成功！");
    };
    reader.readAsText(file);
}