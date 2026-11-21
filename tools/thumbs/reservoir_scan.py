"""Research only: scan Published film-credit pages for title-specific thumbnail candidates.
No automatic Atlas mutations. All reported images need source-to-film checks.
"""
import csv, hashlib, html, io, os, re, sys, unicodedata, urllib.parse
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
import requests
from functools import lru_cache
from bs4 import BeautifulSoup
from PIL import Image, ImageDraw, ImageFont
STOP=set("a an and are at as be by del de da do dos das di du el la las les los le of on the from in for with y con para por que una uno un film pelicula movie cinema cine filme documentary short feature production festival images picture image pic photo photograph foto fotografia thumbnail cover poster still frame media video title work official review id".split())
BAD=re.compile(r'logo|favicon|placeholder|placeholder|sprite|avatar|author.photo|author-photo|avatar|director.photo|headshot|portrait|staff|sponsor|press.release|header.default|site.banner|site.logo|generic|stand.?in|fallback|flag|profilephoto|person.jpg|transparent|pixel|tracking|metadata-nish',re.I)
UA={'User-Agent':'Mozilla/5.0 (Indigenous Cinema Atlas research catalogue film imagery; https://github.com/jwilliamkennedy/abya-yala-film-atlas)'}
def fold(s):return unicodedata.normalize('NFKD',html.unescape(str(s or ''))).encode('ascii','ignore').decode('ascii','ignore').lower()
def terms(s):return [w for w in re.findall('[a-z0-9]{3,}',fold(s)) if w not in STOP]
def signature(s):return re.sub('[^a-z0-9]+',' ',fold(s)).strip()
def coverage(words,txt):
 t=signature(txt)
 return sum(w in t for w in words)/max(1,len(words))
def url_title_match(title,url):
 u=signature(urllib.parse.unquote(urllib.parse.urlsplit(url).path))
 w=terms(title)[:5]
 return bool(w) and (coverage(w,u)>=.65 or (len(w)==1 and w[0] in u.split()))
def plausible_page(title,url,soup):
 w=terms(title)[:5]
 if not w:return False,False
 h=' '.join(x.get_text(' ',strip=True) for x in soup.select('h1,h2')[:12])
 page_title=soup.title.get_text(' ',strip=True) if soup.title else ''
 metas=' '.join(x.get('content','') for x in soup.select('meta[property="og:title"],meta[name="twitter:title"]'))
 strong=max(coverage(w,h),coverage(w,page_title),coverage(w,metas))>=.72
 dedicated=(strong and url_title_match(title,url)) or (
  strong and bool(re.search(r'/(pelicula|films?|movie|videos?|programs?|obra|product|projects?|shorts?|works?)/|film_search\.php|\?vi=',url,re.I))
 )
 plain=soup.get_text(' ',strip=True)
 visible=coverage(w,plain)>=.6
 return dedicated,visible or strong
def image_urls(base,soup,title):
 opts={};t=terms(title)[:5]
 def push(u,tag,alt="",typ="",weight=0):
  if not u or u.startswith('data:') or u.startswith('#'):return
  url=urllib.parse.urljoin(base,html.unescape(u.strip()))
  if not url.startswith('https://') and not url.startswith('http://'):return
  if BAD.search(urllib.parse.urlsplit(url).path):return
  context=(alt or '')+' '+(tag.get('title','') if tag else '')+' '+(tag.get('aria-label','') if tag else '')
  parent=tag
  for i in range(2):
   parent=parent.parent if parent else None
   if parent and parent.name not in ('html','body') and len(parent.get_text(' ',strip=True))<260:
    context+=' '+parent.get_text(' ',strip=True)[:200]
  score=weight
  urlpath=signature(urllib.parse.unquote(urllib.parse.urlsplit(url).path))
  ctx=signature(context)
  score+=int(35*coverage(t,urlpath)) if t else 0
  score+=int(25*coverage(t,ctx)) if t else 0
  if re.search(r'(poster|cartel|stills?|frame|captura|fotograma|cover|hero|keyart|gallery|thumbnail|portada)',urlpath):score+=8
  if re.search(r'(logo|headshot|portrait|portraiture|festival|gallery.event|pressrelease|team|group.photo|cohort|award|announcement|grid|speaker|people|headshots|presenter|watermark|generic)',urlpath):score-=36
  if tag and tag.find_parent(['nav','footer','header']):score-=42
  if 'og'==typ:score-=2
  if tag and tag.find_parent('main'):score+=4
  if tag and tag.find_parent('article'):score+=4
  if len(t)==1 and t[0] in ctx:score+=3
  if score>opts.get(url,(-999,None))[0]:opts[url]=(score,typ)
 for meta in soup.select('meta[property="og:image"],meta[property="og:image:secure_url"],meta[name="twitter:image"],meta[name="twitter:image:src"]'):
  push(meta.get('content'),meta,typ="og",weight=0)
 for img in soup.select('img'):
  alt=img.get('alt','')
  for attr in ('data-original','data-lazy-src','data-src','data-image','data-src-large','src'):
   if img.get(attr):push(img[attr],img,alt,typ="img",weight=2);break
  srcset=img.get('data-srcset','') or img.get('srcset','')
  if srcset:
   choices=[p.strip().split(' ')[0] for p in srcset.split(',')]
   if choices:push(choices[-1],img,alt,typ="srcset",weight=2)
 for source in soup.select('picture source[srcset],picture source[data-srcset]'):
  v=source.get('srcset',source.get('data-srcset',''))
  if v:push(v.split(',')[-1].strip().split()[0],source,typ="picture",weight=2)
 return sorted(((score,url,typ) for url,(score,typ) in opts.items()),reverse=True)[:14]
