// ==========================================
// 1. グローバル変数・初期設定
// ==========================================
var radarVisible = radarVisible || [true, true, true, true, true, true];

(function() {
    const urlParams = new URLSearchParams(window.location.search);
    const t = urlParams.get('t');
    if (t) {
        try {
            const decodedUrl = decodeURIComponent(escape(atob(t)));
            if (decodedUrl.includes('https://script.google.com')) {
                localStorage.setItem('gasUrl', decodedUrl);
                console.log("送信先URLを自動設定しました: " + decodedUrl);
            }
        } catch (e) {
            console.error("URL解析失敗", e);
        }
    }
})();

// ==========================================
// 2. ページ初期化処理
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    RT(); RS(); RE(); 
    L(); // ページを開いた時に現在の学年データを読み込む
    
    document.getElementById("gender").addEventListener("change", () => {
        RT(); RS(); 
        L(); 
    });
    
    document.getElementById("grade").addEventListener("change", () => {
        L(); 
    });
});

// ==========================================
// 3. ユーティリティ関数（名称短縮・変換・通知）
// ==========================================
function K(h) {
    if (h.includes("握")) return "握力";
    if (h.includes("上")) return "上体";
    if (h.includes("長")) return "長座";
    if (h.includes("横")) return "横";
    if (h.includes("持")) return "持";
    if (h.includes("シ")) return "シ";
    if (h.includes("50")) return "50m";
    if (h.includes("幅")) return "幅";
    if (h.includes("ハ")) return "ハ";
    return "";
}

function TS(t) {
    if (!t.includes("'")) return parseFloat(t);
    const c = t.replace(/以下|以上/g, "").trim();
    const p = c.split("'");
    return parseInt(p[0]) * 60 + parseInt(p[1].replace("\"", ""));
}

function N(m, t = 'success') {
    const n = document.getElementById('notif');
    if (!n) return;
    n.textContent = m;
    n.className = `notification ${t}`;
    n.style.display = 'block';
    setTimeout(() => n.style.display = 'none', 3000);
}

// ==========================================
// 4. 計算・判定ロジック
// ==========================================
function CS(v, h, g) {
    if (v === null || v === undefined || v === "" || parseFloat(v) === 0) {
        return 0;
    }
    const c = D[g].c; 
    const k = K(h);
    let rv = k === "50m" || k === "持" ? Math.ceil(v * 100) / 100 : Math.floor(v);
   
    for (let j = 0; j < c.length; j++) {
        const r = c[j];
        const t = r[k];
        let m = false;
        if (t.includes("以上")) { const th = k === "持" ? TS(t) : parseFloat(t); if (rv >= th) m = true; }
        else if (t.includes("以下")) { const th = k === "持" ? TS(t) : parseFloat(t); if (rv <= th) m = true; }
        else if (t.includes("～")) {
            const p = t.split("～");
            let min = k === "持" ? TS(p[0]) : parseFloat(p[0]);
            let max = k === "持" ? TS(p[1]) : parseFloat(p[1]);
            if (k === "持") { if (rv >= min && rv <= max + 0.99) m = true; }
            else if (k === "50m") { if (rv >= min && rv <= max + 0.09) m = true; }
            else { if (rv >= min && rv <= max) m = true; }
        }
        if (m) return r.p;
    }
    return 0;
}

// ==========================================
// 5. テーブル描画（ログ・得点表・評価表）
// ==========================================
function RT() {
    const g = document.getElementById("gender").value;
    if (!D[g]) return;
    const h = D[g].h;
    
    const formatTime = (sec) => {
        const m = Math.floor(sec / 60);
        const s = Math.round(sec % 60);
        return `${m}'${s.toString().padStart(2, '0')}"`;
    };

    let s = '<table><tr><th></th>';
    h.forEach(x => s += `<th>${x}</th>`);
    s += '</tr>';
    ["記録", "帯広市", "北海道", "全国"].forEach(r => {
        let label = r;
        if (r === "北海道" || r === "全国") {
            label = `<div>${r}</div><div style="font-size:0.8em; color:#666; font-weight:normal;">(R7)</div>`;
        }
        s += '<tr><td>' + label + '</td>';
        h.forEach((x, j) => {
            if (r === "記録") {
                if (j === 4) { 
                    s += `<td style="padding:2px; min-width:100px;">
        <div style="display:flex;align-items:center;justify-content:center;gap:2px;">
            <input type="number" id="i4_min" class="v-in" onchange="U()" placeholder="分" style="width:38px;text-align:center;padding:2px;">
            :
            <input type="number" id="i4_sec" class="v-in" onchange="U()" placeholder="秒" style="width:38px;text-align:center;padding:2px;">
        </div>
        <input type="hidden" id="i4">
      </td>`;
                } else if (j < 9) {
                    s += `<td><input type="number" id="i${j}" class="v-in" onchange="U()" step="0.1" style="width:100%;box-sizing:border-box;"></td>`;
                } else {
                    s += `<td id="i9"><div>0</div><div>E</div></td>`;
                }
            } else {
                let v = A[g][r][j];
                let displayVal = (j === 4) ? formatTime(v) : v;
                if (j === 9) { 
                    let totalScore = T[g][r];   // data.js の T から数値を読み込む
                    let totalRank = TR[g][r];    // data.js の TR からランクを読み込む
                    s += `<td><div>${totalScore}</div><div style="font-size:0.8em;color:#666">(${totalRank})</div></td>`; 
                } else { 
                    const sc = CS(v, x, g);
                    s += `<td><div>${displayVal}</div><div style="font-size:0.8em;color:#666">(${sc}点)</div></td>`; 
                }
            }
        });
        s += '</tr>';
    });
    s += '</table>';
    document.getElementById("table").style.position = "relative";
    document.getElementById("table").innerHTML = '<div id="table-timestamp"></div>' + s;
}

