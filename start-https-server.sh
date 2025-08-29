#!/bin/bash

echo "HTTPS サーバー起動スクリプト"
echo "=========================="
echo ""
echo "以下の方法から選択してください："
echo ""
echo "1) Python (証明書自動生成)"
echo "   python3 -m http.server 8443 --bind 127.0.0.1 --directory . &"
echo "   echo 'Visit: https://localhost:8443'"
echo ""
echo "2) Node.js http-server (グローバルインストールが必要)"
echo "   # npm install -g http-server"
echo "   http-server -S -C cert.pem -K key.pem -p 8443"
echo ""
echo "3) Node.js local-web-server (グローバルインストールが必要)" 
echo "   # npm install -g local-web-server"
echo "   ws --https --port 8443"
echo ""
echo "4) mkcert を使った本格的なローカルHTTPS"
echo "   # brew install mkcert"
echo "   # mkcert -install"
echo "   # mkcert localhost 127.0.0.1"
echo "   # python3 server.py"
echo ""

# 簡単なPython HTTPSサーバーの例
cat << 'EOF' > server.py
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
httpd = http.server.HTTPServer(('localhost', 8443), http.server.SimpleHTTPRequestHandler)

# SSL設定
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain('cert.pem', 'key.pem')
httpd.socket = context.wrap_socket(httpd.socket, server_side=True)

print("HTTPS Server running at https://localhost:8443/")
print("Press Ctrl+C to stop")
print("\n⚠️  ブラウザで証明書の警告が表示されたら、「詳細設定」→「localhost にアクセスする（安全ではありません）」を選択してください")

try:
    httpd.serve_forever()
except KeyboardInterrupt:
    print("\nServer stopped.")
EOF

echo "最も簡単な方法:"
echo "python3 server.py"