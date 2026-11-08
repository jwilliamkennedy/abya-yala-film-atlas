#!/usr/bin/env python3
"""Prepare small *genuine* Natural Earth II shaded-relief crops for terrain lab.

This script is isolated from beta/index.html, encounters.js, and the main site.
Input: official Natural Earth public-domain 10m shaded-relief raster TIFF.
Output: 3 WebP images + a manifest, entirely within beta/terrain-lab/assets.
"""
from pathlib import Path
import hashlib
import json
import os
import tempfile
import urllib.request
import zipfile
from PIL import Image

OUT = Path("beta/terrain-lab/assets")
OUT.mkdir(parents=True, exist_ok=True)
# Natural Earth public-domain source: NE2_LR_LC_SR (16,200 × 8,100 TIFF)
URLS = [
 "https://naturalearth.s3.amazonaws.com/10m_raster/NE2_LR_LC_SR.zip",
 "https://naturalearth.s3.amazonaws.com/10m_raster/NE2_HR_LC_SR.zip",
]
REGIONS = {
 "guatemala": [-94.0, 12.0, -87.5, 19.5],
 "oaxaca": [-101.0, 13.2, -91.0, 20.3],
 "andes": [-79.0, -19.2, -66.0, -9.0],
}
MAX_ARCHIVE = 280 * 1024 * 1024
def download(url, destination):
    req = urllib.request.Request(url, headers={"User-Agent": "IndigenousCinemaAtlasTerrainLab/1.0 research-only"})
    with urllib.request.urlopen(req, timeout=100) as response, destination.open("wb") as out:
        size = 0
        while True:
            part = response.read(1024 * 1024)
            if not part:
                break
            out.write(part)
            size += len(part)
            if size > MAX_ARCHIVE:
                raise ValueError("Natural Earth ZIP exceeds archive safety cap")
    assert destination.stat().st_size > 10_000_000, "Suspiciously small Natural Earth archive"
def bbox_pixels(box, width, height):
    w,s,e,n = box
    return tuple(round(v) for v in (
       (w+180)/360*width,(90-n)/180*height,
       (e+180)/360*width,(90-s)/180*height))
def main():
    Image.MAX_IMAGE_PIXELS = None
    with tempfile.TemporaryDirectory() as td:
        temp = Path(td)
        archive = temp/"natural-earth.zip"
        failures=[]
        active=None
        for url in URLS:
            try:
                download(url, archive)
                with zipfile.ZipFile(archive) as z:
                    matches=[x for x in z.namelist() if x.lower().endswith((".tif",".tiff")) and "__macosx" not in x.lower()]
                    assert matches, "No TIFF raster in archive"
                    name=next((v for v in matches if "LC_SR" in v),matches[0])
                    with z.open(name) as incoming, (temp/"source.tif").open("wb") as f:
                        while True:
                            part=incoming.read(1024*1024)
                            if not part: break
                            f.write(part)
                active=url
                break
            except Exception as exc:
                failures.append(f"{url}: {exc}")
                archive.unlink(missing_ok=True)
        if not active:
            raise RuntimeError("Official Natural Earth source unavailable:\n"+"\n".join(failures))
        image = Image.open(temp/"source.tif")
        width,height = image.size
        assert width/height==2 and width>=10000, f"Invalid global image dims: {image.size}"
        manifest={"provider":"Natural Earth","dataset":"Natural Earth II with shaded relief",
          "license":"public domain","source_url":active,"pixels_global":[width,height],
          "regions":{}}
        for slug,box in REGIONS.items():
            crop = image.crop(bbox_pixels(box,width,height)).convert("RGB")
            # Detail is not invented: 2x is for smooth browser interpolation.
            if crop.width<1200:
                crop=crop.resize((crop.width*2,crop.height*2),Image.Resampling.LANCZOS)
            path=OUT/f"{slug}.webp"
            crop.save(path,format="WEBP",quality=91,method=6)
            assert 20_000 < path.stat().st_size < 8_000_000, f"Crop unusual: {path}"
            manifest["regions"][slug]={"file":"assets/"+path.name,
              "bounds":box,"width":crop.width,"height":crop.height,
              "sha256":hashlib.sha256(path.read_bytes()).hexdigest()}
            print("NATURAL_EARTH_CROP",slug,crop.size,path.stat().st_size)
        (OUT/"manifest.json").write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
        print("NATURAL_EARTH_LAB_ASSETS_PASS",active)
if __name__=="__main__":
    main()
