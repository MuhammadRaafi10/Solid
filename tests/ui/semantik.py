import os, sys, random
from playwright.sync_api import sync_playwright
BASE = os.environ.get('BASE_URL', 'http://localhost/solid/')
SUF = str(random.randint(1000, 9999))   # akun uji unik tiap run
fails=[]
def check(n,c):
    print(('PASS ' if c else 'FAIL ')+n)
    if not c: fails.append(n)
def outline(page):
    return page.evaluate("""()=>({
      h1:document.querySelectorAll('h1').length,
      main:document.querySelectorAll('main').length,
      nav:document.querySelectorAll('nav').length,
      skip:[...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h=>+h.tagName[1]).some((l,i,a)=>i>0&&l-a[i-1]>1),
      badInline:document.querySelectorAll('[style*="margin"],[style*="display:flex"],[onclick]').length,
      divBtn:document.querySelectorAll('div[role=button],span[onclick]').length,
      i:document.querySelectorAll('i').length,
      imgNoAlt:[...document.querySelectorAll('img')].filter(i=>!i.hasAttribute('alt')).length,
      btnNoName:[...document.querySelectorAll('button')].filter(b=>!(b.textContent.trim()||b.getAttribute('aria-label')||b.title)).length,
      inputNoLabel:[...document.querySelectorAll('input:not([type=hidden]),select,textarea')].filter(e=>!(e.closest('label')||e.getAttribute('aria-label')||e.id&&document.querySelector('label[for="'+e.id+'"]'))).length,
    })""")
with sync_playwright() as p:
    br=p.chromium.launch(); ctx=br.new_context(viewport={'width':1280,'height':800}); pg=ctx.new_page()
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and '401' not in m.text and 'fonts' not in m.text and 'ERR_' not in m.text and errs.append(m.text))
    pg.goto(BASE); pg.wait_for_selector('#authForm')
    o=outline(pg); check('auth: 1 main', o['main']==1); 
    pg.click('[data-t=register]')
    f=pg.locator('#authForm')
    f.locator('[name=name]').fill('Ui Tester'); f.locator('[name=username]').fill('ui'+SUF); f.locator('[name=email]').fill('ui'+SUF+'@x.id')
    f.locator('[name=angkatan]').select_option('2024'); f.locator('[name=password]').fill('solid123')
    f.locator('button[type=submit]').click()
    pg.wait_for_selector('nav.rail'); pg.wait_for_selector('dialog[open]'); pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    o=outline(pg); print(o)
    check('shell: 1 main + 1 nav', o['main']==1 and o['nav']==1)
    check('chat: 1 h1', o['h1']==1)
    check('no heading level skip', not o['skip'])
    check('no <i> tags', o['i']==0)
    check('buttons have names', o['btnNoName']==0)
    check('inputs labelled', o['inputNoLabel']==0)
    for tab in ['friends','plans','me']:
        pg.click(f'[data-tab={tab}]'); pg.wait_for_timeout(500)
        o=outline(pg); print(tab,o)
        check(tab+': 1 h1', o['h1']==1); check(tab+': no skip', not o['skip']); check(tab+': buttons named', o['btnNoName']==0); check(tab+': inputs labelled', o['inputNoLabel']==0)
    # plan CRUD via UI
    pg.click('[data-tab=plans]'); pg.wait_for_timeout(300)
    pg.click('#newPlan'); pg.wait_for_timeout(200)
    check('empty convs toast', pg.locator('output.toast').count()>=1)
    pg.click('[data-tab=me]'); pg.wait_for_timeout(200)
    pg.click('#editAv'); pg.wait_for_selector('dialog[open]')
    check('avatar editor is dialog', pg.locator('dialog[open] h2').count()==1)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    check('esc closes dialog', pg.locator('dialog[open]').count()==0)
    check('no js errors', not errs)
    if errs: print(errs)
    br.close()
print('FAILS',fails); sys.exit(1 if fails else 0)
