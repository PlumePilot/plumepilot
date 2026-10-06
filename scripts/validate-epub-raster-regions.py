"""Compare lossless regional crops against complete baseline rasters."""
import json, zipfile, sys
from pathlib import Path
from io import BytesIO
from PIL import Image
base=Path(sys.argv[1])
report=json.loads((base/'results.json').read_text())
checked=0;skipped=0
with zipfile.ZipFile(base/'baseline.epub') as old,zipfile.ZipFile(base/'regional.epub') as new:
 for page in report[1]['pages']:
  if page['mode']!='regional':continue
  chapter=page['chapterIndex'];number=page['pageNumber']
  names=sorted(n for n in old.namelist() if f'chapter-{chapter:03}-page-{number:03}-' in n and n.endswith(('.png','.jpg')))
  reference=base/f'source-chapter-{chapter}-page-{number}.png'
  if reference.exists():full=Image.open(reference).convert('RGB')
  else:
   if not names or any(not n.endswith('.png') for n in names):skipped+=len(page['regionBounds']);continue
   pieces=[Image.open(BytesIO(old.read(n))).convert('RGB') for n in names]
   full=Image.new('RGB',(pieces[0].width,sum(p.height for p in pieces)))
   y=0
   for piece in pieces:full.paste(piece,(0,y));y+=piece.height
  for region in page['regionBounds']:
   if not region['name'].endswith('.png'):skipped+=1;continue
   crop=Image.open(BytesIO(new.read('OEBPS/'+region['name']))).convert('RGB')
   assert 0<=region['start']<region['end']<=full.height
   expected=full.crop((0,region['start'],full.width,region['end']))
   assert crop.size==expected.size and crop.tobytes()==expected.tobytes(),region['name']
   checked+=1
print(f'PASS: {checked} lossless crops match complete source rasters exactly; {skipped} JPEG comparisons skipped (lossy encoding)')
