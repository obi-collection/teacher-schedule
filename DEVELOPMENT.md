# 先生のスケジュール帳 開発メモ

このアプリは、先生向けの時間割・予定・記録管理PWAです。
Claude CodeやCodexで作業するときは、最初にこのファイルを読んで、必要なファイルだけを開くとコンテキスト消費を抑えられます。

## ファイル構成

```text
teacher-schedule/
  index.html              画面のHTML。CSS/JSは外部ファイル参照のみ。
  manifest.json           PWAマニフェスト。
  sw.js                   Service Worker。キャッシュ対象を管理。
  css/
    app.css               全スタイル。
  js/
    00-core.js            初期設定、state、保存/読込、日付ユーティリティ。
    10-week-render.js     週表示、時間割グリッド、スクロール同期、週移動。
    20-cell-modals.js     授業選択、コマ詳細、メモ、記録入力。
    30-records-events.js  記録パネル、日別予定、イベント/行事。
    40-settings-data.js   設定、ジャンル管理、エクスポート/インポート。
    50-todo-fixed-nav.js  To Do、固定時間割、週ナビゲーション。
    60-platform.js        トースト、PWA、祝日、通知、バックアップ通知。
    70-students.js        生徒管理、生徒選択、生徒別記録。
    app.js                初期化だけ。
```

## 作業の探し方

- 週表示やセルの見た目がおかしい: `js/10-week-render.js`, `css/app.css`
- 授業選択やコマ詳細を直す: `js/20-cell-modals.js`
- 行事、予定、記録一覧を直す: `js/30-records-events.js`
- 設定、ジャンル、バックアップ/復元を直す: `js/40-settings-data.js`
- To Doや固定時間割を直す: `js/50-todo-fixed-nav.js`
- PWA、祝日、通知を直す: `js/60-platform.js`, `sw.js`
- 生徒関連を直す: `js/70-students.js`
- 保存形式やstateを直す: `js/00-core.js`

## データ保存

データは `localStorage` に保存します。主なキーは `js/00-core.js` の `STORAGE_KEYS` で管理しています。

```text
ts_settings
ts_timetable
ts_events
ts_notes
ts_todos
ts_fixedTimetable
ts_records
ts_daySchedules
ts_ideaMemos
ts_cellTasks
ts_students
ts_cellStudents
```

インポート前には現在の状態を `ts_preImportBackup` に自動退避します。
壊れたJSONを検出した場合は、元データを `*_corrupt_タイムスタンプ` に退避して、そのキーを読み飛ばします。

## バックアップ形式

エクスポートJSONには以下のメタ情報があります。

```json
{
  "app": "teacher-schedule",
  "version": 3,
  "exportedAt": "ISO日時"
}
```

バックアップ対象には、時間割、行事、メモ、To Do、固定時間割、記録、日別予定、アイデアメモ、コマ内タスク、生徒、生徒紐づけを含めます。

## Service Worker

JS/CSS/HTMLの読み込み対象を増やしたり、キャッシュされる内容を変えたら、`sw.js` の `CACHE_NAME` を上げます。

例:

```js
const CACHE_NAME = 'teacher-schedule-v6';
```

`ASSETS` にはオフライン利用に必要なファイルを入れます。

## 動作確認

ローカル確認:

```bash
python3 -m http.server 8765 --directory "/Volumes/Extreme SSD/teacher-schedule"
```

ブラウザで開く:

```text
http://127.0.0.1:8765/index.html
```

最低限の確認項目:

- 週グリッドが表示される
- 前週/翌週/今週ボタンが動く
- 授業選択モーダルが開閉できる
- 行事追加モーダルが開閉できる
- 設定パネルが開閉できる
- To Doパネルが開閉できる
- 記録/生徒パネルが開閉できる
- ブラウザコンソールにエラーがない

保存を伴う確認項目:

- テスト用の授業を追加して、再読み込み後も残る
- To Doを追加して、完了/削除できる
- 記録を保存して、記録一覧に出る
- 生徒を追加して、コマに紐づけられる
- エクスポートしたJSONに全データが含まれる
- インポート前に `ts_preImportBackup` が作られる

## 作業時の注意

- 既存データを消す変更は慎重に行う。
- 保存形式を変えるときは、古いデータも読めるようにする。
- `index.html` に大きなCSS/JSを戻さない。
- 通常のJSファイルを複数 `<script>` で順番に読み込んでいるため、実行順に注意する。
- ES Modules化する場合は、グローバル関数参照を整理してから行う。
- PWAキャッシュの更新忘れに注意する。
