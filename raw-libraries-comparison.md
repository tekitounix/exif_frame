# RAW File Processing Libraries for JavaScript

## 1. **raw.js / dcraw.js**
- WebAssembly版のdcrawポート
- CDN: https://cdn.jsdelivr.net/npm/dcraw@latest/dcraw.js
- 対応形式: DNG, CR2, NEF, ARW, ORF など主要RAWフォーマット
- 特徴: 軽量、高速、基本的なRAW現像機能

## 2. **LibRaw.js**
- LibRawのWebAssembly版
- CDN: https://cdn.jsdelivr.net/npm/libraw-js@latest/dist/libraw.js
- 対応形式: 600以上のカメラのRAWフォーマット
- 特徴: 高度な現像パラメータ、色空間変換、ノイズリダクション

## 3. **raw-loader**
- CDN: https://unpkg.com/raw-loader@latest/dist/raw-loader.js
- シンプルなRAW読み込みライブラリ
- 基本的なデモザイキングとガンマ補正

## 推奨: **dcraw.js**
最も広く使われており、CDNで簡単に利用でき、主要なRAWフォーマットをサポートしています。