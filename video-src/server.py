import http.server, subprocess, sys, os

HERE = os.path.dirname(os.path.abspath(__file__))
FF = sys.argv[1]
FINAL = sys.argv[2]
VIDEO = os.path.join(HERE, 'video.mp4')
WAV = os.path.join(HERE, 'music.wav')
state = {'proc': None, 'frames': 0}


class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=HERE, **k)

    def log_message(self, *a):
        pass

    def ok(self, body=b'ok'):
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        n = int(self.headers.get('Content-Length', 0))
        data = self.rfile.read(n)
        if self.path.startswith('/start'):
            state['frames'] = 0
            state['proc'] = subprocess.Popen(
                [FF, '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-',
                 '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', VIDEO],
                stdin=subprocess.PIPE)
        elif self.path.startswith('/frame'):
            state['proc'].stdin.write(data)
            state['frames'] += 1
        elif self.path.startswith('/audio'):
            with open(WAV, 'wb') as f:
                f.write(data)
        elif self.path.startswith('/done'):
            p = state['proc']
            p.stdin.close()
            p.wait()
            r = subprocess.run([FF, '-y', '-loglevel', 'error', '-i', VIDEO, '-i', WAV, '-c:v', 'copy', '-c:a', 'aac',
                                '-b:a', '192k', '-shortest', '-movflags', '+faststart', FINAL])
            return self.ok(('muxed %d frames, ffmpeg rc=%d' % (state['frames'], r.returncode)).encode())
        self.ok()


http.server.ThreadingHTTPServer(('127.0.0.1', 8732), H).serve_forever()