function RS() {
    const g = document.getElementById("gender").value;
    const c = D[g].c; const h = D[g].h;
    let s = '<table><tr><th>点数</th>';
    h.slice(0, -1).forEach(x => s += `<th>${x}</th>`);
    s += '</tr>';
    c.forEach((r, ri) => {
        s += `<tr><td>${r.p}</td>`;
        h.slice(0, -1).forEach((x, ci) => { s += `<td id="s${ri}-${ci}">${r[K(x)]}</td>`; });
        s += '</tr>';
    });
    s += '</table>';
    document.getElementById("score").innerHTML = s;
}

function RE() {
    let s = '<table><tr><th>段階</th><th>中1</th><th>中2</th><th>中3</th></tr>';
    E.forEach(r => { s += `<tr><td>${r.s}</td><td id="e${r.s}1">${r.c1}</td><td id="e${r.s}2">${r.c2}</td><td id="e${r.s}3">${r.c3}</td></tr>`; });
    s += '</table>';
    document.getElementById("eval").innerHTML = s;
}

// ==========================================
// 6. 更新処理（U関数）
// ==========================================
function U(isInitial = false) {
    const m = parseInt(document.getElementById("i4_min")?.value) || 0;
    const sec = parseInt(document.getElementById("i4_sec")?.value) || 0;
    const i4 = document.getElementById("i4");
    if (i4) i4.value = (m > 0 || sec > 0) ? (m * 60) + sec : "";

    const g = document.getElementById("gender").value;
    const gr = parseInt(document.getElementById("grade").value);
    const c = D[g].c; const h = D[g].h;

    c.forEach((r, ri) => h.slice(0, -1).forEach((x, ci) => {
        const el = document.getElementById(`s${ri}-${ci}`);
        if (el) el.style.background = '';
    }));
    E.forEach(r => [1, 2, 3].forEach(a => {
        const el = document.getElementById(`e${r.s}${a}`);
        if (el) el.classList.remove("highlight");
    }));

    let scores = [];
    h.slice(0, -1).forEach((x, i) => {
        const inputEl = document.getElementById(`i${i}`);
        const v = parseFloat(inputEl ? inputEl.value : "");
        if (isNaN(v) || v === 0) { scores.push(0); return; }
        const sc = CS(v, x, g);
        scores.push(sc);
        const scoreRowIdx = c.findIndex(r => r.p === sc);
        if (scoreRowIdx !== -1) {
            const el = document.getElementById(`s${scoreRowIdx}-${i}`);
            if (el) el.style.background = '#cceeff';
        }
    });

    const totalScore = scores[0] + scores[1] + scores[2] + scores[3] + 
                       Math.max(scores[4], scores[5]) + 
                       scores[6] + scores[7] + scores[8];

    const scArea = document.getElementById("i9");
    let lv = "E";
    for (let i = 0; i < E.length; i++) {
        const r = E[i];
        const rg = r[`c${gr}`];
        let min, max;
        if (rg.includes("以上")) { min = parseFloat(rg); max = 100; }
        else if (rg.includes("以下")) { min = 0; max = parseFloat(rg); }
        else if (rg.includes("～")) { [min, max] = rg.split("～").map(Number); }
        if (totalScore >= min && totalScore <= max) { lv = r.s; break; }
    }
    
    if (scArea) {
        scArea.querySelector("div").textContent = totalScore;
        scArea.querySelectorAll("div")[1].textContent = lv;
    }
    const highlightEl = document.getElementById(`e${lv}${gr}`);
    if (highlightEl) highlightEl.classList.add("highlight");

    if (!isInitial) {
    // 読み込み中（isInitial=true）ではなく、かつ
    // 学年・性別選択メニューにフォーカスがない時だけ保存を実行する
    const activeEl = document.activeElement.id;
    if (activeEl !== "gender" && activeEl !== "grade") {
        SI();
    }
}
    //updateTimestamp();
    RAnalysis(g);

    if (typeof RR === 'function') {
        const radarArea = document.getElementById("radar");
        if (radarArea && radarArea.style.display !== "none") {
            RR(g);
        }
    }

    if (typeof renderRanking === 'function') {
        const ra = document.getElementById("ranking");
        if (ra && ra.style.display !== "none") renderRanking();
    }
}

