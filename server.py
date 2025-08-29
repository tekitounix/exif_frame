#!/usr/bin/env python3
import http.server
import ssl
import os

# 自己署名証明書を生成（初回のみ）
if not os.path.exists('cert.pem') or not os.path.exists('key.pem'):
    print("自己署名証明書を生成中...")
    import subprocess
    subprocess.run([
        'openssl', 'req', '-new', '-x509', '-keyout', 'key.pem', 
        '-out', 'cert.pem', '-days', '365', '-nodes',
        '-subj', '/CN=localhost'
    ])

# HTTPSサーバー設定
PORT = 8444  # 別のポートを使用
# 0.0.0.0 を使用してすべてのインターフェースでリッスン
httpd = http.server.HTTPServer(('0.0.0.0', PORT), http.server.SimpleHTTPRequestHandler)

# SSL設定
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain('cert.pem', 'key.pem')
httpd.socket = context.wrap_socket(httpd.socket, server_side=True)

print(f"HTTPS Server running at:")
print(f"  - https://localhost:{PORT}/")
print(f"  - https://127.51.68.120:{PORT}/")
print(f"  - https://100.64.1.76:{PORT}/")
print("\nPress Ctrl+C to stop")
print("\n⚠️  ブラウザで証明書の警告が表示されたら、「詳細設定」→「アクセスする（安全ではありません）」を選択してください")
print("📱 モバイルからは上記のIPアドレスでアクセスしてください")

try:
    httpd.serve_forever()
except KeyboardInterrupt:
    print("\nServer stopped.")
