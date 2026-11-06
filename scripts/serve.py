"""Dependency-free preview server with configurable host and port."""
import argparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--host', default='127.0.0.1')
parser.add_argument('--port', type=int, default=5173)
parser.add_argument('--strictPort', action='store_true', help='Fail if port is occupied (always enforced).')
args = parser.parse_args()
with ThreadingHTTPServer((args.host, args.port), SimpleHTTPRequestHandler) as server:
    print(f'Serving at http://{args.host}:{args.port}', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