function renderTimestampToArea(tsString) {
    const tsArea = document.getElementById("table-timestamp");
    if (!tsArea) return;
    
    if (!tsString) {
        tsArea.innerHTML = "";
        return;
    }

    // "2024.05.20 12:30:15" 形式を分割して表示
    const parts = tsString.split(" ");
    const datePart = parts[0];
    const timePart = parts[1];

    tsArea.style = `position: absolute; right: 0; bottom: 100%; margin-bottom: 4px; text-align: right; font-size: 13px; color: #2b6cb0; background: transparent; padding: 0px 2px; font-family: monospace; line-height: 1.2; font-weight: bold; white-space: nowrap; z-index: 10;`;
    tsArea.innerHTML = `<div>${datePart}</div><div>${timePart}</div>`;
}

// ==========================================
// 7. データ保存・読み込み（SI/L関数）
// ==========================================
function SI() {
    const g = document.getElementById("gender").value;
    const gr = document.getElementById("grade").value;
    const key = "y-" + g;
    let v = [];
    for (let i = 0; i < 9; i++) { 
        v.push(document.getElementById(`i${i}`).value || "");
    }
    const now = new Date();
    const f = (n) => n.toString().padStart(2, '0');
    const ts = `${now.getFullYear()}.${f(now.getMonth() + 1)}.${f(now.getDate())} ${f(now.getHours())}:${f(now.getMinutes())}:${f(now.getSeconds())}`;
    
    let allData = JSON.parse(localStorage.getItem(key) || "{}");
    allData[gr] = { v: v, ts: ts }; // 時刻(ts)をデータに含めて保存
    localStorage.setItem(key, JSON.stringify(allData));

    // 保存した瞬間の時刻を「最終保存」と「カード右端(updateTimestampの場所)」の両方に反映
    const tsElement = document.getElementById("lastSaved");
    if (tsElement) tsElement.innerText = "最終保存: " + ts;
    
    // カード右端の青い時刻表示も保存した時刻で更新する
    renderTimestampToArea(ts); 
}

function L() {
    const g = document.getElementById("gender").value;
    const gr = document.getElementById("grade").value;
    const allData = JSON.parse(localStorage.getItem("y-" + g) || '{}');
    const data = allData[gr];

    // 入力欄を一度すべてリセット
    document.querySelectorAll(".v-in").forEach(input => { input.value = ""; });
    if (document.getElementById("i4")) document.getElementById("i4").value = "";
    if (document.getElementById("i4_min")) document.getElementById("i4_min").value = "";
    if (document.getElementById("i4_sec")) document.getElementById("i4_sec").value = "";

    const tsElement = document.getElementById("lastSaved");

    if (data) {
        let values = Array.isArray(data) ? data : (data.v || []);
        let timestamp = data.ts || ""; // ★保存されていた「時刻文字列」を取得

        values.forEach((val, i) => {
            const input = document.getElementById(`i${i}`);
            if (input) input.value = val;
            if (i === 4 && val) {
                const m = Math.floor(val / 60);
                const s = val % 60;
                if (document.getElementById("i4_min")) document.getElementById("i4_min").value = m;
                if (document.getElementById("i4_sec")) document.getElementById("i4_sec").value = s;
            }
        });

        if (tsElement) tsElement.innerText = timestamp ? "最終保存: " + timestamp : "";
        
        renderTimestampToArea(timestamp); 

    } else {
        if (tsElement) tsElement.innerText = "";
        renderTimestampToArea(""); 
    }

    U(true);
}

// ==========================================
// 8. 分析・目標シミュレーター・特殊機能
// ==========================================
function updateTimestamp() {
    const now = new Date();
    const f = (n) => n.toString().padStart(2, '0');
    const datePart = `${now.getFullYear()}.${f(now.getMonth() + 1)}.${f(now.getDate())}`;
    const timePart = `${f(now.getHours())}:${f(now.getMinutes())}:${f(now.getSeconds())}`;
    const tsArea = document.getElementById("table-timestamp");
    if (tsArea) {
        tsArea.style = `position: absolute; right: 0; bottom: 100%; margin-bottom: 4px; text-align: right; font-size: 13px; color: #2b6cb0; background: transparent; padding: 0px 2px; font-family: monospace; line-height: 1.2; font-weight: bold; white-space: nowrap; z-index: 10;`;
        tsArea.innerHTML = `<div>${datePart}</div><div>${timePart}</div>`;
    }
}

