"""Original public EPUB fixtures; no university content. Requires reportlab/Pillow/pypdf."""
from pathlib import Path
from io import BytesIO
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from PIL import Image, ImageDraw
from pypdf import PdfReader, PdfWriter
from pypdf.generic import DecodedStreamObject, NameObject, DictionaryObject

root = Path(__file__).parent
out = BytesIO()
c = canvas.Canvas(out, pagesize=(600, 800), invariant=1)
def prose(y, prefix='Prose'):
    c.setFont('Helvetica', 12)
    for i in range(6):
        c.drawString(60, y-i*18, f'{prefix} line {i+1}: ordinary text must remain readable and ordered.')
def heading(text):
    c.setFont('Helvetica-Bold', 16); c.drawString(60, c._pagesize[1]-50, text)
def end(): c.showPage()

heading('1. Plain prose'); prose(680); prose(400, 'Second paragraph'); end()
heading('2. Isolated diagram'); prose(680, 'Before diagram')
im=Image.new('RGB', (300, 180), 'white');d=ImageDraw.Draw(im)
d.rectangle((10,20,120,140),outline='black',width=3);d.rectangle((180,20,290,140),outline='black',width=3)
d.line((120,80,180,80),fill='black',width=3);d.text((24,62),'Input',fill='black');d.text((194,62),'Output',fill='black')
b=BytesIO();im.save(b,format='PNG');b.seek(0)
c.drawImage(ImageReader(b),60,350,150,90);prose(260,'After diagram');end()
heading('3. Fraction and scripts');prose(680,'Before formula')
c.setFont('Helvetica',12);c.drawString(70,400,'x');c.setFont('Helvetica',8);c.drawString(77,406,'2')
c.setFont('Helvetica',12);c.drawString(96,400,'= 4');c.drawString(260,430,'a + b');c.line(250,417,310,417);c.drawString(269,397,'c')
prose(280,'After formula');end()
heading('4. Wide merged table');prose(680)
for y in (480,440,400,360,320):c.line(60,y,540,y)
for x in (60,540):c.line(x,320,x,480)
c.line(300,320,300,440)
c.setFont('Helvetica',12)
c.drawString(75,460,'Merged heading')
for i in range(3):c.drawString(75,420-i*40,f'Row {i+1}');c.drawString(315,420-i*40,f'Value {i+1}')
prose(250);end()
heading('5. Positioned scripts without rules');prose(680,'Before exponent')
c.setFont('Helvetica',12);c.drawString(70,420,'x');c.setFont('Helvetica',8);c.drawString(77,426,'2')
c.setFont('Helvetica',12);c.drawString(96,420,'= 4');c.drawString(170,420,'a');c.setFont('Helvetica',8);c.drawString(178,416,'n');prose(280,'After exponent');end()
c.setPageSize((960,540));heading('6. Landscape slide');prose(470);c.drawImage(ImageReader(b),60,180,300,180);end()
c.setPageSize((600,800));c.drawImage(ImageReader(b),0,0,600,800);end()
heading('8. Rotated page');prose(680);end()
heading('9. Cropped image page');prose(680);c.drawImage(ImageReader(b),60,350,150,90);prose(260);end()
heading('10. Tight inline formula');prose(680,'Before tight formula')
c.setFont('Helvetica',12);c.drawString(60,555,'Inline formula x');c.setFont('Helvetica',8);c.drawString(147,561,'2')
c.setFont('Helvetica',12);c.drawString(160,555,'= 4 and short adjacent text')
prose(530,'After tight formula');end()
heading('11. Tight fraction');prose(680,'Before tight fraction')
c.setFont('Helvetica',12);c.drawString(265,555,'a + b');c.line(255,547,315,547);c.drawString(275,533,'c')
prose(500,'After tight fraction');end()
heading('12. Unicode mathematical letters');prose(680,'Math-font prose')
c.setFont('Helvetica-Oblique',12);c.drawString(60,470,'2b = 2 * 3c = 6c')
c.setFont('Helvetica',12);prose(400,'After mathematical letters');end()
c.save()
r=PdfReader(out);r.pages[7].rotate(90);r.pages[8].cropbox.lower_left=(20,20)
# The original italic b/c glyphs retain their appearance; their Unicode text
# mapping reproduces supplementary-plane math letters emitted by real PDFs.
fonts=r.pages[11]['/Resources']['/Font']
for name, reference in list(fonts.items()):
 font=reference.get_object()
 if str(font.get('/BaseFont'))!='/Helvetica-Oblique':continue
 mapped=DictionaryObject(font)
 cmap=DecodedStreamObject()
 cmap.set_data(b'/CIDInit /ProcSet findresource begin 12 dict begin begincmap\n'
   b'/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n'
   b'/CMapName /OriginalMathFixture def /CMapType 2 def\n'
   b'1 begincodespacerange <00> <FF> endcodespacerange\n'
   b'2 beginbfchar <62> <D835DC4F> <63> <D835DC50> endbfchar\n'
   b'endcmap CMapName currentdict /CMap defineresource pop end end')
 mapped[NameObject('/ToUnicode')]=cmap
 fonts[NameObject(name)]=mapped
w=PdfWriter();[w.add_page(p) for p in r.pages]
with (root/'epub-regions.pdf').open('wb') as f:w.write(f)
