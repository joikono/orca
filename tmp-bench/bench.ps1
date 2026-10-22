$ErrorActionPreference = 'Stop'
$repo = 'C:\bench\repo'
$results = 'C:\bench\results.jsonl'
$D = 'bench'
function Rec($phase, $side, $op, $obj) {
  $line = ([ordered]@{ phase = $phase; side = $side; op = $op } + $obj) | ConvertTo-Json -Compress
  $line; Add-Content $results $line
}
function W($phase, $op, [string[]]$gitArgs, [switch]$poll) {
  if ($poll) { $env:GIT_OPTIONAL_LOCKS = '0' } else { Remove-Item Env:GIT_OPTIONAL_LOCKS -ErrorAction SilentlyContinue }
  $sw = [Diagnostics.Stopwatch]::StartNew()
  $out = & git -C $repo @gitArgs 2>&1
  $rc = $LASTEXITCODE
  $sw.Stop()
  Remove-Item Env:GIT_OPTIONAL_LOCKS -ErrorAction SilentlyContinue
  $n = @($out | Where-Object { "$_".Trim() -ne '' -and -not "$_".StartsWith('#') }).Count
  Rec $phase 'win' $op @{ ms = [int]$sw.ElapsedMilliseconds; lines = $n; rc = $rc }
}
function L($phase, $op, [string[]]$gitArgs) {
  $sw = [Diagnostics.Stopwatch]::StartNew()
  $j = & wsl.exe -d $D --exec bash /mnt/c/bench/wslrun.sh @gitArgs
  $sw.Stop()
  $o = $j | ConvertFrom-Json
  Rec $phase 'wsl' $op @{ ms = $o.ms; wallMs = [int]$sw.ElapsedMilliseconds; lines = $o.lines; rc = $o.rc }
}
$st = @('status', '--porcelain', '--untracked-files=all')
$poll = @('-c', 'core.quotePath=false', 'status', '--porcelain=v2', '--branch', '--untracked-files=all')
$r23 = @('-c', 'core.autocrlf=true', '-c', 'core.checkStat=minimal')

# Phase A: default configs (Windows autocrlf=true global; WSL git has none).
W 'A' 'win-poll-warm' $poll -poll; W 'A' 'win-poll-warm' $poll -poll; W 'A' 'win-poll-warm' $poll -poll
W 'A' 'win-status' $st
L 'A' 'wsl-status-plain-1st' $st
W 'A' 'win-poll-after-wsl-plain' $poll -poll; W 'A' 'win-poll-after-wsl-plain' $poll -poll
L 'A' 'wsl-status-r23-1st' ($r23 + $st)
L 'A' 'wsl-status-r23-warm' ($r23 + $st)
W 'A' 'win-poll-after-wsl-r23' $poll -poll; W 'A' 'win-status-after-wsl-r23' $st; W 'A' 'win-poll-after-win-refresh' $poll -poll
L 'A' 'wsl-status-r23-after-win' ($r23 + $st)
W 'A' 'win-status-after-wsl-r23-2' $st
L 'A' 'wsl-status-r23-after-win-2' ($r23 + $st)

# Phase B: mitigation (b), repo-local config both sides read.
& git -C $repo config core.autocrlf true; & git -C $repo config core.checkStat minimal; & git -C $repo config core.trustctime false
W 'B' 'win-status' $st; W 'B' 'win-poll' $poll -poll
L 'B' 'wsl-status-plain-1st' $st
L 'B' 'wsl-status-plain-warm' $st
W 'B' 'win-poll-after-wsl' $poll -poll; W 'B' 'win-status-after-wsl' $st
L 'B' 'wsl-status-after-win' $st
W 'B' 'win-status-after-wsl-2' $st
L 'B' 'wsl-status-after-win-2' $st
W 'B' 'win-poll-final' $poll -poll

# Phase C: correctness of stage/commit from each side.
function CrCount($file) { (& git -C $repo cat-file -p "HEAD:$file" | Out-String) -split "`n" | Where-Object { $_.EndsWith("`r") } | Measure-Object | Select-Object -ExpandProperty Count }
function ChangedLines($file) { $s = & git -C $repo show --numstat --format= HEAD -- $file; "$s".Trim() }
# C1: Windows edit, WSL plain commit, default configs (no local config).
& git -C $repo config --unset core.autocrlf; & git -C $repo config --unset core.checkStat; & git -C $repo config --unset core.trustctime
$f = 'pkgs/p00/a/m1.ts'; Add-Content (Join-Path $repo $f) '// win edit c1'
L 'C1' 'wsl-add' @('add', '--', $f); L 'C1' 'wsl-commit' @('-c', 'user.name=b', '-c', 'user.email=b@x', 'commit', '-q', '-m', 'c1')
Rec 'C1' 'check' 'blob' @{ file = $f; crLines = (CrCount $f); numstat = (ChangedLines $f) }
# C2: same with R23 flags on the WSL side.
$f = 'pkgs/p00/a/m2.ts'; Add-Content (Join-Path $repo $f) '// win edit c2'
L 'C2' 'wsl-add' ($r23 + @('add', '--', $f)); L 'C2' 'wsl-commit' ($r23 + @('-c', 'user.name=b', '-c', 'user.email=b@x', 'commit', '-q', '-m', 'c2'))
Rec 'C2' 'check' 'blob' @{ file = $f; crLines = (CrCount $f); numstat = (ChangedLines $f) }
# C3: same with repo-local config (mitigation b).
& git -C $repo config core.autocrlf true; & git -C $repo config core.checkStat minimal; & git -C $repo config core.trustctime false
$f = 'pkgs/p00/a/m3.ts'; Add-Content (Join-Path $repo $f) '// win edit c3'
L 'C3' 'wsl-add' @('add', '--', $f); L 'C3' 'wsl-commit' @('-c', 'user.name=b', '-c', 'user.email=b@x', 'commit', '-q', '-m', 'c3')
Rec 'C3' 'check' 'blob' @{ file = $f; crLines = (CrCount $f); numstat = (ChangedLines $f) }
# C4: WSL appends an LF line; Windows stages and commits.
$f = 'pkgs/p00/a/m4.ts'
& wsl.exe -d $D --exec bash -c "printf '// wsl edit c4\n' >> /mnt/c/bench/repo/$f"
W 'C4' 'win-add' @('add', '--', $f); W 'C4' 'win-commit' @('-c', 'user.name=b', '-c', 'user.email=b@x', 'commit', '-q', '-m', 'c4')
Rec 'C4' 'check' 'blob' @{ file = $f; crLines = (CrCount $f); numstat = (ChangedLines $f) }
# C5: both sides' view after the commits (with local config).
W 'C5' 'win-status' $st; L 'C5' 'wsl-status' $st
# C6: same view with local config removed (default user setup).
& git -C $repo config --unset core.autocrlf; & git -C $repo config --unset core.checkStat; & git -C $repo config --unset core.trustctime
W 'C6' 'win-status' $st; L 'C6' 'wsl-status-plain' $st