function sendToTeacher() {
    const name = localStorage.getItem('studentName');
    const studentId = localStorage.getItem('studentId');
    const gasUrl = localStorage.getItem('gasUrl') || localStorage.getItem('teacherScriptUrl');

    if (!name || !studentId) {
        alert("先に「本人登録」をしてください。");
        openStudentConfig();
        return;
    }
    if (!gasUrl) { alert("送信先URLが設定されていません。"); return; }

    if (typeof N === 'function') N('送信中...', 'info');

    let enduranceVal = document.getElementById('i4').value || "";
    if (enduranceVal !== "") {
        const totalSec = parseInt(enduranceVal);
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        enduranceVal = `${m}:${s.toString().padStart(2, '0')}`;
    }

    // 送信データの作成
    const payload = {
        name: name,
        studentId: studentId,
        gender: document.getElementById('gender').value,
        grade: document.getElementById('grade').value,
        class: document.getElementById('class').value,
        session: document.getElementById('session').value,
        grip: document.getElementById('i0').value || "",
        situp: document.getElementById('i1').value || "",
        forward: document.getElementById('i2').value || "",
        sidestep: document.getElementById('i3').value || "",
        endurance: enduranceVal,
        shuttle: document.getElementById('i5').value || "",
        sprint50: document.getElementById('i6').value || "",
        jump: document.getElementById('i7').value || "",
        throw: document.getElementById('i8').value || "",
        // ↓ここを追加（画面上の合計点と評価を取得）
        total: document.getElementById('total').innerText,
        rank: document.getElementById('rank').innerText
    };

    const params = new URLSearchParams(payload);
    fetch(`${gasUrl}?${params.toString()}`, { method: 'GET', mode: 'no-cors' })
    .then(() => {
        if (typeof N === 'function') N('送信完了！', 'success');
        alert(`${name}さんのデータを送信しました。`);
    })
    .catch(err => {
        alert('エラーが発生しました。');
    });
}

function RAnalysis(g) {
    const h = D[g].h.slice(0, 9);
    let myScores = [];
    let hasData = false;
    for (let i = 0; i < 9; i++) {
        const v = parseFloat(document.getElementById(`i${i}`).value);
        if (!isNaN(v)) { hasData = true; myScores.push(CS(v, h[i], g)); }
        else { myScores.push(0); }
    }
    if (!hasData) {
        document.getElementById("fitnessPokedex").innerHTML = '<div style="grid-column:1/-1;text-align:center;color:white;opacity:0.8;padding:40px">データを入力すると図鑑が表示されます</div>';
        document.getElementById("totalRank").innerHTML = '';
        return;
    }

    // 種目インデックス：0握力, 1上体, 2長座, 3反復, 4持久走, 5シャトル, 6:50m, 7立幅, 8ハンド
    const calcAvg = (indices) => {
        const validScores = indices.map(i => myScores[i]).filter(s => s > 0);
        return validScores.length > 0 ? validScores.reduce((sum, s) => sum + s, 0) / validScores.length : 0;
    };

    // 型の名称と構成種目テキスト（最新版）
    const typeDetails = {
        'パワー型': '(50m・立幅・ハンド・握力)',
        'テクニック型': '(50m・反復・ハンド)',
        'スタミナ型': '(持久走/シ・上体)',
        'コンディション型': '(長座体屈・上体・反復)'
    };

    // 構成種目のインデックス連動
    const types = [
        { name: 'パワー型', emoji: '💪', avg: calcAvg([6, 7, 8, 0]), color: '#f5576c' }, // 50m, 立幅, ハンド, 握力
        { name: 'テクニック型', emoji: '⚡', avg: calcAvg([6, 3, 8]), color: '#ff9a00' }, // 50m, 反復, ハンド
        { name: 'スタミナ型', emoji: '🔋', avg: (Math.max(myScores[4], myScores[5]) + myScores[1]) / 2, color: '#00f2fe' }, // 持久/シ, 上体
        { name: 'コンディション型', emoji: '🧘', avg: calcAvg([2, 1, 3]), color: '#fee140' } // 長座, 上体, 反復
    ];

    let pokedexHtml = '';
    types.forEach(type => {
        const level = Math.floor(type.avg);
        const progress = (type.avg / 10) * 100;
        const scoreFormatted = type.avg.toFixed(1);
        
        const mainFontSize = "22px"; 
        const detailFontSize = "16px";

        pokedexHtml += `
            <div class="pokedex-card" style="--type-color: ${type.color}; padding: 15px; border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.2); position: relative; overflow: hidden;">
                <div style="position: absolute; top: -20px; right: -20px; width: 80px; height: 80px; background: ${type.color}; filter: blur(40px); opacity: 0.3; z-index: 0;"></div>

                <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; position: relative; z-index: 1;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 26px; line-height: 1;">${type.emoji}</span>
                        <div style="text-align: left; line-height: 1.1; text-shadow: 1px 1px 3px rgba(0,0,0,0.8);">
                            <div style="font-size: ${mainFontSize}; font-weight: 900; color: ${type.color};">${type.name}</div>
                            <div style="font-size: ${mainFontSize}; font-weight: 900; color: ${type.color}; filter: brightness(1.1);">Lv.${level}</div>
                        </div>
                    </div>

                    <div style="font-size: ${detailFontSize}; font-weight: bold; color: white; text-align: right; white-space: nowrap; flex-shrink: 0; padding: 4px 8px;">
                        ${typeDetails[type.name]}
                    </div>
                </div>
                
                <div style="position: relative; z-index: 1;">
                    <div style="background: rgba(255, 255, 255, 0.1); height: 14px; border-radius: 7px; overflow: hidden; box-shadow: inset 0 1px 4px rgba(0,0,0,0.3); margin-bottom: 4px;">
                        <div style="background: linear-gradient(90deg, ${type.color} 0%, white 200%); height: 100%; width: ${progress}%; transition: width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);"></div>
                    </div>
                    
                    <div style="text-align: right; font-family: 'Courier New', Courier, monospace; color: white; font-size: 14px; font-weight: bold; letter-spacing: 1px;">
                        SCORE: <span style="font-size: 18px; color: ${type.color}; font-weight: bold;">${scoreFormatted}</span> <span style="font-size: 12px; opacity: 0.6;">/ 10.0</span>
                    </div>
                </div>
            </div>
        `;
    });
    document.getElementById("fitnessPokedex").innerHTML = pokedexHtml;
    const totalScore = myScores[0] + myScores[1] + myScores[2] + myScores[3] + Math.max(myScores[4], myScores[5]) + myScores[6] + myScores[7] + myScores[8];
    const gr = parseInt(document.getElementById("grade").value);
    let rank = 'E';
    for (let i = 0; i < E.length; i++) {
        const rg = E[i][`c${gr}`];
        let min, max;
        if (rg.includes("以上")) { min = parseFloat(rg); max = 100; }
        else if (rg.includes("以下")) { min = 0; max = parseFloat(rg); }
        else { [min, max] = rg.split("～").map(Number); }
        if (totalScore >= min && totalScore <= max) { rank = E[i].s; break; }
    }
    document.getElementById("totalRank").innerHTML = `<div style="font-size:28px;">総合評価: ${rank} (${totalScore}点)</div>`;
}

