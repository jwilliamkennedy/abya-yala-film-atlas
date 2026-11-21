"""Film-specific image candidates from inline artwork on film pages whose og:image is absent.
Discovery only: do not publish without film-level visual/source review.
usage: python3 tools/thumbs/detail_candidates.py input.csv output_directory
"""
import csv,hashlib,html,io,os,re,sys,unicodedata,urllib.parse
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
import requests
from bs4 import BeautifulSoup
from PIL import Image,ImageDraw
UA={'User-Agent':'Mozilla/5.0 (compatible; IndigenousCinemaAtlasResearch/1.0)'}
BAD=re.compile(r'logo|favicon|default|placeholder|avatar|sprite|flag|icon|avatar|tracking|pixel|loader|person-portrait|headshot|portrait-of-the-director',re.I)
STOP=set('film pelicula movie cinema cine image portada fotograma still photo fotografia media trailer img the los las les del una en para com sobre a no of and with in for de la el un da do das dos der to'.split())
def fold(s):return unicodedata.normalize('NFKD',html.unescape(str(s or ''))).encode('ascii','ignore').decode().lower()
def words(s):return [w for w in re.findall(r'[a-z0-9]{3,}',fold(s)) if w not in STOP]
def match_title(title,text):
 a=words(title)[:5];t=fold(text)
 return bool(a) and (sum(w in t for w in a)>= (1 if len(a)<=2 else 2))
def image_options(base,soup,title):
 title_tokens=words(title)[:4];out=[];seen=set()
 def put(url,alt,cls,tag,priority=0):
  if not url or url.startswith('data:'):return
  u=urllib.parse.urljoin(base,html.unescape(url.strip()))
  if not u.startswith('http') or BAD.search(urllib.parse.urlparse(u).path):return
  if u in seen:return
  seen.add(u)
  info=fold(u+' '+alt+' '+cls);score=priority
  score+=sum(18 for w in title_tokens if w in info)
  if re.search(r'poster|cartel|still|frame|thumbnail|capa|screenshot|film|movie|pelicula',info):score+=10
  if re.search(r'hero|featured|primary|cover',info):score+=4
  if tag and tag.find_parent(['article','main']):score+=6
  if re.search(r'banner|cohort|press|award|logo|profile|team|people|person|directors|icon',info):score-=35
  out.append((score,u))
 for m in soup.find_all('meta'):
  if m.get('property','') in ('og:image','og:image:secure_url') or m.get('name','') in ('twitter:image','twitter:image:src'):
   put(m.get('content',''),'','og-meta',m,0)
 for img in soup.find_all('img'):
  alt=img.get('alt','');cls=' '.join(img.get('class',[]))+' '+str(img.get('id',''))
  for k in ('data-src','data-lazy-src','data-original','src'):
   if img.get(k):put(img[k],alt,cls,img,0);break
  srcset=img.get('srcset','') or img.get('data-srcset','')
  if srcset:
   for part in srcset.split(',')[-2:]:
    u=part.strip().split(' ')[0]
    if u:put(u,alt,cls,img,1)
 out.sort(key=lambda t:t[0],reverse=True)
 return out[:10]
def one(row):
 out=dict(row,image_url='',image_page='',image_credit='',image_kind='',check='',w='',h='',sha='',score='')
 url=row.get('film_source','')
 try:
  r=requests.get(url,headers=UA,timeout=23)
  r.raise_for_status()
  if not ('text/html' in r.headers.get('content-type','text/html') or '<html' in r.text[:150]):raise ValueError('not HTML')
  soup=BeautifulSoup(r.text,'html.parser');t=soup.get_text(' ',strip=True)
  if not match_title(row['title'],t):raise ValueError('film title not found')
  maker=words(row.get('filmmaker',''));last=maker[-1] if maker else ''
  if last and last not in fold(t):raise ValueError('filmmaker not named')
  for score,u in image_options(r.url,soup,row['title']):
   try:
    imr=requests.get(u,headers=UA,timeout=15);imr.raise_for_status()
    im=Image.open(io.BytesIO(imr.content));im.load()
    if im.width<320 or im.height<180:continue
    if im.width/im.height>4.3:continue
    out.update(image_url=u,image_page=r.url,image_credit=urllib.parse.urlparse(r.url).netloc,image_kind='film publicity candidate',check='needs eye check',w=str(im.width),h=str(im.height),sha=hashlib.sha1(imr.content).hexdigest()[:16],score=str(score))
    return out,im.convert('RGB')
   except Exception:continue
  raise ValueError('no qualifying inline image')
 except Exception as exc:
  out['check']=str(exc)[:110];return out,None
def main(src,outdir):
 rows=list(csv.DictReader(open(src,encoding='utf-8-sig')));os.makedirs(outdir,exist_ok=True)
 with ThreadPoolExecutor(max_workers=5) as pool:res=list(pool.map(one,rows))
 sha=Counter(x['sha'] for x,im in res if x['sha'])
 for x,_ in res:
  if x['sha'] and sha[x['sha']]>1:x['check']='shared site image (exclude)'
 cols=list(rows[0].keys())+['image_url','image_page','image_credit','image_kind','check','w','h','sha','score']
 with open(os.path.join(outdir,'candidates.csv'),'w',newline='',encoding='utf-8') as f:
  writer=csv.DictWriter(f,cols,extrasaction='ignore');writer.writeheader();writer.writerows(x for x,_ in res)
 ok=[(x,im) for x,im in res if x['check']=='needs eye check']
 for start in range(0,len(ok),60):
  chunk=ok[start:start+60]
  W,H=6*208+8,((len(chunk)+5)//6)*166+8
  sheet=Image.new('RGB',(W,H),'white');draw=ImageDraw.Draw(sheet)
  for i,(x,im) in enumerate(chunk):
   X=8+(i%6)*208;Y=8+(i//6)*166
   thumb=im.copy();thumb.thumbnail((198,122));sheet.paste(thumb,(X,Y))
   draw.text((X,Y+124),x['title'][:28],fill='black')
   draw.text((X,Y+139),x['filmmaker'][:27],fill='#444444')
  sheet.save(os.path.join(outdir,f'sheet-{1+start//60}.jpg'),quality=85)
 print('RESULT',len(rows),dict(Counter(x['check'] for x,_ in res)),flush=True)
if __name__=='__main__':main(*sys.argv[1:3])
