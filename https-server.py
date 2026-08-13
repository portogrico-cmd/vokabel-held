import http.server
import ssl
import os

PORT = 8420
DIR = os.path.dirname(os.path.abspath(__file__))
CERT = os.path.join(DIR, "certs", "cert.pem")
KEY = os.path.join(DIR, "certs", "key.pem")


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)


httpd = http.server.HTTPServer(("0.0.0.0", PORT), Handler)
ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ctx.load_cert_chain(certfile=CERT, keyfile=KEY)
httpd.socket = ctx.wrap_socket(httpd.socket, server_side=True)

print(f"Vokabel-Held laeuft auf https://localhost:{PORT}")
httpd.serve_forever()