function setGoal(goalType) {
    const g = document.getElementById("gender").value;
    const h = D[g].h.slice(0, 9);
    const gr = parseInt(document.getElementById("grade").value);
    
    let currentData = [];
    let scoresForTotal = [];
    for (let i = 0; i < 9; i++) {
        const inp = document.getElementById(`i${i}`);
        const v = parseFloat(inp ? inp.value : 0) || 0;
        const s = CS(v, h[i], g);
        currentData.push({ val: v, score: s, name: h[i], idx: i });
        scoresForTotal.push(s);
    }

    const currentTotal = scoresForTotal[0] + scoresForTotal[1] + scoresForTotal[2] + scoresForTotal[3] + 
                         Math.max(scoresForTotal[4], scoresForTotal[5]) + 
                         scoresForTotal[6] + scoresForTotal[7] + scoresForTotal[8];

    let targetScore = 0;
    let rankName = goalType.replace('rank', '');
    const rankEntry = E.find(e => e.s === rankName);
    
    if (rankEntry) {
        const criteria = rankEntry[`c${gr}`];
        targetScore = parseInt(criteria.includes('以上') ? criteria.replace('以上', '') : criteria.split('～')[0]);
    }
    
    const pointsNeeded = targetScore - currentTotal;
    
    let html = `<div style="background:white;padding:25px;border-radius:12px;box-shadow:0 4px 15px rgba(0,0,0,0.1)">
                <h5 style="margin:0 0 10px 0;font-size:20px;color:#9c27b0">🎯 総合${rankName}評価を目指す</h5>
                <div style="background:#f5f5f5;padding:15px;border-radius:8px;margin-bottom:20px">
                    <div style="font-size:14px;color:#666;margin-bottom:5px">現在${currentTotal}点 → <strong>目標${targetScore}点以上</strong></div>
                    <div style="font-size:22px;font-weight:bold;color:#9c27b0">${pointsNeeded <= 0 ? '🎉 目標達成中！' : 'あと ' + pointsNeeded + ' 点 必要です'}</div>
                </div>`;
    
    if (pointsNeeded > 0) {
        html += `<h6 style="color:#9c27b0;margin-bottom:12px;font-size:16px;">💡 ${rankName}判定までの最短ルート</h6>`;
        html += '<div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-start;">';

        let simData = JSON.parse(JSON.stringify(currentData)); 
        let simTotal = currentTotal;
        let finalResults = {}; // 種目ごとの最終目標を保持
        let tempNeeded = pointsNeeded;

        // 【修正ポイント】スコアの低い順にソートして、複数種目に1〜2点ずつ分散させる
        let sortedIndices = simData
            .map((d, i) => ({ idx: i, score: d.score }))
            .sort((a, b) => a.score - b.score);

        // 最大2周（各項目最大+2点まで）分散させて配分
        for (let round = 0; round < 2; round++) {
            for (let item of sortedIndices) {
                if (tempNeeded <= 0) break;
                let i = item.idx;
                
                // 満点未満、かつ持久走/シャトルの排他制御を考慮
                if (simData[i].score < 10) {
                    if (i === 4 && simData[5].score > simData[4].score) continue;
                    if (i === 5 && simData[4].score > simData[5].score) continue;

                    // 1点アップさせるための数値を計算
                    let step = (simData[i].name.includes("50m") || simData[i].name.includes("持久")) ? -0.01 : 0.01;
                    if (simData[i].name.includes("持久")) step = -1;
                    
                    let testVal = simData[i].val || (simData[i].name.includes("50m") ? 10.0 : simData[i].name.includes("持久") ? 600 : 0);
                    let nextVal = testVal;
                    let startScore = simData[i].score;
                    
                    while (CS(nextVal, simData[i].name, g) <= startScore && nextVal > 0 && nextVal < 2000) {
                        nextVal = Math.round((nextVal + step) * 100) / 100;
                    }

                    simData[i].score += 1;
                    simData[i].val = nextVal;
                    tempNeeded -= 1;

                    // 結果を保存（上書きしていくことで最終的な目標値を保持）
                    finalResults[simData[i].name] = {
                        name: simData[i].name,
                        startScore: currentData[i].score,
                        targetScore: simData[i].score,
                        nextVal: nextVal,
                        totalGap: Math.abs(Math.round((nextVal - currentData[i].val) * 100) / 100)
                    };
                }
            }
        }

        // 表示処理（ロジックは上記で確定、あとは表示のみ）
        Object.values(finalResults).forEach(res => {
            let unit = res.name.includes("50m") ? "秒" : (res.name.includes("ハンド")) ? "m" : (res.name.includes("幅跳び") || res.name.includes("長座")) ? "cm" : res.name.includes("握力") ? "kg" : "回";
            let displayGap = res.totalGap;
            let displayTarget = res.nextVal;
            let suffixUnit = unit;

            if (res.name.includes("持久")) {
                const m = Math.floor(res.nextVal / 60);
                const s = Math.round(res.nextVal % 60);
                displayTarget = `${m}分${s.toString().padStart(2, '0')}`;
                unit = "秒"; suffixUnit = "";
            }

            const diffColor = res.targetScore >= 8 ? '#f44336' : res.targetScore >= 5 ? '#FF9800' : '#2196f3';
            
            html += `
            <div style="background:#f9f9f9; padding:18px 12px; border-radius:8px; border-top:8px solid ${diffColor}; width:calc(33.33% - 10px); min-width:260px; box-sizing:border-box; text-align:center; box-shadow:0 2px 8px rgba(0,0,0,0.1); margin-bottom:10px;">
                <div style="font-weight:bold; font-size:22px; color:#333; margin-bottom:10px; border-left:4px solid ${diffColor}; background:#eee; padding:2px 12px; display:inline-block; border-radius:0 4px 4px 0;">${res.name}</div>
                <div style="font-size:15px; color:#555; margin-bottom:12px; background:#eee; display:inline-block; padding:2px 10px; border-radius:15px;">
                    現在 <span style="font-weight:bold;">${res.startScore}点</span> → 目標 <span style="font-weight:bold; color:#555;">${res.targetScore}点</span>
                </div>
                <div style="display:flex; align-items:baseline; justify-content:center; gap:8px;">
                    <div style="font-weight:900; font-size:22px; color:${diffColor}; white-space:nowrap;">あと ${displayGap}${unit}</div>
                    <div style="color:#444; font-size:17px; font-weight:bold; white-space:nowrap;">（目標: ${displayTarget}${suffixUnit}）</div>
                </div>
            </div>`;
        });
        
        html += '</div>';
        html += `<div style="margin-top: 20px;padding: 18px;background: #f3e5f5;color: #7b1fa2;border-radius: 8px;text-align: center;font-size: 20px; font-weight: 900;box-shadow: 0 2px 10px rgba(123, 31, 162, 0.1);">✨ これをクリアすれば${rankName}判定です！</div>`;
    } else {
        html += '<div style="padding:20px;background:linear-gradient(135deg,#4CAF50,#66BB6A);color:white;border-radius:8px;text-align:center;font-size:18px">🎉 すでに目標達成しています！</div>';
    }
    
    html += '</div>';
    const guide = document.getElementById("guide");
    if (guide) guide.style.display = "none";
    document.getElementById("goalSimulator").innerHTML = html;
    document.getElementById("goalSimulator").scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function C() {
    if (!confirm("現在の学年の入力内容をすべて消去しますか？")) return;
    const inputs = document.querySelectorAll(".v-in");
    inputs.forEach(input => input.value = "");
    const g = document.getElementById("gender").value;
    const gr = document.getElementById("grade").value;
    const key = "y-" + g;
    let allData = JSON.parse(localStorage.getItem(key) || '{}');
    if (allData[gr]) {
        delete allData[gr];
        localStorage.setItem(key, JSON.stringify(allData));
    }
    const tsElement = document.getElementById("lastSaved");
    if (tsElement) tsElement.innerText = "";

    if (document.getElementById("guide")) document.getElementById("guide").style.display = "block";
    if (document.getElementById("goalSimulator")) document.getElementById("goalSimulator").innerHTML = "";
    
    U();
    alert("消去しました。");
}

function preparePrint() {
    const gender = document.getElementById("gender").value;
    const radarArea = document.getElementById("radar");
    if (!radarArea) return window.print();
    const originalDisplay = radarArea.style.display;
    radarArea.style.display = "block";
    if (typeof RR === 'function') { RR(gender); }
    setTimeout(() => {
        window.print();
        radarArea.style.display = originalDisplay;
    }, 300);
}

// ==========================================
// 9. バックアップ機能（保存・復元）
// ==========================================

/**
 * 9-1. バックアップ画面（モーダル）を表示
 * ウィンドウサイズを大きくし、視認性を高めた管理画面です
 */
function showBackupModal() {
    const modal = document.createElement('div');
    modal.id = "backup-modal";
    // 背景オーバーレイ
    modal.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:3000;display:flex;align-items:center;justify-content:center;";
    
    modal.innerHTML = `
        <div style="max-width:600px; width:95%; background:white; border-radius:20px; padding:40px; box-shadow:0 20px 60px rgba(0,0,0,0.3); position:relative;">
            <h2 style="color: #2b6cb0; text-align: center; margin-top:0; font-size:24px;">📲 データの保存と復元</h2>
            
            <div style="text-align:left; font-size:15px; background:#f0f7ff; padding:20px; border-radius:12px; margin-bottom:30px; line-height:1.8; border-left:6px solid #2b6cb0;">
                <strong style="font-size:17px;">【使用方法】</strong><br>
                ① <strong>「ファイルに保存する」</strong>：現在記録されている全学年の記録が端末の保存先に保存されます。<br>
                ② <strong>「ファイルから復元する」</strong>：保存したファイルを選択し、消えた記録を復元します。
            </div>

            <div style="display:flex; justify-content:center; gap:25px; margin-bottom:30px;">
                <button onclick="downloadBackupFile()" style="flex:1; padding:30px 15px; border-radius:15px; border:2px solid #e2e8f0; background:#fff; cursor:pointer; transition:0.2s;" onmouseover="this.style.background='#f7fafc'" onmouseout="this.style.background='#fff'">
                    <div style="font-size:40px; margin-bottom:12px;">💾</div>
                    <strong style="color:#2d3748; font-size:16px;">ファイルに<br>保存する</strong>
                </button>
                
                <button onclick="document.getElementById('backupFileInput').click()" style="flex:1; padding:30px 15px; border-radius:15px; border:2px solid #e2e8f0; background:#fff; cursor:pointer; transition:0.2s;" onmouseover="this.style.background='#f7fafc'" onmouseout="this.style.background='#fff'">
                    <div style="font-size:40px; margin-bottom:12px;">📤</div>
                    <strong style="color:#2d3748; font-size:16px;">ファイルから<br>復元する</strong>
                </button>
            </div>
            
            <input type="file" id="backupFileInput" style="display:none" onchange="uploadBackupFile(event)" accept=".txt">
            
            <div style="text-align:center;">
                <button onclick="closeBackupModal()" style="background:none; border:none; color:#666; cursor:pointer; text-decoration:underline; font-size:16px;">とじる</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

/**
 * 9-2. モーダルを閉じる
 */
function closeBackupModal() {
    const m = document.getElementById("backup-modal");
    if(m) m.remove();
}

/**
 * 9-3. ファイルのダウンロード（保存）
 */
function downloadBackupFile() {
    const allData = JSON.stringify(localStorage);
    const blob = new Blob([allData], {type: 'text/plain'});
    const url = URL.createObjectURL(blob);
    
    const now = new Date();
    const dateStr = `${now.getMonth()+1}月${now.getDate()}日_${now.getHours()}時${now.getMinutes()}分`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `体力テストバックアップ_${dateStr}.txt`;
    a.click();
    
    URL.revokeObjectURL(url);
    alert("ファイルを保存しました。\n「ダウンロード」フォルダを確認してください。");
}

/**
 * 9-4. ファイルの読み込み（復元）
 */
function uploadBackupFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            if(!confirm("現在のデータが消去され、ファイルの内容で上書きされます。よろしいですか？")) return;

            localStorage.clear();
            for (let key in importedData) {
                localStorage.setItem(key, importedData[key]);
            }
            
            alert("復元が完了しました。ページを再読み込みします。");
            location.reload(); 
        } catch (err) {
            alert("エラー：無効なファイル形式です。正しいバックアップファイルを選択してください。");
        }
    };
    reader.readAsText(file);
}

// ==========================================
// 10. 種目別メモ機能
// ==========================================

/**
 * 10-1. 種目別メモ画面（モーダル）を表示
 */
function showMemoModal() {
    const grade = document.getElementById("grade").value;
    const gender = document.getElementById("gender").value;
    const storageKey = `memo_v2_${gender}_${grade}`;
    
    // 保存されているデータを取得（なければ空のオブジェクト）
    const savedMemos = JSON.parse(localStorage.getItem(storageKey) || "{}");

    // 種目リスト（data.jsの定義に合わせる）
    const events = ["握力", "上体起こし", "長座体前屈", "反復横とび", "持久走", "20mシャトルラン", "50m走", "立ち幅跳び", "ハンドボール投げ"];

    const modal = document.createElement('div');
    modal.id = "memo-modal";
    modal.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:3000;display:flex;align-items:center;justify-content:center;";
    
    // 種目ごとの入力欄を作成
    let memoRows = "";
    events.forEach((event, index) => {
        const val = savedMemos[index] || "";
        memoRows += `
            <div style="margin-bottom:12px; display:flex; align-items:center; gap:10px;">
                <label style="width:120px; font-weight:bold; font-size:14px; color:#2d3748;">${event}</label>
                <input type="text" id="memo_input_${index}" value="${val}" placeholder="一言メモ（例：体調、気づいたこと）" 
                    style="flex:1; padding:8px 12px; border-radius:8px; border:1px solid #e2e8f0; font-size:14px;">
            </div>
        `;
    });

    modal.innerHTML = `
        <div style="max-width:550px; width:95%; background:white; border-radius:20px; padding:30px; box-shadow:0 20px 60px rgba(0,0,0,0.3); max-height:85vh; overflow-y:auto;">
            <h2 style="color: #2b6cb0; text-align: center; margin-top:0; font-size:22px;">📝 中${grade} 種目別メモ (${gender})</h2>
            
            <div style="margin: 20px 0;">
                ${memoRows}
                <div style="margin-top:20px;">
                    <label style="display:block; font-weight:bold; margin-bottom:5px; font-size:14px;">🌟 全体の振り返り・目標</label>
                    <textarea id="memo_input_total" style="width:100%; height:80px; padding:10px; border-radius:8px; border:1px solid #e2e8f0; resize:none; box-sizing:border-box;">${savedMemos['total'] || ""}</textarea>
                </div>
            </div>
            
            <div style="display:flex; gap:15px; position:sticky; bottom:0; background:white; padding-top:10px;">
                <button onclick="saveEventMemos('${storageKey}')" style="flex:1; padding:15px; background:#2b6cb0; color:white; border:none; border-radius:12px; font-weight:bold; cursor:pointer; font-size:16px;">保存する</button>
                <button onclick="closeMemoModal()" style="flex:1; padding:15px; background:#edf2f7; color:#4a5568; border:none; border-radius:12px; font-weight:bold; cursor:pointer; font-size:16px;">とじる</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

/**
 * 10-2. 種目別メモを保存
 */
function saveEventMemos(key) {
    const data = {};
    for (let i = 0; i < 9; i++) {
        data[i] = document.getElementById(`memo_input_${i}`).value;
    }
    data['total'] = document.getElementById('memo_input_total').value;

    localStorage.setItem(key, JSON.stringify(data));
    alert("メモを保存しました。");
    closeMemoModal();
}

/**
 * 10-3. モーダルを閉じる
 */
function closeMemoModal() {
    const m = document.getElementById("memo-modal");
    if(m) m.remove();
}

// ==========================================
// 11. スクリーンショット機能（charts.js完全対応版）
// ==========================================

async function takeScreenshot() {
    const btn = event.currentTarget;
    const originalText = btn.innerText;
    btn.innerText = "⏳ 描画中...";
    btn.disabled = true;

    // 1. 各要素を取得
    const radar = document.getElementById('radar');
    const ranking = document.getElementById('ranking');
    const gender = document.getElementById("gender").value; // 性別を取得

    // 現在の表示状態を保存
    const wasRadarHidden = (radar.style.display === 'none');
    const wasRankingHidden = (ranking.style.display === 'none');

    // 2. 撮影用に強制表示（見えない位置へ飛ばす）
    if (wasRadarHidden) {
        radar.style.display = 'block';
        radar.style.position = 'absolute';
        radar.style.left = '-9999px';
    }
    if (wasRankingHidden) {
        ranking.style.display = 'block';
        ranking.style.position = 'absolute';
        ranking.style.left = '-9999px';
    }

    // 3. charts.jsの関数を直接実行して中身を描画させる ★ここを修正しました★
    if (typeof RR === 'function') {
        RR(gender); // レーダーチャート描画関数
    }
    if (typeof renderRanking === 'function') {
        renderRanking(); // ランキング描画関数
    }

    // アニメーションが完了するまで1.2秒待つ
    await new Promise(resolve => setTimeout(resolve, 1200));

    // 4. 撮影の準備（ボタン類を消す）
    if (wasRadarHidden) radar.style.position = 'static';
    if (wasRankingHidden) ranking.style.position = 'static';
    
    const noPrintElements = document.querySelectorAll('.no-print');
    noPrintElements.forEach(el => el.style.display = 'none');

    btn.innerText = "📸 撮影中...";

    try {
        const canvas = await html2canvas(document.body, {
            useCORS: true,
            scale: 2,
            backgroundColor: "#f7fafc",
            height: document.documentElement.scrollHeight,
            windowHeight: document.documentElement.scrollHeight,
            scrollTo: 0
        });

        const now = new Date();
        const dateStr = `${now.getMonth()+1}月${now.getDate()}日_${now.getHours()}時${now.getMinutes()}分`;
        const link = document.createElement('a');
        link.download = `体力テスト記録_${dateStr}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();

    } catch (error) {
        console.error("画像作成エラー:", error);
        alert("エラーが発生しました。");
    } finally {
        // 5. 元の状態に復元（ここが重要です！）
        if (wasRadarHidden) radar.style.display = 'none';
        if (wasRankingHidden) ranking.style.display = 'none';

        // 特定のスタイル（inline-blockなど）を指定せず、
        // 空文字 "" を入れることでCSSで定義された元の状態に戻します
        const noPrintElements = document.querySelectorAll('.no-print');
        noPrintElements.forEach(el => {
            el.style.display = ""; 
            el.style.visibility = "visible";
        });
        
        btn.innerText = originalText;
        btn.disabled = false;
    }
}
