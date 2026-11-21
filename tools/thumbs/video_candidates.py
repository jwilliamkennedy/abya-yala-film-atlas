"""Research actual film video frames as thumbnail candidates from published watch links.
Use external Vimeo/YouTube metadata, check film title, dimensions, unique image per video.
No Atlas files are edited. Candidates still need source screening before Queue.
"""
import csv, io, json, os, re, sys, unicodedata, urllib.parse
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
import requests
from PIL import Image, ImageDraw
UA={"User-Agent":"Mozilla/5.0 (compatible; IndigenousCinemaAtlas/1.0; public catalogue research)"}
def normalized(s):return unicodedata.normalize("NFKD",s or "").encode("ascii","ignore").decode().lower()
STOP=set('a an the and or of in de del la el los las une un le les des du que film documentary short by with &'.split())
def words(s):return [x for x in re.findall('[a-z0-9]+',normalized(s)) if x not in STOP]
def match(a,b):
 u=words(a);v=words(b)
 if not u:return False
 # Film names may include subtitle and translation in parentheses.
 primary=normalized(re.split(r'\\s*[(|/]\\s*',a)[0]);primary_w=words(primary)
 relevant=primary_w or u
 matches=sum(x in v for x in relevant)
 return matches>=1 if len(relevant)==1 else matches>=max(2,int(.60*len(relevant)))
def one(row):
 result=dict(row,image_url="",image_page="",image_credit="",video_title="",check="",w="",h="",note="")
 url=(row.get("watch_1_url") or row.get("watch_2_url") or "").strip()
 try:
  if "vimeo.com" in url:
   api="https://vimeo.com/api/oembed.json?"+urllib.parse.urlencode({"url":url,"width":1280})
   r=requests.get(api,headers=UA,timeout=24);r.raise_for_status();meta=r.json()
   title=meta.get("title","");image_url=meta.get("thumbnail_url","")
   credit="Vimeo / "+meta.get("author_name","video uploader")
  elif "youtube.com" in url or "youtu.be" in url:
   api="https://www.youtube.com/oembed?"+urllib.parse.urlencode({"url":url,"format":"json"})
   r=requests.get(api,headers=UA,timeout=24);r.raise_for_status();meta=r.json()
   title=meta.get("title","");image_url=meta.get("thumbnail_url","")
   credit="YouTube / "+meta.get("author_name","video uploader")
  else:
   result["check"]="not a video host";return result,None
  result["video_title"]=title
  if not match(row["title"],title):
   result["check"]="video title differs";result["note"]=title;return result,None
  if not image_url.startswith("http"):raise ValueError("no image URL")
  ir=requests.get(image_url,headers=UA,timeout=20);ir.raise_for_status()
  im=Image.open(io.BytesIO(ir.content));im.load()
  if im.width<320 or im.height<180:raise ValueError("video thumbnail undersized")
  result.update(check="candidate",image_url=image_url,image_page=url,image_credit=credit,w=str(im.width),h=str(im.height),note="Actual hosted-video frame; external thumbnail rights not established")
  return result,im.convert("RGB")
 except Exception as e:
  result["check"]="held";result["note"]=str(e)[:125];return result,None
def main(src,outdir):
 os.makedirs(outdir,exist_ok=True)
 rows=list(csv.DictReader(open(src,encoding="utf-8-sig",newline="")))
 with ThreadPoolExecutor(max_workers=7) as ex:results=list(ex.map(one,rows))
 cols=list(rows[0].keys())+["image_url","image_page","image_credit","video_title","check","w","h","note"]
 with open(outdir+"/candidates.csv","w",newline="",encoding="utf-8") as f:
  w=csv.DictWriter(f,cols,extrasaction="ignore");w.writeheader();w.writerows(row for row,im in results)
 good=[(row,im) for row,im in results if row["check"]=="candidate"]
 for start in range(0,len(good),60):
  chunk=good[start:start+60]
  sheet=Image.new("RGB",(1260,178*((len(chunk)+5)//6)+8),"white");draw=ImageDraw.Draw(sheet)
  for i,(row,im) in enumerate(chunk):
   x=8+(i%6)*208;y=8+(i//6)*178
   thumb=im.copy();thumb.thumbnail((198,128));sheet.paste(thumb,(x,y))
   draw.text((x,y+132),row["title"][:27],fill="black")
   draw.text((x,y+149),row["video_title"][:25],fill="#555555")
  sheet.save(outdir+"/sheet-%d.jpg"%(start//60+1),quality=82)
 print("VIDEO",len(rows),dict(Counter(r["check"] for r,im in results)),flush=True)
if __name__=="__main__":main(*sys.argv[1:3])