@lru_cache(maxsize=1000)
def fetch_page(url):
 r=requests.get(url,headers=UA,timeout=16,allow_redirects=True)
 r.raise_for_status()
 if not ('html' in r.headers.get('content-type','text/html')):raise ValueError('non-html source')
 return r.url,r.text
@lru_cache(maxsize=1600)
def fetch_image(url):
 r=requests.get(url,headers=UA,timeout=13,allow_redirects=True)
 r.raise_for_status()
 return r.content
def inspect(row):
 info=dict(row,check='',image_url='',image_page='',image_credit='',w='',h='',sha='',score='',kind='',reason='',alternate='')
 src=(row.get('film_source') or '').strip()
 if not src.startswith('http'):info['check']='no film page';return info,None
 try:
  base,page_text=fetch_page(src)
  soup=BeautifulSoup(page_text,'html.parser')
  dedicated,found=plausible_page(row.get('title',''),base,soup)
  if not found:raise ValueError('film title absent')
  text=signature(soup.get_text(' ',strip=True))
  who=terms(row.get('filmmaker',''))
  last=who[-1] if who else ''
  if last and last not in text:raise ValueError('director not named')
  options=image_urls(base,soup,row['title'])
  if not options:raise ValueError('no image candidates')
  # Pages about multiple films require image-level title/caption matching.
  candidates=[(score,url,typ) for score,url,typ in options if (dedicated and score>=-8) or (not dedicated and score>=26)]
  if not candidates:raise ValueError('no film-specific image on shared page')
  # For dedicated pages, prefer image whose filename/title matches the film.
  candidates.sort(key=lambda x:(x[0],x[2]!='og'),reverse=True)
  foundim=[]
  for score,url,typ in candidates[:8]:
   if not dedicated and score<26:continue
   try:
    imgbytes=fetch_image(url)
    im=Image.open(io.BytesIO(imgbytes));im.load()
    if im.width<320 or im.height<180 or im.width/im.height>4 or im.width/im.height<.27:continue
    if im.entropy()<2.0:continue
    foundim.append((score,url,typ,im,imgbytes))
    if len(foundim)>=2:break
   except Exception:continue
  if not foundim:raise ValueError('image failed or undersized')
  score,url,typ,im,blob=foundim[0]
  info.update(check='candidate',image_url=url,image_page=base,image_credit=urllib.parse.urlsplit(base).hostname or '',w=str(im.width),h=str(im.height),sha=hashlib.sha1(blob).hexdigest()[:15],score=str(score),kind=typ,reason=('dedicated film page' if dedicated else 'title-linked image on shared page'),alternate=foundim[1][1] if len(foundim)>1 else '')
  return info,im.convert('RGB')
 except Exception as e:
  info['check']='held';info['reason']=str(e)[:110];return info,None
def main(source,outdir):
 rows=list(csv.DictReader(open(source,encoding='utf-8-sig',newline='')))
 os.makedirs(outdir,exist_ok=True)
 with ThreadPoolExecutor(max_workers=10) as pool:results=list(pool.map(inspect,rows))
 seen=Counter(rec['sha'] for rec,im in results if rec['check']=='candidate')
 for rec,im in results:
  if rec['check']=='candidate' and seen[rec['sha']]>1:rec['check']='site-repeated image';rec['reason']='image duplicated across different film records'
 columns=list(rows[0].keys())+['check','image_url','image_page','image_credit','w','h','sha','score','kind','reason','alternate']
 with open(os.path.join(outdir,'candidates.csv'),'w',newline='',encoding='utf-8') as f:
  w=csv.DictWriter(f,fieldnames=columns,extrasaction='ignore');w.writeheader();w.writerows(rec for rec,im in results)
 good=[(rec,im) for rec,im in results if rec['check']=='candidate']
 for start in range(0,len(good),60):
  chunk=good[start:start+60]
  sheet=Image.new('RGB',(1260,((len(chunk)+5)//6)*178+8),'white')
  d=ImageDraw.Draw(sheet)
  for i,(r,im) in enumerate(chunk):
   x=8+(i%6)*208;y=8+(i//6)*178
   thumb=im.copy();thumb.thumbnail((198,128));sheet.paste(thumb,(x,y))
   d.text((x,y+131),(r['title'] or '')[:30],fill='black')
   d.text((x,y+146),(r['filmmaker'] or '')[:28],fill='#444444')
   d.text((x,y+159),'score='+r['score'],fill='#666666')
  sheet.save(os.path.join(outdir,'sheet-%02d.jpg'%(1+start//60)),quality=81)
 print('RESULT',source,len(rows),dict(Counter(x['check'] for x,im in results)),flush=True)
if __name__=='__main__':main(*sys.argv[1:3])
