"""Read-only signature/path audit; findings never include matched secret values."""
import subprocess,pathlib,re,json,zipfile,io,sys
root=pathlib.Path(__file__).resolve().parents[2]
files=subprocess.check_output(['git','ls-files','-z'],cwd=root).decode().strip('\0').split('\0')
forbidden=re.compile(r'(^|/)(node_modules|piper-env|\.git|models|\.venv)/|\.(onnx|onnx_data|safetensors|gguf|pt|pth|mp4|pem|pfx|p12|key)$',re.I)
patterns={'private-key':rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----','github-token':rb'(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})','aws-key':rb'AKIA[0-9A-Z]{16}','provider-key':rb'\bsk-[A-Za-z0-9_-]{32,}'}
findings=[];bad=[];archives=[]
def scan(name,data):
 for key,pat in patterns.items():
  if re.search(pat,data):findings.append({'file':name,'signature':key})
 if name.endswith('.zip'):
  with zipfile.ZipFile(io.BytesIO(data)) as z:
   archives.append(name)
   for n in z.namelist():
    if forbidden.search(n):bad.append(name+'!'+n)
    if not n.endswith('/'):scan(name+'!'+n,z.read(n))
for n in files:
 if forbidden.search(n) or pathlib.PurePosixPath(n).name in ['.env','.netrc','.git-credentials']:bad.append(n)
 scan(n,(root/n).read_bytes())
pack=json.loads((root/'engine/knowledge/rurikids.json').read_text())
ignore={}
for p in ['engine/node_modules/example','engine/piper-env/example','engine/models/a.onnx','output/example.mp4','.env','secret.key','weights.gguf','weights.safetensors']:
 ignore[p]=subprocess.run(['git','check-ignore','-q','--',p],cwd=root).returncode==0
result={'scope':'git tracked paths and content + nested tracked ZIPs, signature scan not proof against every secret','files':len(files),'forbiddenTrackedOrArchivedPaths':bad,'secretSignatureFindings':findings,'archivesInspected':archives,'ignoreChecks':ignore,'knowledge':{'claims':len(pack['claims']),'allNeedsReview':all(c['needsReview'] is True for c in pack['claims'])},'migrationEvidence':'engine/tests/reliability.mjs and final/evidence/summary.json','documentaryBoundary':'research lines all known claims; legacy weaker, docs/KNOWN_GAPS.md G4'}
(root/'handoff/final/evidence').mkdir(parents=True,exist_ok=True);(root/'handoff/final/evidence/RISK_SCAN.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False,indent=2));sys.exit(1 if bad or findings or not all(ignore.values()) else 0)
