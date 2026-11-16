"""Download openly licensed images listed in tools/images/fetch.json, crop them to a band, and save them in the site.

Each entry: {"url": original file URL, "out": path without extension, "aspect": width/height of the crop,
"y": 0-1 vertical position of the crop, "widths": [...], "quality": JPEG quality}. Writes <out>-<width>.jpg."""
import io, json, sys, requests
from PIL import Image

for job in json.load(open(sys.argv[1], encoding='utf-8')):
    r = requests.get(job['url'], headers={'User-Agent': 'IndigenousCinemaAtlas/1.0 (https://github.com/jwilliamkennedy/abya-yala-film-atlas)'}, timeout=120)
    r.raise_for_status()
    im = Image.open(io.BytesIO(r.content)).convert('RGB')
    W, H = im.size
    ch = min(H, round(W / job.get('aspect', 3)))
    y0 = round((H - ch) * job.get('y', 0.5))
    band = im.crop((0, y0, W, y0 + ch))
    for w in job.get('widths', [W]):
        w = min(w, W)
        out = band.resize((w, round(ch * w / W)), Image.LANCZOS)
        path = f"{job['out']}-{w}.jpg"
        out.save(path, 'JPEG', quality=job.get('quality', 84), optimize=True, progressive=True)
        print(path, out.size)
