"""Check actual rendered fixture EPUBs; not a replacement for EPUBCheck."""
from pathlib import Path
from io import BytesIO
import sys, json, zipfile, re
import xml.etree.ElementTree as ET
from PIL import Image
base=Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/plumepilot-epub-node')
results=json.loads((base/'results.json').read_text())
assert all(not r['failures'] for r in results)
assert [p['pageNumber'] for p in results[0]['pages']]==list(range(1,13))
assert [p['pageNumber'] for p in results[1]['pages']]==list(range(1,13))
assert [p['pageNumber'] for p in results[1]['pages'] if p['mode']=='regional']==[2,3,4,5,10,11]
ns={'h':'http://www.w3.org/1999/xhtml','o':'http://www.idpf.org/2007/opf'}
with zipfile.ZipFile(base/'baseline.epub') as old, zipfile.ZipFile(base/'regional.epub') as new:
    for z in [old,new]:
        assert z.namelist()[0]=='mimetype'
        assert z.getinfo('mimetype').compress_type==zipfile.ZIP_STORED
        for name in z.namelist():
            if name.endswith(('.xml','.xhtml','.opf','.ncx')):ET.fromstring(z.read(name))
            if name.endswith(('.png','.jpg')):Image.open(BytesIO(z.read(name))).load()
        opf=ET.fromstring(z.read('OEBPS/package.opf'))
        manifest=opf.findall('o:manifest/o:item',ns)
        ids=[n.attrib['id'] for n in manifest];assert len(ids)==len(set(ids))
        assert all('OEBPS/'+n.attrib['href'] in z.namelist() for n in manifest)
    html=new.read('OEBPS/text/chapter-001.xhtml').decode()
    for label in ['Before diagram','After diagram','Before formula','After formula','Before exponent','After exponent',
                  'Before tight formula','After tight formula','Before tight fraction','After tight fraction']:
        for i in range(1,7):assert html.count(f'{label} line {i}:')==1
    assert html.index('Before diagram')<html.index('chapter-1-page-2-region-1')<html.index('After diagram')
    assert html.index('Before exponent')<html.index('chapter-1-page-5-region-1')<html.index('After exponent')
    # Fallback output must preserve the exact encoded baseline rasters.
    for name in old.namelist():
        if '/images/' in name and any(f'page-{n:03}-' in name for n in [6,7,8,9]):
            assert re.sub(rb'urn:uuid:[0-9a-f-]+', b'urn:uuid:BOOK', old.read(name))==re.sub(rb'urn:uuid:[0-9a-f-]+', b'urn:uuid:BOOK', new.read(name))
    for page in results[1]['pages']:
        if page['mode'] != 'regional': continue
        number=page['pageNumber']
        names=sorted(n for n in old.namelist() if f'page-{number:03}-' in n and n.endswith('.png'))
        reference=base/f'source-chapter-1-page-{number}.png'
        if reference.exists(): full=Image.open(reference).convert('RGB')
        else:
            assert names, f'Generate EPUB_BENCH_REFERENCES=1 for new regional page {number}'
            pieces=[Image.open(BytesIO(old.read(n))).convert('RGB') for n in names]
            full=Image.new('RGB',(pieces[0].width,sum(p.height for p in pieces)))
            y=0
            for piece in pieces:full.paste(piece,(0,y));y+=piece.height
        for region in page['regionBounds']:
            crop=Image.open(BytesIO(new.read('OEBPS/'+region['name']))).convert('RGB')
            expected=full.crop((0,region['start'],full.width,region['end']))
            assert crop.size==expected.size and crop.tobytes()==expected.tobytes()
            # Known original fraction numerator/rule/denominator must share one crop.
            if number==3:
                assert region['start'] < (800-440)*region['scale']
                assert region['end'] > (800-390)*region['scale']
            if number==4:
                assert region['start'] < (800-480)*region['scale']
                assert region['end'] > (800-320)*region['scale']
            if number==11:
                assert region['start'] < (800-555)*region['scale']
                assert region['end'] > (800-533)*region['scale']
    assert '<span class="math-symbol">𝑏</span>' in html
    assert '<span class="math-symbol">𝑐</span>' in html
    assert len([n for n in new.namelist() if n.endswith('.otf')])==1
    assert 'OEBPS/fonts/STIX-OFL.txt' in new.namelist()
    for name in ['OEBPS/nav.xhtml','OEBPS/toc.ncx']:
        assert re.sub(rb'urn:uuid:[0-9a-f-]+', b'urn:uuid:BOOK', old.read(name))==re.sub(rb'urn:uuid:[0-9a-f-]+', b'urn:uuid:BOOK', new.read(name))
print('PASS: XML/rasters/manifest; prose once/in order; complete tight formulas/fractions; mathematical Unicode/font/license; fallback rasters and navigation')
