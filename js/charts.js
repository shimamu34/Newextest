// charts.js の一番上に追記（二重定義エラーを防ぎつつ初期値を確保）
var radarVisible = radarVisible || [true, true, true, true, true, true];

// ==========================================
// 1. 表示切り替え機能
// ==========================================

// グラフ表示切り替え
function toggleRadar() {
    const c = document.getElementById("radar");
    if (c.style.display === "none") {
        c.style.display = "block";
        RR(document.getElementById("gender").value);
    } else {
        c.style.display = "none";
    }
}

function toggleAnalysis() {
    const c = document.getElementById("correlation");
    if (c.style.display === "none") {
        c.style.display = "block";
        RAnalysis(document.getElementById("gender").value);
    } else {
        c.style.display = "none";
    }
}

function toggleTracking() {
    const c = document.getElementById("tracking");
    if (c.style.display === "none") {
        c.style.display = "block";
        document.getElementById("trackingDate").valueAsDate = new Date();
        updateTrackingView();
    } else {
        c.style.display = "none";
    }
}

// ==========================================
// 2. レーダーチャート描画 (RR)
// ==========================================

function RR(g) {
    const cv = document.getElementById("rc");
    const ctx = cv.getContext("2d");
    const h = D[g].h.slice(0, 9); // 9種目

    const cols = [
        { s: "rgba(255,99,132,1)", f: "rgba(255,99,132,0.2)" }, // 0:帯広
        { s: "rgba(54,162,235,1)", f: "rgba(54,162,235,0.2)" }, // 1:北海道
        { s: "rgba(75,192,192,1)", f: "rgba(75,192,192,0.2)" }, // 2:全国
        { s: "rgba(255,159,64,1)", f: "rgba(255,159,64,0.1)" }, // 3:中1
        { s: "rgba(153,102,255,1)", f: "rgba(153,102,255,0.1)" }, // 4:中2
        { s: "rgba(76,175,80,1)", f: "rgba(76,175,80,0.1)" } // 5:中3
    ];

    const allData = JSON.parse(localStorage.getItem("y-" + g) || '{}');
    const dataSets = [];

    // --- データセットの作成 ---
    // 1-3. 統計データ
    ["帯広市", "北海道", "全国"].forEach(rg => {
        dataSets.push(h.map((x, i) => CS(A[g][rg][i], x, g)));
    });

    // 4-6. 自分の各学年データ（修正済み）
    ["1", "2", "3"].forEach(grKey => {
        const gradeData = allData[grKey]; // データオブジェクトを取得
        const values = gradeData ? gradeData.v : null; // .v から配列を取り出す

        // 配列(values)が存在し、かつデータが入っているかチェック
        if (values && values.some(v => v !== "" && v !== null && parseFloat(v) !== 0)) {
            dataSets.push(h.map((x, i) => {
                const rawValue = values[i]; // 配列から値を取得
                // 値が空、または0の場合は0点とする
                if (rawValue === "" || rawValue === null || parseFloat(rawValue) === 0) {
                    return 0;
                }
                return CS(parseFloat(rawValue), x, g);
            }));
        } else {
            // データがない場合はグラフを描画しない
            dataSets.push(null);
        }
    });

    // --- キャンバス描画 ---
    ctx.clearRect(0, 0, cv.width, cv.height);
    const cX = cv.width / 2;
    const cY = cv.height / 2 - 15; // 垂直位置調整
    const rad = 210; // 半径
    const as = (Math.PI * 2) / h.length;

    // 背景（目盛り）描画
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 1;
    for (let i = 1; i <= 10; i++) {
        ctx.beginPath();
        ctx.arc(cX, cY, (rad / 10) * i, 0, Math.PI * 2);
        ctx.stroke();

        // 目盛りの数字を大きく表示
        if (i === 1 || i === 5 || i === 10) {
            const text = i + "点";
            const textY = cY - (rad / 10) * i;

            // 背景の白い丸
            ctx.beginPath();
            ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
            ctx.arc(cX, textY, 12, 0, Math.PI * 2);
            ctx.fill();

            // 文字の描画
            ctx.fillStyle = "#444";
            ctx.font = "bold 14px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(text, cX, textY);
        }
    }

    // 軸とラベル描画
    h.forEach((lb, i) => {
        const a = as * i - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(cX, cY);
        ctx.lineTo(cX + Math.cos(a) * rad, cY + Math.sin(a) * rad);
        ctx.stroke();

        ctx.fillStyle = "#333";
        ctx.textAlign = "center";
        ctx.font = "bold 13px Arial";

        let fullLabel = lb;
        if (lb.includes("持")) fullLabel = "持久走";
        else if (lb.includes("シ")) fullLabel = "20mシャトルラン";
        else if (lb.includes("握")) fullLabel = "握力";
        else if (lb.includes("上")) fullLabel = "上体起こし";
        else if (lb.includes("長")) fullLabel = "長座体前屈";
        else if (lb.includes("反")) fullLabel = "反復横とび";
        else if (lb.includes("立")) fullLabel = "立ち幅とび";
        else if (lb.includes("ハ")) fullLabel = "ハンドボール投";
        else if (lb.includes("50")) fullLabel = "50m走";

        const offset = 18;
        let x = cX + Math.cos(a) * (rad + offset);
        let y = cY + Math.sin(a) * (rad + offset);
        if (Math.abs(Math.sin(a)) > 0.9) y += (Math.sin(a) > 0) ? 10 : -5;
        ctx.fillText(fullLabel, x, y);
    });

    // データのポリゴン描画
    const currentGr = document.getElementById("grade").value;
    dataSets.forEach((scs, ri) => {
        if (!scs || (typeof radarVisible !== 'undefined' && !radarVisible[ri])) return;

        const c = cols[ri];
        const isSelf = ri >= 3; // 3:中1, 4:中2, 5:中3
        const isActive = isSelf && (ri - 2).toString() === currentGr;

        ctx.beginPath();
        ctx.setLineDash(isSelf && !isActive ? [5, 5] : []); // 非アクティブ学年は点線
        ctx.strokeStyle = c.s;
        ctx.fillStyle = c.f;
        ctx.lineWidth = isActive ? 3 : 2;

        scs.forEach((sc, i) => {
            const a = as * i - Math.PI / 2;
            const r = (rad / 10) * sc;
            const x = cX + Math.cos(a) * r;
            const y = cY + Math.sin(a) * r;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    });

    // 凡例描画
    const regs = ["帯広", "北海道", "全国", "中1", "中2", "中3"];
    ctx.setLineDash([]);
    const startX = cX - 270;
    const itemWidth = 90;
    regs.forEach((rg, i) => {
        const lX = startX + i * itemWidth;
        const lY = cv.height - 20;
        const isVisible = (typeof radarVisible !== 'undefined' && radarVisible[i]);

        if (isVisible) {
            ctx.fillStyle = cols[i].s;
            ctx.fillRect(lX, lY - 10, 15, 10);
            ctx.fillStyle = "#333";
        } else {
            ctx.strokeStyle = "#ccc";
            ctx.strokeRect(lX, lY - 10, 15, 10);
            ctx.fillStyle = "#aaa";
        }
        ctx.textAlign = "left";
        ctx.font = "bold 12px Arial";
        ctx.fillText(rg, lX + 20, lY);
    });
}

// ==========================================
// 3. トラッキング機能
// ==========================================

function addTrackingRecord() {
    const eventIdx = parseInt(document.getElementById("trackingEvent").value);
    const value = parseFloat(document.getElementById("trackingValue").value);
    const unit = document.getElementById("trackingUnit").value;
    const date = document.getElementById("trackingDate").value;
    const memo = document.getElementById("trackingMemo").value;
    const g = document.getElementById("gender").value;
    const h = D[g].h;
    const saveGrade = document.getElementById("grade").value;

    if (isNaN(value) || !date) {
        N('測定値と日付を入力してください', 'error');
        return;
    }

    const score = CS(value, h[eventIdx], g);
    const key = `tracking-${g}`;
    let trackingData = JSON.parse(localStorage.getItem(key) || '{}');
    if (!trackingData[eventIdx]) trackingData[eventIdx] = [];

    trackingData[eventIdx].push({
        date: date,
        value: value,
        unit: unit,
        memo: memo,
        score: score,
        grade: saveGrade
    });

    trackingData[eventIdx].sort((a, b) => new Date(a.date) - new Date(b.date));
    localStorage.setItem(key, JSON.stringify(trackingData));

    document.getElementById("trackingValue").value = '';
    document.getElementById("trackingMemo").value = '';
    N('記録を追加しました！', 'success');

    document.getElementById("trackingViewGrade").value = saveGrade;
    updateTrackingView();
}

function updateTrackingView() {
    const eventIdx = parseInt(document.getElementById("trackingViewEvent")?.value || 0);
    const g = document.getElementById("gender").value;
    const viewGrade = document.getElementById("trackingViewGrade").value;
    const key = `tracking-${g}`;
    const trackingData = JSON.parse(localStorage.getItem(key) || '{}');
    const allRecords = trackingData[eventIdx] || [];
    const records = allRecords.filter(r => String(r.grade) === String(viewGrade));
    const h = D[g].h;

    // ヘッダーとセレクトボックスの整理
    const allEvents = document.querySelectorAll('#trackingViewEvent');
    if (allEvents.length > 1) {
        allEvents[0].style.display = 'none';
        allEvents[0].id = 'old-tracking-event';
    }

    const canvas = document.getElementById("trackingGraph");
    let header = document.getElementById("dynamicTrackingHeader");
    if (!header) {
        header = document.createElement("div");
        header.id = "dynamicTrackingHeader";
        canvas.parentNode.insertBefore(header, canvas);
    }

    header.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; padding: 15px; background: #fff; border-radius: 12px; border-bottom: 4px solid #FF5722; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <div style="flex: 1;"></div> 
            <h2 style="flex: 2; text-align: center; font-size: 28px; margin: 0; color: #333; font-weight: bold;">📊 変容グラフ</h2>
            <div style="flex: 1; text-align: right; display: flex; align-items: center; justify-content: flex-end; gap: 10px;">
                <span style="font-weight: bold; color: #666;">表示種目:</span>
                <select id="trackingViewEvent" onchange="updateTrackingView()" 
                    style="font-size: 18px; padding: 8px 12px; border-radius: 8px; border: 2px solid #FF5722; background: white; font-weight: bold; text-align: center; text-align-last: center;">
                    ${h.slice(0, 9).map((name, i) => `<option value="${i}" ${i === eventIdx ? 'selected' : ''}>${name}</option>`).join('')}
                </select>
            </div>
        </div>
    `;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (records.length === 0) {
        ctx.fillStyle = '#666';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`中${viewGrade}年の記録がありません`, canvas.width / 2, 200);
        document.getElementById("trackingStats").innerHTML = '<div style="text-align:center;color:#666;padding:40px;background:#f5f5f5;border-radius:12px;font-size:20px;">データが登録されていません</div>';
        document.getElementById("trackingList").innerHTML = '';
        return;
    }

    drawTrackingGraph(records, h[eventIdx]);
    updateTrackingStats(records, h[eventIdx]);
    updateTrackingList(allRecords, h[eventIdx], eventIdx, viewGrade);
}

// ==========================================
// 4. トラッキンググラフ描画詳細 (drawTrackingGraph)
// ==========================================

function drawTrackingGraph(records, eventName) {
    const canvas = document.getElementById("trackingGraph");
    const ctx = canvas.getContext("2d");
    const padding = 60;
    const graphWidth = canvas.width - padding * 2;
    const graphHeight = canvas.height - padding * 2;

    // スコアの最小・最大（0〜10）
    const minScore = 0;
    const maxScore = 10;

    // --- 補助線と目盛り ---
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = '12px Arial';
    ctx.fillStyle = '#999';

    for (let i = 0; i <= 10; i++) {
        const y = padding + graphHeight - (i / 10) * graphHeight;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(canvas.width - padding, y);
        ctx.stroke();
        ctx.fillText(i + '点', padding - 10, y);
    }

    // --- プロットとライン ---
    if (records.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = '#FF5722';
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        records.forEach((r, i) => {
            const x = padding + (i / (records.length - 1)) * graphWidth;
            const y = padding + graphHeight - (r.score / 10) * graphHeight;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
    }

    // --- データポイント（点）とラベル ---
    records.forEach((r, i) => {
        const x = records.length === 1 ? canvas.width / 2 : padding + (i / (records.length - 1)) * graphWidth;
        const y = padding + graphHeight - (r.score / 10) * graphHeight;

        // 点の描画
        ctx.beginPath();
        ctx.fillStyle = '#FF5722';
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 測定値ラベル
        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(r.value + (r.unit || ''), x, y - 15);

        // 日付ラベル
        ctx.fillStyle = '#666';
        ctx.font = '11px Arial';
        const d = new Date(r.date);
        ctx.fillText(`${d.getMonth() + 1}/${d.getDate()}`, x, padding + graphHeight + 20);
    });
}

// ==========================================
// 5. 統計情報・履歴リスト更新
// ==========================================

function updateTrackingStats(records, eventName) {
    const scores = records.map(r => r.score);
    const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
    const max = Math.max(...scores);
    const latest = scores[scores.length - 1];

    document.getElementById("trackingStats").innerHTML = `
        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 15px; text-align: center;">
            <div style="padding:10px; background:#fff5f0; border-radius:10px;">
                <div style="font-size:12px; color:#FF5722;">平均得点</div>
                <div style="font-size:24px; font-weight:bold;">${avg}<span style="font-size:12px;">点</span></div>
            </div>
            <div style="padding:10px; background:#fff5f0; border-radius:10px;">
                <div style="font-size:12px; color:#FF5722;">自己ベスト</div>
                <div style="font-size:24px; font-weight:bold;">${max}<span style="font-size:12px;">点</span></div>
            </div>
            <div style="padding:10px; background:#fff5f0; border-radius:10px;">
                <div style="font-size:12px; color:#FF5722;">最新得点</div>
                <div style="font-size:24px; font-weight:bold;">${latest}<span style="font-size:12px;">点</span></div>
            </div>
        </div>
    `;
}

function updateTrackingList(allRecords, eventName, eventIdx, viewGrade) {
    const listHtml = allRecords.map((r, i) => `
        <div style="display: flex; align-items: center; padding: 12px 15px; border-bottom: 1px solid #eee; background: ${String(r.grade) === String(viewGrade) ? '#fff' : '#f9f9f9'}; opacity: ${String(r.grade) === String(viewGrade) ? '1' : '0.6'}">
            <div style="width: 40px; font-weight: bold; color: #FF5722;">中${r.grade}</div>
            <div style="flex: 1;">
                <div style="font-weight: bold;">${r.date} <span style="font-size: 0.9em; color: #666; margin-left: 8px;">${r.unit || ''}</span></div>
                <div style="font-size: 13px; color: #888;">${r.memo || 'メモなし'}</div>
            </div>
            <div style="text-align: right; margin-right: 15px;">
                <span style="font-size: 18px; font-weight: bold;">${r.value}</span>
                <span style="font-size: 14px; font-weight: bold; color: #FF5722; margin-left: 5px;">(${r.score}点)</span>
            </div>
            <button onclick="deleteTrackingRecord(${eventIdx}, ${i})" style="padding: 5px 10px; background: #ff4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">削除</button>
        </div>
    `).reverse().join('');

    document.getElementById("trackingList").innerHTML = listHtml || '<div style="padding:20px; text-align:center; color:#999;">記録がありません</div>';
}

function deleteTrackingRecord(eventIdx, recordIdx) {
    if (!confirm('この記録を削除してもよろしいですか？')) return;
    const g = document.getElementById("gender").value;
    const key = `tracking-${g}`;
    let trackingData = JSON.parse(localStorage.getItem(key) || '{}');

    if (trackingData[eventIdx]) {
        trackingData[eventIdx].splice(recordIdx, 1);
        localStorage.setItem(key, JSON.stringify(trackingData));
        updateTrackingView();
    }
}

// ==========================================
// 6. 印刷・ユーティリティ
// ==========================================

function preparePrint() {
    const gender = document.getElementById("gender").value;
    const radarArea = document.getElementById("radar");
    const originalDisplay = radarArea.style.display;

    // グラフエリアが「none」だと描画がバグる場合があるため、一時的に表示
    radarArea.style.display = "block";

    // グラフ描画関数(RR)を強制実行
    RR(gender);

    // 描画完了を待ってから印刷
    setTimeout(() => {
        window.print();
        radarArea.style.display = originalDisplay;
    }, 300);
}

// --- 凡例クリック判定 ---
document.addEventListener('DOMContentLoaded', function() {
    const cv = document.getElementById("rc");
    if (!cv) return;

    cv.onclick = function(e) {
        const rect = cv.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const cX = cv.width / 2;
        const startX = cX - 270;
        const itemWidth = 90;
        const lY = cv.height - 20;

        // 6つの凡例（帯広〜中3）のクリック判定
        for (let i = 0; i < 6; i++) {
            const lX = startX + i * itemWidth;
            if (x >= lX && x <= lX + itemWidth && y >= lY - 20 && y <= lY + 10) {
                radarVisible[i] = !radarVisible[i];
                RR(document.getElementById("gender").value);
                break;
            }
        }
    };
});

// ==========================================
// 7. 種目別ランキング機能（完全版）
// ==========================================

function toggleRanking() {
    const c = document.getElementById("ranking");
    if (!c) return;
    if (c.style.display === "none") {
        c.style.display = "block";
        renderRanking();
    } else {
        c.style.display = "none";
    }
}

function renderRanking() {
    const g = document.getElementById("gender").value;
    const h = D[g].h.slice(0, 9); 
    let scores = [];

    h.forEach((name, i) => {
        const inputEl = document.getElementById(`i${i}`);
        const rawVal = inputEl ? inputEl.value : "";
        const val = parseFloat(rawVal);
        
        let score = 0;
        let displayValue = "-";

        // 持久走の10点固定バグを防ぐ：空文字・0・NaNを除外
        if (rawVal !== "" && !isNaN(val) && val > 0) {
            score = CS(val, name, g);
            
            // 実数値の整形
            if (name.includes("持久走")) {
                const m = Math.floor(val / 60);
                const s = Math.floor(val % 60);
                displayValue = `${m}'${s < 10 ? '0' + s : s}"`;
            } else if (name.includes("50m")) { displayValue = `${val}秒`; }
            else if (name.includes("ハンド") || name.includes("幅跳び")) { displayValue = `${val}cm`; }
            else if (name.includes("握力")) { displayValue = `${val}kg`; }
            else { displayValue = `${val}回`; }
        }

        scores.push({ name: name, score: score, actual: displayValue });
    });

    // スコア順にソート
    scores.sort((a, b) => b.score - a.score);

    const leftCol = scores.slice(0, 5);  // 1-5位
    const rightCol = scores.slice(5, 9); // 6-9位

    const container = document.getElementById("rankingListArea");
    if (!container) return;

    let html = '<div class="ranking-container">';
    
    // 左列（1-5位）
    html += '<div class="ranking-column">';
    leftCol.forEach((item, index) => html += generateRankItemHTML(item, index));
    html += '</div>';

    // 右列（6-9位）
    html += '<div class="ranking-column">';
    rightCol.forEach((item, index) => html += generateRankItemHTML(item, index + 5));
    html += '</div>';

    html += '</div>';
    container.innerHTML = html;
}

function generateRankItemHTML(item, index) {
    // 順位表示（メダルまたは数字）
    let medal = (item.score === 0) ? `<span style="font-size:12px;color:#ccc">${index+1}</span>` : 
                (index === 0) ? "🥇" : (index === 1) ? "🥈" : (index === 2) ? "🥉" : 
                `<span style="font-size:14px;color:#888;font-weight:bold">${index + 1}</span>`;

    // 得点に応じた色
    const color = item.score >= 9 ? "#FFB300" : item.score >= 7 ? "#4CAF50" : item.score >= 4 ? "#2196F3" : "#9E9E9E";

    // HTML構造の組み立て
    return `
        <div class="ranking-item" style="--rank-color: ${color}">
            <div class="rank-badge">${medal}</div>
            <div class="rank-name">${item.name}</div>
            <div class="rank-actual-value">${item.actual}</div>
            <div class="rank-score-area">
                <span class="rank-score">${item.score}</span><span class="rank-unit">点</span>
            </div>
        </div>
    `;
}