const printIdInput = document.getElementById("printId");
const titleInput = document.getElementById("title");
const subjectInput = document.getElementById("subject");

const generateButton = document.getElementById("generateButton");
const downloadButton = document.getElementById("downloadButton");

const qrCodeArea = document.getElementById("qrcode");
const qrText = document.getElementById("qrText");

const saveButton = document.getElementById("saveButton");

let currentQRCode = null;

// ========================================
// QRコード生成
// ========================================

generateButton.addEventListener("click", () => {
  const printId = printIdInput.value.trim();
  const title = titleInput.value.trim();
  const subject = subjectInput.value;

  if (!printId) {
    alert("プリントIDを入力してください。");
    return;
  }

  qrCodeArea.innerHTML = "";
  const qrData = printId;

  currentQRCode = new QRCode(qrCodeArea, {
    text: qrData,
    width: 220,
    height: 220,
    correctLevel: QRCode.CorrectLevel.M,
  });

  qrText.textContent = `QRの中身：${qrData}`;
  downloadButton.disabled = false;
});

// ========================================
// QR画像保存
// ========================================

downloadButton.addEventListener("click", () => {
  const canvas = qrCodeArea.querySelector("canvas");

  if (!canvas) {
    alert("QRコードがありません。");
    return;
  }

  const link = document.createElement("a");
  link.download = `${printIdInput.value || "print"}-QR.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
});

// ========================================
// Firestoreにプリント情報を保存
// ========================================

saveButton.addEventListener("click", async () => {
  const printId = document.getElementById("printId").value.trim();
  const title = document.getElementById("title").value.trim();
  const subject = document.getElementById("subject").value;
  const unit = document.getElementById("unit").value.trim();
  const distributedDate = document.getElementById("distributedDate").value;
  const dueDate = document.getElementById("dueDate").value;
  const memo = document.getElementById("memo").value.trim();

  if (!printId) {
    alert("プリントIDを入力してください。");
    return;
  }

  if (!title) {
    alert("タイトルを入力してください。");
    return;
  }

  if (!window.firebaseDB) {
    alert("Firestoreに接続できていません。\n設定を確認してください。");
    console.error("window.firebaseDB がありません。");
    return;
  }

  try {
    // Firestore用のモジュールをインポート
    const { doc, setDoc } =
      await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");

    // 保存先ドキュメントの参照を作成 (printsコレクションの printIdドキュメント)
    const printRef = doc(window.firebaseDB, "prints", printId);

    // Firestoreへ保存
    await setDoc(printRef, {
      id: printId,
      title: title,
      subject: subject,
      unit: unit,
      distributedDate: distributedDate,
      dueDate: dueDate,
      memo: memo,
      imageUrl: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    alert("プリントをFirestoreに保存しました！");
    console.log("Firestore保存成功:", printId);

    // 保存後に一覧を更新
    loadPrints();
  } catch (error) {
    console.error("Firestore保存エラー:", error);
    alert("Firestoreへの保存に失敗しました。\n\n" + error.message);
  }
});

// ========================================
// Firestoreからプリント一覧を取得
// ========================================

const printList = document.getElementById("printList");
const reloadButton = document.getElementById("reloadButton");

async function loadPrints() {
  if (!window.firebaseDB) {
    printList.innerHTML = `
      <p class="empty-message">
        Firestoreに接続できていません。
      </p>
    `;
    return;
  }

  try {
    const { collection, getDocs, query, orderBy } =
      await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");

    // printsコレクションのデータを取得（createdAtの新しい順に並べ替え）
    const printsQuery = query(
      collection(window.firebaseDB, "prints"),
      orderBy("createdAt", "desc"),
    );
    const querySnapshot = await getDocs(printsQuery);

    if (querySnapshot.empty) {
      printList.innerHTML = `
        <p class="empty-message">
          まだプリントがありません。
        </p>
      `;
      return;
    }

    let printsHtml = "";
    querySnapshot.forEach((docSnap) => {
      const print = docSnap.data();
      printsHtml += `
        <div class="print-item" data-id="${escapeHtml(print.id)}">
          <div class="print-title">
            ${escapeHtml(print.title || "タイトルなし")}
          </div>
          <div class="print-meta">
            <span class="print-tag">
              ${escapeHtml(print.subject || "その他")}
            </span>
            ${print.unit ? `<span class="print-tag">${escapeHtml(print.unit)}</span>` : ""}
          </div>
          ${print.distributedDate ? `<div class="print-date">配布日：${escapeHtml(print.distributedDate)}</div>` : ""}
          ${print.dueDate ? `<div class="print-date">提出期限：${escapeHtml(print.dueDate)}</div>` : ""}
        </div>
      `;
    });

    printList.innerHTML = printsHtml;

    // 各プリントをクリックしたときの詳細表示イベント
    document.querySelectorAll(".print-item").forEach((item) => {
      item.addEventListener("click", () => {
        const id = item.dataset.id;
        showPrintDetail(id);
      });
    });
  } catch (error) {
    console.error("プリント取得エラー:", error);
    printList.innerHTML = `
      <p class="empty-message">
        プリントの取得に失敗しました。
      </p>
    `;
  }
}

// ========================================
// HTMLエスケープ
// ========================================

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ========================================
// プリント詳細
// ========================================

async function showPrintDetail(printId) {
  try {
    const { doc, getDoc } =
      await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");

    const printRef = doc(window.firebaseDB, "prints", printId);
    const snapshot = await getDoc(printRef);

    if (!snapshot.exists()) {
      alert("プリントが見つかりません。");
      return;
    }

    const print = snapshot.data();

    alert(
      `タイトル：${print.title || ""}\n` +
        `科目：${print.subject || ""}\n` +
        `単元：${print.unit || ""}\n` +
        `配布日：${print.distributedDate || ""}\n` +
        `提出期限：${print.dueDate || ""}\n` +
        `メモ：${print.memo || ""}`,
    );
  } catch (error) {
    console.error("詳細取得エラー:", error);
    alert("プリント情報を取得できませんでした。");
  }
}

// ========================================
// 更新ボタン
// ========================================

reloadButton.addEventListener("click", loadPrints);

// ========================================
// 起動時に読み込む
// ========================================

loadPrints();
