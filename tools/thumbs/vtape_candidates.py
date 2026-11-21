"""Find source-linked film stills on individual Vtape video pages.
Reads an Atlas missing-images CSV with film_source=Vtape artist or video URL.
Creates candidates.csv + contact sheets on the CI-only branch. No Atlas data is edited.
"""
import csv, hashlib, html, io, os, re, sys, unicodedata
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from difflib import SequenceMatcher
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup
from PIL import Image, ImageDraw, ImageFont

UA = {'User-Agent': 'Mozilla/5.0 (Indigenous Cinema Atlas film-image research; https://github.com/jwilliamkennedy/abya-yala-film-atlas)'}
session = requests.Session()
def fold(s):
    s = unicodedata.normalize('NFKD', html.unescape(s or ''))
    return re.sub(r'[^a-z0-9]+', ' ', s.encode('ascii','ignore').decode().lower()).strip()
def get(url):
    r=session.get(url, headers=UA,timeout=20)
    r.raise_for_status()
    return r.url, r.content
def choose(page, title):
    soup=BeautifulSoup(page, 'html.parser')
    target=fold(title).split(' / ')[0].strip()
    opts=[]
    for a in soup.select('a[href]'):
        href=urljoin('https://vtape.org/',a.get('href',''))
        if 'vtape.org/video?vi=' not in href: continue
        name=fold(a.get_text(' ',strip=True))
        if not name: continue
        ratio=SequenceMatcher(None,target,name).ratio()
        if name==target: ratio=1
        if ratio>=0.85: opts.append((ratio,href,name))
    if not opts: return None
    opts.sort(reverse=True)
    if len(opts)>1 and opts[0][0]==opts[1][0] and opts[0][1]!=opts[1][1]: return None
    return opts[0][1]
def image_candidates(url,soup):
    urls=[]
    for item in soup.select('meta[property="og:image"],meta[name="twitter:image"]'):
        u=item.get('content','')
        if u: urls.append(urljoin(url,u))
    for item in soup.select('img'):
        for attr in ('src','data-src'):
            u=item.get(attr,'')
            if u and ('video-still' in u.lower() or '/video/' in u.lower()):
                urls.append(urljoin(url,u))
    return list(dict.fromkeys(urls))
def one(row):
    out=dict(row, image_url='',image_page='',image_credit='',image_kind='',check='',w='',h='',sha='')
    src=(row.get('film_source') or '').strip()
    try:
        base,body=get(src)
        if 'artist?' in src:
            link=choose(body.decode('utf-8','replace'),row['title'])
            if not link:
                out['check']='no matching artist video';return out,None
            base,body=get(link)
        soup=BeautifulSoup(body,'html.parser')
        page_text=fold(soup.get_text(' ',strip=True))
        title=fold(row['title'])
        # Film page must name the actual film, not merely an adjacent work.
        if title not in page_text and SequenceMatcher(None,title,fold(soup.title.get_text(' ',strip=True) if soup.title else '')).ratio()<0.5:
            h=soup.find(['h1','h2'])
            if not h or SequenceMatcher(None,title,fold(h.get_text(' ',strip=True))).ratio()<0.80:
                out['check']='title mismatch';return out,None
        surname=fold(row['filmmaker']).split(' ')[-1]
        if surname and surname not in page_text:
            out['check']='director not named';return out,None
        images=image_candidates(base,soup)
        images.sort(key=lambda u:('video-still' not in u.lower(), 'logo' in u.lower()))
        for image_url in images:
            if re.search(r'logo|favicon|placeholder|default|avatar',urlparse(image_url).path,re.I):continue
            try:
                _,raw=get(image_url)
                im=Image.open(io.BytesIO(raw));im.load()
                if im.width<320 or im.height<180:continue
            except Exception:continue
            out.update(image_url=image_url,image_page=base,image_credit='vtape.org',image_kind='still',check='ok',w=str(im.width),h=str(im.height),sha=hashlib.sha1(raw).hexdigest()[:12])
            return out,im.convert('RGB')
        out['check']='no eligible film still';return out,None
    except Exception as e:
        out['check']='failed: '+str(e)[:100];return out,None
def main(input_file,outdir):
    rows=list(csv.DictReader(open(input_file,encoding='utf-8')))
    os.makedirs(outdir,exist_ok=True)
    with ThreadPoolExecutor(max_workers=5) as ex: answers=list(ex.map(one,rows))
    seen=Counter(r['sha'] for r,im in answers if r['check']=='ok')
    for r,im in answers:
        if r['check']=='ok' and seen[r['sha']]>1:r['check']='duplicate image across films'
    fields=list(rows[0].keys())+['image_url','image_page','image_credit','image_kind','check','w','h','sha']
    with open(os.path.join(outdir,'candidates.csv'),'w',newline='',encoding='utf-8') as f:
        w=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore');w.writeheader();w.writerows(r for r,im in answers)
    good=[(r,im) for r,im in answers if r['check']=='ok']
    for offset in range(0,len(good),50):
        chunk=good[offset:offset+50];sheet=Image.new('RGB',(1256,170*((len(chunk)+5)//6)+8),'white');d=ImageDraw.Draw(sheet)
        for i,(r,im) in enumerate(chunk):
            x=8+(i%6)*208;y=8+(i//6)*170
            frame=im.copy();frame.thumbnail((198,128));sheet.paste(frame,(x,y))
            d.text((x,y+130),r['title'][:31],fill='black')
            d.text((x,y+145),r['filmmaker'][:31],fill='gray')
        sheet.save(os.path.join(outdir,'sheet-%d.jpg'%(offset//50+1)),quality=80)
    print('VTAPE RESULTS',len(rows),len(good),dict(Counter(r['check'] for r,im in answers)),flush=True)
if __name__=='__main__':
    main(*sys.argv[1:3])
