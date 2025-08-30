# EXIF Frame Generator

写真にEXIF情報（カメラ・レンズ・撮影設定）を表示するフレームを追加するWebアプリケーション。

## 🚀 デモ

[https://tekitounix.github.io/exif_frame/](https://tekitounix.github.io/exif_frame/)

## ✨ 機能

- 📷 **EXIF情報の自動読み取り**
  - カメラ、レンズ、ISO、絞り、シャッタースピード、撮影日時
- 🖼️ **カスタマイズ可能なフレーム**
  - 明暗テーマ、余白調整、フォントサイズ
- ✂️ **画像編集機能**
  - 切り抜き、回転、反転
  - 露出、ハイライト、シャドウ、コントラスト調整
  - 彩度、色温度、ビネット、グレイン
- 🎞️ **フィルムエミュレーション（11種類）**
  - カラー：Superia, Provia, Velvia, Portra, Ektar, Gold, Astia
  - モノクロ：Tri-X, HP5, T-MAX
- 📱 **完全なモバイル対応**
  - レスポンシブデザイン
  - タッチ操作対応
  - 共有API（iOS/Android）
- 💾 **高品質エクスポート**
  - JPG/PNG形式
  - カスタマイズ可能な出力サイズ

## 📸 使い方

1. **画像をアップロード** - ドラッグ&ドロップまたはクリックして選択
2. **フレームをカスタマイズ** - Frameツールで余白やテーマを調整
3. **画像を編集** - 必要に応じて切り抜きや色調整
4. **フィルムを適用** - お好みのフィルムエミュレーションを選択
5. **エクスポート** - 完成した画像を保存・共有

## 🛠️ 技術スタック

- Vanilla JavaScript (ES6+)
- Canvas API
- exifr ライブラリ
- レスポンシブCSS
- GitHub Actions（自動デプロイ）

## 📁 プロジェクト構造

```
exif_frame/
├── index.html      # メインHTML
├── css/           # スタイルシート
├── js/            # JavaScriptモジュール
├── assets/        # フォント・画像
└── docs/          # ドキュメント
```

## 🚀 開発

```bash
# リポジトリをクローン
git clone https://github.com/tekitounix/exif_frame.git

# ローカルサーバーを起動
python3 -m http.server 8000

# ブラウザでアクセス
http://localhost:8000
```

## 📄 ライセンス

MIT License

---

Made with ❤️ by [tekitounix](https://github.com/tekitounix)