"""Closure-only verification in an existing clean clone, not an engine feature."""
import os,sys,json,pathlib,subprocess,time,hashlib,shutil
checkout=pathlib.Path(sys.argv[1]).resolve(); evidence=pathlib.Path(sys.argv[2]).resolve();evidence.mkdir(parents=True,exist_ok=True)
env=os.environ.copy();env.update(ONNXRUNTIME_NODE_INSTALL='skip',WHATIF_OFFLINE='1',REMOTION_ALLOW_BROWSER_DOWNLOAD='0',WHATIF_PROJECTS=str(checkout/'verification-data/projects'),WHATIF_OUTPUT=str(checkout/'verification-data/output'))
rows=[]
def run(label,args,cwd=None,expected=0):
 t=time.monotonic();child_env=env.copy()
 if label=='02-npm-test':
  child_env.pop('WHATIF_PROJECTS',None);child_env.pop('WHATIF_OUTPUT',None)
 t=time.monotonic();r=subprocess.run(args,cwd=cwd or checkout/'engine',env=child_env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=600);(evidence/(label+'.log')).write_bytes(r.stdout)
 rows.append(dict(label=label,command=' '.join(map(str,args)),exit=r.returncode,expected=expected,result='PASS' if r.returncode==expected else 'FAIL',seconds=round(time.monotonic()-t,3)))
 if r.returncode!=expected: print(label,'FAIL',r.stdout[-2000:].decode(errors='replace'))
 return r
meta={'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=checkout,text=True).strip(),'branch':subprocess.check_output(['git','branch','--show-current'],cwd=checkout,text=True).strip(),'cleanBefore':not subprocess.check_output(['git','status','--porcelain'],cwd=checkout,text=True).strip(),'installEnvironment':{'ONNXRUNTIME_NODE_INSTALL':'skip','WHATIF_OFFLINE':'1','REMOTION_ALLOW_BROWSER_DOWNLOAD':'0'},'python':sys.version,'node':subprocess.check_output(['node','--version'],text=True).strip()}
npm=shutil.which('npm.cmd' if os.name=='nt' else 'npm')
run('01-npm-ci',[npm,'ci']);run('02-npm-test',[npm,'test']);run('03-typecheck',[npm,'run','typecheck'])
files=sorted([checkout/'engine/render.mjs']+list((checkout/'engine/tools').glob('*.mjs'))+list((checkout/'engine/tests').glob('*.mjs')))
for i,f in enumerate(files):
 r=subprocess.run(['node','--check',str(f)],env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
 if r.returncode:raise RuntimeError(str(f)+r.stdout.decode())
(evidence/'04-node-syntax.log').write_text('PASS node --check: '+str(len(files))+' CLI/tools/tests files\n')
rows.append(dict(label='04-node-syntax',command='node --check render.mjs tools/*.mjs tests/*.mjs (each file)',exit=0,expected=0,result='PASS'))
run('05-py-compile',[sys.executable,'-m','py_compile',*map(str,sorted((checkout/'engine/tools').glob('*.py')))])
cli=lambda label,*args,**kw:run(label,['node','render.mjs',*args],**kw)
# Preserve the exact legacy sample; no authoring rewrite before migration test.
src=checkout/'projects/examples/demo-no-sleep/project.json';p=json.loads(src.read_text());legacy=p['id'];dst=pathlib.Path(env['WHATIF_PROJECTS'])/legacy;dst.mkdir(parents=True);shutil.copy2(src,dst/'project.json')
before=hashlib.sha256((dst/'project.json').read_bytes()).hexdigest()
cli('06-legacy-timeline','timeline',legacy);cli('07-legacy-qa','qa',legacy,'--plan-only')
meta['legacyProjectUnchanged']=before==hashlib.sha256((dst/'project.json').read_bytes()).hexdigest()
cli('08-fiction-new','new','closure-fiction','--format','fiction','--topic','Возвращение динозавров','--duration','90','--characters','3','--voice','none');cli('09-fiction-timeline','timeline','closure-fiction');cli('10-fiction-qa','qa','closure-fiction','--plan-only')
cli('11-series-new','new','closure-series','--format','series','--topic','Экспедиция','--name','Экспедиция','--duration','90','--characters','3','--episodes','2','--voice','none')
for i in [1,2]:cli(f'12-series-e0{i}-timeline','timeline',f'closure-series-e0{i}');cli(f'13-series-e0{i}-qa','qa',f'closure-series-e0{i}','--plan-only')
cli('14-rurik-new','new','closure-rurik','--format','documentary','--genre','history','--topic','Рюриковичи','--duration','120','--voice','none');cli('15-rurik-research','research','closure-rurik','--topic','Рюриковичи');cli('16-rurik-timeline','timeline','closure-rurik');cli('17-rurik-qa','qa','closure-rurik','--plan-only')
cli('18-smoke-plan','smoke','closure-smoke','--extended','--plan-only')
cli('19-selfcheck','selfcheck',expected=1)
# Auditable claims/migration facts; no rendering assertion.
proj=json.loads((pathlib.Path(env['WHATIF_PROJECTS'])/'closure-rurik/project.json').read_text());pack=proj['production']['knowledge'];lines=[l for s in proj['scenes'] for l in s['lines']];claims={c['id'] for c in pack['claims']}
meta['documentary']={'claims':len(claims),'needsReviewAll':all(c['needsReview'] is True for c in pack['claims']),'lines':len(lines),'allLinesHaveKnownClaim':all(l.get('claimIds') and set(l['claimIds'])<=claims for l in lines),'schemaVersion':proj['schemaVersion']}
meta['trackedDiffAfter']=subprocess.check_output(['git','diff','--name-only','HEAD'],cwd=checkout,text=True).strip()
meta['selfcheck']=json.loads((evidence/'19-selfcheck.log').read_text())
summary={'metadata':meta,'commands':rows};(evidence/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
(evidence/'COMMANDS.md').write_text('# Чистый checkout: команда → результат\n\nHEAD: `'+meta['head']+'`\n\nУстановка: ONNXRUNTIME_NODE_INSTALL=skip (без скачивания optional native runtime; inference не проверялся).\n\n| Команда | Exit | Результат |\n|---|---:|---|\n'+''.join('| `'+r['command'].replace('|','\\|')+'` | '+str(r['exit'])+' | '+('Ожидаемо неполный: нет компонентов, ZIP создан' if r['label']=='19-selfcheck' and r['result']=='PASS' else r['result'])+' |\n' for r in rows))
print(json.dumps(summary,ensure_ascii=False,indent=2));sys.exit(0 if all(r['result']=='PASS' for r in rows) and meta['legacyProjectUnchanged'] and meta['documentary']['allLinesHaveKnownClaim'] else 1)
